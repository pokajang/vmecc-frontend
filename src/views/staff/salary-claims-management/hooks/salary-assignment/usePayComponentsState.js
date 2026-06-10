import { useCallback, useState } from 'react'
import { asInputNumber, createAllowanceDraftItem, parseAmount, roundMoney } from '../../utils'
import {
  createEmptyPayComponentsDraft,
  ensureDefaultAllowanceRows,
  normalizeAllowanceDraftRows,
  resolveEmployeeContribution,
} from './assignmentStateDomain'

const usePayComponentsState = ({
  assignmentDraft,
  setAssignmentDraft,
  calculatedDeductionsRef,
  pushToast,
}) => {
  const [payComponentsEditMode, setPayComponentsEditMode] = useState(false)
  const [payComponentsDraft, setPayComponentsDraft] = useState(createEmptyPayComponentsDraft)

  const resetPayComponentsEdit = useCallback(() => {
    setPayComponentsEditMode(false)
    setPayComponentsDraft(createEmptyPayComponentsDraft())
  }, [])

  const editPayComponents = useCallback(() => {
    setPayComponentsDraft({
      basicSalary: asInputNumber(assignmentDraft.basicSalary),
      allowances: ensureDefaultAllowanceRows(assignmentDraft.allowances),
      employeeDeductions: { epf: '', perkeso: '', sip: '' },
    })
    setPayComponentsEditMode(true)
  }, [assignmentDraft.allowances, assignmentDraft.basicSalary])

  const cancelPayComponentsEdit = useCallback(() => {
    resetPayComponentsEdit()
  }, [resetPayComponentsEdit])

  const savePayComponentsEdit = useCallback(() => {
    const nextBasic = parseAmount(payComponentsDraft.basicSalary)
    if (nextBasic < 0) {
      pushToast('Basic salary cannot be negative.', {
        title: 'Invalid salary',
        color: 'danger',
      })
      return false
    }

    const nextAllowances = normalizeAllowanceDraftRows(payComponentsDraft.allowances).map(
      (row) => ({
        ...row,
        name: String(row.name || '').trim(),
        amount: roundMoney(row.amount),
      }),
    )
    const hasInvalidAllowance = nextAllowances.some(
      (row) => parseAmount(row.amount) > 0 && !String(row.name || '').trim(),
    )
    const hasNegativeAllowance = nextAllowances.some((row) => parseAmount(row.amount) < 0)
    if (hasNegativeAllowance) {
      pushToast('Allowance amount cannot be negative.', {
        title: 'Invalid allowance',
        color: 'danger',
      })
      return false
    }
    if (hasInvalidAllowance) {
      pushToast('Allowance name is required when amount is provided.', {
        title: 'Invalid allowance',
        color: 'danger',
      })
      return false
    }

    const getCalculatedEmployeeDeduction = (key) =>
      roundMoney(
        calculatedDeductionsRef.current?.rows?.find((row) => row.key === key)?.employeeAmount,
      )
    const nextEmployeeDeductions = {
      epf: resolveEmployeeContribution(
        payComponentsDraft?.employeeDeductions?.epf,
        getCalculatedEmployeeDeduction('epf'),
      ),
      perkeso: resolveEmployeeContribution(
        payComponentsDraft?.employeeDeductions?.perkeso,
        getCalculatedEmployeeDeduction('perkeso'),
      ),
      sip: resolveEmployeeContribution(
        payComponentsDraft?.employeeDeductions?.sip,
        getCalculatedEmployeeDeduction('sip'),
      ),
    }
    const hasNegativeDeduction = Object.values(nextEmployeeDeductions).some((value) => value < 0)
    if (hasNegativeDeduction) {
      pushToast('Employee deductions cannot be negative.', {
        title: 'Invalid deduction',
        color: 'danger',
      })
      return false
    }

    setAssignmentDraft((prev) => ({
      ...prev,
      basicSalary: asInputNumber(nextBasic),
      allowances: nextAllowances,
      employeeContributions: {
        epf: asInputNumber(nextEmployeeDeductions.epf),
        perkeso: asInputNumber(nextEmployeeDeductions.perkeso),
        sip: asInputNumber(nextEmployeeDeductions.sip),
      },
    }))
    resetPayComponentsEdit()
    return true
  }, [
    calculatedDeductionsRef,
    payComponentsDraft.allowances,
    payComponentsDraft.basicSalary,
    payComponentsDraft.employeeDeductions?.epf,
    payComponentsDraft.employeeDeductions?.perkeso,
    payComponentsDraft.employeeDeductions?.sip,
    pushToast,
    resetPayComponentsEdit,
    setAssignmentDraft,
  ])

  const addAllowanceRow = useCallback(() => {
    setPayComponentsEditMode(true)
    setPayComponentsDraft((prev) => {
      const current =
        Array.isArray(prev.allowances) && prev.allowances.length > 0
          ? prev.allowances
          : ensureDefaultAllowanceRows(assignmentDraft.allowances)
      return {
        basicSalary:
          typeof prev.basicSalary !== 'undefined' && prev.basicSalary !== ''
            ? prev.basicSalary
            : asInputNumber(assignmentDraft.basicSalary),
        allowances: [...current, createAllowanceDraftItem({ name: '', amount: '0' })],
        employeeDeductions: prev?.employeeDeductions || { epf: '', perkeso: '', sip: '' },
      }
    })
  }, [assignmentDraft.allowances, assignmentDraft.basicSalary])

  const updatePayComponentRow = useCallback(
    (rowType, rowId, field, value) => {
      if (!rowType || !field) return
      setPayComponentsDraft((prev) => {
        const base = {
          basicSalary:
            typeof prev.basicSalary !== 'undefined' && prev.basicSalary !== ''
              ? prev.basicSalary
              : asInputNumber(assignmentDraft.basicSalary),
          allowances:
            Array.isArray(prev.allowances) && prev.allowances.length > 0
              ? prev.allowances
              : ensureDefaultAllowanceRows(assignmentDraft.allowances),
          employeeDeductions: prev?.employeeDeductions || { epf: '', perkeso: '', sip: '' },
        }

        if (rowType === 'basic' && field === 'amount') return { ...base, basicSalary: value }
        if (rowType === 'allowance') {
          return {
            ...base,
            allowances: base.allowances.map((row) =>
              row.id === rowId ? { ...row, [field]: value } : row,
            ),
          }
        }
        if (rowType === 'deduction' && field === 'amount') {
          return {
            ...base,
            employeeDeductions: {
              ...base.employeeDeductions,
              [rowId]: value,
            },
          }
        }
        return base
      })
    },
    [assignmentDraft.allowances, assignmentDraft.basicSalary],
  )

  const deletePayComponentRow = useCallback(
    (rowType, rowId) => {
      if (rowType !== 'allowance' || !rowId) return
      setPayComponentsDraft((prev) => {
        const baseAllowances =
          Array.isArray(prev.allowances) && prev.allowances.length > 0
            ? prev.allowances
            : ensureDefaultAllowanceRows(assignmentDraft.allowances)
        return {
          basicSalary:
            typeof prev.basicSalary !== 'undefined' && prev.basicSalary !== ''
              ? prev.basicSalary
              : asInputNumber(assignmentDraft.basicSalary),
          allowances: baseAllowances.filter((row) => row.id !== rowId),
          employeeDeductions: prev?.employeeDeductions || { epf: '', perkeso: '', sip: '' },
        }
      })
    },
    [assignmentDraft.allowances, assignmentDraft.basicSalary],
  )

  return {
    payComponentsEditMode,
    payComponentsDraft,
    resetPayComponentsEdit,
    editPayComponents,
    cancelPayComponentsEdit,
    savePayComponentsEdit,
    addAllowanceRow,
    updatePayComponentRow,
    deletePayComponentRow,
  }
}

export default usePayComponentsState
