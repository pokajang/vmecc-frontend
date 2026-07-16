const fs = require('node:fs')
const path = require('node:path')
const { createHash } = require('node:crypto')
const { createSmokePng } = require('./support/smoke-image')
const { spawnSync } = require('node:child_process')
const zlib = require('node:zlib')

const baseUrl = process.env.VMECC_E2E_BASE_URL || 'http://localhost:3000'
const apiBaseUrl = process.env.VMECC_E2E_API_URL || 'http://localhost:8000/api'
const smokeEmail = process.env.VMECC_SMOKE_EMAIL || 'codex.smoke.admin@vmecc.local'
const smokePassword = process.env.VMECC_SMOKE_PASSWORD || 'SmokeAdmin!2026'
const liveSmokeEnabled = process.env.VMECC_LIVE_SMOKE === '1'
const mutationSmokeEnabled = process.env.VMECC_LIVE_ALLOW_MUTATIONS === '1'
const runId = process.env.VMECC_SMOKE_RUN_ID || new Date().toISOString().replace(/[:.]/g, '-')
const runMarker = `LIVE-SMOKE-${runId}`
const artifactRoot = path.resolve(process.cwd(), 'test-results', 'live-inspection-smoke', runId)
const screenshotRoot = path.join(artifactRoot, 'screenshots')
const pdfRoot = path.join(artifactRoot, 'pdfs')
const routeTimeoutMs = Number(process.env.VMECC_SMOKE_ROUTE_TIMEOUT_MS || 30_000)
const allowUnsafeForeignWorkflow = process.env.VMECC_LIVE_ALLOW_FOREIGN_WORKFLOW === '1'

const isLoopbackHttpOrigin = (value) => {
  try {
    const url = new URL(value)
    return (
      url.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '::1'].includes(url.hostname.toLowerCase())
    )
  } catch {
    return false
  }
}

const localhostMutationTarget =
  mutationSmokeEnabled && isLoopbackHttpOrigin(baseUrl) && isLoopbackHttpOrigin(apiBaseUrl)

const viewportProfiles = [
  { key: 'desktop', width: 1366, height: 768 },
  { key: 'desktop-narrow', width: 1024, height: 768 },
  { key: 'tablet', width: 768, height: 1024 },
  { key: 'mobile', width: 390, height: 844 },
]

const implementedInspectionTypes = [
  'General Inspection',
  'Emergency Response Auxiliary Equipment',
  'Fire Extinguisher',
  'Fire Truck Daily Readiness',
  'High Angle Rescue Equipment',
  'Hydraulic Rescue Tools',
  'SCBA',
  'Health Safety Environment',
]

const expectedPdfImageCounts = {
  'General Inspection': 1,
  'Emergency Response Auxiliary Equipment': 2,
  'Fire Extinguisher': 1,
  'Fire Truck Daily Readiness': 2,
  'High Angle Rescue Equipment': 1,
  'Hydraulic Rescue Tools': 1,
  SCBA: 1,
  'Health Safety Environment': 1,
}

const MATRIX_STATUS = {
  PASS: 'pass',
  FAIL: 'fail',
  POLICY_BLOCKED: 'policy-blocked',
  INCONCLUSIVE: 'inconclusive',
}

const QAQC_BUCKET = {
  REPRODUCED_LIVE: 'Reproduced live',
  KNOWN_STILL_OBSERVED: 'Repo-known and still observed live',
  KNOWN_NOT_REPRODUCED: 'Repo-known but not reproduced',
  BLOCKED: 'Blocked/inconclusive',
}

const tinyPng = createSmokePng('inspection-live-smoke')

const text = (value) => String(value || '').trim()

const slug = (value) =>
  String(value || 'smoke')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 96) || 'smoke'

const inspectionTypeKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const normalizeSpace = (value) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim()

const boundedFireTruckPlateNo = (value = '') =>
  String(value || `${runMarker}-FRT`)
    .replace(/[^A-Za-z0-9-]/g, '')
    .slice(0, 40)

const normalizePdfComparable = (value) =>
  normalizeSpace(value)
    .replace(/[\u00ad\u200b-\u200d\ufeff]/g, '')
    .replace(/\s*-\s*/g, '-')
    .toLowerCase()

const compactPdfComparable = (value) => normalizePdfComparable(value).replace(/[\s-]+/g, '')

const localDateString = () =>
  new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: process.env.VMECC_SMOKE_TIMEZONE || 'Asia/Singapore',
  }).format(new Date())

const addDays = (isoDate, days) => {
  const value = new Date(`${isoDate}T00:00:00`)
  value.setDate(value.getDate() + Number(days || 0))
  return value.toISOString().slice(0, 10)
}

const reportDate = process.env.VMECC_SMOKE_REPORT_DATE || localDateString()

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let crc = index
  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
  }
  return crc >>> 0
})

const crc32 = (buffer) => {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

const pngChunk = (type, data = Buffer.alloc(0)) => {
  const typeBuffer = Buffer.from(type, 'ascii')
  const lengthBuffer = Buffer.alloc(4)
  lengthBuffer.writeUInt32BE(data.length, 0)
  const crcBuffer = Buffer.alloc(4)
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0)
  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer])
}

const smokePngDataUrl = (seed) => {
  const key = String(seed || 'smoke')
  let hash = 2166136261
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index)
    hash = Math.imul(hash, 16777619) >>> 0
  }

  const width = 48
  const height = 32
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const pixel = Buffer.from([hash & 0xff, (hash >>> 8) & 0xff, (hash >>> 16) & 0xff, 255])
  const scanlines = []
  for (let row = 0; row < height; row += 1) {
    scanlines.push(Buffer.from([0]))
    for (let column = 0; column < width; column += 1) {
      scanlines.push(pixel)
    }
  }
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(Buffer.concat(scanlines))),
    pngChunk('IEND'),
  ])
  return `data:image/png;base64,${png.toString('base64')}`
}

const smokePhoto = (name, description = 'Live smoke evidence photo') => ({
  id: `photo-${slug(name)}`,
  fileName: `${slug(name)}.png`,
  description,
  url: smokePngDataUrl(name),
})

const runBackendPhp = (script) => {
  const backendDir = path.resolve(process.cwd(), '..', 'vmecc-backend')
  const php = spawnSync('php', ['-r', script], {
    cwd: backendDir,
    encoding: 'utf8',
  })

  if (php.status !== 0) {
    throw new Error(`Backend PHP helper failed: ${php.stderr || php.stdout}`)
  }

  return php.stdout
}

const loadFrtReferenceRows = () => {
  const output = runBackendPhp(
    [
      "require 'vendor/autoload.php';",
      "echo json_encode(['daily' => App\\Support\\Inspection\\FrtDailyReference::dailyRows(), 'oneOff' => App\\Support\\Inspection\\FrtDailyReference::oneOffRows()]);",
    ].join(' '),
  )

  const parsed = JSON.parse(output)
  return {
    daily: parsed.daily.map((row) => ({
      ...row,
      status: row.rowKind === 'reading' ? '' : 'Checked',
      readingValue: row.rowKind === 'reading' ? '75' : '',
      remarks: '',
      photos: [],
    })),
    oneOff: parsed.oneOff.map((row) => ({
      ...row,
      condition: 'Good',
      remarks: '',
      photos: [],
    })),
  }
}

const pdfToolPath = (tool) => {
  const where = spawnSync('where.exe', [tool], { encoding: 'utf8' })
  if (where.status !== 0) return ''
  return text(where.stdout.split(/\r?\n/).find(Boolean))
}

const pdftoppmPath = pdfToolPath('pdftoppm')
const pdftotextPath = pdfToolPath('pdftotext')

const ensureArtifactDirectories = () => {
  fs.mkdirSync(artifactRoot, { recursive: true })
  fs.mkdirSync(screenshotRoot, { recursive: true })
  fs.mkdirSync(pdfRoot, { recursive: true })
}

const writeJsonArtifact = (name, payload) => {
  ensureArtifactDirectories()
  fs.writeFileSync(path.join(artifactRoot, name), JSON.stringify(payload, null, 2))
}

const writeTextArtifact = (name, content) => {
  ensureArtifactDirectories()
  fs.writeFileSync(path.join(artifactRoot, name), String(content || ''))
}

const parseJsonOrText = async (response) => {
  const textBody = await response.text()
  if (!textBody) return { body: null, text: '' }
  try {
    return { body: JSON.parse(textBody), text: textBody }
  } catch {
    return { body: null, text: textBody }
  }
}

const headersFor = (csrfToken = '', extra = {}) => ({
  Accept: 'application/json',
  ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
  ...extra,
})

const createLiveReport = () => ({
  runId,
  runMarker,
  startedAt: new Date().toISOString(),
  completedAt: null,
  liveSmokeEnabled,
  localhostMutationTarget,
  mutationSmokeEnabled,
  allowUnsafeForeignWorkflow,
  baseUrl,
  apiBaseUrl,
  smokeEmail,
  routeTimeoutMs,
  artifacts: {
    root: path.relative(process.cwd(), artifactRoot),
    screenshots: path.relative(process.cwd(), screenshotRoot),
    pdfs: path.relative(process.cwd(), pdfRoot),
  },
  endpointMatrix: [],
  apiLog: [],
  preflight: [],
  browser: {
    screenshots: [],
    pdfs: [],
    consoleErrors: [],
    pageErrors: [],
    failedResponses: [],
    viewportChecks: [],
  },
  forms: [],
  cleanupLedger: [],
  qaqcFindings: [],
  notes: [],
  _cleanupTasks: [],
})

const apiRequest = async (
  api,
  report,
  method,
  route,
  { csrfToken = '', data = undefined, multipart = undefined, note = '', extraHeaders = {} } = {},
) => {
  const normalizedMethod = method.toLowerCase()
  const headers = headersFor(csrfToken, extraHeaders)

  if (!multipart && !['get', 'head', 'options'].includes(normalizedMethod)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json'
  }

  try {
    const response = await api[normalizedMethod](`${apiBaseUrl}${route}`, {
      headers,
      ...(data !== undefined ? { data } : {}),
      ...(multipart !== undefined ? { multipart } : {}),
    })
    const { body, text: responseText } = await parseJsonOrText(response)
    const status = response.status()
    const entry = {
      at: new Date().toISOString(),
      method: normalizedMethod.toUpperCase(),
      route,
      status,
      note,
      ok: status >= 200 && status < 400,
      code: body?.code,
      message: body?.message || (responseText && responseText.length < 320 ? responseText : ''),
    }
    report.apiLog.push(entry)
    return {
      ok: true,
      status,
      body,
      text: responseText,
      headers: response.headers(),
      response,
      entry,
    }
  } catch (error) {
    const entry = {
      at: new Date().toISOString(),
      method: normalizedMethod.toUpperCase(),
      route,
      status: 0,
      note,
      ok: false,
      message: error?.message || String(error),
    }
    report.apiLog.push(entry)
    return {
      ok: false,
      status: 0,
      body: null,
      text: '',
      headers: {},
      response: null,
      error,
      entry,
    }
  }
}

const markMatrix = (report, payload) => {
  report.endpointMatrix.push({
    recordedAt: new Date().toISOString(),
    endpoint: payload.endpoint,
    formType: payload.formType || null,
    status: payload.status,
    httpStatus: payload.httpStatus ?? null,
    note: payload.note || '',
    evidence: Array.isArray(payload.evidence) ? payload.evidence : [],
    details: payload.details || null,
  })
}

const recordQaqcFinding = (report, payload) => {
  report.qaqcFindings.push({
    recordedAt: new Date().toISOString(),
    bucket: payload.bucket,
    category: payload.category,
    title: payload.title,
    detail: payload.detail || '',
    evidence: Array.isArray(payload.evidence) ? payload.evidence : [],
  })
}

const registerCleanupTask = (report, payload, task) => {
  const ledger = {
    recordedAt: new Date().toISOString(),
    status: 'pending',
    endpoint: payload.endpoint || '',
    objectType: payload.objectType || '',
    identifier: text(payload.identifier),
    formType: payload.formType || null,
    lastKnownState: payload.lastKnownState || null,
    notes: payload.notes || '',
  }
  report.cleanupLedger.push(ledger)
  report._cleanupTasks.push({
    ledger,
    task,
  })
  return ledger
}

const runCleanupTasks = async (report) => {
  for (const item of [...report._cleanupTasks].reverse()) {
    if (item.ledger.status === 'cleaned') continue
    try {
      await item.task()
      item.ledger.status = item.ledger.status === 'failed' ? 'failed' : 'cleaned'
      item.ledger.cleanedAt = new Date().toISOString()
    } catch (error) {
      item.ledger.status = 'failed'
      item.ledger.error = error?.message || String(error)
      item.ledger.cleanedAt = new Date().toISOString()
    }
  }
}

const login = async (api, report) => {
  const result = await apiRequest(api, report, 'post', '/auth/login', {
    note: 'live smoke login',
    data: {
      email: smokeEmail,
      password: smokePassword,
      remember: true,
    },
  })

  return {
    ...result,
    csrfToken: text(result.body?.csrf_token),
    user: result.body?.user || null,
  }
}

const waitForAppReady = async (page, expectedPath = null) => {
  const { expect } = require('@playwright/test')
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
      const bodyText = String(document.body?.innerText || '')
        .replace(/\s+/g, ' ')
        .trim()
      const spinnerVisible = Boolean(document.querySelector('.spinner-border, .spinner-grow'))
      const loadingOnly = bodyText.length <= 160 && /loading/i.test(bodyText)
      const restoringSession =
        bodyText.length <= 200 &&
        /^(?:restoring (?:camera session and saved form|session)|loading application)/i.test(
          bodyText,
        )
      const pendingMessage =
        /^(?:loading(?: application| page| records)?|restoring (?:camera session and saved form|session)|please wait|submitting report)(?:â€¦|…|\.\.\.)?$/i
      const visiblePendingState = Array.from(document.querySelectorAll('body *')).some(
        (element) => {
          if (!pendingMessage.test(String(element.textContent || '').trim())) return false
          const style = window.getComputedStyle(element)
          const rect = element.getBoundingClientRect()
          return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            Number(style.opacity || 1) !== 0 &&
            rect.width > 0 &&
            rect.height > 0
          )
        },
      )
      return (
        bodyText.length > 0 &&
        !spinnerVisible &&
        !loadingOnly &&
        !restoringSession &&
        !visiblePendingState
      )
    },
    null,
    { timeout: routeTimeoutMs },
  )
}

const loginInBrowser = async (page, report) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await waitForAppReady(page)

  const signInButton = page.getByRole('button', { name: 'Sign in' })
  if (!(await signInButton.isVisible().catch(() => false))) return

  await page.getByRole('textbox', { name: 'Email' }).fill(smokeEmail, { timeout: routeTimeoutMs })
  await page.getByRole('textbox', { name: 'Password' }).fill(smokePassword, {
    timeout: routeTimeoutMs,
  })
  await signInButton.click()
  await page.waitForURL(/\/dashboard(?:[/?#]|$)|\/inspection(?:[/?#]|$)/, {
    timeout: routeTimeoutMs,
  })
  await waitForAppReady(page)
  report.preflight.push({
    at: new Date().toISOString(),
    kind: 'browser-login',
    route: '/login',
    status: 'pass',
  })
}

const attachDiagnostics = (page, report, scope = 'browser') => {
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    report.browser.consoleErrors.push({
      at: new Date().toISOString(),
      scope,
      route: (() => {
        try {
          return new URL(page.url()).pathname
        } catch {
          return ''
        }
      })(),
      text: message.text(),
    })
  })

  page.on('pageerror', (error) => {
    report.browser.pageErrors.push({
      at: new Date().toISOString(),
      scope,
      route: (() => {
        try {
          return new URL(page.url()).pathname
        } catch {
          return ''
        }
      })(),
      message: error?.message || String(error),
    })
  })

  page.on('response', (response) => {
    if (response.status() < 400) return
    const url = response.url()
    if (/\.(css|js|png|jpg|jpeg|webp|gif|svg|woff2?)($|\?)/i.test(url)) return
    if (url.startsWith('data:') || url.startsWith('blob:')) return
    report.browser.failedResponses.push({
      at: new Date().toISOString(),
      scope,
      route: (() => {
        try {
          return new URL(page.url()).pathname
        } catch {
          return ''
        }
      })(),
      status: response.status(),
      url,
    })
  })
}

const saveScreenshot = async (page, testInfo, report, name) => {
  ensureArtifactDirectories()
  const fileName = `${slug(name)}.png`
  const artifactPath = path.join(screenshotRoot, fileName)
  const screenshot = await page.screenshot({ path: artifactPath, fullPage: true })
  if (testInfo) {
    await testInfo.attach(fileName, { body: screenshot, contentType: 'image/png' })
  }
  const relativePath = path.relative(process.cwd(), artifactPath)
  report.browser.screenshots.push(relativePath)
  return relativePath
}

const countPdfImageMarkers = (buffer) => {
  const pdfText = buffer.toString('latin1')
  const xobjectImages = pdfText.match(/\/Subtype\s*\/Image\b/gi) || []
  const inlineImages = pdfText.match(/\bBI\b[\s\S]{0,2000}?\bID\b[\s\S]{0,200000}?\bEI\b/g) || []
  return xobjectImages.length + inlineImages.length
}

const renderPdfFirstPage = (pdfPath, outputPrefix) => {
  if (!pdftoppmPath) {
    return { available: false, error: 'pdftoppm not found', imagePaths: [] }
  }

  const renderedPrefix = path.join(screenshotRoot, outputPrefix)
  const render = spawnSync(pdftoppmPath, ['-f', '1', '-l', '1', '-png', pdfPath, renderedPrefix], {
    encoding: 'utf8',
  })

  if (render.status !== 0) {
    return {
      available: false,
      error: render.stderr || render.stdout || 'pdftoppm failed',
      imagePaths: [],
    }
  }

  const firstPagePath = `${renderedPrefix}-1.png`
  return {
    available: fs.existsSync(firstPagePath),
    error: fs.existsSync(firstPagePath) ? '' : 'Rendered PNG not found',
    imagePaths: fs.existsSync(firstPagePath) ? [path.relative(process.cwd(), firstPagePath)] : [],
  }
}

const extractPdfText = (pdfPath, outputName) => {
  if (!pdftotextPath) {
    return { available: false, error: 'pdftotext not found', text: '', textPath: '' }
  }

  const txtPath = path.join(pdfRoot, `${outputName}.txt`)
  const result = spawnSync(pdftotextPath, ['-layout', pdfPath, txtPath], { encoding: 'utf8' })
  if (result.status !== 0) {
    return {
      available: false,
      error: result.stderr || result.stdout || 'pdftotext failed',
      text: '',
      textPath: '',
    }
  }

  const pdfText = fs.existsSync(txtPath) ? fs.readFileSync(txtPath, 'utf8') : ''
  return {
    available: fs.existsSync(txtPath),
    error: fs.existsSync(txtPath) ? '' : 'Rendered PDF text not found',
    text: pdfText,
    textPath: fs.existsSync(txtPath) ? path.relative(process.cwd(), txtPath) : '',
  }
}

const downloadInspectionPdf = async (
  api,
  report,
  csrfToken,
  reportUid,
  version,
  { formType = '', minImageCount = 0, expectedStatus = 200 } = {},
) => {
  const response = await apiRequest(api, report, 'post', '/reports/inspection/pdf', {
    csrfToken,
    note: `download inspection pdf ${reportUid}`,
    extraHeaders: {
      Accept: '*/*',
    },
    data: {
      report_uid: reportUid,
      ...(version ? { version } : {}),
    },
  })

  if (response.status !== expectedStatus || !response.response) {
    return {
      ...response,
      pdfPath: '',
      renderedPagePaths: [],
      textPath: '',
      pdfText: '',
      embeddedImageCount: 0,
    }
  }

  ensureArtifactDirectories()
  const body = await response.response.body()
  const reportHash = createHash('sha256')
    .update(String(reportUid || ''))
    .digest('hex')
    .slice(0, 12)
  const fileBase = `${slug(formType || reportUid).slice(0, 40)}-${reportHash}-v${version || 'latest'}`
  const pdfPath = path.join(pdfRoot, `${fileBase}.pdf`)
  fs.writeFileSync(pdfPath, body)
  const embeddedImageCount = countPdfImageMarkers(body)
  const rendered = renderPdfFirstPage(pdfPath, `${fileBase}-page`)
  const extractedText = extractPdfText(pdfPath, `${fileBase}`)
  const metadata = {
    reportUid,
    formType,
    version,
    bytes: body.length,
    embeddedImageCount,
    expectedMinImageCount: minImageCount,
    pdfPath: path.relative(process.cwd(), pdfPath),
    renderedPagePaths: rendered.imagePaths,
    textPath: extractedText.textPath,
    renderAvailable: rendered.available,
    renderError: rendered.error || '',
    textExtractAvailable: extractedText.available,
    textExtractError: extractedText.error || '',
  }
  report.browser.pdfs.push(metadata)
  return {
    ...response,
    pdfPath: metadata.pdfPath,
    renderedPagePaths: metadata.renderedPagePaths,
    textPath: metadata.textPath,
    pdfText: extractedText.text,
    embeddedImageCount,
    contentType: response.headers?.['content-type'] || '',
    metadata,
  }
}

const baseInspectionPayload = (inspectionType, suffix, overrides = {}) => ({
  incidentType: inspectionType,
  inspectionType,
  selectedLocation: overrides.selectedLocation || overrides.mainLocation || 'Smoke Location',
  mainLocation: overrides.mainLocation || overrides.selectedLocation || 'Smoke Location',
  subLocation: overrides.subLocation || '',
  location:
    overrides.location || overrides.mainLocation || overrides.selectedLocation || 'Smoke Location',
  reportDate,
  reportTime: '09:00',
  inspectedAt: `${reportDate}T09:00`,
  remarks: `${runMarker} remarks ${suffix}`,
  checklist: [
    {
      id: `live-smoke-${slug(inspectionType)}`,
      label: `${runMarker} ${inspectionType} checklist`,
      inspectionType,
      selected: true,
      selectedAt: `${reportDate}T09:00:00.000Z`,
    },
  ],
  ...overrides,
})

const hydraulicRow = (suffix, equipment = `${runMarker} Cutter ${suffix}`) => ({
  id: `live-smoke-hydraulic-${suffix}`,
  location: 'Smoke Bay',
  mainLocation: 'Smoke Bay',
  equipment,
  equipmentKey: slug(equipment),
  equipmentSource: 'custom',
  isCustomEquipment: true,
  physicalCondition: 'Defect',
  physicalConditionRemarks: `${runMarker} Hydraulic defect ${suffix}`,
  physicalConditionPhotos: [smokePhoto(`hydraulic-defect-${suffix}`)],
  mechanicalCondition: 'OK',
  noLeakage: 'OK',
  functionTest: 'OK',
  remarks: `${runMarker} Hydraulic row ${suffix}`,
})

const erAuxRow = (suffix, equipment = `${runMarker} Radio ${suffix}`) => ({
  id: `live-smoke-er-aux-${suffix}`,
  location: 'Office',
  mainLocation: 'Office',
  equipment,
  equipmentKey: slug(equipment),
  equipmentSource: 'custom',
  isCustomEquipment: true,
  quantity: '1',
  condition: 'Defect',
  defectRemarks: `${runMarker} ER Aux defect ${suffix}`,
  defectPhotos: [smokePhoto(`er-aux-defect-${suffix}`)],
  additionalNotes: `${runMarker} ER Aux notes ${suffix}`,
  photos: [smokePhoto(`er-aux-additional-${suffix}`)],
})

const fireExtinguisherRow = (suffix, catalogId = null, context = {}) => ({
  id: `live-smoke-fe-${suffix}`,
  catalogId,
  sourceRowNumber: `${runMarker}-${suffix}`.slice(0, 80),
  equipmentSource: 'custom',
  zone: context.fireExtinguisherZone || 'Smoke Zone',
  mainLocation: context.fireExtinguisherMainLocation || 'Smoke Yard',
  subLocation: context.fireExtinguisherSubLocation || 'Smoke Rack',
  location: context.fireExtinguisherMainLocation || 'Smoke Yard',
  idLocNo: `${runMarker}-LOC-${suffix}`.slice(0, 80),
  barcodeNo: `${runMarker}-BC-${suffix}`.slice(0, 80),
  feType: 'CO2',
  certificationValidity: addDays(reportDate, 365),
  physicalCondition: 'Not Good',
  physicalConditionRemarks: `${runMarker} FE physical defect ${suffix}`,
  physicalConditionPhotos: [smokePhoto(`fe-physical-${suffix}`)],
  signageCondition: 'Good',
  boxKeyAvailability: 'Yes',
  boxGlassAvailability: 'Yes',
  operationalCondition: 'Operational',
})

const highAngleRow = (suffix) => ({
  id: `live-smoke-high-angle-${suffix}`,
  rowNumber: `${runMarker}-1`,
  mainLocation: 'Response Kit #1',
  location: 'Response Kit #1',
  subLocation: 'Smoke Bag',
  equipment: `${runMarker} Locking Carabiner`,
  quantity: '1',
  condition: 'Not Good',
  conditionRemarks: `${runMarker} High Angle issue ${suffix}`,
  conditionPhotos: [smokePhoto(`high-angle-${suffix}`)],
})

const scbaBackPlateRow = (suffix) => ({
  id: `live-smoke-scba-back-${suffix}`,
  location: 'FRT',
  brand: 'MSA',
  serialNo: `${runMarker}-BP-${suffix}`.slice(0, 80),
  backPlateHarnessCondition: 'Good',
  highPressureHose: 'Not Good',
  highPressureHoseRemarks: `${runMarker} SCBA hose issue ${suffix}`,
  highPressureHosePhotos: [smokePhoto(`scba-hose-${suffix}`)],
  pressureGauge: 'Good',
  alarmDevice: 'Good',
  demandValve: 'Good',
  sealing: 'Good',
  cleanliness: 'Good',
})

const scbaCylinderRow = (suffix) => ({
  id: `live-smoke-scba-cylinder-${suffix}`,
  location: 'FRT',
  brand: 'MSA',
  serialNo: `${runMarker}-CY-${suffix}`.slice(0, 80),
  size: '6.8L',
  cylinderType: 'Composite',
  servicePressure: '300',
  containedPressure: '280',
  physicalCondition: 'Good',
  handwheelCondition: 'Good',
  valveBodyCondition: 'Good',
  screwPlugCondition: 'Good',
  cleanliness: 'Good',
})

const scbaFaceMaskRow = (suffix) => ({
  id: `live-smoke-scba-mask-${suffix}`,
  location: 'FRT',
  brand: 'MSA',
  serialNo: `${runMarker}-FM-${suffix}`.slice(0, 80),
  visorCondition: 'Good',
  ldvPort: 'Good',
  ldvReleaseButton: 'Good',
  leakTest: 'Good',
  speechDiaphragm: 'Good',
  harness: 'Good',
  neckStrap: 'Good',
})

const buildScbaCustomSection = ({ suffix, section, item }) => {
  if (!section || !item) return []
  const sectionKey = text(section.key || section.title || 'customScba-live')
  return [
    {
      id: sectionKey,
      key: sectionKey,
      title: section.title,
      shortLabel: section.shortLabel || section.title,
      catalogSectionId: section.catalogSectionId || section.id || '',
      fields: Array.isArray(section.fields) ? section.fields : [],
      rows: [
        {
          id: `${sectionKey}:${slug(item.mainLocation || 'frt')}:${slug(item.brand || 'msa')}:${slug(
            item.serialNo || suffix,
          )}`,
          catalogItemId: item.catalogItemId || item.id || '',
          catalogSectionId: section.catalogSectionId || section.id || '',
          location: item.mainLocation || item.location || 'FRT',
          mainLocation: item.mainLocation || item.location || 'FRT',
          brand: item.brand || 'MSA',
          serialNo: item.serialNo || `${runMarker}-SCBA-${suffix}`.slice(0, 80),
          equipmentDescription: item.equipmentDescription || `${runMarker} custom SCBA item`,
          photos: [smokePhoto(`scba-custom-general-${suffix}`)],
          ...(Array.isArray(section.fields) && section.fields[0]
            ? {
                [section.fields[0].key]: 'Not Good',
                [`${section.fields[0].key}Remarks`]: `${runMarker} ${section.fields[0].label} issue ${suffix}`,
                [`${section.fields[0].key}Photos`]: [smokePhoto(`scba-custom-${suffix}`)],
              }
            : {}),
        },
      ],
    },
  ]
}

const buildInspectionPayload = (inspectionType, suffix, context = {}) => {
  if (inspectionType === 'General Inspection') {
    return baseInspectionPayload(inspectionType, suffix, {
      selectedLocation: context.locationName || 'Smoke General Area',
      description: `${runMarker} General inspection description ${suffix}`,
      photos: [smokePhoto(`general-${suffix}`)],
    })
  }

  if (inspectionType === 'Emergency Response Auxiliary Equipment') {
    return baseInspectionPayload(inspectionType, suffix, {
      selectedLocation: context.erAuxLocationName || 'Office',
      mainLocation: context.erAuxLocationName || 'Office',
      erAuxInspectionDate: reportDate,
      erAuxChecks: [erAuxRow(suffix, context.erAuxEquipmentName)],
      erAuxRemarks: `${runMarker} ER Aux remarks ${suffix}`,
    })
  }

  if (inspectionType === 'Fire Extinguisher') {
    return baseInspectionPayload(inspectionType, suffix, {
      selectedLocation: context.fireExtinguisherMainLocation || 'Smoke Yard',
      mainLocation: context.fireExtinguisherMainLocation || 'Smoke Yard',
      subLocation: context.fireExtinguisherSubLocation || 'Smoke Rack',
      fireExtinguisherInspectionDate: reportDate,
      fireExtinguisherChecks: [fireExtinguisherRow(suffix, context.fireExtinguisherId, context)],
      fireExtinguisherRemarks: `${runMarker} FE remarks ${suffix}`,
    })
  }

  if (inspectionType === 'Fire Truck Daily Readiness') {
    const reference = loadFrtReferenceRows()
    const fireTruckPlateNo = boundedFireTruckPlateNo(context.fireTruckPlateNo)
    const dailyChecks = reference.daily.map((row) => ({ ...row }))
    const dailyIssue = dailyChecks.find((row) => row.rowKind !== 'reading')
    if (dailyIssue) {
      dailyIssue.status = 'Issue'
      dailyIssue.remarks = `${runMarker} FRT daily issue ${suffix}`
      dailyIssue.photos = [smokePhoto(`frt-daily-issue-${suffix}`)]
    }

    const oneOffChecks = reference.oneOff.map((row) => ({ ...row }))
    if (oneOffChecks[0]) {
      oneOffChecks[0].condition = 'Not Good'
      oneOffChecks[0].remarks = `${runMarker} FRT one-off issue ${suffix}`
      oneOffChecks[0].photos = [smokePhoto(`frt-one-off-issue-${suffix}`)]
    }

    return baseInspectionPayload(inspectionType, suffix, {
      selectedLocation: 'FIRE TRUCK',
      mainLocation: 'FIRE TRUCK',
      frtInspectionDate: reportDate,
      frtShift: 'Day',
      frtTruckId: context.fireTruckId || '',
      frtTruckPlateNo: fireTruckPlateNo,
      frtTruckReference: {
        plateNo: fireTruckPlateNo,
        roadTaxExpiry: addDays(reportDate, 365),
        insuranceExpiry: addDays(reportDate, 365),
        puspakomExpiry: addDays(reportDate, 365),
      },
      frtDailyChecks: dailyChecks,
      frtDailyRemarks: `${runMarker} FRT daily remarks ${suffix}`,
      frtOneOffChecks: oneOffChecks,
      frtOneOffRemarks: `${runMarker} FRT one-off remarks ${suffix}`,
    })
  }

  if (inspectionType === 'High Angle Rescue Equipment') {
    return baseInspectionPayload(inspectionType, suffix, {
      selectedLocation: 'Response Kit #1',
      mainLocation: 'Response Kit #1',
      highAngleInspectionDate: reportDate,
      highAngleChecks: [highAngleRow(suffix)],
      highAngleRemarks: `${runMarker} High Angle remarks ${suffix}`,
    })
  }

  if (inspectionType === 'Hydraulic Rescue Tools') {
    return baseInspectionPayload(inspectionType, suffix, {
      selectedLocation: context.hydraulicLocationName || 'Smoke Bay',
      mainLocation: context.hydraulicLocationName || 'Smoke Bay',
      hydraulicChecks: [hydraulicRow(suffix, context.hydraulicEquipmentName)],
      hydraulicEquipmentRows: [
        {
          equipment: context.hydraulicEquipmentName || `${runMarker} Cutter ${suffix}`,
          mainLocation: context.hydraulicLocationName || 'Smoke Bay',
          source: 'custom',
        },
      ],
      hydraulicRemarks: `${runMarker} Hydraulic remarks ${suffix}`,
    })
  }

  if (inspectionType === 'SCBA') {
    return baseInspectionPayload(inspectionType, suffix, {
      selectedLocation: context.scbaLocationName || 'FRT',
      mainLocation: context.scbaLocationName || 'FRT',
      scbaInspectionDate: reportDate,
      scbaBackPlateChecks: [scbaBackPlateRow(suffix)],
      scbaCylinderChecks: [scbaCylinderRow(suffix)],
      scbaFaceMaskChecks: [scbaFaceMaskRow(suffix)],
      scbaCustomSections: buildScbaCustomSection({
        suffix,
        section: context.scbaCustomSection,
        item: context.scbaCustomItem,
      }),
      scbaRemarks: `${runMarker} SCBA remarks ${suffix}`,
    })
  }

  if (inspectionType === 'Health Safety Environment') {
    return baseInspectionPayload(inspectionType, suffix, {
      selectedLocation: 'Smoke HSE Area',
      mainLocation: 'Smoke HSE Area',
      hseInspectionDate: reportDate,
      hseSelections: ['unsafeAct', 'environmental'],
      hseSeverity: 'Low',
      hseUnsafeActDetails: `${runMarker} HSE unsafe act details ${suffix}`,
      hseEnvironmentalDetails: `${runMarker} HSE environmental details ${suffix}`,
      hseImmediateAction: `${runMarker} area isolated.`,
      hseCorrectiveAction: `${runMarker} corrective action tracked.`,
      hseResponsiblePerson: 'Live Smoke Admin',
      hseTargetDate: addDays(reportDate, 7),
      hseRemarks: `${runMarker} HSE remarks ${suffix}`,
      photos: [smokePhoto(`hse-${suffix}`)],
    })
  }

  throw new Error(`Unsupported inspection type: ${inspectionType}`)
}

const createReportPayload = ({ inspectionType, suffix, context = {}, reportUid, displayId }) => ({
  report_uid: reportUid,
  submission_key: `live-smoke-submission-${runId}-${slug(inspectionType)}-${suffix}`,
  display_id: displayId,
  report_type: 'inspection',
  status: 'Submitted',
  remarks: `${runMarker} submitted ${inspectionType}`,
  payload: buildInspectionPayload(inspectionType, suffix, context),
})

const buildFormRecordSeed = (inspectionType, suffix, context = {}) => {
  const payload = buildInspectionPayload(inspectionType, suffix, context)
  return {
    payload,
    checklistLabel: text(payload.checklist?.[0]?.label),
  }
}

const pickFirstMatchingRow = (rows, predicate) =>
  (Array.isArray(rows) ? rows : []).find((row) => {
    try {
      return predicate(row)
    } catch {
      return false
    }
  }) || null

const findForeignActionableInspection = (rows, currentUserId) =>
  pickFirstMatchingRow(rows, (row) => {
    const ownerId = text(row?.ownerUserId || row?.owner_user_id)
    if (!ownerId || ownerId === text(currentUserId)) return false
    if (!allowUnsafeForeignWorkflow) {
      const rowIdentity = [row?.id, row?.displayId, row?.title, row?.description]
        .map(text)
        .join(' ')
      if (!rowIdentity.includes(runMarker)) return false
    }
    return row?.canReview === true || row?.canApprove === true || row?.canReject === true
  })

const buildPdfExpectedStrings = (inspectionType, payload = {}, context = {}) => {
  const common = [inspectionType, payload.selectedLocation || payload.mainLocation]
  if (inspectionType === 'General Inspection') {
    return common.concat([payload.description])
  }
  if (inspectionType === 'Emergency Response Auxiliary Equipment') {
    const row = payload.erAuxChecks?.[0] || {}
    return common.concat([row.equipment, row.defectRemarks])
  }
  if (inspectionType === 'Fire Extinguisher') {
    const row = payload.fireExtinguisherChecks?.[0] || {}
    return common.concat([row.idLocNo, row.barcodeNo, row.feType, row.physicalConditionRemarks])
  }
  if (inspectionType === 'Fire Truck Daily Readiness') {
    return common.concat([
      boundedFireTruckPlateNo(context.fireTruckPlateNo || payload.frtTruckPlateNo),
      payload.frtDailyRemarks,
    ])
  }
  if (inspectionType === 'High Angle Rescue Equipment') {
    const row = payload.highAngleChecks?.[0] || {}
    return common.concat([row.equipment, row.conditionRemarks])
  }
  if (inspectionType === 'Hydraulic Rescue Tools') {
    const row = payload.hydraulicChecks?.[0] || {}
    return common.concat([row.equipment, row.physicalConditionRemarks])
  }
  if (inspectionType === 'SCBA') {
    const row = payload.scbaBackPlateChecks?.[0] || {}
    const customSection = payload.scbaCustomSections?.[0] || {}
    const customRow = customSection.rows?.[0] || {}
    const firstField = customSection.fields?.[0] || {}
    return common.concat([
      row.serialNo,
      row.highPressureHoseRemarks,
      customSection.title,
      customRow.serialNo,
      customRow[`${firstField.key || ''}Remarks`] || '',
    ])
  }
  if (inspectionType === 'Health Safety Environment') {
    return common.concat([
      payload.hseSeverity,
      payload.hseUnsafeActDetails,
      payload.hseEnvironmentalDetails,
    ])
  }
  return common
}

const validatePdfExpectations = ({
  inspectionType,
  pdfText,
  expectedStrings = [],
  embeddedImageCount = 0,
  minImageCount = 0,
}) => {
  const normalizedPdfText = normalizePdfComparable(pdfText)
  const compactPdfText = compactPdfComparable(pdfText)
  const missingStrings = expectedStrings
    .map((value) => text(value))
    .filter(Boolean)
    .filter((value) => {
      const normalizedExpected = normalizePdfComparable(value)
      if (normalizedPdfText.includes(normalizedExpected)) return false
      const compactExpected = compactPdfComparable(value)
      if (compactExpected.length >= 8 && compactPdfText.includes(compactExpected)) return false

      // Poppler's layout extraction can interleave adjacent PDF columns inside a long
      // run marker. Preserve a meaningful form-specific assertion by matching the
      // marker-free tail when the full run-scoped string is split by column content.
      const markerFreeExpected = text(value)
        .replaceAll(runMarker, '')
        .replace(/^[-:\s]+/, '')
      const compactMarkerFreeExpected = compactPdfComparable(markerFreeExpected)
      if (
        compactMarkerFreeExpected.length >= 5 &&
        compactPdfText.includes(compactMarkerFreeExpected)
      ) {
        return false
      }

      const markerFreeTokens = normalizePdfComparable(markerFreeExpected)
        .match(/[a-z0-9]+/g)
        ?.filter((token) => token.length >= 3)
      return !(
        markerFreeTokens?.length > 0 &&
        markerFreeTokens.every((token) => compactPdfText.includes(token))
      )
    })

  return {
    ok: missingStrings.length === 0 && embeddedImageCount >= minImageCount,
    missingStrings,
    missingImages: Math.max(0, minImageCount - embeddedImageCount),
    inspectionType,
  }
}

const summarizeReport = (report) => {
  const matrixCounts = report.endpointMatrix.reduce((acc, entry) => {
    acc[entry.status] = (acc[entry.status] || 0) + 1
    return acc
  }, {})
  const cleanupCounts = report.cleanupLedger.reduce((acc, entry) => {
    acc[entry.status] = (acc[entry.status] || 0) + 1
    return acc
  }, {})
  return {
    runId: report.runId,
    runMarker: report.runMarker,
    startedAt: report.startedAt,
    completedAt: report.completedAt,
    baseUrl: report.baseUrl,
    apiBaseUrl: report.apiBaseUrl,
    matrixCounts,
    cleanupCounts,
    screenshotCount: report.browser.screenshots.length,
    pdfCount: report.browser.pdfs.length,
    consoleErrorCount: report.browser.consoleErrors.length,
    pageErrorCount: report.browser.pageErrors.length,
    failedResponseCount: report.browser.failedResponses.length,
    qaqcFindingCount: report.qaqcFindings.length,
    allowUnsafeForeignWorkflow,
    artifacts: {
      endpointMatrix: `${report.artifacts.root}/endpoint-matrix.json`,
      summary: `${report.artifacts.root}/summary.json`,
      cleanupLedger: `${report.artifacts.root}/cleanup-ledger.json`,
      qaqcReport: `${report.artifacts.root}/qaqc-report.md`,
    },
  }
}

const generateQaqcMarkdown = (report) => {
  const grouped = report.qaqcFindings.reduce((acc, finding) => {
    const bucket = finding.bucket || QAQC_BUCKET.BLOCKED
    if (!acc[bucket]) acc[bucket] = {}
    if (!acc[bucket][finding.category]) acc[bucket][finding.category] = []
    acc[bucket][finding.category].push(finding)
    return acc
  }, {})

  const lines = [
    '# Live Inspection Smoke QAQC Report',
    '',
    `Run ID: ${report.runId}`,
    `Run marker: ${report.runMarker}`,
    `Generated at: ${report.completedAt || new Date().toISOString()}`,
    `Base URL: ${report.baseUrl}`,
    `API URL: ${report.apiBaseUrl}`,
    '',
    '## Summary',
    '',
    `- Endpoint matrix rows: ${report.endpointMatrix.length}`,
    `- Screenshots: ${report.browser.screenshots.length}`,
    `- PDFs: ${report.browser.pdfs.length}`,
    `- Cleanup ledger rows: ${report.cleanupLedger.length}`,
    '',
  ]

  for (const bucket of [
    QAQC_BUCKET.REPRODUCED_LIVE,
    QAQC_BUCKET.KNOWN_STILL_OBSERVED,
    QAQC_BUCKET.KNOWN_NOT_REPRODUCED,
    QAQC_BUCKET.BLOCKED,
  ]) {
    lines.push(`## ${bucket}`, '')
    const categories = grouped[bucket] || {}
    const categoryNames = Object.keys(categories)
    if (categoryNames.length === 0) {
      lines.push('- None recorded.', '')
      continue
    }
    for (const category of categoryNames.sort()) {
      lines.push(`### ${category}`, '')
      for (const finding of categories[category]) {
        lines.push(`- ${finding.title}`)
        if (finding.detail) lines.push(`  Detail: ${finding.detail}`)
        if (finding.evidence?.length) lines.push(`  Evidence: ${finding.evidence.join(', ')}`)
      }
      lines.push('')
    }
  }

  lines.push('## Artifacts', '')
  lines.push(`- Endpoint matrix: \`${report.artifacts.root}/endpoint-matrix.json\``)
  lines.push(`- Summary: \`${report.artifacts.root}/summary.json\``)
  lines.push(`- Cleanup ledger: \`${report.artifacts.root}/cleanup-ledger.json\``)
  lines.push(`- Screenshots: \`${report.artifacts.screenshots}\``)
  lines.push(`- PDFs: \`${report.artifacts.pdfs}\``)
  lines.push('')

  return lines.join('\n')
}

module.exports = {
  QAQC_BUCKET,
  MATRIX_STATUS,
  addDays,
  allowUnsafeForeignWorkflow,
  apiBaseUrl,
  apiRequest,
  artifactRoot,
  attachDiagnostics,
  baseUrl,
  buildFormRecordSeed,
  buildInspectionPayload,
  buildPdfExpectedStrings,
  countPdfImageMarkers,
  createLiveReport,
  createReportPayload,
  downloadInspectionPdf,
  ensureArtifactDirectories,
  expectedPdfImageCounts,
  findForeignActionableInspection,
  implementedInspectionTypes,
  inspectionTypeKey,
  liveSmokeEnabled,
  localhostMutationTarget,
  loadFrtReferenceRows,
  login,
  loginInBrowser,
  markMatrix,
  normalizeSpace,
  pdfRoot,
  recordQaqcFinding,
  registerCleanupTask,
  reportDate,
  routeTimeoutMs,
  runCleanupTasks,
  runId,
  runMarker,
  saveScreenshot,
  screenshotRoot,
  slug,
  smokeEmail,
  smokePassword,
  summarizeReport,
  text,
  tinyPng,
  validatePdfExpectations,
  viewportProfiles,
  waitForAppReady,
  writeJsonArtifact,
  writeTextArtifact,
  generateQaqcMarkdown,
}
