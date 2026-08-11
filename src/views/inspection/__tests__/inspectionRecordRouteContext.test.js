import { describe, expect, it } from 'vitest'
import {
  buildInspectionDetailLocation,
  buildInspectionRecordsLocation,
  getInitialInspectionRecordScope,
  normalizeInspectionRouteScope,
} from '../app/inspectionRecordRouteContext'

describe('inspection record route context', () => {
  it.each([
    ['', false, 'mine'],
    ['?scope=mine', false, 'mine'],
    ['?scope=all', false, 'all'],
    ['?scope=ALL', false, 'all'],
    ['?scope=actionable&action=review', false, 'actionable'],
    ['?scope=unknown', false, 'mine'],
    ['', true, 'all'],
    ['?scope=unknown', true, 'all'],
  ])('normalizes %s with detail=%s to %s', (search, isDetailRoute, expected) => {
    expect(normalizeInspectionRouteScope(search, { isDetailRoute })).toBe(expected)
  })

  it('maps only All to the hook All scope', () => {
    expect(getInitialInspectionRecordScope('?scope=all')).toBe('all')
    expect(getInitialInspectionRecordScope('?scope=actionable&action=approve')).toBe('mine')
    expect(getInitialInspectionRecordScope('', { isDetailRoute: true })).toBe('all')
  })

  it('builds durable All detail and return locations without arbitrary parameters', () => {
    expect(
      buildInspectionDetailLocation({
        reportId: 'INS / 42',
        search: '?scope=all&unsafe=1&date_from=2026-08-01',
        recordScope: 'all',
      }),
    ).toBe('/inspection/INS%20%2F%2042?scope=all&date_from=2026-08-01')

    expect(
      buildInspectionRecordsLocation({
        search: '?scope=all&unsafe=1&date_from=2026-08-01',
        recordScope: 'all',
      }),
    ).toBe('/inspection?scope=all&date_from=2026-08-01')
  })

  it('preserves only approved actionable queue context', () => {
    const search =
      '?scope=actionable&action=approve&status=Rejected&team_id=7&date_to=2026-08-11&unsafe=1'

    expect(buildInspectionDetailLocation({ reportId: 52, search, recordScope: 'actionable' })).toBe(
      '/inspection/52?scope=actionable&action=approve&status=Rejected&team_id=7&date_to=2026-08-11',
    )
  })

  it('keeps Mine as the clean default and handles a missing record identity safely', () => {
    expect(buildInspectionDetailLocation({ reportId: 'INS-1', recordScope: 'mine' })).toBe(
      '/inspection/INS-1',
    )
    expect(buildInspectionDetailLocation({ reportId: '', recordScope: 'mine' })).toBe('/inspection')
  })
})
