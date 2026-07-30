import React from 'react'
import { CButton, CFormInput, CFormLabel } from '@coreui/react'

const FireExtinguisherLocationCreatePanel = ({
  config,
  name,
  error,
  isSubmitting,
  inputRef,
  onNameChange,
  onCancel,
  onSubmit,
}) => (
  <form
    className="fire-extinguisher-location-create-panel"
    aria-labelledby="fire-extinguisher-location-create-title"
    onSubmit={onSubmit}
  >
    <div>
      <div id="fire-extinguisher-location-create-title" className="fw-semibold">
        {config.title}
      </div>
      <div
        id="fire-extinguisher-location-create-description"
        className="small text-body-secondary mt-1"
      >
        {config.context ? `${config.context}. ` : ''}
        This will be added to the shared location catalogue and selected for this batch.
      </div>
    </div>
    <div className="d-flex flex-column flex-sm-row align-items-sm-end gap-2">
      <div className="flex-grow-1">
        <CFormLabel htmlFor="fire-extinguisher-location-create-name">
          {config.inputLabel}
        </CFormLabel>
        <CFormInput
          ref={inputRef}
          id="fire-extinguisher-location-create-name"
          value={name}
          maxLength={190}
          disabled={isSubmitting}
          aria-describedby="fire-extinguisher-location-create-description"
          aria-invalid={Boolean(error)}
          onChange={(event) => onNameChange(event.target.value)}
        />
      </div>
      <div className="d-flex gap-2">
        <CButton
          type="button"
          color="secondary"
          variant="outline"
          disabled={isSubmitting}
          onClick={onCancel}
        >
          Cancel
        </CButton>
        <CButton type="submit" color="primary" disabled={!name.trim() || isSubmitting}>
          {isSubmitting ? 'Adding…' : config.submitLabel}
        </CButton>
      </div>
    </div>
    {error ? (
      <div className="small text-danger" role="alert">
        {error}
      </div>
    ) : null}
  </form>
)

export default FireExtinguisherLocationCreatePanel
