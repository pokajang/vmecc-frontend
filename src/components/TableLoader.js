import React from 'react'
import { Loader } from 'lucide-react'

const TableLoader = ({ message = 'Loading…', minHeight = 160 }) => (
  <div
    role="status"
    aria-live="polite"
    className="d-flex flex-column align-items-center justify-content-center gap-2 text-body-secondary"
    style={{ minHeight }}
  >
    <Loader size={22} className="icon-spin" />
    <span className="small">{message}</span>
  </div>
)

export default TableLoader
