import { useMemo } from 'react'
import { CalendarDays, Clock3 } from 'lucide-react'

const INSPECTION_TYPE_META = { label: 'Inspection', idPrefix: 'INS' }

const toLocalDateValue = (dateInput = new Date()) => {
  const value = dateInput instanceof Date ? new Date(dateInput) : new Date(dateInput)
  const yyyy = value.getFullYear()
  const mm = String(value.getMonth() + 1).padStart(2, '0')
  const dd = String(value.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const useInspectionMetadata = ({ reportId, pathname, basePath = '/inspection' }) => {
  const activeSection = useMemo(() => {
    const segments = String(pathname || '')
      .split('/')
      .filter(Boolean)
      .map((segment) => segment.toLowerCase())
    if (segments.includes('new') && segments.includes('review')) return 'review'
    if (segments.includes('new')) return 'new'
    if (reportId) return 'detail'
    return 'records'
  }, [pathname, reportId])

  const todayDateValue = useMemo(() => toLocalDateValue(new Date()), [])
  const yesterdayDateValue = useMemo(() => {
    const value = new Date()
    value.setDate(value.getDate() - 1)
    return toLocalDateValue(value)
  }, [])
  const twoDaysAgoDateValue = useMemo(() => {
    const value = new Date()
    value.setDate(value.getDate() - 2)
    return toLocalDateValue(value)
  }, [])

  const datePresetOptions = useMemo(
    () => [
      {
        value: todayDateValue,
        title: 'Today',
        description: todayDateValue,
        icon: CalendarDays,
      },
      {
        value: yesterdayDateValue,
        title: 'Yesterday',
        description: yesterdayDateValue,
        icon: CalendarDays,
      },
      {
        value: twoDaysAgoDateValue,
        title: '2 days ago',
        description: twoDaysAgoDateValue,
        icon: CalendarDays,
      },
    ],
    [todayDateValue, twoDaysAgoDateValue, yesterdayDateValue],
  )

  const timePresetOptions = useMemo(
    () => [
      { value: '06:00', title: '06:00', description: 'Morning shift start', icon: Clock3 },
      { value: '12:00', title: '12:00', description: 'Midday', icon: Clock3 },
      { value: '18:00', title: '18:00', description: 'Evening shift start', icon: Clock3 },
      { value: '00:00', title: '00:00', description: 'Night shift start', icon: Clock3 },
    ],
    [],
  )

  return {
    reportTypeSlug: 'inspection',
    isKnownType: true,
    activeSection,
    reportTypeMeta: INSPECTION_TYPE_META,
    reportTypeLabel: INSPECTION_TYPE_META.label,
    reportTypeIdPrefix: INSPECTION_TYPE_META.idPrefix,
    reportBasePath: basePath,
    datePresetOptions,
    timePresetOptions,
  }
}

export default useInspectionMetadata
