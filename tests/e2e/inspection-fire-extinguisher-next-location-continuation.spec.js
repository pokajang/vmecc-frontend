import { expect, test } from '@playwright/test'

const apiBaseUrl = process.env.VMECC_E2E_API_URL || 'http://localhost:8000/api'
const routeTimeoutMs = Number(process.env.VMECC_SMOKE_ROUTE_TIMEOUT_MS || 30_000)
const smokeEmail = process.env.VMECC_SMOKE_EMAIL || 'codex.smoke.admin@vmecc.local'
const smokePassword = process.env.VMECC_SMOKE_PASSWORD || 'SmokeAdmin!2026'

const text = (value) => String(value || '').trim()

const stripProgressSuffix = (value = '') => {
  const raw = text(value)
  return raw
    .replace(/\s*\d+\s*\/\s*\d+\s*(?:fes?|locations?|areas?)\b.*$/i, '')
    .replace(/\s*\d+\s*(?:location|locations|area|areas|fes)\b.*$/i, '')
    .trim()
}

const parseJsonOrText = async (response) => {
  const bodyText = await response.text()
  try {
    return { body: JSON.parse(bodyText), text: bodyText }
  } catch {
    return { body: null, text: bodyText }
  }
}

const waitForAppReady = async (page, expectedPath = null) => {
  await expect(page.locator('#root')).toBeVisible({ timeout: routeTimeoutMs })

  if (expectedPath) {
    await page.waitForFunction(
      ({ expectedPath }) => {
        const normalize = (value) => {
          const trimmed = String(value || '').trim()
          if (!trimmed || trimmed === '/') return '/'
          return `/${trimmed.replace(/^\/+|\/+$/g, '')}`
        }
        const current = normalize(new URL(window.location.href).pathname)
        const expected = normalize(expectedPath)
        return current === expected || current.startsWith(`${expected}/`)
      },
      { expectedPath },
      { timeout: routeTimeoutMs },
    )
  }

  await page.waitForFunction(
    () => {
      const textContent = String(document.body?.innerText || '')
        .replace(/\s+/g, ' ')
        .trim()
      const loadingOnly = textContent.length <= 160 && /loading/i.test(textContent)
      return textContent.length > 0 && !loadingOnly
    },
    null,
    { timeout: routeTimeoutMs },
  )
}

const safeLoginApi = async (api) => {
  try {
    const response = await api.post(`${apiBaseUrl}/auth/login`, {
      headers: {
        Accept: 'application/json',
      },
      data: {
        email: smokeEmail,
        password: smokePassword,
        remember: true,
      },
    })
    if (response.ok()) return true
  } catch {
    // fallback to browser login below
  }
  return false
}

const loginInBrowser = async (page) => {
  const emailInput = page.getByRole('textbox', { name: 'Email' })
  const passwordInput = page.getByRole('textbox', { name: 'Password' })
  const signInButton = page.getByRole('button', { name: 'Sign in' })

  if (!(await signInButton.isVisible().catch(() => false))) {
    return
  }

  await emailInput.fill(smokeEmail)
  await passwordInput.fill(smokePassword)
  await signInButton.click()
  await page.waitForFunction(
    () => {
      const path = new URL(window.location.href).pathname
      const clean = `/${String(path || '').replace(/^\/+|\/+$/g, '')}`.replace('//', '/')
      return clean === '/' || clean.startsWith('/inspection') || clean.startsWith('/dashboard')
    },
    null,
    { timeout: routeTimeoutMs },
  )
}

const getCsrfToken = async (api) => {
  try {
    const response = await api.get(`${apiBaseUrl}/auth/session`, {
      headers: {
        Accept: 'application/json',
      },
    })
    if (!response.ok()) return ''
    const { body } = await parseJsonOrText(response)
    return text(body?.csrf_token)
  } catch {
    return ''
  }
}

const parseCreateExtinguisherBody = ({ body = {}, text: bodyText = '' }) => {
  const catalogId = text(
    body?.data?.catalogId ||
      body?.data?.catalog_id ||
      body?.data?.id ||
      body?.catalogId ||
      body?.catalog_id ||
      body?.id,
  )

  return {
    catalogId,
    body,
    bodyText,
  }
}

const parseReportBody = ({ body = {}, text: bodyText = '', response = null }) => {
  const requestPayload = response
    ? (() => {
        try {
          return response.request().postDataJSON?.() || {}
        } catch {
          return {}
        }
      })()
    : {}

  const reportUid = text(
    body?.data?.report_uid ||
      body?.data?.reportUid ||
      body?.report_uid ||
      body?.reportUid ||
      body?.uid ||
      body?.data?.uid ||
      body?.data?.id ||
      body?.id ||
      requestPayload?.report_uid ||
      requestPayload?.uid ||
      requestPayload?.id,
  )

  return {
    reportUid,
    body,
    bodyText,
  }
}

const openFireExtinguisherByAreaMode = async (page, loggedInByApi = false) => {
  const isFireExtinguisherVisible = async () =>
    page
      .getByText('Fire Extinguisher', { exact: true })
      .isVisible()
      .catch(() => false)
  const goToInspectionRoute = async () => {
    await page.goto('/inspection/new', { waitUntil: 'domcontentloaded' })
    await waitForAppReady(page)
  }
  const isInspectionPath = async () => {
    try {
      return new URL(page.url()).pathname.toLowerCase().startsWith('/inspection')
    } catch {
      return false
    }
  }

  await goToInspectionRoute()

  let hasFireType = await isFireExtinguisherVisible()
  if (!hasFireType) {
    if (!loggedInByApi) {
      await page.goto('/login', { waitUntil: 'domcontentloaded' })
      await waitForAppReady(page)
      await loginInBrowser(page)
      await waitForAppReady(page)
    }

    await goToInspectionRoute()
    hasFireType = await isFireExtinguisherVisible()
    if (!hasFireType) {
      if (!(await isInspectionPath())) {
        await page.getByRole('link', { name: 'Inspection', exact: true }).click()
      }
      await waitForAppReady(page)
    }
  }

  hasFireType = await isFireExtinguisherVisible()
  if (!hasFireType) {
    await goToInspectionRoute()
  }

  await expect(page.getByText('Fire Extinguisher', { exact: true }).first()).toBeVisible({
    timeout: routeTimeoutMs,
  })
  await page.getByText('Fire Extinguisher', { exact: true }).first().click()
  await page
    .getByRole('button', { name: /By Area/i })
    .first()
    .click()
}

const getSection = (page, title) =>
  page.locator('.inspection-form-section', { hasText: title }).first()

const getSelectedSectionOptionLabel = async (page, sectionTitle) => {
  const section = getSection(page, sectionTitle)
  const selected = section.locator('[role="radio"][aria-checked="true"]').first()
  const target = (await selected.count()) ? selected : section.locator('[role="radio"]').first()
  if (!(await target.isVisible().catch(() => false))) return ''
  return text(await target.textContent())
}

const expectProgressMetaForSelection = async (page, sectionTitle) => {
  const section = getSection(page, sectionTitle)
  const selected = section.locator('[role="radio"][aria-checked="true"]').first()
  const target = (await selected.count()) ? selected : section.locator('[role="radio"]').first()
  await expect(target).toBeVisible()
  const meta = target.locator('.inspection-option-meta')
  await expect(meta).toBeVisible()
  await expect(meta).toContainText(/\d+/)
}

const selectLocationByIndex = async (page, sectionTitle, index = 0) => {
  const section = getSection(page, sectionTitle)
  const optionCount = await section.locator('[role="radio"]').count()

  if (!optionCount) {
    return stripProgressSuffix(await getSelectedSectionOptionLabel(page, sectionTitle))
  }

  const option = section.locator('[role="radio"]').nth(index)
  if (!(await option.isVisible().catch(() => false))) {
    return stripProgressSuffix(await getSelectedSectionOptionLabel(page, sectionTitle))
  }

  const label = text(await option.textContent())
  await option.click()
  await expect
    .poll(
      async () => stripProgressSuffix(await getSelectedSectionOptionLabel(page, sectionTitle)),
      { timeout: routeTimeoutMs },
    )
    .toBe(stripProgressSuffix(label))
  return label
}

const selectOrResolveLocationByIndex = async (page, sectionTitle, index = 0) => {
  const selected = await getSelectedSectionOptionLabel(page, sectionTitle)
  if (selected) return stripProgressSuffix(selected)
  return selectLocationByIndex(page, sectionTitle, index)
}

const selectFireExtinguisherByAreaFirstLocation = async (page) => {
  const hasTypePicker = await page
    .getByText('Fire Extinguisher', { exact: true })
    .isVisible()
    .catch(() => false)
  if (hasTypePicker) {
    await expect(page.getByText('Fire Extinguisher', { exact: true })).toBeVisible({
      timeout: routeTimeoutMs,
    })
    await page.getByText('Fire Extinguisher', { exact: true }).first().click()

    const byAreaButton = page.getByRole('button', { name: /By Area/i })
    const hasByAreaButton = await byAreaButton.isVisible().catch(() => false)
    const editModeButton = page.getByRole('button', { name: 'Edit inspection mode' })

    if (!hasByAreaButton) {
      const hasEditModeButton = await editModeButton.isVisible().catch(() => false)
      if (hasEditModeButton) {
        await editModeButton.click()
        await expect(byAreaButton).toBeVisible({ timeout: routeTimeoutMs })
      }
    }

    if (await byAreaButton.isVisible().catch(() => false)) {
      await byAreaButton.first().click()
    }
  }

  const selectedZoneLabel = await selectOrResolveLocationByIndex(page, 'Choose Zone', 0)
  const selectedMainAreaLabel = await selectOrResolveLocationByIndex(page, 'Choose Main Area', 0)

  const locationSection = getSection(page, 'Choose Location')
  const locationCount = await locationSection.locator('[role="radio"]').count()
  if (locationCount < 1) {
    return {
      zone: stripProgressSuffix(selectedZoneLabel),
      mainArea: stripProgressSuffix(selectedMainAreaLabel),
      location: '',
    }
  }

  const selectedLocationLabel = await selectLocationByIndex(page, 'Choose Location', 0)

  return {
    zone: stripProgressSuffix(selectedZoneLabel),
    mainArea: stripProgressSuffix(selectedMainAreaLabel),
    location: stripProgressSuffix(selectedLocationLabel),
  }
}

const findSelectionWithAtLeastTwoLocations = async (page) => {
  const zoneSection = getSection(page, 'Choose Zone')
  const zoneCount = await zoneSection.locator('[role="radio"]').count()

  for (let z = 0; z < zoneCount; z++) {
    const zoneOption = getSection(page, 'Choose Zone').locator('[role="radio"]').nth(z)
    if (!(await zoneOption.isVisible().catch(() => false))) continue

    const zoneRaw = text(await zoneOption.textContent())
    await zoneOption.click()

    const mainAreaSection = getSection(page, 'Choose Main Area')
    await expect(mainAreaSection).toBeVisible({ timeout: routeTimeoutMs })
    const mainAreaCount = await mainAreaSection.locator('[role="radio"]').count()

    for (let m = 0; m < mainAreaCount; m++) {
      const mainAreaOption = getSection(page, 'Choose Main Area').locator('[role="radio"]').nth(m)
      if (!(await mainAreaOption.isVisible().catch(() => false))) continue

      const mainAreaRaw = text(await mainAreaOption.textContent())
      await mainAreaOption.click()

      const locationSection = getSection(page, 'Choose Location')
      await expect(locationSection).toBeVisible({ timeout: routeTimeoutMs })
      const locationCount = await locationSection.locator('[role="radio"]').count()

      if (locationCount > 1) {
        return {
          zone: stripProgressSuffix(zoneRaw),
          mainArea: stripProgressSuffix(mainAreaRaw),
          locationCount,
        }
      }
    }
  }

  return null
}

const fillExtinguisherModal = async (modal, rowId) => {
  const inputs = modal.locator('input')
  await expect(inputs.nth(3)).toBeVisible()
  await inputs.nth(3).fill(`FE-${rowId}-LOC`)
  await inputs.nth(4).fill(`FE-${rowId}-BAR`)
  await inputs.nth(5).fill('CO2')
  await inputs.nth(6).fill('2026-12-31')
}

const waitForCreateExtinguisherResponse = (response) => {
  if (response.request().method().toUpperCase() !== 'POST') return false
  try {
    const path = new URL(response.url()).pathname
    return path.endsWith('/api/inspection/fire-extinguishers')
  } catch {
    return false
  }
}

const createFireExtinguisherRow = async (page, rowId) => {
  await page
    .getByRole('button', { name: /Add extinguisher/i })
    .first()
    .click()
  const modal = page.locator('.card.border-primary', { hasText: 'Add extinguisher' }).last()
  await expect(modal).toBeVisible({ timeout: routeTimeoutMs })

  const responsePromise = page.waitForResponse(waitForCreateExtinguisherResponse, {
    timeout: routeTimeoutMs,
  })

  await fillExtinguisherModal(modal, rowId)
  await modal.getByRole('button', { name: 'Save extinguisher' }).click()

  const response = await responsePromise
  const { body, text: responseText } = await parseJsonOrText(response)
  const { catalogId } = parseCreateExtinguisherBody({ body, text: responseText })

  if (!response.ok()) throw new Error('Failed to create fire extinguisher record')

  const card = page
    .locator('[data-fire-extinguisher-row-id]')
    .filter({ hasText: `FE-${rowId}-LOC` })
    .first()
  await expect(card).toBeVisible({ timeout: routeTimeoutMs })

  return {
    idText: `FE-${rowId}-LOC`,
    catalogId,
    card,
  }
}

const expandRow = async (card) => {
  if (
    await card
      .getByText('FE Physical Condition')
      .isVisible()
      .catch(() => false)
  ) {
    return
  }

  const openButton = card.getByRole('button', { name: 'Open', exact: true })
  await openButton.click()
  await expect(card.getByText('FE Physical Condition')).toBeVisible()
}

const completeRowAsGood = async (card) => {
  await expect(card).toBeVisible()
  await expect(card.getByTestId('fire-extinguisher-status-not-inspected')).toBeVisible()

  await expandRow(card)
  const goodButtons = card.getByRole('button', { name: 'Good', exact: true })
  const yesButtons = card.getByRole('button', { name: 'Yes', exact: true })

  if ((await goodButtons.count()) > 0) await goodButtons.nth(0).click()
  if ((await goodButtons.count()) > 1) await goodButtons.nth(1).click()
  if ((await yesButtons.count()) > 0) await yesButtons.nth(0).click()
  if ((await yesButtons.count()) > 1) await yesButtons.nth(1).click()
  if ((await goodButtons.count()) > 2) await goodButtons.nth(2).click()

  await expect(card.getByTestId('fire-extinguisher-status-inspected')).toBeVisible({
    timeout: routeTimeoutMs,
  })
  await expect(card.getByTestId('fire-extinguisher-status-inline')).toContainText(/checked/i)
}

const deleteReport = async (api, csrfToken, reportUid) => {
  if (!reportUid || !csrfToken) return
  await api.delete(`${apiBaseUrl}/reports/${encodeURIComponent(reportUid)}`, {
    headers: {
      Accept: 'application/json',
      'X-CSRF-Token': csrfToken,
    },
  })
}

const deleteFireExtinguisherCatalogRow = async (api, csrfToken, catalogId) => {
  if (!catalogId || !csrfToken) return
  await api.delete(`${apiBaseUrl}/inspection/fire-extinguishers/${encodeURIComponent(catalogId)}`, {
    headers: {
      Accept: 'application/json',
      'X-CSRF-Token': csrfToken,
    },
  })
}

const submitFireExtinguisherInspection = async (page, options = {}) => {
  const expectedReviewText = text(options.reviewText)

  await page
    .getByRole('button', {
      name: /Continue to Review|Review Inspections|Review Submissions/,
      exact: false,
    })
    .first()
    .click()

  await expect(page.getByRole('heading', { name: 'Review Inspection' })).toBeVisible({
    timeout: routeTimeoutMs,
  })
  if (expectedReviewText) {
    await expect(page.getByText(expectedReviewText)).toBeVisible({ timeout: routeTimeoutMs })
  }

  const submitResponsePromise = page.waitForResponse(
    (response) => {
      const requestMethod = response.request().method().toUpperCase()
      if (requestMethod !== 'POST') return false

      try {
        return new URL(response.url()).pathname.endsWith('/api/reports')
      } catch {
        return false
      }
    },
    { timeout: routeTimeoutMs },
  )

  await page
    .getByRole('button', { name: /^Submit$/i })
    .first()
    .click()
  await expect(page.getByText(/Submit Fire Extinguisher Inspection/)).toBeVisible()
  await page.getByRole('button', { name: /Confirm Submit/i }).click()

  const submitResponse = await submitResponsePromise
  const { body, text: responseText } = await parseJsonOrText(submitResponse)
  const { reportUid } = parseReportBody({
    body,
    text: responseText,
    response: submitResponse,
  })

  if (!submitResponse.ok()) {
    throw new Error(`Inspection submit failed with status ${submitResponse.status()}`)
  }

  return {
    reportUid,
    responseBody: body,
    responseText,
    status: submitResponse.status(),
  }
}

test('fire extinguisher next-location labels are validated end-to-end', async ({ page }) => {
  test.setTimeout(6 * 60_000)
  const api = page.context().request
  const createdCatalogIds = []
  let createdReportUid = ''

  try {
    await page.setViewportSize({ width: 1440, height: 960 })

    const loggedInByApi = await safeLoginApi(api)
    await openFireExtinguisherByAreaMode(page, loggedInByApi)
    await expect(page.getByText('Choose Zone')).toBeVisible({ timeout: routeTimeoutMs })

    const selectedScope = await findSelectionWithAtLeastTwoLocations(page)
    if (!selectedScope) {
      test.skip(
        true,
        'Test skipped: inspection fixture currently has no zone + main area with at least 2 locations in scope.',
      )
    }

    const selectedFirstLocationLabel = await selectLocationByIndex(page, 'Choose Location', 0)
    const selectedFirstLocationName = stripProgressSuffix(selectedFirstLocationLabel)

    const firstSuffix = `A-${String(Date.now()).slice(-6)}`
    const firstRow = await createFireExtinguisherRow(page, firstSuffix)
    if (firstRow.catalogId) createdCatalogIds.push(firstRow.catalogId)
    await completeRowAsGood(firstRow.card)

    await expectProgressMetaForSelection(page, 'Choose Zone')
    await expectProgressMetaForSelection(page, 'Choose Main Area')
    await expectProgressMetaForSelection(page, 'Choose Location')

    const continuationCard = page.locator('.inspection-next-location-card')
    await expect(continuationCard).toBeVisible({ timeout: routeTimeoutMs })
    const continueButton = continuationCard
      .locator('.inspection-next-location-btn')
      .getByText(/^(?!More$).+/, { exact: false })
      .first()

    await expect(continueButton).toBeVisible()
    await continueButton.click()

    await expect
      .poll(
        async () =>
          stripProgressSuffix(await getSelectedSectionOptionLabel(page, 'Choose Location')),
        { timeout: routeTimeoutMs },
      )
      .not.toBe(selectedFirstLocationName)

    const secondSuffix = `B-${String(Date.now()).slice(-6)}`
    const secondRow = await createFireExtinguisherRow(page, secondSuffix)
    if (secondRow.catalogId) createdCatalogIds.push(secondRow.catalogId)
    await completeRowAsGood(secondRow.card)

    await expectProgressMetaForSelection(page, 'Choose Zone')
    await expectProgressMetaForSelection(page, 'Choose Main Area')
    await expectProgressMetaForSelection(page, 'Choose Location')

    await page
      .getByRole('button', {
        name: /Continue to Review|Review Inspections|Review Submissions/,
        exact: false,
      })
      .first()
      .click()
    await expect(page.getByRole('heading', { name: 'Review Inspection' })).toBeVisible({
      timeout: routeTimeoutMs,
    })

    await expect(page.getByText(/Total 2 fire extinguishers/i)).toBeVisible({
      timeout: routeTimeoutMs,
    })
    await expect(page.getByText(/2 locations inspected/i)).toBeVisible({ timeout: routeTimeoutMs })

    const submitResponsePromise = page.waitForResponse(
      (response) => {
        const requestMethod = response.request().method().toUpperCase()
        if (requestMethod !== 'POST') return false

        try {
          return new URL(response.url()).pathname.endsWith('/api/reports')
        } catch {
          return false
        }
      },
      { timeout: routeTimeoutMs },
    )

    await page
      .getByRole('button', { name: /^Submit$/i })
      .first()
      .click()
    await expect(page.getByText(/Submit Fire Extinguisher Inspection/)).toBeVisible()
    await page.getByRole('button', { name: /Confirm Submit/i }).click()

    const submitResponse = await submitResponsePromise
    const { body, text: reportText } = await parseJsonOrText(submitResponse)
    const { reportUid } = parseReportBody({
      body,
      text: reportText,
      response: submitResponse,
    })

    if (!submitResponse.ok()) {
      throw new Error(`Inspection submit failed with status ${submitResponse.status()}`)
    }
    expect(reportUid).toBeTruthy()
    createdReportUid = reportUid

    await page.waitForURL(/\/inspection(?:[/?#]|$)/, { timeout: routeTimeoutMs })
  } finally {
    const csrfToken = await getCsrfToken(api)

    if (createdReportUid) {
      try {
        await deleteReport(api, csrfToken, createdReportUid)
      } catch {
        // best-effort cleanup
      }
    }

    for (const catalogId of createdCatalogIds) {
      try {
        await deleteFireExtinguisherCatalogRow(api, csrfToken, catalogId)
      } catch {
        // best-effort cleanup
      }
    }
  }
})

test('fire extinguisher draft is restored when user leaves mid-inspection and returns', async ({
  page,
}) => {
  test.setTimeout(6 * 60_000)
  const api = page.context().request
  const createdCatalogIds = []
  let createdReportUid = ''

  try {
    await page.setViewportSize({ width: 1440, height: 960 })

    const loggedInByApi = await safeLoginApi(api)
    await openFireExtinguisherByAreaMode(page, loggedInByApi)

    const selectedScope = await selectFireExtinguisherByAreaFirstLocation(page)
    if (!selectedScope.location) {
      test.skip(
        true,
        'Test skipped: inspection fixture currently has no location available for Fire Extinguisher.',
      )
    }

    const rowSuffix = `MID-${String(Date.now()).slice(-6)}`
    const firstRow = await createFireExtinguisherRow(page, rowSuffix)
    if (firstRow.catalogId) createdCatalogIds.push(firstRow.catalogId)

    await expandRow(firstRow.card)
    const firstPhysicalGood = firstRow.card
      .getByRole('button', { name: 'Good', exact: true })
      .nth(0)
    await firstPhysicalGood.click()
    await expect(firstPhysicalGood).toHaveClass(/btn-primary|active/)

    await page.goto('/inspection', { waitUntil: 'domcontentloaded' })
    await waitForAppReady(page, '/inspection')

    await page.goto('/inspection/new', { waitUntil: 'domcontentloaded' })
    await waitForAppReady(page, '/inspection/new')

    await expect
      .poll(
        async () =>
          stripProgressSuffix(await getSelectedSectionOptionLabel(page, 'Choose Location')),
        { timeout: routeTimeoutMs },
      )
      .toBe(selectedScope.location)

    const resumedRow = page
      .locator('[data-fire-extinguisher-row-id]')
      .filter({ hasText: firstRow.idText })
      .first()
    await expect(resumedRow).toBeVisible({ timeout: routeTimeoutMs })

    await expandRow(resumedRow)
    const resumedPhysicalGood = resumedRow.getByRole('button', { name: 'Good', exact: true }).nth(0)
    await expect(resumedPhysicalGood).toHaveClass(/btn-primary|active/)

    await completeRowAsGood(resumedRow)

    const submitted = await submitFireExtinguisherInspection(page)
    expect(submitted.reportUid).toBeTruthy()
    createdReportUid = submitted.reportUid

    await page.waitForURL(/\/inspection(?:[/?#]|$)/, { timeout: routeTimeoutMs })
  } finally {
    const csrfToken = await getCsrfToken(api)

    if (createdReportUid) {
      try {
        await deleteReport(api, csrfToken, createdReportUid)
      } catch {
        // best-effort cleanup
      }
    }

    for (const catalogId of createdCatalogIds) {
      try {
        await deleteFireExtinguisherCatalogRow(api, csrfToken, catalogId)
      } catch {
        // best-effort cleanup
      }
    }
  }
})

test('fire extinguisher submitted record can be edited and re-submitted', async ({ page }) => {
  test.setTimeout(6 * 60_000)
  const api = page.context().request
  const createdCatalogIds = []
  let createdReportUid = ''

  try {
    await page.setViewportSize({ width: 1440, height: 960 })

    const loggedInByApi = await safeLoginApi(api)
    await openFireExtinguisherByAreaMode(page, loggedInByApi)

    const selectedScope = await selectFireExtinguisherByAreaFirstLocation(page)
    if (!selectedScope.location) {
      test.skip(
        true,
        'Test skipped: inspection fixture currently has no location available for Fire Extinguisher.',
      )
    }

    const rowSuffix = `UPD-${String(Date.now()).slice(-6)}`
    const row = await createFireExtinguisherRow(page, rowSuffix)
    if (row.catalogId) createdCatalogIds.push(row.catalogId)

    await completeRowAsGood(row.card)

    const submitted = await submitFireExtinguisherInspection(page)
    expect(submitted.reportUid).toBeTruthy()
    createdReportUid = submitted.reportUid

    await page.waitForURL(/\/inspection(?:[/?#]|$)/, { timeout: routeTimeoutMs })

    const searchText = createdReportUid
    await page.getByRole('textbox', { name: 'Search records' }).fill(searchText)
    const submittedRow = page.locator('tbody tr').filter({ hasText: searchText }).first()
    await expect(submittedRow).toBeVisible({ timeout: 20_000 })

    await submittedRow.getByRole('button', { name: 'Row actions' }).click()
    const editItem = page
      .locator('.dropdown-menu.show')
      .last()
      .getByRole('button', { name: 'Edit', exact: true })
    await expect(editItem).toBeVisible()
    await editItem.click()

    await expect(page).toHaveURL(new RegExp('^/inspection/.+/edit(?:[/?#]|$)'), {
      timeout: routeTimeoutMs,
    })

    const editedRow = page
      .locator('[data-fire-extinguisher-row-id]')
      .filter({ hasText: row.idText })
      .first()
    await expect(editedRow).toBeVisible({ timeout: routeTimeoutMs })

    await expandRow(editedRow)
    const editRemark = `Edit smoke note ${rowSuffix}`
    await editedRow.getByRole('button', { name: 'Remark', exact: true }).click()
    await editedRow.getByPlaceholder('General extinguisher remarks').fill(editRemark)

    const updated = await submitFireExtinguisherInspection(page, { reviewText: editRemark })
    expect(updated.reportUid).toBe(createdReportUid)
  } finally {
    const csrfToken = await getCsrfToken(api)

    if (createdReportUid) {
      try {
        await deleteReport(api, csrfToken, createdReportUid)
      } catch {
        // best-effort cleanup
      }
    }

    for (const catalogId of createdCatalogIds) {
      try {
        await deleteFireExtinguisherCatalogRow(api, csrfToken, catalogId)
      } catch {
        // best-effort cleanup
      }
    }
  }
})
