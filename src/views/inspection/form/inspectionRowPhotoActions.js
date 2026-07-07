import {
  applyPhotoCaptionById,
  removePhotoById,
  updatePhotoDescriptionById,
} from './inspectionPhotoUtils'

export const createRowPhotoHandlers = ({ getPhotos, updateRow, appendText }) => ({
  removePhoto: (row, photoId, photosKey = 'photos') => {
    updateRow(row, {
      [photosKey]: removePhotoById(getPhotos(row, photosKey), photoId),
    })
  },
  updatePhotoDescription: (row, photoId, description, photosKey = 'photos') => {
    updateRow(row, {
      [photosKey]: updatePhotoDescriptionById(getPhotos(row, photosKey), photoId, description),
    })
  },
  applyPhotoCaption: (row, photoId, caption, photosKey = 'photos') => {
    updateRow(row, {
      [photosKey]: applyPhotoCaptionById(getPhotos(row, photosKey), photoId, caption, appendText),
    })
  },
})

export const createGroupedRowPhotoHandlers = ({ getPhotos, updateRow, appendText }) => ({
  removePhoto: (groupKey, row, photoId, photosKey = 'photos') => {
    updateRow(groupKey, row, {
      [photosKey]: removePhotoById(getPhotos(groupKey, row, photosKey), photoId),
    })
  },
  updatePhotoDescription: (groupKey, row, photoId, description, photosKey = 'photos') => {
    updateRow(groupKey, row, {
      [photosKey]: updatePhotoDescriptionById(
        getPhotos(groupKey, row, photosKey),
        photoId,
        description,
      ),
    })
  },
  applyPhotoCaption: (groupKey, row, photoId, caption, photosKey = 'photos') => {
    updateRow(groupKey, row, {
      [photosKey]: applyPhotoCaptionById(
        getPhotos(groupKey, row, photosKey),
        photoId,
        caption,
        appendText,
      ),
    })
  },
})
