import { describe, expect, it, vi } from 'vitest'
import { buildInspectionRowActionItems } from '../records/inspectionRecordActions'

const handlers = {
  onEditRecord: vi.fn(),
  onReviewTransition: vi.fn(),
  onApproveTransition: vi.fn(),
  onRejectTransition: vi.fn(),
  onDownloadRecord: vi.fn(),
  onDeleteRecord: vi.fn(),
  canEditRecord: () => true,
  canReviewRecord: () => true,
  canApproveRecord: () => false,
  canRejectRecord: () => false,
  canDeleteRecord: () => true,
  downloadingId: null,
}

describe('buildInspectionRowActionItems', () => {
  it('uses the server capability to enable a submitted report download', () => {
    const items = buildInspectionRowActionItems(
      { id: 'inspection-1', status: 'Submitted', canDownloadPdf: true },
      handlers,
    )

    expect(items.find((item) => item.key === 'download')).toMatchObject({
      disabled: false,
      disabledReason: undefined,
    })
  })

  it('fails closed when PDF capability is absent or false', () => {
    for (const canDownloadPdf of [undefined, false]) {
      const items = buildInspectionRowActionItems(
        { id: 'inspection-1', status: 'Submitted', canDownloadPdf },
        handlers,
      )

      expect(items.find((item) => item.key === 'download')).toMatchObject({
        disabled: true,
        disabledReason: 'PDF download is not available for this report.',
      })
    }
  })

  it('uses download-specific progress wording while a PDF is in flight', () => {
    const items = buildInspectionRowActionItems(
      { id: 'inspection-1', status: 'Submitted', canDownloadPdf: true },
      { ...handlers, downloadingId: 'inspection-1' },
    )

    expect(items.find((item) => item.key === 'download')).toMatchObject({
      label: 'Downloading...',
      disabled: true,
      disabledReason: 'Another report PDF is being downloaded.',
    })
  })
})
