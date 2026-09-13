import { expect, it } from 'vitest'
import { PasswordGeneratorSettings } from '../../src/application/password-generator-settings'
import { createVaultRepository } from '../../src/storage/vault-repository'

it('uses defaults and restores saved password generator options', async () => {
  const repository = createVaultRepository('password-generator-settings-test')
  const settings = new PasswordGeneratorSettings(repository)

  expect(await settings.read()).toEqual({ length: 16, includeSymbols: true })
  await settings.save({ length: 24, includeSymbols: false })
  expect(await settings.read()).toEqual({ length: 24, includeSymbols: false })
})

it('restores a 16-character password generator setting without symbols', async () => {
  const repository = createVaultRepository('password-generator-settings-short-no-symbols-test')
  const settings = new PasswordGeneratorSettings(repository)

  await settings.save({ length: 16, includeSymbols: false })

  expect(await settings.read()).toEqual({ length: 16, includeSymbols: false })
})
