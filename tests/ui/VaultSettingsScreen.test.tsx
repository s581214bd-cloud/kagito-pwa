import { fireEvent, render, screen } from '@testing-library/react'
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

it('requires confirmation before restoring a selected backup', async () => {
  const user = userEvent.setup()
  const onImport = vi.fn()
  render(<VaultSettingsScreen onBack={vi.fn()} onLock={vi.fn()} onBackup={vi.fn()} onImport={onImport} />)

  const backup = new File(['encrypted'], 'kagito-backup.kagito.json', { type: 'application/json' })
  fireEvent.change(screen.getByLabelText('暗号化バックアップを復元'), { target: { files: [backup] } })

  expect(onImport).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'このバックアップで復元' }))
  expect(onImport).toHaveBeenCalledWith(backup)
})

it('shows the selected backup name before restoring', () => {
  render(<VaultSettingsScreen onBack={vi.fn()} onLock={vi.fn()} onBackup={vi.fn()} />)

  const backup = new File(['encrypted'], 'before-phone-replacement.kagito.json', { type: 'application/json' })
  fireEvent.change(screen.getByLabelText('暗号化バックアップを復元'), { target: { files: [backup] } })

  expect(screen.getByText(/before-phone-replacement\.kagito\.json/)).toBeVisible()
})

it('shows the selected backup size before restoring', () => {
  render(<VaultSettingsScreen onBack={vi.fn()} onLock={vi.fn()} onBackup={vi.fn()} />)

  const backup = new File(['x'.repeat(2048)], 'kagito-backup.kagito.json', { type: 'application/json' })
  fireEvent.change(screen.getByLabelText('暗号化バックアップを復元'), { target: { files: [backup] } })

  expect(screen.getByText(/2\.0 KB/)).toBeVisible()
})

it('shows small selected backups in bytes before restoring', () => {
  render(<VaultSettingsScreen onBack={vi.fn()} onLock={vi.fn()} onBackup={vi.fn()} />)

  const backup = new File(['x'.repeat(512)], 'small-backup.kagito.json', { type: 'application/json' })
  fireEvent.change(screen.getByLabelText('暗号化バックアップを復元'), { target: { files: [backup] } })

  expect(screen.getByText(/512 B/)).toBeVisible()
})

it('shows the selected backup modified date before restoring', () => {
  render(<VaultSettingsScreen onBack={vi.fn()} onLock={vi.fn()} onBackup={vi.fn()} />)

  const backup = new File(['encrypted'], 'kagito-backup.kagito.json', { lastModified: Date.UTC(2026, 0, 2, 3, 4) })
  fireEvent.change(screen.getByLabelText('暗号化バックアップを復元'), { target: { files: [backup] } })

  expect(screen.getByText(/2026-01-02 03:04 UTC/)).toBeVisible()
})

it('cancels a selected backup without restoring it', async () => {
  const user = userEvent.setup()
  const onImport = vi.fn()
  render(<VaultSettingsScreen onBack={vi.fn()} onLock={vi.fn()} onBackup={vi.fn()} onImport={onImport} />)

  const backup = new File(['encrypted'], 'kagito-backup.kagito.json', { type: 'application/json' })
  fireEvent.change(screen.getByLabelText('暗号化バックアップを復元'), { target: { files: [backup] } })

  await user.click(screen.getByRole('button', { name: 'キャンセル' }))

  expect(onImport).not.toHaveBeenCalled()
  expect(screen.queryByRole('button', { name: 'このバックアップで復元' })).not.toBeInTheDocument()
})
