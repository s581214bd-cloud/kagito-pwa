export type ClipboardWriter = Pick<Clipboard, 'writeText'>

export type DelayClock = {
  delay(milliseconds: number): Promise<void>
}

const browserClock: DelayClock = {
  delay: (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds)),
}

export async function copySecret(
  value: string,
  clipboard: ClipboardWriter,
  clock: DelayClock = browserClock,
  onCopied?: () => void,
): Promise<'cleared' | 'clear-failed' | 'copy-failed'> {
  try {
    await clipboard.writeText(value)
  } catch {
    return 'copy-failed'
  }

  onCopied?.()
  await clock.delay(30_000)

  try {
    await clipboard.writeText('')
    return 'cleared'
  } catch {
    return 'clear-failed'
  }
}
