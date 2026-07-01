import { parse, storageKey } from '../utils'

const DRILL_TYPE_USAGE_KEY = 'report_drill_type_usage_v1_user_'

const normalizeKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

export const loadDrillTypeUsage = (userId) => {
  if (!userId) return {}
  const rows = parse(localStorage.getItem(storageKey(DRILL_TYPE_USAGE_KEY, userId)), {})
  return rows && typeof rows === 'object' ? rows : {}
}

export const recordDrillTypeUsage = (userId, value) => {
  if (!userId) return
  const key = normalizeKey(value)
  if (!key) return
  const next = loadDrillTypeUsage(userId)
  const prev = next[key] && typeof next[key] === 'object' ? next[key] : {}
  next[key] = {
    count: Number(prev.count || 0) + 1,
    lastUsedAt: Date.now(),
  }
  localStorage.setItem(storageKey(DRILL_TYPE_USAGE_KEY, userId), JSON.stringify(next))
}

export const sortDrillOptionsByUsage = (options = [], usageMap = {}) =>
  [...options].sort((a, b) => {
    const aKey = normalizeKey(a?.value)
    const bKey = normalizeKey(b?.value)
    const aUsage = usageMap[aKey] || {}
    const bUsage = usageMap[bKey] || {}
    const aCount = Number(aUsage.count || 0)
    const bCount = Number(bUsage.count || 0)
    if (aCount !== bCount) return bCount - aCount

    const aLast = Number(aUsage.lastUsedAt || 0)
    const bLast = Number(bUsage.lastUsedAt || 0)
    if (aLast !== bLast) return bLast - aLast

    const aTitle = String(a?.title || a?.value || '').toLowerCase()
    const bTitle = String(b?.title || b?.value || '').toLowerCase()
    if (aTitle === bTitle) return 0
    return aTitle > bTitle ? 1 : -1
  })
