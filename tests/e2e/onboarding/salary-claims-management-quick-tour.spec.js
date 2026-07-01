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
const salaryClaimsManagementEmail = 'codex.smoke.salary-claims-management@vmecc.local'
const smokePassword = 'SmokeTrt!2026'
const salaryClaimsManagementReplayEvent = 'vmecc:onboarding:salary-claims-management-tour-replay'
const smokeClaimDisplayId = 'CLM-MGMT-SMOKE-2026-001'
const smokeSalaryDisplayId = 'CLM-MGMT-SALARY-2026-001'

test.describe.configure({ timeout: 120000 })

const runTinker = (code) =>
  execFileSync('php', ['artisan', 'tinker', '--execute', code], {
    cwd: backendDir,
    encoding: 'utf8',
    stdio: 'pipe',
  })

const salaryClaimsManagementModuleAnchor = '[data-tour-id="salary-claims-management-module"]'

const resetSalaryClaimsManagementTourState = () => {
  runTinker(`
    $user = \\App\\Models\\User::where('email', '${salaryClaimsManagementEmail}')->first();
    if ($user) {
      \\App\\Models\\UserOnboardingState::where('user_id', $user->id)
        ->where('key', 'salary_claims_management_quick_tour')
        ->delete();
    }
  `)
}

const resetSalaryClaimsManagementFixtures = () => {
  runTinker(`
    $user = \\App\\Models\\User::where('email', '${salaryClaimsManagementEmail}')->first();
    if ($user) {
      $claimIds = \\App\\Models\\PayrollClaim::withTrashed()
        ->where('user_id', $user->id)
        ->whereIn('display_id', ['${smokeClaimDisplayId}', '${smokeSalaryDisplayId}'])
        ->pluck('id');
      if ($claimIds->isNotEmpty()) {
        \\App\\Models\\PayrollClaimItem::whereIn('payroll_claim_id', $claimIds)->delete();
      }
      \\App\\Models\\PayrollClaim::withTrashed()
        ->where('user_id', $user->id)
        ->whereIn('display_id', ['${smokeClaimDisplayId}', '${smokeSalaryDisplayId}'])
        ->forceDelete();
    }
  `)
}

const ensureSalaryClaimsManagementUser = () => {
  runTinker(`
    $user = \\App\\Models\\User::withTrashed()->firstOrNew(['email' => '${salaryClaimsManagementEmail}']);
    if ($user->exists && method_exists($user, 'restore') && $user->trashed()) {
      $user->restore();
    }
    $user->fill([
      'name' => 'Codex Smoke Salary Claims Management',
      'status' => 'active',
      'password' => '${smokePassword}',
    ]);
    $user->save();
    if (method_exists($user, 'syncRoles')) {
      $user->syncRoles([]);
    }
    if (method_exists($user, 'syncPermissions')) {
      $permissions = \\Spatie\\Permission\\Models\\Permission::query()
        ->whereIn('name', ['staff.salary.manage', 'self.dashboard'])
        ->pluck('name')
        ->all();
      $user->syncPermissions($permissions);
    }
    \\App\\Models\\UserOnboardingState::where('user_id', $user->id)
      ->where('key', 'salary_claims_management_quick_tour')
      ->delete();
  `)
}

const ensureSalaryClaimsManagementFixtures = () => {
  const output = runTinker(`
    $user = \\App\\Models\\User::where('email', '${salaryClaimsManagementEmail}')->firstOrFail();

    $expenseClaim = \\App\\Models\\PayrollClaim::updateOrCreate(
      [
        'user_id' => $user->id,
        'display_id' => '${smokeClaimDisplayId}',
      ],
      [
        'submission_key' => 'smoke-management-expense',
        'claim_type' => 'expense',
        'category' => 'Travel',
        'period' => 'March 2026',
        'period_value' => '2026-03',
        'amount' => 120.50,
        'status' => 'Pending',
        'submitted_at' => now()->subDay(),
        'submitted_by' => $user->name,
        'submitted_by_name' => $user->name,
        'updated_by' => $user->name,
        'updated_by_name' => $user->name,
        'workflow_stage' => 'review',
        'workflow_snapshot' => [
          'reviewRole' => 'Manager',
          'recommendRole' => 'Manager',
          'approveRole' => 'Finance',
          'requireRecommendation' => false,
        ],
        'next_action_role' => 'Manager',
        'approval_history' => [],
        'notes' => 'Smoke salary claims management coverage.',
      ]
    );

    \\App\\Models\\PayrollClaimItem::query()->updateOrCreate(
      [
        'payroll_claim_id' => $expenseClaim->id,
        'line_no' => 1,
      ],
      [
        'item_type' => 'Expense',
        'title' => 'Travel reimbursement',
        'claim_date' => '2026-03-18',
        'amount' => 120.50,
        'notes' => 'Smoke expense item',
        'item_meta' => ['category' => 'Travel'],
      ]
    );

    $salaryClaim = \\App\\Models\\PayrollClaim::updateOrCreate(
      [
        'user_id' => $user->id,
        'display_id' => '${smokeSalaryDisplayId}',
      ],
      [
        'submission_key' => 'smoke-management-salary',
        'claim_type' => 'salary',
        'category' => 'Salary Claim',
        'period' => 'March 2026',
        'period_value' => '2026-03',
        'amount' => 3385.80,
        'approved_overtime_payout' => 120.00,
        'adjustments_total' => 0.00,
        'projected_net_payout' => 3385.80,
        'status' => 'Approved',
        'submitted_at' => now()->subDays(2),
        'submitted_by' => $user->name,
        'submitted_by_name' => $user->name,
        'updated_by' => $user->name,
        'updated_by_name' => $user->name,
        'workflow_stage' => 'done',
        'workflow_snapshot' => [],
        'next_action_role' => null,
        'approval_history' => [[
          'action' => 'Approved',
          'at' => now()->subDay()->toIso8601String(),
        ]],
        'payroll_snapshot' => [
          'basic' => 3200,
          'allowance' => 450,
          'gross' => 3650,
          'totalDeductions' => 384.2,
          'net' => 3265.8,
        ],
        'payment_date' => '2026-03-28',
        'notes' => 'Smoke salary record coverage.',
      ]
    );

    echo json_encode([
      'detailClaimId' => $expenseClaim->id,
      'salaryClaimId' => $salaryClaim->id,
    ]);
  `)

  return JSON.parse(String(output || '').trim())
}

const loginAsSalaryClaimsManagementUser = async (page) => {
  await loginThroughApi(page, {
    email: salaryClaimsManagementEmail,
    password: smokePassword,
  })
  await waitForAuthenticatedShell(page)
}

test.beforeAll(() => {
  ensureSalaryClaimsManagementUser()
  ensureSalaryClaimsManagementFixtures()
})

test.afterAll(() => {
  resetSalaryClaimsManagementTourState()
  resetSalaryClaimsManagementFixtures()
})

test('Salary Claims Management quick tour starts from the canonical claims prompt', async ({
  page,
}) => {
  await loginAsSalaryClaimsManagementUser(page)
  await goToRouteAndWaitForModule(page, {
    route: '/staff/salary-claims/claims',
    moduleSelector: salaryClaimsManagementModuleAnchor,
  })
  await expect(page.getByText('Start Salary Claims Management tutorial?')).toBeVisible()
  await page.getByRole('button', { name: 'Start tutorial' }).click()

  const tooltip = page.locator('.onboarding-tour-tooltip')
  await expect(
    page.getByRole('dialog', { name: 'Salary claims management workspace' }),
  ).toBeVisible()
  await expect(tooltip.getByText('Step 1 of 4', { exact: true })).toBeVisible()

  const steps = [
    ['Salary claims sections', 'Step 2 of 4'],
    ['Claim records', 'Step 3 of 4'],
    ['Claim filters', 'Step 4 of 4'],
  ]

  for (const [title, progress] of steps) {
    await tooltip.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('dialog', { name: title })).toBeVisible()
    await expect(tooltip.getByText(progress, { exact: true })).toBeVisible()
  }

  await tooltip.getByRole('button', { name: 'Done' }).click()
  await expect(tooltip).toHaveCount(0)
})

test('Salary Claims Management quick tour replays in place on salary records', async ({ page }) => {
  await loginAsSalaryClaimsManagementUser(page)
  await goToRouteAndWaitForModule(page, {
    route: '/staff/salary-claims/salary',
    moduleSelector: salaryClaimsManagementModuleAnchor,
  })

  await startReplayTour(page, {
    eventName: salaryClaimsManagementReplayEvent,
    route: '/staff/salary-claims/salary',
    moduleSelector: salaryClaimsManagementModuleAnchor,
  })

  const tooltip = page.locator('.onboarding-tour-tooltip')
  await expect(
    page.getByRole('dialog', { name: 'Salary claims management workspace' }),
  ).toBeVisible()
  await expect(tooltip.getByText('Step 1 of 4', { exact: true })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Salary claims sections' })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Salary records' })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Salary filters' })).toBeVisible()
})

test('Salary Claims Management quick tour replays in place on claim detail', async ({ page }) => {
  const fixture = ensureSalaryClaimsManagementFixtures()
  expect(fixture.detailClaimId).toBeTruthy()

  await loginAsSalaryClaimsManagementUser(page)
  await goToRouteAndWaitForModule(page, {
    route: `/staff/salary-claims/claim/${fixture.detailClaimId}`,
    moduleSelector: salaryClaimsManagementModuleAnchor,
  })
  await expect(page.locator('[data-tour-id="salary-claims-management-detail"]')).toBeVisible()

  await startReplayTour(page, {
    eventName: salaryClaimsManagementReplayEvent,
    route: `/staff/salary-claims/claim/${fixture.detailClaimId}`,
    moduleSelector: salaryClaimsManagementModuleAnchor,
  })

  const tooltip = page.locator('.onboarding-tour-tooltip')
  await expect(
    page.getByRole('dialog', { name: 'Salary claims management workspace' }),
  ).toBeVisible()
  await expect(tooltip.getByText('Step 1 of 2', { exact: true })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Claim detail' })).toBeVisible()
})

test('Salary Claims Management quick tour replays from an excluded salary settings route to canonical claims', async ({
  page,
}) => {
  await loginAsSalaryClaimsManagementUser(page)
  await page.goto('/staff/salary-claims/claims')
  await expect(page.locator(salaryClaimsManagementModuleAnchor)).toBeVisible({ timeout: 20000 })
  await startReplayTour(page, {
    eventName: salaryClaimsManagementReplayEvent,
    route: '/staff/set-salary/set-salary',
    moduleSelector: salaryClaimsManagementModuleAnchor,
  })

  await expect(page).toHaveURL(/\/staff\/salary-claims\/claims$/)
  await waitForModuleAnchor(page, salaryClaimsManagementModuleAnchor)
  await expect(
    page.getByRole('dialog', { name: 'Salary claims management workspace' }),
  ).toBeVisible()
})
