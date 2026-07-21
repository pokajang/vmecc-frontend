import React from 'react'
import { CAlert, CBadge, CButton, CRow } from '@coreui/react'
import FormActionGroup from 'src/components/FormActionGroup'
import ReportPhotoGallery from 'src/components/report-workflow/ReportPhotoGallery'
import { DetailField } from 'src/components/report-workflow/ReportViewComponents'

const text = (value) => String(value || '').trim()

const getStatusBadge = (status, renderStatusBadge) => {
  const label = text(status) || 'Ready to submit'
  if (typeof renderStatusBadge === 'function' && label !== 'Ready to submit') {
    return renderStatusBadge(label)
  }
  const color = label === 'Ready to submit' ? 'success' : 'secondary'
  return <CBadge color={color}>{label}</CBadge>
}

const ReviewSectionBlock = ({ title, children, onEdit }) => (
  <section className="inspection-review-section d-grid gap-3">
    <div className="d-flex justify-content-between align-items-center gap-2">
      <div className="inspection-review-section__title">{title}</div>
      {typeof onEdit === 'function' ? (
        <CButton type="button" color="link" size="sm" className="p-0" onClick={onEdit}>
          Edit
        </CButton>
      ) : null}
    </div>
    {children}
  </section>
)

const ChronologyRows = ({ chronology, onEdit }) => {
  const rows = (Array.isArray(chronology) ? chronology : []).filter((row) =>
    text(row?.time || row?.action),
  )
  if (rows.length === 0) return null

  return (
    <ReviewSectionBlock title="Chronology" onEdit={onEdit}>
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

const RespondingTeamRows = ({ respondingTeam, isDrill = false, onEdit }) => {
  if (!respondingTeam) return null
  const attendance = Array.isArray(respondingTeam.attendance) ? respondingTeam.attendance : []
  if (!text(respondingTeam.name) && !text(respondingTeam.shift) && attendance.length === 0) {
    return null
  }

  return (
    <ReviewSectionBlock title={isDrill ? 'Exercise Personnel' : 'Responding Team'} onEdit={onEdit}>
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
              {member.exerciseRole ? ` (${member.exerciseRole})` : ''}
            </CBadge>
          ))}
        </div>
      ) : null}
    </ReviewSectionBlock>
  )
}

const AnalysisRows = ({ analysis, photos = [], isDrill = false, onEdit }) => {
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
    <ReviewSectionBlock
      title={isDrill ? 'Post-Exercise Analysis' : 'Post-Incident Analysis'}
      onEdit={onEdit}
    >
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
          <ReportPhotoGallery photos={photoRows} />
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
  reportKind = '',
}) => {
  if (!selectedRecord) {
    return (
      <CAlert color="warning">Review data is unavailable. Return to edit and try again.</CAlert>
    )
  }

  const r = selectedRecord
  const isDrill = reportKind === 'drill' || text(r.reportType).toLowerCase() === 'drill'
  const isErco = reportKind === 'erco' || text(r.reportType).toLowerCase() === 'erco'
  const reportTitle =
    (isDrill ? text(r.exerciseTitle) : '') || text(r.incidentType) || text(r.displayId) || 'Report'
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
  const activeSubmitLabel = isSubmittingReview
    ? isUpdateMode
      ? 'Updating...'
      : 'Submitting...'
    : submitLabel
  const activeMobileSubmitLabel = isSubmittingReview
    ? isUpdateMode
      ? 'Updating...'
      : 'Submitting...'
    : mobileSubmitLabel

  const editButton = (
    <CButton color="light" onClick={() => reviewActions?.onBackToEdit?.()}>
      Edit
    </CButton>
  )
  const editSection = (section) => reviewActions?.onBackToEdit?.(section)
  const exerciseCategories = (Array.isArray(r.exerciseCategories) ? r.exerciseCategories : [])
    .map(text)
    .filter(Boolean)
  const objectives = (Array.isArray(r.exerciseObjectives) ? r.exerciseObjectives : [])
    .map((row) => (typeof row === 'string' ? text(row) : text(row?.text)))
    .filter(Boolean)
  const erpReferences = (Array.isArray(r.erpReferences) ? r.erpReferences : []).filter(
    (row) => text(row?.annexNumber) || text(row?.title),
  )
  const timeline = Array.isArray(r.timeline) ? r.timeline : []
  const reviewed = [...timeline].reverse().find((row) => /review/i.test(text(row?.action)))
  const approved = [...timeline].reverse().find((row) => /approv/i.test(text(row?.action)))

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
            {activeMobileSubmitLabel}
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
          {activeSubmitLabel}
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

      <ReviewSectionBlock
        title="Report Details"
        onEdit={isDrill || isErco ? () => editSection('setup') : null}
      >
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
          {isDrill && exerciseCategories.length ? (
            <DetailField label="Exercise Categories" xs={12} md={6}>
              {exerciseCategories.join(', ')}
            </DetailField>
          ) : null}
          {isDrill && r.reportIssuanceDate ? (
            <DetailField label="Report Issuance Date" xs={12} md={6}>
              {r.reportIssuanceDate}
            </DetailField>
          ) : null}
        </CRow>
      </ReviewSectionBlock>

      {detailsText || summaryText ? (
        <ReviewSectionBlock
          title={isDrill ? 'Exercise Details' : 'Summary'}
          onEdit={
            isDrill ? () => editSection('details') : isErco ? () => editSection('form') : null
          }
        >
          {isDrill && r.exerciseTitle ? (
            <div>
              <div className="small text-body-secondary">Exercise Title</div>
              <div className="fw-semibold">{r.exerciseTitle}</div>
            </div>
          ) : null}
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
          {objectives.length ? (
            <div>
              <div className="small text-body-secondary">Exercise Objectives</div>
              <ul className="mb-0 ps-4">
                {objectives.map((objective, index) => (
                  <li key={`${objective}-${index}`}>{objective}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {erpReferences.length ? (
            <div>
              <div className="small text-body-secondary">ERP / Annex References</div>
              <ul className="mb-0 ps-4">
                {erpReferences.map((reference, index) => (
                  <li key={`${reference.annexNumber || 'reference'}-${index}`}>
                    {[reference.annexNumber, reference.title].filter(Boolean).join(' - ')}
                  </li>
                ))}
              </ul>
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

      <RespondingTeamRows
        respondingTeam={r.respondingTeam}
        isDrill={isDrill}
        onEdit={
          isDrill ? () => editSection('personnel') : isErco ? () => editSection('team') : null
        }
      />
      <ChronologyRows
        chronology={r.chronology}
        onEdit={
          isDrill ? () => editSection('chronology') : isErco ? () => editSection('form') : null
        }
      />
      <AnalysisRows
        analysis={r.postIncidentAnalysis}
        photos={Array.isArray(r.photos) ? r.photos : []}
        isDrill={isDrill}
        onEdit={isDrill || isErco ? () => editSection('analysis') : null}
      />

      {isDrill ? (
        <ReviewSectionBlock title="Workflow Sign-Off">
          <CRow className="g-3">
            <DetailField label="Prepared By" xs={12} md={4}>
              {r.submittedBy || '--'}
            </DetailField>
            <DetailField label="Station Commander Review" xs={12} md={4}>
              {reviewed?.by || 'Pending'}
            </DetailField>
            <DetailField label="VMM Review" xs={12} md={4}>
              {approved?.by || 'Pending'}
            </DetailField>
          </CRow>
        </ReviewSectionBlock>
      ) : null}

      {renderReviewActions('justify-content-end d-none d-md-flex')}
      {renderReviewActions('inspection-review-inline-actions d-md-none', true)}
    </section>
  )
}

export default ReportReviewSection
