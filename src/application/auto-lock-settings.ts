import type { VaultRepository } from '../storage/vault-repository'

export type AutoLockDuration = 30_000 | 60_000 | 300_000 | 'none'

const defaultDuration: AutoLockDuration = 300_000
const allowedDurations: readonly AutoLockDuration[] = [30_000, 60_000, 300_000, 'none']

export class AutoLockSettings {
  constructor(private readonly repository: VaultRepository) {}

  async read(): Promise<AutoLockDuration> {
    const value = await this.repository.readAutoLockDuration()
    return allowedDurations.includes(value as AutoLockDuration) ? value as AutoLockDuration : defaultDuration
  }

  async save(value: AutoLockDuration): Promise<void> {
    await this.repository.writeAutoLockDuration(value)
  }
}
