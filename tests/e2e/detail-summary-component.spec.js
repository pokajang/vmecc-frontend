const { expect, test } = require('@playwright/test')
const { normalizeLoopbackOrigin } = require('./support/loopback-origin')

const configuredDevBaseUrl = process.env.VMECC_E2E_BASE_URL || 'http://127.0.0.1:4173'
const devBaseUrl = normalizeLoopbackOrigin(configuredDevBaseUrl, 'The browser component server')
const sourceUrl = (sourcePath) => {
  const resolvedUrl = new URL(sourcePath, devBaseUrl)
  if (resolvedUrl.origin !== devBaseUrl) {
    throw new Error('Browser component source URLs must stay on the controlled loopback origin.')
  }
  return resolvedUrl.href
}

const componentCases = [
  {
    name: 'applicant mobile-320',
    width: 320,
    height: 700,
    componentPath: '/src/views/leave/components/LeaveDetailSection.js',
    staff: false,
  },
  {
    name: 'staff desktop',
    width: 1440,
    height: 900,
    componentPath: '/src/views/staff/leave-management/components/LeaveDetailSection.js',
    staff: true,
  },
]

const renderLeaveDetail = async (page, componentPath) => {
  await page.goto(sourceUrl('/@vite/client'), { waitUntil: 'commit' })
  await page.setContent(
    '<main><div class="container-fluid" id="detail-summary-browser-harness"></div></main>',
  )
  await page.evaluate(
    async ({ reactUrl, reactDomUrl, backButtonUrl, styleUrl, componentUrl }) => {
      const backButtonSource = await fetch(backButtonUrl).then((response) => response.text())
      const routerModulePath = backButtonSource.match(
        /from ["']([^"']*react-router-dom\.js\?v=[^"']+)["']/,
      )?.[1]
      if (!routerModulePath) throw new Error('Unable to resolve the BackButton router module.')
      const [{ default: React }, { default: ReactDomClient }, { MemoryRouter }, componentModule] =
        await Promise.all([
          import(/* @vite-ignore */ reactUrl),
          import(/* @vite-ignore */ reactDomUrl),
          import(/* @vite-ignore */ routerModulePath),
          import(/* @vite-ignore */ componentUrl),
          import(/* @vite-ignore */ styleUrl),
        ])
      const Component = componentModule.default
      const record = {
        id: 'leave-browser-pilot',
        leaveType: 'Annual Leave',
        days: 0,
        status: 'Submitted',
        nextActionRole: 'Supervisor',
        workflowTeamName: 'Response Team Alpha',
        workflowApplicantRole: 'Responder',
        appliedAt: '2026-08-01',
        coverBy: '',
        reason: 'REASON-WITH-AN-EXCEPTIONALLY-LONG-UNBROKEN-OPERATIONAL-VALUE-1234567890',
        attachmentAvailable: true,
        attachmentId: 'attachment-browser-1',
        attachmentName: 'supporting-evidence.pdf',
        rosterImpactSnapshot: {
          observed_at: '2026-08-01 09:30',
          items: [
            {
              shift_label: 'EXCEPTIONALLY-LONG-UNBROKEN-SHIFT-NAME-1234567890',
              team_name: 'Response Team Alpha',
              date: '2026-08-02',
            },
          ],
        },
        approvalHistory: [],
        workflowSnapshot: { requireRecommendation: true },
      }
      const props = {
        selectedRecord: record,
        selectedRecordPendingActionHint: 'Supervisor review required',
        selectedRecordHistoryEntries: [],
        onBack: () => {},
        getDisplayLeaveId: () => 'LEV-BROWSER-001',
        getScheduleLabel: () => '1 Aug 2026 – 2 Aug 2026',
        getStatusBadge: (status) => React.createElement('span', null, status),
        formatDate: () => '1 Aug 2026',
        formatDateTime: () => '1 Aug 2026, 9:30 AM',
        canEdit: true,
        canCancel: true,
        canDelete: true,
        onEdit: () => {},
        onCancel: () => {},
        onDelete: () => {},
      }
      const root = ReactDomClient.createRoot(
        document.getElementById('detail-summary-browser-harness'),
      )
      root.render(React.createElement(MemoryRouter, null, React.createElement(Component, props)))
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    },
    {
      reactUrl: sourceUrl('/node_modules/.vite/deps/react.js'),
      reactDomUrl: sourceUrl('/node_modules/.vite/deps/react-dom_client.js'),
      backButtonUrl: sourceUrl('/src/components/BackButton.js'),
      styleUrl: sourceUrl('/src/scss/style.scss'),
      componentUrl: sourceUrl(componentPath),
    },
  )
}

for (const componentCase of componentCases) {
  test(`Leave detail preserves semantic, responsive, and link behavior for ${componentCase.name}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: componentCase.width, height: componentCase.height })
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await renderLeaveDetail(page, componentCase.componentPath)
    expect(pageErrors).toEqual([])

    const list = page.locator('dl.responsive-key-value-list').first()
    await expect(list).toBeVisible()
    await expect(list.locator('dt')).toHaveText(['Days', 'Reason', 'Evidence', 'Coverage By'])
    await expect(list.getByText('0', { exact: true })).toBeVisible()
    await expect(list.getByText(/REASON-WITH-AN-EXCEPTIONALLY-LONG/)).toBeVisible()
    const evidence = page.getByRole('link', { name: 'supporting-evidence.pdf' })
    await expect(evidence).toHaveAttribute('target', '_blank')
    await expect(evidence).toHaveAttribute('href', /leave\/attachments\/attachment-browser-1/)

    await page.getByRole('button', { name: /Request information/i }).click()
    const requestInformation = page.locator('dl.responsive-key-value-list').last()
    await expect(requestInformation).toBeVisible()
    await expect(requestInformation.locator('dt')).toHaveText([
      'Current Action Owner',
      'Workflow Scope',
      'Applicant Role',
      'Roster Impact',
    ])
    await expect(
      requestInformation.getByText(/EXCEPTIONALLY-LONG-UNBROKEN-SHIFT-NAME-1234567890/),
    ).toBeVisible()
    await expect(requestInformation.getByText(/captured 2026-08-01 09:30/)).toBeVisible()

    await page.getByRole('button', { name: 'Back' }).focus()
    await page.keyboard.press('Tab')
    await expect(evidence).toBeFocused()

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
    if (componentCase.width < 768) {
      const [titleBox, backBox] = await Promise.all([
        page.getByRole('heading', { level: 2, name: 'Annual Leave' }).boundingBox(),
        page.getByRole('button', { name: 'Back' }).boundingBox(),
      ])
      expect(titleBox).not.toBeNull()
      expect(backBox).not.toBeNull()
      expect(Math.abs(titleBox.y - backBox.y)).toBeLessThanOrEqual(12)
      expect(backBox.x + backBox.width).toBeLessThanOrEqual(componentCase.width)
    }
    await page.screenshot({
      path: testInfo.outputPath(`${componentCase.name}.png`),
      fullPage: true,
    })
    expect(pageErrors).toEqual([])
  })
}

test('compact populated records remain readable and keep actions outside the open target at 320px', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await page.goto(sourceUrl('/@vite/client'), { waitUntil: 'commit' })
  await page.setContent('<main><div id="compact-record-browser-harness"></div></main>')
  await page.evaluate(
    async ({ reactUrl, reactDomUrl, styleUrl, componentUrl }) => {
      const [{ default: React }, { default: ReactDomClient }, componentModule] = await Promise.all([
        import(/* @vite-ignore */ reactUrl),
        import(/* @vite-ignore */ reactDomUrl),
        import(/* @vite-ignore */ componentUrl),
        import(/* @vite-ignore */ styleUrl),
      ])
      const MobileRecordList = componentModule.default
      const item = {
        key: 'LEV-BROWSER-001',
        layout: 'compact',
        title: '15 Apr 2026 08:30 AM – 15 Apr 2026 05:30 PM',
        subtitle: 'Compassionate Leave · LEV-AL-2026-001 · 1 day',
        status: React.createElement(
          'span',
          { className: 'compact-record-status small fw-semibold text-nowrap' },
          'Pending Review',
        ),
        ariaLabel: 'Open leave record LEV-AL-2026-001 summary',
        onOpen: () => {},
        actions: React.createElement(
          'button',
          { type: 'button', 'aria-label': 'Row actions' },
          '⋮',
        ),
      }
      const root = ReactDomClient.createRoot(
        document.getElementById('compact-record-browser-harness'),
      )
      root.render(
        React.createElement(MobileRecordList, {
          sections: [
            {
              key: 'april-2026',
              label: 'April 2026',
              summary: '1 day',
              variant: 'list-group',
              items: [item],
            },
          ],
        }),
      )
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    },
    {
      reactUrl: sourceUrl('/node_modules/.vite/deps/react.js'),
      reactDomUrl: sourceUrl('/node_modules/.vite/deps/react-dom_client.js'),
      styleUrl: sourceUrl('/src/scss/style.scss'),
      componentUrl: sourceUrl('/src/components/MobileRecordList.js'),
    },
  )

  const openTarget = page.getByRole('button', {
    name: 'Open leave record LEV-AL-2026-001 summary',
  })
  const rowActions = page.getByRole('button', { name: 'Row actions' })
  await expect(openTarget).toBeVisible()
  await expect(rowActions).toBeVisible()
  expect(await openTarget.evaluate((element) => element.contains(document.activeElement))).toBe(
    false,
  )
  expect(await openTarget.evaluate((element) => element.querySelector('button'))).toBeNull()
  await expect(page.getByText('Pending Review')).toBeVisible()
  await expect(page.getByText(/Compassionate Leave/)).toBeVisible()
  const [titleBox, statusBox] = await Promise.all([
    page.locator('.record-card__title').boundingBox(),
    page.locator('.compact-record-status').boundingBox(),
  ])
  expect(titleBox).not.toBeNull()
  expect(statusBox).not.toBeNull()
  expect(statusBox.y).toBeGreaterThanOrEqual(titleBox.y + titleBox.height)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)
  await page.screenshot({ path: testInfo.outputPath('populated-compact-record-mobile-320.png') })
})
