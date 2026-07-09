import React from 'react'
import { CAlert, CBadge, CButton, CRow } from '@coreui/react'
import FormActionGroup from 'src/components/FormActionGroup'
import { DetailField } from 'src/components/report-workflow/ReportViewComponents'
import { getInspectionTypeDefinition } from '../app/inspectionTypeRegistry'
import { formatTimestamp } from '../domain/utils/inspectionSharedUtils'
import { stripInspectionContext } from '../domain/utils/typeOptionUtils'
import {
  InspectionGeneralEvidenceCard,
  formatInspectionDisplayLocationTitle,
} from '../form/components/InspectionFormDisplaySections'
import {
  formatInspectionRole,
  isGeneralInspectionType,
  recordToInspectionForm,
} from '../form/inspectionFormHelpers'
import { INSPECTION_REPORT_EVIDENCE_COPY } from '../inspectionReportEvidenceCopy'

const text = (value) => String(value || '').trim()

const hasStructuredSummaryContent = (summary) =>
  summary?.hasContent === true ||
  (Array.isArray(summary?.visibleChecks)
    ? summary.visibleChecks.length > 0
    : Array.isArray(summary?.visibleSections)
      ? summary.visibleSections.some(
          (section) => Array.isArray(section?.visibleRows) && section.visibleRows.length > 0,
        )
      : false)

const getReviewStatusLabel = (record = {}, hasConfirmAction = false) => {
  const status = text(record.status)
  if (hasConfirmAction && status.toLowerCase() === 'draft') return 'Ready to submit'
  return status || 'Unknown'
}

const getReviewStatusBadge = (status, renderStatusBadge) => {
  if (typeof renderStatusBadge === 'function' && status !== 'Ready to submit') {
    return renderStatusBadge(status)
  }

  const normalized = status.toLowerCase()
  const color =
    normalized === 'ready to submit'
      ? 'success'
      : normalized === 'submitted'
        ? 'success'
        : normalized === 'rejected'
          ? 'danger'
          : 'secondary'
  return <CBadge color={color}>{status}</CBadge>
}

const getItemCountSummary = (summary = null) => {
  const metrics = summary?.metrics || {}
  const count = Number(metrics.count || 0)
  const defectCount = Number(metrics.defectCount || 0)
  if (!summary || count <= 0) return ''
  return [
    `${count} saved item${count === 1 ? '' : 's'}`,
    defectCount ? `${defectCount} issue${defectCount === 1 ? '' : 's'}` : '',
  ]
    .filter(Boolean)
    .join(', ')
}

const getReviewRowBadgeColor = (status) => {
  const normalized = text(status).toLowerCase()
  if (normalized === 'needs attention') return 'warning'
  if (normalized === 'issue') return 'danger'
  return 'success'
}

const buildLocationReviewGroups = (rows = []) => {
  const byLocation = new Map()
  ;(Array.isArray(rows) ? rows : []).forEach((row) => {
    const zone = text(row.zone) || 'No zone'
    const mainLocation = text(row.mainLocation) || 'No main area'
    const subLocation = text(row.subLocation) || 'No location'
    const key = `${zone}\u0000${mainLocation}\u0000${subLocation}`
    if (!byLocation.has(key)) {
      byLocation.set(key, {
        key,
        zone,
        mainLocation,
        subLocation,
        rows: [],
      })
    }
    byLocation.get(key).rows.push(row)
  })
  return Array.from(byLocation.values())
}

const ReviewSectionBlock = ({ title, children }) => (
  <section className="inspection-review-section d-grid gap-3">
    <div className="inspection-review-section__title">{title}</div>
    {children}
  </section>
)

const InspectionReviewLocationSummary = ({ summary = null }) => {
  const locationGroups = buildLocationReviewGroups(summary?.groups)
  if (locationGroups.length === 0) return null

  return (
    <ReviewSectionBlock title="Locations Checked">
      <div className="inspection-review-location-list d-grid gap-2">
        {locationGroups.map((locationGroup) => (
          <div key={locationGroup.key} className="inspection-review-location-item">
            <div className="d-flex justify-content-between gap-3">
              <div>
                <div className="fw-semibold">
                  {locationGroup.mainLocation} / {locationGroup.subLocation}
                </div>
                <div className="small text-body-secondary">Zone {locationGroup.zone}</div>
              </div>
              <div className="small text-body-secondary text-nowrap">
                {locationGroup.rows.length} item{locationGroup.rows.length === 1 ? '' : 's'}
              </div>
            </div>
            <div className="d-grid gap-2">
              {locationGroup.rows.map((group, index) => (
                <div
                  key={`${locationGroup.key}:${group.label}:${index}`}
                  className="inspection-review-location-row"
                >
                  <div className="fw-semibold">{group.label}</div>
                  <CBadge color={getReviewRowBadgeColor(group.status)}>{group.status}</CBadge>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ReviewSectionBlock>
  )
}

const InspectionReviewSection = ({
  selectedRecord,
  renderStatusBadge,
  reviewActions = null,
  reviewSummary = null,
  isSubmittingReview = false,
  queueWarning = '',
}) => {
  if (!selectedRecord) {
    return (
      <CAlert color="warning">Review data is unavailable. Return to edit and try again.</CAlert>
    )
  }

  const r = selectedRecord
  const form = recordToInspectionForm(r)
  const selectedTypeDefinition = getInspectionTypeDefinition(r.incidentType || form.inspectionType)
  const inspectionType = selectedTypeDefinition?.title || stripInspectionContext(r.incidentType)
  const readOnlyChecks = selectedTypeDefinition?.checksField
    ? form[selectedTypeDefinition.checksField] || []
    : []
  const readOnlySummary = selectedTypeDefinition?.getSummary?.(
    {
      ...form,
      ...(selectedTypeDefinition?.checksField
        ? {
            [selectedTypeDefinition.checksField]: readOnlyChecks,
            [selectedTypeDefinition.equipmentRowsField]: readOnlyChecks,
          }
        : {}),
    },
    selectedTypeDefinition?.checksField ? { checks: readOnlyChecks } : {},
  )
  const isGeneral = isGeneralInspectionType(r.incidentType || form.inspectionType)
  const mainLocationLabel = formatInspectionDisplayLocationTitle(r.incidentType, form.mainLocation)
  const ReadOnlySection = selectedTypeDefinition?.ReadOnlySection || null
  const inspectedAt = formatTimestamp(form.inspectedAt || r.inspectedAt, '')
  const submittedAt = formatTimestamp(r.submittedAt, '')
  const submittedBy = text(r.submittedBy)
  const submittedRole = formatInspectionRole(
    r.submittedByRole ||
      form.submittedByRole ||
      r.inspectionActor?.role ||
      form.inspectionActor?.role,
    r.submittedByRoleCode ||
      form.submittedByRoleCode ||
      r.inspectionActor?.roleCode ||
      form.inspectionActor?.roleCode,
  )
  const statusLabel = getReviewStatusLabel(r, Boolean(reviewActions?.onConfirm))
  const summaryCount = getItemCountSummary(reviewSummary)
  const blockers = Array.isArray(reviewActions?.blockers) ? reviewActions.blockers : []
  const isUpdateMode = reviewActions?.isUpdateMode === true
  const submitLabel = reviewActions?.confirmLabel || 'Confirm Submit'
  const mobileSubmitLabel =
    submitLabel.length > 18 ? (isUpdateMode ? 'Update' : 'Submit') : submitLabel
  const isSubmissionReview = Boolean(reviewActions?.onConfirm)
  const detailFieldWidth = isSubmissionReview ? 6 : 3

  const editButton = (
    <CButton color="light" onClick={() => reviewActions?.onBackToEdit?.()}>
      Edit
    </CButton>
  )

  const pendingButton = reviewActions?.onBackToPending ? (
    <CButton color="light" onClick={() => reviewActions.onBackToPending()}>
      Pending Submissions
    </CButton>
  ) : null

  const retryButton = reviewActions?.onRetrySync ? (
    <CButton color="warning" variant="outline" onClick={() => reviewActions.onRetrySync()}>
      Retry Sync
    </CButton>
  ) : null

  const renderReviewActions = (className = '', isMobileSticky = false) => {
    if (isMobileSticky) {
      return (
        <FormActionGroup
          className={className}
          mobileThumb={false}
          leading={pendingButton || editButton}
          ariaLabel="Inspection review actions"
        >
          {pendingButton ? editButton : null}
          {retryButton}
          {reviewActions?.hideSaveDraft ? null : (
            <CButton color="secondary" onClick={() => reviewActions?.onSaveDraft?.()}>
              Save Draft
            </CButton>
          )}
          <CButton
            color="primary"
            disabled={isSubmittingReview || reviewActions?.confirmDisabled}
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
        {pendingButton}
        {editButton}
        {retryButton}
        {reviewActions?.hideSaveDraft ? null : (
          <CButton color="secondary" onClick={() => reviewActions?.onSaveDraft?.()}>
            Save Draft
          </CButton>
        )}
        <CButton
          color="primary"
          disabled={isSubmittingReview || reviewActions?.confirmDisabled}
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
          <h2 className="inspection-review-title mb-1">{inspectionType || 'Inspection'}</h2>
          <div className="inspection-review-meta">
            {summaryCount ? <div>{summaryCount}</div> : null}
            {r.displayId ? <div className="inspection-review-id">{r.displayId}</div> : null}
          </div>
        </div>
        <div className="inspection-review-hero__status">
          {getReviewStatusBadge(statusLabel, renderStatusBadge)}
        </div>
      </div>

      {queueWarning ? (
        <CAlert color="warning" className="mb-0">
          {queueWarning}
        </CAlert>
      ) : null}

      {blockers.length > 0 ? (
        <CAlert color="warning" className="mb-0">
          {blockers.map((blocker) => (
            <div key={blocker.key}>{blocker.message}</div>
          ))}
        </CAlert>
      ) : null}

      <ReviewSectionBlock title="Inspection Details">
        <CRow className="g-3">
          {isSubmissionReview ? null : (
            <>
              <DetailField label="Status" xs={12} md={detailFieldWidth}>
                {getReviewStatusBadge(statusLabel, renderStatusBadge)}
              </DetailField>
              <DetailField label="Type" xs={12} md={detailFieldWidth}>
                {inspectionType || '--'}
              </DetailField>
            </>
          )}
          <DetailField label="Inspection Date/Time" xs={12} md={detailFieldWidth}>
            {inspectedAt || '--'}
          </DetailField>
          <DetailField label="Location" xs={12} md={detailFieldWidth}>
            {r.location || '--'}
          </DetailField>
        </CRow>
        {!isSubmissionReview && (submittedBy || submittedAt || submittedRole) ? (
          <CRow className="g-3">
            {submittedBy ? (
              <DetailField label="Submitted By" xs={12} md={4}>
                {submittedBy}
              </DetailField>
            ) : null}
            {submittedRole ? (
              <DetailField label="Role" xs={12} md={4}>
                {submittedRole}
              </DetailField>
            ) : null}
            {submittedAt ? (
              <DetailField label="Submitted At" xs={12} md={4}>
                {submittedAt}
              </DetailField>
            ) : null}
          </CRow>
        ) : null}
      </ReviewSectionBlock>

      <InspectionReviewLocationSummary summary={reviewSummary} />

      {!isGeneral && text(r.description) ? (
        <ReviewSectionBlock title="Description">
          <div style={{ whiteSpace: 'pre-wrap' }}>{r.description}</div>
        </ReviewSectionBlock>
      ) : null}

      {ReadOnlySection && hasStructuredSummaryContent(readOnlySummary) ? (
        <ReviewSectionBlock title={selectedTypeDefinition?.itemReviewTitle || 'Checked Items'}>
          <ReadOnlySection
            mainLocation={form.mainLocation}
            mainLocationLabel={mainLocationLabel}
            form={form}
            summary={readOnlySummary}
          />
        </ReviewSectionBlock>
      ) : null}

      <ReviewSectionBlock title={INSPECTION_REPORT_EVIDENCE_COPY.sectionTitle}>
        <InspectionGeneralEvidenceCard
          readOnly
          title={INSPECTION_REPORT_EVIDENCE_COPY.sectionTitle}
          photos={form.photos}
          remarks={form.reportRemarks}
          emptyMessage={INSPECTION_REPORT_EVIDENCE_COPY.emptyPhotosMessage}
          remarksLabel={INSPECTION_REPORT_EVIDENCE_COPY.remarksLabel}
        />
      </ReviewSectionBlock>

      {renderReviewActions('justify-content-end d-none d-md-flex')}
      {renderReviewActions('inspection-review-inline-actions d-md-none', true)}
    </section>
  )
}

export default InspectionReviewSection
