import React from 'react'

const ResponsiveFinancialBreakdown = ({
  sections = [],
  desktop = null,
  className = '',
  ariaLabel = 'Financial breakdown',
}) => (
  <div className={`responsive-financial-breakdown ${className}`.trim()}>
    <div className="d-md-none d-grid gap-3" role="region" aria-label={ariaLabel}>
      {sections.filter(Boolean).map((section, sectionIndex) => (
        <section
          key={section.key || section.title || sectionIndex}
          className="responsive-financial-breakdown__section border rounded-3 bg-body overflow-hidden"
        >
          {section.title ? (
            <h3 className="responsive-financial-breakdown__title mb-0 px-3 py-2">
              {section.title}
            </h3>
          ) : null}
          <div className="d-grid">
            {(section.items || []).filter(Boolean).map((item, itemIndex) => (
              <div
                key={item.key || item.label || itemIndex}
                className={`responsive-financial-breakdown__row d-grid gap-1 px-3 py-2 ${
                  item.emphasis ? 'responsive-financial-breakdown__row--emphasis' : ''
                } ${item.tone ? `responsive-financial-breakdown__row--${item.tone}` : ''}`.trim()}
              >
                <div className="responsive-financial-breakdown__line">
                  <div className="responsive-financial-breakdown__label text-body-secondary">
                    {item.label}
                  </div>
                  <div className="responsive-financial-breakdown__value fw-semibold text-end">
                    {item.value ?? '-'}
                  </div>
                </div>
                {item.detail ? (
                  <div className="vmecc-meta text-body-secondary text-break">{item.detail}</div>
                ) : null}
                {item.actions ? <div className="d-flex flex-wrap gap-2">{item.actions}</div> : null}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
    <div className="d-none d-md-block">{desktop}</div>
  </div>
)

export default ResponsiveFinancialBreakdown
