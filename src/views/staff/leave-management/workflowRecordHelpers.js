export const toWorkflowMonthValue = (value) => {
  if (value === null || typeof value === 'undefined' || value === '') return 'unknown'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'unknown'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export const toWorkflowTestIdToken = (value = '') =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'group'

export const normalizeWorkflowTeamLabel = (value) => {
  const normalized = String(value || '').trim()
  if (!normalized || normalized.toLowerCase() === 'unassigned') return ''
  return normalized
}

export const formatWorkflowTeamSuffix = (value) => {
  const normalized = normalizeWorkflowTeamLabel(value)
  return normalized ? `- ${normalized}` : ''
}

export const formatWorkflowTotal = (value) => {
  const normalized = Number(value || 0)
  if (!Number.isFinite(normalized)) return '0'
  return Number.isInteger(normalized) ? String(normalized) : normalized.toFixed(1)
}

export const buildWorkflowMonthUserGroups = ({
  entries = [],
  getRow = (entry) => entry?.row || entry,
  getDate = (row) => row?.appliedAt,
  unknownGroupLabel = 'Unknown period',
  monthFormatter = new Intl.DateTimeFormat('en-MY', { month: 'long', year: 'numeric' }),
  includeUserGroups = false,
  createMonthExtras = () => ({}),
  createUserExtras = () => ({}),
  onAddToMonth,
  onAddToUser,
  getUserKey = (row) =>
    String(row?.ownerUserId || row?.employee || row?.recordKey || row?.id || 'unknown').trim(),
  getUserLabel = (row) => String(row?.employee || row?.submittedBy || '').trim() || 'Unknown',
  getTeam = (row) => String(row?.team || '').trim(),
  getAvatarUrl = (row) => String(row?.avatarUrl || '').trim(),
} = {}) => {
  const groups = []
  const monthMap = new Map()

  ;(Array.isArray(entries) ? entries : []).forEach((entry) => {
    const row = getRow(entry) || {}
    const rawDate = getDate(row, entry)
    const monthValue = toWorkflowMonthValue(rawDate)
    const date = new Date(rawDate)
    const hasDate = monthValue !== 'unknown' && !Number.isNaN(date.getTime())
    const monthKey = `month:${monthValue}`

    if (!monthMap.has(monthKey)) {
      const nextMonth = {
        key: monthKey,
        label: hasDate ? monthFormatter.format(date) : unknownGroupLabel,
        entries: [],
        rows: [],
        userGroups: [],
        userMap: new Map(),
        ...createMonthExtras(),
      }
      monthMap.set(monthKey, nextMonth)
      groups.push(nextMonth)
    }

    const monthGroup = monthMap.get(monthKey)
    monthGroup.entries.push(entry)
    monthGroup.rows.push(row)
    onAddToMonth?.(monthGroup, row, entry)

    if (!includeUserGroups) return

    const userKey = getUserKey(row, entry) || 'unknown'
    const groupKey = `${monthKey}:user:${userKey}`

    if (!monthGroup.userMap.has(groupKey)) {
      const nextUser = {
        key: groupKey,
        ownerLabel: getUserLabel(row, entry),
        avatarUrl: getAvatarUrl(row, entry),
        team: getTeam(row, entry),
        teamLabel: normalizeWorkflowTeamLabel(getTeam(row, entry)),
        entries: [],
        rows: [],
        ...createUserExtras(),
      }
      monthGroup.userMap.set(groupKey, nextUser)
      monthGroup.userGroups.push(nextUser)
    }

    const userGroup = monthGroup.userMap.get(groupKey)
    userGroup.entries.push(entry)
    userGroup.rows.push(row)
    const rowTeam = normalizeWorkflowTeamLabel(getTeam(row, entry))
    if (rowTeam) {
      if (!userGroup.teamLabel) {
        userGroup.teamLabel = rowTeam
        userGroup.team = rowTeam
      } else if (userGroup.teamLabel !== rowTeam) {
        userGroup.teamLabel = 'Multiple teams'
        userGroup.team = 'Multiple teams'
      }
    }
    onAddToUser?.(userGroup, row, entry)
  })

  return groups.map((group) => {
    const { userMap, ...rest } = group
    void userMap
    return rest
  })
}

export const getWorkflowGroupSelectionState = ({
  rows = [],
  canActOnRow,
  getRowKey,
  isSelectedKey,
}) => {
  const eligibleKeys = (Array.isArray(rows) ? rows : [])
    .filter((row) => canActOnRow?.(row))
    .map((row) => getRowKey?.(row))
    .filter(Boolean)
  const selectedCount = eligibleKeys.filter((key) => isSelectedKey?.(key)).length

  return {
    eligibleKeys,
    selectedCount,
    allSelected: eligibleKeys.length > 0 && selectedCount === eligibleKeys.length,
  }
}

export const buildReviewWorkflowActionItems = ({
  row,
  actionKeyPrefix,
  actionConfig = {},
  approveLabel = 'Approve',
  rejectLabel = 'Reject',
  onApprove,
  onReject,
  onRequestCorrection,
  disableWhenHandlerMissing = false,
}) => {
  const disabledReason = actionConfig?.requiredRole
    ? `This stage requires ${actionConfig.requiredRole} role.`
    : 'This record is not eligible for this workflow action.'

  return [
    {
      key: `${actionKeyPrefix}-approve`,
      label: actionConfig?.approveLabel || approveLabel,
      onClick: () => onApprove?.(row),
      disabled:
        actionConfig?.approveDisabled ||
        (disableWhenHandlerMissing && typeof onApprove !== 'function'),
      disabledReason,
    },
    {
      key: `${actionKeyPrefix}-reject`,
      label: rejectLabel,
      className: 'text-danger',
      onClick: () => onReject?.(row),
      disabled:
        actionConfig?.rejectDisabled ||
        (disableWhenHandlerMissing && typeof onReject !== 'function'),
      disabledReason,
    },
    ...(typeof onRequestCorrection === 'function'
      ? [
          {
            key: `${actionKeyPrefix}-request-correction`,
            label: 'Request correction',
            onClick: () => onRequestCorrection(row),
            disabled: Boolean(actionConfig?.correctionDisabled),
            disabledReason,
          },
        ]
      : []),
  ]
}

export const buildWorkflowMobileSections = ({
  groups = [],
  useUserGroups = false,
  buildGroupLabel,
  buildGroupSummary,
  buildItem,
}) =>
  (Array.isArray(groups) ? groups : []).flatMap((group) => {
    if (useUserGroups) {
      return (group.userGroups || []).map((userGroup) => ({
        key: `mobile-${userGroup.key}`,
        label: buildGroupLabel?.({ group, userGroup }),
        summary: buildGroupSummary?.({ group, userGroup }),
        items: (userGroup.entries || userGroup.rows || []).map(buildItem),
      }))
    }

    return [
      {
        key: `mobile-${group.key || group.label || 'all-records'}`,
        label: buildGroupLabel?.({ group }),
        summary: buildGroupSummary?.({ group }),
        items: (group.entries || group.rows || []).map(buildItem),
      },
    ]
  })
