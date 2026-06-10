import {
  AlertTriangle,
  Building2,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Droplets,
  Factory,
  Flame,
  FlaskConical,
  HeartPulse,
  LifeBuoy,
  MapPin,
  MapPinned,
  Route,
  ShieldAlert,
  Siren,
  Sparkles,
  Sun,
  ThermometerSun,
  Truck,
  Warehouse,
  Wind,
} from 'lucide-react'

const ICONS = {
  AlertTriangle,
  Building2,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Droplets,
  Factory,
  Flame,
  FlaskConical,
  HeartPulse,
  LifeBuoy,
  MapPin,
  MapPinned,
  Route,
  ShieldAlert,
  Siren,
  Sparkles,
  Sun,
  ThermometerSun,
  Truck,
  Warehouse,
  Wind,
}

const ICON_POOLS = {
  incident: [
    'ShieldAlert',
    'AlertTriangle',
    'Flame',
    'Droplets',
    'FlaskConical',
    'LifeBuoy',
    'HeartPulse',
    'Siren',
    'Truck',
    'Sparkles',
  ],
  weather: [
    'Sun',
    'CloudSun',
    'Cloud',
    'CloudRain',
    'CloudLightning',
    'CloudFog',
    'Wind',
    'ThermometerSun',
  ],
  location: ['MapPinned', 'MapPin', 'Route', 'Warehouse', 'Building2', 'Factory'],
}

const FALLBACK_ICON_KEYS = {
  incident: 'ShieldAlert',
  weather: 'CloudSun',
  location: 'MapPinned',
}

export const normalizeTypeKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

export const getTypeIconOptions = (category) =>
  (ICON_POOLS[category] || ICON_POOLS.incident).map((key) => ({
    key,
    label: key.replace(/([a-z])([A-Z])/g, '$1 $2'),
    icon: ICONS[key],
  }))

export const resolveTypeIcon = (iconKey, category) =>
  ICONS[String(iconKey || '').trim()] || ICONS[FALLBACK_ICON_KEYS[category] || 'ShieldAlert']

export const resolveTypeIconKey = (row, category) => {
  const explicitKey = String(row?.iconKey || '').trim()
  if (explicitKey && ICONS[explicitKey]) return explicitKey
  const match = Object.entries(ICONS).find(([, Icon]) => Icon === row?.icon)
  return match?.[0] || FALLBACK_ICON_KEYS[category] || 'ShieldAlert'
}

export const pickLeastUsedTypeIconKey = (category, rows = []) => {
  const pool = ICON_POOLS[category] || ICON_POOLS.incident
  const counts = new Map(pool.map((key) => [key, 0]))
  rows.forEach((row) => {
    const key = String(row?.iconKey || '').trim()
    if (counts.has(key)) counts.set(key, counts.get(key) + 1)
  })
  return [...counts.entries()].sort((a, b) => a[1] - b[1])[0]?.[0] || pool[0]
}

export const applyTypeOverrides = (options, overrides) => {
  const map = new Map(
    (Array.isArray(overrides) ? overrides : []).map((row) => [normalizeTypeKey(row?.value), row]),
  )

  return options
    .map((option) => {
      const override = map.get(normalizeTypeKey(option.value))
      if (!override) return option
      if (override.hidden) return null
      return {
        ...option,
        title: override.title || option.title,
        description: override.description ?? option.description,
        iconKey: override.iconKey || resolveTypeIconKey(option),
        icon: override.iconKey ? resolveTypeIcon(override.iconKey) : option.icon,
      }
    })
    .filter(Boolean)
}

export const withResolvedTypeIcon = (row, category, fallbackDescription) => ({
  ...row,
  iconKey: row?.iconKey || FALLBACK_ICON_KEYS[category],
  icon: resolveTypeIcon(row?.iconKey, category),
  description: row?.description || fallbackDescription,
})

export const buildPinnedVisibleOptions = ({
  options,
  selected,
  visibleLimit,
  showAll,
  toggleOption,
}) => {
  if (!Array.isArray(options) || options.length <= visibleLimit) return options
  if (showAll) return [...options, toggleOption]

  const selectedSet = new Set(
    (Array.isArray(selected) ? selected : [selected]).map(normalizeTypeKey).filter(Boolean),
  )
  const visibleRows = options.slice(0, visibleLimit)
  const visibleSet = new Set(visibleRows.map((row) => normalizeTypeKey(row?.value)))
  const selectedRows = options.filter((row) => {
    const key = normalizeTypeKey(row?.value)
    return selectedSet.has(key) && !visibleSet.has(key)
  })

  const trimmedVisibleRows = visibleRows.slice(0, visibleLimit - selectedRows.length)

  return [...trimmedVisibleRows, ...selectedRows, toggleOption]
}
