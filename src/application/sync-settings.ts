import type { SyncConnection } from './sync-client'
import type { VaultRepository } from '../storage/vault-repository'

export class SyncSettings {
  private readonly repository: VaultRepository

  constructor(repository: VaultRepository) {
    this.repository = repository
  }

  async read(): Promise<SyncConnection | undefined> {
    return this.repository.readSyncConnection()
  }

  async save(connection: SyncConnection): Promise<void> {
    await this.repository.writeSyncConnection(connection)
  }

  async forget(): Promise<void> {
    await this.repository.clearSyncConnection()
  }
}
