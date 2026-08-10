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
  throw new Error(
    'The browser component server must use an explicit http://127.0.0.1:<port> origin.',
  )
}

const devBaseUrl = parsedDevBaseUrl.origin

const sourceUrl = (sourcePath) => {
  const resolvedUrl = new URL(sourcePath, devBaseUrl)
  if (resolvedUrl.origin !== devBaseUrl) {
    throw new Error('Browser component source URLs must stay on the controlled loopback origin.')
  }
  return resolvedUrl.href
}

const watchPageErrors = (page) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  return errors
}

const expectToolbarWithinViewport = async (page) => {
  const toolbar = page.locator('.inspection-check-toolbar')
  const box = await toolbar.boundingBox()
  const viewport = page.viewportSize()
  expect(box).not.toBeNull()
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
}

const renderSourceComponent = async (page, { componentPath, exportName, props }) => {
  await page.goto(sourceUrl('/@vite/client'), { waitUntil: 'commit' })
  await page.setContent('<main id="filter-search-browser-harness"></main>')
  await page.evaluate(
    async ({
      reactUrl,
      reactDomUrl,
      componentUrl,
      exportName: componentExportName,
      props: componentProps,
    }) => {
      const [{ default: React }, { default: ReactDomClient }, componentModule] = await Promise.all([
        import(/* @vite-ignore */ reactUrl),
        import(/* @vite-ignore */ reactDomUrl),
        import(/* @vite-ignore */ componentUrl),
      ])
      const Component = componentModule[componentExportName]
      if (typeof Component !== 'function') {
        throw new Error(`Missing component export: ${componentExportName}`)
      }

      const container = document.getElementById('filter-search-browser-harness')
      const root = ReactDomClient.createRoot(container)
      root.render(React.createElement(Component, componentProps))

      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    },
    {
      reactUrl: sourceUrl('/node_modules/.vite/deps/react.js'),
      reactDomUrl: sourceUrl('/node_modules/.vite/deps/react-dom_client.js'),
      componentUrl: sourceUrl(componentPath),
      exportName,
      props,
    },
  )
}

test('browser component source URLs fail closed outside the controlled loopback origin', () => {
  expect(() => sourceUrl('https://example.com/untrusted-component.js')).toThrow(
    'Browser component source URLs must stay on the controlled loopback origin.',
  )
})

test('fire extinguisher row search preserves its mobile filter and clear journey', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await renderSourceComponent(page, {
    componentPath: '/src/views/inspection/types/fire-extinguisher/section.js',
    exportName: 'FireExtinguisherEditSection',
    props: {
      mainLocation: 'Manjung Hub',
      mainLocationLabel: 'Zone 1 > Manjung Hub',
      form: { zone: '1', subLocation: 'Reception' },
      summary: {
        visibleChecks: [
          {
            id: 'fe:first',
            idLocNo: 'ADO-001',
            barcodeNo: 'FIRST-BARCODE',
            feType: 'DP 6KG',
            mainLocation: 'Manjung Hub',
            subLocation: 'Reception',
          },
          {
            id: 'fe:second',
            idLocNo: 'BDO-002',
            barcodeNo: 'SECOND-BARCODE',
            feType: 'CO2 5KG',
            mainLocation: 'Manjung Hub',
            subLocation: 'Reception',
          },
        ],
        completedCount: 0,
        totalCount: 2,
        defectCount: 0,
      },
      fieldErrors: {},
      validationState: null,
      handlers: {},
    },
  })

  const search = page.getByLabel('Search fire extinguisher rows')
  await expect(search).toBeVisible()
  await expect(search).toHaveAttribute(
    'placeholder',
    'Search extinguisher ID, barcode, type, sub-location...',
  )

  await search.fill('BDO-002')
  await expect(page.getByText('Showing 1 of 2')).toBeVisible()

  await search.fill('no-record-can-match-this-search')
  await expect(page.getByText('Showing 0 of 2')).toBeVisible()
  await expect(page.getByText('No fire extinguishers match this search.')).toBeVisible()

  await page.getByRole('button', { name: 'Clear fire extinguisher row search' }).click()
  await expect(search).toHaveValue('')
  await expect(
    page.getByRole('button', { name: 'Clear fire extinguisher row search' }),
  ).toHaveCount(0)
  await expect(page.getByText('No fire extinguishers match this search.')).toHaveCount(0)
})

test('FRT row search preserves its desktop filter and clear journey', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 })
  await renderSourceComponent(page, {
    componentPath: '/src/views/inspection/types/frt-daily/frtDailyInspectionChecks.js',
    exportName: 'FrtDailyInspectionChecks',
    props: {
      mainLocation: 'FIRE TRUCK',
      mainLocationLabel: 'AJG9555',
      form: { subLocation: 'LOCKER 01' },
      summary: {
        visibleDailySections: [
          {
            key: 'daily',
            title: 'DAILY CHECKLIST',
            visibleRows: [
              {
                id: 'frt:daily:pump',
                checklistKind: 'daily',
                rowNumber: '1',
                rowKind: 'status',
                equipment: 'Pump Panel',
                quantity: '1',
              },
              {
                id: 'frt:daily:hose',
                checklistKind: 'daily',
                rowNumber: '2',
                rowKind: 'status',
                equipment: 'Fire Hose',
                quantity: '2',
              },
            ],
          },
        ],
        visibleOneOffSections: [],
        dailyCheckedCount: 0,
        dailyRows: [],
        dailyIssueCount: 0,
        dailyIncompleteRemarksCount: 0,
        dailyIncompletePhotoCount: 0,
        oneOffCheckedCount: 0,
        oneOffRows: [],
        oneOffIssueCount: 0,
        oneOffIncompleteRemarksCount: 0,
        oneOffIncompletePhotoCount: 0,
      },
      fieldErrors: {},
      validationState: null,
    },
  })

  const search = page.getByLabel('Search truck readiness rows')
  await expect(search).toBeVisible()
  await expect(search).toHaveAttribute('placeholder', 'Search truck readiness rows...')

  await search.fill('Fire Hose')
  await expect(page.getByText('Showing 1 of 2')).toBeVisible()

  await search.fill('no-record-can-match-this-search')
  await expect(page.getByText('Showing 0 of 2')).toBeVisible()
  await expect(page.getByText('No truck readiness rows match this search.')).toBeVisible()

  await page.getByRole('button', { name: 'Clear truck readiness row search' }).click()
  await expect(search).toHaveValue('')
  await expect(page.getByRole('button', { name: 'Clear truck readiness row search' })).toHaveCount(
    0,
  )
  await expect(page.getByText('No truck readiness rows match this search.')).toHaveCount(0)
})

test('hydraulic row search preserves its mobile filter and clear journey', async ({ page }) => {
  const pageErrors = watchPageErrors(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await renderSourceComponent(page, {
    componentPath: '/src/views/inspection/form/components/HydraulicEquipmentChecks.js',
    exportName: 'HydraulicEquipmentChecks',
    props: {
      mainLocation: 'FRT',
      checks: [],
      summary: {
        visibleChecks: [
          {
            id: 'hydraulic:pump',
            equipment: 'Hydraulic Pump Motor 1',
            equipmentDescription: 'FRT bay',
          },
          {
            id: 'hydraulic:ram',
            equipment: 'Telescopic Ram',
            equipmentDescription: 'Rear compartment',
          },
        ],
        totalCount: 2,
      },
    },
  })

  const search = page.getByLabel('Search hydraulic equipment rows')
  await expect(search).toBeVisible()
  await expect(search).toHaveAttribute('placeholder', 'Search hydraulic equipment...')
  await expectToolbarWithinViewport(page)

  await search.fill('Rear compartment')
  await expect(page.getByText('Showing 1 of 2')).toBeVisible()
  await expect(page.getByText('Telescopic Ram')).toBeVisible()
  await expect(page.getByText('Hydraulic Pump Motor 1')).toHaveCount(0)
  await search.press('Tab')
  await expect(
    page.getByRole('button', { name: 'Clear hydraulic equipment row search' }),
  ).toBeFocused()
  await search.focus()

  await search.fill('no-record-can-match-this-search')
  await expect(page.getByText('Showing 0 of 2')).toBeVisible()
  await expect(page.getByText('No hydraulic equipment rows match this search.')).toBeVisible()

  await page.getByRole('button', { name: 'Clear hydraulic equipment row search' }).click()
  await expect(search).toHaveValue('')
  await expect(
    page.getByRole('button', { name: 'Clear hydraulic equipment row search' }),
  ).toHaveCount(0)
  await expect(page.getByText('Hydraulic Pump Motor 1')).toBeVisible()
  await expect(page.getByText('Telescopic Ram')).toBeVisible()
  expect(pageErrors).toEqual([])
})

test('ER Aux row search preserves its tablet filter and clear journey', async ({ page }) => {
  const pageErrors = watchPageErrors(page)
  await page.setViewportSize({ width: 820, height: 1000 })
  await renderSourceComponent(page, {
    componentPath: '/src/views/inspection/form/components/ErAuxInspectionChecks.js',
    exportName: 'ErAuxEquipmentChecks',
    props: {
      mainLocation: 'Office',
      checks: [],
      summary: {
        visibleChecks: [
          {
            id: 'er-aux:radio',
            equipment: 'Radio Tetra',
            equipmentDescription: 'Office set',
            defaultQuantity: '7',
          },
          {
            id: 'er-aux:torch',
            equipment: 'Emergency Torch',
            equipmentDescription: 'Control room cabinet',
            defaultQuantity: '2',
          },
        ],
        totalCount: 2,
      },
    },
  })

  const search = page.getByLabel('Search ER Aux equipment rows')
  await expect(search).toBeVisible()
  await expect(search).toHaveAttribute('placeholder', 'Search ER Aux equipment...')
  await expectToolbarWithinViewport(page)

  await search.fill('Control room')
  await expect(page.getByText('Showing 1 of 2')).toBeVisible()
  await expect(page.getByText('Emergency Torch')).toBeVisible()
  await expect(page.getByText('Radio Tetra')).toHaveCount(0)

  await search.fill('no-record-can-match-this-search')
  await expect(page.getByText('Showing 0 of 2')).toBeVisible()
  await expect(
    page.getByText('No Emergency Response Auxiliary Equipment rows match this search.'),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Clear ER Aux equipment row search' }).click()
  await expect(search).toHaveValue('')
  await expect(page.getByRole('button', { name: 'Clear ER Aux equipment row search' })).toHaveCount(
    0,
  )
  await expect(page.getByText('Radio Tetra')).toBeVisible()
  await expect(page.getByText('Emergency Torch')).toBeVisible()
  expect(pageErrors).toEqual([])
})

test('high angle row search preserves selection and reset journeys on desktop', async ({
  page,
}) => {
  const pageErrors = watchPageErrors(page)
  await page.setViewportSize({ width: 1440, height: 960 })
  await renderSourceComponent(page, {
    componentPath: '/src/views/inspection/form/components/HighAngleInspectionChecks.js',
    exportName: 'HighAngleInspectionChecks',
    props: {
      mainLocation: 'High Angle Rescue Kit',
      summary: {
        visibleGroups: [
          {
            key: 'locker-a',
            title: 'Locker A',
            rows: [
              { id: 'row-a1', rowNumber: '1', equipment: 'Rescue Rope' },
              { id: 'row-a2', rowNumber: '2', equipment: 'Edge Protector' },
            ],
          },
          {
            key: 'locker-b',
            title: 'Locker B',
            rows: [{ id: 'row-b1', rowNumber: '3', equipment: 'Rescue Harness' }],
          },
        ],
      },
    },
  })

  const search = page.getByLabel('Search high angle equipment rows')
  await expect(search).toHaveCount(0)
  await page.getByRole('button', { name: /Locker A 2 items/ }).click()
  await expect(search).toBeVisible()
  await expect(search).toHaveAttribute('placeholder', 'Search high angle equipment...')
  await expectToolbarWithinViewport(page)

  await search.fill('Edge')
  await expect(page.getByText('Showing 1 of 3')).toBeVisible()
  await expect(page.getByText('Edge Protector')).toBeVisible()
  await expect(page.getByText('Rescue Rope')).toHaveCount(0)

  await search.fill('no-record-can-match-this-search')
  await expect(page.getByText('Showing 0 of 3')).toBeVisible()
  await expect(page.getByText('No high angle equipment rows match this search.')).toBeVisible()

  await page.getByRole('button', { name: 'Clear high angle equipment row search' }).click()
  await expect(search).toHaveValue('')
  await expect(page.getByText('Rescue Rope')).toBeVisible()
  await expect(page.getByText('Edge Protector')).toBeVisible()

  await search.fill('Rope')
  await page.getByRole('button', { name: /Locker B 1 item/ }).click()
  await expect(search).toHaveValue('')
  await expect(page.getByText('Rescue Harness')).toBeVisible()
  expect(pageErrors).toEqual([])
})
