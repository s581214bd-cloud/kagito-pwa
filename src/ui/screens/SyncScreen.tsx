import { useState } from 'react'
import type { SyncConnection } from '../../application/sync-client'
import type { PendingPairing } from '../../application/pairing-client'

type SyncResult = { sent: number; received: number; conflicts: number }

type Props = {
  connection?: SyncConnection
  onPair: (pairingLink: string) => Promise<void> | void
  pending?: PendingPairing
  onClaim: () => Promise<void> | void
  onSync: () => Promise<SyncResult>
  onForgetDevice: () => Promise<void> | void
  onBack: () => void
  initialPairingLink?: string
}

const isPairingLink = (value: string) => {
  try {
    const link = new URL(value)
    return (link.protocol === 'kagito:' && link.hostname === 'pair' && link.searchParams.has('server') && link.searchParams.has('code'))
      || (link.protocol === 'https:' && link.searchParams.has('pair'))
  } catch {
    return false
  }
}

export function SyncScreen({ connection, onPair, pending, onClaim, onSync, onForgetDevice, onBack, initialPairingLink = '' }: Props) {
  const [code, setCode] = useState(initialPairingLink)
  const [error, setError] = useState('')
  const [result, setResult] = useState<SyncResult | undefined>()

  const connect = async () => {
    if (!isPairingLink(code)) {
      setError('KAGITOの接続コードを入力してください')
      return
    }
    setError('')
    await onPair(code)
  }

  return (
    <main className="settings-screen" aria-label="PCと同期">
      <header className="settings-header">
        <button className="settings-back" type="button" onClick={onBack}>← 設定へ戻る</button>
      </header>
      <section className="settings-hero">
        <p className="settings-eyebrow">KAGITO / PRIVATE LAN</p>
        <h1>PCと同期</h1>
        <p>同じ自宅Wi-Fi内のKAGITO PCと、暗号化したまま同期します。</p>
      </section>
      {connection === undefined ? (
        <section className="backup-card">
          <h2>PCに接続</h2>
          {pending === undefined ? <>
            <p>PC側で表示した接続コードを入力し、PCで承認してください。</p>
            <label className="sync-code-label">接続コード
              <input aria-label="接続コード" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="off" />
            </label>
            <button className="backup-save" type="button" onClick={() => void connect().catch(() => setError('PCへの接続を開始できません'))}>PCに接続</button>
          </> : <>
            <p>PCで承認してください。承認後に、この画面で接続を完了します。</p>
            <button className="backup-save" type="button" onClick={() => void Promise.resolve(onClaim()).catch(() => setError('PCで承認してください'))}>承認後に接続を完了</button>
          </>}
          {error.length > 0 && <p role="alert">{error}</p>}
        </section>
      ) : (
        <section className="backup-card">
          <h2>接続済み</h2>
          <p>PCのアドレス：{connection.serverUrl}</p>
          <button className="backup-save" type="button" onClick={() => void onSync().then(setResult).catch(() => setError('PCに接続できません'))}>今すぐ同期</button>
          <button className="settings-back" type="button" onClick={() => void onForgetDevice()}>この端末の接続を解除</button>
          {result !== undefined && <p>送信 {result.sent}件 / 受信 {result.received}件{result.conflicts > 0 ? ` / 競合 ${result.conflicts}件` : ''}</p>}
          {error.length > 0 && <p role="alert">{error}</p>}
        </section>
      )}
    </main>
  )
}
