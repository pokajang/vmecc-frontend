const { expect, test } = require('@playwright/test')
const { API_BASE_URL } = require('./live-uat/live-uat-support')
const {
  PRODUCTION_ACKNOWLEDGEMENT,
  createRunOwnedRegistry,
  requireControlledCrudEnvironment,
  serializeControlledCrudLedger,
} = require('./live-uat/live-crud-support')

const runId = 'VMECC-QA-20260814-123456-abcdef'
const environment = {
  VMECC_LIVE_UAT: '1',
  VMECC_LIVE_UAT_ALLOW_MUTATIONS: '1',
  VMECC_LIVE_UAT_CONFIRM_PRODUCTION: PRODUCTION_ACKNOWLEDGEMENT,
  VMECC_LIVE_UAT_BASE_URL: 'https://vmecc.amiosh.com',
  VMECC_LIVE_UAT_API_URL: API_BASE_URL,
  E2E_RUN_ID: runId,
  VMECC_LIVE_UAT_MARKER: runId,
}

test.describe('controlled live CRUD safety contract', () => {
  test('requires explicit, exact production opt-in and a matching run marker', () => {
    expect(requireControlledCrudEnvironment(environment)).toEqual({ runId, marker: runId })
    expect(() =>
      requireControlledCrudEnvironment({ ...environment, VMECC_LIVE_UAT_READ_ONLY: '1' }),
    ).toThrow(/refuses VMECC_LIVE_UAT_READ_ONLY/i)
    expect(() =>
      requireControlledCrudEnvironment({ ...environment, VMECC_LIVE_UAT_MARKER: 'other' }),
    ).toThrow(/marker must exactly match/i)
    expect(() =>
      requireControlledCrudEnvironment({ ...environment, VMECC_LIVE_ALLOW_FOREIGN_WORKFLOW: '1' }),
    ).toThrow(/refuses VMECC_LIVE_ALLOW_FOREIGN_WORKFLOW/i)
  })

  test('allows only marker-bearing creates and known run-owned records', () => {
    const registry = createRunOwnedRegistry({ marker: runId, createPaths: ['/reports'] })
    const createRequest = {
      method: () => 'POST',
      url: () => `${API_BASE_URL}/reports`,
      postDataJSON: () => ({ title: `${runId} report` }),
    }
    expect(registry.classify(createRequest)).toBe('allow-owned-create')

    const foreignCreate = { ...createRequest, postDataJSON: () => ({ title: 'ordinary report' }) }
    expect(registry.classify(foreignCreate)).toBe('block-mutation')

    registry.register({ collectionPath: '/reports', id: 'uat-report-1' })
    const ownedPatch = {
      method: () => 'PATCH',
      url: () => `${API_BASE_URL}/reports/uat-report-1`,
      postDataJSON: () => ({}),
    }
    expect(registry.classify(ownedPatch)).toBe('allow-owned-mutation')
    expect(
      registry.classify({ ...ownedPatch, url: () => `${API_BASE_URL}/reports/real-report-9` }),
    ).toBe('block-mutation')
    expect(
      registry.classify({ ...ownedPatch, url: () => `${API_BASE_URL}/users/uat-report-1` }),
    ).toBe('block-mutation')
  })

  test('allows only the explicit current-UAT onboarding snooze state', () => {
    const registry = createRunOwnedRegistry({
      marker: runId,
      selfStatePaths: ['/onboarding/states/profile_completion_trt'],
    })
    const allowed = {
      method: () => 'POST',
      url: () => `${API_BASE_URL}/onboarding/states/profile_completion_trt`,
      postDataJSON: () => ({ event: 'snoozed' }),
    }
    expect(registry.classify(allowed)).toBe('allow-owned-self-state')
    expect(
      registry.classify({ ...allowed, url: () => `${API_BASE_URL}/onboarding/states/other` }),
    ).toBe('block-mutation')
    expect(() => createRunOwnedRegistry({ marker: runId, selfStatePaths: ['/profile'] })).toThrow(
      /unsupported controlled self-state path/i,
    )
  })

  test('keeps the run-owned ID and blocked-request ledger sanitized and deterministic', () => {
    const registry = createRunOwnedRegistry({ marker: runId })
    registry.register({ collectionPath: '/reports', id: 'uat-2' })
    registry.register({ collectionPath: '/reports', id: 'uat-1' })
    const ledger = serializeControlledCrudLedger({
      registry,
      guardLedger: [{ method: 'PATCH', url: `${API_BASE_URL}/reports/123456789` }],
      cleanup: [{ id: 'uat-2', result: 'deleted' }],
    })
    expect(ledger).toContain('/api/reports/uat-1')
    expect(ledger).toContain('/api/reports/uat-2')
    expect(ledger).not.toContain('123456789')
  })
})
