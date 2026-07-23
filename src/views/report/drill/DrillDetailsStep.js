import React from 'react'
import {
  CAlert,
  CButton,
  CCol,
  CFormFeedback,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CRow,
} from '@coreui/react'
import { Plus, Trash2 } from 'lucide-react'
import { uid } from '../utils'
import { ReportMobileContextPanel } from '../components/ReportWorkflowUi'
import { DRILL_FIELD_LIMITS } from './constants'
import DrillStageActions from './DrillStageActions'

const DrillDetailsStep = ({
  form,
  setForm,
  fieldErrors,
  setFieldErrors,
  onBack,
  onSaveDraft,
  onContinue,
  saveLabel,
  draftStatus,
  blockerMessage,
  isSaving,
}) => {
  const objectives = Array.isArray(form.exerciseObjectives) ? form.exerciseObjectives : []
  const erpReferences = Array.isArray(form.erpReferences) ? form.erpReferences : []
  const updateObjective = (id, text) =>
    setForm((prev) => ({
      ...prev,
      exerciseObjectives: prev.exerciseObjectives.map((row) =>
        row.id === id ? { ...row, text } : row,
      ),
    }))
  const updateErp = (id, patch) => {
    setForm((prev) => ({
      ...prev,
      erpReferences: prev.erpReferences.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    }))
    const current = erpReferences.find((row) => row.id === id) || {}
    const next = { ...current, ...patch }
    const number = String(next.annexNumber || '').trim()
    const title = String(next.title || '').trim()
    if ((number && title) || (!number && !title)) {
      setFieldErrors((prev) => {
        const result = { ...prev }
        delete result[`erpReferences.${id}`]
        return result
      })
    }
  }

  return (
    <div className="d-grid gap-4">
      <ReportMobileContextPanel
        title="Drill Context"
        items={[
          { label: 'Type', value: form.incidentType },
          { label: 'Location', value: form.location },
          { label: 'Date', value: form.reportDate },
          {
            label: 'Personnel',
            value: `${(form.respondingAttendance || []).filter((row) => row?.present).length} selected`,
          },
        ]}
      />

      <div data-drill-field="details" aria-invalid={Boolean(fieldErrors.details) || undefined}>
        <CFormLabel htmlFor="drill-exercise-title" className="fw-semibold">
          Exercise title (optional)
        </CFormLabel>
        <CFormInput
          id="drill-exercise-title"
          maxLength={DRILL_FIELD_LIMITS.shortText}
          value={form.exerciseTitle || ''}
          placeholder="e.g. Major fire response exercise"
          onChange={(event) => setForm((prev) => ({ ...prev, exerciseTitle: event.target.value }))}
        />
      </div>

      <div>
        <CFormLabel htmlFor="drill-details" className="fw-semibold">
          Drill scenario
        </CFormLabel>
        <CFormTextarea
          id="drill-details"
          rows={4}
          maxLength={DRILL_FIELD_LIMITS.narrative}
          value={form.details || ''}
          invalid={Boolean(fieldErrors.details)}
          onChange={(event) => {
            const value = event.target.value
            setForm((prev) => ({ ...prev, details: value }))
            if (value.trim()) {
              setFieldErrors((prev) => {
                const next = { ...prev }
                delete next.details
                return next
              })
            }
          }}
        />
        <CFormFeedback invalid>{fieldErrors.details}</CFormFeedback>
      </div>

      <section
        className="d-grid gap-2"
        aria-labelledby="drill-objectives-title"
        data-drill-field="exerciseObjectives"
        aria-invalid={Boolean(fieldErrors.exerciseObjectives) || undefined}
      >
        <div className="d-flex justify-content-between align-items-center gap-2">
          <div id="drill-objectives-title" className="fw-semibold">
            Exercise objectives (optional)
          </div>
          <CButton
            type="button"
            color="light"
            size="sm"
            disabled={objectives.length >= DRILL_FIELD_LIMITS.objectives}
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                exerciseObjectives: [
                  ...(Array.isArray(prev.exerciseObjectives) ? prev.exerciseObjectives : []),
                  { id: `objective-${uid()}`, text: '' },
                ],
              }))
            }
          >
            <Plus size={14} className="me-1" /> Add objective
          </CButton>
        </div>
        <div className="small text-body-secondary">
          {objectives.length}/{DRILL_FIELD_LIMITS.objectives} objectives
        </div>
        {fieldErrors.exerciseObjectives ? (
          <CAlert color="danger" className="mb-0 py-2">
            {fieldErrors.exerciseObjectives}
          </CAlert>
        ) : null}
        {objectives.map((row, index) => (
          <div key={row.id} className="d-flex gap-2 align-items-start">
            <CFormInput
              aria-label={`Exercise objective ${index + 1}`}
              maxLength={DRILL_FIELD_LIMITS.listItem}
              value={row.text || ''}
              placeholder="What should this exercise test or demonstrate?"
              onChange={(event) => updateObjective(row.id, event.target.value)}
            />
            <CButton
              type="button"
              color="light"
              aria-label={`Remove exercise objective ${index + 1}`}
              disabled={objectives.length <= 1}
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  exerciseObjectives: prev.exerciseObjectives.filter((item) => item.id !== row.id),
                }))
              }
            >
              <Trash2 size={16} />
            </CButton>
          </div>
        ))}
      </section>

      <section
        className="d-grid gap-2"
        aria-labelledby="drill-erp-title"
        data-drill-field="erpReferences"
        aria-invalid={Boolean(fieldErrors.erpReferences) || undefined}
      >
        <div className="d-flex justify-content-between align-items-center gap-2">
          <div id="drill-erp-title" className="fw-semibold">
            ERP / Annex references (optional)
          </div>
          <CButton
            type="button"
            color="light"
            size="sm"
            disabled={erpReferences.length >= DRILL_FIELD_LIMITS.erpReferences}
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                erpReferences: [
                  ...(Array.isArray(prev.erpReferences) ? prev.erpReferences : []),
                  { id: `erp-${uid()}`, annexNumber: '', title: '' },
                ],
              }))
            }
          >
            <Plus size={14} className="me-1" /> Add reference
          </CButton>
        </div>
        <div className="small text-body-secondary">
          {erpReferences.length}/{DRILL_FIELD_LIMITS.erpReferences} references
        </div>
        {fieldErrors.erpReferences ? (
          <CAlert color="danger" className="mb-0 py-2">
            {fieldErrors.erpReferences}
          </CAlert>
        ) : null}
        {erpReferences.map((row, index) => {
          const error = fieldErrors[`erpReferences.${row.id}`]
          return (
            <div key={row.id} className="rounded-3 border p-3">
              <CRow className="g-2 align-items-end">
                <CCol xs={12} md={4}>
                  <CFormLabel htmlFor={`drill-erp-number-${row.id}`}>ERP / Annex number</CFormLabel>
                  <CFormInput
                    id={`drill-erp-number-${row.id}`}
                    maxLength={DRILL_FIELD_LIMITS.shortText}
                    value={row.annexNumber || ''}
                    invalid={Boolean(error)}
                    onChange={(event) => updateErp(row.id, { annexNumber: event.target.value })}
                  />
                </CCol>
                <CCol xs={12} md={7}>
                  <CFormLabel htmlFor={`drill-erp-title-${row.id}`}>Reference title</CFormLabel>
                  <CFormInput
                    id={`drill-erp-title-${row.id}`}
                    maxLength={DRILL_FIELD_LIMITS.erpTitle}
                    value={row.title || ''}
                    invalid={Boolean(error)}
                    onChange={(event) => updateErp(row.id, { title: event.target.value })}
                  />
                </CCol>
                <CCol xs={12} md={1} className="d-grid">
                  <CButton
                    type="button"
                    color="light"
                    aria-label={`Remove ERP reference ${index + 1}`}
                    disabled={erpReferences.length <= 1}
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        erpReferences: prev.erpReferences.filter((item) => item.id !== row.id),
                      }))
                    }
                  >
                    <Trash2 size={16} />
                  </CButton>
                </CCol>
              </CRow>
              {error ? <div className="invalid-feedback d-block">{error}</div> : null}
            </div>
          )
        })}
      </section>

      <div data-drill-field="summary" aria-invalid={Boolean(fieldErrors.summary) || undefined}>
        <CFormLabel htmlFor="drill-summary" className="fw-semibold">
          Outcome summary
        </CFormLabel>
        <CFormTextarea
          id="drill-summary"
          rows={5}
          maxLength={DRILL_FIELD_LIMITS.narrative}
          value={form.summary || ''}
          invalid={Boolean(fieldErrors.summary)}
          onChange={(event) => {
            const value = event.target.value
            setForm((prev) => ({ ...prev, summary: value }))
            if (value.trim()) {
              setFieldErrors((prev) => {
                const next = { ...prev }
                delete next.summary
                return next
              })
            }
          }}
        />
        <CFormFeedback invalid>{fieldErrors.summary}</CFormFeedback>
      </div>

      <DrillStageActions
        onBack={onBack}
        onSaveDraft={onSaveDraft}
        onContinue={onContinue}
        saveLabel={saveLabel}
        statusMessage={draftStatus}
        blockerMessage={blockerMessage}
        isSaving={isSaving}
      />
    </div>
  )
}

export default DrillDetailsStep
