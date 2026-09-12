import { expect, test } from '@playwright/test'

test('creates a vault, adds a record, reloads offline, and unlocks it', async ({ page, context }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '保管庫を作成' }).click()
  await page.getByLabel('マスターパスワード', { exact: true }).fill('correct horse battery staple')
  await page.getByLabel('マスターパスワード（確認）', { exact: true }).fill('correct horse battery staple')
  await page.getByRole('button', { name: '作成する' }).click()
  await page.getByRole('button', { name: '登録を追加' }).click()
  await page.getByLabel('サイト名').fill('楽天市場')
  await page.getByLabel('アカウントID').fill('user@example.com')
  await page.getByLabel('パスワード').fill('secret')
  await page.getByRole('button', { name: '保存' }).click()
  await expect(page.getByText('楽天市場')).toBeVisible()

  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  await context.setOffline(true)
  await page.reload()
  await page.getByRole('button', { name: '保管庫を解除' }).click()
  await page.getByLabel('マスターパスワード').fill('correct horse battery staple')
  await page.getByRole('button', { name: '解除' }).click()
  await expect(page.getByText('楽天市場')).toBeVisible()
})
