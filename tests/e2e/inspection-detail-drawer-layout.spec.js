const { expect, test } = require('@playwright/test')

const cases = [
  { viewportWidth: 360, expectedDrawerWidth: 360, expectedBorderWidth: '0px' },
  { viewportWidth: 390, expectedDrawerWidth: 390, expectedBorderWidth: '0px' },
  { viewportWidth: 768, expectedDrawerWidth: 768, expectedBorderWidth: '0px' },
  { viewportWidth: 928, expectedDrawerWidth: 928, expectedBorderWidth: '0px' },
  { viewportWidth: 929, expectedDrawerWidth: 928, expectedBorderWidth: '1px' },
  { viewportWidth: 1440, expectedDrawerWidth: 928, expectedBorderWidth: '1px' },
]

test.describe('shared inspection detail drawer layout', () => {
  for (const testCase of cases) {
    test(`keeps the correct divider contract at ${testCase.viewportWidth}px`, async ({ page }) => {
      await page.setViewportSize({ width: testCase.viewportWidth, height: 900 })
      await page.goto('/')
      await page.addStyleTag({ url: '/src/scss/style.scss' })
      await page.evaluate(() => {
        const drawer = document.createElement('aside')
        drawer.className = 'offcanvas offcanvas-end show inspection-detail-drawer'
        drawer.setAttribute('data-testid', 'detail-drawer-contract')
        drawer.textContent = 'Detail drawer contract'
        document.body.appendChild(drawer)
      })

      const metrics = await page.getByTestId('detail-drawer-contract').evaluate((element) => {
        const rect = element.getBoundingClientRect()
        const style = window.getComputedStyle(element)
        return {
          width: Math.round(rect.width),
          left: Math.round(rect.left),
          borderLeftWidth: style.borderLeftWidth,
          overflow: Math.max(0, Math.round(rect.right - window.innerWidth)),
        }
      })

      expect(metrics.width).toBe(testCase.expectedDrawerWidth)
      expect(metrics.left).toBe(testCase.viewportWidth - testCase.expectedDrawerWidth)
      expect(metrics.borderLeftWidth).toBe(testCase.expectedBorderWidth)
      expect(metrics.overflow).toBeLessThanOrEqual(1)
    })
  }
})
