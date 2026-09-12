import { argon2id } from 'hash-wasm'
import type { EncryptedEnvelope, EncryptedVaultHeader } from '../domain/models'

const text = new TextEncoder()
const json = new TextDecoder()
const TAG_LENGTH_BYTES = 16
const NONCE_LENGTH_BYTES = 12
const ENCRYPTION_SALT_LENGTH_BYTES = 32

export type VaultKey = CryptoKey

type Vault = {
  header: EncryptedVaultHeader
  key: VaultKey
}

type EncryptableRecord = {
  id: string
  revision?: number
  deletedAt?: string | null
  [key: string]: unknown
}

const randomBytes = (length: number) => crypto.getRandomValues(new Uint8Array(length))

const splitCiphertextAndTag = (encrypted: ArrayBuffer): { ciphertext: Uint8Array; tag: Uint8Array } => {
  const bytes = new Uint8Array(encrypted)
  return {
    ciphertext: bytes.slice(0, -TAG_LENGTH_BYTES),
    tag: bytes.slice(-TAG_LENGTH_BYTES),
  }
}

const joinCiphertextAndTag = (ciphertext: Uint8Array, tag: Uint8Array) => {
  const joined = new Uint8Array(ciphertext.length + tag.length)
  joined.set(ciphertext)
  joined.set(tag, ciphertext.length)
  return joined
}

const toBase64Url = (value: Uint8Array) => {
  let binary = ''
  for (const byte of value) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

const recordAdditionalData = (envelope: Pick<EncryptedEnvelope, 'formatVersion' | 'algorithmVersion' | 'objectType' | 'objectId' | 'revision' | 'deleted' | 'encryptionSalt'>) =>
  text.encode(JSON.stringify({
    formatVersion: envelope.formatVersion,
    algorithmVersion: envelope.algorithmVersion,
    objectType: envelope.objectType,
    objectId: envelope.objectId,
    revision: envelope.revision,
    deleted: envelope.deleted,
    encryptionSalt: toBase64Url(envelope.encryptionSalt),
  }))

const browserBytes = (value: Uint8Array) => Uint8Array.from(value)

const importAesKey = (key: Uint8Array, usages: KeyUsage[]) => crypto.subtle.importKey('raw', browserBytes(key), 'AES-GCM', false, usages)

export async function deriveArgon2idKey(password: Uint8Array, salt: Uint8Array): Promise<Uint8Array> {
  if (salt.length !== 32) throw new RangeError('Argon2id salt must be 32 bytes')

  const derived = await argon2id({
    password,
    salt,
    parallelism: 4,
    iterations: 3,
    memorySize: 65536,
    hashLength: 32,
    outputType: 'binary',
  })

  return new Uint8Array(derived)
}

export async function createVault(masterPassword: string): Promise<Vault> {
  const salt = randomBytes(32)
  const passwordBytes = text.encode(masterPassword)
  const wrappingKeyBytes = await deriveArgon2idKey(passwordBytes, salt)
  passwordBytes.fill(0)

  try {
    const wrappingKey = await importAesKey(wrappingKeyBytes, ['encrypt', 'decrypt'])
    const vaultKeyBytes = randomBytes(32)
    const nonce = randomBytes(NONCE_LENGTH_BYTES)
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: browserBytes(nonce) }, wrappingKey, browserBytes(vaultKeyBytes))
    const wrapped = splitCiphertextAndTag(encrypted)
    const key = await importAesKey(vaultKeyBytes, ['encrypt', 'decrypt'])
    vaultKeyBytes.fill(0)

    return {
      key,
      header: {
        formatVersion: 1,
        algorithmVersion: 1,
        kdf: { version: 19, salt, memoryKiB: 65536, iterations: 3, lanes: 4, outputLength: 32 },
        wrappedVaultKey: { nonce, ...wrapped },
      },
    }
  } finally {
    wrappingKeyBytes.fill(0)
  }
}

export async function unlockVault(header: EncryptedVaultHeader, masterPassword: string): Promise<Vault> {
  if (header.formatVersion !== 1 || header.algorithmVersion !== 1 || header.kdf.version !== 19) {
    throw new Error('未対応の保管庫形式です')
  }

  const passwordBytes = text.encode(masterPassword)
  const wrappingKeyBytes = await deriveArgon2idKey(passwordBytes, header.kdf.salt)
  passwordBytes.fill(0)

  try {
    const wrappingKey = await importAesKey(wrappingKeyBytes, ['decrypt'])
    const combined = joinCiphertextAndTag(header.wrappedVaultKey.ciphertext, header.wrappedVaultKey.tag)
    const vaultKeyBytes = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: browserBytes(header.wrappedVaultKey.nonce) }, wrappingKey, browserBytes(combined)))
    const key = await importAesKey(vaultKeyBytes, ['encrypt', 'decrypt'])
    vaultKeyBytes.fill(0)
    return { header, key }
  } catch {
    throw new Error('保管庫を解除できません')
  } finally {
    wrappingKeyBytes.fill(0)
  }
}

export async function encryptRecord(
  key: VaultKey,
  record: EncryptableRecord,
  objectType: EncryptedEnvelope['objectType'] = 'registration',
): Promise<EncryptedEnvelope> {
  const encryptionSalt = randomBytes(ENCRYPTION_SALT_LENGTH_BYTES)
  const envelope: EncryptedEnvelope = {
    formatVersion: 1,
    algorithmVersion: 1,
    objectType,
    objectId: record.id,
    revision: record.revision ?? 1,
    deleted: Boolean(record.deletedAt),
    encryptionSalt,
    nonce: randomBytes(NONCE_LENGTH_BYTES),
    ciphertext: new Uint8Array(),
    tag: new Uint8Array(),
  }
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: browserBytes(envelope.nonce), additionalData: browserBytes(recordAdditionalData(envelope)), tagLength: 128 },
    key,
    browserBytes(text.encode(JSON.stringify(record))),
  )
  const { ciphertext, tag } = splitCiphertextAndTag(encrypted)
  return { ...envelope, ciphertext, tag }
}

export async function decryptRecord<T = Record<string, unknown>>(key: VaultKey, envelope: EncryptedEnvelope): Promise<T> {
  if (envelope.formatVersion !== 1 || envelope.algorithmVersion !== 1) {
    throw new Error('未対応の保管庫形式です')
  }

  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: browserBytes(envelope.nonce), additionalData: browserBytes(recordAdditionalData(envelope)), tagLength: 128 },
      key,
      browserBytes(joinCiphertextAndTag(envelope.ciphertext, envelope.tag)),
    )
    return JSON.parse(json.decode(plaintext)) as T
  } catch {
    throw new Error('保管庫データが壊れています')
  }
}

