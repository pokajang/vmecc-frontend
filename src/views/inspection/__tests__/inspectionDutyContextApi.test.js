import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }))

vi.mock('src/services/apiClient', () => ({ apiRequest }))

import {
  confirmInspectionDutyContext,
  dutyConfirmationHeaders,
  fetchInspectionDutyContext,
} from '../domain/api/inspectionDutyContextApi'

describe('inspectionDutyContextApi', () => {
  beforeEach(() => apiRequest.mockReset())
  afterEach(() => vi.unstubAllEnvs())

  it('loads the server-authoritative duty context', async () => {
    apiRequest.mockResolvedValue({ data: { status: 'assigned' } })

    await expect(fetchInspectionDutyContext()).resolves.toEqual({ status: 'assigned' })
    expect(apiRequest).toHaveBeenCalledWith('/inspection/duty-context')
  })

  it('submits explicit confirmation bindings', async () => {
    apiRequest.mockResolvedValue({ data: { dutyConfirmationToken: 'token' } })

    await confirmInspectionDutyContext({
      operation: 'submit',
      contextVersion: 'dcv1:abc',
      teamId: 12,
      shiftKey: 'day',
      formId: 'general-inspection',
      recordId: 'report-1',
      idempotencyKey: 'request-1',
    })

    expect(apiRequest).toHaveBeenCalledWith('/inspection/duty-context/confirm', {
      method: 'POST',
      body: JSON.stringify({
        operation: 'submit',
        contextVersion: 'dcv1:abc',
        teamId: 12,
        shiftKey: 'day',
        formId: 'general-inspection',
        recordId: 'report-1',
        idempotencyKey: 'request-1',
      }),
    })
  })

  it('only emits the sensitive header for a non-empty token', () => {
    expect(dutyConfirmationHeaders(' token ')).toEqual({ 'X-Duty-Confirmation': 'token' })
    expect(dutyConfirmationHeaders('')).toEqual({})
  })

  it('resolves a high-confidence assignment into a scoped token when enabled', async () => {
    vi.stubEnv('VITE_INSPECTION_DUTY_CONFIRMATION_ENABLED', 'true')
    vi.resetModules()
    apiRequest
      .mockResolvedValueOnce({
        data: {
          status: 'assigned',
          confidence: 'high',
          contextVersion: 'dcv1:assigned',
          teamId: 12,
          shiftKey: 'day',
        },
      })
      .mockResolvedValueOnce({ data: { dutyConfirmationToken: 'scoped-token' } })
    const { resolveInspectionDutyConfirmation } = await import(
      '../domain/api/inspectionDutyContextApi'
    )

    await expect(
      resolveInspectionDutyConfirmation({ operation: 'submit', recordId: 'report-1' }),
    ).resolves.toBe('scoped-token')
    expect(apiRequest).toHaveBeenCalledTimes(2)
    expect(apiRequest.mock.calls[1][0]).toBe('/inspection/duty-context/confirm')
    expect(JSON.parse(apiRequest.mock.calls[1][1].body)).toMatchObject({
      operation: 'submit',
      contextVersion: 'dcv1:assigned',
      teamId: 12,
      shiftKey: 'day',
      recordId: 'report-1',
    })
  })

  it('fails closed for ambiguous contexts without queueable network semantics', async () => {
    vi.stubEnv('VITE_INSPECTION_DUTY_CONFIRMATION_ENABLED', 'true')
    vi.resetModules()
    apiRequest.mockResolvedValueOnce({
      data: { status: 'ambiguous', contextVersion: 'dcv1:ambiguous', candidates: [] },
    })
    const { resolveInspectionDutyConfirmation } = await import(
      '../domain/api/inspectionDutyContextApi'
    )

    await expect(resolveInspectionDutyConfirmation({ operation: 'submit' })).rejects.toMatchObject({
      code: 'duty_context_ambiguous',
    })
    expect(apiRequest).toHaveBeenCalledTimes(1)
  })

  it.each([
    [{ status: 'unmatched' }, 'duty_context_unmatched'],
    [{ status: 'inferred', confidence: 'low' }, 'duty_context_unmatched'],
  ])('fails closed for an unusable context %#', async (context, code) => {
    vi.stubEnv('VITE_INSPECTION_DUTY_CONFIRMATION_ENABLED', 'true')
    vi.resetModules()
    apiRequest.mockResolvedValueOnce({ data: context })
    const { resolveInspectionDutyConfirmation } = await import(
      '../domain/api/inspectionDutyContextApi'
    )

    await expect(resolveInspectionDutyConfirmation({ operation: 'submit' })).rejects.toMatchObject({
      code,
    })
    expect(apiRequest).toHaveBeenCalledTimes(1)
  })

  it('does not make confirmation calls while the rollout flag is disabled', async () => {
    vi.stubEnv('VITE_INSPECTION_DUTY_CONFIRMATION_ENABLED', 'false')
    vi.resetModules()
    const { resolveInspectionDutyConfirmation } = await import(
      '../domain/api/inspectionDutyContextApi'
    )

    await expect(resolveInspectionDutyConfirmation({ operation: 'submit' })).resolves.toBe('')
    expect(apiRequest).not.toHaveBeenCalled()
  })
})
