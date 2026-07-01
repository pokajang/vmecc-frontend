const { execFileSync } = require('node:child_process')
const path = require('node:path')
const { expect, test } = require('@playwright/test')

const backendDir = path.resolve(process.cwd(), '..', 'vmecc-backend')
const apiBaseUrl = process.env.VMECC_E2E_API_URL || 'http://localhost:8000/api'
const leaveEmail = 'codex.smoke.leave@vmecc.local'
const smokePassword = 'SmokeTrt!2026'
const leaveReplayEvent = 'vmecc:onboarding:my-leave-tour-replay'
const smokeLeaveDisplayId = 'LV-SMOKE-2026-001'

test.describe.configure({ timeout: 120000 })

const runTinker = (code) => {
  return execFileSync('php', ['artisan', 'tinker', '--execute', code], {
    cwd: backendDir,
    encoding: 'utf8',
    stdio: 'pipe',
  })
}

const resetLeaveTourState = () => {
  runTinker(`
    $user = \\App\\Models\\User::where('email', '${leaveEmail}')->first();
    if ($user) {
      \\App\\Models\\UserOnboardingState::where('user_id', $user->id)
        ->where('key', 'my_leave_quick_tour')
        ->delete();
    }
  `)
}

const resetLeaveSmokeFixtures = () => {
  runTinker(`
    $user = \\App\\Models\\User::where('email', '${leaveEmail}')->first();
    if ($user) {
      \\App\\Models\\LeaveDraft::where('user_id', $user->id)->delete();
      \\App\\Models\\Leave::withTrashed()->where('user_id', $user->id)
        ->where('display_id', '${smokeLeaveDisplayId}')
        ->forceDelete();
      \\App\\Models\\LeaveAssignment::where('user_id', $user->id)
        ->where('leave_type', 'Annual Leave')
        ->where('year', now()->year)
        ->delete();
    }
  `)
}

const ensureLeaveSmokeUser = () => {
  runTinker(`
    $user = \\App\\Models\\User::withTrashed()->firstOrNew(['email' => '${leaveEmail}']);
    if ($user->exists && method_exists($user, 'restore') && $user->trashed()) {
      $user->restore();
    }
    $user->fill([
      'name' => 'Codex Smoke Leave',
      'status' => 'active',
      'password' => '${smokePassword}',
    ]);
    $user->save();
    if (method_exists($user, 'syncRoles')) {
      $user->syncRoles([]);
    }
    if (method_exists($user, 'syncPermissions')) {
      $permission = \\Spatie\\Permission\\Models\\Permission::where('name', 'self.leave')->first();
      if ($permission) {
        $user->syncPermissions([$permission->name]);
      }
    }
    \\App\\Models\\UserOnboardingState::where('user_id', $user->id)
      ->where('key', 'my_leave_quick_tour')
      ->delete();
  `)
}

const ensureLeaveSmokeFixture = () => {
  const output = runTinker(`
    $user = \\App\\Models\\User::where('email', '${leaveEmail}')->firstOrFail();

    \\App\\Models\\LeaveAssignment::updateOrCreate(
      [
        'user_id' => $user->id,
        'year' => now()->year,
        'leave_type' => 'Annual Leave',
      ],
      [
        'entitlement' => 14,
        'used' => 2,
        'pending' => 1,
      ]
    );

    $record = \\App\\Models\\Leave::updateOrCreate(
      [
        'user_id' => $user->id,
        'display_id' => '${smokeLeaveDisplayId}',
      ],
      [
        'leave_type' => 'Annual Leave',
        'status' => 'Pending',
        'start_date' => now()->addDays(14)->toDateString(),
        'end_date' => now()->addDays(15)->toDateString(),
        'days' => 2,
        'work_shift' => 'normal',
        'start_time_slot' => 'shift-start',
        'end_time_slot' => 'shift-end',
        'reason' => 'Smoke tour coverage verification.',
        'cover_by' => 'Codex Backup',
        'applied_at' => now()->subDay(),
        'workflow_stage' => 'review',
        'workflow_snapshot' => [
          'reviewRole' => 'Manager',
          'recommendRole' => 'Manager',
          'approveRole' => 'HR/HQ',
          'requireRecommendation' => false,
        ],
        'next_action_role' => 'Manager',
        'applicant_roles' => ['Staff'],
        'approval_history' => [],
        'submitted_by' => 'Codex Smoke Leave',
      ]
    );

    echo $record->id;
  `)

  return String(output || '').trim()
}

const loginAsLeaveUser = async (page) => {
  const loginRequest = () =>
    page.context().request.post(`${apiBaseUrl}/auth/login`, {
      data: {
        email: leaveEmail,
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
  expect(loginResponse.ok(), `Login failed for ${leaveEmail}: ${loginBody}`).toBe(true)
}

const startReplayTour = async (page, source = 'tutorial_hub') => {
  await page.evaluate(
    ({ eventName, detail }) => {
      window.dispatchEvent(new CustomEvent(eventName, { detail }))
    },
    {
      eventName: leaveReplayEvent,
      detail: {
        source,
      },
    },
  )
}

const waitForLeaveModule = async (page) => {
  await expect(page.locator('[data-tour-id="leave-module"]')).toBeVisible({ timeout: 20000 })
}

const completeLeaveTutorial = async (page) => {
  await expect(page.locator('[data-tour-id="leave-module"]')).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Leave workspace' })).toBeVisible()
  await expect(page.getByText('Step 1 of 4', { exact: true })).toBeVisible()

  const steps = [
    ['Leave records', 'Step 2 of 4'],
    ['Filters and search', 'Step 3 of 4'],
    ['Apply leave', 'Step 4 of 4'],
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
  await expect(page).toHaveURL(/\/leave\/new$/)
  await expect(page.getByRole('dialog', { name: 'Choose leave type' })).toBeVisible()
  await expect(
    page.locator('.onboarding-tour-tooltip').getByText('Step 1 of 1', { exact: true }),
  ).toBeVisible()

  await page.getByRole('radio', { name: /Annual Leave/ }).click()
  await page
    .locator('.onboarding-tour-tooltip')
    .getByRole('button', { name: 'Open application form' })
    .click()
  await expect(page.getByRole('dialog', { name: 'Application form' })).toBeVisible()
  await expect(
    page.locator('.onboarding-tour-tooltip').getByText('Step 1 of 4', { exact: true }),
  ).toBeVisible()

  const formSteps = [
    ['Balance review', 'Step 2 of 4'],
    ['Save draft', 'Step 3 of 4'],
    ['Submit request', 'Step 4 of 4'],
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
  ensureLeaveSmokeUser()
  ensureLeaveSmokeFixture()
})

test.afterAll(() => {
  resetLeaveTourState()
  resetLeaveSmokeFixtures()
})

test('Leave quick tour starts from the direct /leave prompt and completes', async ({ page }) => {
  await loginAsLeaveUser(page)

  await page.goto('/leave')
  await waitForLeaveModule(page)
  await expect(page.getByText('Start Leave tutorial?')).toBeVisible()
  await page.getByRole('button', { name: 'Start tutorial' }).click()

  await completeLeaveTutorial(page)
})

test('Leave quick tour replays in place on /leave/new and continues from type selection into the form subset', async ({
  page,
}) => {
  await loginAsLeaveUser(page)

  await page.goto('/leave/new')
  await waitForLeaveModule(page)
  await expect(page.getByText('Start Leave tutorial?')).toHaveCount(0)

  await startReplayTour(page)

  const tooltip = page.locator('.onboarding-tour-tooltip')
  await expect(page.getByRole('dialog', { name: 'Leave workspace' })).toBeVisible()
  await expect(tooltip.getByText('Step 1 of 2', { exact: true })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Choose leave type' })).toBeVisible()
  await expect(tooltip.getByText('Step 2 of 2', { exact: true })).toBeVisible()
  await page.getByRole('radio', { name: /Annual Leave/ }).click()
  await tooltip.getByRole('button', { name: 'Open application form' }).click()
  await expect(page.getByRole('dialog', { name: 'Application form' })).toBeVisible()
  await expect(tooltip.getByText('Step 1 of 4', { exact: true })).toBeVisible()

  await tooltip.getByRole('button', { name: 'Skip' }).click()
  await expect(tooltip).toHaveCount(0)
})

test('Leave quick tour replays in place on /leave/new after type selection and shows the apply subset', async ({
  page,
}) => {
  await loginAsLeaveUser(page)

  await page.goto('/leave/new')
  await waitForLeaveModule(page)
  await page
    .getByRole('radio', {
      name: /Annual Leave/,
    })
    .click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.locator('[data-tour-id="leave-balance"]')).toBeVisible()

  await startReplayTour(page)

  const tooltip = page.locator('.onboarding-tour-tooltip')
  await expect(page.getByRole('dialog', { name: 'Leave workspace' })).toBeVisible()
  await expect(tooltip.getByText('Step 1 of 5', { exact: true })).toBeVisible()

  const steps = [
    ['Application form', 'Step 2 of 5'],
    ['Balance review', 'Step 3 of 5'],
    ['Save draft', 'Step 4 of 5'],
    ['Submit request', 'Step 5 of 5'],
  ]

  for (const [title, progress] of steps) {
    await tooltip.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('dialog', { name: title })).toBeVisible()
    await expect(tooltip.getByText(progress, { exact: true })).toBeVisible()
  }

  await tooltip.getByRole('button', { name: 'Done' }).click()
  await expect(tooltip).toHaveCount(0)
})

test('Leave quick tour replays in place on /leave/:leaveId and shows the detail subset', async ({
  page,
}) => {
  const leaveRecordId = ensureLeaveSmokeFixture()
  expect(leaveRecordId).not.toBe('')

  await loginAsLeaveUser(page)

  await page.goto(`/leave/${smokeLeaveDisplayId}`)
  await waitForLeaveModule(page)
  await expect(page.locator('[data-tour-id="leave-detail"]')).toBeVisible()
  await expect(page.getByText('Start Leave tutorial?')).toHaveCount(0)
  await expect(page.getByText(smokeLeaveDisplayId, { exact: true })).toBeVisible()

  await startReplayTour(page)

  const tooltip = page.locator('.onboarding-tour-tooltip')
  await expect(page.getByRole('dialog', { name: 'Leave workspace' })).toBeVisible()
  await expect(tooltip.getByText('Step 1 of 3', { exact: true })).toBeVisible()

  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Apply leave' })).toBeVisible()
  await expect(tooltip.getByText('Step 2 of 3', { exact: true })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Request detail' })).toBeVisible()
  await expect(tooltip.getByText('Step 3 of 3', { exact: true })).toBeVisible()

  await tooltip.getByRole('button', { name: 'Done' }).click()
  await expect(tooltip).toHaveCount(0)
})
