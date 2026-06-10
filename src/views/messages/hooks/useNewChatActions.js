import { useCallback } from 'react'
import { buildSelectedContactThread, mergeContactThread } from '../messageThreadUtils'

const useNewChatActions = ({
  contacts,
  contactsLoading,
  contactQuery,
  loadContacts,
  threads,
  isMobile,
  updateThreads,
  setActiveThread,
  setMobileView,
  setShowNewChat,
  setContactQuery,
}) => {
  const handleCloseNewChat = useCallback(() => {
    setShowNewChat(false)
    setContactQuery('')
  }, [setContactQuery, setShowNewChat])

  const handleOpenNewChat = useCallback(() => {
    setShowNewChat(true)
    if (!contacts.length && !contactsLoading) {
      loadContacts(contactQuery)
    }
  }, [contacts.length, contactsLoading, contactQuery, loadContacts, setShowNewChat])

  const handleSelectContact = useCallback(
    (contact) => {
      const existing = threads.find((thread) => thread.user?.id === contact.id)
      const selected = buildSelectedContactThread(threads, contact)
      if (!existing) {
        updateThreads((prev) => mergeContactThread(prev, selected))
      }
      setActiveThread(selected)
      if (isMobile) {
        setMobileView('thread')
      }
      setShowNewChat(false)
      setContactQuery('')
    },
    [
      threads,
      isMobile,
      updateThreads,
      setActiveThread,
      setContactQuery,
      setMobileView,
      setShowNewChat,
    ],
  )

  return {
    handleCloseNewChat,
    handleOpenNewChat,
    handleSelectContact,
  }
}

export default useNewChatActions
