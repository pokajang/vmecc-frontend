import React, { useState } from 'react'
import {
  CButton,
  CAlert,
  CCol,
  CFormCheck,
  CFormFeedback,
  CFormInput,
  CFormLabel,
  CRow,
} from '@coreui/react'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import CreateActionButton from 'src/components/CreateActionButton'
import IconOptionGrid from 'src/components/IconOptionGrid'
import TypeManagerModal from 'src/components/report-workflow/TypeManagerModal'
import { DRILL_ENVIRONMENT_OPTIONS, DRILL_EXERCISE_CATEGORY_OPTIONS } from './constants'
import SelectionCards from '../components/SelectionCards'
import { ReportSetupActions, ReportSetupSummaryRow } from '../components/ReportWorkflowUi'
import useDrillTypeManager, { DRILL_TYPE_TOGGLE_VALUE } from './useDrillTypeManager'
import useDrillLocationManager, { DRILL_LOCATION_TOGGLE_VALUE } from './useDrillLocationManager'
import { recordDrillTypeUsage } from './typeUsageStorage'

const TOGGLE_CARD_PROPS = {
  style: {
    backgroundColor: 'var(--cui-light-bg-subtle, #f8f9fa)',
    borderColor: 'var(--cui-border-color, #d8dbe0)',
    borderStyle: 'dashed',
  },
  className: 'report-option-card text-primary',
  iconContainerClassName: 'bg-body text-primary',
  titleClassName: 'fw-semibold text-primary',
}

const DrillSetupStep = ({
  user,
  form,
  setForm,
  setupFieldErrors,
  setSetupFieldErrors,
  datePresetOptions,
  timePresetOptions,
  pushToast,
  onSaveDraft,
  onContinue,
  saveLabel = 'Save Draft',
  draftStatus = '',
  blockerMessage = '',
  onReset,
}) => {
  const [isEditingType, setIsEditingType] = useState(() => !String(form.incidentType || '').trim())
  const [isEditingEnvironment, setIsEditingEnvironment] = useState(
    () => !String(form.weather || '').trim(),
  )
  const [isEditingCategories, setIsEditingCategories] = useState(
    () => !Array.isArray(form.exerciseCategories) || form.exerciseCategories.length === 0,
  )
  const [isEditingLocation, setIsEditingLocation] = useState(
    () => !String(form.location || '').trim(),
  )
  const [isEditingDateTime, setIsEditingDateTime] = useState(
    () => !String(form.reportDate || '').trim() || !String(form.reportTime || '').trim(),
  )
  const [deleteTypeTarget, setDeleteTypeTarget] = useState(null)
  const [deleteLocationTarget, setDeleteLocationTarget] = useState(null)

  const updateSetupField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSetupFieldErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const showTypePicker = isEditingType || !String(form.incidentType || '').trim()
  const showEnvironmentPicker = isEditingEnvironment || !String(form.weather || '').trim()
  const showLocationPicker = isEditingLocation || !String(form.location || '').trim()
  const showDateTimePicker =
    isEditingDateTime ||
    !String(form.reportDate || '').trim() ||
    !String(form.reportTime || '').trim()
  const dateTimeLabel = `${[form.reportDate, form.reportTime].filter(Boolean).join(' ')}${
    form.reportIssuanceDate ? ` | Issued ${form.reportIssuanceDate}` : ''
  }`

  const drillType = useDrillTypeManager({
    userId: user?.id,
    selectedType: form.incidentType,
    updateSetupField,
    pushToast,
  })
  const drillLocation = useDrillLocationManager({
    userId: user?.id,
    selectedLocation: form.location,
    updateSetupField,
    pushToast,
  })

  return (
    <div className="mb-3 d-grid gap-4">
      <ActionConfirmModal
        visible={Boolean(deleteTypeTarget)}
        testId="drill-report-type-manager-delete-modal"
        title="Delete Type"
        message={
          deleteTypeTarget?.label
            ? `Delete "${deleteTypeTarget.label}"? This cannot be undone.`
            : 'Delete this type?'
        }
        confirmLabel="Delete"
        confirmColor="danger"
        onClose={() => setDeleteTypeTarget(null)}
        onConfirm={() => {
          if (deleteTypeTarget?.value) drillType.removeType(deleteTypeTarget.value)
          setDeleteTypeTarget(null)
        }}
      />
      <ActionConfirmModal
        visible={Boolean(deleteLocationTarget)}
        testId="drill-report-location-manager-delete-modal"
        title="Delete Location"
        message={
          deleteLocationTarget?.label
            ? `Delete "${deleteLocationTarget.label}"? This cannot be undone.`
            : 'Delete this location?'
        }
        confirmLabel="Delete"
        confirmColor="danger"
        onClose={() => setDeleteLocationTarget(null)}
        onConfirm={() => {
          if (deleteLocationTarget?.value) drillLocation.removeType(deleteLocationTarget.value)
          setDeleteLocationTarget(null)
        }}
      />

      <TypeManagerModal
        visible={drillType.showAddTypeModal}
        testId="drill-report-type-manager-modal"
        onClose={drillType.closeAddModal}
        editMode={drillType.drillTypeEditMode}
        onSetEditMode={drillType.setDrillTypeEditMode}
        editTitle="Edit Drill Types"
        addTitle="Add Drill Type"
        options={drillType.typeOptions}
        onStartEdit={drillType.startEditType}
        onRequestDelete={({ value, label }) => setDeleteTypeTarget({ value, label })}
        nameLabel="Drill Type Name"
        nameValue={drillType.newTypeName}
        onChangeName={(value) => {
          drillType.setNewTypeName(value)
          if (drillType.addTypeError) drillType.setAddTypeError('')
        }}
        namePlaceholder="e.g. Confined Space Drill"
        descriptionLabel="Drill type details (optional)"
        descriptionValue={drillType.newTypeDescription}
        onChangeDescription={drillType.setNewTypeDescription}
        descriptionPlaceholder="Subtext shown below type name."
        error={drillType.addTypeError}
        editingKey={drillType.editingDrillTypeKey}
        editingLabel="Editing type"
        editButtonLabel="Edit Types"
        onSave={drillType.saveType}
        saveLabel="Save Type"
        updateLabel="Update Type"
        iconOptions={drillType.iconOptions}
        iconValue={drillType.newTypeIconKey}
        onChangeIcon={drillType.setNewTypeIconKey}
        showIconPicker
      />
      <TypeManagerModal
        visible={drillLocation.showAddLocationModal}
        testId="drill-report-location-manager-modal"
        onClose={drillLocation.closeAddModal}
        editMode={drillLocation.locationEditMode}
        onSetEditMode={drillLocation.setLocationEditMode}
        editTitle="Edit Drill Locations"
        addTitle="Add Drill Location"
        options={drillLocation.typeOptions}
        onStartEdit={drillLocation.startEditType}
        onRequestDelete={({ value, label }) => setDeleteLocationTarget({ value, label })}
        nameLabel="Drill Location Name"
        nameValue={drillLocation.newLocationName}
        onChangeName={(value) => {
          drillLocation.setNewLocationName(value)
          if (drillLocation.addLocationError) drillLocation.setAddLocationError('')
        }}
        namePlaceholder="e.g. Crusher bay"
        descriptionLabel="Drill location details (optional)"
        descriptionValue={drillLocation.newLocationDescription}
        onChangeDescription={drillLocation.setNewLocationDescription}
        descriptionPlaceholder="Subtext shown below location name."
        error={drillLocation.addLocationError}
        editingKey={drillLocation.editingLocationKey}
        editingLabel="Editing location"
        editButtonLabel="Edit Locations"
        onSave={drillLocation.saveType}
        saveLabel="Save Location"
        updateLabel="Update Location"
        showRowIcon={false}
      />

      <div className="report-setup-grid d-grid gap-4">
        <div className="d-grid gap-3">
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
                <div className="fw-semibold text-muted">Choose Drill Type</div>
                <CreateActionButton label="Add type" onClick={drillType.openAddModal} />
              </div>
              <IconOptionGrid
                options={drillType.visibleTypeOptions}
                value={form.incidentType}
                onChange={(nextValue) => {
                  if (nextValue === DRILL_TYPE_TOGGLE_VALUE) {
                    drillType.setShowAllDrillTypes((prev) => !prev)
                    return
                  }
                  const value = String(nextValue || '').trim()
                  updateSetupField('incidentType', value)
                  recordDrillTypeUsage(user?.id, value)
                  setIsEditingType(false)
                }}
                variant="compact"
                showDescription
                columns={{ xs: 6, md: 3 }}
                cardProps={(option) =>
                  option?.value === DRILL_TYPE_TOGGLE_VALUE
                    ? TOGGLE_CARD_PROPS
                    : { className: 'report-option-card' }
                }
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
                    Confirm Drill Type
                  </CButton>
                </div>
              ) : null}
            </>
          )}
        </div>
        {Array.isArray(form.exerciseCategories) &&
        form.exerciseCategories.length > 0 &&
        !isEditingCategories ? (
          <ReportSetupSummaryRow
            label="Exercise Categories"
            value={form.exerciseCategories.join(', ')}
            showDesktop
            onEdit={() => setIsEditingCategories(true)}
            onReset={() => {
              updateSetupField('exerciseCategories', [])
              setIsEditingCategories(true)
            }}
          />
        ) : (
          <fieldset className="d-grid gap-2">
            <legend className="fs-6 fw-semibold text-muted mb-0">
              Exercise Categories (optional)
            </legend>
            <div className="d-flex flex-wrap gap-3">
              {DRILL_EXERCISE_CATEGORY_OPTIONS.map((option) => {
                const selected = Array.isArray(form.exerciseCategories)
                  ? form.exerciseCategories.includes(option.value)
                  : false
                return (
                  <CFormCheck
                    key={option.value}
                    id={`drill-category-${option.value.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`}
                    label={option.label}
                    checked={selected}
                    onChange={() =>
                      setForm((prev) => {
                        const current = Array.isArray(prev.exerciseCategories)
                          ? prev.exerciseCategories
                          : []
                        return {
                          ...prev,
                          exerciseCategories: selected
                            ? current.filter((value) => value !== option.value)
                            : [...current, option.value],
                        }
                      })
                    }
                  />
                )
              })}
            </div>
            <div className="small text-body-secondary">
              Select every emergency response category exercised by this drill.
            </div>
            {Array.isArray(form.exerciseCategories) && form.exerciseCategories.length > 0 ? (
              <div className="report-setup-confirm-row">
                <CButton
                  type="button"
                  color="secondary"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingCategories(false)}
                >
                  Confirm Categories
                </CButton>
              </div>
            ) : null}
          </fieldset>
        )}
        {form.weather && !showEnvironmentPicker ? (
          <ReportSetupSummaryRow
            label="Environment"
            value={form.weather}
            showDesktop
            onEdit={() => setIsEditingEnvironment(true)}
            onReset={() => {
              updateSetupField('weather', '')
              setIsEditingEnvironment(true)
            }}
          />
        ) : null}
        <div className={form.weather && !showEnvironmentPicker ? 'd-none' : ''}>
          <SelectionCards
            label="Choose Environment / Condition"
            options={DRILL_ENVIRONMENT_OPTIONS}
            selectedValue={form.weather}
            onSelect={(value) => {
              updateSetupField('weather', value)
              setIsEditingEnvironment(false)
            }}
            cols={{ xs: 6, md: 4 }}
          />
        </div>
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
        <div className={form.location && !showLocationPicker ? 'd-none' : 'd-grid gap-3'}>
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div className="fw-semibold text-muted">Choose Drill Location</div>
            <CreateActionButton label="Add location" onClick={drillLocation.openAddModal} />
          </div>
          <IconOptionGrid
            options={drillLocation.visibleTypeOptions}
            value={form.location}
            onChange={(nextValue) => {
              if (nextValue === DRILL_LOCATION_TOGGLE_VALUE) {
                drillLocation.setShowAllDrillLocations((prev) => !prev)
                return
              }
              updateSetupField('location', String(nextValue || '').trim())
              setIsEditingLocation(false)
            }}
            variant="compact"
            showDescription
            columns={{ xs: 6, md: 3 }}
            cardProps={(option) =>
              option?.value === DRILL_LOCATION_TOGGLE_VALUE
                ? TOGGLE_CARD_PROPS
                : { className: 'report-option-card', showDescription: true }
            }
          />
        </div>
        {form.reportDate && form.reportTime && !showDateTimePicker ? (
          <ReportSetupSummaryRow
            label="Date & Time"
            value={dateTimeLabel}
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
            label="Choose Drill Date"
            options={datePresetOptions}
            selectedValue={form.reportDate}
            onSelect={(value) => updateSetupField('reportDate', value)}
            cols={{ xs: 6, md: 6 }}
          />
          <CRow className="g-2">
            <CCol xs={12} md={4}>
              <CFormLabel htmlFor="drill-report-date">Custom drill date</CFormLabel>
              <CFormInput
                id="drill-report-date"
                type="date"
                value={form.reportDate}
                invalid={Boolean(setupFieldErrors.reportDate)}
                onChange={(event) => updateSetupField('reportDate', event.target.value)}
              />
              <CFormFeedback invalid>{setupFieldErrors.reportDate}</CFormFeedback>
            </CCol>
          </CRow>
          <CRow className="g-2">
            <CCol xs={12} md={4}>
              <CFormLabel htmlFor="drill-report-issuance-date">
                Report issuance date (optional)
              </CFormLabel>
              <CFormInput
                id="drill-report-issuance-date"
                type="date"
                value={form.reportIssuanceDate || ''}
                onChange={(event) => updateSetupField('reportIssuanceDate', event.target.value)}
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
              <CFormLabel htmlFor="drill-report-time">Custom start time</CFormLabel>
              <CFormInput
                id="drill-report-time"
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
        {blockerMessage ? (
          <CAlert color="danger" className="mb-0" role="alert">
            {blockerMessage}
          </CAlert>
        ) : null}
        <div className="d-flex justify-content-end">
          <CButton type="button" color="light" size="sm" onClick={onReset}>
            Reset
          </CButton>
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

export default DrillSetupStep
