const { expect, test } = require('@playwright/test')
const { loginPersonaThroughUi } = require('../live-uat/live-uat-support')
const {
  createRunOwnedRegistry,
  installControlledCrudRequestGuard,
  requireControlledCrudEnvironment,
} = require('../live-uat/live-crud-support')

const UAT_MARKER_PATTERN = /VMECC-QA-\d{8}-\d{6}-[a-z0-9]{6}/i

test('removes one explicitly supplied, marker-verified inspection draft', async ({
  page,
  context,
}) => {
  const { marker } = requireControlledCrudEnvironment()
  const draftId = String(process.env.VMECC_LIVE_UAT_CLEANUP_DRAFT_ID || '').trim()
  if (!draftId)
    throw new Error('Set VMECC_LIVE_UAT_CLEANUP_DRAFT_ID for an explicit recovery target')

  const registry = createRunOwnedRegistry({ marker })
  const guard = await installControlledCrudRequestGuard(context, registry)
  try {
    await loginPersonaThroughUi(page, 'trt')
    const draft = await page.evaluate(async (id) => {
      const origin = 'https://vmecc-api.amiosh.com/api'
      const response = await fetch(`${origin}/reports/drafts/${encodeURIComponent(id)}`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
      return { status: response.status, body: await response.text() }
    }, draftId)
    if (draft.status === 404) {
      expect(guard.ledger).toEqual([])
      return
    }
    expect(draft.status).toBe(200)
    expect(UAT_MARKER_PATTERN.test(draft.body)).toBe(true)

    registry.register({ collectionPath: '/reports/drafts', id: draftId })
    const deleted = await page.evaluate(async (id) => {
      const origin = 'https://vmecc-api.amiosh.com/api'
      const session = await fetch(`${origin}/auth/session`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
      const payload = await session.json().catch(() => ({}))
      const response = await fetch(`${origin}/reports/drafts/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          ...(payload?.csrf_token ? { 'X-CSRF-Token': payload.csrf_token } : {}),
        },
      })
      return response.status
    }, draftId)
    expect([200, 204, 404]).toContain(deleted)
    expect(guard.ledger).toEqual([])
  } finally {
    await guard.dispose()
  }
})
