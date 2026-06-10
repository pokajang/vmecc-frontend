import { useCallback, useMemo, useState } from 'react'
import {
  DEFAULT_TAB_BY_GROUP,
  DEFAULT_TAB_KEY,
  TAB_BASE_BY_KEY,
  TAB_KEYS,
  TAB_KEY_BY_PATH,
  TAB_PATH_BY_KEY,
} from '../constants'

const useSalaryClaimsPageState = ({ location, navigate, isClaimDetailRoute }) => {
  const [selectedClaimKeys, setSelectedClaimKeys] = useState(() => new Set())
  const [bulkActionModal, setBulkActionModal] = useState({ visible: false, action: 'approve' })
  const [bulkRemarks, setBulkRemarks] = useState('')
  const [bulkDeclarationChecked, setBulkDeclarationChecked] = useState(false)
  const [bulkDeclarationError, setBulkDeclarationError] = useState('')
  const [bulkRejectError, setBulkRejectError] = useState('')
  const [selectedClaimItemId, setSelectedClaimItemId] = useState('')
  const [isItemDetailsVisible, setIsItemDetailsVisible] = useState(false)
  const [attachmentPreviewOpen, setAttachmentPreviewOpen] = useState(false)
  const [activeAttachment, setActiveAttachment] = useState(null)

  const pathTab = useMemo(() => {
    const parts = String(location.pathname || '')
      .split('/')
      .filter(Boolean)
    const last = parts[parts.length - 1] || ''
    return TAB_KEY_BY_PATH[last] || ''
  }, [location.pathname])

  const stateTab = TAB_KEYS.includes(location.state?.tab) ? location.state.tab : ''
  const pathGroup = String(location.pathname || '').startsWith('/staff/set-salary')
    ? 'settings'
    : 'records'
  const routeDefaultTab = DEFAULT_TAB_BY_GROUP[pathGroup] || DEFAULT_TAB_KEY
  const tab = pathTab || routeDefaultTab
  const detailReturnTab = stateTab || tab || DEFAULT_TAB_KEY
  const activeTab = isClaimDetailRoute ? detailReturnTab : tab

  const switchTab = useCallback(
    (nextTab) => {
      if (!TAB_KEYS.includes(nextTab)) return
      if (nextTab === tab) return
      const base = TAB_BASE_BY_KEY[nextTab] || TAB_BASE_BY_KEY[DEFAULT_TAB_KEY]
      navigate(`${base}/${TAB_PATH_BY_KEY[nextTab] || TAB_PATH_BY_KEY[DEFAULT_TAB_KEY]}`, {
        replace: true,
      })
    },
    [navigate, tab],
  )

  const openBulkActionModal = useCallback((action) => {
    setBulkActionModal({ visible: true, action })
    setBulkRemarks('')
    setBulkDeclarationChecked(false)
    setBulkDeclarationError('')
    setBulkRejectError('')
  }, [])

  const closeBulkActionModal = useCallback(() => {
    setBulkActionModal({ visible: false, action: 'approve' })
    setBulkRemarks('')
    setBulkDeclarationChecked(false)
    setBulkDeclarationError('')
    setBulkRejectError('')
  }, [])

  const openAttachmentPreview = useCallback((name, item = null, source = 'item-list') => {
    const raw = item?.raw && typeof item.raw === 'object' ? item.raw : item
    const attachmentId =
      Number(raw?.attachmentId || raw?.attachment_id || raw?.attachment?.id || 0) || null
    if (!name && !attachmentId) return
    setActiveAttachment({
      name: String(name || raw?.attachmentName || raw?.attachment?.original_name || ''),
      itemId: item?.id || '',
      source,
      attachmentId,
      attachmentName: String(
        raw?.attachmentName || raw?.attachment?.original_name || name || '',
      ).trim(),
      attachmentDataUrl: String(raw?.attachmentDataUrl || '').trim(),
      attachmentMimeType: String(
        raw?.attachmentMimeType || raw?.attachment?.mime_type || '',
      ).trim(),
      attachmentSizeBytes: Number(raw?.attachmentSizeBytes || raw?.attachment?.size || 0) || 0,
    })
    setAttachmentPreviewOpen(true)
  }, [])

  const closeAttachmentPreview = useCallback(() => {
    setAttachmentPreviewOpen(false)
    setActiveAttachment(null)
  }, [])

  const closeItemDetails = useCallback(() => {
    setIsItemDetailsVisible(false)
    setSelectedClaimItemId('')
  }, [])

  const selectClaimItem = useCallback(
    (itemId) => {
      if (!itemId) return
      if (isItemDetailsVisible && selectedClaimItemId === itemId) {
        closeItemDetails()
        return
      }
      setSelectedClaimItemId(itemId)
      setIsItemDetailsVisible(true)
    },
    [closeItemDetails, isItemDetailsVisible, selectedClaimItemId],
  )

  return {
    tab,
    switchTab,
    detailReturnTab,
    activeTab,
    selectedClaimKeys,
    setSelectedClaimKeys,
    bulkActionModal,
    setBulkActionModal,
    bulkRemarks,
    setBulkRemarks,
    bulkDeclarationChecked,
    setBulkDeclarationChecked,
    bulkDeclarationError,
    setBulkDeclarationError,
    bulkRejectError,
    setBulkRejectError,
    openBulkActionModal,
    closeBulkActionModal,
    selectedClaimItemId,
    setSelectedClaimItemId,
    isItemDetailsVisible,
    setIsItemDetailsVisible,
    selectClaimItem,
    closeItemDetails,
    attachmentPreviewOpen,
    activeAttachment,
    openAttachmentPreview,
    closeAttachmentPreview,
  }
}

export default useSalaryClaimsPageState
