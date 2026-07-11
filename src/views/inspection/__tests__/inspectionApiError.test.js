import { describe, expect, it } from 'vitest'
import {
  getInspectionApiErrorMessage,
  normalizeInspectionApiError,
} from '../domain/api/inspectionApiError'

describe('inspection API error normalization', () => {
  it('retains stable codes and Laravel field errors', () => {
    const error = new Error('The given data was invalid.')
    error.status = 422
    error.payload = {
      code: 'inspection_payload_invalid',
      message: 'The given data was invalid.',
      errors: {
        'payload.fireExtinguisherChecks.0.operationalConditionRemarks': [
          'Add remarks for the failed operational condition.',
        ],
      },
    }

    expect(normalizeInspectionApiError(error)).toMatchObject({
      status: 422,
      code: 'inspection_payload_invalid',
      message: 'Add remarks for the failed operational condition.',
      firstField: 'payload.fireExtinguisherChecks.0.operationalConditionRemarks',
      validationFailed: true,
      retryable: false,
    })
  })

  it('normalizes scalar field errors and removes blank messages', () => {
    const normalized = normalizeInspectionApiError({
      status: 409,
      payload: {
        code: 'inspection_result_version_conflict',
        errors: { version: 'This result changed since it was loaded.', empty: '' },
      },
    })

    expect(normalized.fieldErrors).toEqual({
      version: ['This result changed since it was loaded.'],
    })
    expect(normalized.conflict).toBe(true)
  })

  it('classifies network and server failures as retryable', () => {
    const networkError = new TypeError('Failed to fetch')
    expect(normalizeInspectionApiError(networkError)).toMatchObject({
      status: 0,
      retryable: true,
      networkFailure: true,
    })
    expect(normalizeInspectionApiError({ status: 503 }).retryable).toBe(true)
  })

  it('uses a useful field message before a generic fallback', () => {
    expect(
      getInspectionApiErrorMessage(
        { status: 422, payload: { errors: { remarks: ['Remarks are required.'] } } },
        'Unable to save.',
      ),
    ).toBe('Remarks are required.')
  })
})
