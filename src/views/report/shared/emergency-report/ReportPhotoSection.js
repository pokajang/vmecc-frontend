import React from 'react'
import { CAlert, CButton, CFormInput } from '@coreui/react'
import { Camera, Trash2 } from 'lucide-react'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import CreateActionButton from 'src/components/CreateActionButton'
import { ReportPhotoImage } from 'src/components/report-workflow/ReportViewComponents'
import {
  deleteReportMedia,
  getReportPhotoBytes,
  REPORT_PHOTO_MAX_COUNT,
  REPORT_PHOTO_MAX_TOTAL_BYTES,
  reportPhotoFailureMessage,
  uploadReportPhotosSequentially,
} from 'src/services/api/reportMediaApi'
import {
  clearPendingCameraOperation,
  getInterruptedCameraFallback,
  isLikelyEmbeddedBrowser,
  markPendingCameraOperation,
  markPendingCameraUploadStarted,
  subscribeToCameraReturn,
} from 'src/utils/cameraRecovery'
import { uid } from '../../utils'

const PHOTO_ACCEPT =
  '.jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif'

const ReportPhotoSection = ({
  moduleKey,
  photos = [],
  onChange,
  pushToast,
  onBeforeCameraOpen,
  onProcessingChange,
  title = 'Photographs',
  emptyMessage = 'No photos added. Photos are optional.',
  captureLabel = 'Capture photo',
  uploadLabel = 'Upload photo',
  descriptionMaxLength,
}) => {
  const cameraRef = React.useRef(null)
  const uploadRef = React.useRef(null)
  const abortRef = React.useRef(null)
  const operationRef = React.useRef(0)
  const [processing, setProcessing] = React.useState(false)
  const [progress, setProgress] = React.useState(null)
  const [fallback, setFallback] = React.useState(
    () => getInterruptedCameraFallback(moduleKey)?.message || '',
  )
  const [removeTarget, setRemoveTarget] = React.useState(null)

  const rows = Array.isArray(photos) ? photos : []
  const setProcessingState = React.useCallback(
    (next) => {
      setProcessing(next)
      onProcessingChange?.(next)
    },
    [onProcessingChange],
  )

  React.useEffect(
    () => () => {
      abortRef.current?.abort()
      onProcessingChange?.(false)
    },
    [onProcessingChange],
  )
  React.useEffect(
    () => subscribeToCameraReturn(moduleKey, (value) => setFallback(value?.message || '')),
    [moduleKey],
  )

  const upload = async (event, source) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (!files.length) return
    if (source === 'camera') markPendingCameraUploadStarted(moduleKey)
    const operation = ++operationRef.current
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setProcessingState(true)
    setFallback('')
    const remaining = Math.max(0, REPORT_PHOTO_MAX_COUNT - rows.length)
    if (!remaining) {
      pushToast?.(`Maximum ${REPORT_PHOTO_MAX_COUNT} photos are allowed.`, {
        title: 'Photo limit reached',
        color: 'warning',
      })
      setProcessingState(false)
      return
    }
    if (files.length > remaining) {
      pushToast?.(
        `Only ${remaining} more photo${remaining === 1 ? '' : 's'} can be added. Extra selections were ignored.`,
        { title: 'Photo limit', color: 'warning' },
      )
    }

    try {
      const failures = []
      const uploaded = await uploadReportPhotosSequentially({
        files: files.slice(0, remaining),
        module: moduleKey,
        source,
        signal: controller.signal,
        onFailure: (failure) => failures.push(failure),
        onProgress: (value) => setProgress({ ...value, retrying: false }),
        onRetry: (value) => setProgress({ ...value, percent: 0, retrying: true }),
      })
      if (operation !== operationRef.current) {
        await Promise.all(uploaded.map((photo) => deleteReportMedia(photo.mediaId)))
        return
      }
      let total = rows.reduce((sum, photo) => sum + getReportPhotoBytes(photo), 0)
      const accepted = []
      for (const photo of uploaded) {
        if (total + getReportPhotoBytes(photo) > REPORT_PHOTO_MAX_TOTAL_BYTES) {
          await deleteReportMedia(photo.mediaId)
          failures.push({ code: 'total_size_exceeded', fileName: photo.fileName })
          continue
        }
        total += getReportPhotoBytes(photo)
        accepted.push({ id: `photo-${uid()}`, ...photo, description: '' })
      }
      if (accepted.length) {
        onChange?.([...rows, ...accepted])
        clearPendingCameraOperation()
        pushToast?.(`${accepted.length} photo${accepted.length === 1 ? '' : 's'} added.`, {
          title: 'Photos updated',
          color: 'success',
        })
      }
      failures.forEach((failure) =>
        pushToast?.(
          failure.code === 'total_size_exceeded'
            ? 'The combined managed photo size exceeds the report limit.'
            : reportPhotoFailureMessage(failure.code, failure.fileName),
          { title: 'Upload warning', color: 'warning' },
        ),
      )
      if (source === 'camera' && failures.length) {
        setFallback(reportPhotoFailureMessage(failures[0].code, failures[0].fileName))
      }
    } catch (error) {
      if (error?.name !== 'AbortError' && source === 'camera') {
        setFallback(reportPhotoFailureMessage(error?.code))
      }
    } finally {
      if (operation === operationRef.current) {
        setProcessingState(false)
        setProgress(null)
      }
    }
  }

  const startCamera = () => {
    if (navigator.onLine === false) {
      setFallback('Connect to the internet before taking or uploading a photo.')
      return
    }
    if (isLikelyEmbeddedBrowser()) {
      setFallback('Open this page in Safari, Chrome, Edge, or Samsung Internet, or upload a photo.')
      return
    }
    markPendingCameraOperation({
      module: moduleKey,
      targetKind: 'reportPhotos',
      photosKey: 'photos',
    })
    try {
      Promise.resolve(onBeforeCameraOpen?.()).catch(() => {})
    } catch {
      // Saving is best-effort here; awaiting would lose the native picker user gesture.
    }
    cameraRef.current?.click()
  }

  const confirmRemove = () => {
    const target = removeTarget
    setRemoveTarget(null)
    if (!target) return
    onChange?.(rows.filter((photo) => String(photo?.id) !== String(target.id)))
    void deleteReportMedia(target.mediaId)
  }

  return (
    <section className="d-grid gap-2" aria-label={title}>
      <ActionConfirmModal
        visible={Boolean(removeTarget)}
        title="Remove photo"
        message="Remove this uploaded photo from the report?"
        confirmLabel="Remove"
        confirmColor="danger"
        onClose={() => setRemoveTarget(null)}
        onConfirm={confirmRemove}
      />
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div className="fw-semibold">{title}</div>
        <div className="d-flex gap-2">
          <CreateActionButton
            label={captureLabel}
            icon={<Camera size={13} className="me-1 align-text-bottom" />}
            onClick={startCamera}
            disabled={processing}
          />
          <CButton
            type="button"
            color="secondary"
            variant="outline"
            size="sm"
            disabled={processing}
            onClick={() => uploadRef.current?.click()}
          >
            {uploadLabel}
          </CButton>
        </div>
      </div>
      <CFormInput
        ref={cameraRef}
        type="file"
        aria-label={`Take ${moduleKey} report photo`}
        accept="image/*"
        capture="environment"
        className="d-none"
        disabled={processing}
        onChange={(event) => void upload(event, 'camera')}
      />
      <CFormInput
        ref={uploadRef}
        type="file"
        aria-label={`Upload ${moduleKey} report photos`}
        accept={PHOTO_ACCEPT}
        multiple
        className="d-none"
        disabled={processing}
        onChange={(event) => void upload(event, 'upload')}
      />
      {fallback ? (
        <CAlert color="warning" className="mb-0">
          {fallback}
          <CButton
            type="button"
            color="warning"
            size="sm"
            className="ms-2"
            onClick={() => uploadRef.current?.click()}
          >
            {uploadLabel}
          </CButton>
        </CAlert>
      ) : null}
      {processing ? (
        <div className="d-flex align-items-center gap-2">
          <div className="small text-body-secondary" role="status" aria-live="polite">
            {progress?.retrying ? 'Retrying photo upload' : 'Uploading photo'}{' '}
            {Number(progress?.index || 0) + 1}/{Number(progress?.count || 1)} -{' '}
            {Number(progress?.percent || 0)}%
          </div>
          <CButton
            type="button"
            color="secondary"
            variant="outline"
            size="sm"
            onClick={() => {
              operationRef.current += 1
              abortRef.current?.abort()
              setProgress(null)
              setProcessingState(false)
              clearPendingCameraOperation()
            }}
          >
            Cancel upload
          </CButton>
        </div>
      ) : null}
      {rows.length ? (
        <div className="row g-3">
          {rows.map((photo, index) => (
            <div key={photo.id || `${photo.fileName}-${index}`} className="col-12 col-md-6">
              <div className="rounded-3 border p-2 d-grid gap-2 h-100">
                <ReportPhotoImage
                  photo={photo}
                  alt={photo.description || photo.fileName || `Report photo ${index + 1}`}
                  style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: 4 }}
                />
                <CFormInput
                  size="sm"
                  maxLength={descriptionMaxLength}
                  aria-label={`Description for ${photo.fileName || `photo ${index + 1}`}`}
                  value={String(photo.description || '')}
                  placeholder="Describe this photo (optional)"
                  onChange={(event) =>
                    onChange?.(
                      rows.map((row) =>
                        String(row?.id) === String(photo.id)
                          ? { ...row, description: event.target.value }
                          : row,
                      ),
                    )
                  }
                />
                <CButton
                  type="button"
                  color="danger"
                  variant="outline"
                  size="sm"
                  onClick={() => setRemoveTarget(photo)}
                >
                  <Trash2 size={14} className="me-1" /> Remove
                </CButton>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3 border bg-light-subtle p-3 text-body-secondary">
          {emptyMessage}
        </div>
      )}
    </section>
  )
}

export default ReportPhotoSection
