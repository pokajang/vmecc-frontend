import React from 'react'
import { CButton, CCol, CFormSelect, CRow } from '@coreui/react'

const UserBulkActionsBar = ({
  selectedCount,
  actionOptions = [],
  selectedAction = '',
  disabled = false,
  onActionChange,
  onApply,
  onClear,
}) => (
  <CRow className="g-2 align-items-center mb-3">
    <CCol xs={12} md="auto">
      <span className="text-muted small">{selectedCount} selected</span>
    </CCol>
    <CCol xs={12} md={4}>
      <CFormSelect
        size="sm"
        value={selectedAction}
        onChange={(e) => onActionChange?.(e.target.value)}
        disabled={disabled || actionOptions.length === 0}
      >
        {actionOptions.length === 0 ? (
          <option value="">No action available</option>
        ) : (
          actionOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))
        )}
      </CFormSelect>
    </CCol>
    <CCol xs={12} md="auto">
      <CButton
        size="sm"
        color="primary"
        variant="outline"
        onClick={onApply}
        disabled={disabled || !selectedAction || actionOptions.length === 0}
      >
        Apply
      </CButton>
    </CCol>
    <CCol xs={12} md="auto">
      <CButton size="sm" color="secondary" variant="ghost" onClick={onClear} disabled={disabled}>
        Clear selection
      </CButton>
    </CCol>
  </CRow>
)

export default UserBulkActionsBar
