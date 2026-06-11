import { expect, test } from 'vitest'
import {
  isLeaveCancellable,
  isLeaveCancellableByApplicant,
  isLeaveCancellableByAdmin,
} from '../leaveWorkflow'

test('isLeaveCancellable rules', () => {
  expect(isLeaveCancellable({ status: 'Rejected' })).toBe(false)
  expect(isLeaveCancellable({ status: 'Approved' })).toBe(true)
  expect(isLeaveCancellable({ status: 'Pending review', workflowStage: 'review' })).toBe(true)
})

test('isLeaveCancellableByApplicant rules', () => {
  expect(isLeaveCancellableByApplicant({ status: 'Pending' })).toBe(true)
  expect(isLeaveCancellableByApplicant({ status: 'Approved' })).toBe(false)
  expect(isLeaveCancellableByApplicant({ status: 'Rejected' })).toBe(false)
})

test('isLeaveCancellableByAdmin rules', () => {
  expect(isLeaveCancellableByAdmin({ status: 'Pending' })).toBe(true)
  expect(isLeaveCancellableByAdmin({ status: 'Approved' })).toBe(true)
  expect(isLeaveCancellableByAdmin({ status: 'Rejected' })).toBe(false)
})
