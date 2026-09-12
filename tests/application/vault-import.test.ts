import { VaultService } from '../../src/application/vault-service'
import { createVaultRepository } from '../../src/storage/vault-repository'

it('restores only an encrypted kagito-export-v1 backup', async () => {
  const sourceRepository = createVaultRepository('backup-source')
  const source = await VaultService.create('correct horse battery staple', sourceRepository)
  await source.saveRegistration({ title: '楽天市場', accountId: 'user@example.com', password: 'secret', url: '', categoryId: 'other', memo: '' })
  const backup = await source.exportEncrypted()
  const targetRepository = createVaultRepository('backup-target')

  await VaultService.importEncrypted(backup, targetRepository)

  const restored = await VaultService.unlock('correct horse battery staple', targetRepository)
  await expect(restored.list()).resolves.toMatchObject([{ title: '楽天市場' }])
})

it('rejects a non-KAGITO backup before changing the vault', async () => {
  const repository = createVaultRepository('backup-reject')
  const service = await VaultService.create('correct horse battery staple', repository)
  const before = await repository.readAllRaw()

  await expect(VaultService.importEncrypted(new Blob(['{"format":"csv"}']), repository)).rejects.toThrow('バックアップ形式が正しくありません')
  expect(await repository.readAllRaw()).toEqual(before)
  await expect(service.list()).resolves.toEqual([])
})
