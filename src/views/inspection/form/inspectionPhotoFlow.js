const normalizeUploadOptions = (options) =>
  options && typeof options === 'object' && !Array.isArray(options) ? options : {}

export const buildPhotoViewerUploadOptions = (openViewer, options = {}) => ({
  ...normalizeUploadOptions(options),
  onAfterAddPhotos: ({ photos }) => {
    openViewer?.(Array.isArray(photos) ? photos : [])
  },
})

export const buildStagedPhotoUploadOptions = (options, onAddPhotos) => ({
  ...normalizeUploadOptions(options),
  onAddPhotos,
})
