import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import type { Category, Registration } from '../../src/domain/models'
import { VaultListScreen } from '../../src/ui/screens/VaultListScreen'

const categories: Category[] = [
  { id: 'shopping', name: '買い物', sortOrder: 0 },
  { id: 'other', name: 'その他', sortOrder: 1 },
]

const registration = (id: string, title: string, categoryId = 'shopping'): Registration => ({
  id, title, accountId: `${id}@example.com`, password: 'secret', url: '', categoryId, memo: '', favorite: false,
  sortOrder: Number(id.slice(1)), createdAt: '2026-09-11T00:00:00.000Z', updatedAt: '2026-09-11T00:00:00.000Z', deletedAt: null, revision: 1,
})

const sixRegistrations = [
  registration('r0', '楽天市場'), registration('r1', 'Amazon'), registration('r2', 'ヨドバシ'),
  registration('r3', 'メルカリ'), registration('r4', 'Yahoo!'), registration('r5', 'Apple'),
]

it('keeps the full text available for long registration labels', () => {
  const title = 'とても長いサービス名でもスマホの一覧カードからはみ出さずに確認できる登録名'
  const categoryName = 'とても長いカテゴリ名でも省略表示から内容を確認できるカテゴリ'

  render(
    <VaultListScreen
      registrations={[registration('r0', title)]}
      categories={[{ id: 'shopping', name: categoryName, sortOrder: 0 }]}
      onOpenRegistration={vi.fn()}
    />,
  )

  expect(screen.getByRole('button', { name: title })).toHaveAttribute('title', title)
  expect(screen.getByText(categoryName)).toHaveAttribute('title', categoryName)
})

it('shows five rows before scrolling and the selected category count', () => {
  render(<VaultListScreen registrations={sixRegistrations} categories={categories} onOpenRegistration={vi.fn()} />)

  expect(screen.getByText('すべて 6件')).toBeVisible()
  expect(screen.getAllByRole('listitem')).toHaveLength(6)
  expect(screen.getByTestId('visible-row-limit')).toHaveTextContent('5')
})

it('shows a first-registration prompt when the vault is empty', () => {
  render(<VaultListScreen registrations={[]} categories={categories} onOpenRegistration={vi.fn()} onAddRegistration={vi.fn()} />)

  expect(screen.getByText('まだ登録情報がありません')).toBeVisible()
  expect(screen.getByRole('button', { name: '登録を追加' })).toBeVisible()
})

it('places favorite registrations first', () => {
  const favorites = [registration('r0', '楽天市場'), { ...registration('r1', 'Amazon'), favorite: true }]
  render(<VaultListScreen registrations={favorites} categories={categories} onOpenRegistration={vi.fn()} />)
  expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Amazon')
})

it('requests a favorite change from the registration card', async () => {
  const user = userEvent.setup()
  const onToggleFavorite = vi.fn()

  render(
    <VaultListScreen
      registrations={[registration('r0', '楽天市場')]}
      categories={categories}
      onOpenRegistration={vi.fn()}
      onToggleFavorite={onToggleFavorite}
    />,
  )

  await user.click(screen.getByRole('button', { name: '楽天市場をお気に入りに追加' }))

  expect(onToggleFavorite).toHaveBeenCalledWith('r0', true)
})

it('shows only favorite registrations when the favorites filter is enabled', async () => {
  const user = userEvent.setup()
  const favorites = [registration('r0', '楽天市場'), { ...registration('r1', 'Amazon'), favorite: true }]
  render(<VaultListScreen registrations={favorites} categories={categories} onOpenRegistration={vi.fn()} />)

  const favoritesFilter = screen.getByRole('button', { name: 'お気に入りのみ 1件' })
  await user.click(favoritesFilter)

  expect(favoritesFilter).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('listitem')).toHaveTextContent('Amazon')
  expect(screen.queryByText('楽天市場')).not.toBeInTheDocument()
})

it('shows an empty state when the favorites filter has no registrations', async () => {
  const user = userEvent.setup()
  render(<VaultListScreen registrations={sixRegistrations} categories={categories} onOpenRegistration={vi.fn()} />)

  await user.click(screen.getByRole('button', { name: 'お気に入りのみ 0件' }))

  expect(screen.getByText('お気に入りの登録情報はありません')).toBeVisible()
})

it('shows a search result count and preserves manual mode after another sort is chosen', async () => {
  const user = userEvent.setup()
  render(<VaultListScreen registrations={sixRegistrations} categories={categories} onOpenRegistration={vi.fn()} />)

  await user.type(screen.getByPlaceholderText('サイト名・カテゴリを検索'), '楽天')
  expect(screen.getByText('検索結果 1件')).toBeVisible()

  await user.selectOptions(screen.getByLabelText('並び順'), 'name')
  expect(screen.queryByRole('button', { name: '楽天市場を移動' })).not.toBeInTheDocument()
  await user.selectOptions(screen.getByLabelText('並び順'), 'manual')
  expect(screen.getByRole('button', { name: '楽天市場を移動' })).toBeVisible()
})

it('clears the current search', async () => {
  const user = userEvent.setup()
  render(<VaultListScreen registrations={sixRegistrations} categories={categories} onOpenRegistration={vi.fn()} />)

  const search = screen.getByRole('searchbox', { name: '検索' })
  await user.type(search, '楽天')
  await user.click(screen.getByRole('button', { name: '検索をクリア' }))

  expect(search).toHaveValue('')
  expect(screen.queryByText('検索結果 1件')).not.toBeInTheDocument()
})

it('shows an empty state when a search has no matches', async () => {
  const user = userEvent.setup()
  render(<VaultListScreen registrations={sixRegistrations} categories={categories} onOpenRegistration={vi.fn()} />)
  await user.type(screen.getByRole('searchbox', { name: '検索' }), '一致なし')
  expect(screen.getByText('一致する登録情報はありません')).toBeVisible()
})

it('passes the requested destination index when a manual row is moved', () => {
  const onMoveRegistration = vi.fn()
  render(<VaultListScreen registrations={sixRegistrations} categories={categories} onOpenRegistration={vi.fn()} onMoveRegistration={onMoveRegistration} />)

  fireEvent.dragStart(screen.getByRole('button', { name: 'ヨドバシを移動' }))
  fireEvent.drop(screen.getAllByRole('listitem')[0])

  expect(onMoveRegistration).toHaveBeenCalledWith('r2', 0)
})
