const text = (value) => String(value || '').trim()

const QUERY_KEYS = ['locator', 'code', 'barcode', 'serial', 'sn']

const normalizeLocator = (value) =>
  text(value)
    .replace(/^s\s*\/?\s*n\s*[:#-]?\s*/i, '')
    .replace(/^serial\s*(number|no\.?)?\s*[:#-]?\s*/i, '')
    .replace(/^barcode\s*[:#-]?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()

const getBaseUrl = () => {
  const globalLocation = globalThis?.location || globalThis?.window?.location
  return globalLocation?.origin || 'https://vmecc.local'
}

const parseUrlLocator = (value) => {
  try {
    const url = new URL(value, getBaseUrl())
    for (const key of QUERY_KEYS) {
      const locator = normalizeLocator(url.searchParams.get(key))
      if (locator) return locator
    }

    const pathParts = url.pathname.split('/').map(normalizeLocator).filter(Boolean)
    return pathParts[pathParts.length - 1] || ''
  } catch {
    return ''
  }
}

export const extractFireExtinguisherLocator = (rawValue) => {
  const raw = text(rawValue)
  if (!raw) return ''

  const urlLocator = /^(https?:|\/)/i.test(raw) ? parseUrlLocator(raw) : ''
  if (urlLocator) return urlLocator

  const labelledMatch = raw.match(
    /\b(?:s\s*\/?\s*n|serial(?:\s*(?:number|no\.?))?|barcode)\s*[:#-]?\s*([A-Z0-9][A-Z0-9/_-]*)/i,
  )
  if (labelledMatch?.[1]) return normalizeLocator(labelledMatch[1])

  return normalizeLocator(raw)
}

export const sameFireExtinguisherLocator = (left, right) =>
  extractFireExtinguisherLocator(left).toLowerCase() ===
  extractFireExtinguisherLocator(right).toLowerCase()
