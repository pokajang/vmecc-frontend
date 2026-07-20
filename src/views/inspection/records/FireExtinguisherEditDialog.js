import React, { useState } from 'react'
import { CAlert, CModal, CModalBody, CModalHeader, CModalTitle } from '@coreui/react'

import { updateFireExtinguisherOption } from 'src/views/inspection/inspectionFireExtinguisherApi'
import { AddFireExtinguisherForm } from '../types/fire-extinguisher/fireExtinguisherEditForm'

const FireExtinguisherEditDialog = ({ asset, onClose, onChanged }) => {
  const [error, setError] = useState('')

  const close = () => {
    setError('')
    onClose?.()
  }

  const save = async (payload) => {
    setError('')
    try {
      const updated = await updateFireExtinguisherOption(asset.catalogId || asset.id, {
        ...payload,
        lockVersion: asset.lockVersion,
        zone: payload.zone || asset.zone,
        mainLocation: payload.mainLocation || asset.mainLocation || asset.location,
        subLocation: payload.subLocation || asset.subLocation,
      })
      onChanged?.(updated, {
        action: 'edit',
        message: `${updated?.idLocNo || asset.idLocNo || 'Fire extinguisher'} was updated.`,
      })
      close()
      return updated
    } catch (requestError) {
      setError(requestError?.message || 'Unable to update extinguisher.')
      return false
    }
  }

  return (
    <CModal visible={Boolean(asset)} size="lg" alignment="center" onClose={close}>
      <CModalHeader onClose={close}>
        <CModalTitle>Edit extinguisher</CModalTitle>
      </CModalHeader>
      <CModalBody className="d-grid gap-3">
        {error ? (
          <CAlert color="danger" className="mb-0" role="alert">
            {error}
          </CAlert>
        ) : null}
        {asset ? (
          <AddFireExtinguisherForm
            presentation="plain"
            editableLocation
            mode="edit"
            submitLabel="Save changes"
            initialValue={{ ...asset, mainLocation: asset.mainLocation || asset.location }}
            onCancel={close}
            onSave={save}
          />
        ) : null}
      </CModalBody>
    </CModal>
  )
}

export default FireExtinguisherEditDialog
