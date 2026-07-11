import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  collectInspectionLeasedPhotos,
  renewInspectionPayloadMediaLeases,
  shouldRenewInspectionMediaLeases,
} from '../domain/media/inspectionMediaLease'

const reportMediaMock = vi.hoisted(() => ({ renewReportMediaLease: vi.fn() }))
vi.mock('src/services/api/reportMediaApi', () => reportMediaMock)

describe('inspection media lease helpers', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deduplicates leased media across nested inspection evidence', () => {
    const photo = { mediaId: 'rpm-1', leaseId: 'lease-1' }
    expect(
      collectInspectionLeasedPhotos({
        photos: [photo],
        checks: [{ defectPhotos: [photo, { mediaId: 'rpm-2' }] }],
      }),
    ).toEqual([photo])
  })

  it('renews each leased photo with the owning operation context', async () => {
    reportMediaMock.renewReportMediaLease.mockResolvedValue({ renewed: true })
    const payload = {
      checks: [
        { photos: [{ mediaId: 'rpm-1', leaseId: 'lease-1' }] },
        { photos: [{ mediaId: 'rpm-2', leaseId: 'lease-2' }] },
      ],
    }

    await expect(renewInspectionPayloadMediaLeases(payload, 'operation-1')).resolves.toBe(2)
    expect(reportMediaMock.renewReportMediaLease).toHaveBeenCalledTimes(2)
    expect(reportMediaMock.renewReportMediaLease).toHaveBeenCalledWith(
      expect.objectContaining({ mediaId: 'rpm-1' }),
      'operation-1',
    )
  })

  it('renews missing or stale timestamps but not recently renewed leases', () => {
    const now = Date.parse('2026-07-11T12:00:00Z')
    expect(shouldRenewInspectionMediaLeases('', now)).toBe(true)
    expect(shouldRenewInspectionMediaLeases('2026-07-10T12:00:00Z', now)).toBe(true)
    expect(shouldRenewInspectionMediaLeases('2026-07-11T06:00:00Z', now)).toBe(false)
  })
})
