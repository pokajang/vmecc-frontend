import React, { useState } from 'react'
import { CButton, CCol, CFormFeedback, CFormInput, CFormLabel, CRow } from '@coreui/react'
import IconOptionGrid from 'src/components/IconOptionGrid'
import {
  FITNESS_TEST_CONDITION_OPTIONS,
  FITNESS_TEST_LOCATION_OPTIONS,
  FITNESS_TEST_TYPE_OPTIONS,
} from './constants'
import SelectionCards from '../components/SelectionCards'
import { ReportSetupActions, ReportSetupSummaryRow } from '../components/ReportWorkflowUi'

const FitnessTestSetupStep = ({
  form,
  setForm,
  setupFieldErrors,
  setSetupFieldErrors,
  datePresetOptions,
  timePresetOptions,
  onSaveDraft,
  onContinue,
  saveLabel = 'Save Draft',
  draftStatus = '',
}) => {
  const [isEditingType, setIsEditingType] = useState(() => !String(form.incidentType || '').trim())
  const [isEditingCondition, setIsEditingCondition] = useState(
    () => !String(form.weather || '').trim(),
  )
  const [isEditingLocation, setIsEditingLocation] = useState(
    () => !String(form.location || '').trim(),
  )
  const [isEditingDateTime, setIsEditingDateTime] = useState(
    () => !String(form.reportDate || '').trim() || !String(form.reportTime || '').trim(),
  )

  const updateSetupField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSetupFieldErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const showTypePicker = isEditingType || !String(form.incidentType || '').trim()
  const showConditionPicker = isEditingCondition || !String(form.weather || '').trim()
  const showLocationPicker = isEditingLocation || !String(form.location || '').trim()
  const showDateTimePicker =
    isEditingDateTime ||
    !String(form.reportDate || '').trim() ||
    !String(form.reportTime || '').trim()
  return (
    <div className="mb-3 d-grid gap-4" data-testid="fitness-test-report-setup-ready">
      <div className="report-setup-grid mobile-setup-picker d-grid gap-4">
        <div
          className="d-grid gap-3"
          data-fitness-test-field="incidentType"
          aria-invalid={Boolean(setupFieldErrors.incidentType) || undefined}
        >
          {!showTypePicker ? (
            <>
              <ReportSetupSummaryRow
                label="Type"
                value={form.incidentType}
                showDesktop
                onEdit={() => setIsEditingType(true)}
                onReset={() => {
                  updateSetupField('incidentType', '')
                  setIsEditingType(true)
                }}
              />
            </>
          ) : (
            <>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div className="fw-semibold text-muted">Choose Fitness Test Type</div>
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
                cardProps={{ className: 'report-option-card' }}
              />
              {form.incidentType ? (
                <div className="report-setup-confirm-row">
                  <CButton
                    type="button"
                    color="secondary"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingType(false)}
                  >
                    Confirm Test Type
                  </CButton>
                </div>
              ) : null}
            </>
          )}
        </div>
        <div
          data-fitness-test-field="weather"
          aria-invalid={Boolean(setupFieldErrors.weather) || undefined}
        >
          {form.weather && !showConditionPicker ? (
            <ReportSetupSummaryRow
              label="Condition"
              value={form.weather}
              showDesktop
              onEdit={() => setIsEditingCondition(true)}
              onReset={() => {
                updateSetupField('weather', '')
                setIsEditingCondition(true)
              }}
            />
          ) : null}
          <div className={form.weather && !showConditionPicker ? 'd-none' : ''}>
            <SelectionCards
              label="Choose Test Condition"
              options={FITNESS_TEST_CONDITION_OPTIONS}
              selectedValue={form.weather}
              onSelect={(value) => {
                updateSetupField('weather', value)
                setIsEditingCondition(false)
              }}
              cols={{ xs: 6, md: 4 }}
            />
          </div>
        </div>
        <div
          data-fitness-test-field="location"
          aria-invalid={Boolean(setupFieldErrors.location) || undefined}
        >
          {form.location && !showLocationPicker ? (
            <ReportSetupSummaryRow
              label="Location"
              value={form.location}
              showDesktop
              onEdit={() => setIsEditingLocation(true)}
              onReset={() => {
                updateSetupField('location', '')
                setIsEditingLocation(true)
              }}
            />
          ) : null}
          <div className={form.location && !showLocationPicker ? 'd-none' : ''}>
            <SelectionCards
              label="Choose Test Location"
              options={FITNESS_TEST_LOCATION_OPTIONS}
              selectedValue={form.location}
              onSelect={(value) => {
                updateSetupField('location', value)
                setIsEditingLocation(false)
              }}
            />
          </div>
        </div>
        <div
          data-fitness-test-field="reportDate"
          aria-invalid={
            Boolean(setupFieldErrors.reportDate || setupFieldErrors.reportTime) || undefined
          }
        >
          {form.reportDate && form.reportTime && !showDateTimePicker ? (
            <ReportSetupSummaryRow
              label="Date & Time"
              value={form.reportDate}
              secondaryValue={form.reportTime}
              showDesktop
              onEdit={() => setIsEditingDateTime(true)}
              onReset={() => {
                updateSetupField('reportDate', '')
                updateSetupField('reportTime', '')
                setIsEditingDateTime(true)
              }}
            />
          ) : null}
          <div
            className={
              form.reportDate && form.reportTime && !showDateTimePicker ? 'd-none' : 'd-grid gap-3'
            }
          >
            <SelectionCards
              label="Choose Test Date"
              options={datePresetOptions}
              selectedValue={form.reportDate}
              onSelect={(value) => updateSetupField('reportDate', value)}
              cols={{ xs: 6, md: 6 }}
            />
            <CRow className="g-2">
              <CCol xs={12} md={4}>
                <CFormLabel htmlFor="fitness-test-date">Custom test date</CFormLabel>
                <CFormInput
                  id="fitness-test-date"
                  type="date"
                  value={form.reportDate}
                  invalid={Boolean(setupFieldErrors.reportDate)}
                  onChange={(event) => updateSetupField('reportDate', event.target.value)}
                />
                <CFormFeedback invalid>{setupFieldErrors.reportDate}</CFormFeedback>
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
                <CFormLabel htmlFor="fitness-test-time">Custom start time</CFormLabel>
                <CFormInput
                  id="fitness-test-time"
                  type="time"
                  value={form.reportTime}
                  invalid={Boolean(setupFieldErrors.reportTime)}
                  onChange={(event) => updateSetupField('reportTime', event.target.value)}
                />
                <CFormFeedback invalid>{setupFieldErrors.reportTime}</CFormFeedback>
              </CCol>
            </CRow>
            {form.reportDate && form.reportTime ? (
              <div className="report-setup-confirm-row">
                <CButton
                  type="button"
                  color="secondary"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingDateTime(false)}
                >
                  Confirm Date & Time
                </CButton>
              </div>
            ) : null}
          </div>
        </div>
        <ReportSetupActions
          onSaveDraft={onSaveDraft}
          onContinue={onContinue}
          saveLabel={saveLabel}
          statusMessage={draftStatus}
        />
      </div>
    </div>
  )
}

export default FitnessTestSetupStep
