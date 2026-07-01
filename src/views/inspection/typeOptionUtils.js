import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Building2,
  Camera,
  Cctv,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  ClipboardCheck,
  ClipboardList,
  Droplets,
  Factory,
  FileCheck,
  FileSearch,
  Flame,
  FlaskConical,
  Gauge,
  HardHat,
  HeartPulse,
  LifeBuoy,
  MapPin,
  MapPinned,
  Route,
  Ruler,
  ScanSearch,
  SearchCheck,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Sparkles,
  Sun,
  ThermometerSun,
  Truck,
  Warehouse,
  Wind,
  Wrench,
} from 'lucide-react'

const ICONS = {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Building2,
  Camera,
  Cctv,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  ClipboardCheck,
  ClipboardList,
  Droplets,
  Factory,
  FileCheck,
  FileSearch,
  Flame,
  FlaskConical,
  Gauge,
  HardHat,
  HeartPulse,
  LifeBuoy,
  MapPin,
  MapPinned,
  Route,
  Ruler,
  ScanSearch,
  SearchCheck,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Sparkles,
  Sun,
  ThermometerSun,
  Truck,
  Warehouse,
  Wind,
  Wrench,
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
    'Factory',
    'Warehouse',
    'Route',
    'Building2',
    'MapPinned',
    'ClipboardCheck',
    'ClipboardList',
    'HardHat',
    'Wrench',
    'Gauge',
    'ScanSearch',
    'SearchCheck',
    'Cctv',
    'Camera',
    'Ruler',
    'FileCheck',
    'FileSearch',
    'BadgeCheck',
    'ShieldCheck',
    'Activity',
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

export const ACTIVE_CARD_STYLE = {
  backgroundColor: 'rgba(0, 126, 122, 0.2)',
  borderColor: 'rgba(0, 126, 122, 0.45)',
}

export const TOGGLE_CARD_PROPS = {
  style: {
    backgroundColor: 'var(--cui-light-bg-subtle, #f8f9fa)',
    borderColor: 'var(--cui-border-color, #d8dbe0)',
    borderStyle: 'dashed',
  },
  className: 'text-primary',
  iconContainerClassName: 'bg-white text-primary',
  titleClassName: 'fw-semibold text-primary',
  descriptionClassName: 'mb-0 mt-1 text-body-secondary',
}

export const normalizeTypeKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

export const stripInspectionContext = (value) =>
  String(value || '')
    .trim()
    .replace(/\s*\/\s*inspection\b/gi, '')
    .replace(/\s+inspection\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

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

export const pickUnusedTypeIconKey = (category, rows = []) => {
  const pool = ICON_POOLS[category] || ICON_POOLS.incident
  const used = new Set(
    rows
      .map((row) => resolveTypeIconKey(row, category))
      .map((key) => String(key || '').trim())
      .filter(Boolean),
  )
  return pool.find((key) => !used.has(key)) || ''
}

export const withUniqueTypeIcons = (category, rows = []) => {
  const pool = ICON_POOLS[category] || ICON_POOLS.incident
  const used = new Set()

  return (Array.isArray(rows) ? rows : []).map((row) => {
    const currentKey = resolveTypeIconKey(row, category)
    const iconKey =
      currentKey && !used.has(currentKey) ? currentKey : pool.find((key) => !used.has(key))

    if (iconKey) {
      used.add(iconKey)
      return {
        ...row,
        iconKey,
        icon: resolveTypeIcon(iconKey, category),
      }
    }

    return row
  })
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
