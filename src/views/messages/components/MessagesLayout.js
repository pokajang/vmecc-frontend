import React from 'react'
import { CAlert, CBadge, CCard, CCardBody, CCardHeader, CContainer } from '@coreui/react'
import { Plus } from 'lucide-react'
import BackButton from 'src/components/BackButton'
import CreateActionButton from 'src/components/CreateActionButton'
import ChatList from 'src/components/messages/ChatList'
import ChatThread from 'src/components/messages/ChatThread'
import NewChatModal from 'src/components/messages/NewChatModal'

const MessagesLayout = ({
  isMobile,
  mobileView,
  onBackToList,
  unreadTotal,
  onOpenNewChat,
  error,
  onClearError,
  threadsError,
  onRefresh,
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
  loading,
  activeThread,
  activeUserName,
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
  showThreadPanel,
  imageFile,
  imagePreview,
  onImageSelect,
  onImageClear,
  imageError,
  showNewChat,
  onCloseNewChat,
  contactQuery,
  onContactQueryChange,
  contactsLoading,
  contactsError,
  contacts,
  onSelectContact,
}) => (
  <CContainer fluid className="d-flex flex-column flex-grow-1 p-0" style={{ minHeight: 0 }}>
    {isMobile && mobileView === 'thread' && (
      <div className="d-flex justify-content-start mb-2">
        <BackButton onClick={onBackToList} />
      </div>
    )}
    <CCard className="flex-grow-1" style={{ minHeight: 0, height: '100%', overflow: 'hidden' }}>
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2">
          <span>Messages</span>
          {unreadTotal > 0 && (
            <CBadge color="light" className="sidebar-message-badge">
              {`${unreadTotal} Unread`}
            </CBadge>
          )}
        </div>
        <CreateActionButton
          label="Create chat"
          onClick={onOpenNewChat}
          icon={<Plus size={13} className="me-1 align-text-bottom" />}
        />
      </CCardHeader>
      <CCardBody className="p-0 d-flex flex-column" style={{ minHeight: 0 }}>
        {error && (
          <CAlert color="danger" dismissible onClose={onClearError}>
            {error}
          </CAlert>
        )}
        {!error && threadsError && (
          <CAlert color="danger" dismissible onClose={onRefresh}>
            {threadsError}
          </CAlert>
        )}

        {!error && !threadsError && (
          <div className="d-flex flex-column flex-lg-row flex-grow-1" style={{ minHeight: 0 }}>
            <ChatList
              threads={threads}
              drafts={drafts}
              authUserId={authUserId}
              activeUserId={activeUserId}
              query={query}
              onQueryChange={onQueryChange}
              onSelectThread={onSelectThread}
              onDeleteThread={onDeleteThread}
              onDeleteThreadForEveryone={onDeleteThreadForEveryone}
              showListPanel={showListPanel}
              isMobile={isMobile}
              loading={loading}
              isCapped={threads.length >= 300}
            />

            <ChatThread
              activeThread={activeThread}
              activeUserName={activeUserName}
              authUserId={authUserId}
              messages={messages}
              threadLoading={threadLoading}
              firstUnreadId={firstUnreadId}
              compose={compose}
              onComposeChange={onComposeChange}
              onComposerKeyDown={onComposerKeyDown}
              onSend={onSend}
              onDeleteMessage={onDeleteMessage}
              sending={sending}
              sendError={sendError}
              composerRef={composerRef}
              isMobile={isMobile}
              showThreadPanel={showThreadPanel}
              imageFile={imageFile}
              imagePreview={imagePreview}
              onImageSelect={onImageSelect}
              onImageClear={onImageClear}
              imageError={imageError}
            />
          </div>
        )}
      </CCardBody>
    </CCard>

    <NewChatModal
      visible={showNewChat}
      onClose={onCloseNewChat}
      query={contactQuery}
      onQueryChange={onContactQueryChange}
      loading={contactsLoading}
      error={contactsError}
      contacts={contacts}
      onSelectContact={onSelectContact}
    />
  </CContainer>
)

export default MessagesLayout
