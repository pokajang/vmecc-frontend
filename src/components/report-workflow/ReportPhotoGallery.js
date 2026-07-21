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
  const [viewMode, setViewMode] = useState('fit')
  const selectedPhoto = selectedIndex === null ? null : visiblePhotos[selectedIndex]

  const closeViewer = () => {
    setSelectedIndex(null)
    setViewMode('fit')
  }

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
        onClose={closeViewer}
        size="xl"
        fullscreen="sm"
        scrollable
        aria-labelledby="report-photo-viewer-title"
      >
        <CModalHeader onClose={closeViewer}>
          <CModalTitle id="report-photo-viewer-title">{title}</CModalTitle>
        </CModalHeader>
        <CModalBody className="report-photo-viewer d-grid gap-3">
          {selectedPhoto ? (
            <>
              <div className={`report-photo-viewer__stage report-photo-viewer__stage--${viewMode}`}>
                <ReportPhotoImage
                  photo={selectedPhoto}
                  preferFullSize
                  alt={getPhotoLabel(selectedPhoto, selectedIndex)}
                  className={`report-photo-viewer__image report-photo-viewer__image--${viewMode}`}
                />
              </div>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div className="small text-body-secondary">
                  {selectedPhoto.fileName || `Photo ${selectedIndex + 1}`}
                </div>
                <div className="btn-group" role="group" aria-label="Photo size">
                  <CButton
                    type="button"
                    color={viewMode === 'fit' ? 'primary' : 'secondary'}
                    variant={viewMode === 'fit' ? undefined : 'outline'}
                    size="sm"
                    aria-label="Fit photo to viewer"
                    aria-pressed={viewMode === 'fit'}
                    onClick={() => setViewMode('fit')}
                  >
                    Fit
                  </CButton>
                  <CButton
                    type="button"
                    color={viewMode === 'original' ? 'primary' : 'secondary'}
                    variant={viewMode === 'original' ? undefined : 'outline'}
                    size="sm"
                    aria-label="View photo at original size"
                    aria-pressed={viewMode === 'original'}
                    onClick={() => setViewMode('original')}
                  >
                    100%
                  </CButton>
                </div>
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
