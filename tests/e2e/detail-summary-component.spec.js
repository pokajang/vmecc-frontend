const { expect, test } = require('@playwright/test')

const configuredDevBaseUrl = process.env.VMECC_E2E_BASE_URL || 'http://127.0.0.1:4173'
const parsedDevBaseUrl = new URL(configuredDevBaseUrl)

if (
  parsedDevBaseUrl.protocol !== 'http:' ||
  parsedDevBaseUrl.hostname !== '127.0.0.1' ||
  !parsedDevBaseUrl.port ||
  parsedDevBaseUrl.username ||
  parsedDevBaseUrl.password
) {
  throw new Error('The browser component server must use an explicit loopback origin and port.')
}

const devBaseUrl = parsedDevBaseUrl.origin
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
  }) => {
    await page.setViewportSize({ width: componentCase.width, height: componentCase.height })
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await renderLeaveDetail(page, componentCase.componentPath)
    expect(pageErrors).toEqual([])

    const list = page.locator('dl.responsive-key-value-list')
    await expect(list).toBeVisible()
    await expect(list.locator('dt')).toHaveText(
      componentCase.staff
        ? [
            'Leave ID',
            'Leave Type',
            'Schedule',
            'Days',
            'Current Status',
            'Current Action Owner',
            'Next Action',
            'Applied On',
            'Coverage By',
            'Roster Impact',
            'Evidence',
            'Reason',
          ]
        : [
            'Leave ID',
            'Leave Type',
            'Schedule',
            'Days',
            'Current Status',
            'Current Action Owner',
            'Workflow Scope',
            'Applicant Role',
            'Next Action',
            'Applied On',
            'Coverage By',
            'Roster Impact',
            'Evidence',
            'Reason',
          ],
    )
    await expect(list.getByText('0', { exact: true })).toBeVisible()
    await expect(list.getByText(/REASON-WITH-AN-EXCEPTIONALLY-LONG/)).toBeVisible()
    if (componentCase.staff) await expect(list.getByText(/captured 2026-08-01 09:30/)).toBeVisible()

    const evidence = page.getByRole('link', { name: 'supporting-evidence.pdf' })
    await expect(evidence).toHaveAttribute('target', '_blank')
    await expect(evidence).toHaveAttribute('href', /leave\/attachments\/attachment-browser-1/)
    await page.getByRole('button', { name: 'Back' }).focus()
    await page.keyboard.press('Tab')
    await expect(evidence).toBeFocused()

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
    expect(pageErrors).toEqual([])
  })
}
