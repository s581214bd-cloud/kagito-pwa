import { generatePassword, passwordStrengthLabel } from '../../src/application/password-service'

it('generates a password with each required character group', () => {
  const password = generatePassword(20)

  expect(password).toHaveLength(20)
  expect(password).toMatch(/[A-Z]/)
  expect(password).toMatch(/[a-z]/)
  expect(password).toMatch(/[0-9]/)
  expect(password).toMatch(/[^A-Za-z0-9]/)
})

it('can generate a 24-character password without symbols', () => {
  const password = generatePassword(24, false)

  expect(password).toHaveLength(24)
  expect(password).toMatch(/^[A-Za-z0-9]+$/)
})

it('uses five Japanese strength labels without any network service', () => {
  expect(passwordStrengthLabel('a')).toBe('とても弱い')
  expect(passwordStrengthLabel('Violet!7-river_CLOUD')).toBe('とても強い')
})
