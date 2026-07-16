import React, { useMemo, useState } from 'react'
import { CButton, CModal, CModalBody, CModalHeader, CModalTitle } from '@coreui/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ReportPhotoImage } from './ReportViewComponents'

const getPhotoLabel = (photo, index) =>
  String(photo?.description || photo?.fileName || `Photo ${index + 1}`).trim()

const ReportPhotoGallery = ({ photos = [], title = 'Photographs' }) => {
  const visiblePhotos = useMemo(
    () => (Array.isArray(photos) ? photos : []).filter((photo) => photo?.url),
    [photos],
  )
  const [selectedIndex, setSelectedIndex] = useState(null)
  const selectedPhoto = selectedIndex === null ? null : visiblePhotos[selectedIndex]

  if (visiblePhotos.length === 0) return null

  const selectPrevious = () => {
    setSelectedIndex((current) =>
      current === null ? 0 : (current - 1 + visiblePhotos.length) % visiblePhotos.length,
    )
  }
  const selectNext = () => {
    setSelectedIndex((current) => (current === null ? 0 : (current + 1) % visiblePhotos.length))
  }

  return (
    <>
      <div className="report-photo-gallery" aria-label={title}>
        {visiblePhotos.map((photo, index) => {
          const label = getPhotoLabel(photo, index)
          return (
            <button
              key={photo.id || photo.mediaId || photo.url || index}
              type="button"
              className="report-photo-gallery__card rounded-3 border overflow-hidden"
              aria-label={`View photo ${index + 1}: ${label}`}
              onClick={() => setSelectedIndex(index)}
            >
              <ReportPhotoImage
                photo={photo}
                alt={label}
                className="report-photo-gallery__thumbnail"
              />
              {photo.description ? (
                <span className="report-photo-gallery__description small p-2 text-body-secondary">
                  {photo.description}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <CModal
        visible={Boolean(selectedPhoto)}
        onClose={() => setSelectedIndex(null)}
        size="xl"
        fullscreen="sm"
        scrollable
        aria-labelledby="report-photo-viewer-title"
      >
        <CModalHeader onClose={() => setSelectedIndex(null)}>
          <CModalTitle id="report-photo-viewer-title">{title}</CModalTitle>
        </CModalHeader>
        <CModalBody className="report-photo-viewer d-grid gap-3">
          {selectedPhoto ? (
            <>
              <div className="report-photo-viewer__stage">
                <ReportPhotoImage
                  photo={selectedPhoto}
                  preferFullSize
                  alt={getPhotoLabel(selectedPhoto, selectedIndex)}
                  className="report-photo-viewer__image"
                />
              </div>
              {selectedPhoto.description ? (
                <div className="report-photo-viewer__description">{selectedPhoto.description}</div>
              ) : null}
              {visiblePhotos.length > 1 ? (
                <div className="report-photo-viewer__navigation d-grid gap-2">
                  <CButton
                    type="button"
                    color="secondary"
                    variant="outline"
                    onClick={selectPrevious}
                    aria-label="Previous photo"
                  >
                    <ChevronLeft size={16} aria-hidden="true" />
                    Previous
                  </CButton>
                  <div className="small text-body-secondary text-center align-self-center">
                    {selectedIndex + 1} of {visiblePhotos.length}
                  </div>
                  <CButton
                    type="button"
                    color="secondary"
                    variant="outline"
                    onClick={selectNext}
                    aria-label="Next photo"
                  >
                    Next
                    <ChevronRight size={16} aria-hidden="true" />
                  </CButton>
                </div>
              ) : null}
            </>
          ) : null}
        </CModalBody>
      </CModal>
    </>
  )
}

export default ReportPhotoGallery
