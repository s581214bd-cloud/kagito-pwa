import type { SyncConnection } from './sync-client'

export type PendingPairing = { serverUrl: string; requestId: string }
export type PairingResponse = { ok: boolean; json(): Promise<unknown> }
export type PairingFetcher = (url: string, init: { method: 'POST'; headers: { 'content-type': 'application/json' }; body?: string; cache: 'no-store' }) => Promise<PairingResponse>

const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)

const parsePairingLink = (value: string) => {
  try {
    const link = new URL(value)
    if (link.protocol === 'kagito:' && link.hostname === 'pair') {
      const serverUrl = link.searchParams.get('server')
      const code = link.searchParams.get('code')
      if (serverUrl === null || code === null || new URL(serverUrl).protocol !== 'https:') throw new Error()
      return { serverUrl: new URL(serverUrl).origin, code }
    }
    const code = link.searchParams.get('pair')
    if (link.protocol !== 'https:' || code === null) throw new Error()
    return { serverUrl: link.origin, code }
  } catch {
    throw new Error('KAGITOの接続コードを入力してください')
  }
}

export class PairingClient {
  private readonly fetcher: PairingFetcher

  constructor(fetcher: PairingFetcher) {
    this.fetcher = fetcher
  }

  async request(pairingLink: string, deviceName: string): Promise<PendingPairing> {
    const { serverUrl, code } = parsePairingLink(pairingLink)
    const response = await this.fetcher(`${serverUrl}/pairing/request`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ code, deviceName }),
    })
    const body = await response.json()
    if (!response.ok || !isObject(body) || typeof body.requestId !== 'string') throw new Error('PCへの接続を開始できません')
    return { serverUrl, requestId: body.requestId }
  }

  async claim(pending: PendingPairing): Promise<SyncConnection> {
    const response = await this.fetcher(`${pending.serverUrl}/pairing/${encodeURIComponent(pending.requestId)}/claim`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      cache: 'no-store',
    })
    const body = await response.json()
    if (!response.ok || !isObject(body) || typeof body.deviceId !== 'string' || typeof body.token !== 'string') throw new Error('PCで承認してください')
    return { serverUrl: pending.serverUrl, deviceId: body.deviceId, token: body.token }
  }
}
