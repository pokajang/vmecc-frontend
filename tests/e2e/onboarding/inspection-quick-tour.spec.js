const { execFileSync } = require('node:child_process')
const path = require('node:path')
const { expect, test } = require('@playwright/test')

const backendDir = path.resolve(process.cwd(), '..', 'vmecc-backend')
const apiBaseUrl = process.env.VMECC_E2E_API_URL || 'http://localhost:8000/api'
const onboardingLocaleStorageKey = 'vmecc_onboarding_language'
const trtEmail = 'codex.smoke.trt@vmecc.local'
const adminEmail = 'codex.smoke.admin@vmecc.local'
const clientEmail = 'codex.smoke.client@vmecc.local'
const trtPassword = 'SmokeTrt!2026'

test.describe.configure({ timeout: 120000 })

const runTinker = (code) => {
  execFileSync('php', ['artisan', 'tinker', '--execute', code], {
    cwd: backendDir,
    stdio: 'pipe',
  })
}

const resetInspectionTourState = () => {
  runTinker(`
    $users = \\App\\Models\\User::whereIn('email', ['${trtEmail}', '${adminEmail}', '${clientEmail}'])->get();
    foreach ($users as $user) {
      \\App\\Models\\UserOnboardingState::where('user_id', $user->id)
        ->where('key', \\App\\Models\\UserOnboardingState::INSPECTION_QUICK_TOUR_TRT)
        ->delete();
    }
  `)
}

const ensureSmokeUser = ({ email, name, role, profileComplete = false }) => {
  runTinker(`
    $user = \\App\\Models\\User::withTrashed()->firstOrNew(['email' => '${email}']);
    if ($user->exists && method_exists($user, 'restore') && $user->trashed()) {
      $user->restore();
    }
    $user->fill([
      'name' => '${name}',
      'status' => 'active',
      'password' => '${trtPassword}',
      ${
        profileComplete
          ? `
      'ic_number' => '900101-10-1234',
      'phone' => '012 345 6789',
      'address' => 'Lot 1 Smoke Site',
      'state' => 'Selangor',
      'emergency_contact' => [
        'name' => 'Smoke Contact',
        'relationship' => 'Sibling',
        'phone' => '013 345 6789',
      ],
      'medical_info' => ['noKnownCriticalMedicalInfo' => true],
          `
          : ''
      }
    ]);
    $user->save();
    $user->syncRoles(['${role}']);
    \\App\\Models\\UserOnboardingState::where('user_id', $user->id)
      ->where('key', \\App\\Models\\UserOnboardingState::INSPECTION_QUICK_TOUR_TRT)
      ->delete();
  `)
}

test.beforeAll(() => {
  ensureSmokeUser({
    email: trtEmail,
    name: 'Codex Smoke TRT',
    role: 'Tactical Response Team',
    profileComplete: true,
  })
  ensureSmokeUser({
    email: adminEmail,
    name: 'Codex Smoke Admin',
    role: 'System Administrator',
  })
  ensureSmokeUser({
    email: clientEmail,
    name: 'Codex Smoke Client',
    role: 'Representative',
  })
})

test.afterAll(() => {
  resetInspectionTourState()
})

const loginAsSmokeUser = async (page, email = trtEmail) => {
  const loginRequest = () =>
    page.context().request.post(`${apiBaseUrl}/auth/login`, {
      data: {
        email,
        password: trtPassword,
        remember: true,
      },
      headers: {
        Accept: 'application/json',
      },
    })

  let loginResponse = await loginRequest()

  if (!loginResponse.ok()) {
    await page.waitForTimeout(500)
    loginResponse = await loginRequest()
  }

  const loginBody = await loginResponse.text()
  expect(loginResponse.ok(), `Login failed for ${email}: ${loginBody}`).toBe(true)
}

const completeInspectionTutorial = async (page, locale = 'en') => {
  await expect(page.locator('[data-tour-id="inspection-module"]')).toBeVisible()

  const firstStepTitle = locale === 'bm' ? 'Menu Pemeriksaan' : 'Inspection menu'
  await expect(page.getByRole('dialog', { name: firstStepTitle })).toBeVisible()
  await expect(
    page.getByText(locale === 'bm' ? 'Langkah 1 daripada 6' : 'Step 1 of 6', { exact: true }),
  ).toBeVisible()

  const steps =
    locale === 'bm'
      ? [
          ['Bahagian rekod', 'Langkah 2 daripada 6'],
          ['Kawalan skop', 'Langkah 3 daripada 6'],
          ['Penapis', 'Langkah 4 daripada 6'],
          ['Pemeriksaan baharu', 'Langkah 5 daripada 6'],
          ['Sedia untuk diterokai', 'Langkah 6 daripada 6'],
        ]
      : [
          ['Records area', 'Step 2 of 6'],
          ['Scope control', 'Step 3 of 6'],
          ['Filters', 'Step 4 of 6'],
          ['New inspection', 'Step 5 of 6'],
          ['Ready to explore', 'Step 6 of 6'],
        ]

  const tooltip = page.locator('.onboarding-tour-tooltip')
  const nextButtonName = locale === 'bm' ? 'Seterusnya' : 'Next'
  const doneButtonName = locale === 'bm' ? 'Selesai' : 'Done'

  for (const [title, progress] of steps) {
    await page
      .locator('.onboarding-tour-tooltip')
      .getByRole('button', { name: nextButtonName })
      .dispatchEvent('click')
    await expect(page.getByRole('dialog', { name: title })).toBeVisible()
    await expect(tooltip.getByText(progress, { exact: true })).toBeVisible()
  }

  await page
    .locator('.onboarding-tour-tooltip')
    .getByRole('button', { name: doneButtonName })
    .dispatchEvent('click')

  await expect(page.locator('.onboarding-tour-tooltip')).toHaveCount(0)
  await expect(page.locator('.react-joyride__overlay')).toHaveCount(0)
  await expect(page.locator('#react-joyride-portal')).toHaveJSProperty('childElementCount', 0)
}

test('TRT Inspection quick tour advances through all steps and clears overlay on Done', async ({
  page,
}) => {
  await loginAsSmokeUser(page)

  await page.goto('/dashboard')
  await page.evaluate(
    (storageKey) => window.localStorage.removeItem(storageKey),
    onboardingLocaleStorageKey,
  )
  await page.reload()
  await page.getByRole('button', { name: 'Open tutorial' }).click()
  await expect(page.getByRole('dialog', { name: 'Tutorial' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Tutorial language' })).toBeVisible()
  await page.getByRole('button', { name: 'Start' }).click()

  await completeInspectionTutorial(page, 'en')
})

test('mobile Tutorial hub starts Inspection tutorial without bottom-nav overlap', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await loginAsSmokeUser(page)

  await page.goto('/dashboard')
  await page.evaluate(
    (storageKey) => window.localStorage.removeItem(storageKey),
    onboardingLocaleStorageKey,
  )
  await page.reload()
  await page.getByRole('button', { name: 'Open tutorial' }).click()
  await expect(page.getByRole('dialog', { name: 'Tutorial' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Tutorial language' })).toBeVisible()
  await page.getByRole('button', { name: 'Start' }).click()

  await expect(page.getByRole('dialog', { name: 'Inspection menu' })).toBeVisible()
  await expect(page.getByText('Mulakan tutorial Pemeriksaan?')).toHaveCount(0)
  const tooltipBox = await page.locator('.onboarding-tour-tooltip').boundingBox()
  const bottomNavBox = await page.locator('.app-bottom-nav').boundingBox()
  expect(tooltipBox).toBeTruthy()
  expect(bottomNavBox).toBeTruthy()
  const bottomNavOverlap = Math.max(
    0,
    Math.min(tooltipBox.y + tooltipBox.height, bottomNavBox.y + bottomNavBox.height) -
      Math.max(tooltipBox.y, bottomNavBox.y),
  )
  expect(bottomNavOverlap).toBeLessThanOrEqual(1)

  await completeInspectionTutorial(page, 'en')
})

test('tutorial language selection persists and launches Inspection entirely in BM', async ({
  page,
}) => {
  await loginAsSmokeUser(page)

  await page.goto('/dashboard')
  await page.evaluate(
    (storageKey) => window.localStorage.removeItem(storageKey),
    onboardingLocaleStorageKey,
  )
  await page.reload()
  await page.getByRole('button', { name: 'Open tutorial' }).click()
  const tutorialDialog = page.getByRole('dialog', { name: 'Tutorial' })
  await expect(tutorialDialog).toBeVisible()
  await tutorialDialog.getByRole('button', { name: 'BM' }).click()
  await expect(tutorialDialog.getByText('Pemeriksaan', { exact: true })).toBeVisible()
  await expect(tutorialDialog.getByRole('button', { name: 'Mula' })).toBeVisible()
  await expect
    .poll(async () =>
      page.evaluate(
        (storageKey) => window.localStorage.getItem(storageKey),
        onboardingLocaleStorageKey,
      ),
    )
    .toBe('bm')
  await tutorialDialog.getByRole('button', { name: 'Mula' }).click()

  await completeInspectionTutorial(page, 'bm')
})

test('System Administrator can still start the Inspection tutorial with default English', async ({
  page,
}) => {
  await loginAsSmokeUser(page, adminEmail)

  await page.goto('/dashboard')
  await page.evaluate(
    (storageKey) => window.localStorage.removeItem(storageKey),
    onboardingLocaleStorageKey,
  )
  await page.reload()
  await page.getByRole('button', { name: 'Open tutorial' }).click()
  const tutorialDialog = page.getByRole('dialog', { name: 'Tutorial' })
  await expect(tutorialDialog).toBeVisible()
  await expect(tutorialDialog.getByText('Inspection', { exact: true })).toBeVisible()
  await expect(tutorialDialog.getByRole('button', { name: 'Start' })).toBeVisible()
  await tutorialDialog.getByRole('button', { name: 'Start' }).click()

  await completeInspectionTutorial(page, 'en')
})

test('client-facing users do not see inaccessible operational tutorials', async ({ page }) => {
  await loginAsSmokeUser(page, clientEmail)

  await page.goto('/dashboard')
  await page.getByRole('button', { name: 'Open tutorial' }).click()
  const tutorialDialog = page.getByRole('dialog', { name: 'Tutorial' })
  await expect(tutorialDialog).toBeVisible()
  await expect(tutorialDialog.getByText('Dashboard', { exact: true })).toBeVisible()
  await expect(tutorialDialog.getByText('Inspection', { exact: true })).toHaveCount(0)
  await expect(tutorialDialog.getByText('ERCO', { exact: true })).toHaveCount(0)
  await expect(tutorialDialog.getByText('Drill', { exact: true })).toHaveCount(0)
  await expect(tutorialDialog.getByText('Fitness Test', { exact: true })).toHaveCount(0)
})
