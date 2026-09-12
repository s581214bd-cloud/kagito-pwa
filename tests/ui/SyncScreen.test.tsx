import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { SyncScreen } from '../../src/ui/screens/SyncScreen'

const connection = { serverUrl: 'https://kagito.local', deviceId: 'phone-1', token: 'device-token' }

it('shows only sync counts after a completed synchronization', async () => {
  const user = userEvent.setup()
  render(<SyncScreen connection={connection} onPair={vi.fn()} onClaim={vi.fn()} onSync={vi.fn().mockResolvedValue({ sent: 2, received: 1, conflicts: 0 })} onForgetDevice={vi.fn()} onBack={vi.fn()} />)

  await user.click(screen.getByRole('button', { name: '今すぐ同期' }))

  expect(await screen.findByText('送信 2件 / 受信 1件')).toBeVisible()
  expect(screen.queryByText('secret-password')).not.toBeInTheDocument()
})

it('rejects a value that is not a KAGITO pairing link', async () => {
  const user = userEvent.setup()
  const onPair = vi.fn()
  render(<SyncScreen onPair={onPair} onClaim={vi.fn()} onSync={vi.fn()} onForgetDevice={vi.fn()} onBack={vi.fn()} />)

  await user.type(screen.getByLabelText('接続コード'), 'https://example.com')
  await user.click(screen.getByRole('button', { name: 'PCに接続' }))

  expect(onPair).not.toHaveBeenCalled()
  expect(screen.getByRole('alert')).toHaveTextContent('KAGITOの接続コードを入力してください')
})
