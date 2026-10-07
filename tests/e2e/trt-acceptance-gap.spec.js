const { expect, test } = require('@playwright/test')
const { createSmokePng } = require('./support/smoke-image')
const { apiBaseUrl, loginWithPage, personas } = require('./support/reporting-live-auth')

const runId = process.env.E2E_RUN_ID || 'VMECC-QA-unknown'
const marker = `${runId}-trt-gap`

const dismissProfilePrompt = async (page) => {
  const prompt = page.getByRole('dialog').filter({ hasText: /complete a few things before/i })
  if (!(await prompt.isVisible().catch(() => false))) return
  const action = prompt.getByRole('button', { name: /remind me later|not now|skip|close/i }).first()
  if (await action.isVisible().catch(() => false)) await action.click()
  else await page.keyboard.press('Escape')
}

const openAuthenticated = async (page, persona, route) => {
  await loginWithPage(page, persona)
  await page.goto(route, { waitUntil: 'domcontentloaded' })
  await page.locator('#root').waitFor({ state: 'visible' })
  await page.waitForTimeout(700)
  await dismissProfilePrompt(page)
}

const evidence = async (page, testInfo, name) => {
  await page.screenshot({
    path: testInfo.outputPath(`${name}.png`),
    fullPage: true,
    animations: 'disabled',
  })
}

test.describe.configure({ mode: 'serial' })

test('TRT profile edit restores cleanly, security validates, feedback persists, and Ask AI completes', async ({
  page,
}, testInfo) => {
  await openAuthenticated(page, personas.submitter, '/profile')

  const edit = page.getByRole('button', { name: /^edit$/i }).first()
  await expect(edit).toBeVisible()
  await edit.click()
  const nameInput = page.getByRole('textbox', { name: 'Name' })
  const originalName = 'Codex Smoke Tactical Response Team'
  const temporaryName = `${originalName} QA`.slice(0, 120)
  await nameInput.fill(temporaryName)
  await page
    .getByRole('button', { name: /^save$/i })
    .first()
    .click()
  await expect(page.getByText('Profile updated.')).toBeVisible()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await dismissProfilePrompt(page)
  await expect(
    page.getByTestId('profile-personal').getByText(temporaryName, { exact: true }),
  ).toBeVisible()

  await page
    .getByRole('button', { name: /^edit$/i })
    .first()
    .click()
  await page.getByRole('textbox', { name: 'Name' }).fill(originalName)
  await page
    .getByRole('button', { name: /^save$/i })
    .first()
    .click()
  await expect(page.getByText('Profile updated.')).toBeVisible()
  await evidence(page, testInfo, 'profile-restored')

  await page.goto('/profile/security', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Current password').fill(personas.submitter.password)
  await page.getByLabel('New password', { exact: true }).fill('MismatchPass!2026')
  await page.getByLabel('Confirm new password').fill('DifferentPass!2026')
  await page.getByRole('button', { name: 'Show password' }).first().click()
  await expect(page.getByLabel('Current password')).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: 'Update password' }).click()
  await expect(page.getByRole('alert')).toContainText(/confirm|match|password/i)
  await evidence(page, testInfo, 'security-validation')
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
  await page.goto('/profile/security', { waitUntil: 'domcontentloaded' })
  await expect(page.getByLabel('Current password')).toHaveValue('')
  await expect(page.getByLabel('New password', { exact: true })).toHaveValue('')

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Report issue', exact: true }).first().click()
  const feedbackDialog = page.getByRole('dialog', { name: 'Report issue' })
  await feedbackDialog.getByLabel('What happened?').fill(`Synthetic acceptance feedback ${marker}`)
  const feedbackResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/feedback-reports') && response.request().method() === 'POST',
  )
  await feedbackDialog.getByRole('button', { name: 'Submit report' }).click()
  const submitted = await feedbackResponse
  expect(submitted.status()).toBe(201)
  const submittedBody = await submitted.json()
  expect(submittedBody.data?.id || submittedBody.id).toBeTruthy()
  await expect(feedbackDialog.getByText('Report submitted')).toBeVisible()
  await evidence(page, testInfo, 'feedback-receipt')
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
  await dismissProfilePrompt(page)
  await page.getByRole('button', { name: 'Ask AI', exact: true }).first().click()
  const aiPanel = page.locator('aside[aria-label="Ask AI"]')
  await expect(aiPanel).toBeVisible()
  const prompt = 'What is the inspection workflow for a regular TRT member?'
  await aiPanel.getByRole('textbox', { name: 'Ask AI message' }).fill(prompt)
  const streamResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/ai-helper/messages/stream') &&
      response.request().method() === 'POST',
  )
  await aiPanel.getByRole('button', { name: 'Send message' }).click()
  const streamed = await streamResponse
  expect(streamed.status()).toBe(200)
  const streamBody = await streamed.text()
  expect(streamBody).toContain('event: done')
  expect(streamBody).toContain('To complete **Inspection**')
  await expect(aiPanel.getByText(prompt, { exact: true }).last()).toBeVisible()
  const completion = aiPanel
    .locator('.ai-helper-message:not(.ai-helper-message--user)')
    .filter({ hasText: 'To complete Inspection' })
    .last()
  await expect(completion).toBeVisible({ timeout: 120_000 })
  await expect(completion.locator('.ai-helper-message__content')).not.toBeEmpty({
    timeout: 120_000,
  })
  await evidence(page, testInfo, 'ask-ai-response')
  await page.getByRole('button', { name: 'Open chat history' }).click()
  await expect(aiPanel).toContainText(/inspection workflow/i)
  await evidence(page, testInfo, 'ask-ai-history')
})

test('TRT messages persist text and image, enforce file validation, and become readable on mobile', async ({
  browser,
}, testInfo) => {
  const senderContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const sender = await senderContext.newPage()
  try {
    await openAuthenticated(sender, personas.submitter, '/messages')
    await sender.getByTestId('messages-create-action').click()
    const newChat = sender
      .locator('[role="dialog"]:visible')
      .filter({ hasText: 'New chat' })
      .first()
    const contactSearch = newChat.getByRole('textbox', { name: 'Search contacts' })
    await contactSearch.fill(personas.assistantIncidentCommander.email)
    const contact = newChat
      .getByRole('button')
      .filter({ hasText: personas.assistantIncidentCommander.email })
      .first()
    await expect(contact).toBeVisible()
    await contact.click()

    const composer = sender.getByTestId('messages-composer')
    const fileInput = composer.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: `${marker}.txt`,
      mimeType: 'text/plain',
      buffer: Buffer.from('invalid'),
    })
    await expect(composer).toContainText('Only JPEG, PNG, GIF, and WebP images are allowed.')

    const textMessage = `Acceptance text ${marker}`
    await composer.getByRole('textbox', { name: 'Message' }).fill(textMessage)
    await composer.getByRole('button', { name: 'Send message' }).click()
    await expect(
      sender.locator('.chat-message-bubble').filter({ hasText: textMessage }).last(),
    ).toBeVisible()
    await expect(composer.getByRole('textbox', { name: 'Message' })).toBeEnabled()
    await expect(composer.getByRole('textbox', { name: 'Message' })).toHaveValue('')

    const imageMessage = `Acceptance image ${marker}`
    await fileInput.setInputFiles({
      name: `${marker}.png`,
      mimeType: 'image/png',
      buffer: createSmokePng(marker),
    })
    await expect(composer.getByAltText('preview')).toBeVisible()
    await composer.getByRole('textbox', { name: 'Image description' }).fill(imageMessage)
    const uploadedAttachment = sender.waitForResponse(
      (response) =>
        response.url().endsWith('/api/messages/attachments') &&
        response.request().method() === 'POST',
    )
    const sentImageMessage = sender.waitForResponse(
      (response) =>
        response.url().endsWith('/api/messages') && response.request().method() === 'POST',
    )
    await composer.getByRole('button', { name: 'Send message' }).click()
    expect((await uploadedAttachment).status()).toBe(201)
    const imageSendResponse = await sentImageMessage
    expect(imageSendResponse.status()).toBe(201)
    const imageSendBody = await imageSendResponse.json()
    expect(imageSendBody.data?.attachment?.id).toBeTruthy()
    await expect(
      sender.locator('.chat-message-bubble').filter({ hasText: imageMessage }).last(),
    ).toBeVisible()
    await expect(sender.getByRole('img', { name: 'Message image' }).last()).toBeVisible()
    await evidence(sender, testInfo, 'messages-sender-persistence')

    await sender.reload({ waitUntil: 'domcontentloaded' })
    await expect(
      sender.locator('.chat-message-bubble').filter({ hasText: textMessage }).last(),
    ).toBeVisible()
    await expect(
      sender.locator('.chat-message-bubble').filter({ hasText: imageMessage }).last(),
    ).toBeVisible()

    const recipientContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
    })
    const recipient = await recipientContext.newPage()
    try {
      await openAuthenticated(recipient, personas.assistantIncidentCommander, '/messages')
      const thread = recipient.getByRole('button', {
        name: /Open conversation with Codex Smoke Tactical Response Team/i,
      })
      await expect(thread).toBeVisible()
      await thread.click()
      await expect(
        recipient.locator('.chat-message-bubble').filter({ hasText: textMessage }).last(),
      ).toBeVisible()
      await expect(
        recipient.locator('.chat-message-bubble').filter({ hasText: imageMessage }).last(),
      ).toBeVisible()
      const messageImage = recipient.getByRole('img', { name: 'Message image' }).last()
      await expect(messageImage).toBeVisible()
      await messageImage.click()
      await expect(recipient.getByRole('dialog')).toBeVisible()
      await evidence(recipient, testInfo, 'messages-recipient-mobile-lightbox')
    } finally {
      await recipientContext.close()
    }
  } finally {
    await senderContext.close()
  }
})

test('TRT downloads an owned payslip and another-site TRT cannot fetch it', async ({
  page,
}, testInfo) => {
  await openAuthenticated(page, personas.submitter, '/profile')
  const personal = page.getByTestId('profile-personal')
  const statutory = page.getByTestId('profile-statutory')
  await personal.getByRole('button', { name: /^edit$/i }).click()
  const icInput = personal.getByLabel('IC number')
  const originalIc = await icInput.inputValue()
  await icInput.fill('900101-01-1234')
  await personal.getByRole('button', { name: /^save$/i }).click()
  await expect(personal.getByText('Profile updated.')).toBeVisible()

  await statutory.getByRole('button', { name: /^edit$/i }).click()
  const epfInput = statutory.getByLabel('EPF number')
  const originalEpf = await epfInput.inputValue()
  await epfInput.fill('QA-EPF-20261007')
  await statutory.getByRole('button', { name: /^save$/i }).click()
  await expect(statutory.getByText('Statutory info updated.')).toBeVisible()

  try {
    await page.goto('/payroll/payslips', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('payroll-payslips')).toBeVisible()
    await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 30_000 })
    const listResponse = await page.request.get(`${apiBaseUrl}/payroll/payslips`, {
      headers: { Accept: 'application/json' },
    })
    expect(listResponse.status()).toBe(200)
    const listBody = await listResponse.json()
    const rows = listBody.data || []
    expect(
      rows.length,
      'Expected the paid workflow record to produce a TRT payslip',
    ).toBeGreaterThan(0)
    const payslipId = rows[0].payslipId || rows[0].id
    expect(payslipId).toBeTruthy()

    const actions = page.getByTestId('payroll-payslip-download-action')
    await actions.getByRole('button', { name: 'Row actions' }).click()
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download payslip' }).click()
    const download = await downloadPromise
    const downloadPath = await download.path()
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
    expect(downloadPath).toBeTruthy()
    await evidence(page, testInfo, 'payslip-owned-download')

    const otherContext = await page.context().browser().newContext()
    const other = await otherContext.newPage()
    try {
      await loginWithPage(other, personas.submitterBeta)
      const denied = await other.request.get(
        `${apiBaseUrl}/payroll/payslips/${payslipId}/download`,
        {
          headers: { Accept: 'application/pdf' },
        },
      )
      expect([403, 404]).toContain(denied.status())
    } finally {
      await otherContext.close()
    }
  } finally {
    await page.goto('/profile', { waitUntil: 'domcontentloaded' })
    await dismissProfilePrompt(page)
    const restorePersonal = page.getByTestId('profile-personal')
    await restorePersonal.getByRole('button', { name: /^edit$/i }).click()
    await restorePersonal.getByLabel('IC number').fill(originalIc)
    await restorePersonal.getByRole('button', { name: /^save$/i }).click()
    await expect(restorePersonal.getByText('Profile updated.')).toBeVisible()

    const restoreStatutory = page.getByTestId('profile-statutory')
    await restoreStatutory.getByRole('button', { name: /^edit$/i }).click()
    await restoreStatutory.getByLabel('EPF number').fill(originalEpf)
    await restoreStatutory.getByRole('button', { name: /^save$/i }).click()
    await expect(restoreStatutory.getByText('Statutory info updated.')).toBeVisible()
  }
})
