import { expect, test } from '@playwright/test'

const drawerFixture = (bodyClass) => `
  <div
    class="offcanvas offcanvas-bottom show mobile-bottom-drawer inspection-mobile-setup-drawer record-action-sheet"
    style="visibility: visible"
  >
    <div class="offcanvas-body inspection-mobile-setup-drawer__body">
      <div class="inspection-mobile-detail-drawer-body ${bodyClass} d-grid">
        <div
          class="inspection-hydraulic-check-row inspection-hydraulic-check-row--stacked d-grid gap-2"
          data-testid="stacked-row"
        >
          <div class="inspection-hydraulic-check-label small fw-semibold text-muted">
            Condition
          </div>
          <div
            class="inspection-hydraulic-status-group d-flex flex-nowrap justify-content-start gap-2 vmecc-scroll-x pb-1"
          >
            ${['OK', 'Defect', 'Missing', 'N/A']
              .map(
                (label, index) =>
                  `<button
                    class="inspection-drawer-choice inspection-hydraulic-status-btn btn btn-sm ${index === 0 ? 'btn-primary' : 'btn-outline-secondary'}"
                    aria-pressed="${index === 0}"
                    ${index === 0 ? 'data-selected="true"' : ''}
                  ><span class="inspection-drawer-choice__surface">${label}</span></button>`,
              )
              .join('')}
          </div>
        </div>
        <div
          class="inspection-hydraulic-check-row d-flex align-items-center justify-content-between gap-2"
          data-testid="compact-row"
        >
          <div class="inspection-hydraulic-check-label small fw-semibold text-muted">
            Quantity
          </div>
          <input class="form-control" style="width: 5.5rem" value="15" aria-label="Quantity" />
        </div>
        <div class="inspection-equipment-additional-actions d-flex gap-2" data-testid="optional-actions">
          ${['Remark', 'Photo']
            .map(
              (label) => `<button
                type="button"
                class="btn btn-sm create-action-button create-action-button--inline inspection-compact-action-btn d-inline-flex align-items-center justify-content-center border-0 bg-transparent"
              >
                <span class="create-action-button__icon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 14 14"><path d="M1 1h12v9H5l-3 3v-3H1z" /></svg>
                </span>
                <span class="create-action-button__label">${label}</span>
              </button>`,
            )
            .join('')}
        </div>
        <div class="inspection-detail-more-actions" data-testid="drawer-actions">
          <button class="btn btn-outline-secondary inspection-drawer-action inspection-drawer-action--secondary">Download</button>
          <button class="btn btn-outline-danger inspection-drawer-action inspection-drawer-action--danger">Delete</button>
        </div>
      </div>
    </div>
  </div>
`

const getLayoutMetrics = (row) =>
  row.evaluate((element) => {
    const body = element.closest('.offcanvas-body')
    const label = element.querySelector('.inspection-hydraulic-check-label')
    const group = element.querySelector('.inspection-hydraulic-status-group')
    const rect = (node) => {
      const bounds = node.getBoundingClientRect()
      return {
        top: bounds.top,
        right: bounds.right,
        bottom: bounds.bottom,
        left: bounds.left,
      }
    }

    return {
      body: {
        ...rect(body),
        clientWidth: body.clientWidth,
        scrollWidth: body.scrollWidth,
      },
      label: rect(label),
      group: {
        ...rect(group),
        clientWidth: group.clientWidth,
        scrollWidth: group.scrollWidth,
      },
      buttons: [...group.querySelectorAll('button')].map(rect),
    }
  })

test.describe('inspection mobile status drawer layout', () => {
  for (const bodyClass of [
    'inspection-equipment-detail-drawer-body',
    'inspection-fire-extinguisher-detail-drawer-body',
  ]) {
    for (const viewportWidth of [320, 390]) {
      test(`${bodyClass} stacks labels without clipping actions at ${viewportWidth}px`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: viewportWidth, height: 700 })
        await page.goto('/')
        await page.waitForLoadState('networkidle')
        await page.evaluate(
          ({ fixture }) => {
            document.body.className = 'inspection-module-page'
            document.body.innerHTML = fixture
          },
          { fixture: drawerFixture(bodyClass) },
        )

        const stackedRow = page.getByTestId('stacked-row')
        await expect(stackedRow).toBeVisible()
        const metrics = await getLayoutMetrics(stackedRow)

        expect(metrics.label.bottom).toBeLessThanOrEqual(metrics.group.top + 1)
        expect(metrics.group.left).toBeGreaterThanOrEqual(metrics.body.left)
        expect(metrics.group.right).toBeLessThanOrEqual(metrics.body.right)
        expect(metrics.group.scrollWidth).toBeLessThanOrEqual(metrics.group.clientWidth + 1)
        expect(metrics.body.scrollWidth).toBeLessThanOrEqual(metrics.body.clientWidth + 1)

        for (const button of metrics.buttons) {
          expect(button.left).toBeGreaterThanOrEqual(metrics.body.left)
          expect(button.right).toBeLessThanOrEqual(metrics.body.right)
          expect(button.bottom - button.top).toBeGreaterThanOrEqual(44)
        }

        const choices = stackedRow.locator('.inspection-drawer-choice')
        const selected = choices.filter({ hasText: 'OK' })
        const unselected = choices.filter({ hasText: 'Defect' })
        const [selectedStyle, unselectedStyle] = await Promise.all([
          selected.evaluate((element) => {
            const surface = element.querySelector('.inspection-drawer-choice__surface')
            const style = getComputedStyle(surface)
            return {
              background: style.backgroundColor,
              radius: Number.parseFloat(style.borderRadius),
              height: surface.getBoundingClientRect().height,
              targetHeight: element.getBoundingClientRect().height,
            }
          }),
          unselected.evaluate((element) => {
            const surface = element.querySelector('.inspection-drawer-choice__surface')
            const style = getComputedStyle(surface)
            return {
              background: style.backgroundColor,
              radius: Number.parseFloat(style.borderRadius),
            }
          }),
        ])

        expect(selectedStyle.background).not.toBe(unselectedStyle.background)
        expect(selectedStyle.radius).toBeGreaterThanOrEqual(selectedStyle.height / 2)
        expect(selectedStyle.height).toBeLessThanOrEqual(34)
        expect(selectedStyle.targetHeight).toBeGreaterThanOrEqual(44)
        await expect(selected).toHaveAttribute('aria-pressed', 'true')
        await expect(unselected).toHaveAttribute('aria-pressed', 'false')

        await page
          .locator('html')
          .evaluate((element) => element.setAttribute('data-coreui-theme', 'dark'))
        const darkBackgrounds = await Promise.all([
          selected.evaluate(
            (element) =>
              getComputedStyle(element.querySelector('.inspection-drawer-choice__surface'))
                .backgroundColor,
          ),
          unselected.evaluate(
            (element) =>
              getComputedStyle(element.querySelector('.inspection-drawer-choice__surface'))
                .backgroundColor,
          ),
        ])
        expect(darkBackgrounds[0]).not.toBe(darkBackgrounds[1])

        const compactRow = page.getByTestId('compact-row')
        const compactLabel = compactRow.locator('.inspection-hydraulic-check-label')
        const compactInput = compactRow.getByRole('textbox', { name: 'Quantity' })
        const [compactLabelBox, compactInputBox] = await Promise.all([
          compactLabel.boundingBox(),
          compactInput.boundingBox(),
        ])

        expect(compactLabelBox).not.toBeNull()
        expect(compactInputBox).not.toBeNull()
        expect(compactLabelBox.y + compactLabelBox.height).toBeGreaterThan(compactInputBox.y)
        expect(compactInputBox.y + compactInputBox.height).toBeGreaterThan(compactLabelBox.y)

        const optionalActions = page.getByTestId('optional-actions').getByRole('button')
        await expect(optionalActions).toHaveCount(2)
        for (const action of await optionalActions.all()) {
          const alignment = await action.evaluate((element) => {
            const icon = element
              .querySelector('.create-action-button__icon')
              .getBoundingClientRect()
            const label = element
              .querySelector('.create-action-button__label')
              .getBoundingClientRect()
            const bounds = element.getBoundingClientRect()
            return {
              centerDelta: Math.abs(icon.top + icon.height / 2 - (label.top + label.height / 2)),
              height: bounds.height,
            }
          })
          expect(alignment.centerDelta).toBeLessThanOrEqual(1)
          expect(alignment.height).toBeGreaterThanOrEqual(44)
        }

        const drawerActions = page.getByTestId('drawer-actions')
        const ordinaryAction = drawerActions.getByRole('button', { name: 'Download' })
        const dangerAction = drawerActions.getByRole('button', { name: 'Delete' })
        const [ordinaryStyle, dangerStyle] = await Promise.all([
          ordinaryAction.evaluate((element) => {
            const style = getComputedStyle(element)
            return {
              background: style.backgroundColor,
              border: style.borderColor,
              radius: Number.parseFloat(style.borderRadius),
              height: element.getBoundingClientRect().height,
            }
          }),
          dangerAction.evaluate((element) => {
            const style = getComputedStyle(element)
            return { background: style.backgroundColor, color: style.color }
          }),
        ])
        expect(ordinaryStyle.border).toBe('rgba(0, 0, 0, 0)')
        expect(ordinaryStyle.radius).toBeGreaterThanOrEqual(ordinaryStyle.height / 2)
        expect(ordinaryStyle.height).toBeGreaterThanOrEqual(44)
        expect(dangerStyle.background).not.toBe(ordinaryStyle.background)
      })
    }
  }
})
