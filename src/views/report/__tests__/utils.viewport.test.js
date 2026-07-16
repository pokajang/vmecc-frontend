import { beforeEach, describe, expect, it } from 'vitest'
import { resetReportViewport } from '../utils'

describe('resetReportViewport', () => {
  beforeEach(() => {
    document.documentElement.scrollTop = 120
    document.documentElement.scrollLeft = 16
    document.body.scrollTop = 80
    document.body.scrollLeft = 8
  })

  it('resets the document viewport when a report stage changes', () => {
    resetReportViewport()

    expect(document.documentElement.scrollTop).toBe(0)
    expect(document.documentElement.scrollLeft).toBe(0)
    expect(document.body.scrollTop).toBe(0)
    expect(document.body.scrollLeft).toBe(0)
  })
})
