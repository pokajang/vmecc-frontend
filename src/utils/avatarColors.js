const AVATAR_PALETTE = [
  { bg: '#eef2ff', text: '#3730a3' },
  { bg: '#ecfdf5', text: '#047857' },
  { bg: '#fffbeb', text: '#92400e' },
  { bg: '#fff1f2', text: '#be123c' },
  { bg: '#f1f5f9', text: '#334155' },
]

const hashText = (value = '') => {
  let hash = 0

  for (const character of String(value || '')
    .trim()
    .toLowerCase()) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  }

  return hash
}

export const getAvatarColors = (value = '') =>
  AVATAR_PALETTE[hashText(value) % AVATAR_PALETTE.length]
