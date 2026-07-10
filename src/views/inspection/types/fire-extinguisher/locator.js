const text = (value) => String(value || '').trim()

const QUERY_KEYS = ['locator', 'code', 'barcode', 'serial', 'sn']
const FIRE_EXTINGUISHER_SERIAL_PATTERN = /^[A-Z]{2}\d{6}[A-Z]\d{6}$/

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

const normalizeSerialCandidate = (value) => {
  const normalized = normalizeLocator(value).split(';')[0]?.trim() || ''
  return normalized.toUpperCase()
}

export const isValidFireExtinguisherSerial = (value) =>
  FIRE_EXTINGUISHER_SERIAL_PATTERN.test(normalizeSerialCandidate(value))

export const extractFireExtinguisherSerial = (rawValue) => {
  const raw = text(rawValue)
  if (!raw) return ''

  const candidates = []
  const urlLocator = /^(https?:|\/)/i.test(raw) ? parseUrlLocator(raw) : ''
  if (urlLocator) candidates.push(urlLocator)

  const labelledMatch = raw.match(
    /\b(?:s\s*\/?\s*n|serial(?:\s*(?:number|no\.?))?|barcode)\s*[:#-]?\s*([A-Z0-9][A-Z0-9/_-]*)/i,
  )
  if (labelledMatch?.[1]) candidates.push(labelledMatch[1])

  candidates.push(raw.split(';')[0], raw)

  const embeddedSerial = raw.match(/[A-Z]{2}\d{6}[A-Z]\d{6}/i)
  if (embeddedSerial?.[0]) candidates.push(embeddedSerial[0])

  for (const candidate of candidates) {
    const serial = normalizeSerialCandidate(candidate)
    if (isValidFireExtinguisherSerial(serial)) return serial
  }

  return ''
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

  if (raw.includes(';')) {
    const semicolonLocator = normalizeLocator(raw.split(';')[0])
    if (semicolonLocator) return semicolonLocator
  }

  return normalizeLocator(raw)
}

export const sameFireExtinguisherLocator = (left, right) =>
  extractFireExtinguisherLocator(left).toLowerCase() ===
  extractFireExtinguisherLocator(right).toLowerCase()
