import { openDB } from 'idb'
import type { EncryptedEnvelope, EncryptedVaultHeader } from '../domain/models'

type StoredWrappedKey = { nonce: string; ciphertext: string; tag: string }
type StoredHeader = Omit<EncryptedVaultHeader, 'kdf' | 'wrappedVaultKey'> & {
  kdf: Omit<EncryptedVaultHeader['kdf'], 'salt'> & { salt: string }
  wrappedVaultKey: StoredWrappedKey
}
export type StoredEnvelope = Omit<EncryptedEnvelope, 'encryptionSalt' | 'nonce' | 'ciphertext' | 'tag'> & {
  encryptionSalt: string
  nonce: string
  ciphertext: string
  tag: string
}

const toBase64Url = (value: Uint8Array) => {
  let binary = ''
  for (const byte of value) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

const fromBase64Url = (value: string) => {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = normalized.padEnd(normalized.length + (4 - normalized.length % 4) % 4, '=')
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
}

const encodeHeader = (header: EncryptedVaultHeader): StoredHeader => ({
  ...header,
  kdf: { ...header.kdf, salt: toBase64Url(header.kdf.salt) },
  wrappedVaultKey: {
    nonce: toBase64Url(header.wrappedVaultKey.nonce),
    ciphertext: toBase64Url(header.wrappedVaultKey.ciphertext),
    tag: toBase64Url(header.wrappedVaultKey.tag),
  },
})

const decodeHeader = (header: StoredHeader): EncryptedVaultHeader => ({
  ...header,
  kdf: { ...header.kdf, salt: fromBase64Url(header.kdf.salt) },
  wrappedVaultKey: {
    nonce: fromBase64Url(header.wrappedVaultKey.nonce),
    ciphertext: fromBase64Url(header.wrappedVaultKey.ciphertext),
    tag: fromBase64Url(header.wrappedVaultKey.tag),
  },
})

const encodeEnvelope = (envelope: EncryptedEnvelope): StoredEnvelope => ({
  ...envelope,
  encryptionSalt: toBase64Url(envelope.encryptionSalt),
  nonce: toBase64Url(envelope.nonce),
  ciphertext: toBase64Url(envelope.ciphertext),
  tag: toBase64Url(envelope.tag),
})

const decodeEnvelope = (envelope: StoredEnvelope): EncryptedEnvelope => ({
  ...envelope,
  encryptionSalt: fromBase64Url(envelope.encryptionSalt),
  nonce: fromBase64Url(envelope.nonce),
  ciphertext: fromBase64Url(envelope.ciphertext),
  tag: fromBase64Url(envelope.tag),
})

export const decodeStoredEnvelope = (envelope: StoredEnvelope): EncryptedEnvelope => decodeEnvelope(envelope)

export type RawVaultData = {
  header: StoredHeader | undefined
  envelopes: StoredEnvelope[]
}

export type StoredSyncConnection = {
  serverUrl: string
  deviceId: string
  token: string
}

export interface VaultRepository {
  readHeader(): Promise<EncryptedVaultHeader | undefined>
  writeHeader(header: EncryptedVaultHeader): Promise<void>
  readEnvelopes(): Promise<EncryptedEnvelope[]>
  putEnvelope(envelope: EncryptedEnvelope): Promise<void>
  deleteEnvelope(id: string): Promise<void>
  readAllRaw(): Promise<RawVaultData>
  replaceRaw(data: RawVaultData): Promise<void>
  readSyncConnection(): Promise<StoredSyncConnection | undefined>
  writeSyncConnection(connection: StoredSyncConnection): Promise<void>
  clearSyncConnection(): Promise<void>
  readAutoLockDuration(): Promise<unknown>
  writeAutoLockDuration(duration: number | 'none'): Promise<void>
  readPasswordGeneratorOptions(): Promise<unknown>
  writePasswordGeneratorOptions(options: unknown): Promise<void>
}

export const createVaultRepository = (name = 'kagito-vault-v1'): VaultRepository => {
  const database = openDB(name, 4, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('vault-header')) db.createObjectStore('vault-header')
      if (!db.objectStoreNames.contains('vault-envelopes')) db.createObjectStore('vault-envelopes', { keyPath: 'objectId' })
      if (!db.objectStoreNames.contains('sync-connection')) db.createObjectStore('sync-connection')
      if (!db.objectStoreNames.contains('auto-lock-settings')) db.createObjectStore('auto-lock-settings')
      if (!db.objectStoreNames.contains('password-generator-settings')) db.createObjectStore('password-generator-settings')
    },
  })

  return {
    async readHeader() {
      const stored = await database.then((db) => db.get('vault-header', 'header')) as StoredHeader | undefined
      return stored === undefined ? undefined : decodeHeader(stored)
    },
    async writeHeader(header) {
      await database.then((db) => db.put('vault-header', encodeHeader(header), 'header'))
    },
    async readEnvelopes() {
      const stored = await database.then((db) => db.getAll('vault-envelopes')) as StoredEnvelope[]
      return stored.map(decodeEnvelope)
    },
    async putEnvelope(envelope) {
      await database.then((db) => db.put('vault-envelopes', encodeEnvelope(envelope)))
    },
    async deleteEnvelope(id) {
      await database.then((db) => db.delete('vault-envelopes', id))
    },
    async readAllRaw() {
      const db = await database
      return {
        header: await db.get('vault-header', 'header') as StoredHeader | undefined,
        envelopes: await db.getAll('vault-envelopes') as StoredEnvelope[],
      }
    },
    async replaceRaw(data) {
      const db = await database
      const transaction = db.transaction(['vault-header', 'vault-envelopes'], 'readwrite')
      await transaction.objectStore('vault-header').clear()
      await transaction.objectStore('vault-envelopes').clear()
      if (data.header !== undefined) await transaction.objectStore('vault-header').put(data.header, 'header')
      for (const envelope of data.envelopes) await transaction.objectStore('vault-envelopes').put(envelope)
      await transaction.done
    },
    async readSyncConnection() {
      return database.then((db) => db.get('sync-connection', 'connection')) as Promise<StoredSyncConnection | undefined>
    },
    async writeSyncConnection(connection) {
      await database.then((db) => db.put('sync-connection', connection, 'connection'))
    },
    async clearSyncConnection() {
      await database.then((db) => db.delete('sync-connection', 'connection'))
    },
    async readAutoLockDuration() {
      return database.then((db) => db.get('auto-lock-settings', 'duration'))
    },
    async writeAutoLockDuration(duration) {
      await database.then((db) => db.put('auto-lock-settings', duration, 'duration'))
    },
    async readPasswordGeneratorOptions() { return database.then((db) => db.get('password-generator-settings', 'options')) },
    async writePasswordGeneratorOptions(options) { await database.then((db) => db.put('password-generator-settings', options, 'options')) },
  }
}
