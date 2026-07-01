const { execFileSync } = require('node:child_process')
const path = require('node:path')
const { expect, test } = require('@playwright/test')

const backendDir = path.resolve(process.cwd(), '..', 'vmecc-backend')
const apiBaseUrl = process.env.VMECC_E2E_API_URL || 'http://localhost:8000/api'
const payrollEmail = 'codex.smoke.payroll@vmecc.local'
const smokePassword = 'SmokeTrt!2026'
const payrollReplayEvent = 'vmecc:onboarding:payroll-claims-tour-replay'
const smokeExpenseDisplayId = 'CLM-SMOKE-2026-001'
const smokeSalaryDisplayId = 'CLM-SMOKE-2026-002'

test.describe.configure({ timeout: 120000 })

const runTinker = (code) =>
  execFileSync('php', ['artisan', 'tinker', '--execute', code], {
    cwd: backendDir,
    encoding: 'utf8',
    stdio: 'pipe',
  })

const resetPayrollTourState = () => {
  runTinker(`
    $user = \\App\\Models\\User::where('email', '${payrollEmail}')->first();
    if ($user) {
      \\App\\Models\\UserOnboardingState::where('user_id', $user->id)
        ->where('key', 'payroll_claims_quick_tour')
        ->delete();
    }
  `)
}

const resetPayrollSmokeFixtures = () => {
  runTinker(`
    $user = \\App\\Models\\User::where('email', '${payrollEmail}')->first();
    if ($user) {
      \\App\\Models\\PayrollClaimDraft::where('user_id', $user->id)->delete();
      $claimIds = \\App\\Models\\PayrollClaim::withTrashed()
        ->where('user_id', $user->id)
        ->pluck('id');
      if ($claimIds->isNotEmpty()) {
        \\App\\Models\\PayrollClaimItem::whereIn('payroll_claim_id', $claimIds)->delete();
      }
      \\App\\Models\\PayrollClaim::withTrashed()->where('user_id', $user->id)->forceDelete();
    }
  `)
}

const ensurePayrollSmokeUser = () => {
  runTinker(`
    $user = \\App\\Models\\User::withTrashed()->firstOrNew(['email' => '${payrollEmail}']);
    if ($user->exists && method_exists($user, 'restore') && $user->trashed()) {
      $user->restore();
    }
    $user->fill([
      'name' => 'Codex Smoke Payroll',
      'status' => 'active',
      'password' => '${smokePassword}',
      'ic_number' => '900101-01-4321',
      'phone' => '012 222 3333',
      'address' => 'Lot 2',
      'state' => 'Selangor',
    ]);
    $user->save();
    if (method_exists($user, 'syncRoles')) {
      $user->syncRoles([]);
    }
    if (method_exists($user, 'syncPermissions')) {
      $permissions = \\Spatie\\Permission\\Models\\Permission::query()
        ->whereIn('name', ['self.payroll', 'self.dashboard'])
        ->pluck('name')
        ->all();
      $user->syncPermissions($permissions);
    }
    \\App\\Models\\UserOnboardingState::where('user_id', $user->id)
      ->where('key', 'payroll_claims_quick_tour')
      ->delete();
  `)
}

const ensurePayrollSmokeFixtures = () => {
  const output = runTinker(`
    $user = \\App\\Models\\User::where('email', '${payrollEmail}')->firstOrFail();

    $expenseClaim = \\App\\Models\\PayrollClaim::updateOrCreate(
      [
        'user_id' => $user->id,
        'display_id' => '${smokeExpenseDisplayId}',
      ],
      [
        'submission_key' => 'smoke-payroll-expense',
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
        'notes' => 'Smoke payroll expense claim coverage.',
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
        'notes' => 'Smoke claim item',
        'item_meta' => ['category' => 'Travel'],
      ]
    );

    $salaryClaim = \\App\\Models\\PayrollClaim::updateOrCreate(
      [
        'user_id' => $user->id,
        'display_id' => '${smokeSalaryDisplayId}',
      ],
      [
        'submission_key' => 'smoke-payroll-salary',
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
        'notes' => 'Smoke payroll salary claim coverage.',
      ]
    );

    echo json_encode([
      'detailClaimId' => $expenseClaim->id,
      'salaryClaimId' => $salaryClaim->id,
    ]);
  `)

  return JSON.parse(String(output || '').trim())
}

const loginAsPayrollUser = async (page) => {
  const loginRequest = () =>
    page.context().request.post(`${apiBaseUrl}/auth/login`, {
      data: {
        email: payrollEmail,
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
  expect(loginResponse.ok(), `Login failed for ${payrollEmail}: ${loginBody}`).toBe(true)
}

const startReplayTour = async (page, source = 'tutorial_hub') => {
  await page.evaluate(
    ({ eventName, detail }) => {
      window.dispatchEvent(new CustomEvent(eventName, { detail }))
    },
    {
      eventName: payrollReplayEvent,
      detail: {
        source,
      },
    },
  )
}

const waitForPayrollModule = async (page) => {
  await expect(page.locator('[data-tour-id="payroll-module"]')).toBeVisible({ timeout: 20000 })
}

const launchPayrollTutorialFromHub = async (page) => {
  await expect(page.getByRole('heading', { name: 'Dashboard Overview' })).toBeVisible({
    timeout: 20000,
  })
  await page.getByRole('button', { name: 'Open tutorial' }).click()

  const tutorialDialog = page.getByRole('dialog', { name: 'Tutorial' })
  await expect(tutorialDialog).toBeVisible()

  await tutorialDialog
    .locator('.onboarding-hub-row', { hasText: 'Payroll / Claims' })
    .getByRole('button', { name: 'Start' })
    .click()
}

const completePayrollListTutorial = async (page) => {
  await expect(page.locator('[data-tour-id="payroll-module"]')).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Payroll workspace' })).toBeVisible()
  await expect(page.getByText('Step 1 of 5', { exact: true })).toBeVisible()

  const steps = [
    ['Payroll sections', 'Step 2 of 5'],
    ['Claim records', 'Step 3 of 5'],
    ['Filters and search', 'Step 4 of 5'],
    ['Apply claim', 'Step 5 of 5'],
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
    .getByRole('button', { name: 'Continue to claim entry' })
    .click()
  await expect(page).toHaveURL(/\/payroll\/claims\/new$/)
  await expect(page.getByRole('dialog', { name: 'Choose claim type' })).toBeVisible()
  await expect(
    page.locator('.onboarding-tour-tooltip').getByText('Step 1 of 1', { exact: true }),
  ).toBeVisible()

  await page.getByTestId('claim-type-expense').click()
  await page.locator('[data-testid^="claim-period-"]').first().click()
  await page
    .locator('.onboarding-tour-tooltip')
    .getByRole('button', { name: 'Open claim form' })
    .click()
  await expect(page.getByRole('dialog', { name: 'Claim form' })).toBeVisible()
  await expect(
    page.locator('.onboarding-tour-tooltip').getByText('Step 1 of 2', { exact: true }),
  ).toBeVisible()

  await page.locator('.onboarding-tour-tooltip').getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Submit request' })).toBeVisible()
  await expect(
    page.locator('.onboarding-tour-tooltip').getByText('Step 2 of 2', { exact: true }),
  ).toBeVisible()
  await page.locator('.onboarding-tour-tooltip').getByRole('button', { name: 'Done' }).click()
  await expect(page.locator('.onboarding-tour-tooltip')).toHaveCount(0)
}

test.beforeAll(() => {
  ensurePayrollSmokeUser()
  ensurePayrollSmokeFixtures()
})

test.afterAll(() => {
  resetPayrollTourState()
  resetPayrollSmokeFixtures()
})

test('Payroll Claims quick tour replays from outside payroll and completes the list subset', async ({
  page,
}) => {
  await loginAsPayrollUser(page)

  await page.goto('/dashboard')
  await launchPayrollTutorialFromHub(page)

  await waitForPayrollModule(page)
  await expect(page).toHaveURL(/\/payroll$/)

  await completePayrollListTutorial(page)
})

test('Payroll Claims quick tour replays in place on /payroll/claims/new', async ({ page }) => {
  await loginAsPayrollUser(page)

  await page.goto('/payroll/claims/new')
  await waitForPayrollModule(page)
  await expect(page.getByText('Start Payroll tutorial?')).toHaveCount(0)

  await startReplayTour(page)

  const tooltip = page.locator('.onboarding-tour-tooltip')
  await expect(page.getByRole('dialog', { name: 'Payroll workspace' })).toBeVisible()
  await expect(tooltip.getByText('Step 1 of 2', { exact: true })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Choose claim type' })).toBeVisible()
  await expect(tooltip.getByText('Step 2 of 2', { exact: true })).toBeVisible()
  await page.getByTestId('claim-type-expense').click()
  await page.locator('[data-testid^="claim-period-"]').first().click()
  await tooltip.getByRole('button', { name: 'Open claim form' }).click()
  await expect(page.getByRole('dialog', { name: 'Claim form' })).toBeVisible()
  await expect(tooltip.getByText('Step 1 of 2', { exact: true })).toBeVisible()

  await tooltip.getByRole('button', { name: 'Skip' }).click()
  await expect(tooltip).toHaveCount(0)
})

test('Payroll Claims quick tour replays in place on /payroll/claims/new/expense', async ({
  page,
}) => {
  await loginAsPayrollUser(page)

  await page.goto('/payroll/claims/new/expense')
  await waitForPayrollModule(page)
  await expect(page.locator('[data-tour-id="payroll-claim-form"]')).toBeVisible()

  await startReplayTour(page)

  const tooltip = page.locator('.onboarding-tour-tooltip')
  await expect(page.getByRole('dialog', { name: 'Payroll workspace' })).toBeVisible()
  await expect(tooltip.getByText('Step 1 of 3', { exact: true })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Claim form' })).toBeVisible()
  await expect(tooltip.getByText('Step 2 of 3', { exact: true })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Submit request' })).toBeVisible()
  await expect(tooltip.getByText('Step 3 of 3', { exact: true })).toBeVisible()

  await tooltip.getByRole('button', { name: 'Done' }).click()
  await expect(tooltip).toHaveCount(0)
})

test('Payroll Claims quick tour replays in place on /payroll/claims/new/salary and shows the form subset', async ({
  page,
}) => {
  await loginAsPayrollUser(page)

  await page.goto('/payroll/claims/new/salary')
  await waitForPayrollModule(page)
  await expect(page.locator('[data-tour-id="payroll-claim-form"]')).toBeVisible()

  await startReplayTour(page)

  const tooltip = page.locator('.onboarding-tour-tooltip')
  await expect(page.getByRole('dialog', { name: 'Payroll workspace' })).toBeVisible()
  await expect(tooltip.getByText('Step 1 of 3', { exact: true })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Claim form' })).toBeVisible()
  await expect(tooltip.getByText('Step 2 of 3', { exact: true })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Submit request' })).toBeVisible()
  await expect(tooltip.getByText('Step 3 of 3', { exact: true })).toBeVisible()

  await tooltip.getByRole('button', { name: 'Done' }).click()
  await expect(tooltip).toHaveCount(0)
})

test('Payroll Claims quick tour replays in place on /payroll/claims/:claimId', async ({ page }) => {
  const fixture = ensurePayrollSmokeFixtures()
  expect(fixture.detailClaimId).toBeTruthy()

  await loginAsPayrollUser(page)

  await page.goto(`/payroll/claims/${fixture.detailClaimId}`)
  await waitForPayrollModule(page)
  await expect(page.locator('[data-tour-id="payroll-claim-detail"]')).toBeVisible()

  await startReplayTour(page)

  const tooltip = page.locator('.onboarding-tour-tooltip')
  await expect(page.getByRole('dialog', { name: 'Payroll workspace' })).toBeVisible()
  await expect(tooltip.getByText('Step 1 of 2', { exact: true })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Claim detail' })).toBeVisible()
  await expect(tooltip.getByText('Step 2 of 2', { exact: true })).toBeVisible()

  await tooltip.getByRole('button', { name: 'Done' }).click()
  await expect(tooltip).toHaveCount(0)
})

test('Payroll Claims quick tour replays in place on /payroll/payslips', async ({ page }) => {
  await loginAsPayrollUser(page)

  await page.goto('/payroll/payslips')
  await waitForPayrollModule(page)
  await expect(page.locator('[data-tour-id="payroll-payslips"]')).toBeVisible()

  await startReplayTour(page)

  const tooltip = page.locator('.onboarding-tour-tooltip')
  await expect(page.getByRole('dialog', { name: 'Payroll workspace' })).toBeVisible()
  await expect(tooltip.getByText('Step 1 of 3', { exact: true })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Payroll sections' })).toBeVisible()
  await expect(tooltip.getByText('Step 2 of 3', { exact: true })).toBeVisible()
  await tooltip.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Payslips' })).toBeVisible()
  await expect(tooltip.getByText('Step 3 of 3', { exact: true })).toBeVisible()

  await tooltip.getByRole('button', { name: 'Done' }).click()
  await expect(tooltip).toHaveCount(0)
})
