import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../src/ui/App'

it('waits for the existing-vault check before allowing vault creation', async () => {
  render(<App />)

  expect(screen.getByText('保管庫を確認中')).toBeVisible()
  expect(await screen.findByRole('button', { name: '保管庫を作成' })).toBeVisible()
})

it('asks for a master password before creating a vault', async () => {
  const user = userEvent.setup()
  render(<App />)

  await user.click(await screen.findByRole('button', { name: '保管庫を作成' }))

  expect(screen.getByLabelText('マスターパスワード')).toBeVisible()
  expect(screen.getByRole('button', { name: '作成する' })).toBeVisible()
})

it('can reveal both master password fields while creating a vault', async () => {
  const user = userEvent.setup()
  render(<App />)

  await user.click(await screen.findByRole('button', { name: '保管庫を作成' }))
  expect(screen.getByLabelText('マスターパスワード')).toHaveAttribute('type', 'password')
  expect(screen.getByLabelText('マスターパスワード（確認）')).toHaveAttribute('type', 'password')

  await user.click(screen.getByRole('button', { name: '表示する' }))

  expect(screen.getByLabelText('マスターパスワード')).toHaveAttribute('type', 'text')
  expect(screen.getByLabelText('マスターパスワード（確認）')).toHaveAttribute('type', 'text')
})

it('requires a matching confirmation before creating a vault', async () => {
  const user = userEvent.setup()
  render(<App />)

  await user.click(await screen.findByRole('button', { name: '保管庫を作成' }))
  await user.type(screen.getByLabelText('マスターパスワード'), 'eight888')
  await user.type(screen.getByLabelText('マスターパスワード（確認）'), 'different888')
  await user.click(screen.getByRole('button', { name: '作成する' }))

  expect(screen.getByRole('alert')).toHaveTextContent('マスターパスワードが一致しません')
  expect(screen.queryByRole('button', { name: '登録を追加' })).not.toBeInTheDocument()
})

it('creates a vault when the confirmation matches an eight-character master password', async () => {
  const user = userEvent.setup()
  render(<App />)

  await user.click(await screen.findByRole('button', { name: '保管庫を作成' }))
  await user.type(screen.getByLabelText('マスターパスワード'), 'eight888')
  await user.type(screen.getByLabelText('マスターパスワード（確認）'), 'eight888')
  await user.click(screen.getByRole('button', { name: '作成する' }))

  expect(await screen.findByRole('button', { name: '登録を追加' })).toBeVisible()
})

it('offers a newly added category when adding a registration', async () => {
  const user = userEvent.setup()
  render(<App />)

  const vaultButton = await screen.findByRole('button', { name: /保管庫を(作成|解除)/ })
  await user.click(vaultButton)
  await user.type(screen.getByLabelText('マスターパスワード'), 'eight888')
  if (vaultButton.textContent === '保管庫を作成') {
    await user.type(screen.getByLabelText('マスターパスワード（確認）'), 'eight888')
    await user.click(screen.getByRole('button', { name: '作成する' }))
  } else {
    await user.click(screen.getByRole('button', { name: '解除' }))
  }
  await user.click(await screen.findByRole('button', { name: '設定とヘルプ' }))
  await user.click(screen.getByRole('button', { name: 'カテゴリ管理' }))
  await user.type(screen.getByLabelText('新しいカテゴリ名'), '趣味')
  await user.click(screen.getByRole('button', { name: 'カテゴリを追加' }))
  await user.click(screen.getByRole('button', { name: '一覧へ戻る' }))
  await user.click(screen.getByRole('button', { name: '← 一覧へ戻る' }))
  await user.click(screen.getByRole('button', { name: '登録を追加' }))

  expect(screen.getByRole('option', { name: '趣味' })).toBeVisible()
})
