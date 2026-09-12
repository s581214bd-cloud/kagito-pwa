import { expect, it } from 'vitest'
import { SyncClient, type SyncConnection, type SyncFetcher } from '../../src/application/sync-client'
import { VaultService } from '../../src/application/vault-service'
import { createVaultRepository } from '../../src/storage/vault-repository'

const connection: SyncConnection = { serverUrl: 'https://kagito.local', deviceId: 'phone-1', token: 'token' }

it('initializes an empty phone only from an encrypted PC snapshot', async () => {
  const sourceRepository = createVaultRepository('sync-source')
  const source = await VaultService.create('correct horse battery staple', sourceRepository)
  await source.saveRegistration({ title: '楽天市場', accountId: 'user@example.com', password: 'secret', url: '', categoryId: 'shopping', memo: '' })
  const exported = JSON.parse(await (await source.exportEncrypted()).text())
  const fetcher: SyncFetcher = async (_url, init) => {
    expect(init.headers.authorization).toBe('Bearer token')
    return {
      ok: true,
      json: async () => ({ generation: 1, header: exported.header, entries: exported.envelopes.map((envelope: unknown, index: number) => ({ entryId: `entry-${index}`, generation: 1, envelope })) }),
    }
  }
  const targetRepository = createVaultRepository('sync-target')

  await new SyncClient(fetcher).initializeVault(connection, targetRepository)

  expect(JSON.stringify(await targetRepository.readAllRaw())).not.toContain('楽天市場')
  expect((await VaultService.unlock('correct horse battery staple', targetRepository).then((service) => service.list())).map((item) => item.title)).toEqual(['楽天市場'])
})

it('sends only encrypted data and retains both edits as a conflict copy', async () => {
  const localRepository = createVaultRepository('sync-local')
  const local = await VaultService.create('correct horse battery staple', localRepository)
  const registration = await local.saveRegistration({ title: '楽天市場', accountId: 'user@example.com', password: 'secret', url: '', categoryId: 'shopping', memo: '' })
  const remoteRepository = createVaultRepository('sync-remote')
  await remoteRepository.replaceRaw(await localRepository.readAllRaw())
  const remote = await VaultService.unlock('correct horse battery staple', remoteRepository)
  await local.updateRegistration(registration.id, { title: '楽天市場（PC）', accountId: 'user@example.com', password: 'secret', url: '', categoryId: 'shopping', memo: '' })
  await remote.updateRegistration(registration.id, { title: '楽天市場（スマホ）', accountId: 'user@example.com', password: 'secret', url: '', categoryId: 'shopping', memo: '' })
  const remoteRaw = await remoteRepository.readAllRaw()
  const requests: Array<{ url: string; init: { method: string; body?: string } }> = []
  const fetcher: SyncFetcher = async (url, init) => {
    requests.push({ url, init })
    if (init.method === 'GET') {
      return { ok: true, json: async () => ({ generation: 2, header: remoteRaw.header, entries: remoteRaw.envelopes.map((envelope, index) => ({ entryId: `entry-${index}`, generation: 2, envelope })) }) }
    }
    return { ok: true, json: async () => ({ generation: 3, conflicts: [] }) }
  }

  const result = await new SyncClient(fetcher).sync(local, connection)

  expect(result).toEqual({ sent: 6, received: 0, conflicts: 1 })
  expect(requests).toHaveLength(2)
  expect(requests[1].init.body).not.toContain('楽天市場')
  expect(requests[1].init.body).not.toContain('secret')
  expect((await local.list()).map((item) => item.title)).toEqual(expect.arrayContaining(['楽天市場（PC）', '楽天市場（スマホ）（競合コピー）']))
})
