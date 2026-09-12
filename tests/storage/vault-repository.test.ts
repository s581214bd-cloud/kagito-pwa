import { createVaultRepository } from '../../src/storage/vault-repository'
import { VaultService } from '../../src/application/vault-service'

it('stores ciphertext but never the registration title in IndexedDB', async () => {
  const repository = createVaultRepository('repository-encryption-test')
  const service = await VaultService.create('correct horse battery staple', repository)

  await service.saveRegistration({
    title: '楽天市場', accountId: 'a', password: 'p', url: '', categoryId: 'other', memo: '',
  })

  const raw = await repository.readAllRaw()
  expect(JSON.stringify(raw)).not.toContain('楽天市場')
  await expect(service.list()).resolves.toHaveLength(1)
})
