import React from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CContainer,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import BackButton from 'src/components/BackButton'
import FormActionGroup from 'src/components/FormActionGroup'
import useSalaryAssignmentFormController from '../hooks/useSalaryAssignmentFormController'
import {
  SalaryAssignmentPayComponentsCard,
  SalaryAssignmentRemarksCard,
  SalaryAssignmentReviewCard,
  SalaryAssignmentStaffFields,
} from './SalaryAssignmentFormSections'

const SalaryAssignmentStepNav = ({ activeStep, setActiveStep, stepState, steps }) => (
  <div className="d-flex flex-wrap gap-2 mb-3" aria-label="Salary assignment steps">
    {steps.map((step, index) => {
      const state = stepState[step.key] || {}
      const isActive = activeStep === step.key
      return (
        <CButton
          key={step.key}
          type="button"
          color={isActive ? 'primary' : state.complete ? 'success' : 'light'}
          variant={isActive ? undefined : 'outline'}
          disabled={!state.available}
          aria-current={isActive ? 'step' : undefined}
          onClick={() => setActiveStep(step.key)}
        >
          {index + 1}. {step.label}
        </CButton>
      )
    })}
  </div>
)

const SalaryAssignmentFormPage = ({ vm, handlers }) => {
  const {
    isEditing,
    isReadOnly,
    draft,
    staffDirectoryLoading,
    assignmentFound,
    formatCurrency,
    formatMonth,
    formatDateTime,
    statutoryRatesFeatureEnabled,
  } = vm
  const { onOpenEdit } = handlers
  const {
    activeRemarksValue,
    activeStep,
    autosaveSummary,
    componentRows,
    goToNextStep,
    goToPreviousStep,
    handleAddAllowanceRow,
    handleBackClick,
    handleConfirmSetSalary,
    handleDeleteAllowanceRow,
    handleDraftFieldChange,
    handlePayComponentUpdate,
    handleRemarksChange,
    handleStaffSelectChange,
    includeInactiveStaff,
    isAutosaving,
    isSubmitting,
    remarksHistory,
    reviewSummary,
    setActiveStep,
    setIncludeInactiveStaff,
    setSubmitConfirmVisible,
    stepState,
    steps,
    submitConfirmVisible,
    visibleStaffOptions,
    willOverwriteExistingAssignment,
  } = useSalaryAssignmentFormController({ vm, handlers })
  const currentStepIndex = steps.findIndex((step) => step.key === activeStep)
  const nextStep = steps[currentStepIndex + 1] || null

  return (
    <CContainer fluid>
      <div className="fw-semibold mb-3">
        {isReadOnly ? 'Salary Details' : isEditing ? 'Edit Salary' : 'Create New Salary'}
      </div>

      {isEditing && !assignmentFound ? (
        <CCard>
          <CCardBody className="text-danger">
            Assignment record not found. It may have been removed.
          </CCardBody>
        </CCard>
      ) : (
        <div className="d-grid gap-3">
          <SalaryAssignmentStepNav
            activeStep={activeStep}
            setActiveStep={setActiveStep}
            stepState={stepState}
            steps={steps}
          />

          {activeStep === 'staff' && (
            <>
              <SalaryAssignmentStaffFields
                draft={draft}
                handleDraftFieldChange={handleDraftFieldChange}
                handleStaffSelectChange={handleStaffSelectChange}
                includeInactiveStaff={includeInactiveStaff}
                isReadOnly={isReadOnly}
                setIncludeInactiveStaff={setIncludeInactiveStaff}
                staffDirectoryLoading={staffDirectoryLoading}
                visibleStaffOptions={visibleStaffOptions}
              />

              {!isReadOnly && willOverwriteExistingAssignment && (
                <div className="rounded-3 border border-warning bg-warning bg-opacity-10 p-3">
                  This employee already has a salary assignment, existing pay components were loaded
                  and this update will overwrite it.
                </div>
              )}
            </>
          )}

          {activeStep === 'pay' && (
            <SalaryAssignmentPayComponentsCard
              componentRows={componentRows}
              formatCurrency={formatCurrency}
              handleAddAllowanceRow={handleAddAllowanceRow}
              handleDeleteAllowanceRow={handleDeleteAllowanceRow}
              handlePayComponentUpdate={handlePayComponentUpdate}
              isReadOnly={isReadOnly}
              statutoryRatesFeatureEnabled={statutoryRatesFeatureEnabled}
            />
          )}

          {activeStep === 'review' && (
            <>
              <SalaryAssignmentReviewCard
                formatCurrency={formatCurrency}
                formatMonth={formatMonth}
                reviewSummary={reviewSummary}
              />
              <SalaryAssignmentRemarksCard
                activeRemarksValue={activeRemarksValue}
                formatDateTime={formatDateTime}
                handleRemarksChange={handleRemarksChange}
                isReadOnly={isReadOnly}
                remarksHistory={remarksHistory}
              />
            </>
          )}

          {!isReadOnly && (
            <div className="px-1 small text-body-secondary text-end">{autosaveSummary}</div>
          )}

          {isReadOnly ? (
            <FormActionGroup leading={<BackButton onClick={handleBackClick} label="Back" />}>
              <CButton color="light" onClick={handleBackClick}>
                Back
              </CButton>
              <CButton color="primary" onClick={onOpenEdit}>
                Edit Salary
              </CButton>
            </FormActionGroup>
          ) : (
            <FormActionGroup leading={<BackButton onClick={handleBackClick} label="Back" />}>
              <CButton color="light" onClick={handleBackClick}>
                Cancel
              </CButton>
              {activeStep !== 'staff' && (
                <CButton color="light" onClick={goToPreviousStep}>
                  Previous
                </CButton>
              )}
              {nextStep ? (
                <CButton
                  color="primary"
                  onClick={goToNextStep}
                  disabled={!stepState[nextStep.key]?.available}
                >
                  Next
                </CButton>
              ) : (
                <CButton
                  color="primary"
                  onClick={() => setSubmitConfirmVisible(true)}
                  disabled={isSubmitting || isAutosaving || !stepState.review.complete}
                >
                  {isEditing ? 'Update Salary' : 'Set Salary'}
                </CButton>
              )}
            </FormActionGroup>
          )}
        </div>
      )}
      <CModal
        visible={submitConfirmVisible}
        alignment="center"
        onClose={() => setSubmitConfirmVisible(false)}
      >
        <CModalHeader onClose={() => setSubmitConfirmVisible(false)}>
          <CModalTitle>{isEditing ? 'Confirm Salary Update' : 'Confirm Set Salary'}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {isEditing
            ? 'Apply these salary assignment changes now?'
            : 'Set this salary assignment now?'}
        </CModalBody>
        <CModalFooter>
          <CButton color="light" onClick={() => setSubmitConfirmVisible(false)}>
            Cancel
          </CButton>
          <CButton color="primary" disabled={isSubmitting} onClick={handleConfirmSetSalary}>
            {isEditing ? 'Confirm update' : 'Confirm set salary'}
          </CButton>
        </CModalFooter>
      </CModal>
    </CContainer>
  )
}

export default SalaryAssignmentFormPage
