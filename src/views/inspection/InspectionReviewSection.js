import React from 'react'
import { CAlert, CBadge, CButton, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import FormActionGroup from 'src/components/FormActionGroup'
import { getInspectionTypeDefinition } from './app/inspectionTypeRegistry'
import { formatTimestamp } from './inspectionSharedUtils'
import { DetailField } from 'src/components/report-workflow/ReportViewComponents'
import { stripInspectionContext } from './typeOptionUtils'
import {
  InspectionGeneralEvidenceCard,
  formatInspectionDisplayLocationTitle,
} from './components/InspectionFormDisplaySections'
import { recordToInspectionForm } from './inspectionFormHelpers'

const hasStructuredSummaryContent = (summary) =>
  Array.isArray(summary?.visibleChecks)
    ? summary.visibleChecks.length > 0
    : Array.isArray(summary?.visibleSections)
      ? summary.visibleSections.some(
          (section) => Array.isArray(section?.visibleRows) && section.visibleRows.length > 0,
        )
      : false

const InspectionReviewSection = ({
  selectedRecord,
  renderStatusBadge,
  reviewActions = null,
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
  const readOnlySummary = selectedTypeDefinition?.getSummary?.({
    ...form,
    ...(selectedTypeDefinition?.checksField
      ? {
          [selectedTypeDefinition.checksField]: form[selectedTypeDefinition.checksField] || [],
          [selectedTypeDefinition.equipmentRowsField]:
            form[selectedTypeDefinition.checksField] || [],
        }
      : {}),
  })
  const mainLocationLabel = formatInspectionDisplayLocationTitle(r.incidentType, form.mainLocation)
  const ReadOnlySection = selectedTypeDefinition?.ReadOnlySection || null
  const checklist = (Array.isArray(r.checklist) ? r.checklist : []).filter(
    (item) => item && item.selected !== false && String(item.label || '').trim(),
  )
  const submittedAt = formatTimestamp(r.submittedAt, '')
  const submittedBy = String(r.submittedBy || '').trim()
  const backButton = (
    <CButton color="light" onClick={() => reviewActions?.onBackToEdit?.()}>
      Back to Edit
    </CButton>
  )
  const renderReviewActions = (className = '', isMobileSticky = false) => {
    if (isMobileSticky) {
      return (
        <FormActionGroup
          className={className}
          mobileVariant="compact-sticky"
          leading={backButton}
          statusMessage="Review inspection details before final submission."
          spacerClassName="inspection-review-sticky-spacer d-md-none"
          ariaLabel="Inspection review actions"
        >
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
        </FormActionGroup>
      )
    }

    return (
      <div
        className={`inspection-review-actions d-flex flex-column flex-sm-row gap-2 ${className}`.trim()}
      >
        {backButton}
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
      </div>
    )
  }
  const renderReviewContent = () => (
    <CRow className="g-4">
      {queueWarning ? (
        <CCol xs={12}>
          <CAlert color="warning" className="mb-0">
            {queueWarning}
          </CAlert>
        </CCol>
      ) : null}

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
          <DetailField label="Type" xs={12} md={4}>
            {stripInspectionContext(r.incidentType) || '--'}
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
            <div className="small text-muted">Description</div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{r.description}</div>
          </div>
        ) : (
          <div className="text-body-secondary small">No description provided.</div>
        )}
      </CCol>

      {checklist.length > 0 ? (
        <CCol xs={12}>
          <div className="d-grid gap-2">
            <div className="fw-semibold text-muted">Checklist</div>
            <div className="d-flex flex-wrap gap-2">
              {checklist.map((item) => (
                <span
                  key={item.id || item.label}
                  className="inspection-checklist-pill badge text-bg-light border text-body"
                >
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </CCol>
      ) : null}

      {ReadOnlySection && hasStructuredSummaryContent(readOnlySummary) ? (
        <CCol xs={12}>
          <ReadOnlySection
            mainLocation={form.mainLocation}
            mainLocationLabel={mainLocationLabel}
            form={form}
            summary={readOnlySummary}
          />
        </CCol>
      ) : null}

      <CCol xs={12}>
        <InspectionGeneralEvidenceCard
          readOnly
          title={selectedTypeDefinition?.photoEvidenceTitle || 'Upload Photos and Describe'}
          photos={r.photos}
          emptyMessage={
            selectedTypeDefinition?.formMode === 'structured'
              ? 'No general evidence photos added.'
              : 'No inspection photos were added.'
          }
        />
      </CCol>

      <CCol xs={12}>{renderReviewActions('justify-content-end d-none d-md-flex')}</CCol>
    </CRow>
  )

  return (
    <>
      <div className="inspection-mobile-section d-md-none">
        <div className="fw-semibold mb-3">{r.displayId}</div>
        {renderReviewContent()}
        {renderReviewActions('inspection-review-sticky-actions d-md-none', true)}
      </div>
      <CCard className="d-none d-md-block">
        <CCardHeader>
          <strong>{r.displayId}</strong>
        </CCardHeader>
        <CCardBody>{renderReviewContent()}</CCardBody>
      </CCard>
    </>
  )
}

export default InspectionReviewSection
