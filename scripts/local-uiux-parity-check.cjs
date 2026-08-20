const { chromium } = require('playwright')
const fs = require('fs')
const { spawn } = require('child_process')

const rootDir = process.cwd().endsWith('vmecc-frontend')
  ? process.cwd()
  : 'C:/laragon/www/vmecc/vmecc-frontend'
const baseUrl = process.env.VMECC_UAT_BASE_URL || 'http://127.0.0.1:3000'
const apiUrl = process.env.VMECC_UAT_API_URL || 'https://vmecc-api.amiosh.com/api'
const evidenceDir = `${rootDir}/.playwright-output`
const credentials = {
  email: process.env.VMECC_UAT_EMAIL,
  password: process.env.VMECC_UAT_PASSWORD,
  remember: true,
}

if (!credentials.email || !credentials.password) {
  throw new Error('Set VMECC_UAT_EMAIL and VMECC_UAT_PASSWORD before running this check.')
}

fs.mkdirSync(evidenceDir, { recursive: true })

const normalizeSameSite = (value) => {
  const token = String(value || 'Lax').toLowerCase()
  if (token === 'strict') return 'Strict'
  if (token === 'none') return 'None'
  return 'Lax'
}

const parseCookie = (raw) => {
  const [pair, ...restParts] = String(raw || '').split(';')
  const [name, ...valueParts] = pair.split('=')
  const value = valueParts.join('=')
  const attrs = {}

  for (const part of restParts) {
    const [rawKey, ...rawValue] = part.trim().split('=')
    const key = String(rawKey || '').toLowerCase()
    const valueText = rawValue.join('=')
    if (key === 'domain') attrs.domain = valueText
    if (key === 'path') attrs.path = valueText
    if (key === 'samesite') attrs.sameSite = valueText
    if (key === 'secure') attrs.secure = true
    if (key === 'httponly') attrs.httpOnly = true
  }

  return {
    name,
    value,
    domain: attrs.domain || '.amiosh.com',
    path: attrs.path || '/',
    sameSite: normalizeSameSite(attrs.sameSite || 'Lax'),
    secure: attrs.secure === true,
    httpOnly: attrs.httpOnly === true,
  }
}

const startServer = () =>
  new Promise((resolve, reject) => {
    const server = spawn('cmd.exe', ['/c', 'npm start -- --host 127.0.0.1 --port 3000'], {
      cwd: rootDir,
      env: { ...process.env, VITE_API_URL: apiUrl },
      shell: false,
    })

    let output = ''
    const markReady = () => resolve(server)
    const checkReady = async () => {
      const deadline = Date.now() + 60000
      while (Date.now() < deadline) {
        try {
          const response = await fetch(baseUrl, { method: 'HEAD' })
          if (response.ok) {
            return markReady()
          }
        } catch (err) {
          // keep waiting
        }
        await new Promise((r) => setTimeout(r, 700))
      }
      reject(new Error('Local server did not become ready within timeout'))
    }

    const forward = (chunk) => {
      output += String(chunk)
      process.stdout.write(chunk)
    }
    server.stdout.on('data', forward)
    server.stderr.on('data', forward)
    server.on('error', (error) => reject(error))
    server.on('exit', (code) => {
      if (code && code !== 0) {
        reject(new Error(`Server exited with code ${code}. Output: ${output.slice(-1000)}`))
      }
    })

    checkReady()
  })

const login = async () => {
  const response = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(credentials),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Login failed ${response.status}: ${text.slice(0, 200)}`)
  }

  const setCookies = response.headers.getSetCookie?.() || []
  const parsed = setCookies.map(parseCookie)
  const session = parsed.find((cookie) => cookie.name === 'vmecc_session')
  if (!session) throw new Error('Session cookie missing from login response')

  return parsed.map((cookie) => ({
    ...cookie,
    url: 'https://vmecc-api.amiosh.com',
  }))
}

const checkModuleNav = async (
  page,
  { testId, recordsLabel, newLabel, route, newRoute, heading },
) => {
  await page.goto(route, { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { level: 1, name: heading }).waitFor({ timeout: 20000 })

  const nav = page.getByTestId(testId)
  await nav.waitFor({ timeout: 20000 })
  await nav.getByRole('button', { name: recordsLabel }).waitFor({ timeout: 12000 })
  await nav.getByRole('button', { name: recordsLabel }).isVisible()

  const screenshotBase = `${evidenceDir}/${heading.toLowerCase()}-records-desktop.png`
  await page.screenshot({ path: screenshotBase, fullPage: true })

  await nav.getByRole('button', { name: newLabel }).click()
  await page.waitForURL(`**${newRoute}`, { timeout: 20000 })
  await page.getByRole('heading', { level: 1, name: heading }).waitFor({ timeout: 12000 })
  await page.screenshot({
    path: `${evidenceDir}/${heading.toLowerCase()}-new-desktop.png`,
    fullPage: true,
  })

  await page.goto(route, { waitUntil: 'domcontentloaded' })
}

;(async () => {
  const server = await startServer()

  try {
    const cookies = await login()

    const browser = await chromium.launch({ headless: false, channel: 'chrome' })
    const context = await browser.newContext({
      baseURL: baseUrl,
      viewport: { width: 1440, height: 900 },
    })
    await context.addCookies(cookies)

    const page = await context.newPage()
    await checkModuleNav(page, {
      testId: 'leave-nav',
      recordsLabel: 'Leave Records',
      newLabel: 'Apply Leave',
      route: '/leave',
      newRoute: '/leave/new',
      heading: 'Leave',
    })
    await checkModuleNav(page, {
      testId: 'overtime-nav',
      recordsLabel: 'Overtime Records',
      newLabel: 'Apply Overtime',
      route: '/overtime',
      newRoute: '/overtime/new',
      heading: 'Overtime',
    })

    await page.screenshot({
      path: `${evidenceDir}/verification-complete-desktop.png`,
      fullPage: true,
    })
    await page.waitForTimeout(1500)

    await context.close()
    await browser.close()
    console.log('Local parity check completed.')
  } finally {
    server.kill()
  }
})()
