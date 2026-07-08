const { expect, test } = require('@playwright/test')

test.use({ viewport: { width: 390, height: 844 } })

test('inspection continuation cards are visible for completed eligible scopes', async ({
  page,
}) => {
  await page.goto('/tests/visual/inspection-continuation-smoke.html')

  const expectedCases = [
    ['fire-extinguisher', 'Next location', 'Cafeteria'],
    ['frt', 'Next compartment', 'LOCKER 02'],
    ['er-aux', 'Next location', 'Office'],
    ['hydraulic', 'Next location', 'Store'],
    ['scba', 'Next location', 'Store'],
    ['high-angle', 'Next kit', 'Response Kit #2'],
  ]

  for (const [caseId, heading, nextAction] of expectedCases) {
    const section = page.locator(`[data-smoke-case="${caseId}"]`)
    await expect(section.getByText(heading)).toBeVisible()
    await expect(section.getByRole('button', { name: nextAction })).toBeVisible()
  }

  await expect(page.locator('[data-smoke-case="general"]').getByText(/^Next /)).toHaveCount(0)
  await expect(page.locator('[data-smoke-case="hse"]').getByText(/^Next /)).toHaveCount(0)
})
