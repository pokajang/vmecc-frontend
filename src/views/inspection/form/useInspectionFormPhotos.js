import { useRef } from 'react'
import {
  applyPhotoCaptionById,
  getRowPhotoList,
  prepareInspectionPhotoUploads,
  removePhotoById,
  updatePhotoDescriptionById,
} from './inspectionPhotoUtils'
import { createGroupedRowPhotoHandlers, createRowPhotoHandlers } from './inspectionRowPhotoActions'

const useInspectionFormPhotos = ({
  appendInspectionText,
  createPhotoId,
  defaultHighAnglePhotosKey,
  form,
  getLatestForm,
  getScbaExistingCheck,
  getScbaFieldEvidenceKeys,
  pushToast,
  updateErAuxCheck,
  updateFireExtinguisherCheck,
  updateForm,
  updateFrtCheck,
  updateHighAngleCheck,
  updateHydraulicCheck,
  updateScbaGroupedCheck,
}) => {
  const uploadInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const photoUploadTargetRef = useRef({ kind: 'root' })

  const openPhotoInput = (target, inputRef) => {
    photoUploadTargetRef.current = target || { kind: 'root' }
    inputRef.current?.click()
  }

  const handlePhotoSelect = async (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (files.length === 0) return
    const uploadTarget = photoUploadTargetRef.current || { kind: 'root' }
    const nextPhotos = await prepareInspectionPhotoUploads({
      files,
      form,
      pushToast,
      defaultDescription: uploadTarget?.defaultDescription || uploadTarget?.caption || '',
      createPhotoId,
    })
    if (!nextPhotos || nextPhotos.length === 0) return

    if (uploadTarget?.kind === 'inspectionIssue') {
      if (typeof uploadTarget.onAddPhotos === 'function') {
        uploadTarget.onAddPhotos(nextPhotos)
        return
      }
      const issueId = String(uploadTarget.issueId || '').trim()
      const currentIssues = Array.isArray(form.inspectionIssues) ? form.inspectionIssues : []
      updateForm({
        ...form,
        inspectionIssues: currentIssues.map((issue) =>
          String(issue?.id || '').trim() === issueId
            ? {
                ...issue,
                photos: [...(Array.isArray(issue.photos) ? issue.photos : []), ...nextPhotos],
                updatedAt: new Date().toISOString(),
              }
            : issue,
        ),
      })
      return
    }

    if (
      uploadTarget?.kind === 'fireExtinguisher' ||
      uploadTarget?.kind === 'fireExtinguisherDefect'
    ) {
      const row = uploadTarget.row || {}
      const rowId = String(row.id || '').trim()
      const existingCheck =
        form.fireExtinguisherChecks.find((check) => String(check.id || '') === rowId) || row
      const photosKey =
        uploadTarget?.kind === 'fireExtinguisherDefect' ? uploadTarget.photosKey : 'photos'
      if (typeof uploadTarget.onAddPhotos === 'function') {
        uploadTarget.onAddPhotos(row, photosKey, [
          ...(Array.isArray(row[photosKey]) ? row[photosKey] : []),
          ...nextPhotos,
        ])
        return
      }
      updateFireExtinguisherCheck(row, {
        [photosKey]: [
          ...(Array.isArray(existingCheck[photosKey]) ? existingCheck[photosKey] : []),
          ...nextPhotos,
        ],
      })
      return
    }

    if (uploadTarget?.kind === 'hydraulicEquipment' || uploadTarget?.kind === 'hydraulicDefect') {
      const row = uploadTarget.row || {}
      const rowId = String(row.id || '').trim()
      const existingCheck =
        form.hydraulicChecks.find((check) => String(check.id || '') === rowId) || row
      const photosKey = uploadTarget?.kind === 'hydraulicDefect' ? uploadTarget.photosKey : 'photos'
      if (typeof uploadTarget.onAddPhotos === 'function') {
        uploadTarget.onAddPhotos(row, photosKey, [
          ...(Array.isArray(row[photosKey]) ? row[photosKey] : []),
          ...nextPhotos,
        ])
        return
      }
      updateHydraulicCheck(row, {
        [photosKey]: [
          ...(Array.isArray(existingCheck[photosKey]) ? existingCheck[photosKey] : []),
          ...nextPhotos,
        ],
      })
      return
    }

    if (uploadTarget?.kind === 'frtIssue') {
      const row = uploadTarget.row || {}
      const rowId = String(row.id || '').trim()
      const isOneOff = String(row?.checklistKind || '').trim() === 'oneOff'
      const checksKey = isOneOff ? 'frtOneOffChecks' : 'frtDailyChecks'
      const checks = Array.isArray(form[checksKey]) ? form[checksKey] : []
      const existingCheck = checks.find((check) => String(check.id || '') === rowId) || row
      const photosKey = uploadTarget.photosKey || 'photos'
      if (typeof uploadTarget.onAddPhotos === 'function') {
        uploadTarget.onAddPhotos(row, photosKey, [
          ...(Array.isArray(row[photosKey]) ? row[photosKey] : []),
          ...nextPhotos,
        ])
        return
      }
      const photos = [
        ...(Array.isArray(existingCheck[photosKey]) ? existingCheck[photosKey] : []),
        ...nextPhotos,
      ]
      updateFrtCheck(row, {
        [photosKey]: photos,
      })
      return
    }

    if (uploadTarget?.kind === 'highAngleIssue') {
      const row = uploadTarget.row || {}
      const rowId = String(row.id || '').trim()
      const existingCheck =
        form.highAngleChecks.find((check) => String(check.id || '') === rowId) || row
      const photosKey = uploadTarget.photosKey || defaultHighAnglePhotosKey
      if (typeof uploadTarget.onAddPhotos === 'function') {
        uploadTarget.onAddPhotos(row, photosKey, [
          ...(Array.isArray(row[photosKey]) ? row[photosKey] : []),
          ...nextPhotos,
        ])
        return
      }
      updateHighAngleCheck(row, {
        [photosKey]: [
          ...(Array.isArray(existingCheck[photosKey]) ? existingCheck[photosKey] : []),
          ...nextPhotos,
        ],
      })
      return
    }

    if (uploadTarget?.kind === 'scbaEquipment' || uploadTarget?.kind === 'scbaIssue') {
      const row = uploadTarget.row || {}
      const rowId = String(row.id || '').trim()
      const sectionKey = uploadTarget.sectionKey || row.sectionKey
      const currentForm = getLatestForm()
      const existingCheck = getScbaExistingCheck(currentForm, sectionKey, rowId) || row
      const photosKey = uploadTarget.photosKey || 'photos'
      if (!photosKey) return
      if (typeof uploadTarget.onAddPhotos === 'function') {
        uploadTarget.onAddPhotos(sectionKey, row, photosKey, [
          ...(Array.isArray(row[photosKey]) ? row[photosKey] : []),
          ...nextPhotos,
        ])
        return
      }
      updateScbaGroupedCheck(sectionKey, row, {
        [photosKey]: [
          ...(Array.isArray(existingCheck[photosKey]) ? existingCheck[photosKey] : []),
          ...nextPhotos,
        ],
      })
      return
    }

    if (uploadTarget?.kind === 'erAuxEquipment' || uploadTarget?.kind === 'erAuxDefect') {
      const row = uploadTarget.row || {}
      const rowId = String(row.id || '').trim()
      const existingCheck =
        form.erAuxChecks.find((check) => String(check.id || '') === rowId) || row
      const photosKey = uploadTarget?.kind === 'erAuxDefect' ? 'defectPhotos' : 'photos'
      if (typeof uploadTarget.onAddPhotos === 'function') {
        uploadTarget.onAddPhotos(row, photosKey, [
          ...(Array.isArray(row[photosKey]) ? row[photosKey] : []),
          ...nextPhotos,
        ])
        return
      }
      updateErAuxCheck(row, {
        [photosKey]: [
          ...(Array.isArray(existingCheck[photosKey]) ? existingCheck[photosKey] : []),
          ...nextPhotos,
        ],
      })
      return
    }

    updateForm({
      ...form,
      photos: [...form.photos, ...nextPhotos],
    })
  }

  const requestRootPhotoUpload = (inputRef, defaultDescription = '') =>
    openPhotoInput(
      { kind: 'root', defaultDescription: String(defaultDescription || '').trim() },
      inputRef,
    )

  const requestInspectionIssuePhotoUpload = (issue, inputRef = cameraInputRef) => {
    const label = String(issue?.label || issue?.description || 'Finding').trim()
    openPhotoInput(
      {
        kind: 'inspectionIssue',
        issueId: issue?.id,
        defaultDescription: label,
        onAddPhotos: issue?.onAddPhotos,
      },
      inputRef,
    )
  }

  const requestHydraulicPhotoUpload = (row, options = {}) => {
    openPhotoInput({ kind: 'hydraulicEquipment', row, ...options }, cameraInputRef)
  }

  const requestErAuxPhotoUpload = (row, options = {}) => {
    openPhotoInput({ kind: 'erAuxEquipment', row, ...options }, cameraInputRef)
  }

  const requestErAuxDefectPhotoUpload = (row, options = {}) => {
    openPhotoInput({ kind: 'erAuxDefect', row, ...options }, cameraInputRef)
  }

  const requestHydraulicDefectPhotoUpload = (row, field, options = {}) => {
    openPhotoInput(
      { kind: 'hydraulicDefect', row, photosKey: field.photosKey, ...options },
      cameraInputRef,
    )
  }

  const requestFireExtinguisherPhotoUpload = (row, options = {}) => {
    openPhotoInput({ kind: 'fireExtinguisher', row, ...options }, cameraInputRef)
  }

  const requestFireExtinguisherDefectPhotoUpload = (row, field, options = {}) => {
    openPhotoInput(
      { kind: 'fireExtinguisherDefect', row, photosKey: field.photosKey, ...options },
      cameraInputRef,
    )
  }

  const requestFrtIssuePhotoUpload = (row, options = {}) => {
    openPhotoInput({ kind: 'frtIssue', row, photosKey: 'photos', ...options }, cameraInputRef)
  }

  const requestHighAngleIssuePhotoUpload = (row, options = {}) => {
    openPhotoInput(
      { kind: 'highAngleIssue', row, photosKey: defaultHighAnglePhotosKey, ...options },
      cameraInputRef,
    )
  }

  const requestScbaIssuePhotoUpload = (sectionKey, row, field, options = {}) => {
    const { photosKey } = getScbaFieldEvidenceKeys(field)
    openPhotoInput({ kind: 'scbaIssue', sectionKey, row, photosKey, ...options }, cameraInputRef)
  }

  const requestScbaPhotoUpload = (sectionKey, row, options = {}) => {
    openPhotoInput(
      { kind: 'scbaEquipment', sectionKey, row, photosKey: 'photos', ...options },
      cameraInputRef,
    )
  }

  const removePhoto = (photoId) => {
    updateForm({
      ...form,
      photos: removePhotoById(form.photos, photoId),
    })
  }

  const updatePhotoDescription = (photoId, description) => {
    updateForm({
      ...form,
      photos: updatePhotoDescriptionById(form.photos, photoId, description),
    })
  }

  const getHydraulicPhotoList = (row, photosKey = 'photos') =>
    getRowPhotoList(form.hydraulicChecks, row, photosKey)
  const hydraulicPhotoHandlers = createRowPhotoHandlers({
    getPhotos: getHydraulicPhotoList,
    updateRow: updateHydraulicCheck,
    appendText: appendInspectionText,
  })

  const getErAuxPhotoList = (row, photosKey = 'photos') =>
    getRowPhotoList(form.erAuxChecks, row, photosKey)
  const erAuxPhotoHandlers = createRowPhotoHandlers({
    getPhotos: getErAuxPhotoList,
    updateRow: updateErAuxCheck,
    appendText: appendInspectionText,
  })

  const getFrtPhotoList = (row, photosKey = 'photos') => {
    const rowId = String(row?.id || '').trim()
    const checksKey =
      String(row?.checklistKind || '').trim() === 'oneOff' ? 'frtOneOffChecks' : 'frtDailyChecks'
    const checks = Array.isArray(form[checksKey]) ? form[checksKey] : []
    const existing = checks.find((check) => String(check.id || '') === rowId)
    return Array.isArray(existing?.[photosKey]) ? existing[photosKey] : []
  }

  const getHighAnglePhotoList = (row, photosKey = defaultHighAnglePhotosKey) =>
    getRowPhotoList(form.highAngleChecks, row, photosKey)
  const highAnglePhotoHandlers = createRowPhotoHandlers({
    getPhotos: getHighAnglePhotoList,
    updateRow: updateHighAngleCheck,
    appendText: appendInspectionText,
  })

  const getScbaPhotoList = (sectionKey, row, photosKey = 'photos') => {
    const rowId = String(row?.id || '').trim()
    const existing = getScbaExistingCheck(form, sectionKey, rowId)
    return Array.isArray(existing?.[photosKey]) ? existing[photosKey] : []
  }
  const scbaPhotoHandlers = createGroupedRowPhotoHandlers({
    getPhotos: getScbaPhotoList,
    updateRow: updateScbaGroupedCheck,
    appendText: appendInspectionText,
  })

  const getFireExtinguisherPhotoList = (row, photosKey = 'photos') =>
    getRowPhotoList(form.fireExtinguisherChecks, row, photosKey)
  const fireExtinguisherPhotoHandlers = createRowPhotoHandlers({
    getPhotos: getFireExtinguisherPhotoList,
    updateRow: updateFireExtinguisherCheck,
    appendText: appendInspectionText,
  })

  const removeFrtPhoto = (row, photoId, photosKey = 'photos') => {
    updateFrtCheck(row, {
      [photosKey]: removePhotoById(getFrtPhotoList(row, photosKey), photoId),
    })
  }

  const updateFrtPhotoDescription = (row, photoId, description, photosKey = 'photos') => {
    updateFrtCheck(row, {
      [photosKey]: updatePhotoDescriptionById(
        getFrtPhotoList(row, photosKey),
        photoId,
        description,
      ),
    })
  }

  const applyFrtPhotoCaption = (row, photoId, caption, photosKey = 'photos') => {
    updateFrtCheck(row, {
      [photosKey]: applyPhotoCaptionById(
        getFrtPhotoList(row, photosKey),
        photoId,
        caption,
        appendInspectionText,
      ),
    })
  }

  return {
    applyErAuxPhotoCaption: (...args) => erAuxPhotoHandlers.applyPhotoCaption(...args),
    applyFireExtinguisherPhotoCaption: (...args) =>
      fireExtinguisherPhotoHandlers.applyPhotoCaption(...args),
    applyFrtPhotoCaption,
    applyHighAnglePhotoCaption: (...args) => highAnglePhotoHandlers.applyPhotoCaption(...args),
    applyHydraulicPhotoCaption: (...args) => hydraulicPhotoHandlers.applyPhotoCaption(...args),
    applyScbaPhotoCaption: (...args) => scbaPhotoHandlers.applyPhotoCaption(...args),
    cameraInputRef,
    handlePhotoSelect,
    removeErAuxPhoto: (...args) => erAuxPhotoHandlers.removePhoto(...args),
    removeFireExtinguisherPhoto: (...args) => fireExtinguisherPhotoHandlers.removePhoto(...args),
    removeFrtPhoto,
    removeHighAnglePhoto: (...args) => highAnglePhotoHandlers.removePhoto(...args),
    removeHydraulicPhoto: (...args) => hydraulicPhotoHandlers.removePhoto(...args),
    removePhoto,
    removeScbaPhoto: (...args) => scbaPhotoHandlers.removePhoto(...args),
    requestErAuxDefectPhotoUpload,
    requestErAuxPhotoUpload,
    requestFireExtinguisherDefectPhotoUpload,
    requestFireExtinguisherPhotoUpload,
    requestFrtIssuePhotoUpload,
    requestHighAngleIssuePhotoUpload,
    requestHydraulicDefectPhotoUpload,
    requestHydraulicPhotoUpload,
    requestInspectionIssuePhotoUpload,
    requestRootPhotoUpload,
    requestScbaIssuePhotoUpload,
    requestScbaPhotoUpload,
    updateErAuxPhotoDescription: (...args) => erAuxPhotoHandlers.updatePhotoDescription(...args),
    updateFireExtinguisherPhotoDescription: (...args) =>
      fireExtinguisherPhotoHandlers.updatePhotoDescription(...args),
    updateFrtPhotoDescription,
    updateHighAnglePhotoDescription: (...args) =>
      highAnglePhotoHandlers.updatePhotoDescription(...args),
    updateHydraulicPhotoDescription: (...args) =>
      hydraulicPhotoHandlers.updatePhotoDescription(...args),
    updatePhotoDescription,
    updateScbaPhotoDescription: (...args) => scbaPhotoHandlers.updatePhotoDescription(...args),
    uploadInputRef,
  }
}

export default useInspectionFormPhotos
