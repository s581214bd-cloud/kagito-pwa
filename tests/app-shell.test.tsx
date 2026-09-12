import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../src/ui/App'

it('shows the locked KAGITO shell without example credentials', async () => {
  render(<App />)

  expect(screen.getByRole('heading', { name: 'KAGITO' })).toBeVisible()
  expect(await screen.findByText('保管庫を作成')).toBeVisible()
  expect(screen.queryByText(/Password123/i)).not.toBeInTheDocument()
})

it('locks the opened vault when the app is sent to the background', async () => {
  const user = userEvent.setup()
  render(<App />)

  await user.click(await screen.findByRole('button', { name: '保管庫を作成' }))
  await user.type(screen.getByLabelText('マスターパスワード'), 'eight-char-password')
  await user.type(screen.getByLabelText('マスターパスワード（確認）'), 'eight-char-password')
  await user.click(screen.getByRole('button', { name: '作成する' }))
  expect(await screen.findByRole('button', { name: 'ロック' })).toBeVisible()

  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'))
  })

  expect(screen.getByRole('heading', { name: 'KAGITO' })).toBeVisible()
  expect(screen.getByRole('button', { name: '保管庫を解除' })).toBeVisible()
  delete (document as Document & { visibilityState?: string }).visibilityState
})
