// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import useInspectionModuleRecordActions from '../app/useInspectionModuleRecordActions'
import { downloadInspectionReportPdf } from '../inspectionApi'
import { triggerBlobDownload } from 'src/utils/downloadFile'

vi.mock('../inspectionApi', () => ({
  downloadInspectionReportPdf: vi.fn(),
  persistInspectionRecord: vi.fn(),
}))

vi.mock('src/utils/downloadFile', () => ({
  triggerBlobDownload: vi.fn(),
}))

const buildHookProps = (overrides = {}) => ({
  clearWorkingState: vi.fn(),
  deleteRecord: vi.fn(),
  deleteTarget: null,
  editingRecord: null,
  loadWorkspace: vi.fn(),
  navigate: vi.fn(),
  prepareContinuationPrompt: vi.fn(),
  pushToast: vi.fn(),
  records: [
    {
      id: 'inspection-1',
      displayId: 'INS-2026-001',
      incidentType: 'Fire Extinguisher Inspection',
      incidentDate: '2026-07-15',
      canDownloadPdf: true,
    },
  ],
  refreshQueueRows: vi.fn(),
  reloadRecords: vi.fn(),
  reportBasePath: '/inspection',
  reportId: 'inspection-1',
  reportTypeLabel: 'Inspection',
  setDeleteTarget: vi.fn(),
  setDraftVersion: vi.fn(),
  setDownloadingId: vi.fn(),
  setIsDeleting: vi.fn(),
  setIsSubmitting: vi.fn(),
  setContinuationPrompt: vi.fn(),
  submitLockRef: { current: false },
  user: { id: 7, name: 'Alex Tan' },
  ...overrides,
})

describe('useInspectionModuleRecordActions downloadRecord', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('announces preparation immediately and where to find the completed download', async () => {
    let resolveDownload
    const downloadPromise = new Promise((resolve) => {
      resolveDownload = resolve
    })
    downloadInspectionReportPdf.mockReturnValue(downloadPromise)
    const props = buildHookProps()
    const { result } = renderHook(() => useInspectionModuleRecordActions(props))

    let actionPromise
    act(() => {
      actionPromise = result.current.downloadRecord('inspection-1')
    })

    expect(props.setDownloadingId).toHaveBeenCalledWith('inspection-1')
    expect(props.pushToast).toHaveBeenNthCalledWith(1, 'Preparing your PDF for download...', {
      title: 'Downloading report',
      color: 'info',
      delay: 0,
    })

    const blob = new Blob(['%PDF-1.4 report'], { type: 'application/pdf' })
    await act(async () => {
      resolveDownload({ blob })
      await actionPromise
    })

    expect(triggerBlobDownload).toHaveBeenCalledWith(
      blob,
      '2026-07-15 - Fire Extinguisher - Alex Tan.pdf',
    )
    expect(props.pushToast).toHaveBeenNthCalledWith(
      2,
      "Your PDF is ready. Check your browser downloads or your device's Downloads folder.",
      {
        title: 'Download started',
        color: 'success',
        delay: 7000,
      },
    )
    expect(props.setDownloadingId).toHaveBeenLastCalledWith(null)
  })

  it('replaces the preparation status with an actionable error', async () => {
    downloadInspectionReportPdf.mockRejectedValue(new Error('PDF service unavailable'))
    const props = buildHookProps()
    const { result } = renderHook(() => useInspectionModuleRecordActions(props))

    await act(async () => {
      await result.current.downloadRecord('inspection-1')
    })

    expect(triggerBlobDownload).not.toHaveBeenCalled()
    expect(props.pushToast).toHaveBeenLastCalledWith('PDF service unavailable', {
      title: 'Download failed',
      color: 'danger',
    })
    expect(props.setDownloadingId).toHaveBeenLastCalledWith(null)
  })

  it('ignores rapid duplicate download requests until the first one finishes', async () => {
    let resolveDownload
    downloadInspectionReportPdf.mockReturnValue(
      new Promise((resolve) => {
        resolveDownload = resolve
      }),
    )
    const props = buildHookProps()
    const { result } = renderHook(() => useInspectionModuleRecordActions(props))

    let firstDownload
    await act(async () => {
      firstDownload = result.current.downloadRecord('inspection-1')
      await result.current.downloadRecord('inspection-1')
    })

    expect(downloadInspectionReportPdf).toHaveBeenCalledOnce()
    expect(props.pushToast).toHaveBeenCalledOnce()

    await act(async () => {
      resolveDownload({ blob: new Blob(['%PDF-1.4 report'], { type: 'application/pdf' }) })
      await firstDownload
    })
  })

  it('ignores rapid duplicate delete confirmations until the first one finishes', async () => {
    let resolveDelete
    const deleteRecord = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveDelete = resolve
        }),
    )
    const props = buildHookProps({
      deleteRecord,
      deleteTarget: {
        id: 'inspection-1',
        displayId: 'INS-2026-001',
        ownerUserId: 7,
        status: 'Submitted',
      },
    })
    const { result } = renderHook(() => useInspectionModuleRecordActions(props))

    let firstDelete
    await act(async () => {
      firstDelete = result.current.confirmDeleteRecord()
      await result.current.confirmDeleteRecord()
    })

    expect(deleteRecord).toHaveBeenCalledOnce()

    await act(async () => {
      resolveDelete({ saved: true })
      await firstDelete
    })
  })
})
