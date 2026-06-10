import React from 'react'
import { CAlert, CBadge, CButton, CCard, CCardBody, CCardHeader, CRow } from '@coreui/react'
import { dedupePhotos } from './inspectionSharedUtils'
import { DetailField, SectionHeading, PhotosGrid } from './components/InspectionViewComponents'

const InspectionDetailSection = ({
  selectedRecord,
  onBack,
  formatDateTime,
  renderStatusBadge,
  onReviewRecord,
  onApproveRecord,
  onRejectRecord,
  onDownloadRecord,
  downloadingId = null,
  isActionBusy = false,
}) => {
  if (!selectedRecord) return <CAlert color="warning">Report not found.</CAlert>

  const r = selectedRecord
  const photos = dedupePhotos(r.photos)
  const dateTime = formatDateTime(r.incidentDate || r.reportDate, r.incidentTime || r.reportTime)
  const timeline = Array.isArray(r.timeline) ? r.timeline : []

  const findAction = (name) =>
    timeline.find(
      (entry) =>
        String(entry?.action || '')
          .trim()
          .toLowerCase() === name.toLowerCase(),
    ) || null

  const submittedEntry = findAction('Submitted')
  const reviewedEntry = findAction('Reviewed')
  const approvedEntry = findAction('Approved')
  const rejectedEntry = findAction('Rejected')
  const renderWorkflowActor = (entry) => {
    const actor = String(entry?.by || '').trim() || '--'
    const remarks = String(entry?.remarks || '').trim()
    return (
      <>
        <div>{actor}</div>
        {remarks ? (
          <div className="small text-body-secondary mt-1" style={{ whiteSpace: 'pre-wrap' }}>
            Remarks: {remarks}
          </div>
        ) : null}
      </>
    )
  }

  return (
    <CCard>
      <CCardHeader>
        <strong>{r.displayId}</strong>
      </CCardHeader>
      <CCardBody>
        <div className="d-grid gap-4">
          <CRow className="g-3">
            <DetailField label="Status">
              {typeof renderStatusBadge === 'function' ? (
                renderStatusBadge(r.status || 'Unknown')
              ) : (
                <CBadge color="secondary">{r.status || 'Unknown'}</CBadge>
              )}
            </DetailField>
            <DetailField label="Submitted By">
              {r.submittedBy || submittedEntry?.by || '--'}
            </DetailField>
            <DetailField label="Submitted At">{r.submittedAt || dateTime || '--'}</DetailField>
            <DetailField label="Inspection Type">{r.incidentType || '--'}</DetailField>
            <DetailField label="Location" xs={12} md={8}>
              {r.location || '--'}
            </DetailField>
          </CRow>

          {String(r.description || '').trim() ? (
            <div>
              <div className="small text-body-secondary">Inspection Summary</div>
              <div className="fw-semibold">{r.description}</div>
            </div>
          ) : null}

          {submittedEntry || reviewedEntry || approvedEntry || rejectedEntry ? (
            <div className="d-grid gap-2">
              <SectionHeading>Workflow Activity</SectionHeading>
              <CRow className="g-3">
                {submittedEntry ? (
                  <DetailField label="Submitted By" xs={12} md={4}>
                    {renderWorkflowActor(submittedEntry)}
                  </DetailField>
                ) : null}
                {reviewedEntry ? (
                  <DetailField label="Reviewed By" xs={12} md={4}>
                    {renderWorkflowActor(reviewedEntry)}
                  </DetailField>
                ) : null}
                {approvedEntry ? (
                  <DetailField label="Approved By" xs={12} md={4}>
                    {renderWorkflowActor(approvedEntry)}
                  </DetailField>
                ) : null}
                {rejectedEntry ? (
                  <DetailField label="Rejected By" xs={12} md={4}>
                    {renderWorkflowActor(rejectedEntry)}
                  </DetailField>
                ) : null}
              </CRow>
            </div>
          ) : null}

          <PhotosGrid photos={photos} />

          <div className="d-flex flex-column flex-sm-row flex-wrap gap-2 justify-content-end">
            <CButton color="light" onClick={onBack}>
              Back to records
            </CButton>
            <CButton
              color="secondary"
              variant="outline"
              disabled={Boolean(downloadingId)}
              onClick={() => onDownloadRecord?.(r.id)}
            >
              {downloadingId === r.id ? 'Generating...' : 'Download'}
            </CButton>
            {String(r.status || '').trim() === 'Submitted' ? (
              <CButton
                color="info"
                variant="outline"
                disabled={isActionBusy}
                onClick={() => onReviewRecord?.(r)}
              >
                Review
              </CButton>
            ) : null}
            {String(r.status || '').trim() === 'Reviewed' ? (
              <>
                <CButton
                  color="success"
                  variant="outline"
                  disabled={isActionBusy}
                  onClick={() => onApproveRecord?.(r)}
                >
                  Approve
                </CButton>
                <CButton
                  color="danger"
                  variant="outline"
                  disabled={isActionBusy}
                  onClick={() => onRejectRecord?.(r)}
                >
                  Reject
                </CButton>
              </>
            ) : null}
          </div>
        </div>
      </CCardBody>
    </CCard>
  )
}

export default InspectionDetailSection
