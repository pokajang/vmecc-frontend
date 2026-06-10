export const parseStoredArray = (raw) => {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      'data' in parsed &&
      Array.isArray(parsed.data)
    ) {
      return parsed.data
    }
    return []
  } catch {
    return []
  }
}
