import { useEffect, useMemo, useState } from 'react'
import { fetchPayrollSalaryBaseline } from 'src/services/apiClient'
import { createPayrollRequestContext } from 'src/services/payrollPrivacy'
import {
  buildAssignedSalarySnapshot,
  getItemSummaryText,
  getSignedAdjustmentAmount,
  resolveAssignedSalaryConfig,
  roundMoney,
} from '../utils/salaryClaimUtils'
import { formatCurrency, formatDate, parseAmount } from '../utils/claimFormUtils'

const useSalaryAssignments = ({ user, period, savedItems, pushToast }) => {
  const [salaryAssignments, setSalaryAssignments] = useState([])
  const [isSalaryAssignmentsLoading, setIsSalaryAssignmentsLoading] = useState(false)

  useEffect(() => {
    const requestContext = createPayrollRequestContext(user?.id)
    const hydrateSalaryAssignments = async () => {
      if (!user?.id || !/^\d{4}-\d{2}$/.test(String(period || ''))) {
        setSalaryAssignments([])
        setIsSalaryAssignmentsLoading(false)
        return
      }
      setSalaryAssignments([])
      setIsSalaryAssignmentsLoading(true)
      try {
        const result = await fetchPayrollSalaryBaseline(period, {
          signal: requestContext.signal,
          cache: 'no-store',
        })
        if (!requestContext.isCurrent()) return
        const baseline = result?.data
        setSalaryAssignments(
          baseline
            ? [
                {
                  id: baseline.salaryAssignmentPublicId,
                  employeeId: String(user.id),
                  employee: String(user.name || ''),
                  email: String(user.email || ''),
                  status: 'Active',
                  effectiveFrom: baseline.effectiveFrom,
                  basicSalary: Number(baseline.basic || 0),
                  fixedAllowances: Number(baseline.allowanceTotal || 0),
                  allowances: Array.isArray(baseline.allowances) ? baseline.allowances : [],
                  employeeContributions: baseline.employeeContributions || {},
                  employerContributions: baseline.employerContributions || {},
                  serverAuthoritative: true,
                },
              ]
            : [],
        )
      } catch {
        if (!requestContext.isCurrent()) return
        pushToast('Unable to load salary assignment baseline from API. Please retry.', {
          title: 'Salary baseline unavailable',
          color: 'danger',
        })
        setSalaryAssignments([])
      } finally {
        if (requestContext.isCurrent()) setIsSalaryAssignmentsLoading(false)
      }
    }
    void hydrateSalaryAssignments().finally(requestContext.release)
    return requestContext.abort
  }, [period, pushToast, user?.email, user?.id, user?.name])

  const totalAmount = useMemo(
    () => roundMoney(savedItems.reduce((sum, item) => sum + getSignedAdjustmentAmount(item), 0)),
    [savedItems],
  )
  const assignedSalaryConfig = useMemo(
    () => resolveAssignedSalaryConfig(user, period, salaryAssignments),
    [period, salaryAssignments, user],
  )
  const assignedSalarySnapshot = useMemo(
    () => buildAssignedSalarySnapshot(user, period, assignedSalaryConfig),
    [assignedSalaryConfig, period, user],
  )
  const allowanceItems = useMemo(
    () =>
      Array.isArray(assignedSalarySnapshot.allowanceItems)
        ? assignedSalarySnapshot.allowanceItems
        : [],
    [assignedSalarySnapshot.allowanceItems],
  )
  const statutoryDeductionItems = useMemo(
    () =>
      Array.isArray(assignedSalarySnapshot.deductionItems)
        ? assignedSalarySnapshot.deductionItems
        : [],
    [assignedSalarySnapshot.deductionItems],
  )
  const indexedSavedItems = useMemo(
    () => savedItems.map((item, index) => ({ item, index })),
    [savedItems],
  )
  const additionAdjustmentRows = useMemo(
    () => indexedSavedItems.filter(({ item }) => item?.claimType !== 'Deduction'),
    [indexedSavedItems],
  )
  const deductionAdjustmentRows = useMemo(
    () => indexedSavedItems.filter(({ item }) => item?.claimType === 'Deduction'),
    [indexedSavedItems],
  )
  const additionAdjustmentsTotal = useMemo(
    () =>
      roundMoney(
        additionAdjustmentRows.reduce((sum, { item }) => sum + parseAmount(item?.amount), 0),
      ),
    [additionAdjustmentRows],
  )
  const deductionAdjustmentsTotal = useMemo(
    () =>
      roundMoney(
        deductionAdjustmentRows.reduce((sum, { item }) => sum + parseAmount(item?.amount), 0),
      ),
    [deductionAdjustmentRows],
  )
  const adjustedGrossSalary = useMemo(
    () => roundMoney(assignedSalarySnapshot.gross + additionAdjustmentsTotal),
    [additionAdjustmentsTotal, assignedSalarySnapshot.gross],
  )
  const adjustedTotalDeductions = useMemo(
    () => roundMoney(assignedSalarySnapshot.totalDeductions + deductionAdjustmentsTotal),
    [assignedSalarySnapshot.totalDeductions, deductionAdjustmentsTotal],
  )
  const adjustedNetBeforeOvertime = useMemo(
    () => roundMoney(adjustedGrossSalary - adjustedTotalDeductions),
    [adjustedGrossSalary, adjustedTotalDeductions],
  )
  const hasAssignedSalaryBaseline = Boolean(assignedSalarySnapshot?.hasConfiguredBaseline)
  const submitLineItems = useMemo(
    () =>
      savedItems.map((item, index) => ({
        id: `${item.claimType || 'salary'}-${item.claimDate || 'date'}-${index}`,
        title: `${item.claimType || 'Addition'} Adjustment`,
        meta: [formatDate(item.claimDate)].filter(Boolean).join(' | '),
        note: getItemSummaryText(item),
        attachmentId: item.attachmentId || null,
        attachmentName: item.attachmentName || '',
        attachmentMimeType: item.attachmentMimeType || '',
        amount: formatCurrency(getSignedAdjustmentAmount(item)),
      })),
    [savedItems],
  )

  return {
    salaryAssignments,
    isSalaryAssignmentsLoading,
    totalAmount,
    assignedSalaryConfig,
    assignedSalarySnapshot,
    allowanceItems,
    statutoryDeductionItems,
    indexedSavedItems,
    additionAdjustmentRows,
    deductionAdjustmentRows,
    additionAdjustmentsTotal,
    deductionAdjustmentsTotal,
    adjustedGrossSalary,
    adjustedTotalDeductions,
    adjustedNetBeforeOvertime,
    hasAssignedSalaryBaseline,
    submitLineItems,
  }
}

export default useSalaryAssignments
