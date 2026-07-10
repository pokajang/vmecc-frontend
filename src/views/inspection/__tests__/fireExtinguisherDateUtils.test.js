import { describe, expect, it } from 'vitest'
import { calculateFireExtinguisherDaysLeft } from '../domain/fireExtinguisherDateUtils'
import {
  formatFireExtinguisherDaysLeft,
  formatFireExtinguisherLastInspection,
} from '../types/fire-extinguisher/helpers'

const TODAY = new Date(2026, 6, 5)

describe('fire extinguisher date utilities', () => {
  it('calculates days left as certification validity minus today', () => {
    expect(calculateFireExtinguisherDaysLeft('2025-07-01', TODAY)).toBe('-369')
    expect(calculateFireExtinguisherDaysLeft('2026-07-05', TODAY)).toBe('0')
    expect(calculateFireExtinguisherDaysLeft('2026-07-10', TODAY)).toBe('5')
  })

  it('formats expired and future certification dates clearly', () => {
    expect(formatFireExtinguisherDaysLeft('2025-07-01', TODAY)).toBe('369 days expired')
    expect(formatFireExtinguisherDaysLeft('2026-07-10', TODAY)).toBe('5 days left')
  })

  it('formats last submitted inspection context for extinguisher cards', () => {
    expect(
      formatFireExtinguisherLastInspection(
        {
          inspectedAt: '2026-07-05T09:42:00+08:00',
          inspectedBy: 'Jang',
        },
        TODAY,
      ),
    ).toMatch(/^Last submitted inspection: today at .+ by Jang$/)

    expect(
      formatFireExtinguisherLastInspection(
        {
          inspectedAt: '2026-07-02T09:42:00+08:00',
          inspectedBy: 'Jang',
        },
        TODAY,
      ),
    ).toBe('Last submitted inspection: 3 days ago by Jang')

    expect(formatFireExtinguisherLastInspection(null, TODAY)).toBe(
      'No previous submitted inspection',
    )
  })
})
