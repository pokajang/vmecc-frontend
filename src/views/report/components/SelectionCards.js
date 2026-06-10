import React from 'react'
import { CCol, CRow } from '@coreui/react'

const SelectionCards = ({
  label,
  options = [],
  selectedValue,
  onSelect,
  cols = { xs: 12, md: 6 },
}) => (
  <div className="d-grid gap-2">
    <div className="fw-semibold">{label}</div>
    <CRow className="g-2 g-md-3">
      {options.map((option) => {
        const Icon = option.icon
        const isSelected = selectedValue === option.value
        const hasDescription = Boolean(option.description)
        return (
          <CCol key={option.value} xs={cols.xs} md={cols.md}>
            <div
              className={`rounded-3 border h-100 p-2 p-md-3 w-100 ${
                isSelected ? 'border-primary bg-primary bg-opacity-10' : 'border-light-subtle'
              }`}
              role="button"
              tabIndex={0}
              style={{ cursor: 'pointer', minHeight: hasDescription ? 84 : 64 }}
              onClick={() => onSelect(option.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect(option.value)
                }
              }}
            >
              <div
                className={`d-flex gap-2 gap-md-3 ${hasDescription ? 'align-items-start' : 'align-items-center'}`}
                style={{ minWidth: 0 }}
              >
                <div
                  className={`rounded-circle d-inline-flex align-items-center justify-content-center ${
                    isSelected ? 'bg-primary text-white' : 'bg-light text-primary'
                  }`}
                  style={{ width: 36, height: 36, flex: '0 0 36px', lineHeight: 0 }}
                >
                  <Icon size={16} />
                </div>
                <div
                  className="flex-grow-1 d-flex flex-column justify-content-center"
                  style={{ minWidth: 0 }}
                >
                  <div className="fw-semibold">{option.title}</div>
                  {option.description ? (
                    <p className="d-none d-md-block mb-0 mt-1 small">{option.description}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </CCol>
        )
      })}
    </CRow>
  </div>
)

export default SelectionCards
