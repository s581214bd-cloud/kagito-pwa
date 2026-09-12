import { helpTopics } from '../../application/help-topics'

type Props = {
  onBack: () => void
  onLock: () => void
  onBackup: () => void
  onCategories?: () => void
  onSync?: () => void
  onImport?: (file: File) => void
  error?: string
}

export function VaultSettingsScreen({ onBack, onLock, onBackup, onCategories, onSync, onImport, error }: Props) {
  return (
    <main className="settings-screen" aria-label="設定とヘルプ">
      <header className="settings-header">
        <button className="settings-back" type="button" onClick={onBack}>← 一覧へ戻る</button>
        <button className="settings-lock" type="button" onClick={onLock}>ロック</button>
      </header>
      <section className="settings-hero" aria-label="KAGITO 設定">
        <p className="settings-eyebrow">KAGITO / VAULT GUIDE</p>
        <h1>設定とヘルプ</h1>
        <p>保管庫を安全に使うための操作をまとめています。</p>
      </section>
      <div className="help-card-grid">
        {helpTopics.map((topic, index) => (
          <section className="help-card" key={topic.id} aria-labelledby={`help-${topic.id}`}>
            <span className="help-card-number">{String(index + 1).padStart(2, '0')}</span>
            <h2 id={`help-${topic.id}`}>{topic.title}</h2>
            <p>{topic.body}</p>
          </section>
        ))}
      </div>
      <section className="backup-card" aria-label="バックアップ">
        <p className="settings-eyebrow">SAFE KEEPING</p>
        <h2>暗号化バックアップ</h2>
        <p>端末の交換や万一のために、暗号化された保管庫を保存・復元できます。</p>
        <button className="backup-save" type="button" onClick={onBackup}>バックアップを保存</button>
        <label className="backup-restore">
          <span>バックアップを復元</span>
          <input aria-label="暗号化バックアップを復元" type="file" accept="application/json,.json,.kagito" onChange={(event) => {
            const file = event.target.files?.[0]
            if (file !== undefined) onImport?.(file)
          }} />
        </label>
        {error !== undefined && error.length > 0 && <p role="alert">{error}</p>}
      </section>
      <section className="backup-card" aria-label="カテゴリ管理">
        <p className="settings-eyebrow">ORGANIZE</p>
        <h2>カテゴリ管理</h2>
        <p>カテゴリの追加、名前変更、並べ替えができます。</p>
        <button className="backup-save" type="button" onClick={onCategories}>カテゴリ管理</button>
      </section>
      <section className="backup-card" aria-label="PCと同期">
        <p className="settings-eyebrow">PRIVATE LAN</p>
        <h2>PCと同期</h2>
        <p>同じ自宅Wi-FiのPCと、暗号化したまま同期します。</p>
        <button className="backup-save" type="button" onClick={onSync}>PCと同期</button>
      </section>
    </main>
  )
}
