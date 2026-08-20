const { expect, test } = require('@playwright/test')
const {
  API_BASE_URL,
  getPersonaCredentials,
  loginPersonaThroughUi,
  redactDiagnostic,
  waitForApplicationReady,
} = require('../live-uat/live-uat-support')
const {
  createRunOwnedRegistry,
  installControlledCrudRequestGuard,
  requireControlledCrudEnvironment,
  serializeControlledCrudLedger,
} = require('../live-uat/live-crud-support')

const PERSONAS = [
  'trt',
  'incidentCommander',
  'contractManager',
  'humanResource',
  'finance',
  'sysadmin',
]

const accountSummary = async (page, persona) => {
  const response = await page.context().request.get(`${API_BASE_URL}/auth/session`, {
    headers: { Accept: 'application/json' },
  })
  expect(response.status()).toBe(200)
  const body = await response.json()
  const roles = Array.isArray(body?.user?.roles)
    ? body.user.roles.map((role) => (typeof role === 'string' ? role : role?.name)).filter(Boolean)
    : []
  return { persona, roles }
}

test.describe.serial('controlled live CRUD Stage 0 — UAT persona gate', () => {
  test('all required protected personas authenticate through the deployed UI', async ({
    browser,
  }, testInfo) => {
    test.setTimeout(8 * 60_000)
    test.skip(
      testInfo.project.name !== 'live-crud-desktop-chrome',
      'Account qualification runs once; responsive coverage belongs to the module journeys.',
    )
    const { marker } = requireControlledCrudEnvironment()
    const registry = createRunOwnedRegistry({ marker })
    const ledger = []

    for (const persona of PERSONAS) {
      const context = await browser.newContext({ serviceWorkers: 'block' })
      const page = await context.newPage()
      const guard = await installControlledCrudRequestGuard(context, registry)
      try {
        const credentials = getPersonaCredentials(persona)
        await loginPersonaThroughUi(page, persona)
        await waitForApplicationReady(page)
        await page.waitForTimeout(2_000)
        const summary = await accountSummary(page, persona)
        expect(summary.roles).toContain(credentials.role)
        ledger.push({
          persona,
          expectedRole: credentials.role,
          roles: summary.roles,
          status: 'passed',
        })
      } catch (error) {
        ledger.push({
          persona,
          status: 'failed',
          error: redactDiagnostic(error?.message || String(error)),
        })
        throw error
      } finally {
        await guard.dispose()
        await context.close()
      }
      await new Promise((resolve) => setTimeout(resolve, 2_000))
    }

    expect(registry.ownedIds()).toEqual([])
    expect(ledger.every((entry) => entry.status === 'passed')).toBe(true)
    expect(testInfo.outputPath).toBeTruthy()
    await testInfo.attach('persona-ledger', {
      body: Buffer.from(JSON.stringify(ledger, null, 2)),
      contentType: 'application/json',
    })
    await testInfo.attach('controlled-crud-guard-ledger', {
      body: Buffer.from(serializeControlledCrudLedger({ registry, guardLedger: [] })),
      contentType: 'application/json',
    })
  })
})
