import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { VaultService } from '../application/vault-service'
import { PairingClient, type PendingPairing } from '../application/pairing-client'
import { SyncClient, type SyncConnection } from '../application/sync-client'
import { SyncSettings } from '../application/sync-settings'
import type { Category, Registration } from '../domain/models'
import { createVaultRepository } from '../storage/vault-repository'
import { RegistrationScreen } from './screens/RegistrationScreen'
import { VaultListScreen } from './screens/VaultListScreen'
import { VaultSettingsScreen } from './screens/VaultSettingsScreen'
import { SyncScreen } from './screens/SyncScreen'
import { CategoryManagementScreen } from './screens/CategoryManagementScreen'

type Screen = 'locked' | 'vault' | 'registration' | 'settings' | 'categories' | 'sync'

export default function App() {
  const repository = useRef(createVaultRepository())
  const syncSettings = useRef(new SyncSettings(repository.current))
  const [screen, setScreen] = useState<Screen>('locked')
  const [service, setService] = useState<VaultService | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | undefined>()
  const [masterPassword, setMasterPassword] = useState('')
  const [masterPasswordConfirmation, setMasterPasswordConfirmation] = useState('')
  const [showMasterPassword, setShowMasterPassword] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [hasVault, setHasVault] = useState(false)
  const [vaultReady, setVaultReady] = useState(false)
  const [error, setError] = useState('')
  const [connection, setConnection] = useState<SyncConnection | undefined>()
  const [pendingPairing, setPendingPairing] = useState<PendingPairing | undefined>()
  const pairingLinkFromPage = (() => {
    const link = new URL(window.location.href)
    const code = link.searchParams.get('pair')
    return code === null ? undefined : `${link.origin}/?pair=${encodeURIComponent(code)}`
  })()

  const lock = useCallback(() => {
    setService(null)
    setRegistrations([])
    setCategories([])
    setSelectedRegistration(undefined)
    setMasterPassword('')
    setMasterPasswordConfirmation('')
    setShowMasterPassword(false)
    setError('')
    setShowPasswordForm(false)
    setScreen('locked')
  }, [])

  const refreshRegistrations = useCallback(async (activeService: VaultService) => {
    setRegistrations(await activeService.list('manual'))
  }, [])
  const refreshCategories = useCallback(async (activeService: VaultService) => {
    setCategories(await activeService.listCategories())
  }, [])

  useEffect(() => {
    void Promise.all([repository.current.readHeader(), syncSettings.current.read()]).then(([header, savedConnection]) => {
      setHasVault(header !== undefined)
      setConnection(savedConnection)
      setVaultReady(true)
      if (pairingLinkFromPage !== undefined) setScreen('sync')
    })
  }, [])

  useLayoutEffect(() => {
    if (service === null) return
    let timeout = window.setTimeout(lock, 300_000)
    const resetTimer = () => {
      window.clearTimeout(timeout)
      timeout = window.setTimeout(lock, 300_000)
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') lock()
    }
    window.addEventListener('pointerdown', resetTimer)
    window.addEventListener('keydown', resetTimer)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.clearTimeout(timeout)
      window.removeEventListener('pointerdown', resetTimer)
      window.removeEventListener('keydown', resetTimer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [lock, service])

  const openPasswordForm = () => {
    setError('')
    setMasterPassword('')
    setMasterPasswordConfirmation('')
    setShowMasterPassword(false)
    setShowPasswordForm(true)
  }

  const submitPassword = async () => {
    if (masterPassword.length < 8) {
      setError('マスターパスワードは8文字以上にしてください')
      return
    }
    if (!hasVault && masterPassword !== masterPasswordConfirmation) {
      setError('マスターパスワードが一致しません')
      return
    }
    try {
      const activeService = hasVault
        ? await VaultService.unlock(masterPassword, repository.current)
        : await VaultService.create(masterPassword, repository.current)
      setHasVault(true)
      setService(activeService)
      await refreshRegistrations(activeService)
      await refreshCategories(activeService)
      setMasterPassword('')
      setMasterPasswordConfirmation('')
      setShowPasswordForm(false)
      setScreen('vault')
    } catch {
      setError('保管庫を解除できません')
    }
  }

  const pairingClient = new PairingClient((url, init) => fetch(url, init))
  const syncClient = new SyncClient((url, init) => fetch(url, init))

  const startPairing = async (pairingLink: string) => {
    setPendingPairing(await pairingClient.request(pairingLink, 'この端末'))
    setError('')
  }

  const completePairing = async () => {
    if (pendingPairing === undefined) return
    const approved = await pairingClient.claim(pendingPairing)
    await syncSettings.current.save(approved)
    setConnection(approved)
    setPendingPairing(undefined)
    if (!hasVault) {
      await syncClient.initializeVault(approved, repository.current)
      setHasVault(true)
      setScreen('locked')
    }
  }

  if (screen === 'locked') {
    return (
      <main aria-label="KAGITO ロック画面">
        <h1>KAGITO</h1>
        <p>あなたの保管庫は、この端末の中で暗号化して管理します。</p>
        {!vaultReady ? (
          <p>保管庫を確認中</p>
        ) : showPasswordForm ? (
          <form onSubmit={(event) => { event.preventDefault(); void submitPassword() }}>
            <label>マスターパスワード<input aria-label="マスターパスワード" type={showMasterPassword ? 'text' : 'password'} value={masterPassword} onChange={(event) => setMasterPassword(event.target.value)} /></label>
            {!hasVault && <label>マスターパスワード（確認）<input aria-label="マスターパスワード（確認）" type={showMasterPassword ? 'text' : 'password'} value={masterPasswordConfirmation} onChange={(event) => setMasterPasswordConfirmation(event.target.value)} /></label>}
            <button type="button" onClick={() => setShowMasterPassword((visible) => !visible)}>{showMasterPassword ? '隠す' : '表示する'}</button>
            {error.length > 0 && <p role="alert">{error}</p>}
            <button type="submit">{hasVault ? '解除' : '作成する'}</button>
          </form>
        ) : hasVault ? (
          <button type="button" onClick={openPasswordForm}>保管庫を解除</button>
        ) : (
          <>
            <button type="button" onClick={openPasswordForm}>保管庫を作成</button>
            <button type="button" onClick={() => setScreen('sync')}>PCから保管庫を追加</button>
          </>
        )}
      </main>
    )
  }

  if (screen === 'registration' && service !== null) {
    return (
      <RegistrationScreen
        categories={categories}
        registration={selectedRegistration}
        onHelp={() => setScreen('settings')}
        onSave={async (input) => {
          if (selectedRegistration === undefined) await service.saveRegistration(input)
          else await service.updateRegistration(selectedRegistration.id, input)
          await refreshRegistrations(service)
          setSelectedRegistration(undefined)
          setScreen('vault')
        }}
        onDelete={selectedRegistration === undefined ? undefined : async () => {
          await service.deleteRegistration(selectedRegistration.id)
          await refreshRegistrations(service)
          setSelectedRegistration(undefined)
          setScreen('vault')
        }}
      />
    )
  }

  if (screen === 'settings' && service !== null) {
    return (
      <VaultSettingsScreen
        onBack={() => setScreen('vault')}
        onLock={lock}
        onBackup={() => {
          void service.exportEncrypted().then((backup) => {
            const url = URL.createObjectURL(backup)
            const anchor = document.createElement('a')
            anchor.href = url
            anchor.download = 'kagito-backup.kagito.json'
            anchor.click()
            URL.revokeObjectURL(url)
          })
        }}
        onSync={() => setScreen('sync')}
        onCategories={() => setScreen('categories')}
        onImport={(file) => {
          void VaultService.importEncrypted(file, repository.current).then(lock).catch(() => setError('バックアップ形式が正しくありません'))
        }}
        error={error}
      />
    )
  }

  if (screen === 'categories' && service !== null) {
    return <CategoryManagementScreen
      categories={categories}
      onSave={async (name) => { await service.saveCategory(name); await refreshCategories(service) }}
      onRename={async (id, name) => { await service.updateCategory(id, name); await refreshCategories(service) }}
      onMove={async (id, targetIndex) => { await service.moveCategory(id, targetIndex); await refreshCategories(service) }}
      onDelete={async (id) => { await service.deleteCategory(id); await refreshCategories(service) }}
      onBack={() => setScreen('settings')}
    />
  }

  if (screen === 'sync') {
    return (
      <SyncScreen
        connection={connection}
        pending={pendingPairing}
        onPair={startPairing}
        onClaim={completePairing}
        onSync={async () => {
          if (service === null || connection === undefined) throw new Error('PCに接続できません')
          const result = await syncClient.sync(service, connection)
          await refreshRegistrations(service)
          return result
        }}
        onForgetDevice={async () => {
          await syncSettings.current.forget()
          setConnection(undefined)
          setPendingPairing(undefined)
          setScreen(service === null ? 'locked' : 'settings')
        }}
        onBack={() => setScreen(service === null ? 'locked' : 'settings')}
        initialPairingLink={pairingLinkFromPage}
      />
    )
  }

  if (service === null) return null

  return (
    <>
      <button type="button" onClick={lock}>ロック</button>
      <button type="button" onClick={() => setScreen('settings')}>設定とヘルプ</button>
      <VaultListScreen
        registrations={registrations}
        categories={categories}
        onOpenRegistration={(id) => {
          setSelectedRegistration(registrations.find((registration) => registration.id === id))
          setScreen('registration')
        }}
        onAddRegistration={() => {
          setSelectedRegistration(undefined)
          setScreen('registration')
        }}
        onMoveRegistration={async (id, targetIndex) => {
          await service.moveRegistration(id, targetIndex)
          await refreshRegistrations(service)
        }}
      />
    </>
  )
}
