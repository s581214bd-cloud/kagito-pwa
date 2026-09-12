import { expect, it } from 'vitest'
import { SyncSettings } from '../../src/application/sync-settings'
import { createVaultRepository } from '../../src/storage/vault-repository'

it('saves and forgets only the current device connection', async () => {
  const settings = new SyncSettings(createVaultRepository('sync-settings-application-test'))
  await settings.save({ serverUrl: 'https://kagito.local', deviceId: 'phone-1', token: 'device-token' })

  await expect(settings.read()).resolves.toEqual({ serverUrl: 'https://kagito.local', deviceId: 'phone-1', token: 'device-token' })
  await settings.forget()
  await expect(settings.read()).resolves.toBeUndefined()
})
