export const LOADING_COUNT_LABEL = 'Loading...'

export const getCountLabel = ({ count, isLoading = false, loadingLabel = LOADING_COUNT_LABEL }) => {
  const numericCount = Number(count)
  const hasCount = Number.isFinite(numericCount) && numericCount > 0

  if (hasCount) return String(numericCount)
  return isLoading ? loadingLabel : '0'
}

export const getActionCountLabel = (count, isLoading = false) => getCountLabel({ count, isLoading })

export const getUnitCountLabel = (count, isLoading = false) => {
  const label = getCountLabel({ count, isLoading })
  if (label === LOADING_COUNT_LABEL) return label

  const numericCount = Number(label)
  return `${label} unit${numericCount === 1 ? '' : 's'}`
}

export const getPluralizedUnit = (count, singular, plural = '') => {
  const numericCount = Number(count)
  return numericCount === 1 ? singular : plural || `${singular}s`
}

export const getScopedProgressLabel = ({
  completedCount = 0,
  totalCount = 0,
  singular,
  plural = '',
  isLoading = false,
  loadingLabel = LOADING_COUNT_LABEL,
}) => {
  if (isLoading) return loadingLabel

  const numericCompleted = Number(completedCount)
  const numericTotal = Number(totalCount)
  if (!Number.isFinite(numericTotal) || numericTotal <= 0) return ''

  const safeCompleted = Number.isFinite(numericCompleted)
    ? Math.max(0, Math.min(numericCompleted, numericTotal))
    : 0
  return `${safeCompleted}/${numericTotal} ${getPluralizedUnit(numericTotal, singular, plural)}`
}

export const getContextCountLabel = ({
  count = 0,
  singular,
  plural = '',
  isLoading = false,
  loadingLabel = LOADING_COUNT_LABEL,
}) => {
  const label = getCountLabel({ count, isLoading, loadingLabel })
  if (label === loadingLabel) return label

  const numericCount = Number(label)
  return `${label} ${getPluralizedUnit(numericCount, singular, plural)}`
}
