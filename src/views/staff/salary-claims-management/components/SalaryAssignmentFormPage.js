import React from 'react'
import { CButton, CCard, CCardBody, CContainer } from '@coreui/react'
import BackButton from 'src/components/BackButton'
import FormActionGroup from 'src/components/FormActionGroup'
import WorkflowDetailHeader from 'src/components/workflow/WorkflowDetailHeader'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import useSalaryAssignmentFormController from '../hooks/useSalaryAssignmentFormController'
import {
  SalaryAssignmentPayComponentsCard,
  SalaryAssignmentRemarksCard,
  SalaryAssignmentReviewCard,
  SalaryAssignmentStaffFields,
} from './SalaryAssignmentFormSections'

const SalaryAssignmentStepNav = ({ activeStep, setActiveStep, stepState, steps }) => (
  <nav aria-label="Salary assignment steps">
    <ol className="list-unstyled d-flex flex-wrap gap-2 mb-3">
      {steps.map((step, index) => {
        const state = stepState[step.key] || {}
        const isActive = activeStep === step.key
        return (
          <li key={step.key}>
            <CButton
              type="button"
              color={isActive ? 'primary' : state.complete ? 'success' : 'light'}
              variant={isActive ? undefined : 'outline'}
              className="vmecc-choice-button workflow-step-action"
              disabled={!state.available}
              aria-current={isActive ? 'step' : undefined}
              onClick={() => setActiveStep(step.key)}
            >
              {index + 1}. {step.label}
            </CButton>
          </li>
        )
      })}
    </ol>
  </nav>
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
    <CContainer
      fluid
      className="workflow-module-page"
      data-testid="salary-claims-management-assignment-form"
    >
      <WorkflowDetailHeader
        title={isReadOnly ? 'Salary Details' : isEditing ? 'Edit Salary' : 'Create New Salary'}
        subtitle={
          isReadOnly
            ? 'Review the effective salary assignment and its recorded history.'
            : 'Complete each step before reviewing and saving the assignment.'
        }
      />

      {(isEditing || isReadOnly) && !assignmentFound ? (
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
                  Saving will replace this employee&apos;s current salary assignment.
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
              <div data-testid="salary-claims-management-assignment-history">
                <SalaryAssignmentRemarksCard
                  activeRemarksValue={activeRemarksValue}
                  formatDateTime={formatDateTime}
                  handleRemarksChange={handleRemarksChange}
                  isReadOnly={isReadOnly}
                  remarksHistory={remarksHistory}
                />
              </div>
            </>
          )}

          {!isReadOnly && (
            <div className="d-none d-md-block px-1 small text-body-secondary text-end">
              {autosaveSummary}
            </div>
          )}

          {isReadOnly ? (
            <FormActionGroup
              leading={<BackButton onClick={handleBackClick} label="Back" />}
              mobileBehavior="compact-sticky"
            >
              <CButton
                color="primary"
                data-testid="salary-claims-management-assignment-edit-action"
                onClick={onOpenEdit}
              >
                Edit Salary
              </CButton>
            </FormActionGroup>
          ) : (
            <FormActionGroup
              mobileBehavior="compact-sticky"
              statusMessage={autosaveSummary}
              ariaLabel="Salary assignment actions"
            >
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
                  {isEditing ? 'Update Salary' : 'Assign Salary'}
                </CButton>
              )}
            </FormActionGroup>
          )}
        </div>
      )}
      <ActionConfirmModal
        visible={submitConfirmVisible}
        onClose={() => setSubmitConfirmVisible(false)}
        onConfirm={handleConfirmSetSalary}
        title={isEditing ? 'Confirm Salary Update' : 'Confirm Salary Assignment'}
        message={
          isEditing
            ? 'Apply these salary assignment changes now?'
            : 'Set this salary assignment now?'
        }
        confirmLabel={isEditing ? 'Confirm update' : 'Confirm set salary'}
        confirmDisabled={isSubmitting}
        cancelDisabled={isSubmitting}
        testId="salary-assignment-confirm"
      />
    </CContainer>
  )
}

export default SalaryAssignmentFormPage
