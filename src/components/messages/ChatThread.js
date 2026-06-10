import React, { memo, useEffect, useMemo, useRef, useState } from 'react'
import { CFormTextarea } from '@coreui/react'
import ButtonLoader from 'src/components/ButtonLoader'
import { formatChatTime, getInitials, EMPTY_VALUE } from './messageUtils'
import { ArrowDown, Image, Loader, Send, Trash2, X } from 'lucide-react'
import { getPrimaryRoleLabel } from 'src/utils/authz'
import { ROLE_ABBREVIATIONS } from 'src/constants/roles'
import { getMessageAttachmentUrl } from 'src/services/apiClient'
import useAuthenticatedImageUrl from 'src/hooks/useAuthenticatedImageUrl'
import UserConfirmModal from 'src/components/users/UserConfirmModal'
import TableLoader from 'src/components/TableLoader'

// Fetches the attachment through the authenticated session so the raw URL
// is never usable without an active cookie. Falls back to a neutral placeholder on error.
const AttachmentImage = ({ attachmentId, originalName, localPreview, style, onClick }) => {
  const src = getMessageAttachmentUrl(attachmentId)
  const { blobUrl, error } = useAuthenticatedImageUrl(src, localPreview || null)
  if (error) return (
    <div
      className="d-flex align-items-center justify-content-center text-muted small"
      style={{ ...style, minHeight: 60, background: '#f0f0f0' }}
    >
      Image unavailable
    </div>
  )
  if (!blobUrl) return (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{ ...style, minHeight: 120, background: '#f0f0f0' }}
    >
      <Loader size={20} className="icon-spin text-muted" />
    </div>
  )
  return (
    <img
      src={blobUrl}
      alt={originalName || 'image'}
      className="d-block"
      style={style}
      onClick={() => onClick(blobUrl)}
    />
  )
}

const MAX_FILE_SIZE = Number(import.meta.env.VITE_MAX_ATTACHMENT_BYTES) || 2 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

const ChatThread = ({
  activeThread,
  activeUserName,
  authUserId,
  messages,
  threadLoading,
  firstUnreadId,
  compose,
  onComposeChange,
  onComposerKeyDown,
  onSend,
  onDeleteMessage,
  sending,
  sendError,
  composerRef,
  isMobile,
  showThreadPanel,
  // image attachment props
  imageFile,
  imagePreview,
  onImageSelect,
  onImageClear,
  imageError,
}) => {
  const scrollRef = useRef(null)
  const isAtBottomRef = useRef(true)
  const fileInputRef = useRef(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null) // { messageId, hasImage, hasBody }

  const lastSentMessageId = useMemo(() => {
    if (!authUserId || !messages.length) return null
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i]
      if (message.sender?.id === authUserId) {
        return message.id
      }
    }
    return null
  }, [messages, authUserId])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const updateScrollState = () => {
      const distance = container.scrollHeight - container.scrollTop - container.clientHeight
      const atBottom = distance < 80
      isAtBottomRef.current = atBottom
      setShowScrollButton(!atBottom)
    }

    updateScrollState()
    container.addEventListener('scroll', updateScrollState)
    return () => container.removeEventListener('scroll', updateScrollState)
  }, [])

  const scrollToBottom = () => {
    const container = scrollRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }

  useEffect(() => {
    if (!messages.length) return
    const lastMessage = messages[messages.length - 1]
    const fromSelf = lastMessage?.sender?.id === authUserId
    if (isAtBottomRef.current || fromSelf) {
      requestAnimationFrame(scrollToBottom)
    }
  }, [messages, authUserId])

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    onImageSelect(file)
  }

  const canSend = (compose.trim() || imageFile) && activeThread?.user?.id && !sending

  return (
    <div
      className={`flex-grow-1 d-flex flex-column bg-body ${showThreadPanel ? '' : 'd-none'}`}
      style={{ minHeight: 0 }}
    >
      {activeThread?.user?.id ? (
        <>
          {/* Thread header */}
          <div
            className="border-bottom px-3 px-lg-4 py-3 d-flex align-items-center justify-content-between"
            style={{ background: '#ffffff' }}
          >
            <div className="d-flex align-items-center gap-2 gap-lg-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center text-white"
                style={{ width: 40, height: 40, background: 'var(--cui-primary)', fontWeight: 600 }}
              >
                {getInitials(activeUserName)}
              </div>
              <div>
                <div className="d-flex align-items-baseline gap-2">
                  <span className="fw-semibold">{activeUserName}</span>
                  {getPrimaryRoleLabel(activeThread?.user) && (
                    <span className="text-muted fw-normal" style={{ fontSize: '0.7rem' }}>
                      {ROLE_ABBREVIATIONS[getPrimaryRoleLabel(activeThread?.user)] ?? getPrimaryRoleLabel(activeThread?.user)}
                    </span>
                  )}
                </div>
                <div className="text-muted small">{activeThread?.user?.email || EMPTY_VALUE}</div>
              </div>
            </div>
          </div>

          {/* Message list */}
          <div className="flex-grow-1 position-relative" style={{ minHeight: 0 }}>
            <div
              ref={scrollRef}
              className="h-100 overflow-auto px-4 py-3"
              style={{ background: '#f7f9fc' }}
            >
              {threadLoading ? (
                <TableLoader />
              ) : messages.length === 0 ? (
                <div className="text-center text-muted py-4">No messages yet.</div>
              ) : (
                messages.map((message) => {
                  const isMine = message.sender?.id === authUserId
                  const showSeen = isMine && message.id === lastSentMessageId && !!message.read_at
                  const showUnreadDivider = firstUnreadId && message.id === firstUnreadId
                  const hasImage = !!message.attachment?.id
                  const hasBody = !!message.body

                  return (
                    <React.Fragment key={message.id}>
                      {showUnreadDivider && (
                        <div className="text-center my-3">
                          <span className="badge bg-light text-body-secondary border">
                            Unread messages
                          </span>
                        </div>
                      )}
                      <div
                        className={`d-flex mb-2 align-items-end gap-1 ${isMine ? 'justify-content-end' : 'justify-content-start'}`}
                      >
                        {isMine && (
                          <button
                            type="button"
                            className="btn btn-link p-0 text-muted chat-message-delete-btn"
                            title="Delete message"
                            onClick={() => setConfirmDelete({ messageId: message.id, hasImage, hasBody })}
                            style={{ opacity: 0, transition: 'opacity 0.15s', lineHeight: 1 }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        <div
                          className="rounded-3 chat-message-bubble overflow-hidden"
                          style={{
                            maxWidth: '70%',
                            background: isMine ? 'rgba(13, 110, 253, 0.12)' : '#ffffff',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                          }}
                        >
                          {/* Image attachment */}
                          {hasImage && (
                            <AttachmentImage
                              attachmentId={message.attachment.id}
                              originalName={message.attachment.original_name}
                              localPreview={message._localPreview}
                              style={{
                                maxWidth: 260,
                                width: '100%',
                                cursor: 'pointer',
                                borderRadius: hasBody ? '0.5rem 0.5rem 0 0' : undefined,
                              }}
                              onClick={setLightboxUrl}
                            />
                          )}
                          {/* Body + timestamp row */}
                          <div className={`d-flex align-items-end gap-2 p-2 px-3${hasImage && !hasBody ? ' pt-1' : ''}`} style={{ flexWrap: 'wrap' }}>
                            {hasBody && (
                              <div className="small text-body" style={{ whiteSpace: 'pre-wrap' }}>
                                {message.body}
                              </div>
                            )}
                            <div className="text-muted ms-auto" style={{ fontSize: '0.65rem', lineHeight: 1.4, whiteSpace: 'nowrap' }}>
                              {formatChatTime(message.created_at)}
                              {showSeen && <span className="ms-1">· Seen</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  )
                })
              )}
            </div>
            {showScrollButton && (
              <button
                type="button"
                className="btn btn-light btn-sm position-absolute"
                style={{ right: 16, bottom: 16 }}
                onClick={scrollToBottom}
              >
                <ArrowDown size={16} />
              </button>
            )}
          </div>

          {/* Composer */}
          <div
            className="border-top p-3 bg-white mt-auto"
            style={isMobile ? { position: 'sticky', bottom: 0, zIndex: 1 } : undefined}
          >
            {/* Image preview */}
            {imagePreview && (
              <div className="mb-2 position-relative d-inline-block">
                <img
                  src={imagePreview}
                  alt="preview"
                  style={{ maxHeight: 120, maxWidth: 200, borderRadius: 8, objectFit: 'cover' }}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-dark position-absolute d-flex align-items-center justify-content-center p-0"
                  style={{ top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', opacity: 0.8 }}
                  onClick={onImageClear}
                >
                  <X size={12} />
                </button>
              </div>
            )}
            {imageError && (
              <div className="text-danger small mb-2">{imageError}</div>
            )}
            {sendError && (
              <div className="text-danger small mb-2">{sendError}</div>
            )}
            <div className="d-flex gap-2 align-items-end">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_TYPES.join(',')}
                className="d-none"
                onChange={handleFileChange}
              />
              {/* Image attach button */}
              <button
                type="button"
                className="btn btn-light d-flex align-items-center justify-content-center flex-shrink-0"
                title="Attach image"
                disabled={!activeThread?.user?.id || sending || !!imageFile}
                onClick={() => fileInputRef.current?.click()}
                style={{ height: 40, width: 40, paddingInline: 0 }}
              >
                <Image size={18} />
              </button>
              <CFormTextarea
                placeholder={imageFile ? 'Describe the image (optional)' : 'Type a message'}
                value={compose}
                onChange={(e) => onComposeChange(e.target.value)}
                onKeyDown={onComposerKeyDown}
                disabled={!activeThread?.user?.id || sending}
                ref={composerRef}
                rows={1}
                style={{ resize: 'none', minHeight: 40 }}
                className="flex-grow-1"
              />
              <button
                type="button"
                className="btn btn-primary d-flex align-items-center justify-content-center"
                disabled={!canSend}
                onClick={onSend}
                style={{ height: 40, minWidth: 40, paddingInline: 0 }}
              >
                {sending ? <ButtonLoader size={18} label="" /> : <Send size={18} />}
              </button>
            </div>
            {!isMobile && (
              <div className="text-muted small mt-2">Enter to send, Shift+Enter for new line</div>
            )}
          </div>
        </>
      ) : (
        <div className="flex-grow-1 d-flex align-items-center justify-content-center text-muted">
          Select a chat to start messaging.
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <UserConfirmModal
          visible
          title="Delete message"
          confirmLabel="Delete"
          confirmColor="danger"
          onClose={() => setConfirmDelete(null)}
          message={
            confirmDelete.hasImage && confirmDelete.hasBody
              ? 'This will permanently delete the message and its image for both you and the recipient.'
              : confirmDelete.hasImage
              ? 'This will permanently delete the image for both you and the recipient.'
              : 'This will permanently delete this message for both you and the recipient.'
          }
          onConfirm={() => {
            onDeleteMessage(confirmDelete.messageId)
            setConfirmDelete(null)
          }}
        />
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="position-fixed d-flex align-items-center justify-content-center"
          style={{ inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.85)', cursor: 'zoom-out' }}
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt="full size"
            style={{ maxWidth: '94vw', maxHeight: '90vh', borderRadius: 8, objectFit: 'contain' }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            className="btn btn-dark position-absolute d-flex align-items-center justify-content-center p-0"
            style={{ top: 16, right: 16, width: 36, height: 36, borderRadius: '50%' }}
            onClick={() => setLightboxUrl(null)}
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  )
}

export default memo(ChatThread)
