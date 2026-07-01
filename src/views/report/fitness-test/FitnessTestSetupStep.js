import React, { useState } from 'react'
import { CButton, CCol, CFormInput, CFormLabel, CRow } from '@coreui/react'
import CreateActionButton from 'src/components/CreateActionButton'
import IconOptionGrid from 'src/components/IconOptionGrid'
import {
  FITNESS_TEST_CONDITION_OPTIONS,
  FITNESS_TEST_LOCATION_OPTIONS,
  FITNESS_TEST_TYPE_OPTIONS,
} from './constants'
import SelectionCards from '../components/SelectionCards'

const FitnessTestSetupStep = ({
  form,
  setForm,
  setupFieldErrors,
  setSetupFieldErrors,
  datePresetOptions,
  timePresetOptions,
  onContinue,
}) => {
  const [isEditingType, setIsEditingType] = useState(() => !String(form.incidentType || '').trim())

  const updateSetupField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSetupFieldErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const showTypePicker = isEditingType || !String(form.incidentType || '').trim()

  return (
    <div className="mb-3 d-grid gap-4">
      <div className="d-grid gap-4">
        <div className="d-grid gap-3">
          {!showTypePicker ? (
            <>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div className="fw-semibold text-muted">Type</div>
                <CreateActionButton
                  label="Edit"
                  showIcon={false}
                  onClick={() => setIsEditingType(true)}
                />
              </div>
              <div className="border rounded-3 bg-white p-3">
                <div className="fw-semibold">{form.incidentType}</div>
              </div>
            </>
          ) : (
            <>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div className="fw-semibold text-muted">Choose Fitness Test Type</div>
                {form.incidentType ? (
                  <CreateActionButton
                    label="Done"
                    showIcon={false}
                    onClick={() => setIsEditingType(false)}
                  />
                ) : null}
              </div>
              <IconOptionGrid
                options={FITNESS_TEST_TYPE_OPTIONS}
                value={form.incidentType}
                onChange={(nextValue) => {
                  updateSetupField('incidentType', String(nextValue || '').trim())
                  setIsEditingType(false)
                }}
                variant="compact"
                showDescription
                columns={{ xs: 6, md: 3 }}
              />
            </>
          )}
        </div>
        <SelectionCards
          label="Choose Test Condition"
          options={FITNESS_TEST_CONDITION_OPTIONS}
          selectedValue={form.weather}
          onSelect={(value) => updateSetupField('weather', value)}
          cols={{ xs: 6, md: 4 }}
        />
        <SelectionCards
          label="Choose Test Location"
          options={FITNESS_TEST_LOCATION_OPTIONS}
          selectedValue={form.location}
          onSelect={(value) => updateSetupField('location', value)}
        />
        <SelectionCards
          label="Choose Test Date"
          options={datePresetOptions}
          selectedValue={form.reportDate}
          onSelect={(value) => updateSetupField('reportDate', value)}
          cols={{ xs: 6, md: 6 }}
        />
        <CRow className="g-2">
          <CCol xs={12} md={4}>
            <CFormLabel>Custom Test Date</CFormLabel>
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

export default FitnessTestSetupStep
