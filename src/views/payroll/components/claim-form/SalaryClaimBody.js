import React, { useMemo } from 'react'
import { CBadge, CButton, CCard, CCardBody, CCardHeader, CFormCheck } from '@coreui/react'
import BackButton from 'src/components/BackButton'
import FormActionGroup from 'src/components/FormActionGroup'
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
  const { onBack = () => {}, submitClaim = () => {}, clearForm = resetDraft } = actions
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
      <CCard>
        <CCardHeader className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2">
          <div>
            <div className="fw-semibold">Salary Claim Summary</div>
            <div className="small text-body-secondary">{monthLabel}</div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <CBadge color={summary.payrollBaselineConfirmed ? 'success' : 'warning'}>
              {summary.statusLabel}
            </CBadge>
            <CButton
              color="primary"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              disabled={!hasAssignedSalaryBaseline}
            >
              Add Adjustment
            </CButton>
          </div>
        </CCardHeader>
        <CCardBody>
          <div className="row g-3">
            {summary.metrics.map((metric) => (
              <div className="col-6 col-lg-3" key={metric.key}>
                <div className="small text-body-secondary">{metric.label}</div>
                <div className={metric.emphasis ? 'h5 mb-0 fw-semibold' : 'fw-semibold'}>
                  {metric.value}
                </div>
              </div>
            ))}
          </div>
        </CCardBody>
      </CCard>

      <details className="rounded-3 border bg-body">
        <summary className="d-flex align-items-center justify-content-between gap-2 px-3 py-3 fw-semibold">
          Salary baseline and adjustment details
          <span className="small text-body-secondary fw-normal">Expand</span>
        </summary>
        <div className="px-3 pb-3">
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
          />
        </div>
      </details>

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

      <details className="rounded-3 border bg-body">
        <summary className="d-flex align-items-center justify-content-between gap-2 px-3 py-3 fw-semibold">
          Overtime payout details
          <span className="small text-body-secondary fw-normal">Expand</span>
        </summary>
        <div className="px-3 pb-3">
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
          />
        </div>
      </details>

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

      <FormActionGroup
        leading={<BackButton onClick={onBack} label="Back to claims" />}
        mobileBehavior="in-flow"
      >
        <CButton color="secondary" variant="outline" onClick={clearForm}>
          Clear form
        </CButton>
        <CButton
          color="primary"
          data-testid="payroll-claim-submit-action"
          onClick={submitClaim}
          disabled={!defaultPathReady || isSubmittingClaim}
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
}

export default SalaryClaimBody
