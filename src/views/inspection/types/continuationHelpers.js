const text = (value) => String(value || '').trim()

export const normalizeContinuationKey = (value) => text(value).toLowerCase()

const normalizeOption = (option = {}) => {
  const value = text(option?.value || option?.title || option?.name)
  if (!value) return null
  return {
    ...option,
    value,
    title: text(option?.title || option?.label || option?.name || value),
  }
}

const uniqueOptions = (options = []) => {
  const seen = new Set()
  return (Array.isArray(options) ? options : []).map(normalizeOption).filter((option) => {
    const key = normalizeContinuationKey(option?.value)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const isMissingFieldsClear = (missingFields = {}) =>
  Object.values(missingFields || {}).every((value) => !value)

export const isSummaryComplete = ({ summary = {}, missingFields = {} } = {}) => {
  const totalCount = Number(summary?.totalCount || 0)
  const checkedCount = Number(summary?.checkedCount ?? summary?.completedCount ?? 0)
  return totalCount > 0 && checkedCount >= totalCount && isMissingFieldsClear(missingFields)
}

const buildProgressLabel = (summary = {}, isDone = false) => {
  const totalCount = Number(summary?.totalCount || 0)
  const checkedCount = Number(summary?.checkedCount ?? summary?.completedCount ?? 0)
  if (isDone) return 'Completed'
  if (totalCount > 0) return `${checkedCount}/${totalCount} checks`
  return ''
}

export const buildMainLocationContinuationOptions = ({
  context = {},
  form = {},
  getMissingFields,
  getSummary,
  label = 'location',
  options = null,
  parentLabel = '',
}) => {
  const sourceOptions =
    options || context.mainLocationOptions || context.location?.mainLocationOptions
  const normalizedOptions = uniqueOptions(sourceOptions)
  const currentValue = text(form.mainLocation || form.main_location || form.selectedLocation)
  if (!currentValue || normalizedOptions.length < 2) return null

  return {
    scope: 'mainLocation',
    label,
    parentLabel,
    currentValue,
    options: normalizedOptions.map((option) => {
      const scopedForm = {
        ...form,
        mainLocation: option.value,
        selectedLocation: option.value,
        subLocation: '',
        subLocationId: '',
      }
      const summary = typeof getSummary === 'function' ? getSummary(scopedForm) : {}
      const missingFields =
        typeof getMissingFields === 'function' ? getMissingFields(scopedForm) : {}
      const isDone = isSummaryComplete({ summary, missingFields })
      const metaLabel = buildProgressLabel(summary, isDone)

      return {
        ...option,
        metaLabel,
        metaTone: isDone ? 'success' : metaLabel ? 'muted' : option.metaTone,
        metaIconKey: isDone ? 'check' : option.metaIconKey || '',
        progress: {
          checkedCount: Number(summary?.checkedCount ?? summary?.completedCount ?? 0),
          inspectedCount: Number(summary?.checkedCount ?? summary?.completedCount ?? 0),
          totalCount: Number(summary?.totalCount || 0),
          isDone,
        },
      }
    }),
  }
}

export const buildSubLocationContinuationOptions = ({
  form = {},
  getOptions,
  label = 'location',
  parentLabel = '',
}) => {
  const currentValue = text(form.subLocation || form.sub_location)
  const options = uniqueOptions(typeof getOptions === 'function' ? getOptions(form) : [])
  if (!currentValue || options.length < 2) return null
  return {
    scope: 'subLocation',
    label,
    parentLabel,
    currentValue,
    options,
  }
}
