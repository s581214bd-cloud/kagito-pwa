import { useMemo, useState } from 'react'
import type { Category, Registration } from '../../domain/models'
import type { SortMode } from '../../application/vault-service'

type Props = {
  registrations: Registration[]
  categories: Category[]
  onOpenRegistration: (id: string) => void
  onToggleFavorite?: (id: string, favorite: boolean) => void
  onMoveRegistration?: (id: string, targetIndex: number) => void
  onAddRegistration?: () => void
}

const sortRegistrations = (registrations: Registration[], sort: SortMode) => registrations.toSorted((left, right) => {
  if (left.favorite !== right.favorite) return left.favorite ? -1 : 1
  if (sort === 'name') return left.title.localeCompare(right.title, 'ja')
  if (sort === 'updated') return right.updatedAt.localeCompare(left.updatedAt)
  if (sort === 'created') return right.createdAt.localeCompare(left.createdAt)
  return left.sortOrder - right.sortOrder
})

export function VaultListScreen({ registrations, categories, onOpenRegistration, onToggleFavorite, onMoveRegistration, onAddRegistration }: Props) {
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [sort, setSort] = useState<SortMode>('manual')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)

  const categoryNames = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories])
  const categoryFiltered = categoryId === null ? registrations : registrations.filter((registration) => registration.categoryId === categoryId)
  const favoriteCount = categoryFiltered.filter((registration) => registration.favorite).length
  const favoritesFiltered = favoritesOnly ? categoryFiltered.filter((registration) => registration.favorite) : categoryFiltered
  const visible = sortRegistrations(favoritesFiltered.filter((registration) => {
    const normalized = query.trim().toLocaleLowerCase('ja')
    return normalized.length === 0 || registration.title.toLocaleLowerCase('ja').includes(normalized) || (categoryNames.get(registration.categoryId) ?? '').toLocaleLowerCase('ja').includes(normalized)
  }), sort)

  const categoryCount = (id: string | null) => (id === null ? registrations : registrations.filter((registration) => registration.categoryId === id)).length

  return (
    <main aria-label="KAGITO 保管庫一覧">
      <header>
        <h1>KAGITO</h1>
        <label>
          並び順
          <select aria-label="並び順" value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
            <option value="manual">手動</option>
            <option value="name">名前順</option>
            <option value="updated">更新日順</option>
            <option value="created">登録日順</option>
          </select>
        </label>
      </header>

      <div className="search-field">
        <input
          type="search"
          aria-label="検索"
          placeholder="サイト名・カテゴリを検索"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query.length > 0 && <button type="button" onClick={() => setQuery('')}>検索をクリア</button>}
      </div>

      <button className="favorites-filter" type="button" aria-pressed={favoritesOnly} onClick={() => setFavoritesOnly((current) => !current)}>お気に入りのみ {favoriteCount}件</button>

      <nav aria-label="カテゴリ">
        <button type="button" aria-pressed={categoryId === null} onClick={() => setCategoryId(null)}>すべて {categoryCount(null)}件</button>
        {categories.map((category) => (
          <button key={category.id} type="button" aria-pressed={categoryId === category.id} onClick={() => setCategoryId(category.id)}>
            {category.name} {categoryCount(category.id)}件
          </button>
        ))}
      </nav>

      {query.trim().length > 0 && <p>検索結果 {visible.length}件</p>}
      {query.trim().length > 0 && visible.length === 0 && <p>一致する登録情報はありません</p>}
      {favoritesOnly && query.trim().length === 0 && visible.length === 0 && <p>お気に入りの登録情報はありません</p>}
      {registrations.length === 0 && <p className="empty-vault-message">まだ登録情報がありません</p>}
      <output data-testid="visible-row-limit">5</output>
      <ul aria-label="登録情報一覧" style={{ maxHeight: '25rem', overflowY: 'auto' }}>
        {visible.map((registration, index) => (
          <li
            key={registration.id}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (sort === 'manual' && draggedId !== null) onMoveRegistration?.(draggedId, index)
              setDraggedId(null)
            }}
          >
            {sort === 'manual' && (
              <button
                type="button"
                aria-label={`${registration.title}を移動`}
                draggable
                onDragStart={() => setDraggedId(registration.id)}
              >
                ⠿
              </button>
            )}
            <button
              type="button"
              className="registration-title"
              title={registration.title}
              onClick={() => onOpenRegistration(registration.id)}
            >
              {registration.favorite ? '★ ' : ''}{registration.title}
            </button>
            <button
              type="button"
              className="favorite-toggle"
              aria-pressed={registration.favorite}
              aria-label={`${registration.title}をお気に入り${registration.favorite ? 'から削除' : 'に追加'}`}
              onClick={() => onToggleFavorite?.(registration.id, !registration.favorite)}
            >
              {registration.favorite ? '★' : '☆'}
            </button>
            <span className="registration-category" title={categoryNames.get(registration.categoryId) ?? '未分類'}>
              {categoryNames.get(registration.categoryId) ?? '未分類'}
            </span>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onAddRegistration}>登録を追加</button>
    </main>
  )
}
