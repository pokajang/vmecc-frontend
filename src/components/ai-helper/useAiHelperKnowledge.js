import { useCallback, useEffect, useRef, useState } from 'react'

import {
  deleteAiHelperDocument,
  fetchAiHelperDocumentDetail,
  fetchAiHelperDocumentFileBlob,
  fetchAiHelperDocuments,
  uploadAiHelperDocument,
} from 'src/services/apiClient'
import {
  isAiHelperListFresh,
  KNOWLEDGE_READER_TAB_ORIGINAL,
  KNOWLEDGE_VIEW_UPLOAD,
  safeAiHelperError,
} from './constants'

const isKnowledgeEntry = (value) =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value) && value.id != null)

const knowledgeEntriesFromResponse = (response) => {
  const entries = response?.data
  if (!Array.isArray(entries) || entries.some((entry) => !isKnowledgeEntry(entry))) {
    throw new Error('Invalid knowledge list response.')
  }
  return entries
}

const knowledgeEntryFromResponse = (response, message) => {
  const entry = response?.data
  if (!isKnowledgeEntry(entry)) throw new Error(message)
  return entry
}

const prependKnowledgeEntry = (entries, entry) => [
  entry,
  ...entries.filter((item) => item?.id !== entry.id),
]

const useAiHelperKnowledge = ({ authUser }) => {
  const authUserId = authUser?.id
  const [knowledgeLoading, setKnowledgeLoading] = useState(false)
  const [knowledgeLoaded, setKnowledgeLoaded] = useState(false)
  const [knowledgeLastLoadedAt, setKnowledgeLastLoadedAt] = useState(null)
  const [knowledgeError, setKnowledgeError] = useState(null)
  const [knowledgeEntries, setKnowledgeEntries] = useState([])
  const [knowledgeView, setKnowledgeView] = useState(KNOWLEDGE_VIEW_UPLOAD)
  const [knowledgeFile, setKnowledgeFile] = useState(null)
  const [knowledgeFileInputKey, setKnowledgeFileInputKey] = useState(0)
  const [knowledgeTitle, setKnowledgeTitle] = useState('')
  const [knowledgeVisibility, setKnowledgeVisibility] = useState('personal')
  const [knowledgeAcknowledged, setKnowledgeAcknowledged] = useState(false)
  const [knowledgeUploading, setKnowledgeUploading] = useState(false)
  const [knowledgeUpdatingId, setKnowledgeUpdatingId] = useState(null)
  const [knowledgeDeleteTarget, setKnowledgeDeleteTarget] = useState(null)
  const [knowledgeReaderOpen, setKnowledgeReaderOpen] = useState(false)
  const [knowledgeReaderLoading, setKnowledgeReaderLoading] = useState(false)
  const [knowledgeReaderError, setKnowledgeReaderError] = useState(null)
  const [knowledgeReaderTab, setKnowledgeReaderTab] = useState(KNOWLEDGE_READER_TAB_ORIGINAL)
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState(null)
  const [selectedKnowledgeDetail, setSelectedKnowledgeDetail] = useState(null)
  const [knowledgeReaderPdfUrl, setKnowledgeReaderPdfUrl] = useState('')
  const [knowledgeReaderPdfLoading, setKnowledgeReaderPdfLoading] = useState(false)
  const [knowledgeReaderPdfError, setKnowledgeReaderPdfError] = useState(null)
  const knowledgeListRequestRef = useRef(null)
  const knowledgeListRequestIdRef = useRef(0)
  const knowledgeReaderRequestRef = useRef(0)
  const knowledgeReaderPdfUrlRef = useRef('')
  const authUserIdRef = useRef(null)

  useEffect(() => {
    authUserIdRef.current = authUserId || null
  }, [authUserId])

  useEffect(() => {
    setKnowledgeLoading(false)
    setKnowledgeLoaded(false)
    setKnowledgeLastLoadedAt(null)
    knowledgeListRequestRef.current = null
    knowledgeListRequestIdRef.current = 0
    setKnowledgeEntries([])
    setKnowledgeError(null)
    setKnowledgeDeleteTarget(null)
    setKnowledgeReaderOpen(false)
    setKnowledgeReaderLoading(false)
    setKnowledgeReaderError(null)
    setKnowledgeReaderTab(KNOWLEDGE_READER_TAB_ORIGINAL)
    setSelectedKnowledgeId(null)
    setSelectedKnowledgeDetail(null)
    if (
      knowledgeReaderPdfUrlRef.current &&
      typeof URL !== 'undefined' &&
      typeof URL.revokeObjectURL === 'function'
    ) {
      URL.revokeObjectURL(knowledgeReaderPdfUrlRef.current)
    }
    knowledgeReaderPdfUrlRef.current = ''
    setKnowledgeReaderPdfUrl('')
    setKnowledgeReaderPdfLoading(false)
    setKnowledgeReaderPdfError(null)
  }, [authUserId])

  useEffect(
    () => () => {
      if (
        knowledgeReaderPdfUrlRef.current &&
        typeof URL !== 'undefined' &&
        typeof URL.revokeObjectURL === 'function'
      ) {
        URL.revokeObjectURL(knowledgeReaderPdfUrlRef.current)
      }
      knowledgeReaderPdfUrlRef.current = ''
    },
    [],
  )

  const loadKnowledge = useCallback(
    ({ force = false, showError = true, background = false } = {}) => {
      if (!authUserId) return Promise.resolve()
      if (!force && knowledgeLoaded && isAiHelperListFresh(knowledgeLastLoadedAt)) {
        return Promise.resolve()
      }
      if (knowledgeListRequestRef.current) return knowledgeListRequestRef.current

      const requestId = ++knowledgeListRequestIdRef.current
      const requestUserId = authUserId
      setKnowledgeLoading(true)
      if (showError && !background) setKnowledgeError(null)

      const request = fetchAiHelperDocuments()
        .then((response) => {
          if (requestId !== knowledgeListRequestIdRef.current) return
          if (authUserIdRef.current !== requestUserId) return
          setKnowledgeEntries(knowledgeEntriesFromResponse(response))
          setKnowledgeLoaded(true)
          setKnowledgeLastLoadedAt(Date.now())
        })
        .catch((error) => {
          if (requestId !== knowledgeListRequestIdRef.current) return
          if (requestUserId !== authUserIdRef.current) return
          if (showError) {
            setKnowledgeError(safeAiHelperError(error, 'Could not load knowledge sources.'))
          }
        })
        .finally(() => {
          if (requestId !== knowledgeListRequestIdRef.current) return
          setKnowledgeLoading(false)
          knowledgeListRequestRef.current = null
        })

      knowledgeListRequestRef.current = request
      return request
    },
    [authUserId, knowledgeLastLoadedAt, knowledgeLoaded],
  )

  const setKnowledgeReaderPdfObjectUrl = useCallback((nextUrl) => {
    const previousUrl = knowledgeReaderPdfUrlRef.current
    if (
      previousUrl &&
      previousUrl !== nextUrl &&
      typeof URL !== 'undefined' &&
      typeof URL.revokeObjectURL === 'function'
    ) {
      URL.revokeObjectURL(previousUrl)
    }

    knowledgeReaderPdfUrlRef.current = nextUrl || ''
    setKnowledgeReaderPdfUrl(nextUrl || '')
  }, [])

  const closeKnowledgeReader = useCallback(() => {
    knowledgeReaderRequestRef.current += 1
    setKnowledgeReaderOpen(false)
    setKnowledgeReaderLoading(false)
    setKnowledgeReaderError(null)
    setKnowledgeReaderTab(KNOWLEDGE_READER_TAB_ORIGINAL)
    setSelectedKnowledgeId(null)
    setSelectedKnowledgeDetail(null)
    setKnowledgeReaderPdfObjectUrl('')
    setKnowledgeReaderPdfLoading(false)
    setKnowledgeReaderPdfError(null)
  }, [setKnowledgeReaderPdfObjectUrl])

  const loadPdfSource = useCallback(
    async (knowledgeId, requestId) => {
      setKnowledgeReaderPdfLoading(true)
      setKnowledgeReaderPdfError(null)
      setKnowledgeReaderPdfObjectUrl('')

      try {
        const blob = await fetchAiHelperDocumentFileBlob(knowledgeId)
        if (knowledgeReaderRequestRef.current !== requestId) return
        if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
          throw new Error('PDF preview is not supported in this browser.')
        }

        const objectUrl = URL.createObjectURL(blob)
        if (knowledgeReaderRequestRef.current !== requestId) {
          if (typeof URL.revokeObjectURL === 'function') {
            URL.revokeObjectURL(objectUrl)
          }
          return
        }

        setKnowledgeReaderPdfObjectUrl(objectUrl)
      } catch (error) {
        if (knowledgeReaderRequestRef.current !== requestId) return
        setKnowledgeReaderPdfError(
          safeAiHelperError(error, 'Could not load the original PDF file.'),
        )
      } finally {
        if (knowledgeReaderRequestRef.current !== requestId) return
        setKnowledgeReaderPdfLoading(false)
      }
    },
    [setKnowledgeReaderPdfObjectUrl],
  )

  const openKnowledgeReader = useCallback(
    async (knowledgeId) => {
      if (!knowledgeId) return

      const requestId = knowledgeReaderRequestRef.current + 1
      knowledgeReaderRequestRef.current = requestId
      setKnowledgeDeleteTarget(null)
      setKnowledgeReaderOpen(true)
      setKnowledgeReaderLoading(true)
      setKnowledgeReaderError(null)
      setKnowledgeReaderTab(KNOWLEDGE_READER_TAB_ORIGINAL)
      setSelectedKnowledgeId(knowledgeId)
      setSelectedKnowledgeDetail(null)
      setKnowledgeReaderPdfObjectUrl('')
      setKnowledgeReaderPdfLoading(false)
      setKnowledgeReaderPdfError(null)

      try {
        const response = await fetchAiHelperDocumentDetail(knowledgeId)
        if (knowledgeReaderRequestRef.current !== requestId) return
        const detail = knowledgeEntryFromResponse(response, 'Knowledge details are unavailable.')

        setSelectedKnowledgeDetail(detail)
        setKnowledgeReaderTab(KNOWLEDGE_READER_TAB_ORIGINAL)
        if (detail.original_available) {
          await loadPdfSource(knowledgeId, requestId)
        }
      } catch (error) {
        if (knowledgeReaderRequestRef.current !== requestId) return
        setKnowledgeReaderError(safeAiHelperError(error, 'Could not load this knowledge source.'))
      } finally {
        if (knowledgeReaderRequestRef.current !== requestId) return
        setKnowledgeReaderLoading(false)
      }
    },
    [loadPdfSource, setKnowledgeReaderPdfObjectUrl],
  )

  const handleKnowledgeFileChange = useCallback(
    (event) => {
      const file = event.target.files?.[0] || null
      setKnowledgeFile(file)
      setKnowledgeError(null)
      if (file && !knowledgeTitle.trim()) {
        setKnowledgeTitle(file.name.replace(/\.pdf$/i, ''))
      }
    },
    [knowledgeTitle],
  )

  const validateKnowledgeFile = useCallback((file, filenameRegex, label) => {
    if (!file) return null
    if (!filenameRegex.test(file.name || '')) {
      return `Upload a ${label} file.`
    }
    return null
  }, [])

  const uploadKnowledge = useCallback(
    async (setNotice) => {
      if (!knowledgeFile || knowledgeUploading || !knowledgeAcknowledged) return
      const fileSizeError =
        validateKnowledgeFile(knowledgeFile, /\.pdf$/i, 'PDF file') ||
        (knowledgeFile.size > 10 * 1024 * 1024 ? 'PDF must be 10 MB or smaller.' : null)
      if (fileSizeError) {
        setKnowledgeError(fileSizeError)
        return
      }

      const formData = new FormData()
      formData.append('file', knowledgeFile)
      formData.append('title', knowledgeTitle.trim())
      formData.append('visibility', knowledgeVisibility)
      formData.append('acknowledged', knowledgeAcknowledged ? 'true' : 'false')

      setKnowledgeUploading(true)
      setKnowledgeError(null)
      try {
        const response = await uploadAiHelperDocument(formData)
        const entry = knowledgeEntryFromResponse(response, 'Uploaded document is unavailable.')
        setKnowledgeEntries((prev) => prependKnowledgeEntry(prev, entry))
        setKnowledgeLoaded(true)
        setKnowledgeLastLoadedAt(Date.now())
        setKnowledgeFile(null)
        setKnowledgeFileInputKey((prev) => prev + 1)
        setKnowledgeTitle('')
        setKnowledgeVisibility('personal')
        setKnowledgeAcknowledged(false)
        setNotice(response?.message || 'Reference document uploaded.')
      } catch (error) {
        const entry = error?.payload?.data
        if (isKnowledgeEntry(entry)) {
          setKnowledgeEntries((prev) => prependKnowledgeEntry(prev, entry))
          setKnowledgeLoaded(true)
          setKnowledgeLastLoadedAt(Date.now())
        }
        setKnowledgeError(safeAiHelperError(error, 'Could not upload the reference document.'))
      } finally {
        setKnowledgeUploading(false)
      }
    },
    [
      knowledgeAcknowledged,
      knowledgeFile,
      validateKnowledgeFile,
      knowledgeTitle,
      knowledgeUploading,
      knowledgeVisibility,
    ],
  )

  const confirmDeleteKnowledge = useCallback(async () => {
    if (!knowledgeDeleteTarget?.id || knowledgeUpdatingId) return
    setKnowledgeUpdatingId(knowledgeDeleteTarget.id)
    setKnowledgeError(null)
    try {
      await deleteAiHelperDocument(knowledgeDeleteTarget.id)
      setKnowledgeEntries((prev) => prev.filter((item) => item.id !== knowledgeDeleteTarget.id))
      setKnowledgeLoaded(true)
      setKnowledgeLastLoadedAt(Date.now())
      setKnowledgeDeleteTarget(null)
    } catch (error) {
      setKnowledgeError(safeAiHelperError(error, 'Could not delete this reference document.'))
    } finally {
      setKnowledgeUpdatingId(null)
    }
  }, [knowledgeDeleteTarget, knowledgeUpdatingId])

  return {
    knowledgeAcknowledged,
    knowledgeDeleteTarget,
    knowledgeEntries,
    knowledgeError,
    knowledgeFile,
    knowledgeFileInputKey,
    knowledgeInitialLoading: knowledgeLoading && !knowledgeLastLoadedAt,
    knowledgeLoading,
    knowledgeTitle,
    knowledgeUpdatingId,
    knowledgeUploading,
    knowledgeView,
    knowledgeVisibility,
    closeKnowledgeReader,
    confirmDeleteKnowledge,
    handleKnowledgeFileChange,
    knowledgeReaderError,
    knowledgeReaderLoading,
    knowledgeReaderPdfError,
    knowledgeReaderPdfLoading,
    knowledgeReaderPdfUrl,
    knowledgeReaderOpen,
    knowledgeReaderTab,
    knowledgeReaderHasOriginal: Boolean(selectedKnowledgeDetail?.original_available),
    loadKnowledge,
    openKnowledgeReader,
    selectedKnowledgeDetail,
    selectedKnowledgeId,
    setKnowledgeAcknowledged,
    setKnowledgeDeleteTarget,
    setKnowledgeError,
    setKnowledgeTitle,
    setKnowledgeView,
    setKnowledgeVisibility,
    setKnowledgeReaderTab,
    uploadKnowledge,
  }
}

export default useAiHelperKnowledge
