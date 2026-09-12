import { useRef, useState } from 'react'
import type { Category } from '../../domain/models'

type Props = {
  categories: Category[]
  onSave: (name: string) => Promise<void>
  onRename: (id: string, name: string) => Promise<void>
  onMove: (id: string, targetIndex: number) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onBack: () => void
}

const messageFor = (error: unknown) => error instanceof Error ? error.message : 'カテゴリを保存できません'

export function CategoryManagementScreen({ categories, onSave, onRename, onMove, onDelete, onBack }: Props) {
  const [newName, setNewName] = useState('')
  const [names, setNames] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const newNameInput = useRef<HTMLInputElement>(null)

  const run = async (action: () => Promise<void>) => {
    try {
      await action()
      setError('')
      return true
    } catch (reason) {
      setError(messageFor(reason))
      return false
    }
  }

  const addCategory = async () => {
    if (isAdding) return
    setIsAdding(true)
    try {
      const saved = await run(async () => {
        await onSave(newName)
        setNewName('')
        newNameInput.current?.focus()
      })
      if (!saved) newNameInput.current?.focus()
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <main className="settings-screen category-management-screen" aria-label="カテゴリ管理">
      <header className="settings-header">
        <button className="settings-back" type="button" aria-label="一覧へ戻る" onClick={onBack}>← 設定へ戻る</button>
      </header>
      <section className="settings-hero" aria-label="KAGITO カテゴリ管理">
        <p className="settings-eyebrow">KAGITO / ORGANIZE</p>
        <h1>カテゴリ管理</h1>
        <p>カテゴリを整えて、保管庫をもっと見やすく整理できます。</p>
      </section>
      <section className="category-add-card" aria-label="カテゴリを追加">
        <p className="settings-eyebrow">NEW CATEGORY</p>
        <h2>カテゴリを追加</h2>
        <form onSubmit={(event) => { event.preventDefault(); void addCategory() }}>
          <label>新しいカテゴリ名<input ref={newNameInput} aria-label="新しいカテゴリ名" value={newName} onChange={(event) => setNewName(event.target.value)} /></label>
          <button className="category-add-submit" type="submit" disabled={isAdding}>カテゴリを追加</button>
        </form>
      </section>
      <section className="category-list-card" aria-label="カテゴリ一覧">
        <div className="category-list-heading">
          <div>
            <p className="settings-eyebrow">YOUR CATEGORIES</p>
            <h2>カテゴリ一覧</h2>
          </div>
          <span>{categories.length}件</span>
        </div>
        {categories.map((category, index) => (
          <section className="category-row" key={category.id} aria-label={`${category.name}のカテゴリ`}>
            <label>
              {category.name}
              <input aria-label={`${category.name}の名前`} value={names[category.id] ?? category.name} onChange={(event) => setNames((current) => ({ ...current, [category.id]: event.target.value }))} />
            </label>
            <div className="category-actions">
              <button className="category-save" type="button" onClick={() => { void run(() => onRename(category.id, names[category.id] ?? category.name)) }}>{category.name}を保存</button>
              <div className="category-move-actions">
                <button className="category-move" type="button" aria-label={`${category.name}を上へ`} disabled={index === 0} onClick={() => { void run(() => onMove(category.id, index - 1)) }}>↑ 上へ</button>
                <button className="category-move" type="button" aria-label={`${category.name}を下へ`} disabled={index === categories.length - 1} onClick={() => { void run(() => onMove(category.id, index + 1)) }}>↓ 下へ</button>
              </div>
              <button className="category-delete" type="button" aria-label={`${category.name}を削除`} onClick={() => { void run(() => onDelete(category.id)) }}>削除</button>
            </div>
          </section>
        ))}
      </section>
      {error.length > 0 && <p role="alert">{error}</p>}
    </main>
  )
}
