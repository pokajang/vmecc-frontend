const text = (value) => String(value || '').trim()

export const normalizeComparableText = (value) => text(value).toLowerCase()

export const getPhotoKey = (photo = {}, index = 0) =>
  text(
    photo.id ||
      photo.mediaId ||
      photo.photoId ||
      photo.photo_id ||
      photo.url ||
      photo.dataUrl ||
      photo.data_url ||
      photo.thumbnailUrl ||
      photo.fileName ||
      photo.file_name,
  ) || `photo-${index + 1}`

export const getPhotoSources = (photo = {}, preferFullSize = false) => {
  const full = text(photo.url || photo.dataUrl || photo.data_url)
  const thumbnail = text(photo.thumbnailUrl || photo.thumbnail_url)
  return preferFullSize
    ? { preferred: full || thumbnail, fallback: thumbnail && thumbnail !== full ? thumbnail : '' }
    : { preferred: thumbnail || full, fallback: full && full !== thumbnail ? full : '' }
}

export const dedupeMediaPhotos = (photos = []) => {
  const seen = new Set()
  return (Array.isArray(photos) ? photos : []).filter((photo, index) => {
    if (!photo) return false
    const key = getPhotoKey(photo, index)
    if (seen.has(key)) return false
    seen.add(key)
    return Boolean(getPhotoSources(photo).preferred)
  })
}

export const getMeaningfulPhotoCaption = (photo = {}, hiddenValues = []) => {
  const caption = text(photo.description || photo.caption)
  if (!caption) return ''
  const fileName = normalizeComparableText(photo.fileName || photo.file_name || photo.name)
  const normalizedCaption = normalizeComparableText(caption)
  const urlFileName = normalizeComparableText(
    text(photo.url || photo.thumbnailUrl || photo.thumbnail_url)
      .split(/[?#]/, 1)[0]
      .split(/[\\/]/)
      .pop(),
  )
  const looksLikeImageFileName = /\.(?:avif|bmp|gif|heic|heif|jpe?g|png|tiff?|webp)$/i.test(caption)
  const hidden = new Set(
    (Array.isArray(hiddenValues) ? hiddenValues : []).map(normalizeComparableText).filter(Boolean),
  )
  if (
    normalizedCaption === fileName ||
    normalizedCaption === urlFileName ||
    looksLikeImageFileName ||
    hidden.has(normalizedCaption)
  ) {
    return ''
  }
  return caption
}

export const getEvidencePhotoLabel = ({ photo = {}, index = 0, count = 1, contextLabel }) => {
  const description = getMeaningfulPhotoCaption(photo)
  const context = text(contextLabel) || 'Evidence'
  const position = `${/(?:photo|photos)$/i.test(context) ? '' : 'photo '}${index + 1}${
    count > 1 ? ` of ${count}` : ''
  }`
  return description ? `${context} ${position}: ${description}` : `${context} ${position}`
}

export const clampPhotoZoom = (value) => Math.min(3, Math.max(0.5, Number(value) || 1))
