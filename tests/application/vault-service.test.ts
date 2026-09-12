import { VaultService } from '../../src/application/vault-service'
import { createVaultRepository } from '../../src/storage/vault-repository'

const fields = (title: string) => ({
  title, accountId: `${title}@example.com`, password: 'p', url: '', categoryId: 'other', memo: '',
})

it('moves registrations manually without overwriting manual order when using name sort', async () => {
  const service = await VaultService.create('correct horse battery staple', createVaultRepository('sorting-test'))
  const first = await service.saveRegistration(fields('Zebra'))
  const second = await service.saveRegistration(fields('Apple'))
  const third = await service.saveRegistration(fields('Lemon'))

  await service.moveRegistration(third.id, 0)

  await expect(service.list('manual')).resolves.toMatchObject([{ id: third.id }, { id: first.id }, { id: second.id }])
  await expect(service.list('name')).resolves.toMatchObject([{ id: second.id }, { id: third.id }, { id: first.id }])
  await expect(service.list('manual')).resolves.toMatchObject([{ id: third.id }, { id: first.id }, { id: second.id }])
})

it('creates encrypted default categories for a new vault', async () => {
  const repository = createVaultRepository('category-defaults-test')
  const service = await VaultService.create('correct horse battery staple', repository)

  await expect(service.listCategories()).resolves.toMatchObject([
    { id: 'shopping', name: '買い物' },
    { id: 'finance', name: '金融' },
    { id: 'work', name: '仕事' },
    { id: 'other', name: 'その他' },
  ])
  expect((await repository.readAllRaw()).envelopes).toEqual(expect.arrayContaining([
    expect.objectContaining({ objectType: 'category' }),
  ]))
})

it('refuses to delete a category used by a registration', async () => {
  const service = await VaultService.create('correct horse battery staple', createVaultRepository('category-delete-test'))
  await service.saveRegistration({ ...fields('楽天市場'), categoryId: 'shopping' })

  await expect(service.deleteCategory('shopping')).rejects.toThrow('使用中のカテゴリは削除できません')
})

it('adds, renames, and moves encrypted categories', async () => {
  const service = await VaultService.create('correct horse battery staple', createVaultRepository('category-edit-test'))
  const hobby = await service.saveCategory('趣味')

  await service.updateCategory(hobby.id, '娯楽')
  await service.moveCategory(hobby.id, 0)

  await expect(service.listCategories()).resolves.toEqual(expect.arrayContaining([
    expect.objectContaining({ id: hobby.id, name: '娯楽', sortOrder: 0 }),
  ]))
})

it('rejects empty and duplicate category names', async () => {
  const service = await VaultService.create('correct horse battery staple', createVaultRepository('category-name-test'))

  await expect(service.saveCategory('   ')).rejects.toThrow('カテゴリ名を入力してください')
  await expect(service.saveCategory('買い物')).rejects.toThrow('同じカテゴリ名が登録されています')
})

it('refuses to delete the final category', async () => {
  const service = await VaultService.create('correct horse battery staple', createVaultRepository('category-last-test'))
  for (const category of (await service.listCategories()).filter((category) => category.id !== 'shopping')) {
    await service.deleteCategory(category.id)
  }

  await expect(service.deleteCategory('shopping')).rejects.toThrow('最後のカテゴリは削除できません')
})

it('migrates compatibility categories for a vault created before category storage', async () => {
  const repository = createVaultRepository('legacy-category-test')
  await VaultService.create('correct horse battery staple', repository)
  const raw = await repository.readAllRaw()
  await repository.replaceRaw({ ...raw, envelopes: raw.envelopes.filter((envelope) => envelope.objectType === 'registration') })
  const service = await VaultService.unlock('correct horse battery staple', repository)

  await expect(service.listCategories()).resolves.toEqual(expect.arrayContaining([
    expect.objectContaining({ id: 'other', name: 'その他' }),
  ]))
  await service.migrateDefaultCategories()
  expect((await repository.readAllRaw()).envelopes.filter((envelope) => envelope.objectType === 'category')).toHaveLength(4)
})

it('keeps the newer category when two devices edit the same category', async () => {
  const localRepository = createVaultRepository('category-merge-local-test')
  const local = await VaultService.create('correct horse battery staple', localRepository)
  const remoteRepository = createVaultRepository('category-merge-remote-test')
  await remoteRepository.replaceRaw(await localRepository.readAllRaw())
  const remote = await VaultService.unlock('correct horse battery staple', remoteRepository)

  await local.updateCategory('shopping', '買い物PC')
  await new Promise((resolve) => setTimeout(resolve, 10))
  await remote.updateCategory('shopping', '買い物スマホ')
  await local.mergeEncryptedEnvelopes((await remoteRepository.readAllRaw()).envelopes)

  await expect(local.listCategories()).resolves.toEqual(expect.arrayContaining([
    expect.objectContaining({ id: 'shopping', name: '買い物スマホ' }),
  ]))
})

it('writes an encrypted tombstone instead of raw deletion', async () => {
  const repository = createVaultRepository('tombstone-test')
  const service = await VaultService.create('correct horse battery staple', repository)
  const registration = await service.saveRegistration(fields('楽天市場'))

  await service.deleteRegistration(registration.id)

  expect(await service.list()).toEqual([])
  const raw = await repository.readAllRaw()
  expect(JSON.stringify(raw)).not.toContain('楽天市場')
  expect(raw.envelopes).toEqual(expect.arrayContaining([expect.objectContaining({ objectId: registration.id, deleted: true })]))
})

it('updates a registration without changing its identity or manual position', async () => {
  const service = await VaultService.create('correct horse battery staple', createVaultRepository('update-test'))
  const registration = await service.saveRegistration(fields('楽天市場'))

  await service.updateRegistration(registration.id, { ...fields('楽天市場（新）'), memo: '更新済み' })

  await expect(service.list()).resolves.toMatchObject([{ id: registration.id, title: '楽天市場（新）', memo: '更新済み', sortOrder: 0 }])
})

it('keeps both edits by re-encrypting a received conflict with a new identity', async () => {
  const localRepository = createVaultRepository('merge-local-test')
  const local = await VaultService.create('correct horse battery staple', localRepository)
  const registration = await local.saveRegistration(fields('楽天市場'))
  const remoteRepository = createVaultRepository('merge-remote-test')
  await remoteRepository.replaceRaw(await localRepository.readAllRaw())
  const remote = await VaultService.unlock('correct horse battery staple', remoteRepository)

  await local.updateRegistration(registration.id, fields('楽天市場（PC）'))
  await remote.updateRegistration(registration.id, fields('楽天市場（スマホ）'))

  await local.mergeEncryptedEnvelopes((await remoteRepository.readAllRaw()).envelopes)

  await expect(local.list()).resolves.toEqual(expect.arrayContaining([
    expect.objectContaining({ id: registration.id, title: '楽天市場（PC）' }),
    expect.objectContaining({ id: expect.not.stringMatching(registration.id), title: '楽天市場（スマホ）（競合コピー）' }),
  ]))
})
