import React from 'react'
import { CAlert, CCol, CRow } from '@coreui/react'
import ReportPhotoGallery from 'src/components/report-workflow/ReportPhotoGallery'
import WorkflowStatusChoice from 'src/components/report-workflow/WorkflowStatusChoice'
import {
  ER_ASSEMBLY_AREA_FIELD_SUFFIX,
  ER_FIELD_LABELS,
  ER_RESPONSE_FIELD_LABEL,
  ER_RESPONSE_OPTIONS,
  getErAssessmentType,
} from './constants'

const Value = ({ label, children, md = 6 }) => (
  <CCol xs={12} md={md}>
    <div className="small text-body-secondary">{label}</div>
    <div className="fw-semibold" style={{ whiteSpace: 'pre-wrap' }}>
      {children || '--'}
    </div>
  </CCol>
)

const Section = ({ title, children, onEdit }) => (
  <section className="inspection-form-section d-grid gap-3 er-assessment-readonly-section">
    <div className="d-flex justify-content-between align-items-center gap-3">
      <h3 className="h6 text-muted mb-0">{title}</h3>
      {onEdit ? (
        <button
          type="button"
          className="btn btn-link btn-sm p-0"
          aria-label={`Edit ${title}`}
          onClick={onEdit}
        >
          Edit
        </button>
      ) : null}
    </div>
    {children}
  </section>
)

const requirementHasNoResponse = (row) =>
  String(row?.response || '')
    .trim()
    .toLowerCase() === 'no'
const isEscapeRouteRequirement = (row) =>
  String(row?.requirementId || '').endsWith(ER_ASSEMBLY_AREA_FIELD_SUFFIX)

const RequirementResponseCard = ({ row, index, showNoOnly = false }) => {
  const hasRemarks = String(row?.remarks || '').trim().length > 0
  const hasAssemblyArea =
    isEscapeRouteRequirement(row) && String(row?.assemblyArea || '').trim().length > 0
  const photos = requirementHasNoResponse(row)
    ? (Array.isArray(row?.photos) ? row.photos : []).filter((photo) =>
        String(photo?.url || '').trim(),
      )
    : []

  return (
    <div className="er-assessment-readonly-response">
      <div className="d-flex justify-content-between align-items-start gap-3">
        <div>
          <span className="text-body-secondary me-2">{index + 1}.</span>
          {row?.requirement || '--'}
        </div>
        <WorkflowStatusChoice
          readOnly
          showLabel={false}
          value={row?.response || '--'}
          options={ER_RESPONSE_OPTIONS}
          ariaLabel={`Requirement ${index + 1} response`}
        />
      </div>
      {hasRemarks ? (
        <div className="small mt-2">
          <span className="text-body-secondary">{ER_RESPONSE_FIELD_LABEL}:</span> {row?.remarks}
        </div>
      ) : null}
      {hasAssemblyArea ? (
        <div className="small mt-2">
          <span className="text-body-secondary">{ER_FIELD_LABELS.assemblyArea}:</span>{' '}
          {row?.assemblyArea}
        </div>
      ) : null}
      {photos.length ? (
        <ReportPhotoGallery
          photos={photos}
          title="Supporting evidence"
          contextLabel={`Evidence for ${row?.requirement || `requirement ${index + 1}`}`}
          hiddenDescriptionValues={[row?.requirement, row?.remarks]}
        />
      ) : null}
      {showNoOnly && !hasRemarks && !hasAssemblyArea && isEscapeRouteRequirement(row) ? (
        <div className="small mt-2 text-body-secondary">No readiness gap recorded.</div>
      ) : null}
    </div>
  )
}

const ErAssessmentReadOnlySections = ({ report, onEdit }) => {
  const type = getErAssessmentType(
    report?.assessmentType || report?.assessmentTypeLabel || report?.incidentType,
  )
  const responses = Array.isArray(report?.responses) ? report.responses : []
  const noResponses = responses.filter(requirementHasNoResponse)
  const nonNoResponses = responses.filter((row) => !requirementHasNoResponse(row))
  const equipment = (Array.isArray(report?.rescueEquipment) ? report.rescueEquipment : []).filter(
    Boolean,
  )
  const layout = report?.rescueAccessLayout

  return (
    <div className="d-grid gap-4">
      <Section title="Readiness findings" onEdit={onEdit ? () => onEdit('requirements') : null}>
        {noResponses.length ? (
          <div className="d-grid gap-3">
            {noResponses.map((row, index) => (
              <RequirementResponseCard
                key={`${row.requirement}-finding-${index}`}
                row={row}
                index={index}
                showNoOnly
              />
            ))}
          </div>
        ) : (
          <div className="text-body-secondary">No readiness gaps recorded.</div>
        )}
      </Section>

      <Section title="Assessment context" onEdit={onEdit ? () => onEdit('setup') : null}>
        <CRow className="g-3">
          <Value label={ER_FIELD_LABELS.assessmentType}>
            {report?.assessmentTypeLabel || report?.incidentType || type?.label}
          </Value>
          <Value label={ER_FIELD_LABELS.assessmentDate}>
            {report?.assessmentDate || report?.reportDate}
          </Value>
          <Value label={ER_FIELD_LABELS.company}>{report?.company}</Value>
          <Value label={ER_FIELD_LABELS.location}>{report?.location}</Value>
          <Value label={ER_FIELD_LABELS.scopeOfWork} md={12}>
            {report?.scopeOfWork || report?.details}
          </Value>
        </CRow>
        {report?.worstCaseScenario || type?.worstCase ? (
          <CAlert color="warning" className="mb-0">
            <strong>Credible worst-case scenario:</strong>{' '}
            {report?.worstCaseScenario || type?.worstCase}
          </CAlert>
        ) : null}
      </Section>

      <Section
        title="Emergency response readiness"
        onEdit={onEdit ? () => onEdit('requirements') : null}
      >
        {nonNoResponses.length ? (
          <div className="d-grid gap-3">
            {nonNoResponses.map((row, index) => (
              <RequirementResponseCard
                key={`${row.requirement}-response-${index}`}
                row={row}
                index={index}
                showNoOnly={false}
              />
            ))}
          </div>
        ) : (
          <div className="text-body-secondary">
            All remaining responses are compliant or noted as N/A.
          </div>
        )}
      </Section>

      <Section title="Rescue planning" onEdit={onEdit ? () => onEdit('rescue') : null}>
        <div>
          <div className="small text-body-secondary">Rescue Plan</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>
            {report?.rescuePlan || report?.summary || '--'}
          </div>
        </div>
        {layout?.url ? (
          <figure className="mb-0">
            <img
              className="er-assessment-readonly-layout"
              src={layout.url}
              alt="Rescue access layout"
            />
            <figcaption className="small text-body-secondary mt-2">Rescue access layout</figcaption>
          </figure>
        ) : (
          <div className="text-body-secondary">No rescue access layout attached.</div>
        )}
      </Section>

      <Section title="Rescue equipment" onEdit={onEdit ? () => onEdit('equipment') : null}>
        {equipment.length ? (
          <ol className="mb-0 ps-4">
            {equipment.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ol>
        ) : (
          <div className="text-body-secondary">No equipment listed.</div>
        )}
      </Section>

      <Section title="Assessment sign-off" onEdit={onEdit ? () => onEdit('signoff') : null}>
        <CRow className="g-3">
          {[
            ['inspectedBy', 'Inspected by'],
            ['jobLeader', 'Job Leader'],
          ].map(([key, label]) => (
            <CCol xs={12} md={6} key={key}>
              <div className="er-assessment-readonly-signatory">
                <div className="small text-body-secondary">{label}</div>
                <div className="fw-semibold">{report?.[key]?.name || '--'}</div>
                <div>{report?.[key]?.company || '--'}</div>
                <div className="small fst-italic mt-2">
                  Signed: {report?.[key]?.signature || '--'}
                </div>
              </div>
            </CCol>
          ))}
        </CRow>
      </Section>
    </div>
  )
}

export default ErAssessmentReadOnlySections
