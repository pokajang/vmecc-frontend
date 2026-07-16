import React, { useMemo } from 'react'
import {
  CAlert,
  CButton,
  CCol,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
} from '@coreui/react'
import { formatDateTime } from 'src/utils/users'
import { knowledgeMetadata, renderStatusBadges } from './helpers'

const AiHelperKnowledgeReviewModal = ({
  detailError = null,
  detailLoading = false,
  entryStatus = 'active',
  onClose = () => {},
  onDelete = () => {},
  onEntryStatusChange = () => {},
  onReviewNoteChange = () => {},
  onReviewStatusChange = () => {},
  onSave = () => {},
  reviewNote = '',
  reviewStatus = 'pending',
  saving = false,
  selected = null,
}) => {
  const metadata = useMemo(() => knowledgeMetadata(selected), [selected])
  const isStatusLocked = ['processing', 'failed'].includes(selected?.status)

  return (
    <CModal size="xl" scrollable visible={Boolean(selected) || detailLoading} onClose={onClose}>
      <CModalHeader onClose={onClose}>
        <CModalTitle>{selected?.title || 'Ask AI knowledge review'}</CModalTitle>
      </CModalHeader>
      <CModalBody>
        {detailLoading ? (
          <div className="text-body-secondary py-4">Loading knowledge details...</div>
        ) : selected ? (
          <>
            {detailError ? <CAlert color="danger">{detailError}</CAlert> : null}

            <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
              <div>
                <div className="small text-body-secondary mb-1">{metadata.fileName}</div>
                <div className="d-flex flex-wrap align-items-center gap-2">
                  {renderStatusBadges(selected)}
                </div>
              </div>
            </div>
            <CAlert color="info">
              Markdown content is private application knowledge. Only metadata and review controls
              are shown here.
            </CAlert>
            <CRow className="g-3 mb-4">
              <CCol md={4}>
                <div className="small text-body-secondary">Uploader</div>
                <div>{metadata.uploaderLabel}</div>
              </CCol>
              <CCol md={4}>
                <div className="small text-body-secondary">Scope</div>
                <div>{metadata.scopeValue}</div>
              </CCol>
              <CCol md={4}>
                <div className="small text-body-secondary">Visibility</div>
                <div>{metadata.visibilityLabel}</div>
              </CCol>
              <CCol md={4}>
                <div className="small text-body-secondary">Uploaded</div>
                <div>{formatDateTime(selected.created_at)}</div>
              </CCol>
              <CCol md={4}>
                <div className="small text-body-secondary">File size</div>
                <div>{metadata.fileSizeLabel}</div>
              </CCol>
              <CCol md={4}>
                <div className="small text-body-secondary">Scope type</div>
                <div>{metadata.scopeLabel}</div>
              </CCol>
            </CRow>

            <section>
              <h6 className="mb-3">Review controls</h6>
              <CRow className="g-3">
                <CCol md={4}>
                  <CFormLabel htmlFor="ai-helper-knowledge-review-status">Review</CFormLabel>
                  <CFormSelect
                    id="ai-helper-knowledge-review-status"
                    value={reviewStatus}
                    onChange={(event) => onReviewStatusChange(event.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </CFormSelect>
                </CCol>
                <CCol md={4}>
                  <CFormLabel htmlFor="ai-helper-knowledge-entry-status">Use status</CFormLabel>
                  <CFormSelect
                    id="ai-helper-knowledge-entry-status"
                    value={entryStatus}
                    onChange={(event) => onEntryStatusChange(event.target.value)}
                    disabled={isStatusLocked}
                  >
                    <option value="active">Enabled</option>
                    <option value="disabled">Disabled</option>
                  </CFormSelect>
                </CCol>
                <CCol md={12}>
                  <CFormLabel htmlFor="ai-helper-knowledge-review-note">Review note</CFormLabel>
                  <CFormTextarea
                    id="ai-helper-knowledge-review-note"
                    value={reviewNote}
                    onChange={(event) => onReviewNoteChange(event.target.value)}
                    rows={4}
                    maxLength={2000}
                    placeholder="Required context for rejection, optional for approval"
                  />
                </CCol>
              </CRow>
            </section>
          </>
        ) : null}
      </CModalBody>
      <CModalFooter>
        <CButton color="danger" variant="outline" onClick={onDelete} disabled={!selected || saving}>
          Delete
        </CButton>
        <CButton color="secondary" variant="outline" onClick={onClose} disabled={saving}>
          Close
        </CButton>
        <CButton color="primary" onClick={onSave} disabled={!selected || saving}>
          {saving ? 'Saving...' : 'Save'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default AiHelperKnowledgeReviewModal
