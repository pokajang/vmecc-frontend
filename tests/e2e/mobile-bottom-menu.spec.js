const { execFileSync } = require('node:child_process')
const { mkdirSync } = require('node:fs')
const path = require('node:path')
const { expect, test } = require('@playwright/test')

const backendDir = path.resolve(process.cwd(), '..', 'vmecc-backend')
const screenshotDir = path.resolve(process.cwd(), 'test-results', 'mobile-bottom-menu')
const apiBaseUrl = process.env.VMECC_E2E_API_URL || 'http://localhost:8000/api'
const trtEmail = 'codex.mobile.menu.trt@vmecc.local'
const trtPassword = 'MobileMenu!2026'

const runBackendPhp = (code) => {
  const guardedCode = `
    require 'vendor/autoload.php';
    $app = require 'bootstrap/app.php';
    $app->loadEnvironmentFrom('.env.testing');
    $kernel = $app->make(\\Illuminate\\Contracts\\Console\\Kernel::class);
    $kernel->bootstrap();
    if (!app()->environment('testing') || !str_ends_with((string) \\Illuminate\\Support\\Facades\\DB::connection()->getDatabaseName(), '_test')) {
      throw new \\RuntimeException('Mobile menu smoke refused a non-test database.');
    }
    ${code}
  `

  execFileSync('php', ['-r', guardedCode], {
    cwd: backendDir,
    env: {
      ...process.env,
      APP_ENV: 'testing',
      DB_DATABASE: 'vmecc_test',
    },
    stdio: 'pipe',
  })
}

const ensureSmokeUser = () => {
  runBackendPhp(`
    $user = \\App\\Models\\User::withTrashed()->firstOrNew(['email' => '${trtEmail}']);
    if ($user->exists && method_exists($user, 'restore') && $user->trashed()) {
      $user->restore();
    }
    $user->fill([
      'name' => 'Codex Mobile Menu TRT',
      'status' => 'active',
      'password' => '${trtPassword}',
      'ic_number' => '900101-10-1234',
      'phone' => '012 345 6789',
      'address' => 'Lot 1 Mobile Site',
      'state' => 'Selangor',
      'emergency_contact' => [
        'name' => 'Smoke Contact',
        'relationship' => 'Sibling',
        'phone' => '013 345 6789',
      ],
      'medical_info' => ['noKnownCriticalMedicalInfo' => true],
    ]);
    $user->save();
    $user->syncRoles(['Tactical Response Team']);
  `)
}

const cleanupSmokeUser = () => {
  runBackendPhp(`
    $user = \\App\\Models\\User::withTrashed()->where('email', '${trtEmail}')->first();
    if ($user) {
      $user->forceDelete();
    }
  `)
}

test.beforeAll(() => {
  ensureSmokeUser()
})

test.afterAll(() => {
  cleanupSmokeUser()
})

const loginAsSmokeUser = async (page) => {
  const loginResponse = await page.context().request.post(`${apiBaseUrl}/auth/login`, {
    data: {
      email: trtEmail,
      password: trtPassword,
      remember: true,
    },
    headers: {
      Accept: 'application/json',
    },
  })
  expect(loginResponse.ok()).toBe(true)
  await loginResponse.json()
}

const sampleNotifications = [
  {
    id: 9001,
    module: 'leave',
    event: 'submitted',
    title: 'Leave request needs approval',
    message: 'Leave request needs approval',
    createdAt: '2026-06-28T08:00:00.000Z',
    read: false,
    actionRequiredForViewer: true,
    metadata: {
      module: 'leave',
      recordDisplayId: 'LV-9001',
    },
  },
  {
    id: 9002,
    module: 'payroll',
    event: 'updated',
    title: 'Payroll claim updated',
    message: 'Payroll claim updated',
    createdAt: '2026-06-28T09:00:00.000Z',
    read: true,
    metadata: {
      module: 'payroll',
      recordDisplayId: 'CL-9002',
    },
  },
]

const installNotificationRoutes = async (page, getItems) => {
  await page.route('**/workflow/notifications**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const items = getItems()

    if (url.pathname.endsWith('/workflow/notifications/unread-count')) {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          data: { count: items.filter((item) => !item.read).length },
        }),
      })
      return
    }

    if (request.method() === 'GET' && url.pathname.endsWith('/workflow/notifications')) {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: items }),
      })
      return
    }

    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    })
  })
}

const bottomNavButton = (page, name) =>
  page.locator('.app-bottom-nav').getByRole('button', { name })

const openOverlay = async (page, name, dialogName) => {
  await bottomNavButton(page, name).click()
  const dialog = page.getByRole('dialog', { name: dialogName })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeVisible()
  await expect(page.locator('.app-bottom-nav')).toBeVisible()
  await expect(bottomNavButton(page, name)).toHaveAttribute('data-active', 'true')
  return dialog
}

const closeOverlay = async (dialog) => {
  await dialog.getByRole('button', { name: 'Close' }).click()
  await expect(dialog).toHaveCount(0)
}

const expectOverlayTextFits = async (dialog) => {
  const overflowing = await dialog
    .locator('.mobile-overlay-item-label, .mobile-overlay-item-subtext, .notification-item-text')
    .evaluateAll((nodes) =>
      nodes
        .filter((node) => node.scrollWidth > node.clientWidth + 1)
        .map((node) => node.textContent.trim()),
    )
  expect(overflowing).toEqual([])
}

const attachScreenshot = async (page, label) => {
  mkdirSync(screenshotDir, { recursive: true })
  const screenshotPath = path.join(screenshotDir, `${label}.png`)
  const body = await page.screenshot({ path: screenshotPath, fullPage: false })
  await test.info().attach(label, {
    body,
    contentType: 'image/png',
  })
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 430, height: 932 },
]) {
  test(`mobile bottom menu overlays are consistent at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    let notificationItems = []
    await page.setViewportSize(viewport)
    await installNotificationRoutes(page, () => notificationItems)
    await loginAsSmokeUser(page)
    await page.goto('/dashboard')

    let dialog = await openOverlay(page, 'Open menu', 'Menu')
    await expect(dialog.getByText('Home')).toBeVisible()
    await expectOverlayTextFits(dialog)
    await attachScreenshot(page, `${viewport.width}x${viewport.height}-menu`)
    await closeOverlay(dialog)

    dialog = await openOverlay(page, 'Open account menu', 'Account')
    await expect(dialog.getByText('Quick Actions')).toBeVisible()
    await expect(dialog.getByRole('button', { name: /Log out/i })).toBeVisible()
    await expectOverlayTextFits(dialog)
    await attachScreenshot(page, `${viewport.width}x${viewport.height}-account`)
    await closeOverlay(dialog)

    dialog = await openOverlay(page, 'Notifications', 'Notifications')
    await expect(dialog.getByText('No notifications yet.')).toBeVisible()
    await attachScreenshot(page, `${viewport.width}x${viewport.height}-alerts-empty`)
    await closeOverlay(dialog)

    notificationItems = sampleNotifications
    dialog = await openOverlay(page, 'Notifications', 'Notifications')
    await expect(
      dialog.locator('.mobile-overlay-section').getByText('Action Required'),
    ).toBeVisible()
    await expect(dialog.locator('.mobile-overlay-section').getByText('Other Updates')).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Mark as read' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Delete notification' }).first()).toBeVisible()
    await expectOverlayTextFits(dialog)
    await attachScreenshot(page, `${viewport.width}x${viewport.height}-alerts-with-records`)
  })
}
