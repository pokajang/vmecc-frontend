const text = (value) => String(value || '').trim()

export const normalizeContinuationKey = (value) => text(value).toLowerCase()

export const CONTINUATION_TOKENS = Object.freeze({
  location: 'location',
  compartment: 'compartment',
  kit: 'kit',
})

export const normalizeContinuationLabel = (label = CONTINUATION_TOKENS.location) => {
  const normalized = normalizeContinuationKey(label)
  return Object.prototype.hasOwnProperty.call(CONTINUATION_TOKENS, normalized)
    ? normalized
    : CONTINUATION_TOKENS.location
}

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

const normalizeCompletionMetaLabel = (label = '') => {
  const trimmedLabel = String(label || '').trim()
  const progressMatch = trimmedLabel.match(/^\s*(\d+)\s*\/\s*(\d+)\s+(.+)$/)
  if (progressMatch) return `${progressMatch[2]} ${progressMatch[3]}`
  if (/^(completed|in progress)$/i.test(trimmedLabel)) return ''
  return trimmedLabel
}

const isCompletionPresentation = (option = {}) => {
  const label = String(option?.metaLabel || '').trim()
  return (
    /\d+\s*\/\s*\d+\s+/.test(label) ||
    /^(completed|in progress)$/i.test(label) ||
    option?.metaIconKey === 'check' ||
    option?.progress?.isDone === true
  )
}

export const neutralizeCompletionPresentation = (option = {}) => {
  if (!isCompletionPresentation(option)) return option

  const normalizedMetaLabel = normalizeCompletionMetaLabel(option?.metaLabel)
  return {
    ...option,
    metaLabel: normalizedMetaLabel,
    metaIconKey: '',
    metaTone: 'muted',
  }
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
  label = CONTINUATION_TOKENS.location,
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
    label: normalizeContinuationLabel(label),
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
      const metaTone = isDone ? 'success' : metaLabel ? 'muted' : option.metaTone
      const progress = {
        checkedCount: Number(summary?.checkedCount ?? summary?.completedCount ?? 0),
        inspectedCount: Number(summary?.checkedCount ?? summary?.completedCount ?? 0),
        totalCount: Number(summary?.totalCount || 0),
        isDone,
      }

      return neutralizeCompletionPresentation({
        ...option,
        metaLabel,
        metaTone,
        metaIconKey: isDone ? 'check' : option.metaIconKey || '',
        progress,
      })
    }),
  }
}

export const buildSubLocationContinuationOptions = ({
  form = {},
  getOptions,
  label = CONTINUATION_TOKENS.location,
  parentLabel = '',
}) => {
  const currentValue = text(form.subLocation || form.sub_location)
  const options = uniqueOptions(typeof getOptions === 'function' ? getOptions(form) : [])
  if (!currentValue || options.length < 2) return null
  return {
    scope: 'subLocation',
    label: normalizeContinuationLabel(label),
    parentLabel,
    currentValue,
    options,
  }
}
