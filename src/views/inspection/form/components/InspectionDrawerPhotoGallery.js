import React, { useId, useRef, useState } from 'react'
import { CButton, CFormLabel, CFormTextarea } from '@coreui/react'
import { Pencil, Trash2 } from 'lucide-react'
import { PhotoPreview } from 'src/components/report-workflow/ReportViewComponents'
import { dedupePhotos } from 'src/views/inspection/inspectionSharedUtils'

const photoIdentity = (photo, index) =>
  String(photo?.id || photo?.mediaId || photo?.url || photo?.fileName || `photo-${index}`)

const pluralizePhotos = (count) => `${count} ${count === 1 ? 'photo' : 'photos'}`

const InspectionDrawerPhotoGallery = ({
  photos,
  onRemove,
  onChangeDescription,
  onApplyCaption,
  captionOptions = [],
  emptyMessage = 'No photos yet. Upload photos to continue.',
  showDescriptionInput = true,
}) => {
  const galleryId = useId().replace(/:/g, '')
  const [editingPhotoId, setEditingPhotoId] = useState('')
  const editButtonRefs = useRef(new Map())
  const visiblePhotos = dedupePhotos(photos)

  if (!visiblePhotos.length) {
    const message = String(emptyMessage || '').trim()
    return message ? <div className="text-body-secondary">{message}</div> : null
  }

  return (
    <div
      className="inspection-drawer-photo-gallery d-grid gap-4"
      aria-label={`${pluralizePhotos(visiblePhotos.length)} attached`}
    >
      {visiblePhotos.map((photo, index) => {
        const identity = photoIdentity(photo, index)
        const positionLabel = `Photo ${index + 1} of ${visiblePhotos.length}`
        const description = String(photo?.description || '')
        const hasDescription = description.trim() !== ''
        const isEditingDescription = editingPhotoId === identity
        const descriptionId = `${galleryId}-description-${index + 1}`

        return (
          <section key={identity} className="inspection-drawer-photo">
            <div className="inspection-drawer-photo__header">
              <div className="inspection-drawer-photo__title-group">
                <div className="fw-semibold">{positionLabel}</div>
                {photo?.fileName ? (
                  <div className="small text-body-secondary text-truncate">{photo.fileName}</div>
                ) : null}
                {hasDescription && !isEditingDescription ? (
                  <div className="inspection-drawer-photo__description-state small text-success">
                    Description added
                  </div>
                ) : null}
              </div>
              <div className="inspection-drawer-photo__actions">
                {showDescriptionInput && typeof onChangeDescription === 'function' ? (
                  <CButton
                    ref={(element) => {
                      if (element) editButtonRefs.current.set(identity, element)
                      else editButtonRefs.current.delete(identity)
                    }}
                    type="button"
                    color="secondary"
                    variant="ghost"
                    className="inspection-drawer-photo__icon-action"
                    aria-label={`Edit description for Photo ${index + 1}`}
                    aria-expanded={isEditingDescription}
                    aria-controls={descriptionId}
                    onClick={() =>
                      setEditingPhotoId((current) => (current === identity ? '' : identity))
                    }
                  >
                    <Pencil size={17} aria-hidden="true" />
                  </CButton>
                ) : null}
                {typeof onRemove === 'function' ? (
                  <CButton
                    type="button"
                    color="danger"
                    variant="ghost"
                    className="inspection-drawer-photo__icon-action"
                    aria-label={`Remove Photo ${index + 1}`}
                    onClick={() => {
                      if (editingPhotoId === identity) setEditingPhotoId('')
                      onRemove(photo.id)
                    }}
                  >
                    <Trash2 size={17} aria-hidden="true" />
                  </CButton>
                ) : null}
              </div>
            </div>

            {isEditingDescription ? (
              <div
                id={descriptionId}
                className="inspection-drawer-photo__description-editor d-grid gap-2"
              >
                <CFormLabel htmlFor={`${descriptionId}-input`} className="small fw-semibold mb-0">
                  Description for Photo {index + 1}
                </CFormLabel>
                <CFormTextarea
                  id={`${descriptionId}-input`}
                  rows={3}
                  value={description}
                  placeholder="Describe what this photo shows"
                  onChange={(event) => onChangeDescription(photo.id, event.target.value)}
                />
                {captionOptions.length > 0 && typeof onApplyCaption === 'function' ? (
                  <div className="inspection-photo-caption-chips d-flex flex-wrap gap-2">
                    {captionOptions.map((caption) => (
                      <button
                        key={caption}
                        type="button"
                        className="inspection-helper-chip btn btn-sm btn-light border"
                        onClick={() => onApplyCaption(photo.id, caption)}
                      >
                        {caption}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="d-flex justify-content-end">
                  <CButton
                    type="button"
                    color="secondary"
                    variant="outline"
                    size="sm"
                    aria-label={`Done editing description for Photo ${index + 1}`}
                    onClick={() => {
                      setEditingPhotoId('')
                      editButtonRefs.current.get(identity)?.focus({ preventScroll: true })
                    }}
                  >
                    Done
                  </CButton>
                </div>
              </div>
            ) : null}

            <PhotoPreview
              photo={photo}
              preferFullSize
              alt={`${positionLabel}${photo?.fileName ? `: ${photo.fileName}` : ''}`}
              className="workflow-photo-preview--uncropped inspection-drawer-photo__preview"
            />
          </section>
        )
      })}
    </div>
  )
}

export default InspectionDrawerPhotoGallery
