import React from 'react'
import { CAlert, CBadge, CButton, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import { dedupePhotos } from './inspectionSharedUtils'
import { DetailField, PhotosGrid } from './components/InspectionViewComponents'

const InspectionReviewSection = ({
  selectedRecord,
  renderStatusBadge,
  reviewActions = null,
  isSubmittingReview = false,
}) => {
  if (!selectedRecord) {
    return (
      <CAlert color="warning">Review data is unavailable. Return to edit and try again.</CAlert>
    )
  }

  const r = selectedRecord
  const photos = dedupePhotos(r.photos)
  const submittedAt = String(r.submittedAt || '').trim()
  const submittedBy = String(r.submittedBy || '').trim()

  return (
    <CCard>
      <CCardHeader>
        <strong>{r.displayId}</strong>
      </CCardHeader>
      <CCardBody>
        <CRow className="g-4">
          <CCol xs={12}>
            <CRow className="g-3">
              <DetailField label="Status" xs={12} md={4}>
                {typeof renderStatusBadge === 'function' ? (
                  renderStatusBadge(r.status)
                ) : (
                  <CBadge color="secondary">{r.status || 'Unknown'}</CBadge>
                )}
              </DetailField>
              <DetailField label="Location" xs={12} md={4}>
                {r.location || '--'}
              </DetailField>
              <DetailField label="Inspection Type" xs={12} md={4}>
                {r.incidentType || '--'}
              </DetailField>
            </CRow>
          </CCol>

          {submittedBy || submittedAt ? (
            <CCol xs={12}>
              <CRow className="g-3">
                {submittedBy ? (
                  <DetailField label="Submitted By" xs={12} md={6}>
                    {submittedBy}
                  </DetailField>
                ) : null}
                {submittedAt ? (
                  <DetailField label="Submitted At" xs={12} md={6}>
                    {submittedAt}
                  </DetailField>
                ) : null}
              </CRow>
            </CCol>
          ) : null}

          <CCol xs={12}>
            {String(r.description || '').trim() ? (
              <div>
                <div className="small text-body-secondary">Description</div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{r.description}</div>
              </div>
            ) : (
              <div className="text-body-secondary small">No description provided.</div>
            )}
          </CCol>

          <CCol xs={12}>
            <PhotosGrid photos={photos} />
          </CCol>

          <CCol xs={12}>
            <CRow className="g-2 justify-content-end">
              <CCol xs="auto">
                <CButton color="light" onClick={() => reviewActions?.onBackToEdit?.()}>
                  Back to Edit
                </CButton>
              </CCol>
              <CCol xs="auto">
                <CButton color="secondary" onClick={() => reviewActions?.onSaveDraft?.()}>
                  Save Draft
                </CButton>
              </CCol>
              <CCol xs="auto">
                <CButton
                  color="primary"
                  disabled={isSubmittingReview}
                  onClick={() => reviewActions?.onConfirm?.()}
                >
                  {reviewActions?.confirmLabel || 'Confirm Submit'}
                </CButton>
              </CCol>
            </CRow>
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>
  )
}

export default InspectionReviewSection
