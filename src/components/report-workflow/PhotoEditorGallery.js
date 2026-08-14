import React, { useEffect, useId, useRef, useState } from 'react'
import { CButton, CFormLabel, CFormTextarea } from '@coreui/react'
import { Pencil, Trash2 } from 'lucide-react'
import { PhotoPreview, resolvePhotoLabel } from './ReportViewComponents'

const getPhotoIdentity = (photo, index) =>
  String(photo?.id || photo?.mediaId || photo?.url || photo?.fileName || `photo-${index}`)

const pluralizePhotos = (count) => `${count} ${count === 1 ? 'photo' : 'photos'}`

const PhotoEditorGallery = ({
  photos,
  onRemove,
  onChangeDescription,
  onApplyCaption,
  captionOptions = [],
  descriptionMaxLength,
  emptyMessage = 'No photos yet. Upload photos to continue.',
  showDescriptionInput = true,
  className = '',
  contextLabel = 'Photo',
}) => {
  const galleryId = useId().replace(/:/g, '')
  const [editingPhotoId, setEditingPhotoId] = useState('')
  const editButtonRefs = useRef(new Map())
  const descriptionRefs = useRef(new Map())
  const visiblePhotos = (Array.isArray(photos) ? photos : []).filter(Boolean)
  const photoEntries = visiblePhotos.map((photo, index) => ({
    photo,
    index,
    identity: `${getPhotoIdentity(photo, index)}:${index}`,
  }))

  useEffect(() => {
    if (!editingPhotoId) return
    descriptionRefs.current.get(editingPhotoId)?.focus({ preventScroll: true })
  }, [editingPhotoId])

  if (!visiblePhotos.length) {
    const message = String(emptyMessage || '').trim()
    return message ? <div className="text-body-secondary">{message}</div> : null
  }

  return (
    <div
      className={['photo-editor-gallery d-grid', className].filter(Boolean).join(' ')}
      role="list"
      aria-label={`${pluralizePhotos(visiblePhotos.length)} attached`}
    >
      {photoEntries.map(({ photo, index, identity }) => {
        const positionLabel = `Photo ${index + 1} of ${visiblePhotos.length}`
        const description = String(photo?.description || '')
        const hasDescription = description.trim() !== ''
        const isEditingDescription = editingPhotoId === identity
        const descriptionId = `${galleryId}-description-${index + 1}`

        return (
          <section key={identity} className="photo-editor-gallery__item" role="listitem">
            <div className="photo-editor-gallery__header">
              <div className="photo-editor-gallery__title-group">
                <div className="fw-semibold">{positionLabel}</div>
                {hasDescription && !isEditingDescription ? (
                  <div className="photo-editor-gallery__description-state small text-success">
                    Description added
                  </div>
                ) : null}
              </div>
              <div className="photo-editor-gallery__actions">
                {showDescriptionInput && typeof onChangeDescription === 'function' ? (
                  <CButton
                    ref={(element) => {
                      if (element) editButtonRefs.current.set(identity, element)
                      else editButtonRefs.current.delete(identity)
                    }}
                    type="button"
                    color="secondary"
                    variant="ghost"
                    className="photo-editor-gallery__icon-action"
                    aria-label={`Edit description for Photo ${index + 1}`}
                    aria-expanded={isEditingDescription}
                    aria-controls={isEditingDescription ? descriptionId : undefined}
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
                    className="photo-editor-gallery__icon-action"
                    aria-label={`Remove Photo ${index + 1}`}
                    onClick={() => {
                      if (editingPhotoId === identity) setEditingPhotoId('')
                      onRemove(photo, index)
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
                className="photo-editor-gallery__description-editor d-grid gap-2"
              >
                <CFormLabel htmlFor={`${descriptionId}-input`} className="small fw-semibold mb-0">
                  Description for Photo {index + 1}
                </CFormLabel>
                <CFormTextarea
                  ref={(element) => {
                    if (element) descriptionRefs.current.set(identity, element)
                    else descriptionRefs.current.delete(identity)
                  }}
                  id={`${descriptionId}-input`}
                  rows={3}
                  maxLength={descriptionMaxLength}
                  value={description}
                  placeholder="Describe what this photo shows"
                  onChange={(event) => onChangeDescription(photo, event.target.value, index)}
                />
                {captionOptions.length > 0 && typeof onApplyCaption === 'function' ? (
                  <div className="photo-editor-gallery__caption-options d-flex flex-wrap">
                    {captionOptions.map((caption) => (
                      <button
                        key={caption}
                        type="button"
                        className="photo-editor-gallery__caption-option btn btn-sm btn-light"
                        onClick={() => onApplyCaption(photo, caption, index)}
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
              alt={resolvePhotoLabel({ photo, index, contextLabel })}
              className="workflow-photo-preview--uncropped photo-editor-gallery__preview"
            />
          </section>
        )
      })}
    </div>
  )
}

export default PhotoEditorGallery
