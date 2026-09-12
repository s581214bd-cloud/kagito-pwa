import { expect, it } from 'vitest'
import { createVaultRepository } from '../../src/storage/vault-repository'

it('keeps a device connection outside encrypted backups and can forget it', async () => {
  const repository = createVaultRepository('sync-settings-test')
  await repository.writeSyncConnection({ serverUrl: 'https://kagito.local', deviceId: 'phone-1', token: 'secret-device-token' })

  expect(await repository.readSyncConnection()).toEqual({ serverUrl: 'https://kagito.local', deviceId: 'phone-1', token: 'secret-device-token' })
  expect(JSON.stringify(await repository.readAllRaw())).not.toContain('secret-device-token')

  await repository.clearSyncConnection()
  await expect(repository.readSyncConnection()).resolves.toBeUndefined()
})
