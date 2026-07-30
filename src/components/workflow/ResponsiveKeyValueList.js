import React from 'react'

const ResponsiveKeyValueList = ({ items = [], className = '', compact = false }) => (
  <dl
    className={`responsive-key-value-list d-grid mb-0 ${compact ? 'responsive-key-value-list--compact' : ''} ${className}`.trim()}
  >
    {items.filter(Boolean).map((item, index) => (
      <div
        key={item.key || item.label || index}
        className={`responsive-key-value-list__row ${item.className || ''}`.trim()}
      >
        <dt className="responsive-key-value-list__label text-body-secondary fw-normal">
          {item.label}
        </dt>
        <dd
          className={`responsive-key-value-list__value mb-0 text-break ${
            item.emphasis ? 'fw-semibold' : ''
          }`.trim()}
        >
          {item.value ?? '-'}
        </dd>
      </div>
    ))}
  </dl>
)

export default ResponsiveKeyValueList
