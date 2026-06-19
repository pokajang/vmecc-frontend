import React from 'react'
import { CTableDataCell } from '@coreui/react'

const stopActionPropagation = (event) => {
  event.stopPropagation()
}

const RowActionCell = ({ children, className = 'text-center', ...props }) => (
  <CTableDataCell
    {...props}
    className={className}
    onClick={stopActionPropagation}
    onMouseDown={stopActionPropagation}
    onKeyDown={stopActionPropagation}
  >
    {children}
  </CTableDataCell>
)

export default RowActionCell
