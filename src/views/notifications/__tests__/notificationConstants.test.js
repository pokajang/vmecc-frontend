import { describe, expect, it } from 'vitest'
import { getModuleLabel } from '../notificationConstants'

describe('notification report-family labels', () => {
  it('names ER Assessment notifications instead of showing a generic report label', () => {
    expect(
      getModuleLabel({
        module: 'report',
        recordType: 'report',
        reportType: 'er-assessment',
      }),
    ).toBe('ER Assessment')
  })

  it('reads the report family from backend metadata', () => {
    expect(
      getModuleLabel({
        module: 'report',
        recordType: 'report',
        metadata: { reportType: 'drill' },
      }),
    ).toBe('Drill')
  })
})
