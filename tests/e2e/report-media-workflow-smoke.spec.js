const { expect, test } = require('@playwright/test')
const { execFileSync } = require('node:child_process')
const { resolve } = require('node:path')
const { createSmokePng } = require('./support/smoke-image')
const {
  apiBaseUrl,
  apiJson,
  baseUrl,
  dismissIncidentalDialogs,
  installAppShellApiStubs,
  loginWithPage,
  personas,
} = require('./support/reporting-live-auth')

const runId = () =>
  new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, '')
    .slice(0, 14)

const backendDirectory = resolve(__dirname, '../../../vmecc-backend')

const purgeDatabaseArtifacts = ({ reportId = '', draftId = '' }) => {
  const args = ['artisan', 'reports:purge-media-e2e-artifacts']
  if (reportId) args.push(`--report-id=${reportId}`)
  if (draftId) args.push(`--draft-id=${draftId}`)
  if (args.length === 2) return
  execFileSync('php', args, { cwd: backendDirectory, stdio: 'pipe' })
}

const draftPayload = (moduleKey, id) => {
  const sharedAnalysis = {
    strengths: ['Prompt mobilisation'],
    resourcesMobilised: ['Rescue equipment'],
    improvementOpportunities: ['Retain the smoke-test evidence sequence'],
    photos: [],
  }
  if (moduleKey === 'erco') {
    return {
      schemaVersion: 1,
      submissionKey: `e2e-report-media-erco-${id}`,
      initialIncidentTime: '09:00',
      incidentDate: '2026-07-16',
      incidentTime: '09:00',
      weather: 'Clear',
      incidentType: 'Fire',
      location: ['Smoke Bay Alpha', 'Smoke Bay Bravo'],
      details: 'Authenticated ERCO media lifecycle smoke test.',
      detailsSource: 'manual',
      summary: 'ERCO evidence remained ordered through the report workflow.',
      respondingTeamName: 'Smoke Team',
      respondingTeamShift: 'day',
      respondingAttendance: [
        {
          memberId: 'media-e2e-responder',
          name: 'Smoke Responder',
          role: 'TRT',
          teamName: 'Smoke Team',
          present: true,
        },
      ],
      chronology: [{ id: 'erco-media-event', time: '09:00', action: 'Response started.' }],
      postIncidentAnalysis: sharedAnalysis,
      setupConfirmed: true,
      respondingTeamConfirmed: true,
      detailsConfirmed: true,
      savedAt: new Date().toISOString(),
    }
  }
  return {
    schemaVersion: 2,
    submissionKey: `e2e-report-media-drill-${id}`,
    reportDate: '2026-07-16',
    reportTime: '09:00',
    reportIssuanceDate: '2026-07-16',
    weather: 'Clear',
    incidentType: 'Fire Drill',
    exerciseCategories: ['Fire', 'Rescue'],
    location: 'Smoke Drill Yard',
    exerciseTitle: 'Authenticated media lifecycle exercise',
    details: 'A controlled exercise used to verify real report media integration.',
    exerciseObjectives: [{ id: 'media-objective', text: 'Verify report evidence durability' }],
    erpReferences: [{ id: 'media-erp', annexNumber: 'ERP-01', title: 'Major Fire' }],
    summary: 'Drill evidence remained ordered through the report workflow.',
    respondingTeamName: 'Smoke Team',
    respondingTeamShift: 'day',
    respondingAttendance: [
      {
        memberKey: 'media-e2e-commander',
        memberId: 'media-e2e-commander',
        name: 'Exercise Commander',
        role: 'Station Commander',
        exerciseRole: 'SC',
        teamName: 'Smoke Team',
        present: true,
        source: 'manual',
      },
    ],
    chronology: [{ id: 'drill-media-event', time: '09:00', action: 'Exercise started.' }],
    postIncidentAnalysis: sharedAnalysis,
    savedAt: new Date().toISOString(),
  }
}

const createDraft = async ({ request, csrfToken, moduleKey, payload }) => {
  const { response, body, text } = await apiJson(request, 'post', '/reports/drafts', csrfToken, {
    report_type: moduleKey,
    payload,
    title: `${moduleKey.toUpperCase()} authenticated media smoke`,
    origin_mode: 'new',
    create_new: true,
  })
  expect(response.status(), `Create ${moduleKey} media draft failed: ${text}`).toBe(201)
  expect(body.data?.draft_id).toBeTruthy()
  return body.data
}

const currentCsrfToken = async (request, fallback = '') => {
  const session = await request.get(`${apiBaseUrl}/auth/session`, {
    headers: { Accept: 'application/json' },
  })
  if (session.status() !== 200) return fallback
  return String((await session.json()).csrf_token || fallback)
}

const deleteDraft = async (request, csrfToken, draftId) => {
  if (!draftId) return
  await apiJson(
    request,
    'delete',
    `/reports/drafts/${encodeURIComponent(draftId)}`,
    await currentCsrfToken(request, csrfToken),
  )
}

const deleteReportAndMedia = async ({ request, csrfToken, reportId, mediaIds }) => {
  const activeCsrfToken = await currentCsrfToken(request, csrfToken)
  if (reportId) {
    const deleted = await apiJson(
      request,
      'delete',
      `/reports/${encodeURIComponent(reportId)}`,
      activeCsrfToken,
    )
    expect(deleted.response.status(), `Report cleanup failed: ${deleted.text}`).toBe(204)
  }
  for (const mediaId of mediaIds) {
    const deleted = await apiJson(
      request,
      'delete',
      `/report-media/${encodeURIComponent(mediaId)}`,
      activeCsrfToken,
    )
    expect(deleted.response.status(), `Media cleanup failed: ${deleted.text}`).toBe(204)
  }
}

const waitForSetup = async (page, moduleKey) => {
  await expect(page.locator('#root')).toBeVisible()
  await expect(page.getByTestId(`${moduleKey}-report-form`)).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText(/Unable to restore session/i)).toHaveCount(0)
}

const getPhotoInputs = (page, moduleKey) => {
  const section = page.getByRole('region', {
    name: moduleKey === 'drill' ? 'Exercise photographs' : 'Photographs',
  })
  return {
    upload: page.getByLabel(`Upload ${moduleKey} report photos`),
    descriptionOne: section.getByRole('textbox').nth(0),
    descriptionTwo: section.getByRole('textbox').nth(1),
  }
}

const runAuthenticatedMediaFlow = async (page, moduleKey) => {
  const id = runId()
  const csrfToken = await loginWithPage(page, personas.submitter)
  await installAppShellApiStubs(page)
  const failedResponses = []
  page.on('response', (response) => {
    if (response.status() >= 500)
      failedResponses.push({ status: response.status(), url: response.url() })
  })

  const draft = await createDraft({
    request: page.request,
    csrfToken,
    moduleKey,
    payload: draftPayload(moduleKey, id),
  })
  const mediaIds = []
  let reportId = ''

  try {
    const query = moduleKey === 'erco' ? `?draft=${encodeURIComponent(draft.draft_id)}` : ''
    await page.goto(`${baseUrl}/report/${moduleKey}/new/analysis${query}`, {
      waitUntil: 'domcontentloaded',
    })
    await dismissIncidentalDialogs(page)
    await waitForSetup(page, moduleKey)
    await expect(
      page
        .getByText(moduleKey === 'erco' ? 'Post Incident Analysis' : 'Post-Exercise Analysis', {
          exact: true,
        })
        .first(),
    ).toBeVisible()

    const photoInputs = getPhotoInputs(page, moduleKey)
    const uploadResponses = []
    const uploadListener = (response) => {
      const url = new URL(response.url())
      if (url.pathname.endsWith('/api/report-media') && response.request().method() === 'POST') {
        uploadResponses.push(response)
      }
    }
    page.on('response', uploadListener)
    await photoInputs.upload.setInputFiles([
      {
        name: `${moduleKey}-portrait-${moduleKey}.png`,
        mimeType: 'image/png',
        buffer: createSmokePng(`${moduleKey}-portrait`, { width: 32, height: 48 }),
      },
      {
        name: `${moduleKey}-landscape-${moduleKey}.png`,
        mimeType: 'image/png',
        buffer: createSmokePng(`${moduleKey}-landscape`, { width: 48, height: 32 }),
      },
    ])
    await expect.poll(() => uploadResponses.length, { timeout: 60_000 }).toBe(2)
    page.off('response', uploadListener)
    for (const response of uploadResponses) {
      expect([200, 201]).toContain(response.status())
      const body = await response.json()
      expect(body.data?.media_id).toBeTruthy()
      expect(body.data?.url).toBeTruthy()
      expect(body.data?.thumbnail_url).toBeTruthy()
      mediaIds.push(body.data.media_id)
    }

    const multilineDescription = `${moduleKey.toUpperCase()} command position\nPortrait evidence`
    await photoInputs.descriptionOne.fill(multilineDescription)
    await expect(photoInputs.descriptionTwo).toHaveValue('')

    const draftSaveResponse = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return moduleKey === 'erco'
        ? url.pathname.includes('/api/reports/drafts/') && response.request().method() === 'PUT'
        : url.pathname.endsWith('/api/reports/draft') && response.request().method() === 'POST'
    })
    await page.getByRole('button', { name: 'Save Draft', exact: true }).click()
    expect((await draftSaveResponse).status()).toBe(200)

    const storedDraft = await apiJson(
      page.request,
      'get',
      `/reports/drafts/${encodeURIComponent(draft.draft_id)}`,
      null,
    )
    expect(storedDraft.response.status(), storedDraft.text).toBe(200)
    const storedDraftPhotos = storedDraft.body.data?.payload?.postIncidentAnalysis?.photos || []
    expect(storedDraftPhotos.map((photo) => photo.mediaId)).toEqual(mediaIds)
    expect(storedDraftPhotos.map((photo) => String(photo.description || ''))).toEqual([
      multilineDescription,
      '',
    ])

    await page.reload({ waitUntil: 'domcontentloaded' })
    await dismissIncidentalDialogs(page)
    await waitForSetup(page, moduleKey)
    const reloadedInputs = getPhotoInputs(page, moduleKey)
    await expect(reloadedInputs.descriptionOne).toHaveValue(multilineDescription)
    await expect(reloadedInputs.descriptionTwo).toHaveValue('')

    await page.getByRole('button', { name: 'Review & Submit' }).click()
    await expect(page).toHaveURL(new RegExp(`/report/${moduleKey}/new/review`))
    await expect(page.getByText(multilineDescription)).toBeVisible()
    const thumbnailImages = page.locator('.report-photo-gallery__thumbnail')
    await expect(thumbnailImages).toHaveCount(2)
    expect(await thumbnailImages.nth(0).getAttribute('src')).toContain('variant=thumbnail')

    await page.getByRole('button', { name: new RegExp('^View photo 1:') }).click()
    const viewer = page.getByRole('dialog', { name: 'Photographs' })
    await expect(viewer).toBeVisible()
    const viewerImage = viewer.locator('.report-photo-viewer__image')
    await expect(viewerImage).toHaveAttribute(
      'src',
      new RegExp(`/api/report-media/${mediaIds[0]}$`),
    )
    await viewer.getByRole('button', { name: 'Next photo' }).click()
    await expect(viewerImage).toHaveAttribute(
      'src',
      new RegExp(`/api/report-media/${mediaIds[1]}$`),
    )
    await page.keyboard.press('Escape')
    await expect(viewer).toBeHidden()

    const reportResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return url.pathname.endsWith('/api/reports') && response.request().method() === 'POST'
    })
    await page.getByRole('button', { name: 'Confirm Submit', exact: true }).click()
    const reportResponse = await reportResponsePromise
    expect(reportResponse.status()).toBe(201)
    const reportBody = await reportResponse.json()
    reportId = String(reportBody.data?.id || '')
    expect(reportId).toBeTruthy()
    await expect(page).toHaveURL(new RegExp(`/report/${moduleKey}/?$`), { timeout: 30_000 })

    const storedReport = await apiJson(
      page.request,
      'get',
      `/reports/${encodeURIComponent(reportId)}`,
      null,
    )
    expect(storedReport.response.status(), storedReport.text).toBe(200)
    const storedPhotos = storedReport.body.data?.postIncidentAnalysis?.photos || []
    expect(storedPhotos.map((photo) => photo.mediaId)).toEqual(mediaIds)
    expect(storedPhotos.map((photo) => String(photo.description || ''))).toEqual([
      multilineDescription,
      '',
    ])
    if (moduleKey === 'erco') {
      expect(storedReport.body.data?.location).toBe('Smoke Bay Alpha | Smoke Bay Bravo')
    } else {
      expect(storedReport.body.data?.location).toBe('Smoke Drill Yard')
    }

    await page.goto(`${baseUrl}/report/${moduleKey}/${encodeURIComponent(reportId)}`, {
      waitUntil: 'domcontentloaded',
    })
    await dismissIncidentalDialogs(page)
    await expect(page.getByTestId(`${moduleKey}-report-detail`)).toBeAttached({ timeout: 30_000 })
    await expect(
      page.getByRole('heading', {
        name: `${moduleKey === 'erco' ? 'ERCO' : 'Drill'} Details`,
      }),
    ).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(multilineDescription)).toBeVisible()
    await page.getByRole('button', { name: new RegExp('^View photo 1:') }).click()
    const detailViewer = page.getByRole('dialog', { name: 'Photographs' })
    await expect(detailViewer.locator('.report-photo-viewer__image')).toHaveAttribute(
      'src',
      new RegExp(`/api/report-media/${mediaIds[0]}$`),
    )
    await page.keyboard.press('Escape')

    expect(
      failedResponses,
      `Unexpected server failures: ${JSON.stringify(failedResponses)}`,
    ).toEqual([])

    await deleteReportAndMedia({ request: page.request, csrfToken, reportId, mediaIds: [] })
    await deleteDraft(page.request, csrfToken, draft.draft_id)
    await deleteReportAndMedia({ request: page.request, csrfToken, reportId: '', mediaIds })
    purgeDatabaseArtifacts({ reportId, draftId: draft.draft_id })
    reportId = ''
    mediaIds.splice(0)
  } finally {
    await deleteDraft(page.request, csrfToken, draft.draft_id).catch(() => {})
    if (reportId) {
      await deleteReportAndMedia({
        request: page.request,
        csrfToken,
        reportId,
        mediaIds: [],
      }).catch(() => {})
    }
    if (mediaIds.length) {
      await deleteReportAndMedia({
        request: page.request,
        csrfToken,
        reportId: '',
        mediaIds,
      }).catch(() => {})
    }
    try {
      purgeDatabaseArtifacts({ reportId, draftId: draft.draft_id })
    } catch {
      // Preserve the primary browser assertion; cleanup failure remains visible in active smoke data.
    }
  }
}

test.describe('authenticated report media workflow', () => {
  test.describe.configure({ mode: 'serial' })

  test('ERCO persists ordered media from upload through record detail', async ({ page }) => {
    await runAuthenticatedMediaFlow(page, 'erco')
  })

  test('Drill persists ordered media when upload is enabled only for E2E', async ({ page }) => {
    await runAuthenticatedMediaFlow(page, 'drill')
  })
})
