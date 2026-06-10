import React from 'react'
import ButtonLoader from 'src/components/ButtonLoader'
import {
  CButton,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CRow,
} from '@coreui/react'
import { MALAYSIA_STATE_OPTIONS } from './holidayWizardHelpers'
import useHolidayWizardController from '../hooks/useHolidayWizardController'
import AdditionalStep from './holiday-wizard/AdditionalStep'
import DefaultNationalStep from './holiday-wizard/DefaultNationalStep'
import SummaryStep from './holiday-wizard/SummaryStep'
import WizardFooter from './holiday-wizard/WizardFooter'

const HolidayCreateModal = ({
  visible,
  onClose,
  draft,
  onChange,
  onSave,
  isSaving = false,
  saveError = null,
  isEditing = false,
  mode = 'single',
  initialYear = new Date().getFullYear(),
  existingNationalDefaults = [],
  onConfirmWizard,
}) => {
  const isWizardMode = mode === 'wizard'
  const {
    wizardState,
    dispatch,
    wizardAdditionalScope,
    wizardAdditionalDate,
    wizardDerivedYear,
    handleWizardProceed,
    handleWizardAdditionalAdd,
    handleWizardGoSummary,
    handleWizardSubmit,
    handleWizardFormSubmit,
  } = useHolidayWizardController({
    visible,
    isWizardMode,
    initialYear,
    existingNationalDefaults,
    onConfirmWizard,
    isSaving,
  })

  const scope = draft?.scope || 'National'
  const isStateScoped = scope === 'State'
  const holidayDate = String(draft?.date || '')
  const derivedYear = holidayDate ? String(new Date(holidayDate).getFullYear() || '') : ''

  return (
    <CModal visible={visible} onClose={onClose} alignment="center">
      <CModalHeader>
        {isWizardMode ? 'Configure Holidays' : isEditing ? 'Edit Holiday' : 'Set Holiday'}
      </CModalHeader>
      <CModalBody>
        {isWizardMode ? (
          <form onSubmit={handleWizardFormSubmit}>
            {wizardState.step === 'default-national' && (
              <DefaultNationalStep rows={wizardState.defaultNationalDraft} dispatch={dispatch} />
            )}

            {wizardState.step === 'additional' && (
              <AdditionalStep
                wizardState={wizardState}
                dispatch={dispatch}
                isSaving={isSaving}
                wizardAdditionalScope={wizardAdditionalScope}
                wizardAdditionalDate={wizardAdditionalDate}
                wizardDerivedYear={wizardDerivedYear}
                onSaveAdditional={handleWizardAdditionalAdd}
              />
            )}

            {wizardState.step === 'summary' && <SummaryStep wizardState={wizardState} />}
          </form>
        ) : (
          <CRow className="g-3">
            <CCol md={8}>
              <CFormLabel htmlFor="holiday-name">Holiday Name</CFormLabel>
              <CFormInput
                id="holiday-name"
                value={draft?.name || ''}
                onChange={(event) => onChange('name', event.target.value)}
                placeholder="e.g., Hari Raya Aidilfitri"
              />
            </CCol>
            <CCol md={4}>
              <CFormLabel htmlFor="holiday-date">Date</CFormLabel>
              <CFormInput
                id="holiday-date"
                type="date"
                value={holidayDate}
                onChange={(event) => onChange('date', event.target.value)}
              />
            </CCol>
            <CCol md={4}>
              <CFormLabel htmlFor="holiday-scope">Scope</CFormLabel>
              <CFormSelect
                id="holiday-scope"
                value={scope}
                onChange={(event) => onChange('scope', event.target.value)}
              >
                <option value="National">National</option>
                <option value="State">State</option>
              </CFormSelect>
            </CCol>
            <CCol md={4}>
              <CFormLabel htmlFor="holiday-state">State</CFormLabel>
              <CFormSelect
                id="holiday-state"
                value={draft?.state || 'All States'}
                onChange={(event) => onChange('state', event.target.value)}
                disabled={!isStateScoped}
              >
                {MALAYSIA_STATE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol md={4}>
              <CFormLabel htmlFor="holiday-year">Year</CFormLabel>
              <CFormInput id="holiday-year" value={derivedYear} readOnly />
            </CCol>
          </CRow>
        )}
      </CModalBody>
      {(saveError || wizardState.stepError) && (
        <div className="px-3 pb-2">
          <div className="text-danger small">{saveError || wizardState.stepError}</div>
        </div>
      )}
      <CModalFooter>
        {isWizardMode ? (
          <WizardFooter
            step={wizardState.step}
            isSaving={isSaving}
            onClose={onClose}
            onBackDefault={() => dispatch({ type: 'BACK_STEP' })}
            onBackAdditional={() => dispatch({ type: 'BACK_TO_ADDITIONAL' })}
            onNext={handleWizardProceed}
            onReview={handleWizardGoSummary}
            onSubmit={handleWizardSubmit}
          />
        ) : (
          <>
            <CButton color="light" onClick={onClose} disabled={isSaving}>
              Cancel
            </CButton>
            <CButton
              color="primary"
              onClick={onSave}
              disabled={isSaving || !draft?.name || !draft?.date}
            >
              {isSaving ? (
                <ButtonLoader label="Saving..." />
              ) : isEditing ? (
                'Update holiday'
              ) : (
                'Save holiday'
              )}
            </CButton>
          </>
        )}
      </CModalFooter>
    </CModal>
  )
}

export default HolidayCreateModal
