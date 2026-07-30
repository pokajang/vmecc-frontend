import React from 'react'
import { CCol, CRow } from '@coreui/react'
import IconOptionCard from 'src/components/IconOptionCard'

const SelectionCards = ({
  label,
  options = [],
  selectedValue,
  onSelect,
  cols = { xs: 12, md: 6 },
  showDescriptions = true,
}) => (
  <div className="d-grid gap-2">
    <div className="fw-semibold text-muted">{label}</div>
    <CRow className="g-2 g-md-3">
      {options.map((option) => {
        const Icon = option.icon
        const isSelected = selectedValue === option.value
        return (
          <CCol key={option.value} xs={cols.xs} md={cols.md}>
            <IconOptionCard
              title={option.title}
              description={option.description}
              icon={Icon}
              selected={isSelected}
              variant="compact"
              className="report-option-card"
              showDescription={showDescriptions && Boolean(option.description)}
              role="button"
              onSelect={() => onSelect(option.value)}
            />
          </CCol>
        )
      })}
    </CRow>
  </div>
)

export default SelectionCards
