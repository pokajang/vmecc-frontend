import { renewReportMediaLease } from 'src/services/api/reportMediaApi'

export const INSPECTION_MEDIA_LEASE_RENEW_INTERVAL_MS = 12 * 60 * 60 * 1000

const text = (value) => String(value || '').trim()

export const collectInspectionLeasedPhotos = (value, photos = new Map()) => {
  if (!value || typeof value !== 'object') return [...photos.values()]
  if (Array.isArray(value)) {
    value.forEach((child) => collectInspectionLeasedPhotos(child, photos))
    return [...photos.values()]
  }
  const mediaId = text(value.mediaId || value.media_id)
  const leaseId = text(value.leaseId || value.lease_id)
  if (mediaId && leaseId) {
    photos.set(mediaId, value)
    return [...photos.values()]
  }
  Object.values(value).forEach((child) => collectInspectionLeasedPhotos(child, photos))
  return [...photos.values()]
}

export const shouldRenewInspectionMediaLeases = (lastRenewedAt, now = Date.now()) => {
  const lastRenewedMs = new Date(text(lastRenewedAt)).getTime()
  return (
    !Number.isFinite(lastRenewedMs) ||
    now - lastRenewedMs >= INSPECTION_MEDIA_LEASE_RENEW_INTERVAL_MS
  )
}

export const renewInspectionPayloadMediaLeases = async (payload, contextKey = '') => {
  const photos = collectInspectionLeasedPhotos(payload)
  for (const photo of photos) {
    await renewReportMediaLease(photo, contextKey)
  }
  return photos.length
}
