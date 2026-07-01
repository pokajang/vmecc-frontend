const { execFileSync } = require('node:child_process')
const path = require('node:path')
const { expect, test } = require('@playwright/test')
const {
  goToRouteAndWaitForModule,
  loginThroughApi,
  startReplayTour,
} = require('./_helpers/onboardingTestHelpers')

const backendDir = path.resolve(process.cwd(), '..', 'vmecc-backend')
const rosterManagementEmail = 'codex.smoke.roster-management@vmecc.local'
const smokePassword = 'SmokeTrt!2026'
const smokeRosterTeamName = 'Codex Smoke Roster Team'
const rosterManagementReplayEvent = 'vmecc:onboarding:roster-management-tour-replay'
const rosterManagementModuleAnchor = '[data-tour-id="roster-management-module"]'

test.describe.configure({ timeout: 120000 })

const runTinker = (code) =>
  execFileSync('php', ['artisan', 'tinker', '--execute', code], {
    cwd: backendDir,
    encoding: 'utf8',
    stdio: 'pipe',
  })

const resetRosterManagementTourState = () => {
  runTinker(`
    $user = \\App\\Models\\User::where('email', '${rosterManagementEmail}')->first();
    if ($user) {
      \\App\\Models\\UserOnboardingState::where('user_id', $user->id)
        ->where('key', 'roster_management_quick_tour')
        ->delete();
    }
  `)
}

const resetRosterManagementFixtures = () => {
  runTinker(`
    $date = now()->startOfMonth()->toDateString();
    \\App\\Models\\Roster::query()->where('date', $date)->delete();
    $team = \\App\\Models\\Team::where('name', '${smokeRosterTeamName}')->first();
    if ($team) {
      \\App\\Models\\TeamMember::query()->where('team_id', $team->id)->delete();
      $team->delete();
    }
  `)
}

const ensureRosterManagementUser = () => {
  runTinker(`
    $user = \\App\\Models\\User::withTrashed()->firstOrNew(['email' => '${rosterManagementEmail}']);
    if ($user->exists && method_exists($user, 'restore') && $user->trashed()) {
      $user->restore();
    }
    $user->fill([
      'name' => 'Codex Smoke Roster Management',
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
        ->whereIn('name', ['rosters.manage', 'teams.view', 'self.dashboard'])
        ->pluck('name')
        ->all();
      $user->syncPermissions($permissions);
    }
    \\App\\Models\\UserOnboardingState::where('user_id', $user->id)
      ->where('key', 'roster_management_quick_tour')
      ->delete();
  `)
}

const ensureRosterManagementFixture = () => {
  const output = runTinker(`
    $team = \\App\\Models\\Team::updateOrCreate(
      ['name' => '${smokeRosterTeamName}'],
      [
        'group' => 'Default',
        'status' => 'active',
      ]
    );

    $date = now()->startOfMonth()->toDateString();

    \\App\\Models\\Roster::updateOrCreate(
      [
        'date' => $date,
        'shift' => 'day',
      ],
      [
        'team_id' => $team->id,
        'status' => 'published',
      ]
    );

    \\App\\Models\\Roster::query()
      ->where('date', $date)
      ->where('shift', 'night')
      ->delete();

    echo json_encode([
      'teamId' => $team->id,
      'date' => $date,
    ]);
  `)

  return JSON.parse(String(output || '').trim())
}

const loginAsRosterManagementUser = async (page) => {
  await loginThroughApi(page, {
    email: rosterManagementEmail,
    password: smokePassword,
  })
}

const dismissNotificationsDialogIfPresent = async (page) => {
  const notificationsDialog = page.locator(
    '.notification-drawer.show[role="dialog"][aria-label="Notifications"]',
  )
  const closeButton = notificationsDialog.getByRole('button', { name: 'Close' })
  const hasDialog = await notificationsDialog.isVisible({ timeout: 1500 }).catch(() => false)

  if (hasDialog) {
    await closeButton.click()
    await expect(notificationsDialog).not.toBeVisible()
  }
}

const waitForRosterScheduleReady = async (page) => {
  await expect(page.locator('[data-tour-id="roster-management-read-actions"]')).toBeVisible({
    timeout: 30000,
  })
  await expect(page.getByRole('button', { name: 'Edit Roster' })).toBeEnabled({ timeout: 30000 })
}

const waitForRosterGridToMount = async (page) => {
  await expect
    .poll(async () => page.locator('[data-tour-id="roster-management-grid"] select').count(), {
      timeout: 30000,
    })
    .toBeGreaterThan(0)
}

const waitForRosterMobileEditorActions = async (page) => {
  await expect
    .poll(async () => page.getByRole('button', { name: 'Change' }).count(), {
      timeout: 30000,
    })
    .toBeGreaterThan(0)
}

const getFirstAssignedRosterSelectIndex = async (page) =>
  page
    .locator('[data-tour-id="roster-management-grid"] select')
    .evaluateAll((elements) => elements.findIndex((element) => element.value !== ''))

test.beforeAll(() => {
  ensureRosterManagementUser()
  ensureRosterManagementFixture()
})

test.afterAll(() => {
  resetRosterManagementTourState()
  resetRosterManagementFixtures()
})

test('Roster Management quick tour starts from the canonical overview prompt', async ({ page }) => {
  await loginAsRosterManagementUser(page)
  await goToRouteAndWaitForModule(page, {
    route: '/roster/overview',
    moduleSelector: rosterManagementModuleAnchor,
  })
  await dismissNotificationsDialogIfPresent(page)

  await expect(page.getByText('Start Roster Management tutorial?')).toBeVisible({
    timeout: 30000,
  })
  await page.getByRole('button', { name: 'Start tutorial' }).click()

  const tooltip = page.locator('.onboarding-tour-tooltip')
  await expect(page.getByRole('dialog', { name: 'Roster management workspace' })).toBeVisible()
  await expect(tooltip.getByText('Step 1 of 3', { exact: true })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Roster sections' })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Coverage overview' })).toBeVisible()
})

test('Roster Management quick tour replays on schedule and opens the publish modal shell', async ({
  page,
}) => {
  await loginAsRosterManagementUser(page)
  ensureRosterManagementFixture()
  await goToRouteAndWaitForModule(page, {
    route: '/roster/schedule',
    moduleSelector: rosterManagementModuleAnchor,
  })
  await waitForRosterScheduleReady(page)
  await dismissNotificationsDialogIfPresent(page)
  await startReplayTour(page, {
    eventName: rosterManagementReplayEvent,
    source: 'tutorial_hub',
  })

  const tooltip = page.locator('.onboarding-tour-tooltip')
  await expect(page.getByRole('dialog', { name: 'Roster management workspace' })).toBeVisible()
  await expect(page).toHaveURL(/\/roster\/schedule$/)
  await expect(tooltip.getByText('Step 1 of 6', { exact: true })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Roster sections' })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Roster schedule' })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Schedule filters' })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Read-only actions' })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Edit roster' })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Open roster editor' }).click()

  await expect(page.getByRole('dialog', { name: 'Editor actions' })).toBeVisible()
  await expect(tooltip.getByText('Step 1 of 5', { exact: true })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Editable assignment surface' })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Save draft' })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Cancel edit shell' })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Publish shell' })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Open publish dialog' }).click()
  await expect(page.locator('[data-tour-id="roster-management-publish-modal"]')).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Publish modal shell' })).toBeVisible()
})

test('Roster Management quick tour replays when the discard modal is already open', async ({
  page,
}) => {
  ensureRosterManagementFixture()
  await loginAsRosterManagementUser(page)
  await goToRouteAndWaitForModule(page, {
    route: '/roster/schedule',
    moduleSelector: rosterManagementModuleAnchor,
  })
  await waitForRosterScheduleReady(page)
  await dismissNotificationsDialogIfPresent(page)

  await expect(page.getByRole('button', { name: 'Edit Roster' })).toBeEnabled({ timeout: 30000 })
  await page.getByRole('button', { name: 'Edit Roster' }).click()
  await expect(page.locator('[data-tour-id="roster-management-edit-actions"]')).toBeVisible()
  await waitForRosterGridToMount(page)
  const assignedSelectIndex = await getFirstAssignedRosterSelectIndex(page)
  expect(assignedSelectIndex).toBeGreaterThanOrEqual(0)
  const assignedSelect = page
    .locator('[data-tour-id="roster-management-grid"] select')
    .nth(assignedSelectIndex)
  await expect(assignedSelect).toBeVisible()
  await assignedSelect.selectOption('')
  await page.locator('[data-tour-id="roster-management-cancel-action"]').click()
  await expect(page.locator('[data-tour-id="roster-management-cancel-modal"]')).toBeVisible()

  await startReplayTour(page, {
    eventName: rosterManagementReplayEvent,
    source: 'tutorial_hub',
  })

  const tooltip = page.locator('.onboarding-tour-tooltip')
  await expect(page.getByRole('dialog', { name: 'Roster management workspace' })).toBeVisible()
  for (const title of [
    'Roster sections',
    'Roster schedule',
    'Schedule filters',
    'Editor actions',
    'Editable assignment surface',
    'Save draft',
    'Cancel edit shell',
    'Publish shell',
  ]) {
    await tooltip.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('dialog', { name: title })).toBeVisible()
  }
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Discard changes modal' })).toBeVisible()
})

test('Roster Management quick tour uses the mobile editor fallback when the offcanvas is open', async ({
  page,
}) => {
  ensureRosterManagementFixture()
  await page.setViewportSize({ width: 390, height: 844 })
  await loginAsRosterManagementUser(page)
  await goToRouteAndWaitForModule(page, {
    route: '/roster/schedule',
    moduleSelector: rosterManagementModuleAnchor,
  })
  await waitForRosterScheduleReady(page)
  await dismissNotificationsDialogIfPresent(page)

  await expect(page.getByRole('button', { name: 'Edit Roster' })).toBeEnabled({ timeout: 30000 })
  await page.getByRole('button', { name: 'Edit Roster' }).click()
  await expect(page.locator('[data-tour-id="roster-management-edit-actions"]')).toBeVisible()
  await waitForRosterMobileEditorActions(page)
  await expect(page.getByRole('button', { name: 'Change' }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Change' }).first().click()
  await expect(page.locator('[data-tour-id="roster-management-mobile-editor"]')).toBeVisible()

  await startReplayTour(page, {
    eventName: rosterManagementReplayEvent,
    source: 'tutorial_hub',
  })

  const tooltip = page.locator('.onboarding-tour-tooltip')
  await expect(page.getByRole('dialog', { name: 'Roster management workspace' })).toBeVisible()
  for (const title of [
    'Roster sections',
    'Roster schedule',
    'Schedule filters',
    'Editor actions',
  ]) {
    await tooltip.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('dialog', { name: title })).toBeVisible()
  }
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Editable assignment surface' })).toBeVisible()
})
