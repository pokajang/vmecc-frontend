export const buildSelectedContactThread = (threads = [], contact = {}) => {
  const existing = threads.find((thread) => thread.user?.id === contact.id)
  return existing || { user: contact, last_message: null, unread_count: 0 }
}

export const mergeContactThread = (threads = [], selected) =>
  [selected, ...threads.filter((thread) => thread.user?.id !== selected.user?.id)].sort((a, b) => {
    const aTime = a.last_message?.created_at ? new Date(a.last_message.created_at).getTime() : 0
    const bTime = b.last_message?.created_at ? new Date(b.last_message.created_at).getTime() : 0
    return bTime - aTime
  })
