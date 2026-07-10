import React, { useState } from 'react'
import { CButton, CFormLabel, CFormTextarea } from '@coreui/react'
import { Camera, MessageSquare, Trash2 } from 'lucide-react'
import CreateActionButton from 'src/components/CreateActionButton'
import { InspectionPhotoEvidenceSummary } from './InspectionDisplayShared'

const text = (value) => String(value || '').trim()

const InspectionItemAdditionalInfo = ({
  row,
  readOnly = false,
  remarksKey = 'remarks',
  photosKey = 'photos',
  title = 'Additional Info (optional)',
  remarksTitle = 'General equipment remarks',
  remarksPlaceholder = 'General equipment remarks',
  photoTitle,
  setPhotoViewer,
  onUpdateCheck,
  onRequestPhotoUpload,
  onRemovePhoto,
  onChangePhotoDescription,
  onApplyPhotoCaption,
}) => {
  const [expanded, setExpanded] = useState(false)
  const rowId = text(row?.id || row?.equipment || row?.serialNo || row?.rowNumber || 'row')
  const remarks = String(row?.[remarksKey] || '')
  const hasRemarks = text(remarks) !== ''
  const photos = Array.isArray(row?.[photosKey]) ? row[photosKey] : []
  const showRemarks = readOnly ? hasRemarks : expanded || hasRemarks

  if (readOnly && !hasRemarks && photos.length === 0) return null

  return (
    <div className="inspection-equipment-additional-info d-grid gap-2">
      <div className="small fw-semibold text-muted">{title}</div>
      {!readOnly ? (
        <div className="inspection-equipment-additional-actions d-flex flex-wrap justify-content-start gap-2">
          {!showRemarks ? (
            <CreateActionButton
              label="Remark"
              className="inspection-compact-action-btn"
              icon={<MessageSquare size={13} className="me-1 align-text-bottom" />}
              onClick={() => setExpanded(true)}
            />
          ) : null}
          <CreateActionButton
            label="Photo"
            className="inspection-compact-action-btn"
            icon={<Camera size={13} className="me-1 align-text-bottom" />}
            onClick={() => onRequestPhotoUpload?.(row, photosKey)}
          />
        </div>
      ) : null}
      {showRemarks ? (
        readOnly ? (
          <div className="small">
            <div className="fw-semibold text-body-secondary">{remarksTitle}</div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{remarks}</div>
          </div>
        ) : (
          <div className="d-grid gap-1">
            <div className="d-flex align-items-center justify-content-between gap-2">
              <CFormLabel className="small fw-semibold text-muted mb-0">{remarksTitle}</CFormLabel>
              {hasRemarks ? (
                <CButton
                  type="button"
                  color="danger"
                  variant="outline"
                  size="sm"
                  className="inspection-compact-action-btn d-inline-flex align-items-center gap-1"
                  onClick={() => {
                    onUpdateCheck?.(row, { [remarksKey]: '' })
                    setExpanded(false)
                  }}
                >
                  <Trash2 size={13} />
                  Clear
                </CButton>
              ) : (
                <CButton
                  type="button"
                  color="secondary"
                  variant="outline"
                  size="sm"
                  className="inspection-compact-action-btn"
                  onClick={() => setExpanded(false)}
                >
                  Cancel
                </CButton>
              )}
            </div>
            <CFormTextarea
              rows={2}
              aria-label={remarksPlaceholder || 'Additional remarks'}
              value={remarks}
              placeholder={remarksPlaceholder}
              onChange={(event) => onUpdateCheck?.(row, { [remarksKey]: event.target.value })}
            />
          </div>
        )
      ) : null}
      {photos.length > 0 ? (
        <InspectionPhotoEvidenceSummary
          photos={photos}
          label="View photos"
          readOnly={readOnly}
          onView={() =>
            setPhotoViewer?.({
              title:
                photoTitle ||
                `${row?.equipment || row?.serialNo || rowId || 'Item'} - additional photos`,
              photos,
              readOnly,
              showDescriptionInput: !readOnly,
              onRemove: readOnly
                ? undefined
                : (photoId) => onRemovePhoto?.(row, photoId, photosKey),
              onChangeDescription: readOnly
                ? undefined
                : (photoId, description) =>
                    onChangePhotoDescription?.(row, photoId, description, photosKey),
              onApplyCaption: readOnly
                ? undefined
                : (photoId, caption) => onApplyPhotoCaption?.(row, photoId, caption, photosKey),
            })
          }
        />
      ) : null}
    </div>
  )
}

export default InspectionItemAdditionalInfo
