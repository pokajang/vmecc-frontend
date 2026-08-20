import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { triggerBlobDownload } from 'src/utils/downloadFile'
import {
  downloadFireExtinguisherExceptionExport,
  previewFireExtinguisherExceptionExport,
} from 'src/views/inspection/inspectionFireExtinguisherApi'
import {
  buildFireExtinguisherExportFilters,
  getInitialFireExtinguisherExportCategories,
  hasFireExtinguisherExportFilterContext,
} from './fireExtinguisherExportFilters'

const EMPTY_PREVIEW = {
  total: 0,
  issues: 0,
  expired: 0,
  overlap: 0,
  appliedFilters: [],
  scope: 'current_filters',
}

const fallbackFilename = (categories, format) => {
  const category =
    categories.length === 2
      ? 'issues-and-expired'
      : categories.includes('expired')
        ? 'expired'
        : 'issues'
  return `fire-extinguisher-${category}.${format}`
}

const useFireExtinguisherExceptionExport = ({ visible, filterSnapshot = {} }) => {
  const [categories, setCategories] = useState([])
  const [format, setFormat] = useState('pdf')
  const [scope, setScope] = useState('current_filters')
  const [preview, setPreview] = useState(EMPTY_PREVIEW)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const requestSequence = useRef(0)
  const hasCurrentContext = useMemo(
    () => hasFireExtinguisherExportFilterContext(filterSnapshot),
    [filterSnapshot],
  )
  const filters = useMemo(
    () => buildFireExtinguisherExportFilters(filterSnapshot),
    [filterSnapshot],
  )

  useEffect(() => {
    if (!visible) return
    setCategories(getInitialFireExtinguisherExportCategories(filterSnapshot))
    setFormat('pdf')
    setScope(hasCurrentContext ? 'current_filters' : 'all')
    setPreview(EMPTY_PREVIEW)
    setPreviewError('')
    setFeedback(null)
  }, [filterSnapshot, hasCurrentContext, visible])

  const payload = useMemo(
    () => ({
      categories: categories.length ? categories : ['issues', 'expired'],
      scope,
      filters: scope === 'current_filters' ? filters : {},
    }),
    [categories, filters, scope],
  )

  const refreshPreview = useCallback(async () => {
    const sequence = ++requestSequence.current
    setIsPreviewing(true)
    setPreviewError('')
    try {
      const result = await previewFireExtinguisherExceptionExport(payload)
      if (sequence === requestSequence.current) setPreview(result)
    } catch (error) {
      if (sequence === requestSequence.current) {
        setPreview(EMPTY_PREVIEW)
        setPreviewError(error?.message || 'Unable to check matching extinguishers.')
      }
    } finally {
      if (sequence === requestSequence.current) setIsPreviewing(false)
    }
  }, [payload])

  useEffect(() => {
    if (!visible) return undefined
    setIsPreviewing(true)
    const timer = window.setTimeout(refreshPreview, 220)
    return () => window.clearTimeout(timer)
  }, [refreshPreview, visible])

  const toggleCategory = useCallback((category) => {
    setCategories((current) =>
      current.includes(category)
        ? current.filter((value) => value !== category)
        : [...current, category],
    )
    setFeedback(null)
  }, [])

  const download = useCallback(async () => {
    if (isDownloading || categories.length === 0 || preview.total === 0) return false
    setIsDownloading(true)
    setFeedback({
      color: 'info',
      message: `Preparing your ${format === 'docx' ? 'Word document' : 'PDF'}…`,
    })
    try {
      const result = await downloadFireExtinguisherExceptionExport({
        ...payload,
        categories,
        format,
      })
      triggerBlobDownload(result.blob, result.filename || fallbackFilename(categories, format))
      setFeedback({
        color: 'success',
        message: 'Download complete. Check your Downloads folder.',
      })
      return true
    } catch (error) {
      setFeedback({ color: 'danger', message: error?.message || 'Unable to export the report.' })
      return false
    } finally {
      setIsDownloading(false)
    }
  }, [categories, format, isDownloading, payload, preview.total])

  const clearFeedback = useCallback(() => {
    setFeedback(null)
  }, [])

  return {
    categories,
    format,
    scope,
    preview,
    isPreviewing,
    previewError,
    isDownloading,
    feedback,
    clearFeedback,
    hasCurrentContext,
    setFormat,
    setScope,
    toggleCategory,
    refreshPreview,
    download,
  }
}

export default useFireExtinguisherExceptionExport
