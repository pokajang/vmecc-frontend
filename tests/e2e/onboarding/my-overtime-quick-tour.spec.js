const { execFileSync } = require('node:child_process')
const path = require('node:path')
const { expect, test } = require('@playwright/test')

const backendDir = path.resolve(process.cwd(), '..', 'vmecc-backend')
const apiBaseUrl = process.env.VMECC_E2E_API_URL || 'http://localhost:8000/api'
const overtimeEmail = 'codex.smoke.overtime@vmecc.local'
const smokePassword = 'SmokeTrt!2026'
const overtimeReplayEvent = 'vmecc:onboarding:my-overtime-tour-replay'
const smokeOvertimeDisplayId = 'OT-SMOKE-2026-001'

test.describe.configure({ timeout: 120000 })

const runTinker = (code) =>
  execFileSync('php', ['artisan', 'tinker', '--execute', code], {
    cwd: backendDir,
    encoding: 'utf8',
    stdio: 'pipe',
  })

const resetOvertimeTourState = () => {
  runTinker(`
    $user = \\App\\Models\\User::where('email', '${overtimeEmail}')->first();
    if ($user) {
      \\App\\Models\\UserOnboardingState::where('user_id', $user->id)
        ->where('key', 'my_overtime_quick_tour')
        ->delete();
    }
  `)
}

const resetOvertimeSmokeFixtures = () => {
  runTinker(`
    $user = \\App\\Models\\User::where('email', '${overtimeEmail}')->first();
    if ($user) {
      \\App\\Models\\OvertimeDraft::where('user_id', $user->id)->delete();
      \\App\\Models\\OvertimeRecord::withTrashed()->where('user_id', $user->id)
        ->where('display_id', '${smokeOvertimeDisplayId}')
        ->forceDelete();
    }
  `)
}

const ensureOvertimeSmokeUser = () => {
  runTinker(`
    \\App\\Models\\Setting::query()->updateOrCreate(
      ['key' => 'overtime_rate_settings'],
      ['value' => [
        'otApplicability' => ['roles' => ['Tactical Response Team']],
        'weekdayMultiplier' => '1.5',
        'weekendMultiplier' => '2.0',
        'publicHolidayMultiplier' => '3.0',
      ]]
    );

    $user = \\App\\Models\\User::withTrashed()->firstOrNew(['email' => '${overtimeEmail}']);
    if ($user->exists && method_exists($user, 'restore') && $user->trashed()) {
      $user->restore();
    }
    $user->fill([
      'name' => 'Codex Smoke Overtime',
      'status' => 'active',
      'password' => '${smokePassword}',
      'ic_number' => '900101-10-9999',
      'phone' => '012 111 2222',
      'address' => 'Lot 9',
      'state' => 'Selangor',
      'emergency_contact' => [
        'name' => 'Smoke Contact',
        'relationship' => 'Sibling',
        'phone' => '012 333 4444',
      ],
      'medical_info' => [
        'noKnownCriticalMedicalInfo' => true,
      ],
    ]);
    $user->save();
    if (method_exists($user, 'syncRoles')) {
      $user->syncRoles(['Tactical Response Team']);
    }
    if (method_exists($user, 'syncPermissions')) {
      $permission = \\Spatie\\Permission\\Models\\Permission::where('name', 'self.overtime')->first();
      if ($permission) {
        $user->syncPermissions([$permission->name]);
      }
    }
    \\App\\Models\\UserOnboardingState::where('user_id', $user->id)
      ->where('key', 'my_overtime_quick_tour')
      ->delete();
  `)
}

const ensureOvertimeSmokeFixture = () => {
  const output = runTinker(`
    $user = \\App\\Models\\User::where('email', '${overtimeEmail}')->firstOrFail();

    $record = \\App\\Models\\OvertimeRecord::updateOrCreate(
      [
        'user_id' => $user->id,
        'display_id' => '${smokeOvertimeDisplayId}',
      ],
      [
        'overtime_type' => 'weekday',
        'claim_date' => now()->addDays(10)->toDateString(),
        'start_time' => '18:00:00',
        'end_time' => '21:00:00',
        'is_overnight' => false,
        'duration_minutes' => 180,
        'reason' => 'Smoke overtime tour coverage verification.',
        'status' => 'Pending',
        'applied_at' => now()->subDay(),
        'workflow_stage' => 'review',
        'workflow_snapshot' => [
          'reviewRole' => 'Assistant Incident Commander',
          'recommendRole' => 'Incident Commander',
          'approveRole' => 'Client Contract Manager',
          'requireRecommendation' => true,
        ],
        'next_action_role' => 'Assistant Incident Commander',
        'applicant_roles' => ['Tactical Response Team'],
        'approval_history' => [],
        'submitted_by' => 'Codex Smoke Overtime',
      ]
    );

    echo $record->id;
  `)

  return String(output || '').trim()
}

const loginAsOvertimeUser = async (page) => {
  const loginRequest = () =>
    page.context().request.post(`${apiBaseUrl}/auth/login`, {
      data: {
        email: overtimeEmail,
        password: smokePassword,
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
  expect(loginResponse.ok(), `Login failed for ${overtimeEmail}: ${loginBody}`).toBe(true)
}

const startReplayTour = async (page, source = 'tutorial_hub') => {
  await page.evaluate(
    ({ eventName, detail }) => {
      window.dispatchEvent(new CustomEvent(eventName, { detail }))
    },
    {
      eventName: overtimeReplayEvent,
      detail: {
        source,
      },
    },
  )
}

const waitForOvertimeModule = async (page) => {
  await expect(page.locator('[data-tour-id="overtime-module"]')).toBeVisible({ timeout: 20000 })
}

const completeOvertimeTutorial = async (page) => {
  await expect(page.locator('[data-tour-id="overtime-module"]')).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Overtime workspace' })).toBeVisible()
  await expect(page.getByText('Step 1 of 4', { exact: true })).toBeVisible()

  const steps = [
    ['Overtime records', 'Step 2 of 4'],
    ['Filters and search', 'Step 3 of 4'],
    ['Apply overtime', 'Step 4 of 4'],
  ]

  for (const [title, progress] of steps) {
    await page.locator('.onboarding-tour-tooltip').getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('dialog', { name: title })).toBeVisible()
    await expect(
      page.locator('.onboarding-tour-tooltip').getByText(progress, { exact: true }),
    ).toBeVisible()
  }

  await page
    .locator('.onboarding-tour-tooltip')
    .getByRole('button', { name: 'Continue to application' })
    .click()
  await expect(page).toHaveURL(/\/overtime\/new$/)
  await expect(page.getByRole('dialog', { name: 'Choose overtime type' })).toBeVisible()
  await expect(
    page.locator('.onboarding-tour-tooltip').getByText('Step 1 of 1', { exact: true }),
  ).toBeVisible()

  await page.getByRole('radio', { name: /Weekday Overtime/ }).click()
  await page
    .locator('.onboarding-tour-tooltip')
    .getByRole('button', { name: 'Open application form' })
    .click()
  await expect(page.getByRole('dialog', { name: 'Application form' })).toBeVisible()
  await expect(
    page.locator('.onboarding-tour-tooltip').getByText('Step 1 of 3', { exact: true }),
  ).toBeVisible()

  const formSteps = [
    ['Save draft', 'Step 2 of 3'],
    ['Submit request', 'Step 3 of 3'],
  ]

  for (const [title, progress] of formSteps) {
    await page.locator('.onboarding-tour-tooltip').getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('dialog', { name: title })).toBeVisible()
    await expect(
      page.locator('.onboarding-tour-tooltip').getByText(progress, { exact: true }),
    ).toBeVisible()
  }

  await page.locator('.onboarding-tour-tooltip').getByRole('button', { name: 'Done' }).click()
  await expect(page.locator('.onboarding-tour-tooltip')).toHaveCount(0)
}

test.beforeAll(() => {
  ensureOvertimeSmokeUser()
  ensureOvertimeSmokeFixture()
})

test.afterAll(() => {
  resetOvertimeTourState()
  resetOvertimeSmokeFixtures()
})

test('Overtime quick tour starts from the direct /overtime prompt and completes', async ({
  page,
}) => {
  await loginAsOvertimeUser(page)

  await page.goto('/overtime')
  await waitForOvertimeModule(page)
  await expect(page.getByText('Start Overtime tutorial?')).toBeVisible()
  await page.getByRole('button', { name: 'Start tutorial' }).click()

  await completeOvertimeTutorial(page)
})

test('Overtime quick tour replays in place on /overtime/new and continues from type selection into the form subset', async ({
  page,
}) => {
  await loginAsOvertimeUser(page)

  await page.goto('/overtime/new')
  await waitForOvertimeModule(page)
  await expect(page.getByText('Start Overtime tutorial?')).toHaveCount(0)

  await startReplayTour(page)

  const tooltip = page.locator('.onboarding-tour-tooltip')
  await expect(page.getByRole('dialog', { name: 'Overtime workspace' })).toBeVisible()
  await expect(tooltip.getByText('Step 1 of 2', { exact: true })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Choose overtime type' })).toBeVisible()
  await expect(tooltip.getByText('Step 2 of 2', { exact: true })).toBeVisible()
  await page.getByRole('radio', { name: /Weekday Overtime/ }).click()
  await tooltip.getByRole('button', { name: 'Open application form' }).click()
  await expect(page.getByRole('dialog', { name: 'Application form' })).toBeVisible()
  await expect(tooltip.getByText('Step 1 of 3', { exact: true })).toBeVisible()

  await tooltip.getByRole('button', { name: 'Skip' }).click()
  await expect(tooltip).toHaveCount(0)
})

test('Overtime quick tour replays in place on /overtime/new after type selection and shows the form subset', async ({
  page,
}) => {
  await loginAsOvertimeUser(page)

  await page.goto('/overtime/new')
  await waitForOvertimeModule(page)
  await page
    .getByRole('radio', {
      name: /Weekday Overtime/,
    })
    .click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.locator('[data-tour-id="overtime-apply"]')).toBeVisible()

  await startReplayTour(page)

  const tooltip = page.locator('.onboarding-tour-tooltip')
  await expect(page.getByRole('dialog', { name: 'Overtime workspace' })).toBeVisible()
  await expect(tooltip.getByText('Step 1 of 4', { exact: true })).toBeVisible()

  const steps = [
    ['Application form', 'Step 2 of 4'],
    ['Save draft', 'Step 3 of 4'],
    ['Submit request', 'Step 4 of 4'],
  ]

  for (const [title, progress] of steps) {
    await tooltip.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('dialog', { name: title })).toBeVisible()
    await expect(tooltip.getByText(progress, { exact: true })).toBeVisible()
  }

  await tooltip.getByRole('button', { name: 'Done' }).click()
  await expect(tooltip).toHaveCount(0)
})

test('Overtime quick tour replays in place on /overtime/:overtimeId and shows the detail subset', async ({
  page,
}) => {
  const overtimeRecordId = ensureOvertimeSmokeFixture()
  expect(overtimeRecordId).not.toBe('')

  await loginAsOvertimeUser(page)

  await page.goto(`/overtime/${smokeOvertimeDisplayId}`)
  await waitForOvertimeModule(page)
  await expect(page.locator('[data-tour-id="overtime-detail"]')).toBeVisible()
  await expect(page.getByText('Start Overtime tutorial?')).toHaveCount(0)
  await expect(page.getByText(smokeOvertimeDisplayId, { exact: true })).toBeVisible()

  await startReplayTour(page)

  const tooltip = page.locator('.onboarding-tour-tooltip')
  await expect(page.getByRole('dialog', { name: 'Overtime workspace' })).toBeVisible()
  await expect(tooltip.getByText('Step 1 of 3', { exact: true })).toBeVisible()

  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Apply overtime' })).toBeVisible()
  await expect(tooltip.getByText('Step 2 of 3', { exact: true })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Request detail' })).toBeVisible()
  await expect(tooltip.getByText('Step 3 of 3', { exact: true })).toBeVisible()

  await tooltip.getByRole('button', { name: 'Done' }).click()
  await expect(tooltip).toHaveCount(0)
})
