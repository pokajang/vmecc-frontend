import React from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import ReportPhotoGallery from 'src/components/report-workflow/ReportPhotoGallery'
import WorkflowStageActions from 'src/components/report-workflow/WorkflowStageActions'
import { DetailField } from 'src/components/report-workflow/ReportViewComponents'
import RespondingTeamSummary from 'src/components/report-workflow/RespondingTeamSummary'
import { getProficiencyCheckpointSummary } from '../fitness-test/fitnessFormDomain'
import ErAssessmentReadOnlySections from '../er-assessment/ErAssessmentReadOnlySections'

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
      <div className="d-grid gap-2">
        {rows.map((row, index) => (
          <div key={`${row.time || 'time'}-${index}`} className="d-flex gap-3 px-3 py-2">
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
                className="text-body-secondary fw-normal"
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
          <ReportPhotoGallery
            photos={photoRows}
            contextLabel={isDrill ? 'Report evidence' : 'Report'}
            hiddenDescriptionValues={[...strengths, ...resources, ...improvements]}
          />
        </div>
      ) : null}
    </ReviewSectionBlock>
  )
}

const FitnessReviewRows = ({ report, onEdit }) => {
  const groups = Array.isArray(report.shiftGroups) ? report.shiftGroups : []
  const completion = report.completion || {}
  const resultBadge = (result) => (
    <CBadge color={result === 'pass' ? 'success' : result === 'failed' ? 'danger' : 'secondary'}>
      {result === 'pass' ? 'Pass' : result === 'failed' ? 'Failed' : 'Not tested'}
    </CBadge>
  )
  const checkpointLabel = (proficiency) => {
    const summary = getProficiencyCheckpointSummary(proficiency)
    return `${summary.completed}/${summary.total} CP`
  }
  return (
    <>
      <ReviewSectionBlock title="Report Details" onEdit={() => onEdit('period')}>
        <CRow className="g-3">
          <DetailField label="Reporting Month" xs={12} md={4}>
            {report.reportingMonth || '--'}
          </DetailField>
          <DetailField label="Document Reference" xs={12} md={4}>
            {report.documentReference || '--'}
          </DetailField>
          <DetailField label="Revision" xs={12} md={4}>
            {report.protocolRevision || '--'}
          </DetailField>
          <DetailField label="Personnel" xs={6} md={3}>
            {completion.participants ?? '--'}
          </DetailField>
          <DetailField label="Passed Assessments" xs={6} md={3}>
            {completion.passedAssessments ?? '--'}
          </DetailField>
          <DetailField label="Failed Assessments" xs={6} md={3}>
            {completion.failedAssessments ?? '--'}
          </DetailField>
          <DetailField label="Incomplete" xs={6} md={3}>
            {completion.incompleteAssessments ?? '--'}
          </DetailField>
        </CRow>
      </ReviewSectionBlock>
      <ReviewSectionBlock title="Physical and Proficiency Results" onEdit={() => onEdit('results')}>
        {groups.map((group) => (
          <div key={group.id || group.shift} className="d-grid gap-2">
            <div className="d-flex flex-wrap justify-content-between gap-2">
              <div className="fw-semibold">{group.shift}</div>
              <div className="small text-body-secondary">
                Assessor: {group.assessor?.name || '--'}
              </div>
            </div>
            <div className="table-responsive rounded-3 border">
              <CTable className="mb-0" small align="middle">
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Name</CTableHeaderCell>
                    <CTableHeaderCell>Age</CTableHeaderCell>
                    <CTableHeaderCell>Fitness</CTableHeaderCell>
                    <CTableHeaderCell>Fitness date</CTableHeaderCell>
                    <CTableHeaderCell>Checkpoints</CTableHeaderCell>
                    <CTableHeaderCell>Proficiency time</CTableHeaderCell>
                    <CTableHeaderCell>Proficiency date</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {(Array.isArray(group.participants) ? group.participants : []).map(
                    (participant) => (
                      <CTableRow key={participant.id || participant.name}>
                        <CTableHeaderCell scope="row">{participant.name}</CTableHeaderCell>
                        <CTableDataCell>{participant.ageSnapshot || '--'}</CTableDataCell>
                        <CTableDataCell>
                          <div>
                            {participant.fitness?.sitUps ?? '--'} /{' '}
                            {participant.fitness?.jumpingJacks ?? '--'} /{' '}
                            {participant.fitness?.pushUps ?? '--'}
                          </div>
                          {resultBadge(participant.fitness?.result)}
                        </CTableDataCell>
                        <CTableDataCell>{participant.fitness?.testedOn || '--'}</CTableDataCell>
                        <CTableDataCell>{checkpointLabel(participant.proficiency)}</CTableDataCell>
                        <CTableDataCell>
                          <div>
                            {participant.proficiency?.durationSeconds
                              ? `${participant.proficiency.durationSeconds}s`
                              : '--'}
                          </div>
                          {resultBadge(participant.proficiency?.result)}
                        </CTableDataCell>
                        <CTableDataCell>{participant.proficiency?.testedOn || '--'}</CTableDataCell>
                      </CTableRow>
                    ),
                  )}
                </CTableBody>
              </CTable>
            </div>
          </div>
        ))}
      </ReviewSectionBlock>
      {text(report.notes) ? (
        <ReviewSectionBlock title="Notes" onEdit={() => onEdit('signoff')}>
          <div style={{ whiteSpace: 'pre-wrap' }}>{report.notes}</div>
        </ReviewSectionBlock>
      ) : null}
      <ReviewSectionBlock title="Workflow Sign-Off" onEdit={() => onEdit('signoff')}>
        <CRow className="g-3">
          <DetailField label="Prepared By" xs={12} md={6}>
            {report.submittedBy || '--'}
          </DetailField>
          <DetailField label="Verified By" xs={12} md={6}>
            Assigned during review
          </DetailField>
        </CRow>
      </ReviewSectionBlock>
    </>
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
  const isFitness =
    reportKind === 'fitness-test' || text(r.reportType).toLowerCase() === 'fitness-test'
  const isErAssessment =
    reportKind === 'er-assessment' || text(r.reportType).toLowerCase() === 'er-assessment'
  const reportTitle =
    (isFitness ? `Physical Test Report - ${text(r.reportingMonth)}` : '') ||
    (isDrill ? text(r.exerciseTitle) : '') ||
    (isErAssessment ? text(r.assessmentTypeLabel) : '') ||
    text(r.incidentType) ||
    text(r.displayId) ||
    'Report'
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

  const renderReviewActions = (className = '', compactLabel = false) => (
    <WorkflowStageActions
      className={className}
      mobileLayout="stacked-primary-first"
      onBack={() => reviewActions?.onBackToEdit?.()}
      backLabel="Edit"
      onPrimary={() => reviewActions?.onConfirm?.()}
      primaryLabel={compactLabel ? activeMobileSubmitLabel : activeSubmitLabel}
      primaryDisabled={isSubmittingReview}
      ariaLabel="Report review actions"
    />
  )

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

      {isFitness ? <FitnessReviewRows report={r} onEdit={editSection} /> : null}

      {isErAssessment ? <ErAssessmentReadOnlySections report={r} onEdit={editSection} /> : null}

      {isFitness && Array.isArray(r.photos) && r.photos.some((photo) => photo?.url) ? (
        <ReviewSectionBlock title="Fitness test photographs" onEdit={() => editSection('results')}>
          <ReportPhotoGallery
            photos={r.photos}
            title="Fitness test photographs"
            contextLabel="Fitness test evidence"
            hiddenDescriptionValues={[r.notes, r.remarks, r.summary, r.result]}
          />
        </ReviewSectionBlock>
      ) : null}

      {!isFitness && !isErAssessment ? (
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
      ) : null}

      {!isFitness && !isErAssessment && (detailsText || summaryText) ? (
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
          <div className="d-grid gap-2">
            {changeSummary.map((entry, index) => (
              <div key={`${entry.label}-${index}`} className="px-3 py-2">
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

      {!isFitness && !isErAssessment ? (
        <RespondingTeamSummary
          respondingTeam={r.respondingTeam}
          isDrill={isDrill}
          onEdit={
            isDrill ? () => editSection('personnel') : isErco ? () => editSection('team') : null
          }
          variant="review"
        />
      ) : null}
      {!isFitness && !isErAssessment ? (
        <ChronologyRows
          chronology={r.chronology}
          onEdit={
            isDrill ? () => editSection('chronology') : isErco ? () => editSection('form') : null
          }
        />
      ) : null}
      {!isFitness && !isErAssessment ? (
        <AnalysisRows
          analysis={r.postIncidentAnalysis}
          photos={Array.isArray(r.photos) ? r.photos : []}
          isDrill={isDrill}
          onEdit={isDrill || isErco ? () => editSection('analysis') : null}
        />
      ) : null}

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

      {renderReviewActions('inspection-review-inline-actions', true)}
    </section>
  )
}

export default ReportReviewSection
