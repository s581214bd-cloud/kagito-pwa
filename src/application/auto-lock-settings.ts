import type { VaultRepository } from '../storage/vault-repository'

export type AutoLockDuration = 30_000 | 60_000 | 300_000 | 'none'

const defaultDuration: AutoLockDuration = 300_000
const allowedDurations: readonly AutoLockDuration[] = [30_000, 60_000, 300_000, 'none']

export const toAutoLockTimeout = (duration: AutoLockDuration): number | undefined => duration === 'none' ? undefined : duration

export class AutoLockSettings {
  private readonly repository: VaultRepository

  constructor(repository: VaultRepository) {
    this.repository = repository
  }

  async read(): Promise<AutoLockDuration> {
    const value = await this.repository.readAutoLockDuration()
    return allowedDurations.includes(value as AutoLockDuration) ? value as AutoLockDuration : defaultDuration
  }

  async save(value: AutoLockDuration): Promise<void> {
    await this.repository.writeAutoLockDuration(value)
  }
}
