import React from 'react'
import MobileRecordList from './MobileRecordList'
import PageState from './PageState'
import TableLoader from './TableLoader'

const ResponsiveRecordCollection = ({
  isLoading = false,
  loadingMessage,
  isEmpty = false,
  emptyMessage = null,
  mobileSections = [],
  mobileVariant = 'card',
  renderDesktop = null,
  footer = null,
  children = null,
}) => {
  if (isLoading) return <TableLoader message={loadingMessage} />
  if (isEmpty) {
    if (React.isValidElement(emptyMessage)) return emptyMessage
    return <PageState variant="empty" message={emptyMessage || 'No records found.'} />
  }

  return (
    <>
      {children}
      <MobileRecordList sections={mobileSections} variant={mobileVariant} />
      {typeof renderDesktop === 'function' ? renderDesktop() : renderDesktop}
      {footer}
    </>
  )
}

export default ResponsiveRecordCollection
