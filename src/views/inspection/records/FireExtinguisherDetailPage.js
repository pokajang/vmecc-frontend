import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CAlert, CBadge, CButton, CCard, CCardBody } from '@coreui/react'
import { ArrowLeft } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { InspectionPhotoViewerModal } from 'src/views/inspection/form/components/InspectionDisplayShared'
import {
  fetchFireExtinguisherCoverageDetail,
  fetchFireExtinguisherInspectionHistory,
} from 'src/views/inspection/inspectionFireExtinguisherApi'
import { CoverageDetailBody, getPeriodLabel } from './AllExtinguishersSection'
import {
  buildFireExtinguisherCatalogLocation,
  isSafeFireExtinguisherReturnLocation,
  parseFireExtinguisherCatalogViewState,
} from './fireExtinguisherCatalogViewState'

const lifecycleTone = {
  active: 'success',
  out_of_service: 'warning',
  retired: 'secondary',
}

const lifecycleLabel = {
  active: 'Active',
  out_of_service: 'Out of service',
  retired: 'Retired',
}

const FireExtinguisherDetailPage = ({
  currentUser,
  canManageCatalog = false,
  canManageIssues = false,
  canVerifyIssues = false,
}) => {
  const { extinguisherId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const requestRef = useRef({ id: 0, controller: null })
  const historyRequestRef = useRef({ id: 0, controller: null })
  const [detail, setDetail] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [historyError, setHistoryError] = useState('')
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState(null)
  const [photoViewer, setPhotoViewer] = useState(null)
  const [feedback, setFeedback] = useState(null)

  const catalogViewState = useMemo(
    () => ({
      ...parseFireExtinguisherCatalogViewState(location.state?.catalogSearch || ''),
      ...(location.state?.catalogViewState || {}),
    }),
    [location.state],
  )
  const periodLabel = getPeriodLabel(
    catalogViewState.period,
    catalogViewState.periodFrom,
    catalogViewState.periodTo,
  )
  const returnTo = isSafeFireExtinguisherReturnLocation(location.state?.returnTo)
    ? location.state.returnTo
    : buildFireExtinguisherCatalogLocation(catalogViewState)

  const load = useCallback(async () => {
    requestRef.current.controller?.abort()
    const requestId = requestRef.current.id + 1
    const controller = new AbortController()
    requestRef.current = { id: requestId, controller }
    setIsLoading(true)
    setError('')
    setHistoryError('')
    try {
      const [detailResult, historyResult] = await Promise.allSettled([
        fetchFireExtinguisherCoverageDetail(
          extinguisherId,
          {
            period: catalogViewState.period,
            periodFrom: catalogViewState.period === 'custom' ? catalogViewState.periodFrom : '',
            periodTo: catalogViewState.period === 'custom' ? catalogViewState.periodTo : '',
          },
          { signal: controller.signal },
        ),
        fetchFireExtinguisherInspectionHistory(
          extinguisherId,
          {
            page: 1,
            perPage: 25,
            period: catalogViewState.period,
            periodFrom: catalogViewState.period === 'custom' ? catalogViewState.periodFrom : '',
            periodTo: catalogViewState.period === 'custom' ? catalogViewState.periodTo : '',
          },
          { signal: controller.signal },
        ),
      ])
      if (requestRef.current.id !== requestId) return
      if (detailResult.status === 'rejected') throw detailResult.reason
      const fallbackHistory = detailResult.value.data?.historyRecords || []
      const historyRecords =
        historyResult.status === 'fulfilled' ? historyResult.value.data : fallbackHistory
      const historyMeta =
        historyResult.status === 'fulfilled'
          ? historyResult.value.meta
          : { page: 1, lastPage: 1, total: fallbackHistory.length }
      if (historyResult.status === 'rejected') {
        setHistoryError(
          historyResult.reason?.message || 'Unable to load paginated inspection history.',
        )
      }
      setDetail({
        ...detailResult.value.data,
        historyRecords,
        latestHistoryRecord: historyRecords[0] || null,
        historyMeta,
      })
    } catch (requestError) {
      if (requestError?.name === 'AbortError' || requestRef.current.id !== requestId) return
      setError(requestError?.message || 'Unable to load extinguisher details.')
    } finally {
      if (requestRef.current.id === requestId) {
        setIsLoading(false)
        requestRef.current.controller = null
      }
    }
  }, [
    catalogViewState.period,
    catalogViewState.periodFrom,
    catalogViewState.periodTo,
    extinguisherId,
  ])

  useEffect(() => {
    load()
    return () => {
      requestRef.current.id += 1
      requestRef.current.controller?.abort()
      historyRequestRef.current.id += 1
      historyRequestRef.current.controller?.abort()
    }
  }, [load])

  const loadHistoryPage = useCallback(
    async (page) => {
      historyRequestRef.current.controller?.abort()
      const requestId = historyRequestRef.current.id + 1
      const controller = new AbortController()
      historyRequestRef.current = { id: requestId, controller }
      setIsLoadingHistory(true)
      setHistoryError('')
      try {
        const history = await fetchFireExtinguisherInspectionHistory(
          extinguisherId,
          {
            page,
            perPage: 25,
            period: catalogViewState.period,
            periodFrom: catalogViewState.period === 'custom' ? catalogViewState.periodFrom : '',
            periodTo: catalogViewState.period === 'custom' ? catalogViewState.periodTo : '',
          },
          { signal: controller.signal },
        )
        if (historyRequestRef.current.id !== requestId) return
        setDetail((current) => ({
          ...(current || {}),
          historyRecords: history.data,
          historyMeta: history.meta,
        }))
      } catch (requestError) {
        if (requestError?.name === 'AbortError' || historyRequestRef.current.id !== requestId)
          return
        setHistoryError(requestError?.message || 'Unable to load inspection history.')
      } finally {
        if (historyRequestRef.current.id === requestId) {
          setIsLoadingHistory(false)
          historyRequestRef.current.controller = null
        }
      }
    },
    [
      catalogViewState.period,
      catalogViewState.periodFrom,
      catalogViewState.periodTo,
      extinguisherId,
    ],
  )

  const handleAssetChanged = (updated, result = {}) => {
    if (updated) setDetail((current) => ({ ...(current || {}), ...updated }))
    if (result.message) setFeedback(result)
  }

  return (
    <div
      className="fire-extinguisher-detail-page d-grid gap-3"
      data-testid="fire-extinguisher-detail-page"
    >
      <div className="fire-extinguisher-detail-page__header d-flex flex-wrap align-items-start justify-content-between gap-3">
        <div className="d-grid gap-1">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <h2 className="h4 mb-0">
              {detail?.idLocNo || detail?.barcodeNo || 'Fire extinguisher'}
            </h2>
            {detail ? (
              <CBadge color={lifecycleTone[detail.lifecycleStatus || 'active'] || 'secondary'}>
                {lifecycleLabel[detail.lifecycleStatus || 'active'] || detail.lifecycleStatus}
              </CBadge>
            ) : null}
          </div>
          {detail ? (
            <div className="text-body-secondary">
              {[detail.zone, detail.location || detail.mainLocation, detail.subLocation]
                .filter(Boolean)
                .join(' > ')}
            </div>
          ) : null}
        </div>
        <CButton
          type="button"
          color="secondary"
          variant="outline"
          size="sm"
          className="inspection-compact-action-btn d-inline-flex align-items-center gap-1"
          onClick={() => navigate(returnTo, { replace: true, state: { catalogViewState } })}
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back to all extinguishers
        </CButton>
      </div>

      {feedback?.message ? (
        <CAlert
          color="success"
          dismissible
          onClose={() => setFeedback(null)}
          className="mb-0"
          role="status"
        >
          <div className="d-flex flex-wrap align-items-center gap-2">
            <span>{feedback.message}</span>
            {feedback.lifecycleFilter ? (
              <CButton
                type="button"
                color="link"
                className="p-0 fw-semibold"
                onClick={() =>
                  navigate(
                    buildFireExtinguisherCatalogLocation({
                      ...catalogViewState,
                      lifecycleFilter: feedback.lifecycleFilter,
                      currentPage: 1,
                    }),
                    { replace: true },
                  )
                }
              >
                {feedback.followUpLabel || 'View updated assets'}
              </CButton>
            ) : null}
          </div>
        </CAlert>
      ) : null}

      <CCard className="fire-extinguisher-detail-page__content">
        <CCardBody>
          <CoverageDetailBody
            detail={detail}
            isLoading={isLoading}
            error={error}
            onRetry={load}
            onViewPhotos={setPhotoViewer}
            view={selectedHistoryRecord ? 'historyDetail' : 'overview'}
            selectedHistoryRecord={selectedHistoryRecord}
            periodLabel={periodLabel}
            onSelectHistoryRecord={setSelectedHistoryRecord}
            currentUser={currentUser}
            canManageCatalog={canManageCatalog}
            canManageIssues={canManageIssues}
            canVerifyIssues={canVerifyIssues}
            onAssetChanged={handleAssetChanged}
            isLoadingHistory={isLoadingHistory}
            historyError={historyError}
            onHistoryPageChange={loadHistoryPage}
            pageLayout
          />
          {selectedHistoryRecord ? (
            <CButton
              type="button"
              color="secondary"
              variant="outline"
              className="mt-3"
              onClick={() => setSelectedHistoryRecord(null)}
            >
              Back to asset overview
            </CButton>
          ) : null}
        </CCardBody>
      </CCard>

      <InspectionPhotoViewerModal viewer={photoViewer} onClose={() => setPhotoViewer(null)} />
    </div>
  )
}

export default FireExtinguisherDetailPage
