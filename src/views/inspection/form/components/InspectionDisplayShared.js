import React, { useState } from 'react'
import {
  CButton,
  CFormInput,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import { Camera, Trash2 } from 'lucide-react'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import PhotoEditorGallery from 'src/components/report-workflow/PhotoEditorGallery'
import {
  PhotoPreview,
  resolvePhotoLabel,
} from 'src/components/report-workflow/ReportViewComponents'
import useMediaQuery from 'src/hooks/useMediaQuery'
import { dedupePhotos } from 'src/views/inspection/inspectionSharedUtils'
import {
  appendInspectionText,
  INSPECTION_PHOTO_CAPTION_CHIPS,
} from 'src/views/inspection/inspectionFormHelpers'
import InspectionFieldError from './patterns/InspectionFieldError'

export const FormFieldError = InspectionFieldError

export const ChipButton = ({ children, onClick, className = '' }) => (
  <button
    type="button"
    className={`inspection-helper-chip btn btn-sm btn-light border ${className}`.trim()}
    onClick={onClick}
  >
    {children}
  </button>
)

export const ChipRow = ({ children, className = '' }) => (
  <div className={`inspection-helper-chip-row d-flex flex-wrap gap-2 ${className}`.trim()}>
    {children}
  </div>
)

export const PhotoGallery = ({
  photos,
  onRemove,
  onChangeDescription,
  onApplyCaption,
  emptyMessage = 'No photos yet. Upload photos to continue.',
  readOnly = false,
  showDescriptionInput = true,
  fullWidth = false,
  showCaptionChips = true,
  presentation = 'default',
  contextLabel = 'Inspection evidence photo',
}) => {
  if (presentation === 'drawer-editor' && !readOnly) {
    return (
      <PhotoEditorGallery
        photos={photos}
        onRemove={onRemove ? (photo) => onRemove(photo.id) : undefined}
        onChangeDescription={
          onChangeDescription
            ? (photo, description) => onChangeDescription(photo.id, description)
            : undefined
        }
        onApplyCaption={
          onApplyCaption ? (photo, caption) => onApplyCaption(photo.id, caption) : undefined
        }
        captionOptions={showCaptionChips ? INSPECTION_PHOTO_CAPTION_CHIPS : []}
        emptyMessage={emptyMessage}
        showDescriptionInput={showDescriptionInput}
      />
    )
  }

  const visiblePhotos = dedupePhotos(photos)
  if (!visiblePhotos.length) {
    const message = String(emptyMessage || '').trim()
    return message ? <div className="text-body-secondary">{message}</div> : null
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: fullWidth ? '1fr' : 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '0.75rem',
      }}
    >
      {visiblePhotos.map((photo, index) => {
        const photoLabel = resolvePhotoLabel({ photo, index, contextLabel })

        return (
          <div
            key={photo.id || `${photo.fileName || 'photo'}-${index}`}
            className={`inspection-photo-gallery__item${readOnly ? ' inspection-photo-gallery__item--read-only' : ''} d-grid gap-2`}
          >
            <PhotoPreview
              photo={photo}
              alt={photoLabel}
              className="workflow-photo-preview--uncropped"
            />
            {readOnly ? (
              String(photo?.description || '').trim() ? (
                <div className="small text-body-secondary" style={{ whiteSpace: 'pre-wrap' }}>
                  {photo.description}
                </div>
              ) : null
            ) : (
              <>
                {showDescriptionInput ? (
                  <div className="d-grid gap-2">
                    <CFormTextarea
                      rows={2}
                      aria-label="Photo description"
                      value={String(photo?.description || '')}
                      placeholder="Describe this photo"
                      onChange={(event) => onChangeDescription?.(photo.id, event.target.value)}
                    />
                    {showCaptionChips && onApplyCaption ? (
                      <ChipRow className="inspection-photo-caption-chips">
                        {INSPECTION_PHOTO_CAPTION_CHIPS.map((caption) => (
                          <ChipButton
                            key={caption}
                            onClick={() => onApplyCaption(photo.id, caption)}
                          >
                            {caption}
                          </ChipButton>
                        ))}
                      </ChipRow>
                    ) : null}
                  </div>
                ) : null}
                {onRemove ? (
                  <CButton
                    type="button"
                    color="danger"
                    variant="outline"
                    size="sm"
                    className="d-inline-flex align-items-center justify-content-center gap-1"
                    onClick={() => onRemove(photo.id)}
                  >
                    <Trash2 size={14} />
                    Remove
                  </CButton>
                ) : null}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

export const InspectionPhotoActionRow = ({
  photos,
  onView,
  onAddPhoto,
  readOnly = false,
  addLabel = 'Add photo (optional)',
}) => {
  const visiblePhotos = dedupePhotos(photos)
  const count = visiblePhotos.length
  if (readOnly && count === 0) return null

  return (
    <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
      {count > 0 ? (
        <CButton
          type="button"
          color="secondary"
          variant="outline"
          size="sm"
          className="inspection-compact-action-btn"
          aria-label="View photos"
          onClick={onView}
          disabled={!onView}
        >
          View photos ({count})
        </CButton>
      ) : (
        <span className="small text-body-secondary">No photos added</span>
      )}
      {!readOnly ? (
        <CButton
          type="button"
          color="secondary"
          variant="outline"
          size="sm"
          className="inspection-compact-action-btn d-inline-flex align-items-center gap-1"
          onClick={onAddPhoto}
          disabled={!onAddPhoto}
        >
          <Camera size={13} aria-hidden="true" />
          {addLabel}
        </CButton>
      ) : null}
    </div>
  )
}

export const InspectionPhotoEvidenceSummary = ({
  photos,
  onView,
  readOnly = false,
  label = 'View photos',
}) => {
  const visiblePhotos = dedupePhotos(photos)
  if (!visiblePhotos.length) return null

  return (
    <div className="rounded-3 border bg-light-subtle p-2 d-flex flex-wrap align-items-center justify-content-between gap-2">
      <div className="small text-body-secondary">
        {visiblePhotos.length} photo{visiblePhotos.length === 1 ? '' : 's'} added
      </div>
      <CButton
        type="button"
        color="secondary"
        variant="outline"
        size="sm"
        className="inspection-compact-action-btn"
        onClick={onView}
        disabled={!onView}
      >
        {readOnly ? 'View photos' : label}
      </CButton>
    </div>
  )
}

const InspectionPhotoViewerModalContent = ({ viewer, onClose }) => {
  const [visiblePhotos, setVisiblePhotos] = useState(() => dedupePhotos(viewer?.photos))
  const useMobileDrawer = useMediaQuery('(max-width: 575.98px)')

  const removePhoto = (photoId) => {
    viewer?.onRemove?.(photoId)
    setVisiblePhotos((currentPhotos) =>
      currentPhotos.filter((photo) => String(photo.id || '') !== String(photoId || '')),
    )
  }

  const updatePhotoDescription = (photoId, description) => {
    viewer?.onChangeDescription?.(photoId, description)
    setVisiblePhotos((currentPhotos) =>
      currentPhotos.map((photo) =>
        String(photo.id || '') === String(photoId || '') ? { ...photo, description } : photo,
      ),
    )
  }

  const applyPhotoCaption = (photoId, caption) => {
    viewer?.onApplyCaption?.(photoId, caption)
    setVisiblePhotos((currentPhotos) =>
      currentPhotos.map((photo) =>
        String(photo.id || '') === String(photoId || '')
          ? { ...photo, description: appendInspectionText(photo.description, caption) }
          : photo,
      ),
    )
  }

  const handleAddMorePhoto = () => {
    viewer?.onAddMorePhoto?.(visiblePhotos)
  }

  const handleSave = () => {
    viewer?.onSave?.(visiblePhotos)
    onClose?.()
  }

  const body = (
    <>
      <div className="small text-body-secondary">
        {visiblePhotos.length} photo{visiblePhotos.length === 1 ? '' : 's'}
      </div>
      <PhotoGallery
        photos={visiblePhotos}
        readOnly={viewer?.readOnly === true}
        presentation={useMobileDrawer && viewer?.readOnly !== true ? 'drawer-editor' : 'default'}
        showDescriptionInput={viewer?.showDescriptionInput !== false}
        fullWidth
        showCaptionChips={viewer?.showCaptionChips === true}
        onRemove={viewer?.onRemove ? removePhoto : undefined}
        onChangeDescription={viewer?.onChangeDescription ? updatePhotoDescription : undefined}
        onApplyCaption={viewer?.onApplyCaption ? applyPhotoCaption : undefined}
        emptyMessage="No photos added."
      />
      {viewer?.readOnly === true ? null : (
        <div className="d-flex justify-content-end gap-2">
          {viewer?.onAddMorePhoto ? (
            <CButton
              type="button"
              color="secondary"
              variant="outline"
              size="sm"
              className="inspection-compact-action-btn d-inline-flex align-items-center gap-1"
              onClick={handleAddMorePhoto}
            >
              <Camera size={13} aria-hidden="true" />
              Add more photo
            </CButton>
          ) : null}
        </div>
      )}
    </>
  )

  const footer =
    viewer?.readOnly === true ? null : (
      <div className="mobile-bottom-drawer__footer d-flex align-items-center justify-content-end gap-2">
        <CButton type="button" color="secondary" variant="outline" onClick={onClose}>
          Cancel
        </CButton>
        <CButton type="button" color="primary" onClick={handleSave}>
          Save
        </CButton>
      </div>
    )

  if (useMobileDrawer) {
    return (
      <MobileBottomDrawer
        visible
        title={viewer?.title || 'Photos'}
        bodyClassName="inspection-equipment-detail-drawer-shell"
        onClose={onClose}
      >
        <div className="inspection-mobile-detail-drawer-body inspection-equipment-detail-drawer-body d-grid">
          {body}
        </div>
        {footer}
      </MobileBottomDrawer>
    )
  }

  return (
    <CModal visible onClose={onClose} size="lg" scrollable>
      <CModalHeader onClose={onClose}>
        <CModalTitle>{viewer?.title || 'Photos'}</CModalTitle>
      </CModalHeader>
      <CModalBody className="d-grid gap-3">{body}</CModalBody>
      {footer ? <CModalFooter>{footer}</CModalFooter> : null}
    </CModal>
  )
}

export const InspectionPhotoViewerModal = ({ viewer, onClose }) => {
  if (!viewer) return null
  const viewerKey = dedupePhotos(viewer?.photos)
    .map((photo) => String(photo?.id || photo?.url || photo?.fileName || ''))
    .join('|')

  return (
    <InspectionPhotoViewerModalContent
      key={`${viewer?.title || 'photos'}:${viewerKey}`}
      viewer={viewer}
      onClose={onClose}
    />
  )
}

export const EvidenceBlock = ({
  title,
  remarks = '',
  photos = [],
  readOnly = false,
  children = null,
  onViewPhotos,
}) => {
  const visiblePhotos = dedupePhotos(photos)
  const hasRemarks = String(remarks || '').trim() !== ''
  if (readOnly && !hasRemarks && visiblePhotos.length === 0 && !children) return null

  return (
    <div className="inspection-hydraulic-defect-evidence rounded-3 border bg-light-subtle p-2 d-grid gap-2">
      {title ? <div className="small fw-semibold text-body-secondary">{title}</div> : null}
      {hasRemarks ? (
        <div className="small" style={{ whiteSpace: 'pre-wrap' }}>
          {remarks}
        </div>
      ) : null}
      {children}
      {visiblePhotos.length > 0 ? (
        <InspectionPhotoEvidenceSummary
          photos={visiblePhotos}
          readOnly={readOnly}
          onView={onViewPhotos}
        />
      ) : null}
    </div>
  )
}

const normalizeSearchText = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

export const isCompactInspectionViewport = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(max-width: 575.98px)').matches

export const rowContainsSearch = (row = {}, fields = [], search = '') => {
  const query = normalizeSearchText(search)
  if (!query) return true
  const haystack = fields.map((field) => row?.[field]).join(' ')
  return normalizeSearchText(haystack).includes(query)
}

export const ManagedCheckToolbar = ({
  search,
  onSearch,
  searchPlaceholder,
  searchLabel,
  searchDisabled = false,
  onClearSearch,
  clearSearchLabel = 'Clear inspection search',
  onNextIncomplete,
  onExpandAll,
  onCollapseAll,
  resultCount,
  totalCount,
  idleStatus = '',
  readOnly = false,
}) => {
  if (readOnly) return null

  return (
    <div className="inspection-check-toolbar">
      <CFormInput
        size="sm"
        className="inspection-search-input"
        aria-label={searchLabel || searchPlaceholder || 'Search inspection checks'}
        value={search}
        placeholder={searchPlaceholder}
        disabled={searchDisabled}
        onChange={(event) => onSearch?.(event.target.value)}
      />
      <div className="inspection-check-toolbar__actions">
        {search && onClearSearch ? (
          <CButton
            type="button"
            color="secondary"
            variant="outline"
            size="sm"
            className="inspection-compact-action-btn"
            aria-label={clearSearchLabel}
            onClick={onClearSearch}
          >
            Clear
          </CButton>
        ) : null}
        {onNextIncomplete ? (
          <CButton
            type="button"
            color="secondary"
            variant="outline"
            size="sm"
            className="inspection-compact-action-btn"
            onClick={onNextIncomplete}
          >
            Next incomplete
          </CButton>
        ) : null}
        {onExpandAll ? (
          <CButton
            type="button"
            color="secondary"
            variant="outline"
            size="sm"
            className="inspection-compact-action-btn"
            onClick={onExpandAll}
          >
            Expand all
          </CButton>
        ) : null}
        {onCollapseAll ? (
          <CButton
            type="button"
            color="secondary"
            variant="outline"
            size="sm"
            className="inspection-compact-action-btn"
            onClick={onCollapseAll}
          >
            Collapse all
          </CButton>
        ) : null}
      </div>
      {search ? (
        <div className="small text-body-secondary">
          Showing {resultCount} of {totalCount}
        </div>
      ) : idleStatus ? (
        <div className="small text-body-secondary">{idleStatus}</div>
      ) : null}
    </div>
  )
}
