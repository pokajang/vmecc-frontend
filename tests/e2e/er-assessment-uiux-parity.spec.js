const { expect, test } = require('@playwright/test')

const baseUrl = process.env.VMECC_E2E_BASE_URL || 'http://127.0.0.1:3000'
const auditUser = {
  id: 916,
  name: 'ER Assessment UI Auditor',
  email: 'er.assessment.audit@example.test',
  status: 'active',
  permissions: ['*'],
  roles: ['System Administrator'],
}

const json = (route, body, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

const installApiStubs = async (
  page,
  { initialDraft = null, failedDraftSaves = 0, notifications = [] } = {},
) => {
  let draft = initialDraft
  let draftVersion = 0
  let mediaVersion = 0
  let remainingDraftFailures = failedDraftSaves
  await page.route(/^https?:\/\/(?:localhost|127\.0\.0\.1):8000\/api\/.*/, (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace(/^\/api/, '')

    if (path === '/auth/session') {
      return json(route, { user: auditUser, csrf_token: 'er-assessment-ui-audit-token' })
    }
    if (path === '/settings/modules') {
      return json(route, {
        data: { registry: [], configured: {}, effective: {}, fallbackMode: true },
      })
    }
    if (path === '/settings/system-maintenance') {
      return json(route, { data: { enabled: false, phase: 'off', message: '' } })
    }
    if (path.includes('/workflow/notifications')) {
      if (path.endsWith('/unread-count')) {
        return json(route, { data: { count: notifications.filter((item) => !item.read).length } })
      }
      return json(route, {
        data: notifications,
        meta: { unread_count: notifications.filter((item) => !item.read).length },
      })
    }
    if (path === '/reports/draft') {
      if (request.method() === 'GET') return json(route, { data: draft })
      if (request.method() === 'DELETE') {
        draft = null
        return json(route, { data: null })
      }
      if (remainingDraftFailures > 0) {
        remainingDraftFailures -= 1
        return json(route, { message: 'Temporary draft service failure.' }, 503)
      }
      const body = request.postDataJSON()
      draftVersion += 1
      draft = {
        id: 701,
        draft_id: 'era-uiux-draft-1',
        report_type: 'er-assessment',
        version: draftVersion,
        saved_at: new Date().toISOString(),
        payload: body.payload,
      }
      return json(route, { data: draft })
    }
    if (path === '/report-media' && request.method() === 'POST') {
      mediaVersion += 1
      return json(route, {
        data: {
          media_id: `rpm-era-uiux-${mediaVersion}`,
          url: `/report-media/rpm-era-uiux-${mediaVersion}`,
          thumbnail_url: `/report-media/rpm-era-uiux-${mediaVersion}?variant=thumbnail`,
          file_name: 'rescue-access.png',
          mime_type: 'image/png',
          size_bytes: 68,
          width: 1,
          height: 1,
        },
      })
    }
    if (path.startsWith('/report-media/') && request.method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
          'base64',
        ),
      })
    }
    if (path.startsWith('/reports')) {
      return json(route, { data: [], meta: {} })
    }

    return json(route, { data: [], meta: {} })
  })
}

const expectNoHorizontalOverflow = async (page) => {
  const metrics = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
  }))
  expect(metrics.document, JSON.stringify(metrics)).toBeLessThanOrEqual(metrics.viewport + 1)
}

const capture = async (page, name) => {
  if (process.env.VMECC_CAPTURE_UIUX !== '1') return
  await page.screenshot({
    path: `../.visual-evidence/er-assessment-${name}.png`,
    fullPage: true,
  })
}

const completeSetup = async (page) => {
  await page.getByLabel(/Company.*assessed/i).fill('VMECC')
  await page.getByLabel(/Assessment date/i).fill('2026-08-27')
  await page.getByLabel(/Location/i).fill('Process Area A')
  const workActivity = page.getByLabel('Work activity being assessed', { exact: true })
  await workActivity.nth(0).selectOption('working-at-height')
  await workActivity.nth(1).fill('Replace elevated lighting.')
}

const saveRequirementResponse = async (page) => {
  const saved = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname.endsWith('/api/reports/draft') &&
      response.request().method() === 'POST' &&
      response.ok(),
  )
  const saveButton = page.getByRole('button', { name: /^Save/i }).last()
  await expect(saveButton).toBeVisible()
  await saveButton.click()
  await saved
}

const requirementResponseChoices = async (page, requirement, index) => {
  const name = `Requirement ${index + 1} response`
  return requirement.getByRole('group', { name })
}

const selectInlineRequirementResponse = async (page, requirement, index, response) => {
  const saved = page.waitForResponse(
    (result) =>
      new URL(result.url()).pathname.endsWith('/api/reports/draft') &&
      result.request().method() === 'POST' &&
      result.ok(),
  )
  const choice = (await requirementResponseChoices(page, requirement, index)).getByRole('button', {
    name: response,
    exact: true,
  })
  await choice.click()
  await saved
  await expect(choice).toHaveAttribute('aria-pressed', 'true')
}

const completeAssessment = async (
  page,
  { theme = '', captureStage = '', includeRequirementEvidence = false } = {},
) => {
  const themeQuery = theme ? `?theme=${theme}` : ''
  await page.goto(`${baseUrl}/report/er-assessment/new/setup${themeQuery}`, {
    waitUntil: 'domcontentloaded',
  })
  await expect(page.getByTestId('er-assessment-report-setup-ready')).toBeVisible()
  await completeSetup(page)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  await expect(page.getByRole('heading', { name: 'Emergency response readiness' })).toBeVisible()
  const requirementRows = page
    .getByRole('region', { name: 'Emergency response readiness' })
    .getByRole('group', { name: /^Requirement \d+:/ })
  await expect(requirementRows.first()).toBeVisible()
  const responseCount = await requirementRows.count()
  expect(responseCount).toBeGreaterThan(0)
  for (let index = 0; index < responseCount; index += 1) {
    const requirement = requirementRows.nth(index)
    if (index === 0 && includeRequirementEvidence) {
      await (await requirementResponseChoices(page, requirement, index))
        .getByRole('button', { name: 'No', exact: true })
        .click()
      const requirementDialog = page.getByRole('dialog', { name: 'Add issue details' })
      await expect(requirementDialog).toBeVisible()
      await requirementDialog
        .getByLabel(/Gap and immediate action/)
        .fill('Immediate barricade and rescue briefing required before work begins.')
      const uploaded = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname.endsWith('/api/report-media') &&
          response.request().method() === 'POST' &&
          response.ok(),
      )
      await requirementDialog
        .getByLabel('Upload er-assessment report photos', { exact: true })
        .setInputFiles({
          name: 'rescue-gap.png',
          mimeType: 'image/png',
          buffer: Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
            'base64',
          ),
        })
      await uploaded
      await saveRequirementResponse(page)
      continue
    }
    await selectInlineRequirementResponse(page, requirement, index, 'Yes')
  }
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  await page
    .getByLabel('Rescue plan', { exact: true })
    .fill(
      'Raise the alarm, isolate the area, recover using the rescue kit, and transfer the casualty to the clinic.',
    )
  await page.locator('input[type="file"]').setInputFiles({
    name: 'rescue-access.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    ),
  })
  const layoutPreview = page.getByAltText('Rescue access layout preview')
  await expect(layoutPreview).toBeVisible()
  await expect.poll(() => layoutPreview.evaluate((image) => image.naturalWidth)).toBeGreaterThan(0)
  await expect(page.getByText('rescue-access.png', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Rescue access layout ready for review.')).toBeVisible()
  if (captureStage) await capture(page, captureStage)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  await page.getByLabel('Rescue equipment item 1').fill('Rope rescue kit')
  await page.getByRole('button', { name: 'Add equipment', exact: false }).click()
  await page.getByLabel('Rescue equipment item 2').fill('Stretcher')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  const names = page.getByLabel('Name', { exact: true })
  const companies = page.getByLabel('Company', { exact: true })
  const signatures = page.getByLabel('Signature / signed name', { exact: true })
  await names.nth(0).fill('Inspector One')
  await companies.nth(0).fill('VMECC')
  await signatures.nth(0).fill('Inspector One')
  await names.nth(1).fill('Job Leader One')
  await companies.nth(1).fill('Vendor Company')
  await signatures.nth(1).fill('Job Leader One')
  await page.getByTestId('er-assessment-review-action').click()

  await expect(page.getByRole('heading', { name: 'Working at Height' })).toBeVisible()
  await expect(page.getByText('Emergency response readiness', { exact: true })).toBeVisible()
  await expect(page.getByText('Rope rescue kit', { exact: true })).toBeVisible()
  await expect(page.getByText('Inspector One', { exact: true }).first()).toBeVisible()
  if (includeRequirementEvidence) {
    await expect(page.getByRole('button', { name: /^View photo 1:/ })).toBeVisible()
  }
}

for (const viewport of [
  { name: 'mobile-320', width: 320, height: 720 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 1000 },
]) {
  test(`ER Assessment first-time journey preserves report UI parity on ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await installApiStubs(page)
    await completeAssessment(page, {
      captureStage: viewport.name === 'mobile-390' ? 'mobile-390-rescue-light' : '',
      includeRequirementEvidence: viewport.name === 'mobile-390',
    })
    await expectNoHorizontalOverflow(page)
    await capture(page, `${viewport.name}-review-light`)

    const reviewActions = page.getByLabel('Report review actions')
    await expect(reviewActions.getByRole('button', { name: 'Edit', exact: true })).toBeVisible()
    await expect(
      reviewActions.getByRole('button', { name: 'Confirm Submit', exact: true }),
    ).toBeVisible()
  })
}

test('ER Assessment remains coherent in dark mode', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await installApiStubs(page)
  await completeAssessment(page, { theme: 'dark', captureStage: 'mobile-390-rescue-dark' })
  await expect(page.locator('html')).toHaveAttribute('data-coreui-theme', 'dark')
  await expectNoHorizontalOverflow(page)
  await capture(page, 'mobile-390-review-dark')
})

test('ER Assessment explains and recovers from an incomplete setup', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await installApiStubs(page)
  await page.goto(`${baseUrl}/report/er-assessment/new/setup`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  await expect(page.getByText(/Company.*required/i)).toBeVisible()
  await expect(page.getByText(/Work activity.*required/i)).toBeVisible()
  await expect(page).toHaveURL(/\/report\/er-assessment\/new\/setup/)
  await expectNoHorizontalOverflow(page)
})

test('ER Assessment resumes an interrupted draft at the saved stage', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await installApiStubs(page)
  await page.goto(`${baseUrl}/report/er-assessment/new/setup`, { waitUntil: 'domcontentloaded' })

  await completeSetup(page)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Emergency response readiness' })).toBeVisible()

  const firstRequirement = page
    .getByRole('region', { name: 'Emergency response readiness' })
    .getByRole('group', { name: /^Requirement \d+:/ })
    .first()
  await selectInlineRequirementResponse(page, firstRequirement, 0, 'Yes')

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/\/report\/er-assessment\/new\/requirements/)
  await expect(page.getByText('Process Area A', { exact: true })).toBeVisible()
  const reloadedFirstRequirement = page
    .getByRole('region', { name: 'Emergency response readiness' })
    .getByRole('group', { name: /^Requirement \d+:/ })
    .first()
  await expect(
    (await requirementResponseChoices(page, reloadedFirstRequirement, 0)).getByRole('button', {
      name: 'Yes',
      exact: true,
    }),
  ).toHaveAttribute('aria-pressed', 'true')
})

test('ER Assessment preserves seeded setup context immediately and after reload', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await installApiStubs(page)
  await page.goto(`${baseUrl}/report/er-assessment/new/setup?type=working-at-height`, {
    waitUntil: 'domcontentloaded',
  })
  await expect(page.getByTestId('er-assessment-report-setup-ready')).toBeVisible()

  await completeSetup(page)
  await page.getByLabel(/Company.*assessed/i).fill('Context Carry Company')
  await page.getByLabel(/Location/i).fill('Context Carry Location')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  await expect(page.getByRole('heading', { name: 'Emergency response readiness' })).toBeVisible()
  await expect(page.getByText('Context Carry Company', { exact: true })).toBeVisible()
  await expect(page.getByText('Context Carry Location', { exact: true })).toBeVisible()

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Emergency response readiness' })).toBeVisible()
  await expect(page.getByText('Context Carry Company', { exact: true })).toBeVisible()
  await expect(page.getByText('Context Carry Location', { exact: true })).toBeVisible()
})

test('ER Assessment uses context-specific optional remarks and No issue wording', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await installApiStubs(page)
  await page.goto(`${baseUrl}/report/er-assessment/new/setup?type=working-at-height`, {
    waitUntil: 'domcontentloaded',
  })
  await completeSetup(page)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  const firstRequirement = page.getByRole('group', { name: /^Requirement 1:/ })
  await firstRequirement
    .getByRole('button', { name: 'Add optional remarks for requirement 1' })
    .click()

  const remarksDrawer = page.getByRole('dialog', { name: 'Add remarks' })
  await expect(remarksDrawer).toBeVisible()
  await expect(remarksDrawer.getByLabel('Remarks (optional)', { exact: true })).toBeVisible()
  await expect(remarksDrawer.getByRole('button', { name: 'Take photo', exact: true })).toHaveCount(
    0,
  )
  await remarksDrawer.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(remarksDrawer).toBeHidden()

  await firstRequirement
    .getByRole('group', { name: 'Requirement 1 response' })
    .getByRole('button', { name: 'No', exact: true })
    .click()

  const issueDrawer = page.getByRole('dialog', { name: 'Add issue details' })
  await expect(issueDrawer).toBeVisible()
  await expect(
    issueDrawer.getByLabel('Gap and immediate action (required)', { exact: true }),
  ).toBeVisible()
  await expect(issueDrawer.getByRole('button', { name: 'Take photo', exact: true })).toBeVisible()
})

test('ER Assessment blocks progress when draft persistence fails and offers recovery', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await installApiStubs(page, { failedDraftSaves: 1 })
  await page.goto(`${baseUrl}/report/er-assessment/new/setup`, { waitUntil: 'domcontentloaded' })

  await completeSetup(page)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  await expect(
    page.getByText(
      'The draft could not be saved. Your changes remain in this form; use Retry save when ready.',
    ),
  ).toBeVisible()
  await expect(page).toHaveURL(/\/report\/er-assessment\/new\/setup/)
  const saved = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname.endsWith('/api/reports/draft') &&
      response.request().method() === 'POST' &&
      response.ok(),
  )
  await page.getByRole('button', { name: 'Retry save', exact: true }).click()
  await saved
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page).toHaveURL(/\/report\/er-assessment\/new\/requirements/)
})

test('ER Assessment notification identifies the report family and opens the record', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await installApiStubs(page, {
    notifications: [
      {
        id: 99,
        module: 'report',
        eventType: 'submitted',
        recordType: 'report',
        recordId: 701,
        recordDisplayId: 'ERA-20260827-001',
        reportType: 'er-assessment',
        reportUid: 'era-notify-1',
        actionRequired: true,
        actionRequiredForViewer: true,
        message: 'Field User submitted report ERA-20260827-001.',
        createdAt: '2026-08-27T08:00:00.000Z',
        read: false,
        metadata: {
          module: 'report',
          reportType: 'er-assessment',
          reportUid: 'era-notify-1',
          nextActionRole: 'Incident Commander',
        },
      },
    ],
  })
  await page.goto(`${baseUrl}/report/er-assessment`, { waitUntil: 'domcontentloaded' })

  await page.getByRole('button', { name: 'Notifications' }).click()
  await expect(page.getByText('Field User submitted report ERA-20260827-001.')).toBeVisible()
  await expect(
    page.locator('.notification-item-meta', { hasText: 'ER Assessment - Submitted' }),
  ).toBeVisible()
  await page.getByText('Field User submitted report ERA-20260827-001.').click()
  await expect(page).toHaveURL(/\/report\/er-assessment\/era-notify-1$/)
})
