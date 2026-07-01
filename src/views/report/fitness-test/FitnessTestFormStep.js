import React from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCol,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CRow,
} from '@coreui/react'
import FormActionGroup from 'src/components/FormActionGroup'

const LOCAL_DRAFT_MESSAGE = 'Saved locally. Keep browser data to recover later.'

const FitnessTestFormStep = ({
  form,
  fieldErrors,
  setForm,
  onEditSetup,
  addChronology,
  updateChronology,
  removeChronology,
  onClear,
  onSaveDraft,
  submitLabel = 'Submit Report',
}) => (
  <>
    <div className="mb-3 d-grid gap-3">
      <div>
        <CRow className="g-3">
          <CCol md={12}>
            <div className="rounded-3 border border-light-subtle p-2 p-md-3">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-1">
                <div className="small text-body-secondary">Fitness test setup</div>
                <CButton type="button" color="link" size="sm" className="p-0" onClick={onEditSetup}>
                  Edit Setup
                </CButton>
              </div>
              <div className="d-flex flex-wrap gap-2">
                <CBadge color="light" className="border text-body-secondary">
                  Type: {form.incidentType}
                </CBadge>
                <CBadge color="light" className="border text-body-secondary">
                  Condition: {form.weather}
                </CBadge>
                <CBadge color="light" className="border text-body-secondary">
                  Location: {form.location}
                </CBadge>
                <CBadge color="light" className="border text-body-secondary">
                  Date: {form.reportDate}
                </CBadge>
                <CBadge color="light" className="border text-body-secondary">
                  Start: {form.reportTime}
                </CBadge>
              </div>
            </div>
          </CCol>
          <CCol md={12}>
            <CFormLabel>Test Details</CFormLabel>
            <CFormTextarea
              rows={3}
              value={form.details}
              invalid={Boolean(fieldErrors.details)}
              onChange={(e) => setForm((p) => ({ ...p, details: e.target.value }))}
            />
          </CCol>
          <CCol md={12}>
            <CFormLabel>Test Summary</CFormLabel>
            <CFormTextarea
              rows={4}
              value={form.summary}
              invalid={Boolean(fieldErrors.summary)}
              onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
            />
          </CCol>
        </CRow>
      </div>
    </div>

    <div className="mb-3 d-grid gap-3">
      <div className="d-flex justify-content-between align-items-center">
        <h6 className="mb-0">Chronology of Test Activities</h6>
        <CButton type="button" color="light" onClick={addChronology}>
          Add Row
        </CButton>
      </div>
      <div>
        {fieldErrors.chronology ? <CAlert color="danger">{fieldErrors.chronology}</CAlert> : null}
        {form.chronology.map((row, idx) => (
          <CRow key={row.id} className="g-2 mb-2 align-items-end">
            <CCol xs={12} md={2}>
              <CFormLabel>Time</CFormLabel>
              <CFormInput
                type="time"
                value={row.time}
                onChange={(e) => updateChronology(row.id, { time: e.target.value })}
              />
            </CCol>
            <CCol xs={12} md={9}>
              <CFormLabel>Activity / Observation</CFormLabel>
              <CFormInput
                value={row.action}
                onChange={(e) => updateChronology(row.id, { action: e.target.value })}
              />
            </CCol>
            <CCol xs={12} md={1} className="d-grid">
              <CButton
                type="button"
                color="light"
                disabled={form.chronology.length <= 1}
                onClick={() => removeChronology(row.id)}
              >
                {idx === 0 ? 'Keep' : 'Del'}
              </CButton>
            </CCol>
          </CRow>
        ))}
      </div>
    </div>

    <div className="d-none d-md-flex flex-md-row justify-content-end gap-2 mb-4">
      <CButton type="button" color="light" onClick={onClear}>
        Reset
      </CButton>
      <CButton type="button" color="secondary" onClick={onSaveDraft}>
        Save Draft
      </CButton>
      <CButton type="submit" color="primary">
        {submitLabel}
      </CButton>
    </div>
    <FormActionGroup
      className="d-md-none mb-4"
      mobileVariant="compact-sticky"
      statusMessage={LOCAL_DRAFT_MESSAGE}
      leading={
        <CButton type="button" color="light" onClick={onClear}>
          Reset
        </CButton>
      }
    >
      <CButton type="button" color="secondary" variant="outline" onClick={onSaveDraft}>
        Save Draft
      </CButton>
      <CButton type="submit" color="primary">
        {submitLabel}
      </CButton>
    </FormActionGroup>
  </>
)

export default FitnessTestFormStep
