import React from 'react'
import { CDropdown, CDropdownItem, CDropdownMenu, CDropdownToggle } from '@coreui/react'
import { Loader, Plus, X } from 'lucide-react'
import CreateActionButton from 'src/components/CreateActionButton'

const UserManagementHeader = ({
  refreshing,
  showForm,
  submitStatus,
  onToggleForm,
  onExportCsv,
  onExportXlsx,
  hasRows,
}) => (
  <div className="d-flex justify-content-between align-items-center">
    <div className="d-flex align-items-center gap-2">
      <span>Users</span>
      {refreshing && <Loader size={14} className="icon-spin" />}
    </div>
    <div className="d-flex align-items-center">
      <CreateActionButton
        label={showForm ? 'Close' : 'Create User'}
        disabled={submitStatus.loading}
        onClick={onToggleForm}
        icon={
          showForm ? (
            <X size={13} className="me-1 align-text-bottom" />
          ) : (
            <Plus size={13} className="me-1 align-text-bottom" />
          )
        }
      />
      <CDropdown alignment="end">
        <CDropdownToggle size="sm" color="secondary" variant="outline" className="ms-2">
          Export
        </CDropdownToggle>
        <CDropdownMenu>
          <CDropdownItem onClick={onExportCsv} disabled={!hasRows}>
            Export CSV
          </CDropdownItem>
          <CDropdownItem onClick={onExportXlsx} disabled={!hasRows}>
            Export XLSX
          </CDropdownItem>
        </CDropdownMenu>
      </CDropdown>
    </div>
  </div>
)

export default UserManagementHeader
