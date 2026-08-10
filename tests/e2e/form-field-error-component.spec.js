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

const record = {
  id: 'report-browser-pilot',
  displayId: 'ERCO-BROWSER-PILOT',
  incidentType: 'Fire',
  location: 'Zone A',
  status: 'Submitted',
}

const renderReportWorkflowModal = async (page, props) => {
  await page.goto(sourceUrl('/@vite/client'), { waitUntil: 'commit' })
  await page.setContent('<main id="form-field-error-browser-harness"></main>')
  await page.evaluate(
    async ({ reactUrl, reactDomUrl, styleUrl, componentUrl, componentProps }) => {
      const [{ default: React }, { default: ReactDomClient }, componentModule] = await Promise.all([
        import(/* @vite-ignore */ reactUrl),
        import(/* @vite-ignore */ reactDomUrl),
        import(/* @vite-ignore */ componentUrl),
        import(/* @vite-ignore */ styleUrl),
      ])
      const Component = componentModule.default
      const root = ReactDomClient.createRoot(
        document.getElementById('form-field-error-browser-harness'),
      )
      window.__updateFormFieldErrorPilot = (nextProps) => {
        root.render(React.createElement(Component, nextProps))
      }
      window.__updateFormFieldErrorPilot(componentProps)
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    },
    {
      reactUrl: sourceUrl('/node_modules/.vite/deps/react.js'),
      reactDomUrl: sourceUrl('/node_modules/.vite/deps/react-dom_client.js'),
      styleUrl: sourceUrl('/src/scss/style.scss'),
      componentUrl: sourceUrl('/src/views/report/components/ReportWorkflowActionModal.js'),
      componentProps: props,
    },
  )
}

const errorProps = {
  visible: true,
  actionType: 'reject',
  record,
  remarks: '',
  declarationChecked: false,
  declarationLabel: 'I confirm responsibility for this action.',
  declarationError: 'Confirm responsibility before continuing.',
  rejectError: 'Rejection remarks are required.',
}

for (const viewport of [
  { name: 'mobile-320', width: 320, height: 700 },
  { name: 'desktop', width: 1440, height: 900 },
]) {
  test(`report workflow field errors remain described and recover on ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await renderReportWorkflowModal(page, errorProps)

    const remarks = page.getByLabel('Remarks (required)')
    const remarksError = page.getByText('Rejection remarks are required.')
    await expect(remarks).toHaveAttribute('aria-invalid', 'true')
    await expect(remarks).toHaveAttribute('aria-describedby', 'report-workflow-remarks-error')
    await expect(remarksError).toHaveAttribute('id', 'report-workflow-remarks-error')
    await expect(remarksError).toHaveClass(/invalid-feedback/)
    await expect(remarksError).not.toHaveAttribute('role', 'alert')
    await expect(page.getByText('Confirm responsibility before continuing.')).toBeVisible()

    await page.evaluate((nextProps) => window.__updateFormFieldErrorPilot(nextProps), {
      ...errorProps,
      declarationError: '',
      rejectError: '',
    })

    await expect(remarks).not.toHaveAttribute('aria-invalid')
    await expect(remarks).not.toHaveAttribute('aria-describedby')
    await expect(remarksError).toHaveCount(0)
    await expect(page.getByText('Confirm responsibility before continuing.')).toHaveCount(0)
    expect(pageErrors).toEqual([])
  })
}
