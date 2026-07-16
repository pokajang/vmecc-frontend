import { describe, expect, it } from 'vitest'
import {
  getInspectionStatusSeverity,
  isInspectionIssueStatus,
  isInspectionNeutralStatus,
} from '../domain/inspectionStatusSemantics'

describe('inspection status semantics', () => {
  it.each(['Defect', 'Missing', 'Issue', 'Not Good', 'Not Operational', 'No', 'Failed'])(
    'classifies %s as an issue',
    (status) => {
      expect(isInspectionIssueStatus(status)).toBe(true)
      expect(getInspectionStatusSeverity(status)).toBe('issue')
    },
  )

  it.each(['N/A', 'NA', 'Not Applicable'])('classifies %s as neutral', (status) => {
    expect(isInspectionNeutralStatus(status)).toBe(true)
    expect(isInspectionIssueStatus(status)).toBe(false)
    expect(getInspectionStatusSeverity(status)).toBe('neutral')
  })

  it('keeps unanswered and incomplete presentation states out of issue counts', () => {
    expect(getInspectionStatusSeverity('')).toBe('unanswered')
    expect(isInspectionIssueStatus('Needs attention')).toBe(false)
    expect(isInspectionIssueStatus('Pending')).toBe(false)
  })
})
