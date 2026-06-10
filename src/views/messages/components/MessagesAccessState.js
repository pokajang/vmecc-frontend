import React from 'react'
import { CAlert } from '@coreui/react'
import TableLoader from 'src/components/TableLoader'

const MessagesAccessState = ({ loading, canMessage }) => {
  if (loading) return <TableLoader />
  if (!canMessage) {
    return (
      <CAlert color="warning" className="m-4">
        You do not have access to messages.
      </CAlert>
    )
  }
  return null
}

export default MessagesAccessState
