import React, { useEffect, useState } from 'react'
import {
  CAlert,
  CButton,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'

import {
  markFireExtinguisherOutOfService,
  restoreFireExtinguisher,
  retireFireExtinguisher,
  returnFireExtinguisherToService,
} from 'src/views/inspection/inspectionFireExtinguisherApi'

export const LIFECYCLE_ACTIONS = Object.freeze({
  out_of_service: {
    title: 'Mark extinguisher out of service',
    confirmLabel: 'Mark out of service',
    confirmColor: 'warning',
    requiresReason: true,
    successVerb: 'marked out of service',
    lifecycleFilter: 'out_of_service',
    followUpLabel: 'View out-of-service assets',
  },
  active: {
    title: 'Return extinguisher to service',
    confirmLabel: 'Return to service',
    confirmColor: 'success',
    requiresReason: false,
    successVerb: 'returned to service',
    lifecycleFilter: 'active',
    followUpLabel: 'View active assets',
  },
  retired: {
    title: 'Retire extinguisher',
    confirmLabel: 'Retire',
    confirmColor: 'danger',
    requiresReason: true,
    successVerb: 'retired',
    lifecycleFilter: 'retired',
    followUpLabel: 'View retired assets',
  },
  restore: {
    title: 'Restore extinguisher',
    confirmLabel: 'Restore',
    confirmColor: 'primary',
    requiresReason: false,
    successVerb: 'restored to Active',
    lifecycleFilter: 'active',
    followUpLabel: 'View active assets',
  },
})

export const buildFireExtinguisherLifecycleMenuItems = ({
  asset,
  canManage = false,
  onEdit,
  onLifecycleAction,
}) => {
  if (!canManage) return []
  const status = asset?.lifecycleStatus || 'active'
  const items = []

  if (status !== 'retired') {
    items.push({ key: 'edit', label: 'Edit asset', onClick: () => onEdit?.(asset) })
  }
  if (status === 'active') {
    items.push({
      key: 'out-of-service',
      label: 'Mark out of service',
      onClick: () => onLifecycleAction?.(asset, 'out_of_service'),
    })
  }
  if (status === 'out_of_service') {
    items.push({
      key: 'return-to-service',
      label: 'Return to service',
      onClick: () => onLifecycleAction?.(asset, 'active'),
    })
  }
  if (status !== 'retired') {
    items.push({
      key: 'retire',
      label: 'Retire',
      className: 'text-danger',
      onClick: () => onLifecycleAction?.(asset, 'retired'),
    })
  } else {
    items.push({
      key: 'restore',
      label: 'Restore',
      onClick: () => onLifecycleAction?.(asset, 'restore'),
    })
  }

  return items
}

const runLifecycleAction = (asset, action, reason) => {
  const id = asset?.catalogId || asset?.id
  const payload = { lockVersion: asset?.lockVersion, ...(reason ? { reason } : {}) }
  if (action === 'out_of_service') return markFireExtinguisherOutOfService(id, payload)
  if (action === 'active') return returnFireExtinguisherToService(id, payload)
  if (action === 'retired') return retireFireExtinguisher(id, payload)
  if (action === 'restore') return restoreFireExtinguisher(id, payload)
  throw new Error('Unsupported lifecycle action.')
}

const FireExtinguisherLifecycleDialog = ({ asset, action = '', onClose, onChanged }) => {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const config = LIFECYCLE_ACTIONS[action]
  const identity = asset?.idLocNo || asset?.barcodeNo || 'This extinguisher'

  useEffect(() => {
    setReason('')
    setError('')
  }, [action, asset])

  const close = () => {
    if (!busy) onClose?.()
  }

  const confirm = async () => {
    if (!asset || !config || (config.requiresReason && !reason.trim())) return
    setBusy(true)
    setError('')
    try {
      const updated = await runLifecycleAction(asset, action, reason.trim())
      onChanged?.(updated, {
        action,
        message: `${identity} was ${config.successVerb}.`,
        lifecycleFilter: config.lifecycleFilter,
        followUpLabel: config.followUpLabel,
      })
      onClose?.()
    } catch (requestError) {
      setError(requestError?.message || 'Unable to change extinguisher lifecycle status.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <CModal visible={Boolean(asset && config)} alignment="center" onClose={close}>
      <CModalHeader onClose={close}>
        <CModalTitle>{config?.title || 'Change lifecycle status'}</CModalTitle>
      </CModalHeader>
      <CModalBody className="d-grid gap-3">
        <div>
          {action === 'retired'
            ? `Retiring ${identity} removes it from Active assets and closes its active managed issues. Its history remains available and it can be restored later.`
            : `${config?.confirmLabel || 'Update'} ${identity}?`}
        </div>
        {config?.requiresReason ? (
          <CFormTextarea
            id="fire-extinguisher-lifecycle-reason"
            label="Reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            invalid={Boolean(error && !reason.trim())}
            disabled={busy}
            required
          />
        ) : null}
        {error ? (
          <CAlert color="danger" className="mb-0 py-2" role="alert">
            {error}
          </CAlert>
        ) : null}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" onClick={close} disabled={busy}>
          Cancel
        </CButton>
        <CButton
          color={config?.confirmColor || 'primary'}
          onClick={confirm}
          disabled={busy || Boolean(config?.requiresReason && !reason.trim())}
        >
          {busy ? 'Saving...' : config?.confirmLabel || 'Confirm'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default FireExtinguisherLifecycleDialog
