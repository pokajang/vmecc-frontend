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
const leaveManagementEmail = 'codex.smoke.leave-management@vmecc.local'
const leaveAssigneeEmail = 'codex.smoke.leave-assignee@vmecc.local'
const smokePassword = 'SmokeTrt!2026'
const leaveManagementReplayEvent = 'vmecc:onboarding:leave-management-tour-replay'
const smokeLeaveDisplayId = 'LV-MGMT-SMOKE-2026-001'
const leaveManagementModuleAnchor = '[data-tour-id="leave-management-module"]'

test.describe.configure({ timeout: 120000 })

const runTinker = (code) =>
  execFileSync('php', ['artisan', 'tinker', '--execute', code], {
    cwd: backendDir,
    encoding: 'utf8',
    stdio: 'pipe',
  })

const resetLeaveManagementTourState = () => {
  runTinker(`
    $user = \\App\\Models\\User::where('email', '${leaveManagementEmail}')->first();
    if ($user) {
      \\App\\Models\\UserOnboardingState::where('user_id', $user->id)
        ->where('key', 'leave_management_quick_tour')
        ->delete();
    }
  `)
}

const resetLeaveManagementFixtures = () => {
  runTinker(`
    $manager = \\App\\Models\\User::where('email', '${leaveManagementEmail}')->first();
    $assignee = \\App\\Models\\User::where('email', '${leaveAssigneeEmail}')->first();
    if ($manager) {
      \\App\\Models\\Leave::withTrashed()
        ->where('user_id', $manager->id)
        ->where('display_id', '${smokeLeaveDisplayId}')
        ->forceDelete();
    }
    if ($assignee) {
      $assignmentIds = \\App\\Models\\LeaveAssignment::query()
        ->where('user_id', $assignee->id)
        ->pluck('id');
      if ($assignmentIds->isNotEmpty()) {
        \\App\\Models\\LeaveAssignmentHistory::query()
          ->whereIn('assignment_id', $assignmentIds)
          ->delete();
      }
      \\App\\Models\\LeaveAssignment::query()
        ->where('user_id', $assignee->id)
        ->delete();
    }
  `)
}

const ensureLeaveManagementUser = () => {
  runTinker(`
    $user = \\App\\Models\\User::withTrashed()->firstOrNew(['email' => '${leaveManagementEmail}']);
    if ($user->exists && method_exists($user, 'restore') && $user->trashed()) {
      $user->restore();
    }
    $user->fill([
      'name' => 'Codex Smoke Leave Management',
      'status' => 'active',
      'password' => '${smokePassword}',
      'team' => 'HQ Operations',
    ]);
    $user->save();
    if (method_exists($user, 'syncRoles')) {
      $user->syncRoles([]);
    }
    if (method_exists($user, 'syncPermissions')) {
      $permissions = \\Spatie\\Permission\\Models\\Permission::query()
        ->whereIn('name', ['staff.leave.manage', 'self.dashboard'])
        ->pluck('name')
        ->all();
      $user->syncPermissions($permissions);
    }
    \\App\\Models\\UserOnboardingState::where('user_id', $user->id)
      ->where('key', 'leave_management_quick_tour')
      ->delete();

    $assignee = \\App\\Models\\User::withTrashed()->firstOrNew(['email' => '${leaveAssigneeEmail}']);
    if ($assignee->exists && method_exists($assignee, 'restore') && $assignee->trashed()) {
      $assignee->restore();
    }
    $assignee->fill([
      'name' => 'Codex Leave Assignee',
      'status' => 'active',
      'password' => '${smokePassword}',
      'team' => 'Operations Alpha',
    ]);
    $assignee->save();
    if (method_exists($assignee, 'syncRoles')) {
      $assignee->syncRoles([]);
    }
    if (method_exists($assignee, 'syncPermissions')) {
      $assignee->syncPermissions([]);
    }
  `)
}

const ensureLeaveManagementFixture = () => {
  const output = runTinker(`
    $user = \\App\\Models\\User::where('email', '${leaveManagementEmail}')->firstOrFail();
    $assignee = \\App\\Models\\User::where('email', '${leaveAssigneeEmail}')->firstOrFail();

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
        'reason' => 'Smoke leave management tutorial coverage.',
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
        'submitted_by' => 'Codex Smoke Leave Management',
      ]
    );

    $assignment = \\App\\Models\\LeaveAssignment::updateOrCreate(
      [
        'user_id' => $assignee->id,
        'year' => (int) now()->format('Y'),
        'leave_type' => 'Annual Leave',
      ],
      [
        'entitlement' => 14,
        'used' => 2,
        'pending' => 1,
      ]
    );

    echo json_encode([
      'routeKey' => $user->id . '::' . $record->id,
      'assignmentId' => $assignment->id,
    ]);
  `)

  return JSON.parse(String(output || '').trim())
}

const loginAsLeaveManagementUser = async (page) => {
  await loginThroughApi(page, {
    email: leaveManagementEmail,
    password: smokePassword,
  })
  await waitForAuthenticatedShell(page, {
    heading: /Leave Management|Set Leaves|Set Leave/i,
    route: '/staff/leave-management/set-holidays',
    timeout: 30000,
  })
}

test.beforeAll(() => {
  ensureLeaveManagementUser()
  ensureLeaveManagementFixture()
})

test.afterAll(() => {
  resetLeaveManagementTourState()
  resetLeaveManagementFixtures()
})

test('Leave Management quick tour starts from the canonical leaves prompt', async ({ page }) => {
  await loginAsLeaveManagementUser(page)
  await goToRouteAndWaitForModule(page, {
    route: '/staff/leave-management/leaves',
    moduleSelector: leaveManagementModuleAnchor,
  })
  await expect(page.getByText('Start Leave Management tutorial?')).toBeVisible()
  await page.getByRole('button', { name: 'Start tutorial' }).click()

  const tooltip = page.locator('.onboarding-tour-tooltip')
  await expect(page.getByRole('dialog', { name: 'Leave management workspace' })).toBeVisible()
  await expect(tooltip.getByText('Step 1 of 4', { exact: true })).toBeVisible()

  const steps = [
    ['Leave management sections', 'Step 2 of 4'],
    ['Leave records', 'Step 3 of 4'],
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

test('Leave Management quick tour replays in place on set-leaves', async ({ page }) => {
  const fixture = ensureLeaveManagementFixture()
  expect(fixture.assignmentId).toBeTruthy()

  await loginAsLeaveManagementUser(page)
  await startReplayTour(page, {
    eventName: leaveManagementReplayEvent,
    source: 'tutorial_hub',
    route: '/staff/leave-management/set-leaves',
    moduleSelector: leaveManagementModuleAnchor,
  })

  const tooltip = page.locator('.onboarding-tour-tooltip')
  await expect(page.getByRole('dialog', { name: 'Leave management workspace' })).toBeVisible()
  await expect(page).toHaveURL(/\/staff\/leave-management\/set-leaves$/)
  await expect(page.getByText('Step 1 of 5', { exact: true })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Leave management sections' })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Leave entitlements' })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Existing assignments' })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  const assignmentCreateDialog = page.getByRole('dialog', { name: 'Assign entitlement' })
  await expect(assignmentCreateDialog).toBeVisible()
  await assignmentCreateDialog.getByRole('button', { name: 'Open assignment form' }).click()
  await expect(page.locator('[data-tour-id="leave-management-assignment-form"]')).toBeVisible()
  await expect(tooltip.getByText('Step 1 of 3', { exact: true })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Assignment activity' })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  const closeFormDialog = page.getByRole('dialog', { name: 'Return to assignments' })
  await expect(closeFormDialog).toBeVisible()
  await closeFormDialog.getByRole('button', { name: 'Close assignment form' }).click()
  const detailActionDialog = page.getByRole('dialog', { name: 'Open assignment detail' })
  await expect(detailActionDialog).toBeVisible()
  await detailActionDialog.getByRole('button', { name: 'Open assignment detail' }).click()
  await expect(page.getByRole('dialog', { name: 'Assignment detail shell' })).toBeVisible()
})

test('Leave Management quick tour replays in place on set-holidays', async ({ page }) => {
  await loginAsLeaveManagementUser(page)
  await startReplayTour(page, {
    eventName: leaveManagementReplayEvent,
    source: 'tutorial_hub',
    route: '/staff/leave-management/set-holidays',
    moduleSelector: leaveManagementModuleAnchor,
  })

  const tooltip = page.locator('.onboarding-tour-tooltip')
  await expect(page.getByRole('dialog', { name: 'Leave management workspace' })).toBeVisible()
  await expect(page).toHaveURL(/\/staff\/leave-management\/set-holidays$/)
  await expect(tooltip.getByText('Step 1 of 3', { exact: true })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Leave management sections' })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Holiday calendar' })).toBeVisible()
})

test('Leave Management quick tour replays in place on rules', async ({ page }) => {
  await loginAsLeaveManagementUser(page)
  await startReplayTour(page, {
    eventName: leaveManagementReplayEvent,
    source: 'tutorial_hub',
    route: '/staff/leave-management/rules',
    moduleSelector: leaveManagementModuleAnchor,
  })

  const tooltip = page.locator('.onboarding-tour-tooltip')
  await expect(page.getByRole('dialog', { name: 'Leave management workspace' })).toBeVisible()
  await expect(page).toHaveURL(/\/staff\/leave-management\/rules$/)
  await expect(tooltip.getByText('Step 1 of 3', { exact: true })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Leave management sections' })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Leave workflow rules' })).toBeVisible()
})

test('Leave Management quick tour replays in place on record detail', async ({ page }) => {
  const fixture = ensureLeaveManagementFixture()
  expect(fixture.routeKey).toBeTruthy()

  const route = `/staff/leave-management/record/${encodeURIComponent(fixture.routeKey)}`
  await loginAsLeaveManagementUser(page)
  await startReplayTour(page, {
    eventName: leaveManagementReplayEvent,
    source: 'tutorial_hub',
    route,
    moduleSelector: leaveManagementModuleAnchor,
  })

  const tooltip = page.locator('.onboarding-tour-tooltip')
  await expect(page.getByRole('dialog', { name: 'Leave management workspace' })).toBeVisible()
  await expect(page).toHaveURL(route)
  await expect(page.locator('[data-tour-id="leave-management-detail"]')).toBeVisible()
  await expect(tooltip.getByText('Step 1 of 2', { exact: true })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Leave record detail' })).toBeVisible()
})
