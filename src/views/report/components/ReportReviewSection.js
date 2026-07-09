import React from 'react'
import { CAlert, CBadge, CButton, CRow } from '@coreui/react'
import FormActionGroup from 'src/components/FormActionGroup'
import { DetailField, SectionHeading } from 'src/components/report-workflow/ReportViewComponents'

const text = (value) => String(value || '').trim()

const getStatusBadge = (status, renderStatusBadge) => {
  const label = text(status) || 'Ready to submit'
  if (typeof renderStatusBadge === 'function' && label !== 'Ready to submit') {
    return renderStatusBadge(label)
  }
  const color = label === 'Ready to submit' ? 'success' : 'secondary'
  return <CBadge color={color}>{label}</CBadge>
}

const ReviewSectionBlock = ({ title, children }) => (
  <section className="inspection-review-section d-grid gap-3">
    <div className="inspection-review-section__title">{title}</div>
    {children}
  </section>
)

const ChronologyRows = ({ chronology }) => {
  const rows = (Array.isArray(chronology) ? chronology : []).filter((row) =>
    text(row?.time || row?.action),
  )
  if (rows.length === 0) return null

  return (
    <ReviewSectionBlock title="Chronology">
      <div className="rounded-3 border overflow-hidden">
        {rows.map((row, index) => (
          <div
            key={`${row.time || 'time'}-${index}`}
            className={`d-flex gap-3 px-3 py-2${index < rows.length - 1 ? ' border-bottom' : ''}`}
          >
            <div className="text-body-secondary flex-shrink-0 text-truncate" style={{ width: 52 }}>
              {row.time || '--'}
            </div>
            <div style={{ minWidth: 0 }}>{row.action || '--'}</div>
          </div>
        ))}
      </div>
    </ReviewSectionBlock>
  )
}

const RespondingTeamRows = ({ respondingTeam }) => {
  if (!respondingTeam) return null
  const attendance = Array.isArray(respondingTeam.attendance) ? respondingTeam.attendance : []

  return (
    <ReviewSectionBlock title="Responding Team">
      <CRow className="g-3">
        <DetailField label="Team">{respondingTeam.name || '--'}</DetailField>
        {respondingTeam.shift ? (
          <DetailField label="Shift">{respondingTeam.shift}</DetailField>
        ) : null}
      </CRow>
      {attendance.length > 0 ? (
        <div className="d-flex flex-wrap gap-2">
          {attendance.map((member, index) => (
            <CBadge
              key={member.memberId || index}
              color="light"
              className="border text-body-secondary fw-normal"
            >
              {member.name}
              {member.role ? ` - ${member.role}` : ''}
            </CBadge>
          ))}
        </div>
      ) : null}
    </ReviewSectionBlock>
  )
}

const AnalysisRows = ({ analysis, photos = [] }) => {
  if (!analysis && photos.length === 0) return null
  const strengths = (Array.isArray(analysis?.strengths) ? analysis.strengths : []).filter(Boolean)
  const resources = (
    Array.isArray(analysis?.resourcesMobilised) ? analysis.resourcesMobilised : []
  ).filter(Boolean)
  const improvements = (
    Array.isArray(analysis?.improvementOpportunities) ? analysis.improvementOpportunities : []
  ).filter(Boolean)
  const photoRows = (
    Array.isArray(analysis?.photos) && analysis.photos.length ? analysis.photos : photos
  ).filter((photo) => photo?.url)

  if (!strengths.length && !resources.length && !improvements.length && !photoRows.length) {
    return null
  }

  return (
    <ReviewSectionBlock title="Post-Incident Analysis">
      {strengths.length > 0 ? (
        <div>
          <div className="small text-body-secondary mb-1">Strengths</div>
          <ul className="mb-0 ps-4">
            {strengths.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {resources.length > 0 ? (
        <div>
          <div className="small text-body-secondary mb-1">Resources Mobilised</div>
          <div className="d-flex flex-wrap gap-2">
            {resources.map((item, index) => (
              <CBadge
                key={`${item}-${index}`}
                color="light"
                className="border text-body-secondary fw-normal"
              >
                {item}
              </CBadge>
            ))}
          </div>
        </div>
      ) : null}
      {improvements.length > 0 ? (
        <div>
          <div className="small text-body-secondary mb-1">Improvement Opportunities</div>
          <ul className="mb-0 ps-4">
            {improvements.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {photoRows.length > 0 ? (
        <div>
          <div className="small text-body-secondary mb-2">Photographs</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {photoRows.map((photo, index) => (
              <div key={photo.id || index} className="rounded-3 border overflow-hidden">
                <img
                  src={photo.url}
                  alt={photo.fileName || 'Report photo'}
                  style={{ width: '100%', height: 120, objectFit: 'cover' }}
                />
                {photo.description ? (
                  <div className="small p-2 text-body-secondary">{photo.description}</div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </ReviewSectionBlock>
  )
}

const ReportReviewSection = ({
  selectedRecord,
  reviewActions = null,
  isSubmittingReview = false,
  changeSummary = [],
  renderStatusBadge,
  formatDateTime,
  typeLabel = 'Incident Type',
  conditionLabel = 'Weather',
  detailsLabel = 'Incident Title',
  summaryLabel = 'Summary',
}) => {
  if (!selectedRecord) {
    return (
      <CAlert color="warning">Review data is unavailable. Return to edit and try again.</CAlert>
    )
  }

  const r = selectedRecord
  const reportTitle = text(r.incidentType) || text(r.displayId) || 'Report'
  const statusBadge = getStatusBadge('Ready to submit', renderStatusBadge)
  const dateTime =
    typeof formatDateTime === 'function'
      ? formatDateTime(r.incidentDate || r.reportDate, r.incidentTime || r.reportTime)
      : [r.incidentDate || r.reportDate, r.incidentTime || r.reportTime].filter(Boolean).join(' ')
  const detailsText = text(r.details || r.description)
  const summaryText = text(r.summary)
  const submitLabel = reviewActions?.confirmLabel || 'Confirm Submit'
  const isUpdateMode = /update/i.test(submitLabel)
  const mobileSubmitLabel =
    submitLabel.length > 18 ? (isUpdateMode ? 'Update' : 'Submit') : submitLabel

  const editButton = (
    <CButton color="light" onClick={() => reviewActions?.onBackToEdit?.()}>
      Edit
    </CButton>
  )

  const renderReviewActions = (className = '', isMobileSticky = false) => {
    if (isMobileSticky) {
      return (
        <FormActionGroup
          className={className}
          mobileThumb={false}
          leading={editButton}
          ariaLabel="Report review actions"
        >
          <CButton color="secondary" onClick={() => reviewActions?.onSaveDraft?.()}>
            Save Draft
          </CButton>
          <CButton
            color="primary"
            disabled={isSubmittingReview}
            onClick={() => reviewActions?.onConfirm?.()}
          >
            {mobileSubmitLabel}
          </CButton>
        </FormActionGroup>
      )
    }

    return (
      <div
        className={`inspection-review-actions d-flex flex-column flex-sm-row gap-2 ${className}`.trim()}
      >
        {editButton}
        <CButton color="secondary" onClick={() => reviewActions?.onSaveDraft?.()}>
          Save Draft
        </CButton>
        <CButton
          color="primary"
          disabled={isSubmittingReview}
          onClick={() => reviewActions?.onConfirm?.()}
        >
          {submitLabel}
        </CButton>
      </div>
    )
  }

  return (
    <section className="inspection-review-page d-grid gap-3">
      <div className="inspection-review-hero">
        <div>
          <h2 className="inspection-review-title mb-1">{reportTitle}</h2>
          <div className="inspection-review-meta">
            {r.displayId ? <div className="inspection-review-id">{r.displayId}</div> : null}
          </div>
        </div>
        <div className="inspection-review-hero__status">{statusBadge}</div>
      </div>

      <ReviewSectionBlock title="Report Details">
        <CRow className="g-3">
          <DetailField label={typeLabel} xs={12} md={6}>
            {r.incidentType || '--'}
          </DetailField>
          <DetailField label="Date / Time" xs={12} md={6}>
            {dateTime || '--'}
          </DetailField>
          {r.weather ? (
            <DetailField label={conditionLabel} xs={12} md={6}>
              {r.weather}
            </DetailField>
          ) : null}
          <DetailField label="Location" xs={12} md={6}>
            {r.location || '--'}
          </DetailField>
        </CRow>
      </ReviewSectionBlock>

      {detailsText || summaryText ? (
        <ReviewSectionBlock title="Summary">
          {detailsText ? (
            <div>
              <div className="small text-body-secondary">{detailsLabel}</div>
              <div className="fw-semibold">{detailsText}</div>
            </div>
          ) : null}
          {summaryText ? (
            <div>
              <div className="small text-body-secondary">{summaryLabel}</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{summaryText}</div>
            </div>
          ) : null}
        </ReviewSectionBlock>
      ) : null}

      {Array.isArray(changeSummary) && changeSummary.length > 0 ? (
        <ReviewSectionBlock title="Changed Fields">
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
        </ReviewSectionBlock>
      ) : null}

      <RespondingTeamRows respondingTeam={r.respondingTeam} />
      <ChronologyRows chronology={r.chronology} />
      <AnalysisRows
        analysis={r.postIncidentAnalysis}
        photos={Array.isArray(r.photos) ? r.photos : []}
      />

      {renderReviewActions('justify-content-end d-none d-md-flex')}
      {renderReviewActions('inspection-review-inline-actions d-md-none', true)}
    </section>
  )
}

export default ReportReviewSection
