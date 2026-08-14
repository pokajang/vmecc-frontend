import React from 'react'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'

const text = (value) => String(value || '').trim()

const InspectionItemDrawer = ({
  mode = 'inspect',
  itemTitle = '',
  editTitle = '',
  entityKind = 'equipment',
  headerAction = null,
  closeLabel = '',
  bodyClassName = '',
  children,
  ...drawerProps
}) => {
  const isInspectMode = mode === 'inspect'
  const safeItemTitle = text(itemTitle) || (entityKind === 'finding' ? 'Finding' : 'Equipment')
  const title = isInspectMode
    ? safeItemTitle
    : text(editTitle) || `Edit ${entityKind === 'finding' ? 'finding' : safeItemTitle}`
  const resolvedCloseLabel =
    text(closeLabel) ||
    (isInspectMode ? `Close ${safeItemTitle}` : `Close ${title} without leaving inspection context`)

  return (
    <MobileBottomDrawer
      {...drawerProps}
      title={title}
      headerAction={isInspectMode ? headerAction : null}
      closeLabel={resolvedCloseLabel}
      bodyClassName={`inspection-item-drawer inspection-item-drawer--${mode} ${bodyClassName}`.trim()}
      data-inspection-drawer-mode={mode}
      data-inspection-entity-kind={entityKind}
    >
      {children}
    </MobileBottomDrawer>
  )
}

export default InspectionItemDrawer
