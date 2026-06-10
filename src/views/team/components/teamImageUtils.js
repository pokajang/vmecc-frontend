import alphaImg from 'src/assets/images/teams/alpha.webp'
import bravoImg from 'src/assets/images/teams/bravo.webp'
import charlieImg from 'src/assets/images/teams/charlie.webp'
import deltaImg from 'src/assets/images/teams/delta.webp'

export const PRESET_IMAGES = [
  { key: 'alpha',   label: 'Alpha',   src: alphaImg },
  { key: 'bravo',   label: 'Bravo',   src: bravoImg },
  { key: 'charlie', label: 'Charlie', src: charlieImg },
  { key: 'delta',   label: 'Delta',   src: deltaImg },
]

// Prefix used to identify preset keys stored in image_url
const PRESET_PREFIX = 'preset:'

export const toPresetValue = (key) => `${PRESET_PREFIX}${key}`

export const resolveImageUrl = (imageUrl) => {
  if (!imageUrl) return null
  if (imageUrl.startsWith(PRESET_PREFIX)) {
    const key = imageUrl.slice(PRESET_PREFIX.length)
    return PRESET_IMAGES.find((p) => p.key === key)?.src || null
  }
  return imageUrl // real uploaded URL
}
