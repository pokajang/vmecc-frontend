import { useCallback, useEffect, useRef, useState } from 'react'

import {
  deleteAiHelperKnowledge,
  fetchAiHelperKnowledge,
  fetchAiHelperKnowledgeDetail,
  fetchAiHelperKnowledgeFileBlob,
  fetchAiHelperKnowledgeFileText,
  uploadAiHelperKnowledge,
  uploadAiHelperMarkdownKnowledge,
} from 'src/services/apiClient'
import {
  isAiHelperListFresh,
  KNOWLEDGE_READER_TAB_EXTRACTED,
  KNOWLEDGE_READER_TAB_ORIGINAL,
  KNOWLEDGE_SCOPE_GLOBAL,
  KNOWLEDGE_SCOPE_MODULE,
  KNOWLEDGE_VIEW_MARKDOWN,
  KNOWLEDGE_VIEW_UPLOAD,
  safeAiHelperError,
} from './constants'

const useAiHelperKnowledge = ({
  authUser,
  currentPageContext,
  isSysAdmin,
  refreshCurrentContext,
  routeContext,
  visibleKnowledgeModules,
}) => {
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
  const [knowledgeScope, setKnowledgeScope] = useState(KNOWLEDGE_SCOPE_GLOBAL)
  const [knowledgeModuleKey, setKnowledgeModuleKey] = useState('')
  const [knowledgeVisibility, setKnowledgeVisibility] = useState('personal')
  const [knowledgeAcknowledged, setKnowledgeAcknowledged] = useState(false)
  const [knowledgeUploading, setKnowledgeUploading] = useState(false)
  const [markdownFile, setMarkdownFile] = useState(null)
  const [markdownFileInputKey, setMarkdownFileInputKey] = useState(0)
  const [markdownTitle, setMarkdownTitle] = useState('')
  const [markdownScope, setMarkdownScope] = useState(KNOWLEDGE_SCOPE_GLOBAL)
  const [markdownModuleKey, setMarkdownModuleKey] = useState('')
  const [markdownAcknowledged, setMarkdownAcknowledged] = useState(false)
  const [markdownUploading, setMarkdownUploading] = useState(false)
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
  const [knowledgeReaderMarkdownSource, setKnowledgeReaderMarkdownSource] = useState('')
  const [knowledgeReaderMarkdownLoading, setKnowledgeReaderMarkdownLoading] = useState(false)
  const [knowledgeReaderMarkdownError, setKnowledgeReaderMarkdownError] = useState(null)
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
    setKnowledgeReaderMarkdownSource('')
    setKnowledgeReaderMarkdownLoading(false)
    setKnowledgeReaderMarkdownError(null)
    setMarkdownFile(null)
    setMarkdownFileInputKey((prev) => prev + 1)
    setMarkdownTitle('')
    setMarkdownScope(KNOWLEDGE_SCOPE_GLOBAL)
    setMarkdownModuleKey('')
    setMarkdownAcknowledged(false)
    setMarkdownUploading(false)
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

      const request = fetchAiHelperKnowledge()
        .then((response) => {
          if (requestId !== knowledgeListRequestIdRef.current) return
          if (authUserIdRef.current !== requestUserId) return
          setKnowledgeEntries(response?.data || [])
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

  useEffect(() => {
    if (knowledgeScope !== KNOWLEDGE_SCOPE_MODULE) return
    if (visibleKnowledgeModules.some((option) => option.key === knowledgeModuleKey)) return
    setKnowledgeModuleKey(visibleKnowledgeModules[0]?.key || '')
  }, [knowledgeModuleKey, knowledgeScope, visibleKnowledgeModules])

  useEffect(() => {
    if (markdownScope !== KNOWLEDGE_SCOPE_MODULE) return
    if (visibleKnowledgeModules.some((option) => option.key === markdownModuleKey)) return
    setMarkdownModuleKey(visibleKnowledgeModules[0]?.key || '')
  }, [markdownModuleKey, markdownScope, visibleKnowledgeModules])

  useEffect(() => {
    if (isSysAdmin || knowledgeView !== KNOWLEDGE_VIEW_MARKDOWN) return
    setKnowledgeView(KNOWLEDGE_VIEW_UPLOAD)
  }, [isSysAdmin, knowledgeView])

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
    setKnowledgeReaderMarkdownSource('')
    setKnowledgeReaderMarkdownLoading(false)
    setKnowledgeReaderMarkdownError(null)
  }, [setKnowledgeReaderPdfObjectUrl])

  const loadPdfSource = useCallback(
    async (knowledgeId, requestId) => {
      setKnowledgeReaderPdfLoading(true)
      setKnowledgeReaderPdfError(null)
      setKnowledgeReaderPdfObjectUrl('')

      try {
        const blob = await fetchAiHelperKnowledgeFileBlob(knowledgeId)
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

  const loadMarkdownSource = useCallback(async (knowledgeId, requestId) => {
    setKnowledgeReaderMarkdownLoading(true)
    setKnowledgeReaderMarkdownError(null)
    setKnowledgeReaderMarkdownSource('')
    try {
      const text = await fetchAiHelperKnowledgeFileText(knowledgeId)
      if (knowledgeReaderRequestRef.current !== requestId) return
      setKnowledgeReaderMarkdownSource(text)
    } catch (error) {
      if (knowledgeReaderRequestRef.current !== requestId) return
      setKnowledgeReaderMarkdownError(
        safeAiHelperError(error, 'Could not load the original Markdown file.'),
      )
    } finally {
      if (knowledgeReaderRequestRef.current !== requestId) return
      setKnowledgeReaderMarkdownLoading(false)
    }
  }, [])

  const openKnowledgeReader = useCallback(
    async (knowledgeId) => {
      if (!knowledgeId) return

      const requestId = knowledgeReaderRequestRef.current + 1
      knowledgeReaderRequestRef.current = requestId
      setKnowledgeDeleteTarget(null)
      setKnowledgeReaderOpen(true)
      setKnowledgeReaderLoading(true)
      setKnowledgeReaderError(null)
      setKnowledgeReaderTab(KNOWLEDGE_READER_TAB_EXTRACTED)
      setSelectedKnowledgeId(knowledgeId)
      setSelectedKnowledgeDetail(null)
      setKnowledgeReaderPdfObjectUrl('')
      setKnowledgeReaderPdfLoading(false)
      setKnowledgeReaderPdfError(null)
      setKnowledgeReaderMarkdownSource('')
      setKnowledgeReaderMarkdownLoading(false)
      setKnowledgeReaderMarkdownError(null)

      try {
        const response = await fetchAiHelperKnowledgeDetail(knowledgeId)
        if (knowledgeReaderRequestRef.current !== requestId) return
        const detail = response?.data || null
        if (!detail) throw new Error('Knowledge details are unavailable.')

        setSelectedKnowledgeDetail(detail)
        if (detail.original_available) {
          setKnowledgeReaderTab(KNOWLEDGE_READER_TAB_ORIGINAL)
        } else {
          setKnowledgeReaderTab(KNOWLEDGE_READER_TAB_EXTRACTED)
        }

        if (detail.source_mime === 'text/markdown' && detail.original_available) {
          await loadMarkdownSource(knowledgeId, requestId)
        } else if (detail.source_mime === 'application/pdf' && detail.original_available) {
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
    [loadMarkdownSource, loadPdfSource, setKnowledgeReaderPdfObjectUrl],
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

  const handleMarkdownFileChange = useCallback(
    (event) => {
      const file = event.target.files?.[0] || null
      setMarkdownFile(file)
      setKnowledgeError(null)
      if (file && !markdownTitle.trim()) {
        setMarkdownTitle(file.name.replace(/\.(md|markdown)$/i, ''))
      }
    },
    [markdownTitle],
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
      if (knowledgeScope === KNOWLEDGE_SCOPE_MODULE && !knowledgeModuleKey) {
        setKnowledgeError('Choose a module for this knowledge source.')
        return
      }

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
      formData.append('scope_type', knowledgeScope)
      if (knowledgeScope === KNOWLEDGE_SCOPE_MODULE)
        formData.append('module_key', knowledgeModuleKey)
      formData.append('visibility', knowledgeVisibility)
      formData.append('path', currentPageContext?.path || routeContext?.path || '/')
      formData.append('page_context', JSON.stringify(currentPageContext || routeContext))
      formData.append('acknowledged', knowledgeAcknowledged ? 'true' : 'false')

      setKnowledgeUploading(true)
      setKnowledgeError(null)
      try {
        const response = await uploadAiHelperKnowledge(formData)
        const entry = response?.data
        if (entry)
          setKnowledgeEntries((prev) => [entry, ...prev.filter((item) => item.id !== entry.id)])
        setKnowledgeLoaded(true)
        setKnowledgeLastLoadedAt(Date.now())
        setKnowledgeFile(null)
        setKnowledgeFileInputKey((prev) => prev + 1)
        setKnowledgeTitle('')
        setKnowledgeScope(KNOWLEDGE_SCOPE_GLOBAL)
        setKnowledgeModuleKey('')
        setKnowledgeVisibility('personal')
        setKnowledgeAcknowledged(false)
        setNotice(response?.message || 'Knowledge uploaded.')
        refreshCurrentContext()
      } catch (error) {
        const entry = error?.payload?.data
        if (entry) {
          setKnowledgeEntries((prev) => [entry, ...prev.filter((item) => item.id !== entry.id)])
          setKnowledgeLoaded(true)
          setKnowledgeLastLoadedAt(Date.now())
        }
        setKnowledgeError(safeAiHelperError(error, 'Could not upload knowledge.'))
      } finally {
        setKnowledgeUploading(false)
      }
    },
    [
      currentPageContext,
      knowledgeAcknowledged,
      knowledgeFile,
      knowledgeModuleKey,
      knowledgeScope,
      validateKnowledgeFile,
      knowledgeTitle,
      knowledgeUploading,
      knowledgeVisibility,
      refreshCurrentContext,
      routeContext,
    ],
  )

  const uploadMarkdownKnowledge = useCallback(
    async (setNotice) => {
      if (!isSysAdmin || !markdownFile || markdownUploading || !markdownAcknowledged) return
      if (markdownScope === KNOWLEDGE_SCOPE_MODULE && !markdownModuleKey) {
        setKnowledgeError('Choose a module for this Markdown knowledge source.')
        return
      }

      const formatError = validateKnowledgeFile(markdownFile, /\.(md|markdown)$/i, 'Markdown .md')
      if (formatError) {
        setKnowledgeError(formatError)
        return
      }

      if (markdownFile.size > 1024 * 1024) {
        setKnowledgeError('Markdown file must be 1 MB or smaller.')
        return
      }

      const formData = new FormData()
      formData.append('file', markdownFile)
      formData.append('title', markdownTitle.trim())
      formData.append('scope_type', markdownScope)
      if (markdownScope === KNOWLEDGE_SCOPE_MODULE) formData.append('module_key', markdownModuleKey)
      formData.append('acknowledged', markdownAcknowledged ? 'true' : 'false')

      setMarkdownUploading(true)
      setKnowledgeError(null)
      try {
        const response = await uploadAiHelperMarkdownKnowledge(formData)
        const entry = response?.data
        if (entry)
          setKnowledgeEntries((prev) => [entry, ...prev.filter((item) => item.id !== entry.id)])
        setKnowledgeLoaded(true)
        setKnowledgeLastLoadedAt(Date.now())
        setMarkdownFile(null)
        setMarkdownFileInputKey((prev) => prev + 1)
        setMarkdownTitle('')
        setMarkdownScope(KNOWLEDGE_SCOPE_GLOBAL)
        setMarkdownModuleKey('')
        setMarkdownAcknowledged(false)
        setNotice(response?.message || 'Markdown knowledge uploaded.')
        refreshCurrentContext()
      } catch (error) {
        setKnowledgeError(safeAiHelperError(error, 'Could not upload Markdown knowledge.'))
      } finally {
        setMarkdownUploading(false)
      }
    },
    [
      validateKnowledgeFile,
      isSysAdmin,
      markdownAcknowledged,
      markdownFile,
      markdownModuleKey,
      markdownScope,
      markdownTitle,
      markdownUploading,
      refreshCurrentContext,
    ],
  )

  const confirmDeleteKnowledge = useCallback(async () => {
    if (!knowledgeDeleteTarget?.id || knowledgeUpdatingId) return
    setKnowledgeUpdatingId(knowledgeDeleteTarget.id)
    setKnowledgeError(null)
    try {
      await deleteAiHelperKnowledge(knowledgeDeleteTarget.id)
      setKnowledgeEntries((prev) => prev.filter((item) => item.id !== knowledgeDeleteTarget.id))
      setKnowledgeLoaded(true)
      setKnowledgeLastLoadedAt(Date.now())
      setKnowledgeDeleteTarget(null)
      refreshCurrentContext()
    } catch (error) {
      setKnowledgeError(safeAiHelperError(error, 'Could not delete this knowledge source.'))
    } finally {
      setKnowledgeUpdatingId(null)
    }
  }, [knowledgeDeleteTarget, knowledgeUpdatingId, refreshCurrentContext])

  return {
    knowledgeAcknowledged,
    knowledgeDeleteTarget,
    knowledgeEntries,
    knowledgeError,
    knowledgeFile,
    knowledgeFileInputKey,
    knowledgeInitialLoading: knowledgeLoading && !knowledgeLastLoadedAt,
    knowledgeLoading,
    knowledgeModuleKey,
    knowledgeScope,
    knowledgeTitle,
    knowledgeUpdatingId,
    knowledgeUploading,
    knowledgeView,
    knowledgeVisibility,
    markdownAcknowledged,
    markdownFile,
    markdownFileInputKey,
    markdownModuleKey,
    markdownScope,
    markdownTitle,
    markdownUploading,
    closeKnowledgeReader,
    confirmDeleteKnowledge,
    handleKnowledgeFileChange,
    handleMarkdownFileChange,
    knowledgeReaderError,
    knowledgeReaderLoading,
    knowledgeReaderPdfError,
    knowledgeReaderPdfLoading,
    knowledgeReaderPdfUrl,
    knowledgeReaderMarkdownError,
    knowledgeReaderMarkdownLoading,
    knowledgeReaderMarkdownSource,
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
    setKnowledgeModuleKey,
    setKnowledgeScope,
    setKnowledgeTitle,
    setKnowledgeView,
    setKnowledgeVisibility,
    setMarkdownAcknowledged,
    setMarkdownModuleKey,
    setMarkdownScope,
    setMarkdownTitle,
    setKnowledgeReaderTab,
    uploadKnowledge,
    uploadMarkdownKnowledge,
  }
}

export default useAiHelperKnowledge
