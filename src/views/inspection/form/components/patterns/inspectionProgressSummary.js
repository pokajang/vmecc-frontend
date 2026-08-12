const toSafeCount = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0
}

export const normalizeInspectionProgress = ({
  checkedCount,
  completedCount,
  inspectedCount,
  totalCount,
  issueCount,
  defectCount,
} = {}) => {
  const total = toSafeCount(totalCount)
  const rawChecked = toSafeCount(checkedCount ?? completedCount ?? inspectedCount)
  const checked = total > 0 ? Math.min(rawChecked, total) : 0
  const issues = toSafeCount(issueCount ?? defectCount)

  return {
    checkedCount: checked,
    totalCount: total,
    issueCount: issues,
    isComplete: total > 0 && checked >= total,
  }
}

export const formatInspectionProgressSummary = (progress = {}) => {
  const normalized = normalizeInspectionProgress(progress)
  const progressText = `${normalized.checkedCount}/${normalized.totalCount} checked`
  const issueText =
    normalized.issueCount > 0
      ? `${normalized.issueCount} ${normalized.issueCount === 1 ? 'issue' : 'issues'}`
      : ''
  const tokens = [progressText, issueText].filter(Boolean)

  return {
    ...normalized,
    progressText,
    issueText,
    tokens,
    text: tokens.join(' • '),
  }
}

export const formatInspectionItemCount = (count) => {
  const normalized = toSafeCount(count)
  return `${normalized} ${normalized === 1 ? 'item' : 'items'}`
}
