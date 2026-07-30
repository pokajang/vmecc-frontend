// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  activatePayrollIdentity,
  clearPayrollSensitiveState,
  createPayrollRequestContext,
  getPayrollVolatileStorage,
  purgeLegacyPayrollBrowserData,
} from '../payrollPrivacy'

const createMemoryStorage = () => {
  const rows = new Map()
  return {
    get length() {
      return rows.size
    },
    key: (index) => Array.from(rows.keys())[index] ?? null,
    getItem: (key) => (rows.has(String(key)) ? rows.get(String(key)) : null),
    setItem: (key, value) => rows.set(String(key), String(value)),
    removeItem: (key) => rows.delete(String(key)),
    clear: () => rows.clear(),
  }
}

describe('payrollPrivacy', () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: createMemoryStorage(),
    })
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: createMemoryStorage(),
    })
  })

  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    clearPayrollSensitiveState()
  })

  it('purges legacy payroll records for every user identity', () => {
    localStorage.setItem('vmecc_claim_records_10', '{"salary":1000}')
    localStorage.setItem('vmecc_claim_records_20', '{"salary":2000}')
    localStorage.setItem('vmecc_salary_claim_assignments_10', '{"basicSalary":3100}')
    localStorage.setItem('vmecc_salary_claim_assignment_history_10', '{"basicSalary":3000}')
    localStorage.setItem('vmecc_salary_claim_assignment_drafts_10', '{"basicSalary":3200}')
    localStorage.setItem('vmecc_overtime_records_10', '{"durationMinutes":60}')
    localStorage.setItem('vmecc_overtime_draft_10', '{"reason":"private"}')
    sessionStorage.setItem('payroll-claim-autosave:10:salary', '{"amount":1000}')
    localStorage.setItem('unrelated-preference', 'keep')

    purgeLegacyPayrollBrowserData()

    expect(localStorage.getItem('vmecc_claim_records_10')).toBeNull()
    expect(localStorage.getItem('vmecc_claim_records_20')).toBeNull()
    expect(localStorage.getItem('vmecc_salary_claim_assignments_10')).toBeNull()
    expect(localStorage.getItem('vmecc_salary_claim_assignment_history_10')).toBeNull()
    expect(localStorage.getItem('vmecc_salary_claim_assignment_drafts_10')).toBeNull()
    expect(localStorage.getItem('vmecc_overtime_records_10')).toBeNull()
    expect(localStorage.getItem('vmecc_overtime_draft_10')).toBeNull()
    expect(sessionStorage.getItem('payroll-claim-autosave:10:salary')).toBeNull()
    expect(localStorage.getItem('unrelated-preference')).toBe('keep')
  })

  it('clears volatile payroll data when the authenticated identity changes', () => {
    activatePayrollIdentity('employee-a')
    getPayrollVolatileStorage().setItem('claim', '{"net":1000}')

    activatePayrollIdentity('employee-b')

    expect(getPayrollVolatileStorage().getItem('claim')).toBeNull()
  })

  it('invalidates and aborts requests created under a previous identity', () => {
    activatePayrollIdentity('employee-a')
    const request = createPayrollRequestContext('employee-a')
    expect(request.isCurrent()).toBe(true)

    activatePayrollIdentity('employee-b')

    expect(request.signal.aborted).toBe(true)
    expect(request.isCurrent()).toBe(false)
  })
})
