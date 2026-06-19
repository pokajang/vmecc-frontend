import React from 'react'
import {
  CButton,
  COffcanvas,
  COffcanvasBody,
  COffcanvasHeader,
  COffcanvasTitle,
} from '@coreui/react'
import { X } from 'lucide-react'

const MobileFilterDrawer = ({
  drawerRef,
  closeRef,
  visible = false,
  onClose = () => {},
  renderPeriodControl = () => null,
  renderFilterControl = () => null,
  filters = [],
  isAnyFilterActive = false,
  onClear = () => {},
  clearLabel = 'Clear',
}) => (
  <COffcanvas
    ref={drawerRef}
    visible={visible}
    onHide={onClose}
    placement="bottom"
    className="table-filter-drawer d-md-none"
  >
    <COffcanvasHeader>
      <COffcanvasTitle>Filters</COffcanvasTitle>
      <CButton
        ref={closeRef}
        color="link"
        className="p-1 text-body-secondary"
        onClick={onClose}
        aria-label="Close filters"
      >
        <X size={18} />
      </CButton>
    </COffcanvasHeader>
    <COffcanvasBody>
      <div className="d-grid gap-3">
        {renderPeriodControl({ mobile: true })}
        {filters.map((filter) => renderFilterControl(filter, { mobile: true }))}
        {isAnyFilterActive ? (
          <CButton size="sm" color="secondary" variant="outline" onClick={onClear}>
            {clearLabel}
          </CButton>
        ) : null}
      </div>
    </COffcanvasBody>
  </COffcanvas>
)

export default MobileFilterDrawer
