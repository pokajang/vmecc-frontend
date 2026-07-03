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
import {
  formatInspectionRole,
  isGeneralInspectionType,
  recordToInspectionForm,
} from './inspectionFormHelpers'

const hasStructuredSummaryContent = (summary) =>
  summary?.hasContent === true ||
  (Array.isArray(summary?.visibleChecks)
    ? summary.visibleChecks.length > 0
    : Array.isArray(summary?.visibleSections)
      ? summary.visibleSections.some(
          (section) => Array.isArray(section?.visibleRows) && section.visibleRows.length > 0,
        )
      : false)

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
  const isGeneral = isGeneralInspectionType(r.incidentType || form.inspectionType)
  const mainLocationLabel = formatInspectionDisplayLocationTitle(r.incidentType, form.mainLocation)
  const ReadOnlySection = selectedTypeDefinition?.ReadOnlySection || null
  const inspectedAt = formatTimestamp(form.inspectedAt || r.inspectedAt, '')
  const submittedAt = formatTimestamp(r.submittedAt, '')
  const submittedBy = String(r.submittedBy || '').trim()
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
          <DetailField label="Status" xs={12} md={3}>
            {typeof renderStatusBadge === 'function' ? (
              renderStatusBadge(r.status)
            ) : (
              <CBadge color="secondary">{r.status || 'Unknown'}</CBadge>
            )}
          </DetailField>
          <DetailField label="Type" xs={12} md={3}>
            {selectedTypeDefinition?.title || stripInspectionContext(r.incidentType) || '--'}
          </DetailField>
          <DetailField label="Inspection Date/Time" xs={12} md={3}>
            {inspectedAt || '--'}
          </DetailField>
          <DetailField label="Location" xs={12} md={3}>
            {r.location || '--'}
          </DetailField>
        </CRow>
      </CCol>

      {submittedBy || submittedAt || submittedRole ? (
        <CCol xs={12}>
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
        </CCol>
      ) : null}

      {!isGeneral ? (
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
