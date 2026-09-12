import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { VaultSettingsScreen } from '../../src/ui/screens/VaultSettingsScreen'

it('shows a privacy-safe vault summary', () => {
  render(<VaultSettingsScreen onBack={vi.fn()} onLock={vi.fn()} onBackup={vi.fn()} registrationCount={12} favoriteCount={3} categoryCount={4} />)

  expect(screen.getByText('登録 12件')).toBeVisible()
  expect(screen.getByText('お気に入り 3件')).toBeVisible()
  expect(screen.getByText('カテゴリ 4件')).toBeVisible()
})

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

it('changes the selected auto-lock duration', async () => {
  const user = userEvent.setup()
  const onAutoLockDurationChange = vi.fn()
  render(<VaultSettingsScreen onBack={vi.fn()} onLock={vi.fn()} onBackup={vi.fn()} autoLockDuration={300_000} onAutoLockDurationChange={onAutoLockDurationChange} />)

  await user.selectOptions(screen.getByLabelText('自動ロック時間'), '60000')

  expect(onAutoLockDurationChange).toHaveBeenCalledWith(60_000)
})

it('requires confirmation before restoring a selected backup', async () => {
  const user = userEvent.setup()
  const onImport = vi.fn()
  render(<VaultSettingsScreen onBack={vi.fn()} onLock={vi.fn()} onBackup={vi.fn()} onImport={onImport} />)

  const backup = new File(['encrypted'], 'kagito-backup.kagito.json', { type: 'application/json' })
  fireEvent.change(screen.getByLabelText('暗号化バックアップを復元'), { target: { files: [backup] } })

  expect(onImport).not.toHaveBeenCalled()
  await user.click(screen.getByRole('checkbox', { name: '現在の端末データが置き換わることを理解しました' }))
  await user.click(screen.getByRole('button', { name: 'このバックアップで復元' }))
  expect(onImport).toHaveBeenCalledWith(backup)
})

it('requires acknowledging data replacement before restoring', async () => {
  const user = userEvent.setup()
  render(<VaultSettingsScreen onBack={vi.fn()} onLock={vi.fn()} onBackup={vi.fn()} />)

  const backup = new File(['encrypted'], 'kagito-backup.kagito.json')
  fireEvent.change(screen.getByLabelText('暗号化バックアップを復元'), { target: { files: [backup] } })

  const restore = screen.getByRole('button', { name: 'このバックアップで復元' })
  expect(restore).toBeDisabled()
  await user.click(screen.getByRole('checkbox', { name: '現在の端末データが置き換わることを理解しました' }))
  expect(restore).toBeEnabled()
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
