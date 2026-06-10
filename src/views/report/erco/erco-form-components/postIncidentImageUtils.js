export const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error || new Error('Unable to read file'))
    reader.readAsDataURL(file)
  })

const loadImageElement = (file) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Unable to read selected image.'))
    }
    image.src = objectUrl
  })

const canvasToBlob = (canvas, mimeType, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Unable to compress selected image.'))
          return
        }
        resolve(blob)
      },
      mimeType,
      quality,
    )
  })

export const isLikelyImageFile = (file) =>
  String(file?.type || '')
    .toLowerCase()
    .startsWith('image/')

export const compressPhotoFile = async (file, targetBytes) => {
  const image = await loadImageElement(file)
  const mimeType = 'image/jpeg'
  const dimensionCandidates = [2048, 1920, 1600, 1365, 1280, 1024, 900, 768, 640, 512]
  const qualityCandidates = [0.88, 0.8, 0.72, 0.64, 0.56, 0.48, 0.4, 0.32]
  let bestBlob = null

  for (const maxDimension of dimensionCandidates) {
    const ratio = Math.min(1, maxDimension / Math.max(image.width || 1, image.height || 1))
    const width = Math.max(1, Math.round((image.width || 1) * ratio))
    const height = Math.max(1, Math.round((image.height || 1) * ratio))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) throw new Error('Unable to process selected image.')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    context.drawImage(image, 0, 0, width, height)

    for (const quality of qualityCandidates) {
      const nextBlob = await canvasToBlob(canvas, mimeType, quality)
      if (!bestBlob || nextBlob.size < bestBlob.size) bestBlob = nextBlob
      if (nextBlob.size <= targetBytes) break
    }

    if (bestBlob?.size <= targetBytes) break
  }

  if (!bestBlob) throw new Error('Unable to compress selected image.')

  const nextType = bestBlob.type || file.type || 'image/jpeg'
  const nextName =
    nextType === 'image/jpeg' && !/\.(jpg|jpeg)$/i.test(String(file?.name || ''))
      ? `${String(file?.name || 'photo').replace(/\.[^.]+$/, '') || 'photo'}.jpg`
      : String(file?.name || 'photo')

  return new File([bestBlob], nextName, {
    type: nextType,
    lastModified: Date.now(),
  })
}
