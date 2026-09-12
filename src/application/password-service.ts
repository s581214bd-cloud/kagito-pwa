const groups = [
  'ABCDEFGHJKLMNPQRSTUVWXYZ',
  'abcdefghijkmnopqrstuvwxyz',
  '23456789',
  '!#$%&*+-=?@_~',
]

const randomIndex = (length: number) => {
  const range = 256 - (256 % length)
  const byte = new Uint8Array(1)
  do crypto.getRandomValues(byte)
  while (byte[0] >= range)
  return byte[0] % length
}

export function generatePassword(length = 20): string {
  const targetLength = Math.max(12, length)
  const characters = groups.map((group) => group[randomIndex(group.length)])
  const allCharacters = groups.join('')
  while (characters.length < targetLength) characters.push(allCharacters[randomIndex(allCharacters.length)])

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1)
    ;[characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]]
  }
  return characters.join('')
}

export function passwordStrengthLabel(password: string): 'とても弱い' | '弱い' | '普通' | '強い' | 'とても強い' {
  const groupsUsed = [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(password)).length
  const score = (password.length >= 20 ? 2 : password.length >= 14 ? 1 : 0) + Math.max(0, groupsUsed - 1)
  if (score <= 0) return 'とても弱い'
  if (score === 1) return '弱い'
  if (score === 2) return '普通'
  if (score === 3) return '強い'
  return 'とても強い'
}
