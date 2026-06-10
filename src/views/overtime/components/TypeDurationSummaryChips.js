import React from 'react'
import { BriefcaseBusiness, CalendarClock, Landmark, Timer } from 'lucide-react'
import { buildTypeDurationSummaryItems } from './typeDurationSummary'

const SIZE_CLASS = {
  sm: 'small py-1 px-2',
  md: 'py-1 px-2',
}

const VARIANT_CLASS = {
  subtle: '',
  outline: 'bg-transparent text-body-secondary border',
}

const TYPE_VISUAL_MAP = {
  weekday: {
    icon: BriefcaseBusiness,
    style: {
      backgroundColor: 'rgba(210, 244, 255, 0.5)',
      color: 'rgb(10, 71, 90)',
    },
  },
  weekend: {
    icon: CalendarClock,
    style: {
      backgroundColor: 'rgba(255, 236, 186, 0.5)',
      color: 'rgb(110, 70, 0)',
    },
  },
  publicHoliday: {
    icon: Landmark,
    style: {
      backgroundColor: 'rgba(255, 214, 222, 0.5)',
      color: 'rgb(116, 30, 49)',
    },
  },
  default: {
    icon: Timer,
    style: {
      backgroundColor: 'rgba(228, 236, 244, 0.5)',
      color: 'rgb(53, 71, 88)',
    },
  },
}

const TypeDurationSummaryChips = ({
  typeDurationMinutes = {},
  items = [],
  align = 'end',
  size = 'sm',
  variant = 'subtle',
  showIcons = true,
  emptyLabel = 'No duration recorded',
  className = '',
}) => {
  const summaryItems = buildTypeDurationSummaryItems({ typeDurationMinutes, items })
  const justifyClass = align === 'start' ? 'justify-content-start' : 'justify-content-end'
  const resolvedSizeClass = SIZE_CLASS[size] || SIZE_CLASS.sm
  const resolvedVariantClass = VARIANT_CLASS[variant] || VARIANT_CLASS.subtle

  if (summaryItems.length === 0) {
    return <span className="small text-body-secondary">{emptyLabel}</span>
  }

  return (
    <div className={`d-flex flex-wrap align-items-center gap-2 ${justifyClass} ${className}`.trim()}>
      {summaryItems.map((item) => {
        const typeVisual = TYPE_VISUAL_MAP[item.overtimeType] || TYPE_VISUAL_MAP.default
        const Icon = typeVisual.icon
        return (
          <span
            key={item.key}
            className={`rounded-pill d-inline-flex align-items-center ${resolvedSizeClass} ${resolvedVariantClass}`}
            style={variant === 'subtle' ? typeVisual.style : undefined}
            data-testid={`ot-type-summary-chip-${item.overtimeType}`}
          >
            {showIcons ? <Icon size={12} className="me-1 flex-shrink-0" /> : null}
            <span className="fw-medium">{item.label}</span>
            <span className="ms-1">{item.formattedDuration}</span>
          </span>
        )
      })}
    </div>
  )
}

export default TypeDurationSummaryChips
