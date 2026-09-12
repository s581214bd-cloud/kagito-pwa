import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { VaultSettingsScreen } from '../../src/ui/screens/VaultSettingsScreen'

it('shows help by topic and exposes backup and lock controls', async () => {
  const user = userEvent.setup()
  const onLock = vi.fn()
  const onBackup = vi.fn()
  render(<VaultSettingsScreen onBack={vi.fn()} onLock={onLock} onBackup={onBackup} />)

  expect(screen.getByRole('heading', { name: '設定とヘルプ' })).toBeVisible()
  expect(screen.getByText('コピー')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'ロック' }))
  await user.click(screen.getByRole('button', { name: 'バックアップを保存' }))
  expect(onLock).toHaveBeenCalledOnce()
  expect(onBackup).toHaveBeenCalledOnce()
})
