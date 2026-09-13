import type { VaultRepository } from '../storage/vault-repository'

export type PasswordGeneratorOptions = { length: 16 | 24; includeSymbols: boolean }
const defaults: PasswordGeneratorOptions = { length: 16, includeSymbols: true }

export class PasswordGeneratorSettings {
  private readonly repository: VaultRepository

  constructor(repository: VaultRepository) {
    this.repository = repository
  }
  async read(): Promise<PasswordGeneratorOptions> {
    const value = await this.repository.readPasswordGeneratorOptions()
    return typeof value === 'object' && value !== null && ((value as PasswordGeneratorOptions).length === 16 || (value as PasswordGeneratorOptions).length === 24) && typeof (value as PasswordGeneratorOptions).includeSymbols === 'boolean' ? value as PasswordGeneratorOptions : defaults
  }
  async save(options: PasswordGeneratorOptions) { await this.repository.writePasswordGeneratorOptions(options) }
}
