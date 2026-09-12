import { expect, it } from 'vitest'
import { AutoLockSettings } from '../../src/application/auto-lock-settings'
import { createVaultRepository } from '../../src/storage/vault-repository'

it('uses five minutes by default and persists a selected duration', async () => {
  const settings = new AutoLockSettings(createVaultRepository('auto-lock-settings-test'))

  await expect(settings.read()).resolves.toBe(300_000)
  await settings.save(60_000)

  await expect(settings.read()).resolves.toBe(60_000)
})
