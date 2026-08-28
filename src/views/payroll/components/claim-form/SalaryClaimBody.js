import React, { useMemo } from 'react'
import { CBadge, CButton, CFormCheck } from '@coreui/react'
import DisclosureCard from 'src/components/DisclosureCard'
import WorkflowStageActions from 'src/components/report-workflow/WorkflowStageActions'
import WorkflowSummaryList from 'src/components/report-workflow/WorkflowSummaryList'
import SalaryPayoutCard from './SalaryPayoutCard'
import SalaryAdjustmentCard from './SalaryAdjustmentCard'
import OvertimeSectionCard from './OvertimeSectionCard'
import { buildSalaryClaimSummary } from './claimFormViewModel'

const SalaryClaimBody = ({
  period = {},
  baseline = {},
  adjustments = {},
  overtime = {},
  attachments = {},
  actions = {},
  state = {},
}) => {
  const {
    isLoading: isSalaryAssignmentsLoading = false,
    hasAssignedSalaryBaseline = false,
    assignedSalarySnapshot = {},
    allowanceItems = [],
    statutoryDeductionItems = [],
    adjustedGrossSalary = 0,
    adjustedTotalDeductions = 0,
    adjustedNetBeforeOvertime = 0,
    payrollBaselineConfirmed = false,
    setPayrollBaselineConfirmed = () => {},
  } = baseline
  const {
    totalAmount = 0,
    additionAdjustmentRows = [],
    deductionAdjustmentRows = [],
    editingIndex = null,
    showForm = false,
    draftItem = {},
    editSavedItem = () => {},
    removeSavedItem = () => {},
    handleAddItem = () => {},
    saveItem = () => {},
    resetDraft = () => {},
    cancelAddItem = () => {},
  } = adjustments
  const {
    overtimeEligibilityResolved = false,
    isOvertimeEligible = false,
    isSysAdmin = false,
    hasOvertimeEligibilityError = false,
    isOvertimeRowsLoading = false,
    overtimeBaseMode,
    overtimeAutoHourlyBaseRate,
    overtimeMonthlyDivisor,
    overtimePreviewHoursPerDay,
    overtimeHourlySourceSummary = {},
    overtimeRowsForPeriod = [],
    overtimeTotals = {},
    projectedNetPayout = 0,
  } = overtime
  const {
    openAttachmentPreview = () => {},
    adjustmentFormRef,
    adjustmentDateInputRef,
    updateDraftItem = () => {},
    handleAttachmentChange = () => {},
    clearDraftAttachment = () => {},
  } = attachments
  const { submitClaim = () => {}, clearForm = resetDraft, retryDraft = () => {} } = actions
  const {
    draftSyncSummary = '',
    isEditingSubmittedClaim = false,
    isSubmittingClaim = false,
    defaultPathReady = false,
  } = state
  const periodValue = period.value || ''
  const monthLabel = period.monthLabel || periodValue
  const summary = useMemo(
    () =>
      buildSalaryClaimSummary({
        isLoading: isSalaryAssignmentsLoading,
        hasAssignedSalaryBaseline,
        assignedSalarySnapshot,
        totalAmount,
        overtimeTotals,
        projectedNetPayout,
        payrollBaselineConfirmed,
      }),
    [
      assignedSalarySnapshot,
      hasAssignedSalaryBaseline,
      isSalaryAssignmentsLoading,
      overtimeTotals,
      payrollBaselineConfirmed,
      projectedNetPayout,
      totalAmount,
    ],
  )

  return (
    <>
      <section className="workflow-summary-surface" aria-labelledby="salary-claim-summary-title">
        <div className="workflow-summary-surface__header">
          <h2 id="salary-claim-summary-title" className="workflow-summary__title">
            Salary Claim Summary
          </h2>
          <div className="workflow-summary__actions">
            <CBadge color={summary.payrollBaselineConfirmed ? 'success' : 'warning'}>
              {summary.statusLabel}
            </CBadge>
            <CButton
              color="primary"
              variant="outline"
              size="sm"
              className="workflow-item-action"
              onClick={handleAddItem}
              disabled={!hasAssignedSalaryBaseline}
            >
              Add Adjustment
            </CButton>
          </div>
        </div>
        <WorkflowSummaryList
          ariaLabel="Salary claim totals"
          items={summary.metrics}
          variant="metrics"
        />
      </section>

      <DisclosureCard
        variant="section"
        summary={<span className="fw-semibold">Salary baseline and adjustment details</span>}
      >
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
          showAddAction={false}
          embedded
        />
      </DisclosureCard>

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

      <DisclosureCard
        variant="section"
        summary={<span className="fw-semibold">Overtime payout details</span>}
      >
        <OvertimeSectionCard
          period={periodValue}
          monthLabel={monthLabel}
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
          embedded
        />
      </DisclosureCard>

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
      <WorkflowStageActions
        onReset={clearForm}
        resetLabel="Clear form"
        onPrimary={submitClaim}
        primaryLabel={isEditingSubmittedClaim ? 'Update request' : 'Submit request'}
        primaryBusyLabel="Submitting..."
        primaryTestId="payroll-claim-submit-action"
        primaryDisabled={!defaultPathReady || isSubmittingClaim}
        isSaving={isSubmittingClaim}
        feedback={
          /failed|unable|retry/i.test(draftSyncSummary)
            ? {
                kind: 'error',
                title: 'Draft could not be saved',
                message: draftSyncSummary,
                action: { label: 'Retry', onAction: retryDraft },
              }
            : null
        }
        primaryFirst
        mobileLayout="stacked-primary-first"
        stackedMobileBehavior="terminal"
        ariaLabel="Claim form actions"
      />
    </>
  )
}

export default SalaryClaimBody
