import {
  fetchWorkflowNotificationUnreadCount,
  fetchWorkflowNotifications,
  markAllWorkflowNotificationsRead,
  markWorkflowNotificationRead,
  deleteWorkflowNotification,
  deleteAllWorkflowNotifications,
} from './apiClient'
import {
  buildWorkflowNotificationDeepLink,
  toWorkflowNotificationPayload,
} from './workflowNotificationMapper'

export const getWorkflowNotificationsForViewer = async ({
  unreadOnly = false,
  limit = 50,
} = {}) => {
  try {
    const params = {}
    if (unreadOnly) params.unread_only = '1'
    if (limit !== 50) params.limit = String(limit)
    const result = await fetchWorkflowNotifications(params)
    const data = Array.isArray(result?.data)
      ? result.data.map((item) => toWorkflowNotificationPayload(item))
      : []
    return { ok: true, data }
  } catch (error) {
    return { ok: false, data: [], error }
  }
}

export const getWorkflowNotificationUnreadCount = async () => {
  try {
    const result = await fetchWorkflowNotificationUnreadCount('')
    return { ok: true, count: Number(result?.data?.count || 0) || 0 }
  } catch (error) {
    return { ok: false, count: 0, error }
  }
}

export const getWorkflowUnreadCount = getWorkflowNotificationUnreadCount

export const markWorkflowNotificationAsRead = async (notificationId) => {
  try {
    await markWorkflowNotificationRead(notificationId)
    return { ok: true }
  } catch (error) {
    return { ok: false, error }
  }
}

export const markAllWorkflowNotificationsReadForViewer = async () => {
  try {
    await markAllWorkflowNotificationsRead('')
    return { ok: true }
  } catch (error) {
    return { ok: false, error }
  }
}

export const deleteWorkflowNotificationById = async (notificationId) => {
  try {
    await deleteWorkflowNotification(notificationId)
    return { ok: true }
  } catch (error) {
    return { ok: false, error }
  }
}

export const deleteAllWorkflowNotificationsForViewer = async () => {
  try {
    await deleteAllWorkflowNotifications()
    return { ok: true }
  } catch (error) {
    return { ok: false, error }
  }
}

export const buildWorkflowNotificationDetailPath = ({ event } = {}) => {
  return buildWorkflowNotificationDeepLink({
    module: event?.module || event?.metadata?.module,
    recordType: event?.recordType || event?.metadata?.recordType,
    detailRouteKey: event?.detailRouteKey || event?.metadata?.detailRouteKey,
    recordDisplayId: event?.recordDisplayId || event?.metadata?.recordDisplayId,
    recordId: event?.recordId || event?.metadata?.recordId,
    ownerUserId: event?.ownerUserId || event?.metadata?.ownerUserId,
    actionRequiredForViewer: event?.actionRequiredForViewer,
  })
}
