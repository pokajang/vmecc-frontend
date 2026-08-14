import { expect, test } from '@playwright/test'

const fixture = `
  <main style="padding: 24px; display: grid; gap: 20px; background: var(--cui-body-bg); color: var(--cui-body-color)">
    <section data-testid="button-intents" style="display: flex; flex-wrap: wrap; gap: 12px">
      <button class="btn btn-primary" type="button">Continue</button>
      <button class="btn btn-outline-primary" type="button">Add record</button>
      <button class="btn btn-outline-secondary" type="button">Download report</button>
      <button class="btn btn-outline-success" type="button">Approve</button>
      <button class="btn btn-outline-warning" type="button">Needs review</button>
      <button class="btn btn-outline-danger" type="button">Delete</button>
      <button class="btn btn-danger" type="button">Confirm deletion</button>
      <button class="btn btn-outline-secondary" type="button" disabled>Unavailable</button>
    </section>
    <section data-testid="button-exceptions" style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px">
      <button class="btn btn-link back-button" type="button"><span>Back</span></button>
      <button class="btn btn-link btn-sm create-action-button media-add-action" type="button">
        <span class="create-action-button__icon" aria-hidden="true">+</span>
        <span class="create-action-button__label">Add photo (optional)</span>
      </button>
      <button class="btn btn-link row-action" type="button" aria-label="Row actions">⋮</button>
      <div class="workflow-scope-segmented" role="group" aria-label="Record scope">
        <button class="workflow-scope-segment" type="button" aria-pressed="true">Mine</button>
        <button class="workflow-scope-segment" type="button" aria-pressed="false">All</button>
      </div>
    </section>
  </main>
`

const readStyle = (button) => {
  const style = getComputedStyle(button)
  const bounds = button.getBoundingClientRect()
  return {
    background: style.backgroundColor,
    borderWidth: Number.parseFloat(style.borderTopWidth),
    radius: Number.parseFloat(style.borderTopLeftRadius),
    width: bounds.width,
    height: bounds.height,
    boxShadow: style.boxShadow,
  }
}

test.describe('shared button visual system', () => {
  for (const viewport of [
    { name: 'mobile', width: 320, height: 700 },
    { name: 'desktop', width: 1440, height: 900 },
  ]) {
    test(`${viewport.name} keeps semantic actions pill-shaped and borderless`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/')
      await page.locator('#root').evaluate((root, markup) => {
        root.innerHTML = markup
      }, fixture)

      for (const theme of ['light', 'dark']) {
        await page
          .locator('html')
          .evaluate(
            (element, nextTheme) => element.setAttribute('data-coreui-theme', nextTheme),
            theme,
          )

        const actions = page.getByTestId('button-intents').locator('.btn')
        const styles = await actions.evaluateAll((buttons) =>
          buttons.map((button) => {
            const style = getComputedStyle(button)
            const bounds = button.getBoundingClientRect()
            return {
              borderWidth: Number.parseFloat(style.borderTopWidth),
              radius: Number.parseFloat(style.borderTopLeftRadius),
              height: bounds.height,
            }
          }),
        )
        for (const style of styles) {
          expect(style.borderWidth).toBe(0)
          expect(style.radius).toBeGreaterThanOrEqual(style.height / 2)
        }

        const backgrounds = await Promise.all([
          page.getByRole('button', { name: 'Download report' }).evaluate(readStyle),
          page.getByRole('button', { name: 'Add record' }).evaluate(readStyle),
          page.getByRole('button', { name: 'Delete', exact: true }).evaluate(readStyle),
          page.getByRole('button', { name: 'Continue' }).evaluate(readStyle),
        ])
        expect(new Set(backgrounds.map(({ background }) => background)).size).toBe(4)
      }

      const ordinary = page.getByRole('button', { name: 'Download report' })
      await ordinary.focus()
      const focused = await ordinary.evaluate(readStyle)
      expect(focused.boxShadow).not.toBe('none')

      const back = page.getByRole('button', { name: 'Back' })
      const backBackground = await back.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      )
      expect(backBackground).toBe('rgba(0, 0, 0, 0)')

      const mediaAction = page.getByRole('button', { name: 'Add photo (optional)' })
      const mediaStyle = await mediaAction.evaluate((element) => {
        const style = getComputedStyle(element)
        return {
          background: style.backgroundColor,
          borderWidth: Number.parseFloat(style.borderTopWidth),
          fontSize: Number.parseFloat(style.fontSize),
          fontWeight: Number.parseInt(style.fontWeight, 10),
          minHeight: Number.parseFloat(style.minHeight),
        }
      })
      expect(mediaStyle.background).toBe('rgba(0, 0, 0, 0)')
      expect(mediaStyle.borderWidth).toBe(0)
      expect(mediaStyle.fontSize).toBeLessThanOrEqual(14)
      expect(mediaStyle.fontWeight).toBeGreaterThanOrEqual(700)
      expect(mediaStyle.minHeight).toBeGreaterThanOrEqual(44)

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(1)
    })
  }
})
