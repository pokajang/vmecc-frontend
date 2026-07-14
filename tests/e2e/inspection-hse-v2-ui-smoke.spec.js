const { expect, test } = require('@playwright/test')
const { setInspectionPhotoFromButton } = require('./support/inspection-photo')

const apiBaseUrl = process.env.VMECC_E2E_API_URL || 'http://localhost:8000/api'
const smokeEmail = process.env.VMECC_SMOKE_EMAIL || 'codex.smoke.admin@vmecc.local'
const smokePassword = process.env.VMECC_SMOKE_PASSWORD || 'SmokeAdmin!2026'
const routeTimeoutMs = Number(process.env.VMECC_SMOKE_ROUTE_TIMEOUT_MS || 30_000)

const login = async (page) => {
  const response = await page.context().request.post(`${apiBaseUrl}/auth/login`, {
    headers: { Accept: 'application/json' },
    data: { email: smokeEmail, password: smokePassword, remember: true },
  })
  expect(response.status()).toBe(200)
  const body = await response.json()
  expect(body.csrf_token).toBeTruthy()
  return String(body.csrf_token)
}

const mutationHeaders = (csrfToken) => ({
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'X-CSRF-Token': csrfToken,
})

const clearInspectionDraft = async (page, csrfToken) => {
  const response = await page
    .context()
    .request.delete(`${apiBaseUrl}/reports/draft?report_type=inspection`, {
      headers: mutationHeaders(csrfToken),
    })
  expect([200, 404]).toContain(response.status())
}

const openHseForm = async (page) => {
  await page.goto('/inspection/new', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('#root')).toBeVisible({ timeout: routeTimeoutMs })

  const showMore = page
    .getByRole('button', { name: /show more/i })
    .or(page.getByRole('radio', { name: /show more/i }))
    .first()
  const hseOption = page.getByRole('radio', { name: /Health Safety Environment/i }).first()
  await expect(hseOption.or(showMore)).toBeVisible({ timeout: routeTimeoutMs })
  if (!(await hseOption.isVisible())) await showMore.click()
  await expect(hseOption).toBeVisible({ timeout: routeTimeoutMs })
  await hseOption.click()
}

const chooseFirstLocationOption = async (page, heading) => {
  const section = page.locator('.inspection-form-section').filter({ hasText: heading }).first()
  await expect(section).toBeVisible({ timeout: routeTimeoutMs })
  const option = section.locator('[role="radio"]').first()
  await expect(option).toBeVisible({ timeout: routeTimeoutMs })
  await option.click()
}

const submitHseObservation = async ({
  page,
  csrfToken,
  observationType,
  description,
  immediateAction = '',
  fileName,
}) => {
  await openHseForm(page)
  await chooseFirstLocationOption(page, 'Choose Zone')
  await chooseFirstLocationOption(page, 'Choose Main Area')
  await chooseFirstLocationOption(page, 'Choose Location')
  await expect(page.getByText('What did you observe?', { exact: true })).toBeVisible({
    timeout: routeTimeoutMs,
  })

  await page.getByRole('button', { name: new RegExp(observationType, 'i') }).click()
  await page.getByRole('textbox', { name: 'Observation description' }).fill(description)
  if (immediateAction) {
    await page.getByRole('textbox', { name: 'Immediate corrective action' }).fill(immediateAction)
  }

  await setInspectionPhotoFromButton(
    page
      .getByRole('button', { name: 'Take photo', exact: true })
      .or(page.getByRole('button', { name: 'Add observation photo', exact: true }))
      .first(),
    fileName,
  )
  await expect(page.getByText('No observation photo attached.')).toHaveCount(0)

  const reportResponsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname.endsWith('/api/reports') &&
      response.request().method() === 'POST',
    { timeout: 60_000 },
  )
  const submitButton = page.getByRole('button', { name: 'Submit Report', exact: true }).first()
  await expect(submitButton).toBeEnabled({ timeout: routeTimeoutMs })
  await submitButton.click()

  const response = await reportResponsePromise
  expect(response.status()).toBe(201)
  const requestPayload = response.request().postDataJSON()
  const responseBody = await response.json()
  const reportUid = String(responseBody?.data?.id || '')
  expect(reportUid).toBeTruthy()
  try {
    expect(requestPayload.status).toBe('Submitted')
    expect(responseBody.data.status).toBe('Submitted')
    expect(responseBody.data.submittedBy).toBeTruthy()
    expect(requestPayload.payload.hsePayloadVersion).toBe(2)
    expect(requestPayload.payload.hseSelections).toEqual([
      observationType === 'Unsafe Act' ? 'unsafeAct' : 'unsafeCondition',
    ])
    expect(requestPayload.payload.photos).toHaveLength(1)
    expect(requestPayload.payload.hseImmediateAction).toBe(immediateAction)

    // Report creation resolves before the surrounding submit workflow finishes
    // reloading records, deleting the draft, and navigating back to the module.
    await page.waitForURL((url) => url.pathname === '/inspection', {
      timeout: routeTimeoutMs,
    })
    const latestDraft = await page
      .context()
      .request.get(`${apiBaseUrl}/reports/draft?report_type=inspection`, {
        headers: { Accept: 'application/json' },
      })
    expect(latestDraft.status()).toBe(200)
    expect((await latestDraft.json()).data).toBeNull()

    await page.goto(`/inspection/${encodeURIComponent(reportUid)}`, {
      waitUntil: 'domcontentloaded',
    })
    await expect(page.getByText('Submitted', { exact: true }).first()).toBeVisible({
      timeout: routeTimeoutMs,
    })
    const findingSection = page.getByRole('button', {
      name: new RegExp(`${observationType} Finding`, 'i'),
    })
    await expect(findingSection).toBeVisible({ timeout: routeTimeoutMs })
    await findingSection.click()
    await expect(page.getByText(description, { exact: true })).toBeVisible({
      timeout: routeTimeoutMs,
    })
    await expect(page.getByText(observationType, { exact: true }).first()).toBeVisible()
    await expect(page.locator('input, textarea, select')).toHaveCount(0)
  } finally {
    const sessionResponse = await page.context().request.get(`${apiBaseUrl}/auth/session`, {
      headers: { Accept: 'application/json' },
    })
    const currentCsrfToken = sessionResponse.ok()
      ? String((await sessionResponse.json()).csrf_token || csrfToken)
      : csrfToken
    const deleteResponse = await page
      .context()
      .request.delete(`${apiBaseUrl}/reports/${encodeURIComponent(reportUid)}`, {
        headers: mutationHeaders(currentCsrfToken),
      })
    expect([200, 204, 404]).toContain(deleteResponse.status())
  }
}

test.describe.serial('HSE v2 browser lifecycle', () => {
  test('submits and displays an unsafe condition with immediate action', async ({ page }) => {
    test.setTimeout(3 * 60_000)
    const csrfToken = await login(page)
    await clearInspectionDraft(page, csrfToken)

    await submitHseObservation({
      page,
      csrfToken,
      observationType: 'Unsafe Condition',
      description: 'Open edge beside the access route had no protective barrier.',
      immediateAction: 'Stopped access and installed a temporary barrier.',
      fileName: 'hse-unsafe-condition.png',
    })
  })

  test('submits an unsafe act without optional immediate action at mobile width', async ({
    page,
  }) => {
    test.setTimeout(3 * 60_000)
    await page.setViewportSize({ width: 390, height: 844 })
    const csrfToken = await login(page)
    await clearInspectionDraft(page, csrfToken)

    await submitHseObservation({
      page,
      csrfToken,
      observationType: 'Unsafe Act',
      description: 'Worker crossed the active barricade without authorization.',
      fileName: 'hse-unsafe-act-mobile.png',
    })
  })
})
