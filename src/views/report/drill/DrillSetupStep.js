import React, { useEffect, useState } from 'react'
import { CButton, CAlert, CCol, CFormFeedback, CFormInput, CFormLabel, CRow } from '@coreui/react'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import CreateActionButton from 'src/components/CreateActionButton'
import MobileChoiceList from 'src/components/report-workflow/MobileChoiceList'
import MobileSetupSelectorDrawer from 'src/components/report-workflow/MobileSetupSelectorDrawer'
import MobileSetupSummaryList from 'src/components/report-workflow/MobileSetupSummaryList'
import ResponsiveChoiceSelector from 'src/components/report-workflow/ResponsiveChoiceSelector'
import TypeManagerModal from 'src/components/report-workflow/TypeManagerModal'
import { MOBILE_TYPE_TOGGLE_CARD_PROPS } from 'src/components/report-workflow/mobile-home'
import { DRILL_ENVIRONMENT_OPTIONS } from './constants'
import SelectionCards from '../components/SelectionCards'
import { ReportSetupActions, ReportSetupSummaryRow } from '../components/ReportWorkflowUi'
import useReportIsMobile, { REPORT_MOBILE_QUERY } from '../hooks/useReportIsMobile'
import useDrillCategoryManager, { DRILL_CATEGORY_TOGGLE_VALUE } from './useDrillCategoryManager'
import useDrillTypeManager, { DRILL_TYPE_TOGGLE_VALUE } from './useDrillTypeManager'
import useDrillLocationManager, { DRILL_LOCATION_TOGGLE_VALUE } from './useDrillLocationManager'
import { recordDrillTypeUsage } from './typeUsageStorage'

const TOGGLE_CARD_PROPS = {
  ...MOBILE_TYPE_TOGGLE_CARD_PROPS,
  className: `report-option-card ${MOBILE_TYPE_TOGGLE_CARD_PROPS.className}`,
}

const MOBILE_SETUP_DRAWERS = {
  type: 'type',
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
}) => {
  const isMobile = useReportIsMobile()
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
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState(null)
  const [deleteLocationTarget, setDeleteLocationTarget] = useState(null)
  const [activeMobileSetupDrawer, setActiveMobileSetupDrawer] = useState('')
  const [returnMobileSetupDrawer, setReturnMobileSetupDrawer] = useState('')

  const updateSetupField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSetupFieldErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const hasType = Boolean(String(form.incidentType || '').trim())
  const showTypePicker = !hasType || (!isMobile && isEditingType)
  const showEnvironmentPicker = isEditingEnvironment || !String(form.weather || '').trim()
  const showLocationPicker = isEditingLocation || !String(form.location || '').trim()
  const showDateTimePicker =
    isEditingDateTime ||
    !String(form.reportDate || '').trim() ||
    !String(form.reportTime || '').trim()
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
  const drillCategory = useDrillCategoryManager({
    userId: user?.id,
    selectedCategories: form.exerciseCategories,
    updateSetupField,
    pushToast,
  })
  const mobileSetupChildDrawerVisible = drillType.showAddTypeModal

  useEffect(() => {
    if (!isMobile || !returnMobileSetupDrawer || mobileSetupChildDrawerVisible) return
    const timer = window.setTimeout(() => {
      setActiveMobileSetupDrawer(returnMobileSetupDrawer)
      setReturnMobileSetupDrawer('')
    }, 0)
    return () => window.clearTimeout(timer)
  }, [isMobile, mobileSetupChildDrawerVisible, returnMobileSetupDrawer])

  const openTypeEditor = () => {
    if (isMobile) {
      setActiveMobileSetupDrawer(MOBILE_SETUP_DRAWERS.type)
      return
    }
    setIsEditingType(true)
  }

  const resetTypeSelection = () => {
    drillType.setShowAllDrillTypes(false)
    updateSetupField('incidentType', '')
    setIsEditingType(true)
    setActiveMobileSetupDrawer('')
  }

  const selectDrillType = (nextValue, { closeMobileDrawer = false } = {}) => {
    if (nextValue === DRILL_TYPE_TOGGLE_VALUE) {
      drillType.setShowAllDrillTypes((prev) => !prev)
      return
    }
    drillType.setShowAllDrillTypes(false)
    const value = String(nextValue || '').trim()
    updateSetupField('incidentType', value)
    recordDrillTypeUsage(user?.id, value)
    setIsEditingType(false)
    if (closeMobileDrawer) setActiveMobileSetupDrawer('')
  }

  const openTypeManagerFromDrawer = () => {
    setReturnMobileSetupDrawer(MOBILE_SETUP_DRAWERS.type)
    setActiveMobileSetupDrawer('')
    drillType.openAddModal()
  }

  const categorySummary = (Array.isArray(form.exerciseCategories) ? form.exerciseCategories : [])
    .map(
      (value) =>
        drillCategory.categoryOptions.find((option) => option.value === value)?.title || value,
    )
    .join(', ')
  const mobileSetupSummaryItems =
    isMobile && hasType
      ? [
          hasType && !isEditingType
            ? {
                key: 'type',
                label: 'Type',
                value: form.incidentType,
                editLabel: 'Edit Type',
                onEdit: openTypeEditor,
              }
            : null,
          Array.isArray(form.exerciseCategories) &&
          form.exerciseCategories.length > 0 &&
          !isEditingCategories
            ? {
                key: 'categories',
                label: 'Exercise Categories',
                value: categorySummary,
                editLabel: 'Edit Exercise Categories',
                onEdit: () => setIsEditingCategories(true),
              }
            : null,
          form.weather && !showEnvironmentPicker
            ? {
                key: 'environment',
                label: 'Environment',
                value: form.weather,
                editLabel: 'Edit Environment',
                onEdit: () => setIsEditingEnvironment(true),
              }
            : null,
          form.location && !showLocationPicker
            ? {
                key: 'location',
                label: 'Location',
                value: form.location,
                editLabel: 'Edit Location',
                onEdit: () => setIsEditingLocation(true),
              }
            : null,
          form.reportDate && form.reportTime && !showDateTimePicker
            ? {
                key: 'datetime',
                label: 'Date & Time',
                value: form.reportDate,
                secondaryValue: `${form.reportTime}${
                  form.reportIssuanceDate ? ` · Issued ${form.reportIssuanceDate}` : ''
                }`,
                editLabel: 'Edit Date & Time',
                onEdit: () => setIsEditingDateTime(true),
              }
            : null,
        ].filter(Boolean)
      : []

  return (
    <div className="mb-3 d-grid gap-4" data-testid="drill-report-setup-ready">
      <ActionConfirmModal
        visible={Boolean(deleteTypeTarget)}
        mobileDrawerQuery={REPORT_MOBILE_QUERY}
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
        visible={Boolean(deleteCategoryTarget)}
        mobileDrawerQuery={REPORT_MOBILE_QUERY}
        testId="drill-report-category-manager-delete-modal"
        title="Delete Category"
        message={
          deleteCategoryTarget?.label
            ? `Delete "${deleteCategoryTarget.label}"? This cannot be undone.`
            : 'Delete this category?'
        }
        confirmLabel="Delete"
        confirmColor="danger"
        onClose={() => setDeleteCategoryTarget(null)}
        onConfirm={() => {
          if (deleteCategoryTarget?.value) drillCategory.removeCategory(deleteCategoryTarget.value)
          setDeleteCategoryTarget(null)
        }}
      />
      <ActionConfirmModal
        visible={Boolean(deleteLocationTarget)}
        mobileDrawerQuery={REPORT_MOBILE_QUERY}
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
        mobileDrawer
        mobileDrawerQuery={REPORT_MOBILE_QUERY}
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
        visible={drillCategory.showAddCategoryModal}
        mobileDrawer
        mobileDrawerQuery={REPORT_MOBILE_QUERY}
        testId="drill-report-category-manager-modal"
        onClose={drillCategory.closeAddModal}
        editMode={drillCategory.categoryEditMode}
        onSetEditMode={drillCategory.setCategoryEditMode}
        editTitle="Edit Exercise Categories"
        addTitle="Add Exercise Category"
        options={drillCategory.categoryOptions}
        onStartEdit={drillCategory.startEditCategory}
        onRequestDelete={({ value, label }) => setDeleteCategoryTarget({ value, label })}
        nameLabel="Exercise Category Name"
        nameValue={drillCategory.newCategoryName}
        onChangeName={(value) => {
          drillCategory.setNewCategoryName(value)
          if (drillCategory.addCategoryError) drillCategory.setAddCategoryError('')
        }}
        namePlaceholder="e.g. Medical Response"
        descriptionLabel="Exercise category details (optional)"
        descriptionValue={drillCategory.newCategoryDescription}
        onChangeDescription={drillCategory.setNewCategoryDescription}
        descriptionPlaceholder="Subtext shown below category name."
        error={drillCategory.addCategoryError}
        editingKey={drillCategory.editingCategoryKey}
        editingLabel="Editing category"
        editButtonLabel="Edit Categories"
        onSave={drillCategory.saveCategory}
        saveLabel="Save Category"
        updateLabel="Update Category"
        iconOptions={drillCategory.iconOptions}
        iconValue={drillCategory.newCategoryIconKey}
        onChangeIcon={drillCategory.setNewCategoryIconKey}
        showIconPicker
      />
      <TypeManagerModal
        visible={drillLocation.showAddLocationModal}
        mobileDrawer
        mobileDrawerQuery={REPORT_MOBILE_QUERY}
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

      <MobileSetupSelectorDrawer
        visible={isMobile && activeMobileSetupDrawer === MOBILE_SETUP_DRAWERS.type}
        title="Change Drill Type"
        headerAction={
          <CreateActionButton
            label="Add type"
            className="inspection-compact-action-btn"
            onClick={openTypeManagerFromDrawer}
          />
        }
        onClose={() => setActiveMobileSetupDrawer('')}
      >
        <div className="d-grid gap-3">
          <ResponsiveChoiceSelector
            isMobile
            options={drillType.visibleTypeOptions}
            value={form.incidentType}
            onChange={(nextValue) => selectDrillType(nextValue, { closeMobileDrawer: true })}
            variant="compact"
            showDescription
            toggleValue={DRILL_TYPE_TOGGLE_VALUE}
            columns={{ xs: 12 }}
            cardProps={(option) =>
              option?.value === DRILL_TYPE_TOGGLE_VALUE
                ? TOGGLE_CARD_PROPS
                : { className: 'report-option-card' }
            }
            ariaLabel="Change drill type"
          />
          <CButton
            type="button"
            color="secondary"
            variant="outline"
            size="sm"
            onClick={resetTypeSelection}
          >
            Clear type
          </CButton>
        </div>
      </MobileSetupSelectorDrawer>

      <div className="report-setup-grid mobile-setup-picker d-grid gap-4">
        {mobileSetupSummaryItems.length > 0 ? (
          <MobileSetupSummaryList ariaLabel="Drill setup summary" items={mobileSetupSummaryItems} />
        ) : null}
        <div
          className={`d-grid gap-3 ${!showTypePicker ? 'd-none d-md-grid' : ''}`.trim()}
          data-drill-field="incidentType"
        >
          {!showTypePicker ? (
            !isMobile ? (
              <ReportSetupSummaryRow
                label="Type"
                value={form.incidentType}
                showDesktop
                onEdit={openTypeEditor}
                onReset={resetTypeSelection}
              />
            ) : null
          ) : (
            <>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div className="fw-semibold text-muted">Choose Drill Type</div>
                <CreateActionButton label="Add type" onClick={drillType.openAddModal} />
              </div>
              <ResponsiveChoiceSelector
                isMobile={isMobile}
                options={drillType.visibleTypeOptions}
                value={form.incidentType}
                onChange={selectDrillType}
                variant="compact"
                showDescription
                toggleValue={DRILL_TYPE_TOGGLE_VALUE}
                columns={{ xs: 12, md: 3 }}
                cardProps={(option) =>
                  option?.value === DRILL_TYPE_TOGGLE_VALUE
                    ? TOGGLE_CARD_PROPS
                    : { className: 'report-option-card' }
                }
                ariaLabel="Choose drill type"
              />
            </>
          )}
        </div>
        {!isMobile || hasType ? (
          <>
            {Array.isArray(form.exerciseCategories) &&
            form.exerciseCategories.length > 0 &&
            !isEditingCategories ? (
              !isMobile ? (
                <ReportSetupSummaryRow
                  label="Exercise Categories"
                  value={categorySummary}
                  showDesktop
                  onEdit={() => setIsEditingCategories(true)}
                  onReset={() => {
                    drillCategory.setShowAllCategories(false)
                    updateSetupField('exerciseCategories', [])
                    setIsEditingCategories(true)
                  }}
                />
              ) : null
            ) : (
              <div className="d-grid gap-2" role="group" aria-labelledby="drill-category-title">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <div id="drill-category-title" className="fw-semibold text-muted">
                    Exercise Categories (optional)
                  </div>
                  <CreateActionButton label="Add category" onClick={drillCategory.openAddModal} />
                </div>
                <ResponsiveChoiceSelector
                  isMobile={isMobile}
                  options={drillCategory.visibleCategoryOptions}
                  value={Array.isArray(form.exerciseCategories) ? form.exerciseCategories : []}
                  onChange={(nextValue) => {
                    if (nextValue === DRILL_CATEGORY_TOGGLE_VALUE) {
                      drillCategory.setShowAllCategories((prev) => !prev)
                      return
                    }
                    setForm((prev) => {
                      const current = Array.isArray(prev.exerciseCategories)
                        ? prev.exerciseCategories
                        : []
                      return {
                        ...prev,
                        exerciseCategories: current.includes(nextValue)
                          ? current.filter((value) => value !== nextValue)
                          : [...current, nextValue],
                      }
                    })
                  }}
                  variant="compact"
                  toggleValue={DRILL_CATEGORY_TOGGLE_VALUE}
                  columns={{ xs: 12, md: 3 }}
                  cardProps={(option) =>
                    option?.value === DRILL_CATEGORY_TOGGLE_VALUE
                      ? TOGGLE_CARD_PROPS
                      : { className: 'report-option-card' }
                  }
                  selectionMode="multi"
                  ariaLabel="Exercise categories"
                  testIdPrefix="drill-category"
                />
                {Array.isArray(form.exerciseCategories) && form.exerciseCategories.length > 0 ? (
                  <div className="report-setup-confirm-row">
                    <CButton
                      type="button"
                      color="secondary"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingCategories(false)}
                    >
                      Done
                    </CButton>
                  </div>
                ) : null}
              </div>
            )}
            <div
              className={form.weather && !showEnvironmentPicker ? 'd-none d-md-block' : undefined}
              data-drill-field="weather"
              aria-invalid={Boolean(setupFieldErrors.weather) || undefined}
            >
              {form.weather && !showEnvironmentPicker ? (
                !isMobile ? (
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
                ) : null
              ) : null}
              <div className={form.weather && !showEnvironmentPicker ? 'd-none' : ''}>
                {isMobile ? (
                  <div className="d-grid gap-2">
                    <div className="fw-semibold text-muted">Choose Environment / Condition</div>
                    <MobileChoiceList
                      mode="single"
                      ariaLabel="Choose environment or condition"
                      options={DRILL_ENVIRONMENT_OPTIONS}
                      value={form.weather}
                      onChange={(value) => {
                        updateSetupField('weather', value)
                        setIsEditingEnvironment(false)
                      }}
                    />
                  </div>
                ) : (
                  <SelectionCards
                    label="Choose Environment / Condition"
                    options={DRILL_ENVIRONMENT_OPTIONS}
                    selectedValue={form.weather}
                    showDescriptions={false}
                    onSelect={(value) => {
                      updateSetupField('weather', value)
                      setIsEditingEnvironment(false)
                    }}
                    cols={{ xs: 12, md: 4 }}
                  />
                )}
              </div>
            </div>
            <div
              className={form.location && !showLocationPicker ? 'd-none d-md-block' : undefined}
              data-drill-field="location"
              aria-invalid={Boolean(setupFieldErrors.location) || undefined}
            >
              {form.location && !showLocationPicker ? (
                !isMobile ? (
                  <ReportSetupSummaryRow
                    label="Location"
                    value={form.location}
                    showDesktop
                    onEdit={() => setIsEditingLocation(true)}
                    onReset={() => {
                      drillLocation.setShowAllDrillLocations(false)
                      updateSetupField('location', '')
                      setIsEditingLocation(true)
                    }}
                  />
                ) : null
              ) : null}
              <div className={form.location && !showLocationPicker ? 'd-none' : 'd-grid gap-3'}>
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <div className="fw-semibold text-muted">Choose Drill Location</div>
                  <CreateActionButton label="Add location" onClick={drillLocation.openAddModal} />
                </div>
                <ResponsiveChoiceSelector
                  isMobile={isMobile}
                  options={drillLocation.visibleTypeOptions}
                  value={form.location}
                  onChange={(nextValue) => {
                    if (nextValue === DRILL_LOCATION_TOGGLE_VALUE) {
                      drillLocation.setShowAllDrillLocations((prev) => !prev)
                      return
                    }
                    drillLocation.setShowAllDrillLocations(false)
                    updateSetupField('location', String(nextValue || '').trim())
                    setIsEditingLocation(false)
                  }}
                  variant="compact"
                  showDescription
                  toggleValue={DRILL_LOCATION_TOGGLE_VALUE}
                  columns={{ xs: 12, md: 3 }}
                  cardProps={(option) =>
                    option?.value === DRILL_LOCATION_TOGGLE_VALUE
                      ? TOGGLE_CARD_PROPS
                      : { className: 'report-option-card', showDescription: true }
                  }
                />
              </div>
            </div>
            <div
              className={
                form.reportDate && form.reportTime && !showDateTimePicker
                  ? 'd-none d-md-block'
                  : undefined
              }
              data-drill-field="reportDate"
              aria-invalid={
                Boolean(setupFieldErrors.reportDate || setupFieldErrors.reportTime) || undefined
              }
            >
              {form.reportDate && form.reportTime && !showDateTimePicker ? (
                !isMobile ? (
                  <ReportSetupSummaryRow
                    label="Date & Time"
                    value={form.reportDate}
                    secondaryValue={`${form.reportTime}${
                      form.reportIssuanceDate ? ` · Issued ${form.reportIssuanceDate}` : ''
                    }`}
                    showDesktop
                    onEdit={() => setIsEditingDateTime(true)}
                    onReset={() => {
                      updateSetupField('reportDate', '')
                      updateSetupField('reportTime', '')
                      setIsEditingDateTime(true)
                    }}
                  />
                ) : null
              ) : null}
              <div
                className={
                  form.reportDate && form.reportTime && !showDateTimePicker
                    ? 'd-none'
                    : 'd-grid gap-3'
                }
              >
                <SelectionCards
                  label="Choose Drill Date"
                  options={datePresetOptions}
                  selectedValue={form.reportDate}
                  onSelect={(value) => updateSetupField('reportDate', value)}
                  cols={{ xs: 12, md: 6 }}
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
                      onChange={(event) =>
                        updateSetupField('reportIssuanceDate', event.target.value)
                      }
                    />
                  </CCol>
                </CRow>
                <SelectionCards
                  label="Choose Start Time"
                  options={timePresetOptions}
                  selectedValue={form.reportTime}
                  onSelect={(value) => updateSetupField('reportTime', value)}
                  cols={{ xs: 12, md: 3 }}
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
            </div>
            {blockerMessage ? (
              <CAlert color="danger" className="mb-0" role="alert">
                {blockerMessage}
              </CAlert>
            ) : null}
            <ReportSetupActions
              onSaveDraft={onSaveDraft}
              onContinue={onContinue}
              saveLabel={saveLabel}
              statusMessage={draftStatus}
            />
          </>
        ) : null}
      </div>
    </div>
  )
}

export default DrillSetupStep
