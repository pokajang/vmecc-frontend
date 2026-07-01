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
const teamDirectoryEmail = 'codex.smoke.team-directory@vmecc.local'
const smokePassword = 'SmokeTrt!2026'
const smokeTeamName = 'Codex Smoke Team Alpha'
const teamDirectoryReplayEvent = 'vmecc:onboarding:team-directory-tour-replay'
const teamDirectoryModuleAnchor = '[data-tour-id="team-directory-module"]'

test.describe.configure({ timeout: 120000 })

const runTinker = (code) =>
  execFileSync('php', ['artisan', 'tinker', '--execute', code], {
    cwd: backendDir,
    encoding: 'utf8',
    stdio: 'pipe',
  })

const resetTeamDirectoryTourState = () => {
  runTinker(`
    $user = \\App\\Models\\User::where('email', '${teamDirectoryEmail}')->first();
    if ($user) {
      \\App\\Models\\UserOnboardingState::where('user_id', $user->id)
        ->where('key', 'team_directory_quick_tour')
        ->delete();
    }
  `)
}

const resetTeamDirectoryFixtures = () => {
  runTinker(`
    $team = \\App\\Models\\Team::where('name', '${smokeTeamName}')->first();
    if ($team) {
      \\App\\Models\\TeamMember::query()->where('team_id', $team->id)->delete();
      $team->delete();
    }
  `)
}

const ensureTeamDirectoryUser = () => {
  runTinker(`
    $user = \\App\\Models\\User::withTrashed()->firstOrNew(['email' => '${teamDirectoryEmail}']);
    if ($user->exists && method_exists($user, 'restore') && $user->trashed()) {
      $user->restore();
    }
    $user->fill([
      'name' => 'Codex Smoke Team Directory',
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
        ->whereIn('name', ['teams.view', 'teams.manage', 'self.dashboard'])
        ->pluck('name')
        ->all();
      $user->syncPermissions($permissions);
    }
    \\App\\Models\\UserOnboardingState::where('user_id', $user->id)
      ->where('key', 'team_directory_quick_tour')
      ->delete();
  `)
}

const ensureTeamDirectoryFixture = () => {
  const output = runTinker(`
    $team = \\App\\Models\\Team::updateOrCreate(
      ['name' => '${smokeTeamName}'],
      [
        'group' => 'Default',
        'status' => 'active',
        'lead_name' => 'Codex Team Lead',
      ]
    );

    echo json_encode([
      'teamId' => $team->id,
    ]);
  `)

  return JSON.parse(String(output || '').trim())
}

const loginAsTeamDirectoryUser = async (page) => {
  await loginThroughApi(page, {
    email: teamDirectoryEmail,
    password: smokePassword,
  })
  await waitForAuthenticatedShell(page)
}

test.beforeAll(() => {
  ensureTeamDirectoryUser()
  ensureTeamDirectoryFixture()
})

test.afterAll(() => {
  resetTeamDirectoryTourState()
  resetTeamDirectoryFixtures()
})

test('Team Directory quick tour starts from the canonical list prompt and opens the create modal subset', async ({
  page,
}) => {
  await loginAsTeamDirectoryUser(page)
  await goToRouteAndWaitForModule(page, {
    route: '/team/details',
    moduleSelector: teamDirectoryModuleAnchor,
  })

  await expect(page.getByText('Start Team Directory tutorial?')).toBeVisible()
  await page.getByRole('button', { name: 'Start tutorial' }).click()

  const tooltip = page.locator('.onboarding-tour-tooltip')
  await expect(page.getByRole('dialog', { name: 'Team directory workspace' })).toBeVisible()
  await expect(tooltip.getByText('Step 1 of 4', { exact: true })).toBeVisible()

  const listSteps = [
    ['Team records', 'Step 2 of 4'],
    ['Team cards', 'Step 3 of 4'],
    ['Add team', 'Step 4 of 4'],
  ]

  for (const [title, progress] of listSteps) {
    await tooltip.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('dialog', { name: title })).toBeVisible()
    await expect(tooltip.getByText(progress, { exact: true })).toBeVisible()
  }

  await tooltip.getByRole('button', { name: 'Open create team modal' }).click()
  await expect(page.locator('[data-tour-id="team-directory-create-modal"]')).toBeVisible()
  await expect(tooltip.getByText('Step 1 of 3', { exact: true })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Default team picks' })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Custom team names' })).toBeVisible()
})

test('Team Directory quick tour replays in place on team detail and opens the edit and delete shells', async ({
  page,
}) => {
  const fixture = ensureTeamDirectoryFixture()
  expect(fixture.teamId).toBeTruthy()

  await loginAsTeamDirectoryUser(page)
  await startReplayTour(page, {
    eventName: teamDirectoryReplayEvent,
    source: 'tutorial_hub',
    route: `/team/details/${fixture.teamId}`,
    moduleSelector: teamDirectoryModuleAnchor,
  })

  const tooltip = page.locator('.onboarding-tour-tooltip')
  await expect(page.getByRole('dialog', { name: 'Team directory workspace' })).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`/team/details/${fixture.teamId}$`))
  await expect(tooltip.getByText('Step 1 of 3', { exact: true })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Team detail' })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Edit team' })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Open edit team modal' }).click()

  await expect(page.locator('[data-tour-id="team-directory-edit-modal"]')).toBeVisible()
  await expect(tooltip.getByText('Step 1 of 4', { exact: true })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Members editor' })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Team image' })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Delete team shell' })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Open delete team modal' }).click()
  await expect(page.locator('[data-tour-id="team-directory-delete-modal"]')).toBeVisible()
})
