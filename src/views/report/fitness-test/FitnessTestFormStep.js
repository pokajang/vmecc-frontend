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

const FitnessTestFormStep = ({
  form,
  fieldErrors,
  setForm,
  setSetupConfirmed,
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
              <div className="small text-body-secondary mb-1">Fitness test setup</div>
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

    <div className="d-flex flex-column flex-sm-row justify-content-end gap-2 mb-4">
      <CButton type="button" color="light" onClick={() => setSetupConfirmed(false)}>
        Back
      </CButton>
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
  </>
)

export default FitnessTestFormStep
