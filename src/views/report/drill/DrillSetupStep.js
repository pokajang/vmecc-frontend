import React from 'react'
import { CButton, CCol, CFormInput, CFormLabel, CRow } from '@coreui/react'
import { DRILL_ENVIRONMENT_OPTIONS, DRILL_LOCATION_OPTIONS, DRILL_TYPE_OPTIONS } from './constants'
import SelectionCards from '../components/SelectionCards'

const DrillSetupStep = ({
  form,
  setForm,
  setupFieldErrors,
  setSetupFieldErrors,
  datePresetOptions,
  timePresetOptions,
  onContinue,
}) => {
  const updateSetupField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSetupFieldErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  return (
    <div className="mb-3 d-grid gap-4">
      <div className="d-grid gap-4">
        <SelectionCards
          label="Choose Drill Type"
          options={DRILL_TYPE_OPTIONS}
          selectedValue={form.incidentType}
          onSelect={(value) => updateSetupField('incidentType', value)}
        />
        <SelectionCards
          label="Choose Environment / Condition"
          options={DRILL_ENVIRONMENT_OPTIONS}
          selectedValue={form.weather}
          onSelect={(value) => updateSetupField('weather', value)}
          cols={{ xs: 6, md: 4 }}
        />
        <SelectionCards
          label="Choose Drill Location"
          options={DRILL_LOCATION_OPTIONS}
          selectedValue={form.location}
          onSelect={(value) => updateSetupField('location', value)}
        />
        <SelectionCards
          label="Choose Drill Date"
          options={datePresetOptions}
          selectedValue={form.reportDate}
          onSelect={(value) => updateSetupField('reportDate', value)}
          cols={{ xs: 6, md: 6 }}
        />
        <CRow className="g-2">
          <CCol xs={12} md={4}>
            <CFormLabel>Custom Drill Date</CFormLabel>
            <CFormInput
              type="date"
              value={form.reportDate}
              invalid={Boolean(setupFieldErrors.reportDate)}
              onChange={(event) => updateSetupField('reportDate', event.target.value)}
            />
          </CCol>
        </CRow>
        <SelectionCards
          label="Choose Start Time"
          options={timePresetOptions}
          selectedValue={form.reportTime}
          onSelect={(value) => updateSetupField('reportTime', value)}
          cols={{ xs: 6, md: 3 }}
        />
        <CRow className="g-2">
          <CCol xs={12} md={4}>
            <CFormLabel>Custom Start Time</CFormLabel>
            <CFormInput
              type="time"
              value={form.reportTime}
              invalid={Boolean(setupFieldErrors.reportTime)}
              onChange={(event) => updateSetupField('reportTime', event.target.value)}
            />
          </CCol>
        </CRow>
        <div className="d-flex flex-column flex-sm-row justify-content-end gap-2">
          <CButton color="primary" onClick={onContinue}>
            Continue
          </CButton>
        </div>
      </div>
    </div>
  )
}

export default DrillSetupStep
