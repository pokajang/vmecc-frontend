export const triggerBlobDownload = (blob, filename, { revokeDelayMs = 1000 } = {}) => {
  if (!(blob instanceof Blob) || blob.size === 0) {
    throw new Error('Cannot download an empty file.')
  }

  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = String(filename || 'download').trim() || 'download'
  link.hidden = true
  document.body.appendChild(link)

  try {
    link.click()
  } finally {
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), revokeDelayMs)
  }
}
