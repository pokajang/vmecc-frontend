import React from 'react'
import { X } from 'lucide-react'

const ActiveFilterChips = ({ items = [] }) => {
  if (items.length === 0) return null

  return (
    <div className="d-flex flex-wrap align-items-center gap-2 mb-3" aria-label="Active filters">
      <span className="small text-body-secondary">Active filters:</span>
      {items.map((item) => (
        <span
          key={item.key}
          className="d-inline-flex align-items-center gap-1 rounded-pill border bg-body px-2 py-1 small"
        >
          <span className="text-body-secondary">{item.label}:</span>
          <span className="fw-semibold">{item.value}</span>
          {item.onClear ? (
            <button
              type="button"
              className="btn btn-link btn-sm p-0 ms-1 text-body-secondary"
              style={{ lineHeight: 1 }}
              onClick={item.onClear}
              aria-label={`Clear ${item.label} filter`}
            >
              <X size={12} />
            </button>
          ) : null}
        </span>
      ))}
    </div>
  )
}

export default ActiveFilterChips
