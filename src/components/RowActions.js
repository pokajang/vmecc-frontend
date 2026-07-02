import React, { useEffect, useRef, useState } from 'react'
import { CDropdown, CDropdownItem, CDropdownMenu, CDropdownToggle } from '@coreui/react'
import { MoreVertical } from 'lucide-react'

// Each mounted RowActions registers a close callback so opening one closes the rest.
const registry = new Set()

const RowActions = ({
  items = [],
  align = 'end',
  iconSize = 18,
  toggleClassName = '',
  toggleStyle,
  hitArea = 44,
  tourId = '',
  toggleAriaLabel = 'Row actions',
}) => {
  const [visible, setVisible] = useState(false)
  const closeRef = useRef(() => setVisible(false))

  useEffect(() => {
    const close = () => setVisible(false)
    closeRef.current = close
    registry.add(close)
    return () => registry.delete(close)
  }, [])

  const handleOpen = () => {
    setVisible(true)
    registry.forEach((close) => {
      if (close !== closeRef.current) close()
    })
  }

  if (!items.length) return null

  return (
    <div
      {...(tourId ? { 'data-tour-id': tourId } : {})}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <CDropdown
        alignment={align}
        portal
        visible={visible}
        onShow={handleOpen}
        onHide={() => setVisible(false)}
      >
        <CDropdownToggle
          color="link"
          caret={false}
          size="sm"
          className={`p-2 border-0 shadow-none text-muted d-inline-flex align-items-center justify-content-center rounded ${toggleClassName}`.trim()}
          style={{ cursor: 'pointer', minWidth: hitArea, minHeight: hitArea, ...toggleStyle }}
          aria-label={toggleAriaLabel}
        >
          <MoreVertical size={iconSize} />
        </CDropdownToggle>
        <CDropdownMenu aria-hidden={!visible}>
          {visible
            ? items.map((item) => {
                const disabled = Boolean(item.disabled)
                const disabledReason = disabled ? String(item.disabledReason || '').trim() : ''
                const label = String(item.label || '')
                const title = disabledReason || undefined
                const ariaLabel = disabledReason ? `${label}. ${disabledReason}` : label

                return (
                  <CDropdownItem
                    key={item.key || item.label}
                    className={`${disabled ? 'text-body-secondary opacity-75' : 'cursor-pointer'} ${
                      item.className || ''
                    }`.trim()}
                    style={{
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      ...(item.style || {}),
                      ...(disabled ? { color: 'var(--cui-secondary-color)' } : {}),
                    }}
                    onClick={(event) => {
                      event.stopPropagation()
                      if (disabled) {
                        event.preventDefault()
                        return
                      }
                      setVisible(false)
                      try {
                        item.onClick?.()
                      } catch (err) {
                        console.error(
                          `RowActions: onClick failed for "${item.key || item.label}"`,
                          err,
                        )
                      }
                    }}
                    aria-disabled={disabled}
                    aria-label={ariaLabel}
                    title={title}
                    tabIndex={0}
                  >
                    <span title={title} aria-label={ariaLabel}>
                      {label}
                    </span>
                  </CDropdownItem>
                )
              })
            : null}
        </CDropdownMenu>
      </CDropdown>
    </div>
  )
}

export default RowActions
