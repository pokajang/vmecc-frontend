const { expect, test } = require('@playwright/test')

const baseUrl = process.env.VMECC_E2E_BASE_URL || 'http://localhost:3000'

const draftPayload = {
  schemaVersion: 2,
  reportDate: '2026-07-11',
  reportTime: '09:00',
  reportIssuanceDate: '2026-07-12',
  weather: 'Clear',
  incidentType: 'Fire Drill',
  exerciseCategories: ['Fire', 'Rescue'],
  location: 'Workshop',
  exerciseTitle: 'Workshop major fire exercise',
  details: 'A simulated workshop fire required evacuation and rescue response.',
  exerciseObjectives: [{ id: 'objective-1', text: 'Test evacuation and command readiness' }],
  erpReferences: [{ id: 'erp-1', annexNumber: 'ERP-01', title: 'Major Fire' }],
  summary: 'The exercise was completed and the team returned to readiness.',
  respondingTeamName: 'A Team',
  respondingTeamShift: 'day',
  respondingAttendance: [
    {
      memberKey: 'manual-commander',
      name: 'Exercise Commander',
      role: 'Station Commander',
      exerciseRole: 'SC',
      teamName: 'Manual / External',
      present: true,
      source: 'manual',
    },
  ],
  chronology: [
    { id: 'chronology-1', time: '09:00', action: 'Exercise started' },
    { id: 'chronology-2', time: '09:05', action: 'Response team mobilised' },
  ],
  postIncidentAnalysis: {
    strengths: ['Clear command structure'],
    resourcesMobilised: ['Ambulance', 'Rescue equipment'],
    improvementOpportunities: ['Improve radio checks'],
    photos: [],
  },
  savedAt: '2026-07-11T09:30:00.000Z',
}

const user = {
  id: 901,
  name: 'Drill UI Tester',
  email: 'drill.ui@example.test',
  status: 'active',
  ic_number: 'E2E-901',
  phone: '+60120000901',
  address: 'Test address',
  state: 'Selangor',
  emergency_contact: {
    name: 'Test Contact',
    relationship: 'Colleague',
    phone: '+60120000902',
  },
  medical_info: { noKnownCriticalMedicalInfo: true },
  permissions: ['reports.drill.view', 'self.dashboard'],
  roles: ['Tactical Response Team'],
}

const json = (route, body, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

const installApiStubs = async (page, initialDraft = draftPayload) => {
  let serverDraft = initialDraft
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (!url.pathname.startsWith('/api/')) return route.continue()
    const path = url.pathname.replace(/^\/api/, '')
    const method = request.method()

    if (path === '/auth/session') return json(route, { user, csrf_token: 'drill-ui-token' })
    if (path === '/settings/modules') {
      return json(route, {
        data: {
          registry: [],
          configured: {},
          effective: {},
          forceAllEnabled: false,
          fallbackMode: true,
        },
      })
    }
    if (path === '/settings/system-maintenance') {
      return json(route, { data: { enabled: false, phase: 'off', message: '' } })
    }
    if (path === '/reports/draft' && method === 'GET') {
      return json(route, {
        data: {
          id: 1,
          report_type: 'drill',
          saved_at: serverDraft.savedAt,
          payload: serverDraft,
        },
      })
    }
    if (path === '/reports/draft' && method === 'POST') {
      const body = request.postDataJSON()
      serverDraft = body.payload
      return json(
        route,
        {
          data: {
            id: 1,
            report_type: 'drill',
            saved_at: new Date().toISOString(),
            payload: body.payload,
          },
        },
        201,
      )
    }
    if (path === '/report-media' && method === 'POST') {
      return json(
        route,
        {
          data: {
            media_id: 'drill-camera-media-e2e',
            url: '/report-media/drill-camera-media-e2e',
            thumbnail_url: '/report-media/drill-camera-media-e2e',
            file_name: 'camera-return.jpg',
            mime_type: 'image/jpeg',
            size_bytes: 1024,
            width: 1600,
            height: 1200,
            thumbnail_size_bytes: 128,
            thumbnail_width: 320,
            thumbnail_height: 240,
            checksum_sha256: 'drill-camera-checksum-e2e',
            lease_id: 'drill-camera-lease-e2e',
            lease_expires_at: '2026-07-12T09:00:00.000Z',
            lease_absolute_expires_at: '2026-07-13T09:00:00.000Z',
          },
        },
        201,
      )
    }
    if (path === '/report-media/drill-camera-media-e2e' && method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'image/gif',
        body: Buffer.from(transparentPixel.split(',')[1], 'base64'),
      })
    }
    if (path === '/reports' && method === 'GET') return json(route, { data: [] })
    if (path === '/teams') return json(route, { data: [] })
    if (path === '/rosters') return json(route, { data: [] })
    if (path === '/settings/shift-windows') {
      return json(route, { data: { day_start: '07:00', day_end: '19:00' } })
    }
    if (method === 'GET') return json(route, { data: [] })
    return json(route, { data: {} })
  })
}

const expectNoHorizontalOverflow = async (page) => {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)
}

const responsiveViewports = [
  { name: 'mobile-320', size: { width: 320, height: 700 } },
  { name: 'mobile-360', size: { width: 360, height: 800 } },
  { name: 'mobile-390', size: { width: 390, height: 844 } },
  { name: 'mobile-430', size: { width: 430, height: 932 } },
  { name: 'mobile-landscape', size: { width: 844, height: 390 } },
  { name: 'desktop', size: { width: 1440, height: 900 } },
]

const transparentPixel = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='

const stressDraftPayload = {
  ...draftPayload,
  exerciseTitle:
    'A deliberately long workshop emergency exercise title used to verify wrapping without horizontal overflow',
  chronology: Array.from({ length: 25 }, (_, index) => ({
    id: `chronology-stress-${index + 1}`,
    time: `09:${String(index).padStart(2, '0')}`,
    action:
      index === 24
        ? 'Final accountability confirmation completed for every participating response organisation'
        : `Chronology stress event ${index + 1}`,
  })),
  postIncidentAnalysis: {
    ...draftPayload.postIncidentAnalysis,
    photos: Array.from({ length: 10 }, (_, index) => ({
      id: `stress-photo-${index + 1}`,
      mediaId: 2000 + index,
      url: transparentPixel,
      thumbnailUrl: transparentPixel,
      fileName: `stress-photo-${index + 1}.jpg`,
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
      width: 1600,
      height: 1200,
      checksumSha256: `stress-checksum-${index + 1}`,
      leaseId: `stress-lease-${index + 1}`,
      leaseExpiresAt: '2026-07-12T09:00:00.000Z',
      uploadId: `stress-upload-${index + 1}`,
      description: `Stress photo ${index + 1} showing a long operational exercise description`,
    })),
  },
}

test.describe('Drill Upgrade UI V1', () => {
  for (const viewport of responsiveViewports) {
    test(`completes the five ${viewport.name} stages and enters the shared review route`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport.size)
      await installApiStubs(page)
      await page.goto(`${baseUrl}/report/drill/new/setup`)

      await expect(page.getByTestId('drill-report-setup-ready')).toBeVisible()
      await expect(page.getByRole('button', { name: /^Fire/ })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
      await expect(page.getByRole('button', { name: /^Rescue/ })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
      await expect(page.getByRole('button', { name: 'Add category' })).toBeVisible()
      await expectNoHorizontalOverflow(page)

      await page.getByRole('button', { name: 'Continue' }).click()
      await expect(page).toHaveURL(/\/report\/drill\/new\/personnel/)
      await expect(page.getByRole('checkbox', { name: 'Exercise Commander' })).toBeChecked()
      await expectNoHorizontalOverflow(page)

      await page.getByRole('button', { name: 'Continue' }).click()
      await expect(page).toHaveURL(/\/report\/drill\/new\/details/)
      await expect(page.getByLabel('Drill scenario')).toHaveValue(draftPayload.details)
      await expect(page.getByText('ERP / Annex references (optional)')).toBeVisible()
      await expectNoHorizontalOverflow(page)

      await page.getByRole('button', { name: 'Continue' }).click()
      await expect(page).toHaveURL(/\/report\/drill\/new\/chronology/)
      if (viewport.size.width < 768) {
        await expect(page.getByRole('button', { name: 'Edit chronology row 2' })).toBeVisible()
        await expect(page.getByText('Response team mobilised')).toBeVisible()
      } else {
        await expect(page.getByRole('textbox', { name: 'Event / Action' }).nth(1)).toHaveValue(
          'Response team mobilised',
        )
      }
      await expectNoHorizontalOverflow(page)

      await page.getByRole('button', { name: 'Continue' }).click()
      await expect(page).toHaveURL(/\/report\/drill\/new\/analysis/)
      await expect(page.getByRole('textbox', { name: 'Strengths entry 1' })).toHaveValue(
        'Clear command structure',
      )
      await expect(page.getByRole('button', { name: 'Upload photo' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Reset' })).toHaveCount(0)
      await expectNoHorizontalOverflow(page)

      await page.getByRole('button', { name: 'Review & Submit' }).click()
      await expect(page).toHaveURL(/\/report\/drill\/new\/review/)
      await expect(page.getByText('Workflow Sign-Off')).toBeVisible()
      await expect(page.getByText('Station Commander Review')).toBeVisible()
      await expect(page.getByText('VMM Review')).toBeVisible()
      await expectNoHorizontalOverflow(page)
    })
  }

  test('keeps maximum photos and long chronology usable at the narrowest width', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 700 })
    await installApiStubs(page, stressDraftPayload)
    await page.goto(`${baseUrl}/report/drill/new/analysis`)

    const photoSection = page.getByRole('region', { name: 'Exercise photographs' })
    await expect(photoSection.locator('img')).toHaveCount(10)
    await expect(photoSection.getByRole('textbox')).toHaveCount(10)
    await expectNoHorizontalOverflow(page)

    await page.getByRole('button', { name: 'Review & Submit' }).click()
    await expect(page).toHaveURL(/\/report\/drill\/new\/review/)
    await expect(
      page.getByText(
        'Final accountability confirmation completed for every participating response organisation',
      ),
    ).toBeVisible()
    await expect(page.getByRole('img', { name: /Stress photo/ })).toHaveCount(10)
    await expectNoHorizontalOverflow(page)
  })

  test('keeps the Drill session and photo after a simulated camera return', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await installApiStubs(page)
    await page.goto(`${baseUrl}/report/drill/new/analysis`)

    await page.getByLabel('Take drill report photo').setInputFiles({
      name: 'camera-return.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
    })

    await expect(
      page.getByRole('textbox', { name: 'Description for camera-return.jpg' }),
    ).toBeVisible()
    await expect(page).toHaveURL(/\/report\/drill\/new\/analysis/)
    await expect(page.getByRole('region', { name: 'Exercise photographs' })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await page.getByRole('button', { name: 'Review & Submit' }).click()
    await expect(page).toHaveURL(/\/report\/drill\/new\/review/)
    await expect(page.getByRole('img', { name: 'camera-return.jpg' })).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })

  test('adds and restores a custom exercise category without checkbox controls', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await installApiStubs(page)
    await page.goto(`${baseUrl}/report/drill/new/setup`)

    await page.getByRole('button', { name: 'Add category' }).click()
    const manager = page.getByTestId('drill-report-category-manager-modal')
    await expect(manager).toBeVisible()
    await manager.getByLabel('Exercise Category Name').fill('Medical Response')
    await manager
      .getByLabel('Exercise category details (optional)')
      .fill('Casualty triage and medical handover.')
    await manager.getByRole('button', { name: 'Save Category' }).click()

    const customCategory = page.getByRole('button', { name: /^Medical Response/ })
    await expect(customCategory).toBeVisible()
    await expect(customCategory).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('checkbox')).toHaveCount(0)

    await page.getByRole('button', { name: 'Save Draft' }).click()
    await page.reload()

    await expect(page.getByRole('button', { name: /^Medical Response/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expectNoHorizontalOverflow(page)
  })

  test('keeps restored mobile setup feedback and summary rows compact', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await installApiStubs(page)
    await page.goto(`${baseUrl}/report/drill/new/setup`)

    const feedback = page.getByRole('status')
    const setup = page.getByTestId('drill-report-setup-ready')
    const environmentLabel = setup
      .locator('.mobile-setup-summary__label')
      .filter({ hasText: /^Environment$/ })

    await expect(feedback).toContainText('Saved draft restored')
    await expect(environmentLabel).toBeVisible()

    const layout = await page.evaluate(() => {
      const feedbackElement = document.querySelector('[role="status"]')
      const setupElement = document.querySelector('[data-testid="drill-report-setup-ready"]')
      const environmentElement = [
        ...document.querySelectorAll('.mobile-setup-summary__label'),
      ].find((element) => element.textContent.trim() === 'Environment')
      const feedbackRect = feedbackElement.getBoundingClientRect()
      const setupRect = setupElement.getBoundingClientRect()
      const environmentStyle = getComputedStyle(environmentElement)
      return {
        feedbackGap: setupRect.top - feedbackRect.bottom,
        firstContentGap:
          setupElement.querySelector('.report-setup-grid').getBoundingClientRect().top -
          setupRect.top,
        environmentHeight: environmentElement.getBoundingClientRect().height,
        environmentLineHeight: Number.parseFloat(environmentStyle.lineHeight),
        environmentWhiteSpace: environmentStyle.whiteSpace,
      }
    })

    expect(layout.feedbackGap).toBeLessThanOrEqual(32)
    expect(layout.firstContentGap).toBeLessThanOrEqual(1)
    expect(layout.environmentHeight).toBeLessThanOrEqual(layout.environmentLineHeight * 1.25)
    expect(layout.environmentWhiteSpace).toBe('nowrap')
    await expectNoHorizontalOverflow(page)
  })
})
