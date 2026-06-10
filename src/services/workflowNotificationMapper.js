/**
 * @typedef {Object} WorkflowNotificationDeepLinkInput
 * @property {string} [module]
 * @property {string} [recordType]
 * @property {string} [detailRouteKey]
 * @property {string} [recordDisplayId]
 * @property {string} [recordId]
 * @property {string} [ownerUserId]
 * @property {boolean} [actionRequiredForViewer]
 */

/**
 * @typedef {Object} WorkflowNotificationPayload
 * @property {string} id
 * @property {string} eventType
 * @property {string} recordType
 * @property {string} recordId
 * @property {string} recordDisplayId
 * @property {string} ownerUserId
 * @property {{userId?: string, name?: string, email?: string}} actor
 * @property {string} title
 * @property {string} message
 * @property {string} createdAt
 * @property {boolean} read
 * @property {boolean} unread
 * @property {boolean} actionRequired
 * @property {boolean} actionRequiredForViewer
 * @property {string} deepLink
 */

const normalizeText = (value) => String(value || '').trim()

const deriveReadState = (event = {}) => {
  if (typeof event?.read === 'boolean') return event.read
  if (typeof event?.is_read === 'boolean') return event.is_read
  if (typeof event?.isRead === 'boolean') return event.isRead
  if (typeof event?.unread === 'boolean') return !event.unread
  if (typeof event?.read_at === 'string') return event.read_at.trim().length > 0
  if (typeof event?.readAt === 'string') return event.readAt.trim().length > 0
  return false
}

export const buildWorkflowNotificationDeepLink = ({
  module = '',
  recordType = '',
  detailRouteKey = '',
  recordDisplayId = '',
  recordId = '',
  ownerUserId = '',
  actionRequiredForViewer = false,
} = {}) => {
  const normalizedModule = normalizeText(module).toLowerCase()
  const normalizedRecordType = normalizeText(recordType).toLowerCase()
  const routeKey = normalizeText(detailRouteKey)
  const displayId = normalizeText(recordDisplayId)
  const id = normalizeText(recordId)
  const owner = normalizeText(ownerUserId)

  if (routeKey) {
    if (normalizedRecordType === 'team' || normalizedModule === 'team') {
      return `/team/details/${encodeURIComponent(routeKey)}`
    }

    if (normalizedRecordType === 'overtime' || normalizedModule === 'overtime') {
      if (actionRequiredForViewer) {
        return `/staff/overtime-management/record/${encodeURIComponent(routeKey)}`
      }
      return displayId ? `/overtime/${encodeURIComponent(displayId)}` : '/overtime'
    }

    if (normalizedRecordType === 'leave' || normalizedModule === 'leave') {
      if (actionRequiredForViewer) {
        return `/staff/leave-management/record/${encodeURIComponent(routeKey)}`
      }
      return id ? `/leave/${encodeURIComponent(id)}` : '/leave'
    }

    if (normalizedRecordType === 'salary_assignment') {
      if (actionRequiredForViewer && id) {
        return `/staff/set-salary/assignment/${encodeURIComponent(id)}/view`
      }
      return `/staff/set-salary/set-salary?assignmentId=${encodeURIComponent(routeKey)}`
    }

    if (
      normalizedRecordType === 'payroll_claim' ||
      ['salary', 'expense', 'exceptional'].includes(normalizedModule)
    ) {
      if (actionRequiredForViewer) {
        const staffKey = owner && id ? `${owner}::${id}` : routeKey
        return staffKey
          ? `/staff/salary-claims/claim/${encodeURIComponent(staffKey)}`
          : '/staff/salary-claims/claims'
      }
      return `/payroll/claims/${encodeURIComponent(routeKey)}`
    }
  }

  if (normalizedRecordType === 'team' || normalizedModule === 'team') {
    return id ? `/team/details/${encodeURIComponent(id)}` : '/team/details'
  }

  if (normalizedModule === 'overtime') {
    if (actionRequiredForViewer) {
      const staffKey = owner && id ? `${owner}::${id}` : ''
      return staffKey
        ? `/staff/overtime-management/record/${encodeURIComponent(staffKey)}`
        : '/staff/overtime-management/records'
    }
    return displayId ? `/overtime/${encodeURIComponent(displayId)}` : '/overtime'
  }

  if (normalizedModule === 'leave' || normalizedRecordType === 'leave') {
    if (actionRequiredForViewer) {
      const leaveKey = owner && id ? `${owner}::${id}` : ''
      return leaveKey ? `/staff/leave-management/record/${encodeURIComponent(leaveKey)}` : '/leave'
    }
    return id ? `/leave/${encodeURIComponent(id)}` : '/leave'
  }

  if (normalizedRecordType === 'salary_assignment') {
    if (actionRequiredForViewer && id) {
      return `/staff/set-salary/assignment/${encodeURIComponent(id)}/view`
    }
    return id
      ? `/staff/set-salary/set-salary?assignmentId=${encodeURIComponent(id)}`
      : '/staff/set-salary/set-salary'
  }

  if (['salary', 'expense', 'exceptional'].includes(normalizedModule)) {
    if (actionRequiredForViewer) {
      const staffKey = owner && id ? `${owner}::${id}` : displayId || id
      return staffKey
        ? `/staff/salary-claims/claim/${encodeURIComponent(staffKey)}`
        : '/staff/salary-claims/claims'
    }
    const ownerClaimKey = displayId || id
    return ownerClaimKey
      ? `/payroll/claims/${encodeURIComponent(ownerClaimKey)}`
      : '/payroll/claims'
  }

  return '/notifications/workflow'
}

export const toWorkflowNotificationPayload = (event = {}) => {
  const module = normalizeText(event?.module || event?.metadata?.module).toLowerCase()
  const recordType = normalizeText(event?.recordType || event?.metadata?.recordType).toLowerCase()
  const detailRouteKey = normalizeText(event?.detailRouteKey || event?.metadata?.detailRouteKey)
  const recordDisplayId = normalizeText(event?.recordDisplayId || event?.metadata?.recordDisplayId)
  const recordId = normalizeText(event?.recordId || event?.metadata?.recordId)
  const ownerUserId = normalizeText(event?.ownerUserId || event?.metadata?.ownerUserId)
  const actionRequiredForViewer = Boolean(event?.actionRequiredForViewer)
  const read = deriveReadState(event)

  return {
    ...event,
    module,
    recordType,
    detailRouteKey: detailRouteKey || null,
    recordDisplayId,
    recordId,
    ownerUserId,
    read,
    unread: !read,
    actionRequired: Boolean(event?.actionRequired),
    actionRequiredForViewer,
    deepLink: buildWorkflowNotificationDeepLink({
      module,
      recordType,
      detailRouteKey,
      recordDisplayId,
      recordId,
      ownerUserId,
      actionRequiredForViewer,
    }),
  }
}
