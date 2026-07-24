import React from 'react'

const handleKeyboardOpen = (event, onOpen) => {
  if (!onOpen) return
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    onOpen()
  }
}

const stopActionEvent = (event) => {
  event.stopPropagation()
}

const renderFields = (fields) =>
  Array.isArray(fields) && fields.length > 0 ? (
    <div className="row g-2 mt-3">
      {fields.map((field) => (
        <div key={field.key || field.label} className="col-6">
          <div className="vmecc-meta text-body-secondary">{field.label}</div>
          <div className="vmecc-card-title">{field.value ?? '-'}</div>
        </div>
      ))}
    </div>
  ) : null

const renderActions = (actions, className = 'd-flex justify-content-end mt-3') =>
  actions ? (
    <div
      className={className}
      onClick={stopActionEvent}
      onMouseDown={stopActionEvent}
      onKeyDown={stopActionEvent}
    >
      {actions}
    </div>
  ) : null

const RecordCard = ({ item = {}, className = '', variant = 'card' }) => {
  const openHandler = item.onToggle || item.onOpen
  const interactiveProps = {
    role: openHandler ? 'button' : undefined,
    tabIndex: openHandler ? 0 : undefined,
    className: openHandler ? 'cursor-pointer' : undefined,
    'aria-label': item.ariaLabel,
    'aria-expanded': item.onToggle ? Boolean(item.expanded) : undefined,
    onClick: openHandler,
    onKeyDown: (event) => handleKeyboardOpen(event, openHandler),
  }

  if (item.layout === 'compact') {
    const isListGroup = variant === 'list-group'

    return (
      <article
        className={
          isListGroup
            ? `record-card record-card--compact list-group-item p-3 bg-body ${className}`.trim()
            : `record-card record-card--compact border rounded-3 p-3 bg-body shadow-sm ${className}`.trim()
        }
      >
        <div
          {...interactiveProps}
          className={`record-card__compact-row d-flex min-w-0 align-items-start justify-content-between gap-2 ${interactiveProps.className || ''}`.trim()}
        >
          <div className="record-card__main min-w-0 flex-grow-1" style={{ minWidth: 0 }}>
            {item.eyebrow ? (
              <div className="record-card-eyebrow vmecc-caption text-body-tertiary mb-1">
                {item.eyebrow}
              </div>
            ) : null}
            <div className="record-card__title vmecc-card-title text-truncate">{item.title}</div>
            {item.subtitle ? (
              <div className="record-card__subtitle vmecc-meta text-body-secondary text-truncate mt-1">
                {item.subtitle}
              </div>
            ) : null}
            {item.searchText ? <span className="visually-hidden">{item.searchText}</span> : null}
          </div>
          <div
            className="record-card__meta d-flex min-w-0 flex-shrink-1 align-items-center justify-content-end gap-1"
            style={{ maxWidth: item.actions ? '48%' : '55%' }}
            onClick={item.actions ? stopActionEvent : undefined}
            onMouseDown={item.actions ? stopActionEvent : undefined}
            onKeyDown={item.actions ? stopActionEvent : undefined}
          >
            {item.status ? <div className="min-w-0 text-end">{item.status}</div> : null}
            {item.actions ? item.actions : null}
          </div>
        </div>
        {item.expanded && item.expandedContent ? (
          <div className="mt-3">{item.expandedContent}</div>
        ) : null}
      </article>
    )
  }

  if (variant === 'list-group') {
    const hasHeader = item.title || item.subtitle || item.eyebrow || item.status

    return (
      <article className={`list-group-item p-3 bg-body ${className}`.trim()}>
        {item.content ? (
          <div {...interactiveProps} className={interactiveProps.className}>
            {item.content}
          </div>
        ) : (
          <div {...interactiveProps}>
            {hasHeader ? (
              <div className="d-flex align-items-start justify-content-between gap-3">
                <div className="min-w-0">
                  {item.eyebrow ? (
                    <div className="vmecc-caption text-body-secondary mb-1">{item.eyebrow}</div>
                  ) : null}
                  {item.title ? (
                    <div className="vmecc-card-title text-truncate">{item.title}</div>
                  ) : null}
                  {item.subtitle ? (
                    <div className="vmecc-meta text-body-secondary mt-1">{item.subtitle}</div>
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
            ) : null}

            {renderFields(item.fields)}
            {item.detail ? (
              <div className="vmecc-meta text-body-secondary mt-3">{item.detail}</div>
            ) : null}
          </div>
        )}

        {item.expanded && item.expandedContent ? (
          <div className="mt-3">{item.expandedContent}</div>
        ) : null}
        {renderActions(item.actions)}
      </article>
    )
  }

  if (item.content) {
    return (
      <article className={`border rounded-3 p-3 bg-body shadow-sm ${className}`.trim()}>
        <div {...interactiveProps} className={interactiveProps.className}>
          {item.content}
        </div>
        {item.expanded && item.expandedContent ? (
          <div className="mt-3">{item.expandedContent}</div>
        ) : null}
        {renderActions(item.actions)}
      </article>
    )
  }

  return (
    <article className={`border rounded-3 p-3 bg-body shadow-sm ${className}`.trim()}>
      <div {...interactiveProps}>
        <div className="d-flex align-items-start justify-content-between gap-3">
          <div className="min-w-0">
            {item.eyebrow ? (
              <div className="vmecc-caption text-body-secondary mb-1">{item.eyebrow}</div>
            ) : null}
            <div className="vmecc-card-title text-truncate">{item.title}</div>
            {item.subtitle ? (
              <div className="vmecc-meta text-body-secondary mt-1">{item.subtitle}</div>
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

        {renderFields(item.fields)}
        {item.detail ? (
          <div className="vmecc-meta text-body-secondary mt-3">{item.detail}</div>
        ) : null}
      </div>

      {item.expanded && item.expandedContent ? (
        <div className="mt-3">{item.expandedContent}</div>
      ) : null}
      {renderActions(item.actions)}
    </article>
  )
}

export default RecordCard
