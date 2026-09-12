import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategoryManagementScreen } from '../../src/ui/screens/CategoryManagementScreen'

const categories = [
  { id: 'shopping', name: '買い物', sortOrder: 0 },
  { id: 'other', name: 'その他', sortOrder: 1 },
]

it('adds a category from the management screen', async () => {
  let savedName = ''
  const user = userEvent.setup()
  render(<CategoryManagementScreen categories={categories} onSave={async (name) => { savedName = name }} onRename={async () => {}} onMove={async () => {}} onDelete={async () => {}} onBack={() => {}} />)

  await user.type(screen.getByLabelText('新しいカテゴリ名'), '趣味')
  await user.click(screen.getByRole('button', { name: 'カテゴリを追加' }))

  expect(savedName).toBe('趣味')
})

it('adds a category when Enter is pressed in the category name field', async () => {
  let savedName = ''
  const user = userEvent.setup()
  render(<CategoryManagementScreen categories={categories} onSave={async (name) => { savedName = name }} onRename={async () => {}} onMove={async () => {}} onDelete={async () => {}} onBack={() => {}} />)

  await user.type(screen.getByLabelText('新しいカテゴリ名'), '趣味')
  await user.keyboard('{Enter}')

  expect(savedName).toBe('趣味')
})

it('prevents a second category add while the first one is saving', async () => {
  let resolveSave!: () => void
  const user = userEvent.setup()
  render(<CategoryManagementScreen categories={categories} onSave={() => new Promise<void>((resolve) => { resolveSave = resolve })} onRename={async () => {}} onMove={async () => {}} onDelete={async () => {}} onBack={() => {}} />)

  await user.type(screen.getByLabelText('新しいカテゴリ名'), '趣味')
  const submit = screen.getByRole('button', { name: 'カテゴリを追加' })
  await user.click(submit)

  expect(submit).toBeDisabled()
  resolveSave()
  await waitFor(() => expect(submit).toBeEnabled())
})

it('returns focus to the category name field after adding a category', async () => {
  const user = userEvent.setup()
  render(<CategoryManagementScreen categories={categories} onSave={async () => {}} onRename={async () => {}} onMove={async () => {}} onDelete={async () => {}} onBack={() => {}} />)

  const nameField = screen.getByLabelText('新しいカテゴリ名')
  await user.type(nameField, '趣味')
  await user.click(screen.getByRole('button', { name: 'カテゴリを追加' }))

  expect(nameField).toHaveFocus()
})

it('returns focus to the category name field when adding a category fails', async () => {
  const user = userEvent.setup()
  render(<CategoryManagementScreen categories={categories} onSave={async () => { throw new Error('同じカテゴリ名が登録されています') }} onRename={async () => {}} onMove={async () => {}} onDelete={async () => {}} onBack={() => {}} />)

  const nameField = screen.getByLabelText('新しいカテゴリ名')
  await user.type(nameField, '趣味')
  await user.click(screen.getByRole('button', { name: 'カテゴリを追加' }))

  await waitFor(() => expect(nameField).toHaveFocus())
  expect(screen.getByRole('alert')).toHaveTextContent('同じカテゴリ名が登録されています')
})

it('uses the settings design system for category management', () => {
  render(<CategoryManagementScreen categories={categories} onSave={async () => {}} onRename={async () => {}} onMove={async () => {}} onDelete={async () => {}} onBack={() => {}} />)

  expect(screen.getByRole('main', { name: 'カテゴリ管理' })).toHaveClass('category-management-screen')
  expect(screen.getByLabelText('カテゴリを追加')).toHaveClass('category-add-card')
  expect(screen.getByLabelText('カテゴリ一覧')).toHaveClass('category-list-card')
})

it('renames, moves, and deletes a category', async () => {
  const changes: string[] = []
  const user = userEvent.setup()
  render(<CategoryManagementScreen categories={categories} onSave={async () => {}} onRename={async (id, name) => { changes.push(`rename:${id}:${name}`) }} onMove={async (id, index) => { changes.push(`move:${id}:${index}`) }} onDelete={async (id) => { changes.push(`delete:${id}`) }} onBack={() => {}} />)

  const name = screen.getByLabelText('買い物の名前')
  await user.clear(name)
  await user.type(name, '日用品')
  await user.click(screen.getByRole('button', { name: '買い物を保存' }))
  await user.click(screen.getByRole('button', { name: 'その他を上へ' }))
  await user.click(screen.getByRole('button', { name: 'その他を削除' }))

  expect(changes).toEqual(['rename:shopping:日用品', 'move:other:0', 'delete:other'])
})
