import { VaultService } from './vault-service'
import type { VaultRepository } from '../storage/vault-repository'

export type SyncConnection = {
  serverUrl: string
  deviceId: string
  token: string
}

export type SyncResponse = {
  ok: boolean
  json(): Promise<unknown>
}

type SyncRequest = {
  method: 'GET' | 'PUT'
  headers: { authorization: string; 'content-type'?: 'application/json' }
  cache: 'no-store'
  body?: string
}

export type SyncFetcher = (url: string, init: SyncRequest) => Promise<SyncResponse>

type RemoteEntry = { envelope: unknown }
type RemoteSnapshot = { generation: number; header: unknown; entries: RemoteEntry[] }

const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)

const isSnapshot = (value: unknown): value is RemoteSnapshot => isObject(value)
  && Number.isInteger(value.generation)
  && isObject(value.header)
  && Array.isArray(value.entries)
  && value.entries.every((entry) => isObject(entry) && 'envelope' in entry)

export class SyncClient {
  private readonly fetcher: SyncFetcher

  constructor(fetcher: SyncFetcher) {
    this.fetcher = fetcher
  }

  async initializeVault(connection: SyncConnection, repository: VaultRepository): Promise<void> {
    if (await repository.readHeader() !== undefined) throw new Error('保管庫はすでにあります')
    const snapshot = await this.requestSnapshot(connection)
    await VaultService.importEncrypted(new Blob([JSON.stringify({
      format: 'kagito-export-v1',
      header: snapshot.header,
      envelopes: snapshot.entries.map((entry) => entry.envelope),
    })], { type: 'application/json' }), repository)
  }

  async sync(service: VaultService, connection: SyncConnection): Promise<{ sent: number; received: number; conflicts: number }> {
    const snapshot = await this.requestSnapshot(connection)
    const merged = await service.mergeEncryptedEnvelopes(snapshot.entries.map((entry) => entry.envelope))
    const encrypted = JSON.parse(await (await service.exportEncrypted()).text()) as { header: unknown; envelopes: unknown[] }
    const write = await this.fetcher(`${connection.serverUrl}/sync`, {
      method: 'PUT',
      headers: { authorization: `Bearer ${connection.token}`, 'content-type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ generation: snapshot.generation, header: encrypted.header, envelopes: encrypted.envelopes }),
    })
    if (!write.ok) throw new Error('PCに接続できません')
    return { sent: encrypted.envelopes.length, received: merged.received, conflicts: merged.conflicts }
  }

  private async requestSnapshot(connection: SyncConnection): Promise<RemoteSnapshot> {
    let response: SyncResponse
    try {
      response = await this.fetcher(`${connection.serverUrl}/sync?since=0`, {
        method: 'GET',
        headers: { authorization: `Bearer ${connection.token}` },
        cache: 'no-store',
      })
    } catch {
      throw new Error('PCに接続できません')
    }
    if (!response.ok) throw new Error('PCに接続できません')
    const snapshot = await response.json()
    if (!isSnapshot(snapshot)) throw new Error('同期データの形式が正しくありません')
    return snapshot
  }
}
