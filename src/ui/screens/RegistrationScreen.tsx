import { useState } from 'react'
import type { Category, Registration } from '../../domain/models'
import type { RegistrationInput } from '../../application/vault-service'
import { generatePassword, passwordStrengthLabel } from '../../application/password-service'
import { CopyButton } from '../components/CopyButton'

type Props = {
  categories: Category[]
  registration?: Registration
  onSave: (input: RegistrationInput) => Promise<void> | void
  onHelp?: (topic: 'copy') => void
  onDelete?: () => Promise<void> | void
}

const normalizeUrl = (value: string) => (/^https?:\/\//i.test(value.trim()) ? value.trim() : '')

export function RegistrationScreen({ categories, registration, onSave, onHelp, onDelete }: Props) {
  const [title, setTitle] = useState(registration?.title ?? '')
  const [accountId, setAccountId] = useState(registration?.accountId ?? '')
  const [password, setPassword] = useState(registration?.password ?? '')
  const [url, setUrl] = useState(registration?.url ?? '')
  const [categoryId, setCategoryId] = useState(registration?.categoryId ?? categories[0]?.id ?? '')
  const [memo, setMemo] = useState(registration?.memo ?? '')
  const [favorite, setFavorite] = useState(registration?.favorite ?? false)
  const [revealed, setRevealed] = useState(false)
  const [passwordLength, setPasswordLength] = useState(16)
  const [includeSymbols, setIncludeSymbols] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteRequested, setDeleteRequested] = useState(false)
  const externalUrl = registration === undefined ? '' : normalizeUrl(registration.url)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (saving) return
    if (title.trim().length === 0 || categoryId.length === 0) {
      setError('サイト名とカテゴリを入力してください')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({ title: title.trim(), accountId, password, url: normalizeUrl(url), categoryId, memo, favorite })
    } catch (reason) {
      setError(reason instanceof Error && reason.message.length > 0 ? reason.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="registration-screen" aria-label="登録情報">
      <h1>{registration === undefined ? '登録を追加' : '登録情報を編集'}</h1>
      <button className="registration-help" type="button" onClick={() => onHelp?.('copy')}>コピーの使い方</button>
      <form onSubmit={(event) => { void submit(event) }}>
        <section className="registration-card">
          <h2>基本情報</h2>
          <label>サイト名<input aria-label="サイト名" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label>アカウントID<input aria-label="アカウントID" value={accountId} onChange={(event) => setAccountId(event.target.value)} /></label>
          <label>URL<input aria-label="URL" value={url} onChange={(event) => setUrl(event.target.value)} /></label>
          {externalUrl.length > 0 && <a href={externalUrl} target="_blank" rel="noreferrer">URLを開く</a>}
        </section>
        <section className="registration-card registration-secret-card">
          <h2>保管内容</h2>
          <label>
            パスワード
            <input aria-label="パスワード" type={revealed ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <div className="password-actions">
            <button type="button" onClick={() => setRevealed((value) => !value)}>{revealed ? '隠す' : '表示'}</button>
            <label>生成する長さ<select aria-label="生成する長さ" value={passwordLength} onChange={(event) => setPasswordLength(Number(event.target.value))}><option value={16}>16文字</option><option value={24}>24文字</option></select></label>
            <label><input aria-label="記号を含める" type="checkbox" checked={includeSymbols} onChange={(event) => setIncludeSymbols(event.target.checked)} />記号を含める</label>
            <button type="button" onClick={() => setPassword(generatePassword(passwordLength, includeSymbols))}>パスワードを生成</button>
          </div>
          <p aria-live="polite">強度: {passwordStrengthLabel(password)}</p>
        </section>
        <section className="registration-card">
          <h2>整理</h2>
          <label>
            カテゴリ
            <select aria-label="カテゴリ" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label>メモ<textarea aria-label="メモ" value={memo} onChange={(event) => setMemo(event.target.value)} /></label>
          <label><input aria-label="お気に入り" type="checkbox" checked={favorite} onChange={(event) => setFavorite(event.target.checked)} />お気に入り</label>
        </section>
        {error.length > 0 && <p role="alert">{error}</p>}
        <button className="registration-save" type="submit" disabled={saving}>{saving ? '保存中' : '保存'}</button>
      </form>
      {registration !== undefined && (
        <section className="registration-metadata" aria-label="登録情報の日時">
          <span>作成: {registration.createdAt.slice(0, 10)}</span>
          <span>更新: {registration.updatedAt.slice(0, 10)}</span>
        </section>
      )}
      {registration !== undefined && (
        <section aria-label="コピー">
          <CopyButton label="IDをコピー" value={registration.accountId} tone="secondary" />
          <CopyButton label="パスワードをコピー" value={registration.password} tone="primary" />
        </section>
      )}
      {registration !== undefined && onDelete !== undefined && (
        <section aria-label="削除">
          {deleteRequested ? (
            <button type="button" onClick={() => { void onDelete() }}>この登録を削除</button>
          ) : (
            <button type="button" onClick={() => setDeleteRequested(true)}>削除を確認</button>
          )}
        </section>
      )}
    </main>
  )
}
