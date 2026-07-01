const { execFileSync } = require('node:child_process')
const path = require('node:path')
const { expect, test } = require('@playwright/test')
const {
  goToRouteAndWaitForModule,
  loginThroughApi,
  startReplayTour,
  waitForAuthenticatedShell,
} = require('./_helpers/onboardingTestHelpers')

const backendDir = path.resolve(process.cwd(), '..', 'vmecc-backend')
const overtimeManagementEmail = 'codex.smoke.overtime-management@vmecc.local'
const smokePassword = 'SmokeTrt!2026'
const overtimeManagementReplayEvent = 'vmecc:onboarding:overtime-management-tour-replay'
const smokeOvertimeDisplayId = 'OT-MGMT-SMOKE-2026-001'
const overtimeManagementModuleAnchor = '[data-tour-id="overtime-management-module"]'

test.describe.configure({ timeout: 120000 })

const runTinker = (code) =>
  execFileSync('php', ['artisan', 'tinker', '--execute', code], {
    cwd: backendDir,
    encoding: 'utf8',
    stdio: 'pipe',
  })

const resetOvertimeManagementTourState = () => {
  runTinker(`
    $user = \\App\\Models\\User::where('email', '${overtimeManagementEmail}')->first();
    if ($user) {
      \\App\\Models\\UserOnboardingState::where('user_id', $user->id)
        ->where('key', 'overtime_management_quick_tour')
        ->delete();
    }
  `)
}

const resetOvertimeManagementFixtures = () => {
  runTinker(`
    $user = \\App\\Models\\User::where('email', '${overtimeManagementEmail}')->first();
    if ($user) {
      \\App\\Models\\OvertimeRecord::withTrashed()
        ->where('user_id', $user->id)
        ->where('display_id', '${smokeOvertimeDisplayId}')
        ->forceDelete();
    }
  `)
}

const ensureOvertimeManagementUser = () => {
  runTinker(`
    $user = \\App\\Models\\User::withTrashed()->firstOrNew(['email' => '${overtimeManagementEmail}']);
    if ($user->exists && method_exists($user, 'restore') && $user->trashed()) {
      $user->restore();
    }
    $user->fill([
      'name' => 'Codex Smoke Overtime Management',
      'status' => 'active',
      'password' => '${smokePassword}',
    ]);
    $user->save();
    if (method_exists($user, 'syncRoles')) {
      $user->syncRoles([]);
    }
    if (method_exists($user, 'syncPermissions')) {
      $permissions = \\Spatie\\Permission\\Models\\Permission::query()
        ->whereIn('name', ['staff.overtime.manage', 'self.dashboard'])
        ->pluck('name')
        ->all();
      $user->syncPermissions($permissions);
    }
    \\App\\Models\\UserOnboardingState::where('user_id', $user->id)
      ->where('key', 'overtime_management_quick_tour')
      ->delete();
  `)
}

const ensureOvertimeManagementFixture = () => {
  const output = runTinker(`
    $user = \\App\\Models\\User::where('email', '${overtimeManagementEmail}')->firstOrFail();

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
        'reason' => 'Smoke overtime management tutorial coverage.',
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
        'submitted_by' => 'Codex Smoke Overtime Management',
      ]
    );

    echo json_encode([
      'routeKey' => $user->id . '::' . $record->id,
    ]);
  `)

  return JSON.parse(String(output || '').trim())
}

const loginAsOvertimeManagementUser = async (page) => {
  await loginThroughApi(page, {
    email: overtimeManagementEmail,
    password: smokePassword,
  })
  await waitForAuthenticatedShell(page)
}

test.beforeAll(() => {
  ensureOvertimeManagementUser()
  ensureOvertimeManagementFixture()
})

test.afterAll(() => {
  resetOvertimeManagementTourState()
  resetOvertimeManagementFixtures()
})

test('Overtime Management quick tour starts from the canonical records prompt', async ({
  page,
}) => {
  await loginAsOvertimeManagementUser(page)
  await goToRouteAndWaitForModule(page, {
    route: '/staff/overtime-management/records',
    moduleSelector: overtimeManagementModuleAnchor,
  })
  await expect(page.getByText('Start Overtime Management tutorial?')).toBeVisible()
  await page.getByRole('button', { name: 'Start tutorial' }).click()

  const tooltip = page.locator('.onboarding-tour-tooltip')
  await expect(page.getByRole('dialog', { name: 'Overtime management workspace' })).toBeVisible()
  await expect(tooltip.getByText('Step 1 of 4', { exact: true })).toBeVisible()

  const steps = [
    ['Overtime management sections', 'Step 2 of 4'],
    ['Overtime records', 'Step 3 of 4'],
    ['Filters and search', 'Step 4 of 4'],
  ]

  for (const [title, progress] of steps) {
    await tooltip.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('dialog', { name: title })).toBeVisible()
    await expect(tooltip.getByText(progress, { exact: true })).toBeVisible()
  }

  await tooltip.getByRole('button', { name: 'Done' }).click()
  await expect(tooltip).toHaveCount(0)
})

test('Overtime Management quick tour replays in place on rules', async ({ page }) => {
  await loginAsOvertimeManagementUser(page)
  await startReplayTour(page, {
    eventName: overtimeManagementReplayEvent,
    source: 'tutorial_hub',
    route: '/staff/overtime-management/rules',
    moduleSelector: overtimeManagementModuleAnchor,
  })

  const tooltip = page.locator('.onboarding-tour-tooltip')
  await expect(page.getByRole('dialog', { name: 'Overtime management workspace' })).toBeVisible()
  expect(page).toHaveURL('/staff/overtime-management/rules')
  await expect(tooltip.getByText('Step 1 of 3', { exact: true })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Overtime management sections' })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Overtime rules' })).toBeVisible()
})

test('Overtime Management quick tour replays in place on record detail', async ({ page }) => {
  const fixture = ensureOvertimeManagementFixture()
  expect(fixture.routeKey).toBeTruthy()

  const route = `/staff/overtime-management/record/${encodeURIComponent(fixture.routeKey)}`
  await loginAsOvertimeManagementUser(page)
  await startReplayTour(page, {
    eventName: overtimeManagementReplayEvent,
    source: 'tutorial_hub',
    route,
    moduleSelector: overtimeManagementModuleAnchor,
  })

  const tooltip = page.locator('.onboarding-tour-tooltip')
  await expect(page.getByRole('dialog', { name: 'Overtime management workspace' })).toBeVisible()
  await expect(page).toHaveURL(route)
  await expect(page.locator('[data-tour-id="overtime-management-detail"]')).toBeVisible()
  await expect(tooltip.getByText('Step 1 of 2', { exact: true })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Overtime record detail' })).toBeVisible()
})
