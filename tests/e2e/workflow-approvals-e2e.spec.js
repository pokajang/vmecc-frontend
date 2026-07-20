const { expect, test } = require('@playwright/test')
const {
  apiJson,
  baseUrl,
  dismissIncidentalDialogs,
  loginWithPage,
  personas,
} = require('./support/reporting-live-auth')

const routeTimeoutMs = Number(process.env.VMECC_SMOKE_ROUTE_TIMEOUT_MS || 45_000)

const toDateOnly = (date) => date.toISOString().slice(0, 10)
const weekdayAtOffset = (offsetDays) => {
  const date = new Date()
  date.setUTCHours(12, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() + offsetDays)
  while ([0, 6].includes(date.getUTCDay())) {
    date.setUTCDate(date.getUTCDate() + (offsetDays < 0 ? -1 : 1))
  }
  return date
}
const payrollPeriod = () => {
  const now = new Date()
  const firstDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 1, 12))
  return {
    label: firstDay.toLocaleString('en', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    value: toDateOnly(firstDay).slice(0, 7),
    itemDate: toDateOnly(firstDay),
    paymentDate: `${toDateOnly(firstDay).slice(0, 8)}28`,
  }
}

const mutation = (remarks, version, extra = {}) => ({
  remarks,
  expected_version: version,
  ...extra,
})

const expectApi = (result, status, context) => {
  expect(result.response.status(), `${context}: ${result.text}`).toBe(status)
  return result.body.data
}

const withPersonaPage = async (browser, persona, callback) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  try {
    const csrf = await loginWithPage(page, persona)
    return await callback({ context, page, csrf })
  } finally {
    await context.close()
  }
}

const createAs = (browser, persona, callback) => withPersonaPage(browser, persona, callback)

const responseData = async (response, context) => {
  const text = await response.text()
  expect(response.status(), `${context}: ${text}`).toBe(200)
  return JSON.parse(text).data
}

const openManagementRecord = async ({ page, route, searchPlaceholder, searchText }) => {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' })
  await dismissIncidentalDialogs(page)
  const search = page.locator(`input[placeholder="${searchPlaceholder}"]:visible`).first()
  await expect(search).toBeVisible({ timeout: routeTimeoutMs })
  await search.fill(String(searchText))
  const row = page.locator('tbody tr', { hasText: String(searchText) }).first()
  await expect(row, `Missing management row matching ${searchText}`).toBeVisible({
    timeout: routeTimeoutMs,
  })
  return row
}

const performManagementAction = async ({
  browser,
  persona,
  route,
  searchPlaceholder,
  searchText,
  action,
  entityTitle,
  responsePath,
  remarks,
}) =>
  withPersonaPage(browser, persona, async ({ page }) => {
    const row = await openManagementRecord({ page, route, searchPlaceholder, searchText })
    await row.getByRole('button', { name: 'Row actions' }).click()
    const menu = page.locator('.row-actions-menu[aria-hidden="false"]').first()
    await expect(menu).toBeVisible()
    const actionButton = menu.getByRole('button', { name: action, exact: true })
    await expect(actionButton).toBeEnabled()
    await actionButton.click()

    const dialog = page
      .locator('.modal.show')
      .filter({
        has: page.getByRole('heading', {
          name: new RegExp(`^${action} ${entityTitle}$`, 'i'),
        }),
      })
      .last()
    await expect(dialog).toBeVisible()
    await dialog.getByPlaceholder('Add your remarks').fill(remarks)
    const declaration = dialog.locator('input[type="checkbox"]')
    if ((await declaration.count()) > 0) await declaration.check()

    const responsePromise = page.waitForResponse(
      (response) => response.request().method() === 'POST' && response.url().includes(responsePath),
      { timeout: routeTimeoutMs },
    )
    await dialog.getByRole('button', { name: action, exact: true }).click()
    return responseData(await responsePromise, `${persona.role} UI ${action}`)
  })

const openInspectionAllRecords = async (page, displayId) => {
  await page.goto(`${baseUrl}/inspection`, { waitUntil: 'domcontentloaded' })
  await dismissIncidentalDialogs(page)
  const scope = page.getByRole('group', { name: 'Record scope' })
  const all = scope.getByRole('button', { name: 'All', exact: true })
  await expect(all).toBeVisible({ timeout: routeTimeoutMs })
  await all.click()
  const search = page.getByRole('textbox', { name: 'Search records' })
  await search.fill(displayId)
  const row = page.locator('tbody tr', { hasText: displayId }).first()
  await expect(row, `Missing inspection row ${displayId}`).toBeVisible({ timeout: routeTimeoutMs })
  return row
}

const performInspectionAction = async ({
  browser,
  persona,
  displayId,
  reportId,
  action,
  remarks,
}) =>
  withPersonaPage(browser, persona, async ({ page }) => {
    const row = await openInspectionAllRecords(page, displayId)
    await row.getByRole('button', { name: 'Row actions' }).click()
    const menu = page.locator('.row-actions-menu[aria-hidden="false"]').first()
    const actionButton = menu.getByRole('button', { name: action, exact: true })
    await expect(actionButton).toBeEnabled()
    await actionButton.click()
    const dialog = page
      .locator('.modal.show')
      .filter({ has: page.getByRole('heading', { name: `${action} Report` }) })
      .last()
    await expect(dialog).toBeVisible()
    await dialog.getByPlaceholder('Add your remarks').fill(remarks)
    await dialog.locator('input[type="checkbox"]').check()
    const responsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes(`/reports/${encodeURIComponent(reportId)}/${action.toLowerCase()}`),
      { timeout: routeTimeoutMs },
    )
    await dialog.getByRole('button', { name: action, exact: true }).click()
    return responseData(await responsePromise, `${persona.role} UI ${action}`)
  })

const performMarkPaid = async ({ browser, persona, searchText, responsePath, period }) =>
  withPersonaPage(browser, persona, async ({ page }) => {
    const row = await openManagementRecord({
      page,
      route: '/staff/salary-claims/salary',
      searchPlaceholder: 'Search salary records',
      searchText,
    })
    await row.getByRole('button', { name: 'Row actions' }).click()
    const menu = page.locator('.row-actions-menu[aria-hidden="false"]').first()
    const markPaid = menu.getByRole('button', { name: 'Mark Paid', exact: true })
    await expect(markPaid).toBeEnabled({ timeout: routeTimeoutMs })
    await markPaid.click()
    const dialog = page
      .locator('.modal.show')
      .filter({ has: page.getByRole('heading', { name: 'Mark paid', exact: true }) })
      .last()
    await expect(dialog).toBeVisible()
    await dialog.getByLabel('Payment date').fill(period.paymentDate)
    await dialog.getByLabel('Payment reference (optional)').fill(`E2E-PAY-${Date.now()}`)
    await dialog.getByLabel('Payment note (optional)').fill('E2E browser payment completion.')
    const responsePromise = page.waitForResponse(
      (response) => response.request().method() === 'POST' && response.url().includes(responsePath),
      { timeout: routeTimeoutMs },
    )
    await dialog.getByRole('button', { name: 'Mark paid', exact: true }).click()
    return responseData(await responsePromise, `${persona.role} UI mark paid`)
  })

test.describe.serial('deterministic multi-role workflow approvals', () => {
  test.describe.configure({ timeout: 8 * 60_000 })

  test('inspection: TRT submit -> scoped AIC review -> IC approve, with cross-team denial', async ({
    browser,
  }) => {
    const runId = `E2E-INSP-${Date.now()}`
    const reportDate = toDateOnly(new Date())
    const createdResult = await createAs(browser, personas.submitter, ({ page, csrf }) =>
      apiJson(page.request, 'post', '/reports', csrf, {
        display_id: runId,
        report_type: 'inspection',
        status: 'Submitted',
        payload: {
          schemaVersion: 1,
          incidentType: 'General Inspection',
          inspectionType: 'General Inspection',
          selectedLocation: 'Smoke Site Alpha',
          mainLocation: 'Smoke Site Alpha',
          location: 'Smoke Site Alpha',
          reportDate,
          reportTime: '09:00',
          description: 'Deterministic multi-role inspection approval audit.',
          photos: [],
          checklist: [
            {
              id: 'e2e-general-condition',
              label: 'General condition is acceptable',
              selected: true,
            },
          ],
        },
      }),
    )
    const created = expectApi(createdResult, 201, 'TRT inspection submission')
    expect(created.workflowStage).toBe('review')
    expect(created.nextActionRole).toBe('Assistant Incident Commander')

    const crossTeam = await withPersonaPage(
      browser,
      personas.assistantIncidentCommanderBeta,
      ({ page, csrf }) =>
        apiJson(page.request, 'post', `/reports/${encodeURIComponent(created.id)}/review`, csrf, {
          version: created.version,
          remarks: 'Cross-team attempt must fail.',
        }),
    )
    expect(crossTeam.response.status()).toBe(403)

    const reviewed = await performInspectionAction({
      browser,
      persona: personas.assistantIncidentCommander,
      displayId: runId,
      reportId: created.id,
      action: 'Review',
      remarks: 'AIC scoped review completed through the browser.',
    })
    expect(reviewed.status).toBe('Reviewed')
    expect(reviewed.workflowStage).toBe('approve')

    const approved = await performInspectionAction({
      browser,
      persona: personas.incidentCommander,
      displayId: runId,
      reportId: created.id,
      action: 'Approve',
      remarks: 'IC final approval completed through the browser.',
    })
    expect(approved.status).toBe('Approved')
    expect(approved.workflowStage).toBe('done')
    expect(approved.timeline.map(({ action }) => action)).toEqual(
      expect.arrayContaining(['Submitted', 'Reviewed', 'Approved']),
    )
  })

  test('leave: applicant submit -> three independent HR actors review, recommend, approve', async ({
    browser,
  }) => {
    const leaveDate = toDateOnly(weekdayAtOffset(21))
    const createdResult = await createAs(browser, personas.submitter, ({ page, csrf }) =>
      apiJson(page.request, 'post', '/leave', csrf, {
        leave_type: 'Annual Leave',
        start_date: leaveDate,
        end_date: leaveDate,
        days: 1,
        work_shift: 'normal',
        start_time_slot: 'shift-start',
        end_time_slot: 'shift-end',
        reason: `E2E leave approval audit ${Date.now()}`,
        cover_by: 'E2E TRT Beta',
      }),
    )
    const created = expectApi(createdResult, 201, 'leave submission')
    const actionBase = `/staff/leave/records/${created.user_id}/${created.id}`
    expect(created.workflow_stage).toBe('review')

    const denied = await withPersonaPage(browser, personas.finance, ({ page, csrf }) =>
      apiJson(
        page.request,
        'post',
        `${actionBase}/review`,
        csrf,
        mutation('Finance cannot review leave.', created.version, { declaration_checked: true }),
      ),
    )
    expect([403, 422]).toContain(denied.response.status())

    const reviewed = await performManagementAction({
      browser,
      persona: personas.humanResource,
      route: '/staff/leave-management/leaves',
      searchPlaceholder: 'Search leave records',
      searchText: created.display_id,
      action: 'Review',
      entityTitle: 'leave request',
      responsePath: `${actionBase}/review`,
      remarks: 'Primary HR review completed through the browser.',
    })
    expect(reviewed.workflow_stage).toBe('recommend')

    const recommended = await performManagementAction({
      browser,
      persona: personas.humanResourceSecondary,
      route: '/staff/leave-management/leaves',
      searchPlaceholder: 'Search leave records',
      searchText: created.display_id,
      action: 'Recommend',
      entityTitle: 'leave request',
      responsePath: `${actionBase}/recommend`,
      remarks: 'Secondary HR recommendation completed through the browser.',
    })
    expect(recommended.workflow_stage).toBe('approve')

    const approved = await performManagementAction({
      browser,
      persona: personas.humanResourceTertiary,
      route: '/staff/leave-management/leaves',
      searchPlaceholder: 'Search leave records',
      searchText: created.display_id,
      action: 'Approve',
      entityTitle: 'leave request',
      responsePath: `${actionBase}/approve`,
      remarks: 'Tertiary HR final approval completed through the browser.',
    })
    expect(approved.status).toBe('Approved')
    expect(approved.workflow_stage).toBe('done')
    expect(approved.approval_history.map(({ action }) => action)).toEqual([
      'Submitted',
      'Reviewed',
      'Recommended',
      'Approved',
    ])
  })

  test('overtime: TRT submit -> Contract Manager review -> HR recommend -> scoped Client CM approve', async ({
    browser,
  }) => {
    const claimDate = toDateOnly(weekdayAtOffset(-10))
    const createdResult = await createAs(browser, personas.submitter, ({ page, csrf }) =>
      apiJson(page.request, 'post', '/overtime', csrf, {
        overtime_type: 'weekday',
        claim_date: claimDate,
        start_time: '20:00',
        end_time: '22:00',
        is_overnight: false,
        duration_minutes: 120,
        reason: `E2E overtime approval audit ${Date.now()}`,
      }),
    )
    const created = expectApi(createdResult, 201, 'overtime submission')
    const actionBase = `/staff/overtime/records/${created.user_id}/${created.id}`
    expect(created.workflow_stage).toBe('review')
    expect(created.next_action_role).toBe('Contract Manager')

    const reviewed = await performManagementAction({
      browser,
      persona: personas.contractManager,
      route: '/staff/overtime-management/records',
      searchPlaceholder: 'Search overtime records',
      searchText: created.display_id,
      action: 'Review',
      entityTitle: 'overtime claim',
      responsePath: `${actionBase}/review`,
      remarks: 'Contract Manager review completed through the browser.',
    })
    expect(reviewed.workflow_stage).toBe('recommend')

    const repeatActor = await withPersonaPage(browser, personas.contractManager, ({ page, csrf }) =>
      apiJson(
        page.request,
        'post',
        `${actionBase}/recommend`,
        csrf,
        mutation('Distinct actor policy must reject this.', reviewed.version),
      ),
    )
    expect([403, 422]).toContain(repeatActor.response.status())

    const recommended = await performManagementAction({
      browser,
      persona: personas.humanResource,
      route: '/staff/overtime-management/records',
      searchPlaceholder: 'Search overtime records',
      searchText: created.display_id,
      action: 'Recommend',
      entityTitle: 'overtime claim',
      responsePath: `${actionBase}/recommend`,
      remarks: 'HR recommendation completed through the browser.',
    })
    expect(recommended.workflow_stage).toBe('approve')

    const approved = await performManagementAction({
      browser,
      persona: personas.clientContractManagerAlpha,
      route: '/staff/overtime-management/records',
      searchPlaceholder: 'Search overtime records',
      searchText: created.display_id,
      action: 'Approve',
      entityTitle: 'overtime claim',
      responsePath: `${actionBase}/approve`,
      remarks: 'Scoped Client Contract Manager approval completed through the browser.',
    })
    expect(approved.status).toBe('Approved')
    expect(approved.workflow_stage).toBe('done')
    expect(approved.approval_history.map(({ action }) => action)).toEqual([
      'Submitted',
      'Reviewed',
      'Recommended',
      'Approved',
    ])
  })

  test('payroll: employee submit -> Admin check -> Finance review -> Contract Manager approve -> Finance pay', async ({
    browser,
  }) => {
    const period = payrollPeriod()
    const createdResult = await createAs(browser, personas.submitter, ({ page, csrf }) =>
      apiJson(page.request, 'post', '/payroll/claims', csrf, {
        claim_type: 'salary',
        category: 'Monthly Salary',
        period: period.label,
        period_value: period.value,
        submission_key: `e2e-payroll-${Date.now()}`,
        notes: 'Deterministic payroll approval and payment audit.',
        payroll_baseline_confirmed: true,
        payroll_snapshot: { basic: 2500, allowances: 250, deductions: 100, net: 2650 },
        items: [
          {
            item_type: 'Addition',
            title: 'E2E approved adjustment',
            claim_date: period.itemDate,
            amount: 25,
            notes: 'Automated workflow coverage item.',
          },
        ],
      }),
    )
    const created = expectApi(createdResult, 201, 'payroll submission')
    const actionBase = `/staff/salary-claims/records/${created.user_id}/${created.id}`
    expect(created.workflow_stage).toBe('check')

    const checked = await performManagementAction({
      browser,
      persona: personas.adminRole,
      route: '/staff/salary-claims/salary',
      searchPlaceholder: 'Search salary records',
      searchText: created.display_id,
      action: 'Check',
      entityTitle: 'claim',
      responsePath: `${actionBase}/check`,
      remarks: 'Admin check completed through the browser.',
    })
    expect(checked.workflow_stage).toBe('review')

    const reviewed = await performManagementAction({
      browser,
      persona: personas.finance,
      route: '/staff/salary-claims/salary',
      searchPlaceholder: 'Search salary records',
      searchText: created.display_id,
      action: 'Review',
      entityTitle: 'claim',
      responsePath: `${actionBase}/review`,
      remarks: 'Finance review completed through the browser.',
    })
    expect(reviewed.workflow_stage).toBe('approve')

    const approved = await performManagementAction({
      browser,
      persona: personas.contractManager,
      route: '/staff/salary-claims/salary',
      searchPlaceholder: 'Search salary records',
      searchText: created.display_id,
      action: 'Approve',
      entityTitle: 'claim',
      responsePath: `${actionBase}/approve`,
      remarks: 'Contract Manager approval completed through the browser.',
    })
    expect(approved.status).toBe('Approved')

    const paid = await performMarkPaid({
      browser,
      persona: personas.finance,
      searchText: created.display_id,
      responsePath: `${actionBase}/mark-paid`,
      period,
    })
    expect(paid.status).toBe('Paid')
    expect(paid.paid_at).toBeTruthy()
    expect(paid.approval_history.map(({ action }) => action)).toEqual(
      expect.arrayContaining(['Checked', 'Reviewed', 'Approved']),
    )
  })
})
