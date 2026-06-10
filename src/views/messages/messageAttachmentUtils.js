export const THREAD_LIMIT = 200
export const MAX_THREAD_BACKOFF = 60000
export const MAX_IMAGE_SIZE = Number(import.meta.env.VITE_MAX_ATTACHMENT_BYTES) || 2 * 1024 * 1024
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

const COMPRESS_THRESHOLD = 800 * 1024
const MAX_DIMENSION = 1920
const JPEG_QUALITY = 0.82

export const shouldBackoff = (err) => {
  if (!err) return false
  const status = err?.status
  if (status === 429 || status === 503 || status === 0) return true
  if (!status && (err instanceof TypeError || err?.message === 'Network Error')) return true
  return false
}

export const shouldCompressImage = (file) => file?.size > COMPRESS_THRESHOLD

export const compressImage = (file) =>
  new Promise((resolve, reject) => {
    const img = new window.Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      let { width, height } = img
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width >= height) {
          height = Math.round((height * MAX_DIMENSION) / width)
          width = MAX_DIMENSION
        } else {
          width = Math.round((width * MAX_DIMENSION) / height)
          height = MAX_DIMENSION
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Compression failed.'))
            return
          }
          const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now(),
          })
          resolve(compressed)
        },
        'image/jpeg',
        JPEG_QUALITY,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not read image.'))
    }
    img.src = objectUrl
  })
