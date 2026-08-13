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
  actionsOnly = false,
}) => {
  const actionSurface = (
    <div data-testid="users-create-action" className="d-flex flex-wrap align-items-center gap-2">
      <CreateActionButton
        label={showForm ? 'Close' : 'Create User'}
        importance={showForm ? 'inline' : 'page-primary'}
        disabled={submitStatus.loading}
        onClick={onToggleForm}
        icon={showForm ? <X size={13} /> : <Plus size={13} />}
      />
      <CDropdown alignment="end">
        <CDropdownToggle size="sm" color="secondary" variant="outline">
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
  )

  if (actionsOnly) return actionSurface

  return (
    <div className="d-flex justify-content-between align-items-center">
      <div className="d-flex align-items-center gap-2">
        <span>Users</span>
        {refreshing && <Loader size={14} className="icon-spin" />}
      </div>
      {actionSurface}
    </div>
  )
}

export default UserManagementHeader
