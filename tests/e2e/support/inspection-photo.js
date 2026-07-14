const { expect } = require('@playwright/test')
const { createSmokePng } = require('./smoke-image')

const setInspectionPhotoFromButton = async (button, fileName) => {
  const page = button.page()
  await button.click()

  const cameraModal = page
    .getByRole('dialog')
    .filter({ hasText: /Take inspection photo|Observation photo/i })
    .last()
  await expect(cameraModal).toBeVisible({ timeout: 10_000 })
  const uploadButton = cameraModal.getByRole('button', { name: 'Upload photo' })
  await expect(uploadButton).toBeVisible({ timeout: 10_000 })

  const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 10_000 })
  await uploadButton.click()
  const fileChooser = await fileChooserPromise
  const uploadResponsePromise = page.waitForResponse(
    (response) => {
      const url = new URL(response.url())
      return url.pathname.endsWith('/api/report-media') && response.request().method() === 'POST'
    },
    { timeout: 60_000 },
  )
  await fileChooser.setFiles({
    name: fileName,
    mimeType: 'image/png',
    buffer: createSmokePng(fileName),
  })
  const uploadResponse = await uploadResponsePromise
  expect([200, 201]).toContain(uploadResponse.status())

  if (await cameraModal.isVisible().catch(() => false)) {
    await cameraModal
      .getByRole('button', { name: /^Close/i })
      .first()
      .click()
    await expect(cameraModal).toBeHidden({ timeout: 10_000 })
  }
}

module.exports = { setInspectionPhotoFromButton }
