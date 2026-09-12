import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { RegistrationScreen } from '../../src/ui/screens/RegistrationScreen'

it('groups registration fields into clear sections', () => {
  render(<RegistrationScreen categories={[{ id: 'other', name: 'その他', sortOrder: 0 }]} onSave={vi.fn()} />)

  expect(screen.getByRole('heading', { name: '基本情報' })).toBeVisible()
  expect(screen.getByRole('heading', { name: '保管内容' })).toBeVisible()
  expect(screen.getByRole('heading', { name: '整理' })).toBeVisible()
})

it('keeps the password masked and saves the required registration fields', async () => {
  const user = userEvent.setup()
  const onSave = vi.fn().mockResolvedValue(undefined)
  render(<RegistrationScreen categories={[{ id: 'other', name: 'その他', sortOrder: 0 }]} onSave={onSave} />)

  expect(screen.getByLabelText('パスワード')).toHaveAttribute('type', 'password')
  await user.click(screen.getByRole('button', { name: '表示' }))
  expect(screen.getByLabelText('パスワード')).toHaveAttribute('type', 'text')
  await user.type(screen.getByLabelText('サイト名'), '楽天市場')
  await user.type(screen.getByLabelText('アカウントID'), 'user@example.com')
  await user.type(screen.getByLabelText('パスワード'), 'secret')
  await user.click(screen.getByRole('button', { name: '保存' }))

  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: '楽天市場', accountId: 'user@example.com', password: 'secret', categoryId: 'other' }))
})

it('disables saving while a registration save is pending', async () => {
  const user = userEvent.setup()
  const onSave = vi.fn(() => new Promise<void>(() => {}))
  render(<RegistrationScreen categories={[{ id: 'other', name: 'その他', sortOrder: 0 }]} onSave={onSave} />)

  await user.type(screen.getByLabelText('サイト名'), '楽天市場')
  await user.click(screen.getByRole('button', { name: '保存' }))

  expect(screen.getByRole('button', { name: '保存中' })).toBeDisabled()
})

it('keeps entered values and explains when saving a registration fails', async () => {
  const user = userEvent.setup()
  const onSave = vi.fn().mockRejectedValue(new Error('保存先へ接続できません'))
  render(<RegistrationScreen categories={[{ id: 'other', name: 'その他', sortOrder: 0 }]} onSave={onSave} />)

  const title = screen.getByLabelText('サイト名')
  await user.type(title, '楽天市場')
  await user.click(screen.getByRole('button', { name: '保存' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('保存先へ接続できません')
  expect(title).toHaveValue('楽天市場')
})

it('renders separate copy controls for the ID and password on a saved registration', () => {
  render(<RegistrationScreen categories={[{ id: 'other', name: 'その他', sortOrder: 0 }]} onSave={vi.fn()} registration={{
    id: 'r1', title: '楽天市場', accountId: 'user@example.com', password: 'secret', url: '', categoryId: 'other', memo: '',
    favorite: false, sortOrder: 0, createdAt: '2026-09-11T00:00:00.000Z', updatedAt: '2026-09-11T00:00:00.000Z', deletedAt: null, revision: 1,
  }} />)

  expect(screen.getByRole('button', { name: 'IDをコピー' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'パスワードをコピー' })).toBeVisible()
})

it('requires a second explicit action before deleting a saved registration', async () => {
  const user = userEvent.setup()
  const onDelete = vi.fn().mockResolvedValue(undefined)
  render(<RegistrationScreen categories={[{ id: 'other', name: 'その他', sortOrder: 0 }]} onSave={vi.fn()} onDelete={onDelete} registration={{
    id: 'r1', title: '楽天市場', accountId: 'user@example.com', password: 'secret', url: '', categoryId: 'other', memo: '',
    favorite: false, sortOrder: 0, createdAt: '2026-09-11T00:00:00.000Z', updatedAt: '2026-09-11T00:00:00.000Z', deletedAt: null, revision: 1,
  }} />)

  await user.click(screen.getByRole('button', { name: '削除を確認' }))
  expect(onDelete).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'この登録を削除' }))
  expect(onDelete).toHaveBeenCalledOnce()
})

it('saves the favorite choice with a registration', async () => {
  const user = userEvent.setup()
  const onSave = vi.fn().mockResolvedValue(undefined)
  render(<RegistrationScreen categories={[{ id: 'other', name: 'その他', sortOrder: 0 }]} onSave={onSave} />)

  await user.type(screen.getByLabelText('サイト名'), '楽天市場')
  await user.click(screen.getByLabelText('お気に入り'))
  await user.click(screen.getByRole('button', { name: '保存' }))

  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ favorite: true }))
})

it('offers only a safe web URL as an external link', () => {
  render(<RegistrationScreen categories={[{ id: 'other', name: 'その他', sortOrder: 0 }]} onSave={vi.fn()} registration={{
    id: 'r1', title: '楽天市場', accountId: 'user@example.com', password: 'secret', url: 'https://example.com', categoryId: 'other', memo: '',
    favorite: false, sortOrder: 0, createdAt: '2026-09-11T00:00:00.000Z', updatedAt: '2026-09-11T00:00:00.000Z', deletedAt: null, revision: 1,
  }} />)

  expect(screen.getByRole('link', { name: 'URLを開く' })).toHaveAttribute('href', 'https://example.com')
})
