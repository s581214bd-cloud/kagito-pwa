export type Registration = {
  id: string
  title: string
  accountId: string
  password: string
  url: string
  categoryId: string
  memo: string
  favorite: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  revision: number
}

export type Category = {
  id: string
  name: string
  sortOrder: number
}

export type VaultCategory = Category & {
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  revision: number
}

export type EncryptedVaultHeader = {
  formatVersion: 1
  algorithmVersion: 1
  kdf: {
    version: 19
    salt: Uint8Array
    memoryKiB: 65536
    iterations: 3
    lanes: 4
    outputLength: 32
  }
  wrappedVaultKey: {
    nonce: Uint8Array
    ciphertext: Uint8Array
    tag: Uint8Array
  }
}

export type EncryptedEnvelope = {
  formatVersion: 1
  algorithmVersion: 1
  objectType: 'registration' | 'category'
  objectId: string
  revision: number
  deleted: boolean
  encryptionSalt: Uint8Array
  nonce: Uint8Array
  ciphertext: Uint8Array
  tag: Uint8Array
}
