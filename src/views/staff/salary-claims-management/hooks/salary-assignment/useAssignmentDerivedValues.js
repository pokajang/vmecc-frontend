import { useMemo } from 'react'
import { calculateSalaryDetailTotals, calculateStatutoryDeductions } from './assignmentStateDomain'

const useAssignmentDerivedValues = ({
  assignmentDraft,
  payComponentsDraft,
  payComponentsEditMode,
  statutoryRates,
  statutoryRatesFeatureEnabled,
}) => {
  const payComponentSource = useMemo(
    () =>
      payComponentsEditMode
        ? {
            basicSalary: payComponentsDraft.basicSalary,
            allowances: payComponentsDraft.allowances,
            employeeContributions: payComponentsDraft.employeeDeductions,
          }
        : assignmentDraft,
    [
      assignmentDraft,
      payComponentsDraft.allowances,
      payComponentsDraft.basicSalary,
      payComponentsDraft.employeeDeductions,
      payComponentsEditMode,
    ],
  )

  const salaryDetailTotals = useMemo(
    () => calculateSalaryDetailTotals(payComponentSource),
    [payComponentSource],
  )

  const calculatedDeductions = useMemo(
    () =>
      calculateStatutoryDeductions({
        salaryDetailTotals,
        statutoryRates,
        statutoryRatesFeatureEnabled,
      }),
    [salaryDetailTotals, statutoryRates, statutoryRatesFeatureEnabled],
  )

  return {
    salaryDetailTotals,
    calculatedDeductions,
  }
}

export default useAssignmentDerivedValues
