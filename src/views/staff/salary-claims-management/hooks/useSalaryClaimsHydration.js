import { useCallback, useEffect, useRef, useState } from 'react'
import useStaffDirectory from 'src/hooks/useStaffDirectory'
import {
  fetchOvertimeRateSettings,
  fetchSalaryWorkflowRules,
  saveOvertimeRateSettings,
} from 'src/services/apiClient'
import { ROLE_OPTIONS } from 'src/constants/roles'
import { loadStaffOvertimeRecordsApiFirst } from 'src/services/overtimeApi'
import { loadStaffPayrollClaimsApiFirst } from 'src/services/payrollClaimsApi'
import {
  loadSalaryWorkflowRules,
  resolveSalaryWorkflowRule,
} from 'src/views/settings/salaryWorkflowStorage'
import useSalaryAssignmentState from './useSalaryAssignmentState'
import {
  defaultOvertimeRateSettings,
  normalizeClaimWorkflowRecord,
  OVERTIME_BASE_HOUR_MODES,
  OVERTIME_NORMAL_HOURS_STRATEGIES,
} from '../utils'

const useSalaryClaimsHydration = ({ user, isHrUser, pushToast }) => {
  const [salaryWorkflowRule, setSalaryWorkflowRule] = useState(() =>
    resolveSalaryWorkflowRule(loadSalaryWorkflowRules().data),
  )
  const [claimRows, setClaimRows] = useState([])
  const [isClaimsLoading, setIsClaimsLoading] = useState(true)
  const [allOvertimeRecords, setAllOvertimeRecords] = useState([])
  const lastContractWarningFingerprintRef = useRef('')
  const { loading: staffDirectoryLoading, optionsAll: staffDirectory } = useStaffDirectory({
    enabled: Boolean(user && isHrUser),
  })

  const assignmentState = useSalaryAssignmentState({ user, pushToast })
  const { hydrateAssignments, setOtRateSettings, setOtRateDirty, ...restAssignmentState } =
    assignmentState

  const hydrateClaims = useCallback(async () => {
    setIsClaimsLoading(true)
    let workflowRule = resolveSalaryWorkflowRule(loadSalaryWorkflowRules().data)
    try {
      const workflowResult = await fetchSalaryWorkflowRules()
      workflowRule = resolveSalaryWorkflowRule(workflowResult?.data || {})
    } catch {
      // fallback to local workflow storage
    }
    setSalaryWorkflowRule(workflowRule)

    const apiResult = await loadStaffPayrollClaimsApiFirst()
    const rows = Array.isArray(apiResult?.data) ? apiResult.data : []
    if (!apiResult?.ok) {
      pushToast('Unable to load staff payroll claims from API. Please retry.', {
        title: 'Load failed',
        color: 'danger',
      })
    }
    const normalizedRows = rows.map((row) => normalizeClaimWorkflowRecord(row, workflowRule))
    const contractIncompleteSalaryRows = normalizedRows.filter(
      (row) => row?.type === 'salary' && row?.salaryContractIncomplete === true,
    )
    if (contractIncompleteSalaryRows.length > 0) {
      const uniqueClaimIds = Array.from(
        new Set(
          contractIncompleteSalaryRows.map((row) => String(row?.id || '').trim()).filter(Boolean),
        ),
      )
      const fingerprint = `${contractIncompleteSalaryRows.length}:${uniqueClaimIds.join('|')}`
      if (lastContractWarningFingerprintRef.current !== fingerprint) {
        lastContractWarningFingerprintRef.current = fingerprint
        console.warn('[SalaryClaimsHydration] Incomplete salary contract fields detected', {
          count: contractIncompleteSalaryRows.length,
          claimIds: uniqueClaimIds.slice(0, 10),
        })
      }
    } else {
      lastContractWarningFingerprintRef.current = ''
    }
    setClaimRows(normalizedRows)
    setIsClaimsLoading(false)
  }, [pushToast])

  const hydrateOvertimeRates = useCallback(async () => {
    let next = defaultOvertimeRateSettings()
    try {
      const apiRates = await fetchOvertimeRateSettings()
      if (apiRates?.data && typeof apiRates.data === 'object') {
        const source = apiRates.data
        const sourceBaseCalc =
          source?.baseHourCalculation &&
          typeof source.baseHourCalculation === 'object' &&
          !Array.isArray(source.baseHourCalculation)
            ? source.baseHourCalculation
            : {}
        const sourceApplicability =
          source?.otApplicability &&
          typeof source.otApplicability === 'object' &&
          !Array.isArray(source.otApplicability)
            ? source.otApplicability
            : {}
        const sourceApplicabilityRoles = Array.isArray(sourceApplicability?.roles)
          ? sourceApplicability.roles
          : []
        const legacyTeamRole =
          sourceApplicability?.team === null || typeof sourceApplicability?.team === 'undefined'
            ? ''
            : String(sourceApplicability.team).trim()
        const normalizedApplicabilityRoles = Array.from(
          new Set(
            [
              ...sourceApplicabilityRoles.map((entry) => String(entry || '').trim()),
              legacyTeamRole,
            ].filter((entry) => entry && ROLE_OPTIONS.includes(entry)),
          ),
        )
        const hasLegacyRoleOverrideMode = sourceBaseCalc?.mode === 'role_override'
        const hasLegacyRoleOverridesField = Object.prototype.hasOwnProperty.call(
          sourceBaseCalc,
          'roleOverrides',
        )
        const normalizedMode =
          sourceBaseCalc?.mode === OVERTIME_BASE_HOUR_MODES.MONTH_DAYS_DIVISION
            ? OVERTIME_BASE_HOUR_MODES.MONTH_DAYS_DIVISION
            : OVERTIME_BASE_HOUR_MODES.AUTO_STATUTORY
        const normalizedNormalHoursStrategy = [
          OVERTIME_NORMAL_HOURS_STRATEGIES.STATUTORY_8H,
          OVERTIME_NORMAL_HOURS_STRATEGIES.GLOBAL,
          OVERTIME_NORMAL_HOURS_STRATEGIES.ROLE_BASED,
        ].includes(sourceBaseCalc?.normalHoursStrategy)
          ? sourceBaseCalc?.normalHoursStrategy
          : OVERTIME_NORMAL_HOURS_STRATEGIES.STATUTORY_8H
        const normalizedRoleNormalHours = Object.entries(
          sourceBaseCalc?.roleNormalHoursPerDay &&
            typeof sourceBaseCalc.roleNormalHoursPerDay === 'object' &&
            !Array.isArray(sourceBaseCalc.roleNormalHoursPerDay)
            ? sourceBaseCalc.roleNormalHoursPerDay
            : {},
        ).reduce((acc, [role, value]) => {
          const roleName = String(role || '').trim()
          if (!roleName || !ROLE_OPTIONS.includes(roleName)) return acc
          const nextValue = String(value ?? '').trim()
          if (!nextValue) return acc
          acc[roleName] = nextValue
          return acc
        }, {})

        const normalizedPayload = {
          ...defaultOvertimeRateSettings(),
          ...source,
          otApplicability: {
            roles:
              normalizedApplicabilityRoles.length > 0
                ? normalizedApplicabilityRoles
                : defaultOvertimeRateSettings().otApplicability.roles,
          },
          baseHourCalculation: {
            mode: normalizedMode,
            monthlyDivisor:
              sourceBaseCalc?.monthlyDivisor === null ||
              typeof sourceBaseCalc?.monthlyDivisor === 'undefined'
                ? defaultOvertimeRateSettings().baseHourCalculation.monthlyDivisor
                : String(sourceBaseCalc.monthlyDivisor),
            globalNormalHoursPerDay:
              sourceBaseCalc?.globalNormalHoursPerDay === null ||
              typeof sourceBaseCalc?.globalNormalHoursPerDay === 'undefined'
                ? defaultOvertimeRateSettings().baseHourCalculation.globalNormalHoursPerDay
                : String(sourceBaseCalc.globalNormalHoursPerDay),
            normalHoursStrategy: normalizedNormalHoursStrategy,
            defaultRoleHoursPerDay:
              sourceBaseCalc?.defaultRoleHoursPerDay === null ||
              typeof sourceBaseCalc?.defaultRoleHoursPerDay === 'undefined'
                ? defaultOvertimeRateSettings().baseHourCalculation.defaultRoleHoursPerDay
                : String(sourceBaseCalc.defaultRoleHoursPerDay),
            roleNormalHoursPerDay: normalizedRoleNormalHours,
          },
        }
        next = normalizedPayload

        // One-time migration for legacy payloads that still contain role override mode/fields.
        if (hasLegacyRoleOverrideMode || hasLegacyRoleOverridesField) {
          try {
            await saveOvertimeRateSettings(normalizedPayload)
          } catch {
            // Non-blocking; normalized payload is still used in memory.
          }
        }
      }
    } catch {
      // Keep defaults when API data is unavailable.
    }
    setOtRateSettings(next)
    setOtRateDirty(false)
  }, [setOtRateDirty, setOtRateSettings])

  const hydrateOvertime = useCallback(
    async ({ showWarningToast = false } = {}) => {
      const result = await loadStaffOvertimeRecordsApiFirst()
      const effectiveRows = Array.isArray(result?.data) ? result.data : []
      setAllOvertimeRecords(effectiveRows)

      if (showWarningToast && !result?.ok) {
        pushToast('Unable to load staff overtime records from API. Please retry.', {
          title: 'Data warning',
          color: 'warning',
        })
      }
      return result
    },
    [pushToast],
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    hydrateClaims()
    hydrateAssignments()
    hydrateOvertime({ showWarningToast: true })
    hydrateOvertimeRates()
  }, [hydrateAssignments, hydrateClaims, hydrateOvertime, hydrateOvertimeRates])

  return {
    salaryWorkflowRule,
    claimRows,
    isClaimsLoading,
    setClaimRows,
    hydrateClaims,
    allOvertimeRecords,
    hydrateOvertime,
    staffDirectory,
    staffDirectoryLoading,
    hydrateAssignments,
    setOtRateSettings,
    setOtRateDirty,
    reloadOvertimeRates: hydrateOvertimeRates,
    ...restAssignmentState,
  }
}

export default useSalaryClaimsHydration
