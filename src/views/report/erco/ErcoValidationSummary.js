import React from 'react'
import { CAlert } from '@coreui/react'
import { orderedErcoErrorFields } from './validation'

const ErcoValidationSummary = ({ errors = {}, onSelectField }) => {
  const fields = orderedErcoErrorFields(errors)
  if (fields.length === 0) return null

  return (
    <CAlert color="danger" className="mb-3" role="alert" aria-live="assertive">
      <div className="fw-semibold mb-1">
        {fields.length} item{fields.length === 1 ? '' : 's'} need attention
      </div>
      <ul className="mb-0 ps-3">
        {fields.map((field) => (
          <li key={field}>
            <button
              type="button"
              className="btn btn-link link-danger p-0 text-start align-baseline"
              onClick={() => onSelectField?.(field)}
            >
              {errors[field]}
            </button>
          </li>
        ))}
      </ul>
    </CAlert>
  )
}

export default ErcoValidationSummary
