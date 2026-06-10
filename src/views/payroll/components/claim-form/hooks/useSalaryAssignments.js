import { useEffect, useMemo, useState } from 'react'
import { loadSalaryAssignmentsApiFirst } from 'src/services/salaryAssignmentsApi'
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
    let active = true
    const hydrateSalaryAssignments = async () => {
      if (!user?.id) {
        setSalaryAssignments([])
        setIsSalaryAssignmentsLoading(false)
        return
      }
      setIsSalaryAssignmentsLoading(true)
      const result = await loadSalaryAssignmentsApiFirst(user.id)
      if (!active) return
      if (!result?.ok) {
        pushToast('Unable to load salary assignment baseline from API. Please retry.', {
          title: 'Salary baseline unavailable',
          color: 'danger',
        })
        setSalaryAssignments([])
        setIsSalaryAssignmentsLoading(false)
        return
      }
      setSalaryAssignments(Array.isArray(result?.data) ? result.data : [])
      setIsSalaryAssignmentsLoading(false)
    }
    hydrateSalaryAssignments()
    return () => {
      active = false
    }
  }, [pushToast, user?.id])

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
