import React from 'react'
import { CAlert, CBadge, CButton, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'

const DetailField = ({ label, children, xs = 6, md = 4 }) => (
  <CCol xs={xs} md={md}>
    <div className="small text-body-secondary">{label}</div>
    <div>{children}</div>
  </CCol>
)

const SectionHeading = ({ children }) => (
  <div className="fw-semibold border-bottom pb-2 mb-1">{children}</div>
)

const ChronologyRows = ({ chronology }) => {
  const rows = (Array.isArray(chronology) ? chronology : []).filter((r) => r.time || r.action)
  if (rows.length === 0) return null
  return (
    <div className="d-grid gap-2">
      <SectionHeading>Chronology</SectionHeading>
      <div className="rounded-3 border overflow-hidden">
        {rows.map((row, i) => (
          <div
            key={i}
            className={`d-flex gap-3 px-3 py-2${i < rows.length - 1 ? ' border-bottom' : ''}`}
          >
            <div
              className="text-body-secondary flex-shrink-0 text-truncate"
              style={{ width: '52px' }}
            >
              {row.time || '--'}
            </div>
            <div style={{ minWidth: 0 }}>{row.action || '--'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const RespondingTeamRows = ({ respondingTeam }) => {
  if (!respondingTeam) return null
  const attendance = Array.isArray(respondingTeam.attendance) ? respondingTeam.attendance : []
  return (
    <div className="d-grid gap-2">
      <SectionHeading>Responding Team</SectionHeading>
      <CRow className="g-3">
        <DetailField label="Team">{respondingTeam.name || '--'}</DetailField>
        {respondingTeam.shift ? (
          <DetailField label="Shift">{respondingTeam.shift}</DetailField>
        ) : null}
      </CRow>
      {attendance.length > 0 ? (
        <div>
          <div className="small text-body-secondary mb-1">Attending members</div>
          <div className="d-flex flex-wrap gap-2">
            {attendance.map((member, i) => (
              <CBadge
                key={member.memberId || i}
                color="light"
                className="border text-body-secondary fw-normal"
              >
                {member.name}
                {member.role ? ` - ${member.role}` : ''}
              </CBadge>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

const PostAnalysisRows = ({ analysis, fallbackPhotos = [] }) => {
  if (!analysis) return null
  const strengths = (Array.isArray(analysis.strengths) ? analysis.strengths : []).filter(Boolean)
  const resources = (
    Array.isArray(analysis.resourcesMobilised) ? analysis.resourcesMobilised : []
  ).filter(Boolean)
  const improvements = (
    Array.isArray(analysis.improvementOpportunities) ? analysis.improvementOpportunities : []
  ).filter(Boolean)
  const photos = (
    Array.isArray(analysis.photos) && analysis.photos.length ? analysis.photos : fallbackPhotos
  ).filter((p) => p?.url)

  if (!strengths.length && !resources.length && !improvements.length && !photos.length) return null

  return (
    <div className="d-grid gap-3">
      <SectionHeading>Post-Incident Analysis</SectionHeading>
      {strengths.length > 0 ? (
        <div>
          <div className="small text-body-secondary mb-1">Strengths</div>
          <ul className="mb-0 ps-4">
            {strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {resources.length > 0 ? (
        <div>
          <div className="small text-body-secondary mb-1">Resources Mobilised</div>
          <div className="d-flex flex-wrap gap-2">
            {resources.map((r, i) => (
              <CBadge key={i} color="light" className="border text-body-secondary fw-normal">
                {r}
              </CBadge>
            ))}
          </div>
        </div>
      ) : null}
      {improvements.length > 0 ? (
        <div>
          <div className="small text-body-secondary mb-1">Improvement Opportunities</div>
          <ul className="mb-0 ps-4">
            {improvements.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {photos.length > 0 ? (
        <div>
          <div className="small text-body-secondary mb-2">Photographs</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {photos.map((photo, i) => (
              <div
                key={photo.id || i}
                className="rounded-3 border border-light-subtle overflow-hidden"
              >
                <img
                  src={photo.url}
                  alt={photo.fileName || 'Incident photo'}
                  style={{ width: '100%', height: '120px', objectFit: 'cover' }}
                />
                {photo.description ? (
                  <div className="small p-2 text-body-secondary">{photo.description}</div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

const ReportDetailSection = ({
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
  mode = 'detail',
  reviewActions = null,
  isSubmittingReview = false,
  changeSummary = [],
  reviewBannerText = 'Review Mode - not submitted yet.',
}) => {
  if (!selectedRecord) {
    return (
      <CAlert color="warning">
        {mode === 'review'
          ? 'Review data is unavailable. Return to edit and try again.'
          : 'Report not found.'}
      </CAlert>
    )
  }

  const r = selectedRecord
  const isReviewMode = mode === 'review'
  const reportType = String(r.reportType || '').toLowerCase()
  const isErco = reportType === 'erco'

  const hasRespondingTeam = isErco && r.respondingTeam
  const hasChronology =
    Array.isArray(r.chronology) && r.chronology.some((row) => row.time || row.action)
  const detailsText = String(r.details || r.description || '').trim()
  const summaryText = String(r.summary || '').trim()
  const displayStatus = isReviewMode ? 'Draft' : r.status

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
              {typeof renderStatusBadge === 'function'
                ? renderStatusBadge(displayStatus)
                : displayStatus || '--'}
            </DetailField>
            <DetailField label="Action Owner">{r.actionOwner || '--'}</DetailField>
            <DetailField label="Date / Time">{dateTime || '--'}</DetailField>
            <DetailField label="Incident Type">{r.incidentType || '--'}</DetailField>
            {r.weather ? <DetailField label="Weather">{r.weather}</DetailField> : null}
            <DetailField label="Location" xs={12} md={r.weather ? 4 : 8}>
              {r.location || '--'}
            </DetailField>
            {r.teamInCharge || r.respondingTeamName ? (
              <DetailField label="Team In Charge" xs={12} md={4}>
                {r.teamInCharge || r.respondingTeamName}
              </DetailField>
            ) : null}
            {r.aicInCharge ? (
              <DetailField label="AIC In Charge" xs={12} md={4}>
                {r.aicInCharge}
              </DetailField>
            ) : null}
          </CRow>

          {detailsText || summaryText ? (
            <div className="d-grid gap-3">
              {detailsText ? (
                <div>
                  <div className="small text-body-secondary">Incident Title</div>
                  <div className="fw-semibold">{detailsText}</div>
                </div>
              ) : null}
              {summaryText ? (
                <div>
                  <div className="small text-body-secondary">Summary</div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{summaryText}</div>
                </div>
              ) : null}
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

          {isReviewMode ? (
            <div className="d-grid gap-2">
              <SectionHeading>Changed Fields</SectionHeading>
              {Array.isArray(changeSummary) && changeSummary.length > 0 ? (
                <div className="rounded-3 border overflow-hidden">
                  {changeSummary.map((entry, index) => (
                    <div
                      key={`${entry.label}-${index}`}
                      className={`px-3 py-2 ${index < changeSummary.length - 1 ? 'border-bottom' : ''}`}
                    >
                      <div className="small text-body-secondary">{entry.label}</div>
                      <div className="small">
                        <span className="text-body-secondary">From:</span> {entry.before || '--'}
                      </div>
                      <div className="small">
                        <span className="text-body-secondary">To:</span> {entry.after || '--'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="small text-body-secondary">No changes detected.</div>
              )}
            </div>
          ) : null}

          {hasRespondingTeam ? <RespondingTeamRows respondingTeam={r.respondingTeam} /> : null}
          {hasChronology ? <ChronologyRows chronology={r.chronology} /> : null}

          {isErco &&
          (r.postIncidentAnalysis || (Array.isArray(r.photos) && r.photos.length > 0)) ? (
            <PostAnalysisRows
              analysis={r.postIncidentAnalysis || {}}
              fallbackPhotos={Array.isArray(r.photos) ? r.photos : []}
            />
          ) : null}

          <div className="d-flex flex-column flex-sm-row flex-wrap gap-2 justify-content-end">
            {isReviewMode ? (
              <>
                <CButton color="light" onClick={() => reviewActions?.onBackToEdit?.()}>
                  Back to Edit
                </CButton>
                <CButton color="secondary" onClick={() => reviewActions?.onSaveDraft?.()}>
                  Save Draft
                </CButton>
                <CButton
                  color="primary"
                  disabled={isSubmittingReview}
                  onClick={() => reviewActions?.onConfirm?.()}
                >
                  {reviewActions?.confirmLabel || 'Confirm Submit'}
                </CButton>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </CCardBody>
    </CCard>
  )
}

export default ReportDetailSection
