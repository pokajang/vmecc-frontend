const { expect, test } = require('@playwright/test')
const fs = require('node:fs')
const path = require('node:path')
const { evidencePath } = require('./support/evidence-path')
const { spawnSync } = require('node:child_process')
const zlib = require('node:zlib')

const apiBaseUrl = process.env.VMECC_E2E_API_URL || 'http://localhost:8000/api'
const smokeEmail = process.env.VMECC_SMOKE_EMAIL || 'codex.smoke.sysadmin@vmecc.local'
const smokePassword = process.env.VMECC_SMOKE_PASSWORD || 'SmokeRole!2026'
const runId = process.env.VMECC_SMOKE_RUN_ID || new Date().toISOString().replace(/[:.]/g, '-')
const artifactRoot = evidencePath('inspection-crud-matrix', runId)
const routeTimeoutMs = Number(process.env.VMECC_SMOKE_ROUTE_TIMEOUT_MS || 30_000)
const lifecycleTimeoutMs = Number(process.env.VMECC_SMOKE_LIFECYCLE_TIMEOUT_MS || 20 * 60_000)

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
const requestedInspectionTypes = String(process.env.VMECC_SMOKE_INSPECTION_TYPES || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)
const inspectionTypesUnderTest = requestedInspectionTypes.length
  ? implementedInspectionTypes.filter((inspectionType) =>
      requestedInspectionTypes.some(
        (requested) => requested.toLowerCase() === inspectionType.toLowerCase(),
      ),
    )
  : implementedInspectionTypes
if (requestedInspectionTypes.length && inspectionTypesUnderTest.length === 0) {
  throw new Error(`No implemented inspection types matched: ${requestedInspectionTypes.join(', ')}`)
}

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

const inspectionTypeKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const slug = (value) =>
  String(value || 'smoke')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80) || 'smoke'

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

const ensureArtifactRoot = () => fs.mkdirSync(artifactRoot, { recursive: true })

const writeJsonArtifact = (name, payload) => {
  ensureArtifactRoot()
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

const headersFor = (csrfToken = '', extra = {}) => ({
  Accept: 'application/json',
  ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
  ...extra,
})

const apiRequest = async (
  api,
  report,
  method,
  route,
  { csrfToken = '', data = undefined, expected = [200], note = '', extraHeaders = {} } = {},
) => {
  const normalizedMethod = method.toLowerCase()
  const headers = headersFor(csrfToken, extraHeaders)
  if (!['get', 'head', 'options'].includes(normalizedMethod)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json'
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
    ok: expected.includes(status),
    note,
    message: body?.message || (text && text.length < 240 ? text : undefined),
    code: body?.code,
  })

  expect(
    expected,
    `${normalizedMethod.toUpperCase()} ${route} returned ${status}: ${text}`,
  ).toContain(status)

  return { response, body, text, status }
}

const login = async (api, report) => {
  let lastError
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const loginResponse = await apiRequest(api, report, 'post', '/auth/login', {
        data: {
          email: smokeEmail,
          password: smokePassword,
          remember: true,
        },
        expected: [200],
        note: 'login smoke admin',
      })
      const csrfToken = String(loginResponse.body?.csrf_token || '').trim()
      expect(csrfToken, 'Login response missing csrf_token').toBeTruthy()
      return csrfToken
    } catch (error) {
      lastError = error
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt))
        continue
      }
      throw lastError
    }
  }
  throw lastError
}

const safeLogin = async (api, report) => {
  try {
    return await login(api, report)
  } catch (error) {
    if (String(error.message || '').includes('returned 500')) {
      test.skip('Inspection CRUD smoke is blocked: API auth endpoint returned 500.')
    }
    throw error
  }
}

const loginInBrowser = async (page) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('#root')).toBeVisible({ timeout: routeTimeoutMs })

  const emailInput = page.getByRole('textbox', { name: 'Email' })
  const passwordInput = page.getByRole('textbox', { name: 'Password' })
  const signInButton = page.getByRole('button', { name: 'Sign in' })
  const authenticatedUrl = /\/dashboard(?:[/?#]|$)|\/inspection(?:[/?#]|$)/

  await Promise.race([
    signInButton.waitFor({ state: 'visible', timeout: routeTimeoutMs }),
    page.waitForURL(authenticatedUrl, { timeout: routeTimeoutMs }),
  ]).catch(() => {})
  if (!(await signInButton.isVisible().catch(() => false))) {
    await page.waitForURL(authenticatedUrl, {
      timeout: routeTimeoutMs,
    })
    return
  }

  await emailInput.fill(smokeEmail, { timeout: routeTimeoutMs })
  await passwordInput.fill(smokePassword, { timeout: routeTimeoutMs })
  await signInButton.click()

  await page.waitForURL(authenticatedUrl, {
    timeout: routeTimeoutMs,
  })
  await waitForAppReady(page)
}

const makeReport = () => ({
  run_id: runId,
  api_base_url: apiBaseUrl,
  api: [],
  reports: [],
  catalogs: [],
  pdfs: [],
  cleanup: [],
})

const smokePhoto = (name, description = 'Smoke evidence photo') => ({
  id: `photo-${slug(name)}`,
  fileName: `${slug(name)}.png`,
  description,
  url: smokePngDataUrl(name),
})

const baseInspectionPayload = (inspectionType, suffix, overrides = {}) => ({
  incidentType: inspectionType,
  inspectionType,
  selectedLocation: overrides.selectedLocation || overrides.mainLocation || 'Smoke Location',
  mainLocation: overrides.mainLocation || overrides.selectedLocation || 'Smoke Location',
  subLocation: overrides.subLocation || '',
  location:
    overrides.location || overrides.mainLocation || overrides.selectedLocation || 'Smoke Location',
  reportDate: '2026-07-03',
  reportTime: '09:00',
  remarks: `Smoke remarks ${suffix}`,
  checklist: [
    {
      id: `smoke-${slug(inspectionType)}`,
      label: `${inspectionType} smoke checklist`,
      inspectionType,
      selected: true,
      selectedAt: '2026-07-03T09:00:00.000Z',
    },
  ],
  ...overrides,
})

const hydraulicRow = (suffix, equipment = `Smoke Cutter ${suffix}`) => ({
  id: `smoke-hydraulic-${suffix}`,
  location: 'Smoke Bay',
  mainLocation: 'Smoke Bay',
  equipment,
  equipmentKey: slug(equipment),
  equipmentSource: 'custom',
  isCustomEquipment: true,
  physicalCondition: 'Defect',
  physicalConditionRemarks: `Hydraulic smoke defect ${suffix}`,
  physicalConditionPhotos: [smokePhoto(`hydraulic-defect-${suffix}`)],
  mechanicalCondition: 'OK',
  noLeakage: 'OK',
  functionTest: 'OK',
  remarks: `Hydraulic smoke row ${suffix}`,
})

const erAuxRow = (suffix, equipment = `Smoke Radio ${suffix}`) => ({
  id: `smoke-er-aux-${suffix}`,
  location: 'Office',
  mainLocation: 'Office',
  equipment,
  equipmentKey: slug(equipment),
  equipmentSource: 'custom',
  isCustomEquipment: true,
  quantity: '1',
  condition: 'Defect',
  defectRemarks: `ER Aux smoke defect ${suffix}`,
  defectPhotos: [smokePhoto(`er-aux-defect-${suffix}`)],
  additionalNotes: `ER Aux smoke notes ${suffix}`,
  photos: [smokePhoto(`er-aux-additional-${suffix}`)],
})

const fireExtinguisherRow = (suffix, catalogId = null) => ({
  id: `smoke-fe-${suffix}`,
  catalogId,
  sourceRowNumber: `SMOKE-${suffix}`,
  equipmentSource: 'custom',
  zone: 'Smoke Zone',
  mainLocation: 'Smoke Yard',
  subLocation: 'Smoke Rack',
  location: 'Smoke Yard',
  idLocNo: `SMOKE-LOC-${suffix}`,
  barcodeNo: `SMOKE-BC-${suffix}`,
  feType: 'CO2',
  certificationValidity: '2027-07-03',
  physicalCondition: 'Not Good',
  physicalConditionRemarks: `FE physical smoke defect ${suffix}`,
  physicalConditionPhotos: [smokePhoto(`fe-physical-${suffix}`)],
  signageCondition: 'Good',
  boxKeyAvailability: 'Yes',
  boxGlassAvailability: 'Yes',
  operationalCondition: 'Operational',
})

const highAngleRow = (suffix) => ({
  id: `smoke-high-angle-${suffix}`,
  rowNumber: 'SMOKE-1',
  mainLocation: 'Response Kit #1',
  location: 'Response Kit #1',
  subLocation: 'Smoke Bag',
  equipment: 'Smoke Locking Carabiner',
  quantity: '1',
  condition: 'Not Good',
  conditionRemarks: `High Angle smoke issue ${suffix}`,
  conditionPhotos: [smokePhoto(`high-angle-${suffix}`)],
})

const scbaBackPlateRow = (suffix) => ({
  id: `smoke-scba-back-${suffix}`,
  location: 'FRT',
  brand: 'MSA',
  serialNo: `SMOKE-BP-${suffix}`,
  backPlateHarnessCondition: 'Good',
  highPressureHose: 'Not Good',
  highPressureHoseRemarks: `SCBA hose smoke issue ${suffix}`,
  highPressureHosePhotos: [smokePhoto(`scba-hose-${suffix}`)],
  pressureGauge: 'Good',
  alarmDevice: 'Good',
  demandValve: 'Good',
  sealing: 'Good',
  cleanliness: 'Good',
})

const scbaCylinderRow = (suffix) => ({
  id: `smoke-scba-cylinder-${suffix}`,
  location: 'FRT',
  brand: 'MSA',
  serialNo: `SMOKE-CY-${suffix}`,
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
  id: `smoke-scba-mask-${suffix}`,
  location: 'FRT',
  brand: 'MSA',
  serialNo: `SMOKE-FM-${suffix}`,
  visorCondition: 'Good',
  ldvPort: 'Good',
  ldvReleaseButton: 'Good',
  leakTest: 'Good',
  speechDiaphragm: 'Good',
  harness: 'Good',
  neckStrap: 'Good',
})

const loadFrtReferenceRows = () => {
  const backendDir = path.resolve(process.cwd(), '..', 'vmecc-backend')
  const php = spawnSync(
    'php',
    [
      '-r',
      [
        "require 'vendor/autoload.php';",
        "echo json_encode(['daily' => App\\Support\\Inspection\\FrtDailyReference::dailyRows(), 'oneOff' => App\\Support\\Inspection\\FrtDailyReference::oneOffRows()]);",
      ].join(' '),
    ],
    { cwd: backendDir, encoding: 'utf8' },
  )

  if (php.status !== 0) {
    throw new Error(`Unable to load FRT reference rows: ${php.stderr || php.stdout}`)
  }

  const parsed = JSON.parse(php.stdout)
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

const runBackendPhp = (script, env = {}) => {
  const backendDir = path.resolve(process.cwd(), '..', 'vmecc-backend')
  const php = spawnSync('php', ['-r', script], {
    cwd: backendDir,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...env,
    },
  })

  if (php.status !== 0) {
    throw new Error(`Backend PHP helper failed: ${php.stderr || php.stdout}`)
  }

  return php.stdout
}

const createForeignOwnedInspectionReport = ({
  reportUid,
  displayId,
  payload,
  status = 'Submitted',
}) => {
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64')
  const output = runBackendPhp(
    [
      "require 'vendor/autoload.php';",
      "$app = require 'bootstrap/app.php';",
      "$app->loadEnvironmentFrom('.env.testing');",
      '$kernel = $app->make(Illuminate\\Contracts\\Console\\Kernel::class);',
      '$kernel->bootstrap();',
      "$database = (string) config('database.connections.'.config('database.default').'.database');",
      "if (!app()->environment('testing') || !str_ends_with($database, '_test')) { fwrite(STDERR, 'Refusing smoke fixture mutation outside a testing _test database.'); exit(2); }",
      "$payload = json_decode(base64_decode(getenv('SMOKE_REPORT_PAYLOAD_B64')), true);",
      "$status = getenv('SMOKE_REPORT_STATUS') ?: 'Submitted';",
      "$user = App\\Models\\User::withTrashed()->updateOrCreate(['email' => getenv('SMOKE_FOREIGN_EMAIL')], ['name' => 'Codex Smoke Foreign Owner', 'password' => Illuminate\\Support\\Facades\\Hash::make('SmokeForeign!2026'), 'email_verified_at' => now(), 'status' => 'Active']);",
      'if ($user->trashed()) { $user->restore(); }',
      "$report = App\\Models\\Report::query()->create(['report_uid' => getenv('SMOKE_REPORT_UID'), 'display_id' => getenv('SMOKE_DISPLAY_ID'), 'owner_user_id' => $user->id, 'report_type' => 'inspection', 'status' => $status, 'version' => 1, 'revision' => 1, 'payload' => $payload, 'inspection_checklist_item_ids' => ['foreign-owned-smoke'], 'inspection_checklist_item_labels' => ['Foreign owned smoke checklist'], 'inspection_has_checklist' => true, 'submitted_at' => now(), 'approved_at' => $status === 'Approved' ? now() : null]);",
      "echo json_encode(['user_id' => $user->id, 'report_uid' => $report->report_uid]);",
    ].join(' '),
    {
      SMOKE_REPORT_PAYLOAD_B64: encodedPayload,
      SMOKE_REPORT_UID: reportUid,
      SMOKE_DISPLAY_ID: displayId,
      SMOKE_REPORT_STATUS: status,
      SMOKE_FOREIGN_EMAIL: 'codex.smoke.foreign.owner@vmecc.local',
    },
  )

  return JSON.parse(output)
}

const deleteForeignOwnedInspectionReport = (reportUid) => {
  if (!reportUid) return
  runBackendPhp(
    [
      "require 'vendor/autoload.php';",
      "$app = require 'bootstrap/app.php';",
      "$app->loadEnvironmentFrom('.env.testing');",
      '$kernel = $app->make(Illuminate\\Contracts\\Console\\Kernel::class);',
      '$kernel->bootstrap();',
      "$database = (string) config('database.connections.'.config('database.default').'.database');",
      "if (!app()->environment('testing') || !str_ends_with($database, '_test')) { fwrite(STDERR, 'Refusing smoke fixture mutation outside a testing _test database.'); exit(2); }",
      "App\\Models\\Report::withTrashed()->where('report_uid', getenv('SMOKE_REPORT_UID'))->forceDelete();",
    ].join(' '),
    { SMOKE_REPORT_UID: reportUid },
  )
}

const waitForAppReady = async (page, expectedPath = null) => {
  await expect(page.locator('#root')).toBeVisible()
  if (expectedPath) {
    await page.waitForFunction(
      ({ expectedPath }) => {
        const current = new URL(window.location.href).pathname.replace(/\/+$/g, '') || '/'
        return current === expectedPath || current.startsWith(`${expectedPath}/`)
      },
      { expectedPath },
    )
  }
  await page.waitForFunction(() => {
    const text = String(document.body?.innerText || '').trim()
    const spinnerVisible = Boolean(document.querySelector('.spinner-border, .spinner-grow'))
    return text.length > 0 && !spinnerVisible && !/restoring session/i.test(text)
  })
}

const buildInspectionPayload = (inspectionType, suffix, context = {}) => {
  if (inspectionType === 'General Inspection') {
    return baseInspectionPayload(inspectionType, suffix, {
      selectedLocation: context.locationName || 'Smoke General Area',
      description: `General inspection smoke description ${suffix}`,
      photos: [smokePhoto(`general-${suffix}`)],
    })
  }

  if (inspectionType === 'Emergency Response Auxiliary Equipment') {
    return baseInspectionPayload(inspectionType, suffix, {
      selectedLocation: 'Office',
      mainLocation: 'Office',
      erAuxInspectionDate: '2026-07-03',
      erAuxChecks: [erAuxRow(suffix, context.erAuxEquipmentName)],
      erAuxRemarks: `ER Aux smoke remarks ${suffix}`,
    })
  }

  if (inspectionType === 'Fire Extinguisher') {
    return baseInspectionPayload(inspectionType, suffix, {
      selectedLocation: 'Smoke Yard',
      mainLocation: 'Smoke Yard',
      subLocation: 'Smoke Rack',
      fireExtinguisherInspectionDate: '2026-07-03',
      fireExtinguisherChecks: [fireExtinguisherRow(suffix, context.fireExtinguisherId)],
      fireExtinguisherRemarks: `FE smoke remarks ${suffix}`,
    })
  }

  if (inspectionType === 'Fire Truck Daily Readiness') {
    const reference = loadFrtReferenceRows()
    const dailyChecks = reference.daily.map((row) => ({ ...row }))
    const dailyIssue = dailyChecks.find((row) => row.rowKind !== 'reading')
    if (dailyIssue) {
      dailyIssue.status = 'Issue'
      dailyIssue.remarks = `FRT daily issue smoke evidence ${suffix}`
      dailyIssue.photos = [smokePhoto(`frt-daily-issue-${suffix}`)]
    }
    const oneOffChecks = reference.oneOff.map((row) => ({ ...row }))
    const oneOffIssue = oneOffChecks[0]
    if (oneOffIssue) {
      oneOffIssue.condition = 'Not Good'
      oneOffIssue.remarks = `FRT one-off issue smoke evidence ${suffix}`
      oneOffIssue.photos = [smokePhoto(`frt-one-off-issue-${suffix}`)]
    }
    return baseInspectionPayload(inspectionType, suffix, {
      selectedLocation: 'FIRE TRUCK',
      mainLocation: 'FIRE TRUCK',
      frtInspectionDate: '2026-07-03',
      frtShift: 'Day',
      frtTruckId: context.fireTruckId || '',
      frtTruckPlateNo: context.fireTruckPlateNo || 'SMOKE-FRT',
      frtTruckReference: {
        plateNo: context.fireTruckPlateNo || 'SMOKE-FRT',
        roadTaxExpiry: '2027-07-03',
        insuranceExpiry: '2027-07-03',
        puspakomExpiry: '2027-07-03',
      },
      frtDailyChecks: dailyChecks,
      frtDailyRemarks: `FRT daily smoke remarks ${suffix}`,
      frtOneOffChecks: oneOffChecks,
      frtOneOffRemarks: `FRT one-off smoke remarks ${suffix}`,
    })
  }

  if (inspectionType === 'High Angle Rescue Equipment') {
    return baseInspectionPayload(inspectionType, suffix, {
      selectedLocation: 'Response Kit #1',
      mainLocation: 'Response Kit #1',
      highAngleInspectionDate: '2026-07-03',
      highAngleChecks: [highAngleRow(suffix)],
      highAngleRemarks: `High Angle smoke remarks ${suffix}`,
    })
  }

  if (inspectionType === 'Hydraulic Rescue Tools') {
    return baseInspectionPayload(inspectionType, suffix, {
      selectedLocation: 'Smoke Bay',
      mainLocation: 'Smoke Bay',
      hydraulicChecks: [hydraulicRow(suffix, context.hydraulicEquipmentName)],
      hydraulicEquipmentRows: [
        {
          equipment: context.hydraulicEquipmentName || `Smoke Cutter ${suffix}`,
          mainLocation: 'Smoke Bay',
          source: 'custom',
        },
      ],
      hydraulicRemarks: `Hydraulic smoke remarks ${suffix}`,
    })
  }

  if (inspectionType === 'SCBA') {
    return baseInspectionPayload(inspectionType, suffix, {
      selectedLocation: 'FRT',
      mainLocation: 'FRT',
      scbaInspectionDate: '2026-07-03',
      scbaBackPlateChecks: [scbaBackPlateRow(suffix)],
      scbaCylinderChecks: [scbaCylinderRow(suffix)],
      scbaFaceMaskChecks: [scbaFaceMaskRow(suffix)],
      scbaRemarks: `SCBA smoke remarks ${suffix}`,
    })
  }

  if (inspectionType === 'Health Safety Environment') {
    return baseInspectionPayload(inspectionType, suffix, {
      incidentType: 'Health Safety Environment Inspection',
      inspectionType: 'Health Safety Environment Inspection',
      hsePayloadVersion: 2,
      selectedLocation: 'Smoke HSE Area',
      mainLocation: 'Smoke HSE Area',
      inspectedAt: '2026-07-03T09:00:00+08:00',
      hseInspectionDate: '2026-07-03',
      hseSelections: ['unsafeAct'],
      hseUnsafeActDetails: `HSE unsafe act smoke details ${suffix}`,
      hseImmediateAction: 'Area isolated for smoke validation.',
      photos: [smokePhoto(`hse-${suffix}`)],
    })
  }

  throw new Error(`Unsupported inspection type: ${inspectionType}`)
}

const createReportPayload = ({ inspectionType, suffix, context = {}, reportUid, displayId }) => ({
  report_uid: reportUid,
  submission_key: `smoke-submission-${runId}-${slug(inspectionType)}-${suffix}`,
  display_id: displayId,
  report_type: 'inspection',
  status: 'Submitted',
  remarks: `Smoke submitted ${inspectionType}`,
  payload: buildInspectionPayload(inspectionType, suffix, context),
})

const cleanupRoute = async (api, report, csrfToken, method, route) => {
  try {
    const response = await api[method](`${apiBaseUrl}${route}`, {
      headers: headersFor(csrfToken, {
        'Content-Type': 'application/json',
      }),
    })
    report.cleanup.push({
      method: method.toUpperCase(),
      route,
      status: response.status(),
      ok: [200, 204, 404].includes(response.status()),
    })
  } catch (error) {
    report.cleanup.push({
      method: method.toUpperCase(),
      route,
      error: error?.message || String(error),
      ok: false,
    })
  }
}

const deleteReport = (api, report, csrfToken, reportUid) =>
  reportUid
    ? cleanupRoute(api, report, csrfToken, 'delete', `/reports/${encodeURIComponent(reportUid)}`)
    : Promise.resolve()

const pdfFilenameFromDisposition = (contentDisposition, reportUid, version) => {
  const match = String(contentDisposition || '').match(/filename="?([^";]+)"?/i)
  const filename = match?.[1] || `${reportUid || 'inspection-report'}-v${version || 'latest'}.pdf`
  return filename.replace(/[<>:"/\\|?*\x00-\x1f]+/g, '-')
}

const countPdfImageMarkers = (buffer) => {
  const pdfText = buffer.toString('latin1')
  const xobjectImages = pdfText.match(/\/Subtype\s*\/Image\b/gi) || []
  const inlineImages = pdfText.match(/\bBI\b[\s\S]{0,2000}?\bID\b[\s\S]{0,200000}?\bEI\b/g) || []
  return xobjectImages.length + inlineImages.length
}

const downloadPdf = async (
  api,
  report,
  csrfToken,
  reportUid,
  version,
  expected = [200],
  { minImageCount = 0 } = {},
) => {
  const response = await api.post(`${apiBaseUrl}/reports/inspection/pdf`, {
    headers: headersFor(csrfToken, {
      Accept: '*/*',
      'Content-Type': 'application/json',
    }),
    data: {
      report_uid: reportUid,
      ...(version ? { version } : {}),
    },
  })

  const status = response.status()
  report.api.push({
    method: 'POST',
    route: '/reports/inspection/pdf',
    status,
    ok: expected.includes(status),
    note: `download ${reportUid}`,
  })
  expect(expected, `PDF download returned ${status}`).toContain(status)

  if (status === 200) {
    const headers = response.headers()
    const body = await response.body()
    expect(headers['content-type']).toContain('application/pdf')
    expect(headers['content-disposition']).toMatch(/\.pdf/i)
    expect(body.length, 'PDF response body is empty').toBeGreaterThan(0)
    const embeddedImageCount = countPdfImageMarkers(body)
    expect(
      embeddedImageCount,
      `Expected at least ${minImageCount} embedded image(s) in ${reportUid}`,
    ).toBeGreaterThanOrEqual(minImageCount)
    ensureArtifactRoot()
    const pdfFilename = pdfFilenameFromDisposition(
      headers['content-disposition'],
      reportUid,
      version,
    )
    const pdfPath = path.join(
      artifactRoot,
      `${slug(reportUid)}-v${version || 'latest'}-${pdfFilename}`,
    )
    fs.writeFileSync(pdfPath, body)
    const pdfMetadata = {
      report_uid: reportUid,
      requested_version: version,
      rendered_version: headers['x-report-version'] || '',
      bytes: body.length,
      embedded_image_count: embeddedImageCount,
      path: path.relative(process.cwd(), pdfPath),
      content_disposition: headers['content-disposition'],
    }
    report.pdfs.push(pdfMetadata)
    return pdfMetadata
  }
  return null
}

const expectDeletedFromList = async (api, report, route, deletedValue) => {
  const { body } = await apiRequest(api, report, 'get', route, {
    expected: [200],
    note: `verify deleted ${deletedValue}`,
  })
  const rows = Array.isArray(body?.data) ? body.data : []
  expect(
    rows.map((row) => String(row.id || row.value || row.title || row.plateNo || '')),
  ).not.toContain(String(deletedValue))
}

test.describe.serial('inspection CRUD endpoint matrix smoke', () => {
  test('covers inspection catalog CRUD endpoints and CSRF enforcement', async ({ request }) => {
    test.setTimeout(4 * 60_000)

    const api = request
    const report = makeReport()
    const suffix = slug(String(Date.now()).slice(-8))
    let csrfToken = ''
    const cleanup = []

    try {
      csrfToken = await safeLogin(api, report)

      await apiRequest(api, report, 'post', '/inspection/fire-trucks', {
        data: { plateNo: `NO-CSRF-${suffix}` },
        expected: [419],
        note: 'unsafe inspection write without csrf is blocked',
      })

      await apiRequest(api, report, 'post', '/inspection/fire-trucks', {
        csrfToken: 'invalid-token',
        data: { plateNo: `BAD-CSRF-${suffix}` },
        expected: [419],
        note: 'unsafe inspection write with invalid csrf is blocked',
      })

      for (const inspectionType of implementedInspectionTypes) {
        const typeKey = inspectionTypeKey(inspectionType)
        await apiRequest(
          api,
          report,
          'get',
          `/inspection/location-options?inspectionType=${encodeURIComponent(
            inspectionType,
          )}&inspectionTypeKey=${encodeURIComponent(typeKey)}`,
          { expected: [200], note: `list location catalog for ${inspectionType}` },
        )
      }

      const locationType = 'Hydraulic Rescue Tools'
      const locationName = `Smoke Main ${suffix}`
      const locationUpdateName = `Smoke Main Updated ${suffix}`
      const subLocationName = `Smoke Sub ${suffix}`
      const locationCreate = await apiRequest(api, report, 'post', '/inspection/locations', {
        csrfToken,
        expected: [201],
        note: 'create location',
        data: {
          inspectionType: locationType,
          inspectionTypeKey: inspectionTypeKey(locationType),
          name: locationName,
          description: 'Smoke location create',
          iconKey: 'MapPin',
        },
      })
      const locationId = locationCreate.body?.data?.id
      cleanup.unshift(`/inspection/locations/${locationId}`)
      expect(locationId).toBeTruthy()

      await apiRequest(api, report, 'post', '/inspection/locations', {
        csrfToken,
        expected: [422],
        note: 'duplicate location rejected',
        data: {
          inspectionType: locationType,
          inspectionTypeKey: inspectionTypeKey(locationType),
          name: locationName,
        },
      })

      await apiRequest(api, report, 'patch', `/inspection/locations/${locationId}`, {
        csrfToken,
        expected: [200],
        note: 'update location',
        data: {
          name: locationUpdateName,
          description: 'Smoke location update',
          iconKey: 'MapPin',
        },
      })

      const subLocationCreate = await apiRequest(api, report, 'post', '/inspection/locations', {
        csrfToken,
        expected: [201],
        note: 'create sub-location',
        data: {
          inspectionType: locationType,
          inspectionTypeKey: inspectionTypeKey(locationType),
          parentId: locationId,
          name: subLocationName,
          description: 'Smoke sub-location create',
        },
      })
      const subLocationId = subLocationCreate.body?.data?.id
      cleanup.unshift(`/inspection/locations/${subLocationId}`)
      expect(subLocationId).toBeTruthy()

      await apiRequest(api, report, 'delete', `/inspection/locations/${subLocationId}`, {
        csrfToken,
        expected: [204],
        note: 'delete sub-location',
      })
      cleanup.shift()

      const equipmentType = 'Hydraulic Rescue Tools'
      const equipmentName = `Smoke Cutter ${suffix}`
      const equipmentUpdateName = `Smoke Ram ${suffix}`
      await apiRequest(
        api,
        report,
        'get',
        `/inspection/equipment-options?inspectionType=${encodeURIComponent(
          equipmentType,
        )}&inspectionTypeKey=${encodeURIComponent(inspectionTypeKey(equipmentType))}`,
        { expected: [200], note: 'list hydraulic equipment catalog' },
      )

      const equipmentCreate = await apiRequest(api, report, 'post', '/inspection/equipment', {
        csrfToken,
        expected: [201],
        note: 'create equipment',
        data: {
          inspectionType: equipmentType,
          inspectionTypeKey: inspectionTypeKey(equipmentType),
          mainLocationId: locationId,
          mainLocation: locationUpdateName,
          name: equipmentName,
          description: 'Smoke equipment create',
        },
      })
      const equipmentId = equipmentCreate.body?.data?.id
      cleanup.unshift(`/inspection/equipment/${equipmentId}`)
      expect(equipmentId).toBeTruthy()

      await apiRequest(api, report, 'post', '/inspection/equipment', {
        csrfToken,
        expected: [422],
        note: 'duplicate equipment rejected',
        data: {
          inspectionType: equipmentType,
          inspectionTypeKey: inspectionTypeKey(equipmentType),
          mainLocationId: locationId,
          mainLocation: locationUpdateName,
          name: equipmentName,
        },
      })

      await apiRequest(api, report, 'patch', `/inspection/equipment/${equipmentId}`, {
        csrfToken,
        expected: [200],
        note: 'update equipment',
        data: {
          name: equipmentUpdateName,
          description: 'Smoke equipment update',
        },
      })

      await apiRequest(api, report, 'get', '/inspection/fire-extinguishers?search=SMOKE', {
        expected: [200],
        note: 'list fire extinguisher catalog',
      })
      const siteZoneName = `Smoke Zone ${suffix}`
      const siteAreaName = `Smoke Yard ${suffix}`
      const siteLocationName = `Smoke Rack ${suffix}`
      const siteZoneCreate = await apiRequest(api, report, 'post', '/inspection/site-locations', {
        csrfToken,
        expected: [201],
        note: 'create fire extinguisher site zone',
        data: {
          level: 'zone',
          name: siteZoneName,
        },
      })
      const siteZoneId = siteZoneCreate.body?.data?.id
      cleanup.unshift(`/inspection/site-locations/${siteZoneId}`)
      expect(siteZoneId).toBeTruthy()

      const siteAreaCreate = await apiRequest(api, report, 'post', '/inspection/site-locations', {
        csrfToken,
        expected: [201],
        note: 'create fire extinguisher site area',
        data: {
          level: 'area',
          parentId: siteZoneId,
          name: siteAreaName,
        },
      })
      const siteAreaId = siteAreaCreate.body?.data?.id
      expect(siteAreaId).toBeTruthy()

      const siteLocationCreate = await apiRequest(
        api,
        report,
        'post',
        '/inspection/site-locations',
        {
          csrfToken,
          expected: [201],
          note: 'create fire extinguisher site location',
          data: {
            level: 'location',
            parentId: siteAreaId,
            name: siteLocationName,
          },
        },
      )
      const siteLocationId = siteLocationCreate.body?.data?.id
      expect(siteLocationId).toBeTruthy()

      const extinguisherCreate = await apiRequest(
        api,
        report,
        'post',
        '/inspection/fire-extinguishers',
        {
          csrfToken,
          expected: [201],
          note: 'create fire extinguisher catalog row',
          data: {
            zone: siteZoneName,
            zoneId: siteZoneId,
            mainLocation: siteAreaName,
            mainLocationId: siteAreaId,
            subLocation: siteLocationName,
            subLocationId: siteLocationId,
            idLocNo: `SMOKE-LOC-${suffix}`,
            barcodeNo: `SMOKE-BC-${suffix}`,
            feType: 'CO2',
            certificationValidity: '2027-07-03',
          },
        },
      )
      const extinguisherId = extinguisherCreate.body?.data?.id
      cleanup.unshift(`/inspection/fire-extinguishers/${extinguisherId}`)
      expect(extinguisherId).toBeTruthy()

      await apiRequest(api, report, 'patch', `/inspection/fire-extinguishers/${extinguisherId}`, {
        csrfToken,
        expected: [200],
        note: 'update fire extinguisher catalog row',
        data: {
          zone: siteZoneName,
          zoneId: siteZoneId,
          mainLocation: siteAreaName,
          mainLocationId: siteAreaId,
          subLocation: siteLocationName,
          subLocationId: siteLocationId,
          idLocNo: `SMOKE-LOC-UPD-${suffix}`,
          barcodeNo: `SMOKE-BC-${suffix}`,
          feType: 'ABC',
          certificationValidity: '2028-07-03',
        },
      })

      await apiRequest(api, report, 'get', '/inspection/fire-trucks', {
        expected: [200],
        note: 'list fire truck catalog',
      })
      const truckPlate = `SMK${suffix}`
        .replace(/[^A-Za-z0-9]/g, '')
        .slice(0, 12)
        .toUpperCase()
      const truckCreate = await apiRequest(api, report, 'post', '/inspection/fire-trucks', {
        csrfToken,
        expected: [201],
        note: 'create fire truck catalog row',
        data: {
          plateNo: truckPlate,
          name: 'Smoke FRT',
          roadTaxExpiry: '2027-07-03',
          insuranceExpiry: '2027-07-03',
          puspakomExpiry: '2027-07-03',
        },
      })
      const truckId = truckCreate.body?.data?.id
      cleanup.unshift(`/inspection/fire-trucks/${truckId}`)
      expect(truckId).toBeTruthy()

      await apiRequest(api, report, 'post', '/inspection/fire-trucks', {
        csrfToken,
        expected: [422],
        note: 'duplicate fire truck rejected',
        data: {
          plateNo: truckPlate,
          name: 'Smoke FRT Duplicate',
        },
      })

      await apiRequest(api, report, 'patch', `/inspection/fire-trucks/${truckId}`, {
        csrfToken,
        expected: [200],
        note: 'update fire truck catalog row',
        data: {
          plateNo: truckPlate,
          name: 'Smoke FRT Updated',
          roadTaxExpiry: '2028-07-03',
          insuranceExpiry: '2028-07-03',
          puspakomExpiry: '2028-07-03',
        },
      })

      for (const route of [...cleanup]) {
        await apiRequest(api, report, 'delete', route, {
          csrfToken,
          expected: [204, 404],
          note: `cleanup ${route}`,
        })
      }
      cleanup.length = 0

      await expectDeletedFromList(
        api,
        report,
        `/inspection/equipment-options?inspectionType=${encodeURIComponent(
          equipmentType,
        )}&inspectionTypeKey=${encodeURIComponent(
          inspectionTypeKey(equipmentType),
        )}&mainLocation=${encodeURIComponent(locationUpdateName)}`,
        equipmentId,
      )
    } finally {
      for (const route of cleanup) {
        await cleanupRoute(api, report, csrfToken, 'delete', route)
      }
      writeJsonArtifact('catalog-crud-report.json', report)
    }
  })

  test('covers report, draft, checklist summary, update conflict, delete, and PDF generation for every inspection form', async ({
    request,
  }) => {
    test.setTimeout(Math.max(8 * 60_000, lifecycleTimeoutMs))

    const api = request
    const report = makeReport()
    const suffix = slug(String(Date.now()).slice(-8))
    let csrfToken = ''
    const createdReportUids = []
    let foreignReportUid = ''

    const context = {
      erAuxEquipmentName: `Smoke ER Aux Equipment ${suffix}`,
      hydraulicEquipmentName: `Smoke Hydraulic Equipment ${suffix}`,
      fireTruckPlateNo: `FRT${suffix}`
        .replace(/[^A-Za-z0-9]/g, '')
        .slice(0, 12)
        .toUpperCase(),
    }

    try {
      csrfToken = await safeLogin(api, report)
      await apiRequest(api, report, 'delete', '/reports/draft?report_type=inspection', {
        csrfToken,
        expected: [200],
        note: 'clear stale inspection drafts before report matrix',
      })
      for (const inspectionType of inspectionTypesUnderTest) {
        csrfToken = await safeLogin(api, report)
        const typeSlug = slug(inspectionType)
        const reportUid = `smoke-${runId}-${typeSlug}-${suffix}`.slice(0, 180)
        const displayId = `SMOKE-${typeSlug.toUpperCase()}-${suffix}`.slice(0, 180)
        const submission = createReportPayload({
          inspectionType,
          suffix: `${suffix}-${typeSlug}`,
          context,
          reportUid,
          displayId,
        })
        const expectedPayloadInspectionType =
          inspectionType === 'Health Safety Environment'
            ? 'Health Safety Environment Inspection'
            : inspectionType

        const draftCreate = await apiRequest(api, report, 'post', '/reports/draft', {
          csrfToken,
          expected: [200, 201],
          note: `save draft for ${inspectionType}`,
          data: {
            report_type: 'inspection',
            title: `${inspectionType} smoke draft`,
            origin_mode: 'new',
            payload: submission.payload,
          },
        })
        const draftId = String(draftCreate.body?.data?.draft_id || '').trim()
        expect(draftId, `Draft id missing for ${inspectionType}`).toBeTruthy()
        expect(draftCreate.body?.data?.payload?.incidentType).toBe(expectedPayloadInspectionType)

        const draftShow = await apiRequest(
          api,
          report,
          'get',
          `/reports/drafts/${encodeURIComponent(draftId)}`,
          { expected: [200], note: `load draft by id for ${inspectionType}` },
        )
        expect(draftShow.body?.data?.payload?.incidentType).toBe(expectedPayloadInspectionType)

        await apiRequest(api, report, 'delete', `/reports/drafts/${encodeURIComponent(draftId)}`, {
          csrfToken,
          expected: [200],
          note: `delete draft by id for ${inspectionType}`,
        })

        const confirmDraft = await apiRequest(
          api,
          report,
          'get',
          `/reports/drafts/${encodeURIComponent(draftId)}`,
          { expected: [404, 500], note: `confirm draft deleted by id for ${inspectionType}` },
        )
        expect(confirmDraft.status).not.toBe(200)

        const create = await apiRequest(api, report, 'post', '/reports', {
          csrfToken,
          expected: [201],
          note: `create submitted report for ${inspectionType}`,
          data: submission,
        })
        const created = create.body?.data || {}
        expect(created.id).toBe(reportUid)
        expect(created.displayId).toBe(displayId)
        expect(created.reportType).toBe('inspection')
        expect(created.status).toBe('Submitted')
        expect(created.version).toBe(1)
        expect(created.timeline?.some((item) => item.action === 'Submitted')).toBe(true)
        createdReportUids.push(reportUid)
        report.reports.push({
          inspection_type: inspectionType,
          report_uid: reportUid,
          display_id: displayId,
        })

        if (inspectionType === inspectionTypesUnderTest[0]) {
          const replay = await apiRequest(api, report, 'post', '/reports', {
            csrfToken,
            expected: [200],
            note: 'idempotent create replay',
            data: submission,
          })
          expect(replay.body?.data?.idempotent_replay).toBe(true)
        }

        const show = await apiRequest(
          api,
          report,
          'get',
          `/reports/${encodeURIComponent(reportUid)}`,
          {
            expected: [200],
            note: `show report for ${inspectionType}`,
          },
        )
        expect(show.body?.data?.id).toBe(reportUid)

        const updatedPayload = {
          ...submission.payload,
          remarks: `${submission.payload.remarks} updated`,
          smokeUpdated: true,
          ...(inspectionType === 'Health Safety Environment'
            ? {
                hseSelections: ['unsafeCondition'],
                hseUnsafeActDetails: 'Stale HSE act details must be cleared.',
                hseUnsafeConditionDetails: `HSE unsafe condition smoke details ${suffix}`,
              }
            : {}),
        }
        const update = await apiRequest(
          api,
          report,
          'put',
          `/reports/${encodeURIComponent(reportUid)}`,
          {
            csrfToken,
            expected: [200],
            note: `update report for ${inspectionType}`,
            data: {
              payload: updatedPayload,
              version: created.version,
              status: 'Submitted',
              remarks: `Smoke update ${inspectionType}`,
            },
          },
        )
        const updated = update.body?.data || {}
        expect(updated.version).toBe(2)
        expect(updated.smokeUpdated).toBe(true)
        if (inspectionType === 'Health Safety Environment') {
          expect(updated.hsePayloadVersion).toBe(2)
          expect(updated.hseSelections).toEqual(['unsafeCondition'])
          expect(updated.hseUnsafeActDetails).toBe('')
        }

        await apiRequest(api, report, 'put', `/reports/${encodeURIComponent(reportUid)}`, {
          csrfToken,
          expected: [409],
          note: `stale update conflict for ${inspectionType}`,
          data: {
            payload: updatedPayload,
            version: created.version,
            status: 'Submitted',
          },
        })

        csrfToken = await safeLogin(api, report)

        await downloadPdf(api, report, csrfToken, reportUid, updated.version, [200], {
          minImageCount: expectedPdfImageCounts[inspectionType] || 0,
        })
        const staleVersionPdf = await downloadPdf(
          api,
          report,
          csrfToken,
          reportUid,
          created.version,
          [200],
          { minImageCount: expectedPdfImageCounts[inspectionType] || 0 },
        )
        expect(staleVersionPdf?.rendered_version).toBe(String(updated.version))
      }

      const listMine = await apiRequest(api, report, 'get', '/reports?reportType=inspection', {
        expected: [200],
        note: 'list my inspection reports',
      })
      const listMineIds = (listMine.body?.data || []).map((item) => item.id)
      for (const reportUid of createdReportUids) {
        expect(listMineIds).toContain(reportUid)
      }

      await apiRequest(api, report, 'get', '/reports?reportType=inspection&scope=all', {
        expected: [200],
        note: 'list all inspection reports',
      })

      const summaryInspectionType = inspectionTypesUnderTest[0]
      const summaryPayloadInspectionType =
        summaryInspectionType === 'Health Safety Environment'
          ? 'Health Safety Environment Inspection'
          : summaryInspectionType
      const summary = await apiRequest(
        api,
        report,
        'get',
        `/reports/inspection/checklist-summary?inspection_type=${encodeURIComponent(
          summaryPayloadInspectionType,
        )}&checklist_item=${encodeURIComponent(`${summaryInspectionType} smoke checklist`)}`,
        { expected: [200], note: 'inspection checklist summary' },
      )
      expect(Number(summary.body?.data?.totalReports || 0)).toBeGreaterThanOrEqual(1)
      expect(Array.isArray(summary.body?.data?.items)).toBe(true)

      foreignReportUid = `smoke-${runId}-foreign-owner-${suffix}`.slice(0, 180)
      const foreignDisplayId = `SMOKE-FOREIGN-${suffix}`
      createForeignOwnedInspectionReport({
        reportUid: foreignReportUid,
        displayId: foreignDisplayId,
        status: 'Approved',
        payload: buildInspectionPayload('General Inspection', `foreign-${suffix}`, {
          selectedLocation: 'Foreign Owner Smoke Area',
        }),
      })

      const allAfterForeign = await apiRequest(
        api,
        report,
        'get',
        '/reports?reportType=inspection&scope=all',
        {
          expected: [200],
          note: 'all scope includes foreign-owned inspection report',
        },
      )
      expect((allAfterForeign.body?.data || []).map((item) => item.id)).toContain(foreignReportUid)
      const sysadminEditedForeign = await apiRequest(
        api,
        report,
        'put',
        `/reports/${encodeURIComponent(foreignReportUid)}`,
        {
          csrfToken,
          data: {
            payload: buildInspectionPayload(
              'General Inspection',
              `foreign-sysadmin-edit-${suffix}`,
              {
                selectedLocation: 'Foreign Owner Smoke Area Edited By Sysadmin',
              },
            ),
            remarks: 'Sysadmin smoke edit of foreign approved inspection report',
            version: 1,
            status: 'Submitted',
          },
          expected: [200],
          note: 'sysadmin edits foreign-owned approved inspection report',
        },
      )
      expect(sysadminEditedForeign.body?.data?.version).toBe(2)
      await downloadPdf(api, report, csrfToken, foreignReportUid, 2, [200], {
        minImageCount: expectedPdfImageCounts['General Inspection'],
      })
    } finally {
      for (const reportUid of createdReportUids.reverse()) {
        await deleteReport(api, report, csrfToken, reportUid)
      }
      deleteForeignOwnedInspectionReport(foreignReportUid)
      writeJsonArtifact('report-crud-matrix-report.json', report)
    }
  })

  test('downloads a visible all-scope row from the inspection records table', async ({
    page,
  }, testInfo) => {
    test.setTimeout(2 * 60_000)

    const api = page.context().request
    const report = makeReport()
    const suffix = slug(String(Date.now()).slice(-8))
    let foreignReportUid = ''

    try {
      await safeLogin(api, report)
      foreignReportUid = `smoke-${runId}-records-download-${suffix}`.slice(0, 180)
      const displayId = `SMOKE-RECORDS-DOWNLOAD-${suffix}`

      createForeignOwnedInspectionReport({
        reportUid: foreignReportUid,
        displayId,
        status: 'Approved',
        payload: buildInspectionPayload('General Inspection', `records-download-${suffix}`, {
          selectedLocation: 'Records Download Smoke Area',
        }),
      })

      await page.setViewportSize({ width: 1440, height: 960 })
      await loginInBrowser(page)
      await page.goto('/inspection', { waitUntil: 'domcontentloaded' })
      await waitForAppReady(page, '/inspection')
      await expect(
        page.locator('.card.d-none.d-md-block[data-testid="inspection-records"]'),
      ).toBeVisible()

      const setRecordScopeAll = async () => {
        const scopeGroup = page.getByRole('group', { name: 'Record scope' })
        await expect(scopeGroup).toBeVisible()
        await scopeGroup.getByRole('button', { name: 'All', exact: true }).click()
        try {
          await page.waitForResponse(
            (response) => {
              const url = new URL(response.url())
              return (
                url.pathname.endsWith('/api/reports') &&
                url.searchParams.get('reportType') === 'inspection' &&
                url.searchParams.get('scope') === 'all'
              )
            },
            { timeout: 30_000 },
          )
        } catch {
          await page.waitForTimeout(1_000)
        }
      }

      await setRecordScopeAll()
      await page.getByRole('textbox', { name: 'Search records' }).fill(displayId)

      const recordRow = page.locator('tbody tr').filter({ hasText: displayId }).first()
      await expect(recordRow, `Expected all-scope records row ${displayId}`).toBeVisible({
        timeout: 20_000,
      })

      await recordRow.getByRole('button', { name: 'Row actions' }).click()
      await expect(
        page
          .locator('.dropdown-menu.show')
          .last()
          .getByRole('button', { name: 'Edit', exact: true }),
        'Edit should be enabled for sysadmin on foreign-owned approved records',
      ).toBeEnabled()
      const sharedPdfPromise = page.waitForResponse(
        (response) => {
          const url = new URL(response.url())
          return url.pathname.endsWith('/api/reports/inspection/pdf')
        },
        { timeout: 30_000 },
      )
      const sharedDownloadPromise = page.waitForEvent('download', { timeout: 30_000 })
      await page
        .locator('.dropdown-menu.show')
        .last()
        .getByRole('button', { name: 'Download report', exact: true })
        .click()
      const sharedPdfResponse = await sharedPdfPromise
      const sharedDownload = await sharedDownloadPromise
      expect(sharedPdfResponse.status()).toBe(200)
      expect(sharedPdfResponse.headers()['content-type']).toContain('application/pdf')
      expect(sharedDownload.suggestedFilename()).toMatch(/\.pdf$/i)

      const sharedDownloadPath = await sharedDownload.path()
      expect(sharedDownloadPath).toBeTruthy()
      expect(fs.statSync(sharedDownloadPath).size).toBeGreaterThan(0)
      expect(fs.readFileSync(sharedDownloadPath).subarray(0, 5).toString('ascii')).toBe('%PDF-')

      await recordRow.getByRole('button', { name: 'Row actions' }).click()
      const deleteMenuItem = page
        .locator('.dropdown-menu.show')
        .last()
        .getByRole('button', { name: 'Delete', exact: true })
      await expect(
        deleteMenuItem,
        'Delete should be enabled for sysadmin on foreign-owned approved records',
      ).toBeEnabled()
      await deleteMenuItem.click()

      const deleteModal = page.locator('.modal.show', { hasText: 'Delete Report' }).last()
      await expect(deleteModal).toBeVisible()
      await deleteModal.getByRole('button', { name: 'Delete', exact: true }).click()
      await expect(deleteModal).toBeHidden({ timeout: 20_000 })
      await expect(recordRow).toBeHidden({ timeout: 20_000 })
    } catch (error) {
      if (!page.isClosed()) {
        ensureArtifactRoot()
        await testInfo.attach('records-download-failure.png', {
          body: await page.screenshot({ fullPage: true }),
          contentType: 'image/png',
        })
      }
      throw error
    } finally {
      deleteForeignOwnedInspectionReport(foreignReportUid)
      writeJsonArtifact('records-table-download-report.json', report)
    }
  })

  test('covers workflow transition endpoints and terminal delete cleanup', async ({ page }) => {
    test.setTimeout(3 * 60_000)

    const api = page.context().request
    const report = makeReport()
    const suffix = slug(String(Date.now()).slice(-8))
    let csrfToken = ''
    let reportUid = ''

    try {
      csrfToken = await safeLogin(api, report)
      reportUid = `smoke-${runId}-workflow-${suffix}`.slice(0, 180)
      const submission = createReportPayload({
        inspectionType: 'General Inspection',
        suffix: `workflow-${suffix}`,
        reportUid,
        displayId: `SMOKE-WORKFLOW-${suffix}`,
      })

      const create = await apiRequest(api, report, 'post', '/reports', {
        csrfToken,
        expected: [201],
        note: 'create workflow probe report',
        data: submission,
      })
      let version = create.body?.data?.version || 1

      await apiRequest(api, report, 'post', `/reports/${encodeURIComponent(reportUid)}/reject`, {
        csrfToken,
        expected: [422],
        note: 'reject requires remarks',
        data: { version },
      })

      const review = await apiRequest(
        api,
        report,
        'post',
        `/reports/${encodeURIComponent(reportUid)}/review`,
        {
          csrfToken,
          expected: [200, 403],
          note: 'review transition or configured workflow policy block',
          data: { version, remarks: 'Smoke review transition.' },
        },
      )

      if (review.status === 200) {
        expect(review.body?.data?.status).toBe('Reviewed')
        version = review.body?.data?.version

        const approve = await apiRequest(
          api,
          report,
          'post',
          `/reports/${encodeURIComponent(reportUid)}/approve`,
          {
            csrfToken,
            expected: [200, 403],
            note: 'approve transition or configured workflow policy block',
            data: { version, remarks: 'Smoke approve transition.' },
          },
        )
        if (approve.status === 200) {
          expect(approve.body?.data?.status).toBe('Approved')
          version = approve.body?.data?.version

          await apiRequest(api, report, 'put', `/reports/${encodeURIComponent(reportUid)}`, {
            csrfToken,
            expected: [422],
            note: 'approved inspection cannot be edited',
            data: {
              payload: submission.payload,
              version,
              status: 'Submitted',
            },
          })
        } else {
          expect([
            'INSPECTION_WORKFLOW_FORBIDDEN',
            'INSPECTION_APPROVE_FORBIDDEN',
            'REPORTING_WORKFLOW_FORBIDDEN',
          ]).toContain(String(approve.body?.code || '').toUpperCase())
        }
      } else {
        expect([
          'INSPECTION_WORKFLOW_FORBIDDEN',
          'INSPECTION_REVIEW_FORBIDDEN',
          'REPORTING_WORKFLOW_FORBIDDEN',
        ]).toContain(String(review.body?.code || '').toUpperCase())
        await apiRequest(api, report, 'post', `/reports/${encodeURIComponent(reportUid)}/approve`, {
          csrfToken,
          expected: [409],
          note: 'approve before review is invalid',
          data: { version, remarks: 'Smoke premature approve.' },
        })
      }
    } finally {
      await deleteReport(api, report, csrfToken, reportUid)
      writeJsonArtifact('workflow-transition-report.json', report)
    }
  })
})
