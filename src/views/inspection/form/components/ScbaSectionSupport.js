import React, { useState } from 'react'
import { CButton, CCard, CCardBody, CCardHeader, CFormLabel, CFormTextarea } from '@coreui/react'
import { Camera, MessageSquare, Trash2 } from 'lucide-react'
import CreateActionButton from 'src/components/CreateActionButton'
import { buildPhotoViewerUploadOptions } from '../inspectionPhotoFlow'
import { InspectionPhotoEvidenceSummary } from './InspectionDisplayShared'

export const getScbaDisplayLabel = (row = {}) => {
  const serialNo = String(row.serialNo || '').trim()
  const brand = String(row.brand || '').trim()
  if (brand && serialNo) return `${brand} ${serialNo}`
  return serialNo || brand || 'SCBA item'
}

export const ScbaAdditionalInfo = ({
  sectionKey,
  row,
  readOnly = false,
  onUpdateGroupedCheck,
  onRequestPhotoUpload,
  onRemovePhoto,
  onChangePhotoDescription,
  onApplyPhotoCaption,
  setPhotoViewer,
}) => {
  const [expandedAdditionalRemarks, setExpandedAdditionalRemarks] = useState({})
  const rowId = row.id || `${sectionKey}:${row.serialNo || row.brand || 'scba'}`
  const remarks = String(row.remarks || '').trim()
  const photos = Array.isArray(row.photos) ? row.photos : []
  const showRemarks = readOnly ? remarks : expandedAdditionalRemarks[rowId] || remarks
  const openPhotoViewer = (nextPhotos = photos) =>
    setPhotoViewer?.({
      title: `${getScbaDisplayLabel(row)} - additional photos`,
      photos: nextPhotos,
      readOnly,
      showDescriptionInput: !readOnly,
      onAddMorePhoto: readOnly
        ? undefined
        : (currentPhotos) =>
            onRequestPhotoUpload?.(
              sectionKey,
              row,
              buildPhotoViewerUploadOptions(openPhotoViewer, { currentPhotos }),
            ),
      onRemove: readOnly
        ? undefined
        : (photoId) => onRemovePhoto?.(sectionKey, row, photoId, 'photos'),
      onChangeDescription: readOnly
        ? undefined
        : (photoId, description) =>
            onChangePhotoDescription?.(sectionKey, row, photoId, description, 'photos'),
      onApplyCaption: readOnly
        ? undefined
        : (photoId, caption) => onApplyPhotoCaption?.(sectionKey, row, photoId, caption, 'photos'),
    })

  if (readOnly && !remarks && photos.length === 0) return null

  return (
    <div className="inspection-equipment-additional-info d-grid gap-2">
      <div className="small fw-semibold text-muted">Additional Info (optional)</div>
      {!readOnly ? (
        <div className="inspection-equipment-additional-actions d-flex flex-wrap justify-content-start gap-2">
          {!showRemarks ? (
            <CreateActionButton
              label="Remark"
              className="inspection-compact-action-btn"
              icon={<MessageSquare size={14} />}
              onClick={() =>
                setExpandedAdditionalRemarks((current) => ({
                  ...current,
                  [rowId]: true,
                }))
              }
            />
          ) : null}
          <CreateActionButton
            label="Photo"
            className="inspection-compact-action-btn"
            icon={<Camera size={14} />}
            onClick={() =>
              onRequestPhotoUpload?.(
                sectionKey,
                row,
                buildPhotoViewerUploadOptions(openPhotoViewer, { currentPhotos: photos }),
              )
            }
          />
        </div>
      ) : null}
      {showRemarks ? (
        readOnly ? (
          <div className="small">
            <div className="fw-semibold text-body-secondary">General equipment remarks</div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{remarks}</div>
          </div>
        ) : (
          <div className="d-grid gap-1">
            <div className="d-flex align-items-center justify-content-between gap-2">
              <CFormLabel className="small fw-semibold text-muted mb-0">
                General equipment remarks
              </CFormLabel>
              {remarks ? (
                <CButton
                  type="button"
                  color="danger"
                  variant="outline"
                  size="sm"
                  className="inspection-compact-action-btn d-inline-flex align-items-center gap-1"
                  onClick={() => {
                    onUpdateGroupedCheck?.(sectionKey, row, { remarks: '' })
                    setExpandedAdditionalRemarks((current) => ({
                      ...current,
                      [rowId]: false,
                    }))
                  }}
                >
                  <Trash2 size={13} />
                  Clear
                </CButton>
              ) : null}
            </div>
            <CFormTextarea
              rows={2}
              aria-label="General equipment remarks"
              value={String(row.remarks || '')}
              placeholder="General equipment remarks"
              onChange={(event) =>
                onUpdateGroupedCheck?.(sectionKey, row, { remarks: event.target.value })
              }
            />
            {!remarks ? (
              <CButton
                type="button"
                color="secondary"
                variant="outline"
                size="sm"
                className="inspection-compact-action-btn justify-self-start"
                onClick={() =>
                  setExpandedAdditionalRemarks((current) => ({
                    ...current,
                    [rowId]: false,
                  }))
                }
              >
                Cancel
              </CButton>
            ) : null}
          </div>
        )
      ) : null}
      {photos.length > 0 ? (
        <InspectionPhotoEvidenceSummary
          photos={photos}
          label="View photos"
          onView={() => openPhotoViewer(photos)}
        />
      ) : null}
    </div>
  )
}

export const RemovedScbaCustomSections = ({
  removedCustomSections,
  onRestoreSection,
  onRestoreItem,
}) => {
  if (removedCustomSections.length === 0) return null

  return (
    <CCard className="inspection-hydraulic-card inspection-check-card">
      <CCardHeader className="inspection-hydraulic-card-header">
        <div className="fw-semibold text-muted">Removed custom SCBA items</div>
      </CCardHeader>
      <CCardBody className="d-grid gap-2">
        {removedCustomSections.map((section) => (
          <div key={`removed-${section.key}`} className="border rounded-2 p-2 d-grid gap-2">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
              <div className="small fw-semibold">{section.title}</div>
              {section.removed === true ? (
                <CButton
                  type="button"
                  color="secondary"
                  variant="outline"
                  size="sm"
                  className="inspection-compact-action-btn"
                  onClick={() => onRestoreSection?.(section)}
                >
                  Restore
                </CButton>
              ) : null}
            </div>
            {section.removed !== true && section.removedRows.length > 0 ? (
              <div className="d-grid gap-1">
                {section.removedRows.map((row) => (
                  <div
                    key={`removed-${section.key}-${row.id}`}
                    className="d-flex flex-wrap align-items-center justify-content-between gap-2 small"
                  >
                    <span>{getScbaDisplayLabel(row)}</span>
                    <CButton
                      type="button"
                      color="secondary"
                      variant="outline"
                      size="sm"
                      className="inspection-compact-action-btn"
                      onClick={() => onRestoreItem?.(section.key, row)}
                    >
                      Restore
                    </CButton>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </CCardBody>
    </CCard>
  )
}
