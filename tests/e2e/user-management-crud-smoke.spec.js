const { expect, test } = require('@playwright/test')
const fs = require('node:fs')
const path = require('node:path')

const apiBaseUrl = process.env.VMECC_E2E_API_URL || 'http://localhost:8000/api'
const smokeEmail = process.env.VMECC_SMOKE_EMAIL || 'codex.smoke.admin@vmecc.local'
const smokePassword = process.env.VMECC_SMOKE_PASSWORD || 'SmokeAdmin!2026'
const runId = process.env.VMECC_SMOKE_RUN_ID || new Date().toISOString().replace(/[:.]/g, '-')
const artifactRoot = path.resolve(process.cwd(), 'test-results', 'user-management-smoke', runId)

const today = () => new Date().toISOString().slice(0, 10)

const smokeAssignment = () => ({
  role: 'Contract Manager',
  scope_type: 'office',
  team_id: null,
  start_date: today(),
  end_date: null,
  is_primary: true,
})

const safeFileName = (value) =>
  String(value || 'artifact')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'artifact'

const writeJsonArtifact = (name, payload) => {
  fs.mkdirSync(artifactRoot, { recursive: true })
  fs.writeFileSync(path.join(artifactRoot, name), JSON.stringify(payload, null, 2))
}

const parseJsonOrText = async (response) => {
  const text = await response.text()
  if (!text) return { body: null, text: '' }

  try {
    return { body: JSON.parse(text), text }
  } catch {
    return { body: null, text }
  }
}

const apiRequest = async (
  api,
  report,
  method,
  route,
  { csrfToken = null, data = undefined, expected = [200], note = '' } = {},
) => {
  const normalizedMethod = method.toLowerCase()
  const headers = {
    Accept: 'application/json',
  }

  if (!['get', 'head', 'options'].includes(normalizedMethod)) {
    headers['Content-Type'] = 'application/json'
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken
  }

  const response = await api[normalizedMethod](`${apiBaseUrl}${route}`, {
    headers,
    ...(data !== undefined ? { data } : {}),
  })
  const { body, text } = await parseJsonOrText(response)
  const status = response.status()

  report.api.push({
    method: normalizedMethod.toUpperCase(),
    route,
    status,
    note,
    ok: expected.includes(status),
    message: body?.message || (text && text.length < 240 ? text : undefined),
  })

  expect(
    expected,
    `${normalizedMethod.toUpperCase()} ${route} returned ${status}: ${text}`,
  ).toContain(status)

  return { response, body, text, status }
}

const createSmokeUser = async (api, report, csrfToken, label, suffix) => {
  const email = `codex.smoke.user-management.${suffix}.${label}@vmecc.local`
  const payload = {
    name: `Codex Smoke ${label.replace(/-/g, ' ')}`,
    email,
    role_assignments: [smokeAssignment()],
  }

  const { body } = await apiRequest(api, report, 'post', '/users', {
    csrfToken,
    data: payload,
    expected: [201],
    note: `create ${label}`,
  })

  expect(body?.user?.id, `Create user response missing id for ${label}`).toBeTruthy()

  return {
    id: body.user.id,
    name: body.user.name || payload.name,
    email: body.user.email || email,
    roleAssignments: body.user.role_assignments || [smokeAssignment()],
  }
}

const cleanupUser = async (api, csrfToken, user, report) => {
  if (!user?.id || !csrfToken) return csrfToken

  let activeToken = csrfToken
  const headers = () => ({
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-CSRF-Token': activeToken,
  })

  const refreshToken = async () => {
    const response = await api.get(`${apiBaseUrl}/auth/session`, {
      headers: { Accept: 'application/json' },
    })
    const { body } = await parseJsonOrText(response)
    report.cleanup.push({
      route: '/auth/session',
      status: response.status(),
      note: 'refresh csrf for cleanup',
    })
    if (response.status() === 200 && body?.csrf_token) {
      activeToken = body.csrf_token
    }
  }

  for (const route of [`/users/${user.id}`, `/users/${user.id}?force=1`]) {
    try {
      let response = await api.delete(`${apiBaseUrl}${route}`, { headers: headers() })
      if (response.status() === 419) {
        await refreshToken()
        response = await api.delete(`${apiBaseUrl}${route}`, { headers: headers() })
      }
      report.cleanup.push({
        user_id: user.id,
        email: user.email,
        route,
        status: response.status(),
      })
    } catch (error) {
      report.cleanup.push({
        user_id: user.id,
        email: user.email,
        route,
        error: error?.message || String(error),
      })
    }
  }

  return activeToken
}

const isKnownDisabledMessagesNoise = (value) => {
  const text = String(value || '')
  return /messages\/threads/i.test(text) && /(403|Module is disabled)/i.test(text)
}

const waitForUsersPage = async (page) => {
  await expect(page.locator('[data-testid="users-module"]')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText('User Records')).toBeVisible({ timeout: 20_000 })
  await page.waitForFunction(
    () => {
      const list = document.querySelector('[data-testid="users-list"]')
      if (!list) return false
      const text = String(list.textContent || '')
      if (/Loading/i.test(text)) return false
      return Boolean(list.querySelector('tbody tr')) || /No users match/i.test(text)
    },
    null,
    { timeout: 60_000 },
  )
}

const saveScreenshot = async (page, testInfo, report, name) => {
  fs.mkdirSync(artifactRoot, { recursive: true })
  const fileName = `${safeFileName(name)}.png`
  const artifactPath = path.join(artifactRoot, fileName)
  const screenshot = await page.screenshot({ path: artifactPath, fullPage: true })

  await testInfo.attach(fileName, {
    body: screenshot,
    contentType: 'image/png',
  })

  const relativePath = path.relative(process.cwd(), artifactPath)
  report.screenshots.push(relativePath)
  return relativePath
}

const findUserRow = async (page, email) => {
  await page.locator('input[placeholder="Search name or email"]:visible').first().fill(email)
  const row = page.locator('tbody tr').filter({ hasText: email }).first()
  await expect(row, `Expected table row for ${email}`).toBeVisible({ timeout: 15_000 })
  await row.scrollIntoViewIfNeeded()
  return row
}

const openRowActionMenu = async (page, email) => {
  const row = await findUserRow(page, email)
  const toggle = row.getByRole('button', { name: 'Row actions' }).first()
  await expect(toggle, `Expected row action toggle for ${email}`).toBeVisible()
  await toggle.click()

  const menu = page.locator('.dropdown-menu.show').last()
  await expect(menu, `Expected visible dropdown menu for ${email}`).toBeVisible({ timeout: 5_000 })
  return menu
}

const closeVisibleModal = async (page) => {
  const modal = page.locator('.modal.show').last()
  if (!(await modal.isVisible().catch(() => false))) return

  const cancelButton = modal.getByRole('button', { name: /Cancel|Close/i }).first()
  if (await cancelButton.isVisible().catch(() => false)) {
    await cancelButton.click()
  } else {
    await page.keyboard.press('Escape')
  }

  await expect(page.locator('.modal.show')).toHaveCount(0, { timeout: 10_000 })
}

const triggerModalAction = async (page, testInfo, report, { user, actionLabel, modalTitle }) => {
  await closeVisibleModal(page)
  const menu = await openRowActionMenu(page, user.email)
  const item = menu.getByRole('button', { name: actionLabel, exact: true })
  await expect(item, `Expected row action "${actionLabel}" for ${user.email}`).toBeVisible()
  await item.click()

  const modal = page.locator('.modal.show', { hasText: modalTitle }).last()
  await expect(modal, `Expected "${modalTitle}" modal after "${actionLabel}"`).toBeVisible({
    timeout: 10_000,
  })
  await expect(modal.getByText(modalTitle, { exact: false }).first()).toBeVisible()

  const dialogBox = await modal.locator('.modal-dialog').boundingBox()
  expect(dialogBox, `Modal dialog has no visible box for "${modalTitle}"`).toBeTruthy()
  expect(new URL(page.url()).pathname, `"${actionLabel}" navigated away from user list`).toBe(
    '/admin/users',
  )

  const screenshot = await saveScreenshot(
    page,
    testInfo,
    report,
    `row-action-${actionLabel}-${modalTitle}`,
  )
  const backdropCount = await page.locator('.modal-backdrop.show').count()

  report.rowActions.push({
    email: user.email,
    action: actionLabel,
    expected_modal: modalTitle,
    modal_visible: true,
    backdrop_count: backdropCount,
    screenshot,
  })

  await closeVisibleModal(page)
}

const triggerExportAction = async (page, testInfo, report, user) => {
  await closeVisibleModal(page)
  const menu = await openRowActionMenu(page, user.email)
  const item = menu.getByRole('button', { name: 'Export CSV', exact: true })
  await expect(item, `Expected export action for ${user.email}`).toBeVisible()

  const downloadPromise = page.waitForEvent('download', { timeout: 2_000 }).catch(() => null)
  await item.click()
  const download = await downloadPromise
  await expect(page.locator('.modal.show'), 'Export action should not open a modal').toHaveCount(0)

  const screenshot = await saveScreenshot(page, testInfo, report, 'row-action-export-csv-no-modal')
  report.rowActions.push({
    email: user.email,
    action: 'Export CSV',
    expected_modal: null,
    modal_visible: false,
    downloaded: Boolean(download),
    suggested_filename: download?.suggestedFilename?.() || null,
    screenshot,
  })
}

test.describe('User Management CRUD smoke', () => {
  test('covers CRUD endpoints, views, and every row action modal', async ({ page }, testInfo) => {
    test.setTimeout(5 * 60_000)

    const api = page.context().request
    const report = {
      run_id: runId,
      api_base_url: apiBaseUrl,
      frontend_base_url: process.env.VMECC_E2E_BASE_URL || 'http://localhost:3000',
      api: [],
      views: [],
      rowActions: [],
      consoleErrors: [],
      pageErrors: [],
      failedResponses: [],
      cleanup: [],
      screenshots: [],
    }
    const createdUsers = []
    let csrfToken = null

    page.on('console', (message) => {
      if (message.type() !== 'error') return
      report.consoleErrors.push({
        route: new URL(page.url()).pathname,
        text: message.text(),
      })
    })

    page.on('pageerror', (error) => {
      report.pageErrors.push({
        route: new URL(page.url()).pathname,
        message: error?.message || String(error),
      })
    })

    page.on('response', (response) => {
      if (response.status() < 400) return
      const url = response.url()
      if (/\.(css|js|png|jpg|jpeg|webp|gif|svg|woff2?)($|\?)/i.test(url)) return
      report.failedResponses.push({
        route: new URL(page.url()).pathname,
        status: response.status(),
        url,
      })
    })

    try {
      const login = await apiRequest(api, report, 'post', '/auth/login', {
        data: {
          email: smokeEmail,
          password: smokePassword,
          remember: true,
        },
        expected: [200],
        note: 'login smoke admin',
      })
      csrfToken = login.body?.csrf_token
      expect(csrfToken, 'Login response missing csrf_token').toBeTruthy()

      const suffix = `${Date.now()}`
      const activeUser = await createSmokeUser(api, report, csrfToken, 'active', suffix)
      const inactiveUser = await createSmokeUser(api, report, csrfToken, 'inactive', suffix)
      const deletedUser = await createSmokeUser(api, report, csrfToken, 'deleted', suffix)
      const lockedUser = await createSmokeUser(api, report, csrfToken, 'locked', suffix)
      const restoreProbeUser = await createSmokeUser(
        api,
        report,
        csrfToken,
        'restore-probe',
        suffix,
      )
      const forceProbeUser = await createSmokeUser(api, report, csrfToken, 'force-probe', suffix)
      const unlockProbeUser = await createSmokeUser(api, report, csrfToken, 'unlock-probe', suffix)
      createdUsers.push(
        activeUser,
        inactiveUser,
        deletedUser,
        lockedUser,
        restoreProbeUser,
        forceProbeUser,
        unlockProbeUser,
      )

      const usersIndex = await apiRequest(api, report, 'get', '/users?include_deleted=1', {
        expected: [200],
        note: 'read users with deleted rows',
      })
      expect(
        usersIndex.body?.data?.some((user) => user.email === activeUser.email),
        'GET /users did not include created active smoke user',
      ).toBe(true)

      await apiRequest(api, report, 'post', `/users/${activeUser.id}/status`, {
        csrfToken,
        data: { status: 'Inactive' },
        expected: [200],
        note: 'update status inactive',
      })
      await apiRequest(api, report, 'post', `/users/${activeUser.id}/status`, {
        csrfToken,
        data: { status: 'Active' },
        expected: [200],
        note: 'update status active',
      })
      await apiRequest(api, report, 'post', `/users/${inactiveUser.id}/status`, {
        csrfToken,
        data: { status: 'Inactive' },
        expected: [200],
        note: 'prepare inactive row action target',
      })
      await apiRequest(api, report, 'put', `/users/${activeUser.id}/role-assignments`, {
        csrfToken,
        data: { role_assignments: [smokeAssignment()] },
        expected: [200],
        note: 'replace role assignments',
      })
      await apiRequest(api, report, 'post', `/users/${lockedUser.id}/lock`, {
        csrfToken,
        data: { reason: 'smoke_locked_row_action' },
        expected: [200],
        note: 'prepare locked row action target',
      })
      await apiRequest(api, report, 'post', `/users/${unlockProbeUser.id}/lock`, {
        csrfToken,
        data: { reason: 'smoke_unlock_probe' },
        expected: [200],
        note: 'prepare unlock endpoint probe',
      })
      await apiRequest(api, report, 'post', `/users/${unlockProbeUser.id}/unlock`, {
        csrfToken,
        expected: [200],
        note: 'unlock endpoint',
      })
      await apiRequest(api, report, 'delete', `/users/${deletedUser.id}`, {
        csrfToken,
        expected: [200],
        note: 'prepare deleted row action target',
      })
      await apiRequest(api, report, 'delete', `/users/${restoreProbeUser.id}`, {
        csrfToken,
        expected: [200],
        note: 'prepare restore endpoint probe',
      })
      await apiRequest(api, report, 'post', `/users/${restoreProbeUser.id}/restore`, {
        csrfToken,
        expected: [200],
        note: 'restore endpoint',
      })
      await apiRequest(api, report, 'delete', `/users/${forceProbeUser.id}`, {
        csrfToken,
        expected: [200],
        note: 'prepare permanent delete endpoint probe',
      })
      await apiRequest(api, report, 'delete', `/users/${forceProbeUser.id}?force=1`, {
        csrfToken,
        expected: [200],
        note: 'permanent delete endpoint',
      })

      await page.setViewportSize({ width: 1440, height: 960 })
      await page.goto('/admin/users', { waitUntil: 'domcontentloaded' })
      await waitForUsersPage(page)
      report.views.push({
        name: 'user list',
        path: new URL(page.url()).pathname,
        screenshot: await saveScreenshot(page, testInfo, report, 'view-user-list'),
      })

      await page.getByRole('button', { name: 'Create User' }).click()
      const createModal = page.locator('.modal.show', { hasText: 'Create User' }).last()
      await expect(createModal, 'Expected Create User modal').toBeVisible({ timeout: 10_000 })
      report.views.push({
        name: 'create user modal',
        path: new URL(page.url()).pathname,
        screenshot: await saveScreenshot(page, testInfo, report, 'view-create-user-modal'),
      })
      await closeVisibleModal(page)

      await triggerExportAction(page, testInfo, report, activeUser)
      await triggerModalAction(page, testInfo, report, {
        user: activeUser,
        actionLabel: 'Deactivate',
        modalTitle: 'Deactivate User',
      })
      await triggerModalAction(page, testInfo, report, {
        user: inactiveUser,
        actionLabel: 'Activate',
        modalTitle: 'Activate User',
      })
      await triggerModalAction(page, testInfo, report, {
        user: activeUser,
        actionLabel: 'Reset password',
        modalTitle: 'Reset Password',
      })
      await triggerModalAction(page, testInfo, report, {
        user: activeUser,
        actionLabel: 'Manage roles',
        modalTitle: 'Manage Role Assignments',
      })
      await triggerModalAction(page, testInfo, report, {
        user: activeUser,
        actionLabel: 'Delete user',
        modalTitle: 'Delete User Permanently',
      })
      await triggerModalAction(page, testInfo, report, {
        user: activeUser,
        actionLabel: 'Lock account',
        modalTitle: 'Lock Account',
      })
      await triggerModalAction(page, testInfo, report, {
        user: lockedUser,
        actionLabel: 'Unlock account',
        modalTitle: 'Unlock Account',
      })
      await triggerModalAction(page, testInfo, report, {
        user: deletedUser,
        actionLabel: 'Restore',
        modalTitle: 'Restore User',
      })
      await triggerModalAction(page, testInfo, report, {
        user: deletedUser,
        actionLabel: 'Delete permanently',
        modalTitle: 'Delete User Permanently',
      })

      const unexpectedFailedResponses = report.failedResponses.filter(
        (item) => !isKnownDisabledMessagesNoise(`${item.status} ${item.url}`),
      )
      const unexpectedConsoleErrors = report.consoleErrors.filter(
        (item) => !isKnownDisabledMessagesNoise(item.text),
      )

      expect(
        unexpectedFailedResponses,
        `Unexpected failed responses: ${JSON.stringify(unexpectedFailedResponses, null, 2)}`,
      ).toEqual([])
      expect(
        unexpectedConsoleErrors,
        `Unexpected console errors: ${JSON.stringify(unexpectedConsoleErrors, null, 2)}`,
      ).toEqual([])
      expect(
        report.pageErrors,
        `Unexpected page errors: ${JSON.stringify(report.pageErrors, null, 2)}`,
      ).toEqual([])
    } finally {
      let cleanupCsrfToken = csrfToken
      for (const user of [...createdUsers].reverse()) {
        cleanupCsrfToken = await cleanupUser(api, cleanupCsrfToken, user, report)
      }
      writeJsonArtifact('report.json', report)
    }
  })
})
