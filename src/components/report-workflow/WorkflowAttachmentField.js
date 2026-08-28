import React, { useImperativeHandle, useRef } from 'react'
import { CButton, CFormFeedback, CFormInput, CFormLabel } from '@coreui/react'
import { Camera, Trash2, Upload } from 'lucide-react'
import MediaAddActionButton from 'src/components/MediaAddActionButton'

const WorkflowAttachmentField = ({
  id,
  label,
  required = false,
  accept,
  onChange,
  onFileSelect,
  disabled = false,
  error = '',
  guidance = '',
  statusLabel = '',
  statusDetail = '',
  statusTone = 'muted',
  hasAttachment = false,
  onRemove,
  removeLabel = 'Remove attachment',
  onCamera,
  cameraLabel = 'Use camera',
  addLabel = 'Add attachment',
  replaceLabel = 'Replace attachment',
  inputRef,
  cameraInput = null,
  uploadInput = null,
  className = '',
}) => {
  const internalInputRef = useRef(null)
  useImperativeHandle(inputRef, () => internalInputRef.current)
  const errorId = error ? `${id}-error` : undefined
  const guidanceId = guidance ? `${id}-guidance` : undefined
  const describedBy = [errorId, guidanceId].filter(Boolean).join(' ') || undefined
  const statusClass =
    statusTone === 'danger'
      ? 'text-danger'
      : statusTone === 'warning'
        ? 'text-warning'
        : statusTone === 'success'
          ? 'text-success'
          : 'text-body-secondary'

  const handleChange = (event) => {
    const file = event.target.files?.[0] || null
    onChange?.(event)
    onFileSelect?.(file)
    event.target.value = ''
  }
  return (
    <div
      className={['workflow-attachment-field', 'd-grid gap-2', className].filter(Boolean).join(' ')}
    >
      <CFormLabel htmlFor={id} className="mb-0">
        {label} ({required ? 'required' : 'optional'})
      </CFormLabel>
      <CFormInput
        ref={internalInputRef}
        id={id}
        type="file"
        className="workflow-attachment-field__input visually-hidden"
        tabIndex={-1}
        accept={accept}
        onChange={handleChange}
        disabled={disabled}
        invalid={Boolean(error)}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
      />
      <div className="workflow-attachment-field__controls d-flex flex-wrap align-items-center gap-2">
        <MediaAddActionButton
          type="button"
          label={hasAttachment ? replaceLabel : addLabel}
          ariaLabel={hasAttachment ? replaceLabel : addLabel}
          icon={<Upload size={16} />}
          className="workflow-attachment-field__trigger"
          onClick={() => internalInputRef.current?.click()}
          disabled={disabled}
        />
        {typeof onCamera === 'function' ? (
          <CButton
            type="button"
            color="link"
            className="workflow-attachment-action app-button app-button--neutral app-button--ghost d-inline-flex align-items-center justify-content-center p-0"
            onClick={onCamera}
            disabled={disabled}
            title={cameraLabel}
            aria-label={cameraLabel}
          >
            <Camera size={19} aria-hidden="true" />
          </CButton>
        ) : null}
      </div>
      {error ? (
        <CFormFeedback id={errorId} invalid style={{ display: 'block' }} role="alert">
          {error}
        </CFormFeedback>
      ) : null}
      {guidance ? (
        <div id={guidanceId} className="small text-body-secondary">
          {guidance}
        </div>
      ) : null}
      {statusLabel || statusDetail ? (
        <div className={`small ${statusClass}`} role={statusTone === 'danger' ? 'alert' : 'status'}>
          {statusLabel ? <span className="fw-semibold">{statusLabel}: </span> : null}
          {statusDetail}
        </div>
      ) : null}
      {hasAttachment && typeof onRemove === 'function' ? (
        <div>
          <CButton
            type="button"
            color="link"
            className="workflow-attachment-action d-inline-flex align-items-center gap-1 p-0 text-danger text-decoration-none"
            onClick={onRemove}
            disabled={disabled}
          >
            <Trash2 size={16} aria-hidden="true" />
            <span>{removeLabel}</span>
          </CButton>
        </div>
      ) : null}
      {cameraInput}
      {uploadInput}
    </div>
  )
}

export default WorkflowAttachmentField
