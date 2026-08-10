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
    name: 'applicant Leave mobile',
    width: 320,
    height: 700,
    kind: 'leave',
    componentPath: '/src/views/leave/components/LeaveDetailSection.js',
    message: 'Leave record not found.',
    backName: 'Back',
  },
  {
    name: 'staff Leave desktop',
    width: 1440,
    height: 900,
    kind: 'leave',
    componentPath: '/src/views/staff/leave-management/components/LeaveDetailSection.js',
    message: 'Leave record not found.',
    backName: 'Back',
  },
  {
    name: 'Overtime mobile',
    width: 320,
    height: 700,
    kind: 'overtime',
    componentPath: '/src/views/overtime/components/OvertimeDetailSection.js',
    message: 'Overtime record not found.',
    backName: 'Back',
  },
  {
    name: 'staff Salary Claim mobile',
    width: 320,
    height: 700,
    kind: 'staff-claim',
    componentPath: '/src/views/staff/salary-claims-management/components/ClaimDetailView.js',
    message: 'Claim record not found.',
    backName: 'Back to claims',
  },
  {
    name: 'Payroll Claim desktop',
    width: 1440,
    height: 900,
    kind: 'payroll-claim',
    componentPath: '/src/views/payroll/components/ClaimDetailSection.js',
    message: 'Claim record not found.',
    backName: 'Back to claims',
  },
]

const renderMissingDetailState = async (page, componentCase) => {
  await page.goto(sourceUrl('/@vite/client'), { waitUntil: 'commit' })
  await page.setContent(
    '<main><div class="container-fluid" id="state-recovery-browser-harness"></div></main>',
  )
  await page.evaluate(
    async ({ reactUrl, reactDomUrl, backButtonUrl, styleUrl, componentUrl, kind }) => {
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
      let props
      if (kind === 'staff-claim') {
        props = {
          vm: {
            selectedClaim: null,
            selectedClaimTypeMeta: { label: 'Claim', icon: () => null },
            statusColorMap: {},
          },
          handlers: { onBack: () => {} },
        }
      } else if (kind === 'payroll-claim') {
        props = {
          selectedClaim: null,
          selectedClaimTypeMeta: { label: 'Claim', icon: () => null },
        }
      } else {
        props = { selectedRecord: null, onBack: () => {} }
      }

      const root = ReactDomClient.createRoot(
        document.getElementById('state-recovery-browser-harness'),
      )
      root.render(React.createElement(MemoryRouter, null, React.createElement(Component, props)))
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    },
    {
      reactUrl: sourceUrl('/node_modules/.vite/deps/react.js'),
      reactDomUrl: sourceUrl('/node_modules/.vite/deps/react-dom_client.js'),
      backButtonUrl: sourceUrl('/src/components/BackButton.js'),
      styleUrl: sourceUrl('/src/scss/style.scss'),
      componentUrl: sourceUrl(componentCase.componentPath),
      kind: componentCase.kind,
    },
  )
}

for (const componentCase of componentCases) {
  test(`missing-record state remains accessible and responsive for ${componentCase.name}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: componentCase.width, height: componentCase.height })
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await renderMissingDetailState(page, componentCase)

    const alert = page.getByRole('alert')
    await expect(alert).toBeVisible()
    await expect(alert).toContainText(componentCase.message)
    await expect(page.getByRole('button', { name: componentCase.backName })).toBeVisible()
    await page.getByRole('button', { name: componentCase.backName }).focus()
    await expect(page.getByRole('button', { name: componentCase.backName })).toBeFocused()
    await expect(page.locator('.card')).toHaveCount(0)

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
    expect(pageErrors).toEqual([])
  })
}
