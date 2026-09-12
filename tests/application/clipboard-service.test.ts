import { vi } from 'vitest'
import { copySecret } from '../../src/application/clipboard-service'

const createClock = () => {
  let release: (() => void) | undefined
  return {
    delay: vi.fn(() => new Promise<void>((resolve) => { release = resolve })),
    advanceBy: async (milliseconds: number) => {
      expect(milliseconds).toBe(30_000)
      release?.()
      await Promise.resolve()
    },
  }
}

it('clears the copied value after 30 seconds when it is still unchanged', async () => {
  const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) }
  const clock = createClock()
  const pending = copySecret('secret', clipboard, clock)

  await Promise.resolve()
  await clock.advanceBy(30_000)
  await expect(pending).resolves.toBe('cleared')
  expect(clipboard.writeText).toHaveBeenNthCalledWith(1, 'secret')
  expect(clipboard.writeText).toHaveBeenLastCalledWith('')
})

it('returns clear-failed when the browser refuses the delayed clear', async () => {
  const clipboard = { writeText: vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('denied')) }
  const clock = createClock()
  const pending = copySecret('secret', clipboard, clock)

  await Promise.resolve()
  await clock.advanceBy(30_000)
  await expect(pending).resolves.toBe('clear-failed')
})

