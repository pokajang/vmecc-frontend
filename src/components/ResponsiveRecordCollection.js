import React from 'react'
import MobileRecordList from './MobileRecordList'
import TableLoader from './TableLoader'

const ResponsiveRecordCollection = ({
  isLoading = false,
  isEmpty = false,
  emptyMessage = null,
  mobileSections = [],
  renderDesktop = null,
  footer = null,
  children = null,
}) => {
  if (isLoading) return <TableLoader />
  if (isEmpty) return emptyMessage

  return (
    <>
      {children}
      <MobileRecordList sections={mobileSections} />
      {typeof renderDesktop === 'function' ? renderDesktop() : renderDesktop}
      {footer}
    </>
  )
}

export default ResponsiveRecordCollection
