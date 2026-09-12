import { expect, it } from 'vitest'
import { PairingClient, type PairingFetcher } from '../../src/application/pairing-client'

const link = 'kagito://pair?server=https%3A%2F%2Fkagito.local&code=invite-code'

it('requests approval before claiming a one-time device token', async () => {
  const requests: Array<{ url: string; init: { method: string; body?: string } }> = []
  let approved = false
  const fetcher: PairingFetcher = async (url, init) => {
    requests.push({ url, init })
    if (url.endsWith('/pairing/request')) return { ok: true, json: async () => ({ requestId: 'request-1' }) }
    if (!approved) return { ok: false, json: async () => ({}) }
    return { ok: true, json: async () => ({ deviceId: 'phone-1', token: 'device-token' }) }
  }
  const client = new PairingClient(fetcher)

  const pending = await client.request(link, 'My iPhone')
  await expect(client.claim(pending)).rejects.toThrow('PCで承認してください')
  approved = true
  await expect(client.claim(pending)).resolves.toEqual({ serverUrl: 'https://kagito.local', deviceId: 'phone-1', token: 'device-token' })

  expect(requests).toHaveLength(3)
  expect(requests[0].init.body).toBe(JSON.stringify({ code: 'invite-code', deviceName: 'My iPhone' }))
})

it('refuses a non-KAGITO pairing link', async () => {
  await expect(new PairingClient(async () => ({ ok: true, json: async () => ({}) })).request('https://example.com', 'phone')).rejects.toThrow('KAGITOの接続コードを入力してください')
})
