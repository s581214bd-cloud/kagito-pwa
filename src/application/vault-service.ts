import { createVault, decryptRecord, encryptRecord, unlockVault, type VaultKey } from '../crypto/vault-crypto'
import type { Registration, VaultCategory } from '../domain/models'
import { createVaultRepository, decodeStoredEnvelope, type RawVaultData, type StoredEnvelope, type VaultRepository } from '../storage/vault-repository'

export type RegistrationInput = Pick<Registration, 'title' | 'accountId' | 'password' | 'url' | 'categoryId' | 'memo'> &
  Partial<Pick<Registration, 'favorite'>>
export type SortMode = 'manual' | 'name' | 'updated' | 'created'

const defaultCategoryDefinitions = [
  { id: 'shopping', name: '買い物' },
  { id: 'finance', name: '金融' },
  { id: 'work', name: '仕事' },
  { id: 'other', name: 'その他' },
]

export class VaultService {
  private readonly key: VaultKey
  private readonly repository: VaultRepository

  private constructor(key: VaultKey, repository: VaultRepository) {
    this.key = key
    this.repository = repository
  }

  static async create(masterPassword: string, repository: VaultRepository = createVaultRepository()) {
    const vault = await createVault(masterPassword)
    await repository.writeHeader(vault.header)
    const service = new VaultService(vault.key, repository)
    await service.migrateDefaultCategories()
    return service
  }

  static async unlock(masterPassword: string, repository: VaultRepository = createVaultRepository()) {
    const header = await repository.readHeader()
    if (header === undefined) throw new Error('保管庫が見つかりません')
    const vault = await unlockVault(header, masterPassword)
    return new VaultService(vault.key, repository)
  }

  static async importEncrypted(backup: Blob, repository: VaultRepository = createVaultRepository()): Promise<void> {
    let candidate: unknown
    try {
      candidate = JSON.parse(await backup.text())
    } catch {
      throw new Error('バックアップ形式が正しくありません')
    }
    if (!isEncryptedExport(candidate)) throw new Error('バックアップ形式が正しくありません')
    await repository.replaceRaw(candidate)
  }

  async list(sort: SortMode = 'manual'): Promise<Registration[]> {
    const registrations = (await this.readRegistrations()).filter((registration) => registration.deletedAt === null)
    return registrations.toSorted((left, right) => {
      if (sort === 'name') return left.title.localeCompare(right.title, 'ja')
      if (sort === 'updated') return right.updatedAt.localeCompare(left.updatedAt)
      if (sort === 'created') return right.createdAt.localeCompare(left.createdAt)
      return left.sortOrder - right.sortOrder
    })
  }

  async listCategories(): Promise<VaultCategory[]> {
    const categories = await this.readCategories()
    if (categories.length === 0) return this.defaultCategories()
    return categories.filter((category) => category.deletedAt === null).toSorted((left, right) => left.sortOrder - right.sortOrder)
  }

  async migrateDefaultCategories(): Promise<void> {
    if ((await this.readCategories()).length > 0) return
    await Promise.all(this.defaultCategories().map(async (category) => {
      await this.repository.putEnvelope(await encryptRecord(this.key, category, 'category'))
    }))
  }

  async saveCategory(name: string): Promise<VaultCategory> {
    await this.migrateDefaultCategories()
    const categories = await this.listCategories()
    const now = new Date().toISOString()
    const category: VaultCategory = {
      id: crypto.randomUUID(),
      name: normalizeCategoryName(name, categories),
      sortOrder: categories.length,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      revision: 1,
    }
    await this.repository.putEnvelope(await encryptRecord(this.key, category, 'category'))
    return category
  }

  async updateCategory(id: string, name: string): Promise<VaultCategory> {
    await this.migrateDefaultCategories()
    const categories = await this.listCategories()
    const category = categories.find((candidate) => candidate.id === id)
    if (category === undefined) throw new Error('カテゴリが見つかりません')
    const updated: VaultCategory = {
      ...category,
      name: normalizeCategoryName(name, categories.filter((candidate) => candidate.id !== id)),
      updatedAt: new Date().toISOString(),
      revision: category.revision + 1,
    }
    await this.repository.putEnvelope(await encryptRecord(this.key, updated, 'category'))
    return updated
  }

  async moveCategory(id: string, targetIndex: number): Promise<void> {
    await this.migrateDefaultCategories()
    const categories = await this.listCategories()
    const currentIndex = categories.findIndex((category) => category.id === id)
    if (currentIndex < 0) throw new Error('カテゴリが見つかりません')
    const [moved] = categories.splice(currentIndex, 1)
    categories.splice(Math.max(0, Math.min(targetIndex, categories.length)), 0, moved)
    await Promise.all(categories.map(async (category, index) => {
      if (category.sortOrder === index) return
      const updated = { ...category, sortOrder: index, updatedAt: new Date().toISOString(), revision: category.revision + 1 }
      await this.repository.putEnvelope(await encryptRecord(this.key, updated, 'category'))
    }))
  }

  async deleteCategory(id: string): Promise<void> {
    await this.migrateDefaultCategories()
    const categories = await this.listCategories()
    if (categories.length === 1) throw new Error('最後のカテゴリは削除できません')
    if ((await this.readRegistrations()).some((registration) => registration.deletedAt === null && registration.categoryId === id)) {
      throw new Error('使用中のカテゴリは削除できません')
    }
    const category = categories.find((candidate) => candidate.id === id)
    if (category === undefined) throw new Error('カテゴリが見つかりません')
    const deleted: VaultCategory = {
      ...category,
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      revision: category.revision + 1,
    }
    await this.repository.putEnvelope(await encryptRecord(this.key, deleted, 'category'))
  }

  async saveRegistration(input: RegistrationInput): Promise<Registration> {
    const now = new Date().toISOString()
    const registration: Registration = {
      id: crypto.randomUUID(),
      title: input.title,
      accountId: input.accountId,
      password: input.password,
      url: input.url,
      categoryId: input.categoryId,
      memo: input.memo,
      favorite: input.favorite ?? false,
      sortOrder: (await this.list('manual')).length,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      revision: 1,
    }
    await this.repository.putEnvelope(await encryptRecord(this.key, registration))
    return registration
  }

  async updateRegistration(id: string, input: RegistrationInput): Promise<Registration> {
    const registration = (await this.readRegistrations()).find((candidate) => candidate.id === id && candidate.deletedAt === null)
    if (registration === undefined) throw new Error('登録情報が見つかりません')
    const updated: Registration = {
      ...registration,
      ...input,
      updatedAt: new Date().toISOString(),
      revision: registration.revision + 1,
    }
    await this.repository.putEnvelope(await encryptRecord(this.key, updated))
    return updated
  }

  async moveRegistration(id: string, targetIndex: number): Promise<void> {
    const registrations = await this.list('manual')
    const currentIndex = registrations.findIndex((registration) => registration.id === id)
    if (currentIndex < 0) throw new Error('登録情報が見つかりません')

    const [moved] = registrations.splice(currentIndex, 1)
    registrations.splice(Math.max(0, Math.min(targetIndex, registrations.length)), 0, moved)
    await Promise.all(registrations.map(async (registration, index) => {
      if (registration.sortOrder === index) return
      const updated = { ...registration, sortOrder: index, revision: registration.revision + 1, updatedAt: new Date().toISOString() }
      await this.repository.putEnvelope(await encryptRecord(this.key, updated))
    }))
  }

  async deleteRegistration(id: string): Promise<void> {
    const registration = (await this.readRegistrations()).find((candidate) => candidate.id === id && candidate.deletedAt === null)
    if (registration === undefined) throw new Error('登録情報が見つかりません')
    const deleted = { ...registration, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), revision: registration.revision + 1 }
    await this.repository.putEnvelope(await encryptRecord(this.key, deleted))
  }

  async exportEncrypted(): Promise<Blob> {
    const raw = await this.repository.readAllRaw()
    return new Blob([JSON.stringify({ format: 'kagito-export-v1', ...raw })], { type: 'application/json' })
  }

  async mergeEncryptedEnvelopes(envelopes: unknown[]): Promise<{ received: number; conflicts: number }> {
    const local = await this.repository.readEnvelopes()
    const existing = new Map(local.map((envelope) => [envelope.objectId, envelope]))
    let received = 0
    let conflicts = 0

    for (const candidate of envelopes) {
      if (!isStoredEnvelope(candidate)) throw new Error('同期データの形式が正しくありません')
      const stored = candidate
      const receivedEnvelope = decodeStoredEnvelope(stored)
      const current = existing.get(receivedEnvelope.objectId)
      if (current === undefined) {
        await this.repository.putEnvelope(receivedEnvelope)
        existing.set(receivedEnvelope.objectId, receivedEnvelope)
        received += 1
        continue
      }
      if (sameEnvelope(current, receivedEnvelope)) continue
      if (receivedEnvelope.objectType === 'category' && current.objectType === 'category') {
        const localCategory = await decryptRecord<VaultCategory>(this.key, current)
        const receivedCategory = await decryptRecord<VaultCategory>(this.key, receivedEnvelope)
        if (receivedCategory.updatedAt > localCategory.updatedAt) {
          await this.repository.putEnvelope(receivedEnvelope)
          existing.set(receivedEnvelope.objectId, receivedEnvelope)
          received += 1
        }
        continue
      }
      if (receivedEnvelope.objectType !== 'registration') continue

      const registration = await decryptRecord<Registration>(this.key, receivedEnvelope)
      const conflict: Registration = {
        ...registration,
        id: crypto.randomUUID(),
        title: `${registration.title}（競合コピー）`,
        updatedAt: new Date().toISOString(),
        revision: 1,
      }
      await this.repository.putEnvelope(await encryptRecord(this.key, conflict))
      conflicts += 1
    }

    return { received, conflicts }
  }

  private async readRegistrations(): Promise<Registration[]> {
    const envelopes = await this.repository.readEnvelopes()
    const registrations = envelopes.filter((envelope) => envelope.objectType === 'registration')
    return Promise.all(registrations.map((envelope) => decryptRecord<Registration>(this.key, envelope)))
  }

  private async readCategories(): Promise<VaultCategory[]> {
    const envelopes = (await this.repository.readEnvelopes()).filter((envelope) => envelope.objectType === 'category')
    return Promise.all(envelopes.map((envelope) => decryptRecord<VaultCategory>(this.key, envelope)))
  }

  private defaultCategories(): VaultCategory[] {
    const timestamp = '1970-01-01T00:00:00.000Z'
    return defaultCategoryDefinitions.map((category, sortOrder) => ({
      ...category,
      sortOrder,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
      revision: 1,
    }))
  }
}

const normalizeCategoryName = (name: string, existing: VaultCategory[]) => {
  const normalized = name.trim()
  if (normalized.length === 0) throw new Error('カテゴリ名を入力してください')
  if (existing.some((category) => category.name === normalized)) throw new Error('同じカテゴリ名が登録されています')
  return normalized
}

const sameEnvelope = (left: { ciphertext: Uint8Array; tag: Uint8Array }, right: { ciphertext: Uint8Array; tag: Uint8Array }) =>
  left.ciphertext.length === right.ciphertext.length
  && left.tag.length === right.tag.length
  && left.ciphertext.every((value, index) => value === right.ciphertext[index])
  && left.tag.every((value, index) => value === right.tag[index])

const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)

const isStoredEnvelope = (value: unknown): value is StoredEnvelope => isObject(value)
  && value.formatVersion === 1
  && value.algorithmVersion === 1
  && (value.objectType === 'registration' || value.objectType === 'category')
  && typeof value.objectId === 'string'
  && typeof value.revision === 'number'
  && typeof value.deleted === 'boolean'
  && typeof value.encryptionSalt === 'string'
  && typeof value.nonce === 'string'
  && typeof value.ciphertext === 'string'
  && typeof value.tag === 'string'

const isEncryptedExport = (value: unknown): value is RawVaultData => {
  if (!isObject(value) || value.format !== 'kagito-export-v1' || !Array.isArray(value.envelopes) || !isObject(value.header)) return false
  const header = value.header
  if (header.formatVersion !== 1 || header.algorithmVersion !== 1 || !isObject(header.kdf) || !isObject(header.wrappedVaultKey)) return false
  if (typeof header.kdf.salt !== 'string' || typeof header.wrappedVaultKey.nonce !== 'string' || typeof header.wrappedVaultKey.ciphertext !== 'string' || typeof header.wrappedVaultKey.tag !== 'string') return false
  return value.envelopes.every((envelope) => isObject(envelope)
    && envelope.formatVersion === 1
    && envelope.algorithmVersion === 1
    && (envelope.objectType === 'registration' || envelope.objectType === 'category')
    && typeof envelope.objectId === 'string'
    && typeof envelope.encryptionSalt === 'string'
    && typeof envelope.nonce === 'string'
    && typeof envelope.ciphertext === 'string'
    && typeof envelope.tag === 'string')
}

