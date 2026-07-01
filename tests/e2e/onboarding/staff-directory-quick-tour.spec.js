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
const staffDirectoryViewerEmail = 'codex.smoke.staff-directory@vmecc.local'
const staffDirectoryManagerEmail = 'codex.smoke.staff-directory-manager@vmecc.local'
const activeProfileEmail = 'codex.smoke.staff-profile-active@vmecc.local'
const terminatedProfileEmail = 'codex.smoke.staff-profile-terminated@vmecc.local'
const smokePassword = 'SmokeTrt!2026'
const staffDirectoryReplayEvent = 'vmecc:onboarding:staff-directory-tour-replay'
const staffDirectoryModuleAnchor = '[data-tour-id="staff-directory-module"]'

test.describe.configure({ timeout: 120000 })

const runTinker = (code) =>
  execFileSync('php', ['artisan', 'tinker', '--execute', code], {
    cwd: backendDir,
    encoding: 'utf8',
    stdio: 'pipe',
  })

const resetStaffDirectoryTourState = () => {
  runTinker(`
    foreach (['${staffDirectoryViewerEmail}', '${staffDirectoryManagerEmail}'] as $email) {
      $user = \\App\\Models\\User::where('email', $email)->first();
      if ($user) {
        \\App\\Models\\UserOnboardingState::where('user_id', $user->id)
          ->where('key', 'staff_directory_quick_tour')
          ->delete();
      }
    }
  `)
}

const ensureStaffDirectoryUsers = () => {
  runTinker(`
    $viewer = \\App\\Models\\User::withTrashed()->firstOrNew(['email' => '${staffDirectoryViewerEmail}']);
    if ($viewer->exists && method_exists($viewer, 'restore') && $viewer->trashed()) {
      $viewer->restore();
    }
    $viewer->fill([
      'name' => 'Codex Smoke Staff Directory',
      'status' => 'active',
      'password' => '${smokePassword}',
      'team' => 'Directory Ops',
    ]);
    $viewer->save();
    if (method_exists($viewer, 'syncRoles')) {
      $viewer->syncRoles([]);
    }
    if (method_exists($viewer, 'syncPermissions')) {
      $permissions = \\Spatie\\Permission\\Models\\Permission::query()
        ->whereIn('name', ['staff.view', 'staff.manage', 'teams.view', 'self.dashboard'])
        ->pluck('name')
        ->all();
      $viewer->syncPermissions($permissions);
    }
    \\App\\Models\\UserOnboardingState::where('user_id', $viewer->id)
      ->where('key', 'staff_directory_quick_tour')
      ->delete();

    $manager = \\App\\Models\\User::withTrashed()->firstOrNew(['email' => '${staffDirectoryManagerEmail}']);
    if ($manager->exists && method_exists($manager, 'restore') && $manager->trashed()) {
      $manager->restore();
    }
    $manager->fill([
      'name' => 'Codex Smoke Staff Manager',
      'status' => 'active',
      'password' => '${smokePassword}',
      'team' => 'Directory Ops',
    ]);
    $manager->save();
    if (method_exists($manager, 'syncRoles')) {
      $manager->syncRoles([]);
    }
    if (method_exists($manager, 'syncPermissions')) {
      $permissions = \\Spatie\\Permission\\Models\\Permission::query()
        ->whereIn('name', ['staff.view', 'staff.manage', 'teams.view', 'users.manage', 'self.dashboard'])
        ->pluck('name')
        ->all();
      $manager->syncPermissions($permissions);
    }
    \\App\\Models\\UserOnboardingState::where('user_id', $manager->id)
      ->where('key', 'staff_directory_quick_tour')
      ->delete();

    $active = \\App\\Models\\User::withTrashed()->firstOrNew(['email' => '${activeProfileEmail}']);
    if ($active->exists && method_exists($active, 'restore') && $active->trashed()) {
      $active->restore();
    }
    $active->fill([
      'name' => 'Codex Active Profile',
      'status' => 'active',
      'password' => '${smokePassword}',
      'team' => 'Operations Alpha',
      'phone' => '0123456789',
    ]);
    $active->save();
    if (method_exists($active, 'syncRoles')) {
      $active->syncRoles([]);
    }
    if (method_exists($active, 'syncPermissions')) {
      $active->syncPermissions([]);
    }

    $terminated = \\App\\Models\\User::withTrashed()->firstOrNew(['email' => '${terminatedProfileEmail}']);
    if ($terminated->exists && method_exists($terminated, 'restore') && $terminated->trashed()) {
      $terminated->restore();
    }
    $terminated->fill([
      'name' => 'Codex Terminated Profile',
      'status' => 'inactive',
      'password' => '${smokePassword}',
      'team' => 'Operations Beta',
      'phone' => '0987654321',
    ]);
    $terminated->save();
    if (method_exists($terminated, 'syncRoles')) {
      $terminated->syncRoles([]);
    }
    if (method_exists($terminated, 'syncPermissions')) {
      $terminated->syncPermissions([]);
    }
    if (method_exists($terminated, 'delete')) {
      $terminated->delete();
    }
  `)
}

const ensureStaffDirectoryFixture = () => {
  const output = runTinker(`
    $active = \\App\\Models\\User::where('email', '${activeProfileEmail}')->firstOrFail();
    $terminated = \\App\\Models\\User::withTrashed()->where('email', '${terminatedProfileEmail}')->firstOrFail();

    echo json_encode([
      'activeId' => $active->id,
      'terminatedId' => $terminated->id,
    ]);
  `)

  return JSON.parse(String(output || '').trim())
}

const loginAsStaffDirectoryUser = async (page, email) => {
  await loginThroughApi(page, {
    email,
    password: smokePassword,
  })
  await waitForAuthenticatedShell(page)
}

test.beforeAll(() => {
  ensureStaffDirectoryUsers()
  ensureStaffDirectoryFixture()
})

test.afterAll(() => {
  resetStaffDirectoryTourState()
})

test('Staff Directory quick tour starts from the canonical list prompt', async ({ page }) => {
  await loginAsStaffDirectoryUser(page, staffDirectoryViewerEmail)
  await goToRouteAndWaitForModule(page, {
    route: '/staff/details',
    moduleSelector: staffDirectoryModuleAnchor,
  })

  await expect(page.getByText('Start Staff Directory tutorial?')).toBeVisible()
  await page.getByRole('button', { name: 'Start tutorial' }).click()

  const tooltip = page.locator('.onboarding-tour-tooltip')
  await expect(page.getByRole('dialog', { name: 'Staff directory workspace' })).toBeVisible()
  await expect(tooltip.getByText('Step 1 of 4', { exact: true })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Staff records' })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Filters and search' })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Directory list' })).toBeVisible()
})

test('Staff Directory quick tour replays on an active profile and opens the message modal path', async ({
  page,
}) => {
  const fixture = ensureStaffDirectoryFixture()
  await loginAsStaffDirectoryUser(page, staffDirectoryViewerEmail)
  await goToRouteAndWaitForModule(page, {
    route: `/staff/profile/${fixture.activeId}`,
    moduleSelector: staffDirectoryModuleAnchor,
    timeout: 60000,
  })
  await startReplayTour(page, {
    eventName: staffDirectoryReplayEvent,
    source: 'tutorial_hub',
  })

  const tooltip = page.locator('.onboarding-tour-tooltip')
  await expect(page.getByRole('dialog', { name: 'Staff directory workspace' })).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`/staff/profile/${fixture.activeId}$`))
  await expect(tooltip.getByText('Step 1 of 3', { exact: true })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Staff profile' })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Send message' })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Open message modal' }).click()
  await expect(page.locator('[data-tour-id="staff-directory-message-modal"]')).toBeVisible()
  await expect(tooltip.getByText('Step 1 of 2', { exact: true })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Message composer' })).toBeVisible()
})

test('Staff Directory quick tour replays on an active profile for managers and opens the terminate modal shell', async ({
  page,
}) => {
  const fixture = ensureStaffDirectoryFixture()
  await loginAsStaffDirectoryUser(page, staffDirectoryManagerEmail)
  await startReplayTour(page, {
    eventName: staffDirectoryReplayEvent,
    source: 'tutorial_hub',
    route: `/staff/profile/${fixture.activeId}`,
    moduleSelector: staffDirectoryModuleAnchor,
  })

  const tooltip = page.locator('.onboarding-tour-tooltip')
  await expect(page.getByRole('dialog', { name: 'Staff directory workspace' })).toBeVisible()
  await expect(tooltip.getByText('Step 1 of 4', { exact: true })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Staff profile' })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'More profile actions' })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Terminate staff shell' })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Open terminate modal' }).click()
  await expect(page.locator('body')).toContainText('Terminate Staff')
})

test('Staff Directory quick tour replays on a terminated profile and opens the rehire modal shell', async ({
  page,
}) => {
  const fixture = ensureStaffDirectoryFixture()
  await loginAsStaffDirectoryUser(page, staffDirectoryManagerEmail)
  await startReplayTour(page, {
    eventName: staffDirectoryReplayEvent,
    source: 'tutorial_hub',
    route: `/staff/profile/${fixture.terminatedId}`,
    moduleSelector: staffDirectoryModuleAnchor,
  })

  const tooltip = page.locator('.onboarding-tour-tooltip')
  await expect(page.getByRole('dialog', { name: 'Staff directory workspace' })).toBeVisible()
  await expect(tooltip.getByText('Step 1 of 3', { exact: true })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Staff profile' })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Rehire staff shell' })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Open rehire modal' }).click()
  await expect(page.locator('body')).toContainText('Rehire Staff')
})
