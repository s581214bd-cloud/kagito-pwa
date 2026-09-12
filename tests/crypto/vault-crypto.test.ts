import vector from '../fixtures/kagito-argon2id-v1.json'
import {
  createVault,
  decryptRecord,
  deriveArgon2idKey,
  encryptRecord,
  unlockVault,
} from '../../src/crypto/vault-crypto'

const fromHex = (value: string) => Uint8Array.from(value.match(/.{1,2}/g)!.map((byte) => Number.parseInt(byte, 16)))

it('derives the Windows-compatible Argon2id vector', async () => {
  const key = await deriveArgon2idKey(fromHex(vector.passwordHex), fromHex(vector.saltHex))

  expect(Array.from(key).map((byte) => byte.toString(16).padStart(2, '0')).join('')).toBe(vector.expectedKeyHex)
})

it('decrypts a record only with the originating master password', async () => {
  const vault = await createVault('correct horse battery staple')
  const envelope = await encryptRecord(vault.key, { id: 'r1', title: '楽天市場' })

  await expect(decryptRecord(vault.key, envelope)).resolves.toMatchObject({ title: '楽天市場' })
  await expect(unlockVault(vault.header, 'wrong password')).rejects.toThrow('保管庫を解除できません')
})

it('encrypts a category with a category envelope type', async () => {
  const vault = await createVault('correct horse battery staple')
  const category = {
    id: 'shopping', name: '買い物', sortOrder: 0,
    createdAt: '2026-09-12T00:00:00.000Z', updatedAt: '2026-09-12T00:00:00.000Z',
    deletedAt: null, revision: 1,
  }
  const envelope = await encryptRecord(vault.key, category, 'category')

  expect(envelope.objectType).toBe('category')
  await expect(decryptRecord(vault.key, envelope)).resolves.toEqual(category)
})

it('rejects a modified authenticated envelope', async () => {
  const vault = await createVault('correct horse battery staple')
  const envelope = await encryptRecord(vault.key, { id: 'r1', title: '楽天市場' })
  envelope.ciphertext[0] ^= 1

  await expect(decryptRecord(vault.key, envelope)).rejects.toThrow('保管庫データが壊れています')
})

it('rejects an unsupported envelope version before decryption', async () => {
  const vault = await createVault('correct horse battery staple')
  const envelope = await encryptRecord(vault.key, { id: 'r1', title: '楽天市場' })

  await expect(decryptRecord(vault.key, { ...envelope, formatVersion: 2 })).rejects.toThrow('未対応の保管庫形式です')
})
