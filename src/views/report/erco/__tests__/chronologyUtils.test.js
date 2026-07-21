import { describe, expect, it } from 'vitest'
import { isChronologySequenceOutOfOrder, sortChronologyRowsByTime } from '../chronologyUtils'

describe('ERCO chronology ordering', () => {
  it('treats an overnight response as chronological across midnight', () => {
    expect(
      isChronologySequenceOutOfOrder([{ time: '23:55' }, { time: '00:05' }, { time: '00:20' }]),
    ).toBe(false)
  })

  it('still identifies a small backwards jump as out of order', () => {
    expect(isChronologySequenceOutOfOrder([{ time: '09:10' }, { time: '09:05' }])).toBe(true)
  })

  it('sorts post-midnight events after late-night events using the incident start', () => {
    const rows = [
      { id: 'after-midnight', time: '00:10' },
      { id: 'late-night', time: '23:55' },
      { id: 'invalid', time: '' },
    ]

    expect(sortChronologyRowsByTime(rows, '23:45').map((row) => row.id)).toEqual([
      'late-night',
      'after-midnight',
      'invalid',
    ])
  })
})
