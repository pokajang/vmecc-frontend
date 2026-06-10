import React, { memo, useMemo, useState } from 'react'
import {
  CBadge,
  CButton,
  CFormCheck,
  CFormInput,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import { Trash2 } from 'lucide-react'
import TableLoader from 'src/components/TableLoader'
import { formatChatTime, getDraftPreview, getInitials, getPreview } from './messageUtils'
import { getPrimaryRoleLabel } from 'src/utils/authz'
import { ROLE_ABBREVIATIONS } from 'src/constants/roles'

const ChatList = ({
  threads,
  drafts,
  authUserId,
  activeUserId,
  query,
  onQueryChange,
  onSelectThread,
  onDeleteThread,
  onDeleteThreadForEveryone,
  showListPanel,
  isMobile,
  loading,
  isCapped,
}) => {
  const [modalThread, setModalThread] = useState(null) // { userId, isStarter }
  const [deleteScope, setDeleteScope] = useState('me')

  const filteredThreads = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return threads
    return threads.filter((t) => {
      const name = t.user?.name || ''
      const email = t.user?.email || ''
      const draft = getDraftPreview(drafts[t.user?.id] || '')
      const preview = draft || getPreview(t.last_message)
      return `${name} ${email} ${preview}`.toLowerCase().includes(term)
    })
  }, [threads, query, drafts])

  const handleDeleteClick = (e, thread) => {
    e.stopPropagation()
    setDeleteScope('me')
    setModalThread({ userId: thread.user?.id, isStarter: thread.is_starter ?? false })
  }

  return (
    <div
      className={`border-end d-flex flex-column ${showListPanel ? '' : 'd-none'}`}
      style={{
        width: '100%',
        maxWidth: isMobile ? '100%' : 380,
        background: '#ffffff',
        minHeight: 0,
      }}
    >
      <div className="p-3 border-bottom" style={{ background: '#ffffff' }}>
        <CFormInput
          size="sm"
          placeholder="Search chats"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>
      <div className="overflow-auto flex-grow-1" style={{ minHeight: 0 }}>
        {loading ? (
          <TableLoader />
        ) : filteredThreads.length === 0 ? (
          <div className="text-center text-muted py-4">No chats yet.</div>
        ) : (
          filteredThreads.map((thread, idx) => {
            const isActive = thread.user?.id === activeUserId
            const draft = getDraftPreview(drafts[thread.user?.id] || '')
            const hasDraft = Boolean(draft)
            const lastMessage = thread.last_message
            const lastFromMe = lastMessage?.sender?.id === authUserId
            const otherLabel = thread.user?.name || thread.user?.email || 'They'
            const preview = hasDraft ? draft : getPreview(lastMessage)
            const prefix = hasDraft ? 'Draft' : lastFromMe ? 'You' : otherLabel
            const timeLabel = formatChatTime(thread.last_message?.created_at)
            const initials = getInitials(thread.user?.name || thread.user?.email || '')
            const unread = thread.unread_count || 0
            const roleLabel =
              ROLE_ABBREVIATIONS[getPrimaryRoleLabel(thread.user)] ??
              getPrimaryRoleLabel(thread.user)
            return (
              <div
                key={thread.user?.id || idx}
                role="button"
                onClick={() => onSelectThread(thread)}
                className={`px-3 py-3 d-flex gap-3 align-items-center cursor-pointer chat-thread-row ${
                  isActive ? 'bg-body-secondary' : 'bg-white'
                } ${idx === filteredThreads.length - 1 ? '' : 'border-bottom'}`}
              >
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center text-white flex-shrink-0"
                  style={{
                    width: 44,
                    height: 44,
                    background: 'var(--cui-primary)',
                    fontWeight: 600,
                  }}
                >
                  {initials}
                </div>
                <div className="flex-grow-1 overflow-hidden">
                  <div className="d-flex justify-content-between align-items-center gap-2">
                    <div className="d-flex align-items-baseline gap-2 overflow-hidden">
                      <span className={`text-truncate${unread ? ' fw-semibold' : ''}`}>
                        {thread.user?.name || thread.user?.email || 'Unknown'}
                      </span>
                      {roleLabel && (
                        <span
                          className="text-muted small fw-normal flex-shrink-0"
                          style={{ fontSize: '0.7rem' }}
                        >
                          {roleLabel}
                        </span>
                      )}
                    </div>
                    <span className="text-muted small flex-shrink-0">{timeLabel}</span>
                  </div>
                  <div className={`text-muted small mt-1 ${unread ? 'fw-semibold text-body' : ''}`}>
                    <span
                      className={
                        hasDraft ? 'text-danger fw-semibold' : lastFromMe ? 'fw-semibold' : ''
                      }
                    >
                      {prefix}:
                    </span>{' '}
                    {preview}
                  </div>
                </div>
                <div className="ms-2 d-flex align-items-center gap-1 flex-shrink-0">
                  {unread > 0 && !isActive && (
                    <CBadge color="light" className="sidebar-message-badge">
                      {unread}
                    </CBadge>
                  )}
                  <button
                    type="button"
                    className="btn btn-link p-0 text-muted chat-thread-delete-btn"
                    title="Delete thread"
                    onClick={(e) => handleDeleteClick(e, thread)}
                    style={{ opacity: 0, transition: 'opacity 0.15s', lineHeight: 1 }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {isCapped && (
        <div className="text-center text-muted py-2 border-top" style={{ fontSize: '0.72rem' }}>
          Showing the 300 most recent conversations.
        </div>
      )}

      <CModal visible={!!modalThread} onClose={() => setModalThread(null)} alignment="center">
        <CModalHeader>
          <CModalTitle>Delete conversation</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="mb-3">Who should this conversation be deleted for?</p>
          <div className="d-flex flex-column gap-2">
            <CFormCheck
              type="radio"
              id="delete-scope-me"
              name="deleteScope"
              label="Delete for me — only removed from your view"
              checked={deleteScope === 'me'}
              onChange={() => setDeleteScope('me')}
            />
            {modalThread?.isStarter && (
              <CFormCheck
                type="radio"
                id="delete-scope-everyone"
                name="deleteScope"
                label="Delete for everyone — permanently removes all messages for both parties"
                checked={deleteScope === 'everyone'}
                onChange={() => setDeleteScope('everyone')}
              />
            )}
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={() => setModalThread(null)}>
            Cancel
          </CButton>
          <CButton
            color="danger"
            onClick={() => {
              if (deleteScope === 'everyone') {
                onDeleteThreadForEveryone(modalThread.userId)
              } else {
                onDeleteThread(modalThread.userId)
              }
              setModalThread(null)
            }}
          >
            Delete
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default memo(ChatList)
