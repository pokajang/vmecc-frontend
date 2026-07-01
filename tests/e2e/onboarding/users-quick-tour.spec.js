const { execFileSync } = require('node:child_process')
const path = require('node:path')
const { expect, test } = require('@playwright/test')
const {
  goToRouteAndWaitForModule,
  loginThroughApi,
  startReplayTour,
  waitForAuthenticatedShell,
  waitForModuleAnchor,
} = require('./_helpers/onboardingTestHelpers')

const backendDir = path.resolve(process.cwd(), '..', 'vmecc-backend')
const usersAdminEmail = 'codex.smoke.users-admin@vmecc.local'
const usersDetailTargetEmail = 'codex.smoke.users-detail-target@vmecc.local'
const smokePassword = 'SmokeTrt!2026'
const usersRequestEvent = 'vmecc:onboarding:users-quick-tour-requested'
const usersReplayEvent = 'vmecc:onboarding:users-tour-replay'
const usersModuleSelector = '[data-tour-id="users-module"]'
const usersProfileSelector = '[data-tour-id="users-profile-entry"]'

test.describe.configure({ timeout: 120000 })

const runTinker = (code) =>
  execFileSync('php', ['artisan', 'tinker', '--execute', code], {
    cwd: backendDir,
    encoding: 'utf8',
    stdio: 'pipe',
  })

const ensureUsersAdmin = () => {
  runTinker(`
    $user = \\App\\Models\\User::withTrashed()->firstOrNew(['email' => '${usersAdminEmail}']);
    if ($user->exists && method_exists($user, 'restore') && $user->trashed()) {
      $user->restore();
    }
    $user->fill([
      'name' => 'Codex Smoke Users Admin',
      'status' => 'active',
      'password' => '${smokePassword}',
    ]);
    $user->save();
    if (method_exists($user, 'syncRoles')) {
      $user->syncRoles([]);
    }
    if (method_exists($user, 'syncPermissions')) {
      $permissions = \\Spatie\\Permission\\Models\\Permission::query()
        ->whereIn('name', ['users.manage', 'self.dashboard'])
        ->pluck('name')
        ->all();
      $user->syncPermissions($permissions);
    }
    \\App\\Models\\UserOnboardingState::where('user_id', $user->id)
      ->where('key', 'users_quick_tour')
      ->delete();
  `)
}

const ensureUsersProfileTarget = () => {
  const output = runTinker(`
    $user = \\App\\Models\\User::withTrashed()->firstOrNew([
      'email' => '${usersDetailTargetEmail}',
    ]);
    if ($user->exists && method_exists($user, 'restore') && $user->trashed()) {
      $user->restore();
    }
    $user->fill([
      'name' => 'Codex Smoke Users Detail Target',
      'status' => 'active',
      'password' => '${smokePassword}',
    ]);
    $user->save();

    if (method_exists($user, 'syncRoles')) {
      $user->syncRoles([]);
    }

    echo json_encode([
      'id' => (int) $user->id,
      'slug' => \\Illuminate\\Support\\Str::slug($user->name),
    ]);
  `)

  return JSON.parse(String(output || '').trim())
}

const resetUsersTourState = () => {
  runTinker(`
    $emails = ['${usersAdminEmail}', '${usersDetailTargetEmail}'];
    $users = \\App\\Models\\User::whereIn('email', $emails)->get();
    foreach ($users as $user) {
      \\App\\Models\\UserOnboardingState::where('user_id', $user->id)
        ->where('key', 'users_quick_tour')
        ->delete();
    }
  `)
}

const loginAsUsersAdmin = async (page) => {
  await loginThroughApi(page, {
    email: usersAdminEmail,
    password: smokePassword,
  })
  await waitForAuthenticatedShell(page)
}

const launchUsersTourFromOutside = async (page) => {
  await waitForAuthenticatedShell(page)
  await page.evaluate(
    ({ eventName }) => {
      window.dispatchEvent(
        new CustomEvent(eventName, {
          detail: {
            source: 'tutorial_hub',
          },
        }),
      )
    },
    {
      eventName: usersRequestEvent,
    },
  )

  await expect(page).toHaveURL('/admin/users')
  await waitForModuleAnchor(page, usersModuleSelector)
}

let usersProfileTarget = { id: null, slug: '' }

test.beforeAll(() => {
  ensureUsersAdmin()
  usersProfileTarget = ensureUsersProfileTarget()
})

test.afterAll(() => {
  resetUsersTourState()
})

test('Users quick tour launches from hub on a non-users route and completes the list subset', async ({
  page,
}) => {
  await loginThroughApi(page, {
    email: usersAdminEmail,
    password: smokePassword,
  })
  await waitForAuthenticatedShell(page)

  await launchUsersTourFromOutside(page)

  const tooltip = page.locator('.onboarding-tour-tooltip')
  await expect(page.getByRole('dialog', { name: 'User management workspace' })).toBeVisible()
  await expect(tooltip.getByText('Step 1 of 5', { exact: true })).toBeVisible()

  const steps = [
    ['User management sections', 'Step 2 of 5'],
    ['User list', 'Step 3 of 5'],
    ['Search and filters', 'Step 4 of 5'],
    ['Create a user', 'Step 5 of 5'],
  ]

  for (const [title, progress] of steps) {
    await tooltip.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('dialog', { name: title })).toBeVisible()
    await expect(tooltip.getByText(progress, { exact: true })).toBeVisible()
  }

  await tooltip.getByRole('button', { name: 'Done' }).click()
  await expect(tooltip).toHaveCount(0)
})

test('Users quick tour replays in place on profile detail route', async ({ page }) => {
  await loginAsUsersAdmin(page)
  expect(usersProfileTarget?.id).toBeTruthy()

  const detailRoute = `/admin/users/${usersProfileTarget.id}/${usersProfileTarget.slug}`
  await goToRouteAndWaitForModule(page, {
    route: detailRoute,
    moduleSelector: usersModuleSelector,
  })
  await expect(page.locator(usersProfileSelector)).toBeVisible()

  await startReplayTour(page, {
    eventName: usersReplayEvent,
    route: detailRoute,
    moduleSelector: usersModuleSelector,
  })

  const tooltip = page.locator('.onboarding-tour-tooltip')
  await expect(page.getByRole('dialog', { name: 'User management workspace' })).toBeVisible()
  await expect(page).toHaveURL(detailRoute)
  await expect(tooltip.getByText('Step 1 of 2', { exact: true })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'User profile' })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Done' }).click()
})
