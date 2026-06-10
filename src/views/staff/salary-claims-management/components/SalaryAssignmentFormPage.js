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
  SalaryAssignmentStaffFields,
} from './SalaryAssignmentFormSections'

const SalaryAssignmentFormPage = ({ vm, handlers }) => {
  const {
    isEditing,
    isReadOnly,
    draft,
    payComponentsEditMode,
    staffDirectoryLoading,
    assignmentFound,
    formatCurrency,
    formatDateTime,
    actorName,
    statutoryRatesFeatureEnabled,
  } = vm
  const { onEditPayComponents, onSavePayComponents, onCancelPayComponents, onOpenEdit } = handlers
  const {
    activeRemarksValue,
    autosaveSummary,
    componentRows,
    editingRemarkId,
    handleAddAllowanceRow,
    handleBackClick,
    handleConfirmSetSalary,
    handleDeleteAllowanceRow,
    handleDraftFieldChange,
    handlePayComponentUpdate,
    handleStaffSelectChange,
    includeInactiveStaff,
    isAutosaving,
    isSubmitting,
    remarksDirty,
    remarksEditMode,
    remarksHistory,
    setEditingRemarkId,
    setIncludeInactiveStaff,
    setRemarksDirty,
    setRemarksDraft,
    setRemarksEditMode,
    setSubmitConfirmVisible,
    submitConfirmVisible,
    visibleStaffOptions,
    willOverwriteExistingAssignment,
  } = useSalaryAssignmentFormController({ vm, handlers })

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
              This employee already has a salary assignment, existing pay components were loaded and
              this update will overwrite it.
            </div>
          )}

          <SalaryAssignmentPayComponentsCard
            componentRows={componentRows}
            formatCurrency={formatCurrency}
            handleAddAllowanceRow={handleAddAllowanceRow}
            handleDeleteAllowanceRow={handleDeleteAllowanceRow}
            handlePayComponentUpdate={handlePayComponentUpdate}
            isReadOnly={isReadOnly}
            onCancelPayComponents={onCancelPayComponents}
            onEditPayComponents={onEditPayComponents}
            onOpenEdit={onOpenEdit}
            onSavePayComponents={onSavePayComponents}
            payComponentsEditMode={payComponentsEditMode}
            statutoryRatesFeatureEnabled={statutoryRatesFeatureEnabled}
          />

          <SalaryAssignmentRemarksCard
            activeRemarksValue={activeRemarksValue}
            actorName={actorName}
            editingRemarkId={editingRemarkId}
            formatDateTime={formatDateTime}
            handleDraftFieldChange={handleDraftFieldChange}
            isReadOnly={isReadOnly}
            remarksDirty={remarksDirty}
            remarksEditMode={remarksEditMode}
            remarksHistory={remarksHistory}
            setEditingRemarkId={setEditingRemarkId}
            setRemarksDirty={setRemarksDirty}
            setRemarksDraft={setRemarksDraft}
            setRemarksEditMode={setRemarksEditMode}
          />

          {!isReadOnly && (
            <div className="px-1 small text-body-secondary text-end">{autosaveSummary}</div>
          )}

          {!isReadOnly && (
            <FormActionGroup leading={<BackButton onClick={handleBackClick} label="Back" />}>
              <CButton color="light" onClick={handleBackClick}>
                Cancel
              </CButton>
              <CButton
                color="primary"
                onClick={() => setSubmitConfirmVisible(true)}
                disabled={
                  isSubmitting ||
                  isAutosaving ||
                  payComponentsEditMode ||
                  remarksDirty ||
                  remarksEditMode
                }
              >
                {isEditing ? 'Update Salary' : 'Set Salary'}
              </CButton>
            </FormActionGroup>
          )}
          {!isReadOnly && (payComponentsEditMode || remarksDirty || remarksEditMode) && (
            <div className="small text-body-secondary text-end">
              {payComponentsEditMode
                ? 'Save or cancel Pay Components before continuing.'
                : 'Save or cancel Remarks before continuing.'}
            </div>
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
