import React from 'react'

const handleKeyboardOpen = (event, onOpen) => {
  if (!onOpen) return
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    onOpen()
  }
}

const RecordCard = ({ item = {}, className = '' }) => (
  <article className={`border rounded-3 p-3 bg-white shadow-sm ${className}`.trim()}>
    <div
      role={item.onOpen ? 'button' : undefined}
      tabIndex={item.onOpen ? 0 : undefined}
      className={item.onOpen ? 'cursor-pointer' : undefined}
      aria-label={item.ariaLabel}
      onClick={item.onOpen}
      onKeyDown={(event) => handleKeyboardOpen(event, item.onOpen)}
    >
      <div className="d-flex align-items-start justify-content-between gap-3">
        <div className="min-w-0">
          {item.eyebrow ? (
            <div className="small text-body-secondary mb-1">{item.eyebrow}</div>
          ) : null}
          <div className="fw-semibold text-truncate">{item.title}</div>
          {item.subtitle ? (
            <div className="small text-body-secondary mt-1">{item.subtitle}</div>
          ) : null}
        </div>
        {item.status ? (
          <div
            className="flex-shrink-1 d-flex justify-content-end text-end"
            style={{ minWidth: 0, maxWidth: '55%', overflowWrap: 'anywhere' }}
          >
            {item.status}
          </div>
        ) : null}
      </div>

      {Array.isArray(item.fields) && item.fields.length > 0 ? (
        <div className="row g-2 mt-3">
          {item.fields.map((field) => (
            <div key={field.key || field.label} className="col-6">
              <div className="small text-body-secondary">{field.label}</div>
              <div className="fw-semibold">{field.value ?? '-'}</div>
            </div>
          ))}
        </div>
      ) : null}

      {item.detail ? <div className="small text-body-secondary mt-3">{item.detail}</div> : null}
    </div>

    {item.actions ? <div className="d-flex justify-content-end mt-3">{item.actions}</div> : null}
  </article>
)

export default RecordCard
