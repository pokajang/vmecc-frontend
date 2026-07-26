import { expect, test } from '@playwright/test'

const drawerFixture = (bodyClass) => `
  <div
    class="offcanvas offcanvas-bottom show mobile-bottom-drawer inspection-mobile-setup-drawer"
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
                (label) =>
                  `<button class="inspection-hydraulic-status-btn btn btn-sm btn-outline-secondary">${label}</button>`,
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
        await page.goto('/src/scss/style.scss')
        await page.setContent(`
          <!doctype html>
          <html>
            <head>
              <link rel="stylesheet" href="/src/scss/style.scss" />
            </head>
            <body class="inspection-module-page">${drawerFixture(bodyClass)}</body>
          </html>
        `)

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
        }

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
      })
    }
  }
})
