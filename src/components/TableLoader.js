import React from 'react'
import PageState from './PageState'

const TableLoader = ({ message = 'Loading…', minHeight = 160 }) => (
  <PageState variant="loading" message={message} minHeight={minHeight} />
)

export default TableLoader
