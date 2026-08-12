const { expect, test } = require('@playwright/test')

const privateFilePattern = /DEVICE_PRIVATE_MEDIA_HARNESS/i
const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 1000 },
]

for (const viewport of viewports) {
  test(`keeps shared media consistent on ${viewport.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/tests/e2e/fixtures/day6-media-harness.html')
    await expect(page.getByTestId('day6-media-harness')).toBeVisible()

    await expect(page.locator('body')).not.toContainText(privateFilePattern)
    const mediaLabels = await page
      .locator('img')
      .evaluateAll((images) => images.flatMap((image) => [image.alt, image.title]).filter(Boolean))
    expect(mediaLabels.join(' ')).not.toMatch(privateFilePattern)

    const readOnlyEvidence = page.getByTestId('inspection-read-only')
    await expect(readOnlyEvidence.getByRole('img', { name: 'Damaged pump coupling' })).toBeVisible()
    await expect(
      readOnlyEvidence.getByRole('img', { name: 'Inspection evidence photo 2' }),
    ).toBeVisible()
    await expect(readOnlyEvidence.locator('.card, .border')).toHaveCount(0)

    const resolutionGrid = page.getByTestId('resolution-grid')
    await expect(resolutionGrid.locator('.card')).toHaveCount(0)
    await expect(resolutionGrid.getByText('Damaged pump coupling')).toBeVisible()

    const reportGallery = page.getByTestId('report-gallery')
    await expect(reportGallery.locator('.report-photo-gallery__card.border')).toHaveCount(0)
    await reportGallery.getByRole('button', { name: /View photo 1/ }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Fit photo to viewer' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await page.getByRole('button', { name: 'Next photo' }).click()
    await expect(page.getByText('2 of 2', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Close' }).click()

    const editor = page.getByTestId('photo-editor')
    await editor.getByRole('button', { name: 'Edit description for Photo 2' }).click()
    const description = editor.getByRole('textbox', { name: 'Description for Photo 2' })
    await expect(description).toBeFocused()
    await description.fill('Corrective action completed')
    await editor.getByRole('button', { name: 'Done editing description for Photo 2' }).click()
    await expect(editor.getByText('Description added')).toHaveCount(2)
    await editor.getByRole('button', { name: 'Remove Photo 2' }).click()
    await expect(editor.getByText('Photo 1 of 1')).toBeVisible()

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    )
    expect(hasHorizontalOverflow).toBe(false)

    await testInfo.attach(`day6-media-${viewport.name}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    })
  })
}
