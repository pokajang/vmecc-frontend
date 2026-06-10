import React from 'react'
import { CButton, CFormCheck } from '@coreui/react'
import BackButton from 'src/components/BackButton'
import FormActionGroup from 'src/components/FormActionGroup'
import SalaryPayoutCard from './SalaryPayoutCard'
import SalaryAdjustmentCard from './SalaryAdjustmentCard'
import OvertimeSectionCard from './OvertimeSectionCard'
import { getMonthLabel } from './utils/salaryClaimUtils'

const SalaryClaimBody = ({
  headerPeriod,
  isSalaryAssignmentsLoading,
  hasAssignedSalaryBaseline,
  handleAddItem,
  assignedSalarySnapshot,
  allowanceItems,
  statutoryDeductionItems,
  additionAdjustmentRows,
  deductionAdjustmentRows,
  adjustedGrossSalary,
  adjustedTotalDeductions,
  adjustedNetBeforeOvertime,
  totalAmount,
  overtimeTotals,
  projectedNetPayout,
  editingIndex,
  editSavedItem,
  removeSavedItem,
  openAttachmentPreview,
  showForm,
  draftItem,
  adjustmentFormRef,
  adjustmentDateInputRef,
  updateDraftItem,
  handleAttachmentChange,
  clearDraftAttachment,
  saveItem,
  resetDraft,
  cancelAddItem,
  overtimeEligibilityResolved,
  isOvertimeEligible,
  isSysAdmin,
  hasOvertimeEligibilityError,
  isOvertimeRowsLoading,
  overtimeBaseMode,
  overtimeAutoHourlyBaseRate,
  overtimeMonthlyDivisor,
  overtimePreviewHoursPerDay,
  overtimeHourlySourceSummary,
  overtimeRowsForPeriod,
  payrollBaselineConfirmed,
  setPayrollBaselineConfirmed,
  draftSyncSummary,
  onBack,
  submitClaim,
  isEditingSubmittedClaim,
  isSubmittingClaim,
}) => (
  <>
    <SalaryPayoutCard
      isSalaryAssignmentsLoading={isSalaryAssignmentsLoading}
      hasAssignedSalaryBaseline={hasAssignedSalaryBaseline}
      onAddItem={handleAddItem}
      assignedSalarySnapshot={assignedSalarySnapshot}
      allowanceItems={allowanceItems}
      statutoryDeductionItems={statutoryDeductionItems}
      additionAdjustmentRows={additionAdjustmentRows}
      deductionAdjustmentRows={deductionAdjustmentRows}
      adjustedGrossSalary={adjustedGrossSalary}
      adjustedTotalDeductions={adjustedTotalDeductions}
      adjustedNetBeforeOvertime={adjustedNetBeforeOvertime}
      totalAmount={totalAmount}
      overtimeTotalPayoutApproved={overtimeTotals.totalPayoutApproved}
      projectedNetPayout={projectedNetPayout}
      editingIndex={editingIndex}
      onEditItem={editSavedItem}
      onRemoveItem={removeSavedItem}
      onPreviewAttachment={openAttachmentPreview}
    />

    {showForm && (
      <SalaryAdjustmentCard
        draftItem={draftItem}
        editingIndex={editingIndex}
        adjustmentFormRef={adjustmentFormRef}
        adjustmentDateInputRef={adjustmentDateInputRef}
        onUpdateDraftItem={updateDraftItem}
        onAttachmentChange={handleAttachmentChange}
        onClearAttachment={clearDraftAttachment}
        onSave={saveItem}
        onCancelEdit={resetDraft}
        onCancelAdd={cancelAddItem}
      />
    )}

    <OvertimeSectionCard
      period={headerPeriod}
      monthLabel={getMonthLabel(headerPeriod)}
      overtimeEligibilityResolved={overtimeEligibilityResolved}
      isOvertimeEligible={isOvertimeEligible}
      isSysAdmin={isSysAdmin}
      hasOvertimeEligibilityError={hasOvertimeEligibilityError}
      isOvertimeRowsLoading={isOvertimeRowsLoading}
      overtimeBaseMode={overtimeBaseMode}
      overtimeAutoHourlyBaseRate={overtimeAutoHourlyBaseRate}
      salaryBasic={assignedSalarySnapshot.basic}
      overtimeMonthlyDivisor={overtimeMonthlyDivisor}
      overtimePreviewHoursPerDay={overtimePreviewHoursPerDay}
      overtimeHourlySourceSummary={overtimeHourlySourceSummary}
      overtimeRowsForPeriod={overtimeRowsForPeriod}
      overtimeTotals={overtimeTotals}
    />

    {hasAssignedSalaryBaseline && !isSalaryAssignmentsLoading && (
      <div className="px-1">
        <CFormCheck
          id="salary-payout-confirmed"
          label="I confirm this assigned payout baseline is correct for the selected payroll month."
          checked={payrollBaselineConfirmed}
          onChange={(event) => setPayrollBaselineConfirmed(event.target.checked)}
        />
      </div>
    )}
    <div className="px-1 small text-body-secondary">{draftSyncSummary}</div>

    <FormActionGroup leading={<BackButton onClick={onBack} label="Back to claims" />}>
      <CButton color="secondary" variant="outline" onClick={resetDraft}>
        Clear form
      </CButton>
      <CButton
        color="primary"
        onClick={submitClaim}
        disabled={!hasAssignedSalaryBaseline || !payrollBaselineConfirmed || isSubmittingClaim}
      >
        {isSubmittingClaim
          ? 'Submitting...'
          : isEditingSubmittedClaim
            ? 'Update request'
            : 'Submit request'}
      </CButton>
    </FormActionGroup>
  </>
)

export default SalaryClaimBody
