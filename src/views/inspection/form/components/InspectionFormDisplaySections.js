import React, { useMemo, useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CFormLabel,
  CModal,
  CModalBody,
  CModalHeader,
  CModalTitle,
  CFormTextarea,
} from '@coreui/react'
import { Camera, MessageSquare, Pencil, Trash2, Upload } from 'lucide-react'
import CreateActionButton from 'src/components/CreateActionButton'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import RowActions from 'src/components/RowActions'
import useMediaQuery from 'src/hooks/useMediaQuery'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import { dedupePhotos } from 'src/views/inspection/inspectionSharedUtils'
import {
  ACTIVE_CARD_STYLE,
  resolveTypeIcon,
  stripInspectionContext,
} from 'src/views/inspection/typeOptionUtils'
import { getInspectionLocationDefaults } from 'src/views/inspection/inspectionLocationDefaults'
import {
  ChipButton,
  ChipRow,
  FormFieldError,
  EvidenceBlock,
  InspectionPhotoActionRow,
  InspectionPhotoEvidenceSummary,
  InspectionPhotoViewerModal,
  ManagedCheckToolbar,
  PhotoGallery,
  isCompactInspectionViewport,
  rowContainsSearch,
} from './InspectionDisplayShared'
import { FrtDailyInspectionChecks } from 'src/views/inspection/types/frt-daily/frtDailyInspectionChecks'
import { HighAngleInspectionChecks } from './HighAngleInspectionChecks'
import { HydraulicEquipmentChecks } from './HydraulicEquipmentChecks'
import { ErAuxEquipmentChecks } from './ErAuxInspectionChecks'
import { ScbaInspectionChecks } from './ScbaInspectionChecks'
export {
  ChipButton,
  ChipRow,
  EvidenceBlock,
  ErAuxEquipmentChecks,
  FormFieldError,
  FrtDailyInspectionChecks,
  HighAngleInspectionChecks,
  HydraulicEquipmentChecks,
  InspectionPhotoEvidenceSummary,
  InspectionPhotoActionRow,
  InspectionPhotoViewerModal,
  ManagedCheckToolbar,
  PhotoGallery,
  ScbaInspectionChecks,
}

const FALLBACK_INSPECTION_TYPE_ICON = resolveTypeIcon('ShieldAlert')

const getPhotoSignature = (items = []) =>
  JSON.stringify(
    (Array.isArray(items) ? items : []).map((photo) => ({
      id: String(photo?.id || ''),
      fileName: String(photo?.fileName || ''),
      url: String(photo?.url || ''),
      description: String(photo?.description || ''),
    })),
  )

const clonePhotoList = (items = []) =>
  dedupePhotos(items).map((photo) => ({
    ...photo,
  }))

export const formatInspectionDisplayLocationTitle = (inspectionType, value, parentValue = '') => {
  const rawValue = String(value || '').trim()
  if (!rawValue) return ''

  const mainOptions = getInspectionLocationDefaults(inspectionType)
  if (!parentValue) {
    const mainOption = mainOptions.find(
      (option) =>
        String(option?.value || '')
          .trim()
          .toLowerCase() === rawValue.toLowerCase(),
    )
    return String(mainOption?.title || rawValue).trim()
  }

  const parentOption = mainOptions.find(
    (option) =>
      String(option?.value || '')
        .trim()
        .toLowerCase() ===
      String(parentValue || '')
        .trim()
        .toLowerCase(),
  )
  const subOption = (parentOption?.subLocations || []).find(
    (option) =>
      String(option?.value || '')
        .trim()
        .toLowerCase() === rawValue.toLowerCase(),
  )
  return String(subOption?.title || rawValue).trim()
}

export const InspectionSelectedTypeCard = ({
  inspectionType,
  icon: ProvidedIcon = null,
  onEdit,
}) => {
  const Icon = ProvidedIcon || FALLBACK_INSPECTION_TYPE_ICON
  const label = stripInspectionContext(inspectionType)

  if (!String(inspectionType || '').trim()) return null

  return (
    <div
      className="rounded-3 border border-primary bg-primary bg-opacity-10 p-3"
      style={ACTIVE_CARD_STYLE}
    >
      <div
        className="d-flex align-items-center justify-content-between gap-2 gap-md-3"
        style={{ minWidth: 0 }}
      >
        <div
          className="d-flex align-items-center gap-2 gap-md-3 flex-grow-1"
          style={{ minWidth: 0 }}
        >
          {Icon ? (
            <div
              data-testid="selected-inspection-type-icon"
              className="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center"
              style={{
                width: 40,
                height: 40,
                flex: '0 0 40px',
                lineHeight: 0,
              }}
            >
              <Icon size={18} />
            </div>
          ) : null}
          <div className="fw-semibold text-break" style={{ minWidth: 0 }}>
            {label}
          </div>
        </div>
        {typeof onEdit === 'function' ? (
          <CButton
            type="button"
            color="primary"
            variant="ghost"
            size="sm"
            className="d-md-none p-2 border-0 shadow-none"
            aria-label="Edit type"
            onClick={onEdit}
          >
            <Pencil size={16} />
          </CButton>
        ) : null}
      </div>
    </div>
  )
}

const ReadOnlyLocationCard = ({ label }) => (
  <div
    className="rounded-3 border border-primary bg-primary bg-opacity-10 p-3"
    style={ACTIVE_CARD_STYLE}
  >
    <div className="fw-semibold text-break">{label}</div>
  </div>
)

export const InspectionReadOnlyLocationSections = ({
  inspectionType,
  mainLocation,
  subLocation,
}) => {
  const mainLabel = formatInspectionDisplayLocationTitle(inspectionType, mainLocation)
  const subLabel = formatInspectionDisplayLocationTitle(inspectionType, subLocation, mainLocation)

  if (!mainLabel) return null

  return (
    <>
      <div className="inspection-form-section d-grid gap-3">
        <div className="fw-semibold text-muted">Choose Main Location</div>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <ReadOnlyLocationCard label={mainLabel} />
          </div>
        </div>
      </div>

      {subLabel ? (
        <div className="inspection-form-section d-grid gap-3">
          <div className="d-flex flex-wrap align-items-baseline gap-2">
            <div className="fw-semibold text-muted">Choose Sub-location</div>
            <div className="small text-body-secondary">(optional under {mainLabel})</div>
          </div>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <ReadOnlyLocationCard label={subLabel} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export const InspectionGeneralEvidenceCard = ({
  title,
  photos,
  remarks = '',
  readOnly = false,
  fieldError = false,
  compactOnMobile = false,
  unframed = false,
  presentation = 'card',
  showTitle = true,
  stageDrawerPhotos = false,
  uploadsPending = false,
  drawerDescription = '',
  drawerDoneMessage = '',
  emptyMessage = 'No photos yet. Upload photos to continue.',
  compactActionLabel = 'Add photos (optional)',
  compactPopulatedActionLabel = compactActionLabel,
  remarksLabel = '',
  remarksPlaceholder = '',
  onTakePhoto,
  onUploadPhoto,
  onRemovePhoto,
  onChangePhotoDescription,
  onChangeRemarks,
  onSavePhotos,
  cardRef,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [draftPhotos, setDraftPhotos] = useState(() => (Array.isArray(photos) ? photos : []))
  const [drawerBaselinePhotos, setDrawerBaselinePhotos] = useState(() =>
    clonePhotoList(Array.isArray(photos) ? photos : []),
  )
  const [confirmCloseDraftPhotos, setConfirmCloseDraftPhotos] = useState(false)
  const useMobileDrawer = useMediaQuery('(max-width: 575.98px)')
  const savedPhotos = useMemo(() => (Array.isArray(photos) ? photos : []), [photos])
  const photoCount = savedPhotos.length
  const draftPhotoCount = draftPhotos.length
  const remarksText = String(remarks || '')
  const hasRemarks = remarksText.trim() !== ''
  const showRemarks = Boolean(remarksLabel && (readOnly ? hasRemarks : true))
  const showCompactMobile = compactOnMobile && useMobileDrawer && !readOnly
  const useStagedDrawer = showCompactMobile && stageDrawerPhotos
  const drawerPhotoCount = useStagedDrawer ? draftPhotoCount : photoCount
  const savedPhotoSignature = getPhotoSignature(savedPhotos)
  const draftPhotoSignature = getPhotoSignature(draftPhotos)
  const hasDraftChanges = draftPhotoSignature !== savedPhotoSignature
  const showDrawerFooter = useStagedDrawer
    ? uploadsPending || hasDraftChanges || photoCount > 0 || draftPhotoCount > 0
    : drawerPhotoCount > 0
  const drawerFooterStatus = useStagedDrawer
    ? uploadsPending
      ? 'Photos are still uploading'
      : hasDraftChanges
        ? draftPhotoCount > 0
          ? `${draftPhotoCount} ${draftPhotoCount === 1 ? 'photo' : 'photos'} ready to save`
          : 'Photo removal ready to save'
        : `${photoCount} ${photoCount === 1 ? 'photo' : 'photos'} attached to this report`
    : `${drawerPhotoCount} ${drawerPhotoCount === 1 ? 'photo' : 'photos'} attached`
  const resolvedPresentation = unframed ? 'inline' : presentation

  const addDraftPhotos = (nextPhotos = []) => {
    const additions = Array.isArray(nextPhotos) ? nextPhotos.filter(Boolean) : []
    if (additions.length === 0) return
    setDraftPhotos((currentPhotos) => dedupePhotos([...currentPhotos, ...additions]))
  }

  const removeDraftPhoto = (photoId) => {
    setDraftPhotos((currentPhotos) =>
      currentPhotos.filter((photo) => String(photo?.id || '') !== String(photoId || '')),
    )
  }

  const updateDraftPhotoDescription = (photoId, description) => {
    setDraftPhotos((currentPhotos) =>
      currentPhotos.map((photo) =>
        String(photo?.id || '') === String(photoId || '') ? { ...photo, description } : photo,
      ),
    )
  }

  const getDraftUploadOptions = () => ({
    rootPhotos: draftPhotos,
    onAddPhotos: addDraftPhotos,
  })

  const openStagedDrawer = () => {
    const baselinePhotos = clonePhotoList(savedPhotos)
    setDrawerBaselinePhotos(baselinePhotos)
    setDraftPhotos(baselinePhotos)
    setDrawerOpen(true)
  }

  const discardDraftPhotoChanges = () => {
    setDraftPhotos(clonePhotoList(drawerBaselinePhotos))
    setDrawerOpen(false)
  }

  const handleDrawerClose = () => {
    if (useStagedDrawer && uploadsPending) return
    if (useStagedDrawer && hasDraftChanges) {
      setConfirmCloseDraftPhotos(true)
      return
    }

    discardDraftPhotoChanges()
  }

  const handleResetDraftPhotos = () => {
    if (uploadsPending) return
    setDraftPhotos(clonePhotoList(drawerBaselinePhotos))
  }

  const handleSaveDraftPhotos = () => {
    if (uploadsPending) return
    if (typeof onSavePhotos === 'function') onSavePhotos(draftPhotos)
    setConfirmCloseDraftPhotos(false)
    setDrawerOpen(false)
  }

  const actions = (
    <div className="d-flex align-items-center gap-2">
      <CreateActionButton
        label={<span className="d-none d-sm-inline">Take photo</span>}
        ariaLabel="Take photo"
        icon={<Camera size={13} className="me-0 me-sm-1 align-text-bottom" />}
        importance="section-primary"
        className="inspection-take-photo-btn px-2 px-sm-2"
        onClick={onTakePhoto}
      />
      <CreateActionButton
        label={<span className="d-none d-sm-inline">Upload photo</span>}
        ariaLabel="Upload photo"
        icon={<Upload size={13} className="me-0 me-sm-1 align-text-bottom" />}
        className="px-2 px-sm-2"
        onClick={onUploadPhoto}
      />
    </div>
  )

  const drawerActions = (
    <div className="inspection-general-evidence-drawer-actions d-flex flex-wrap align-items-center gap-2">
      <CButton
        type="button"
        color="primary"
        size="sm"
        className="inspection-general-evidence-drawer-action d-inline-flex align-items-center justify-content-center gap-1"
        disabled={uploadsPending}
        onClick={() => (useStagedDrawer ? onTakePhoto?.(getDraftUploadOptions()) : onTakePhoto?.())}
      >
        <Camera size={14} aria-hidden="true" />
        Take photo
      </CButton>
      <CButton
        type="button"
        color="secondary"
        variant="outline"
        size="sm"
        className="inspection-general-evidence-drawer-action d-inline-flex align-items-center justify-content-center gap-1"
        disabled={uploadsPending}
        onClick={() =>
          useStagedDrawer ? onUploadPhoto?.(getDraftUploadOptions()) : onUploadPhoto?.()
        }
      >
        <Upload size={14} aria-hidden="true" />
        Upload photo
      </CButton>
    </div>
  )

  const gallery = (
    <>
      <PhotoGallery
        photos={photos}
        readOnly={readOnly}
        presentation={showCompactMobile ? 'drawer-editor' : 'default'}
        onRemove={onRemovePhoto}
        onChangeDescription={onChangePhotoDescription}
        emptyMessage={emptyMessage}
      />
      <FormFieldError>{fieldError ? 'Upload at least one inspection photo.' : ''}</FormFieldError>
    </>
  )

  const remarksField = showRemarks ? (
    readOnly ? (
      <div className="inspection-report-remarks-readonly small">
        <div className="fw-semibold text-body-secondary">{remarksLabel}</div>
        <div style={{ whiteSpace: 'pre-wrap' }}>{remarksText}</div>
      </div>
    ) : (
      <div className="d-grid gap-1">
        <CFormLabel className="small fw-semibold text-muted mb-0">{remarksLabel}</CFormLabel>
        <CFormTextarea
          rows={3}
          value={remarksText}
          placeholder={remarksPlaceholder}
          aria-label={remarksLabel}
          maxLength={2000}
          onChange={(event) => onChangeRemarks?.(event.target.value)}
        />
      </div>
    )
  ) : null

  if (showCompactMobile) {
    return (
      <div ref={cardRef} className="inspection-general-evidence-mobile-compact d-grid gap-2">
        <CreateActionButton
          label={`${
            photoCount ? compactPopulatedActionLabel : compactActionLabel
          }${photoCount ? ` (${photoCount})` : ''}`}
          className="inspection-compact-action-btn justify-self-start"
          onClick={() => {
            if (useStagedDrawer) {
              openStagedDrawer()
              return
            }
            setDrawerOpen(true)
          }}
        />
        <FormFieldError>{fieldError ? 'Upload at least one inspection photo.' : ''}</FormFieldError>
        <MobileBottomDrawer
          visible={drawerOpen}
          title={title}
          closeDisabled={useStagedDrawer && uploadsPending}
          onClose={useStagedDrawer ? handleDrawerClose : () => setDrawerOpen(false)}
        >
          <div className="inspection-general-evidence-drawer-body d-grid gap-3">
            {drawerActions}
            {drawerDescription ? (
              <div className="small text-body-secondary">{drawerDescription}</div>
            ) : null}
            {remarksField}
            {useStagedDrawer ? (
              <>
                <PhotoGallery
                  photos={draftPhotos}
                  readOnly={readOnly}
                  presentation="drawer-editor"
                  fullWidth
                  onRemove={removeDraftPhoto}
                  onChangeDescription={updateDraftPhotoDescription}
                  emptyMessage={emptyMessage}
                />
                <FormFieldError>
                  {fieldError ? 'Upload at least one inspection photo.' : ''}
                </FormFieldError>
              </>
            ) : (
              <div className="inspection-general-evidence-drawer-gallery">{gallery}</div>
            )}
          </div>
          {showDrawerFooter ? (
            <div className="inspection-general-evidence-drawer-footer mobile-bottom-drawer__footer">
              <div
                className="inspection-general-evidence-drawer-footer__status"
                role="status"
                aria-live="polite"
              >
                <div className="small fw-semibold">{drawerFooterStatus}</div>
                {useStagedDrawer && uploadsPending ? (
                  <div className="small text-warning-emphasis mt-1">
                    Keep this drawer open. Retry or remove any failed upload before saving.
                  </div>
                ) : null}
                {!useStagedDrawer && drawerDoneMessage ? (
                  <div className="small text-body-secondary mt-1">{drawerDoneMessage}</div>
                ) : null}
              </div>
              <div className="inspection-general-evidence-drawer-footer__actions d-flex gap-2">
                {useStagedDrawer ? (
                  <>
                    <CButton
                      type="button"
                      color="secondary"
                      variant="outline"
                      size="sm"
                      disabled={uploadsPending || !hasDraftChanges}
                      onClick={handleResetDraftPhotos}
                    >
                      Reset
                    </CButton>
                    <CButton
                      type="button"
                      color="primary"
                      size="sm"
                      disabled={
                        uploadsPending || !hasDraftChanges || typeof onSavePhotos !== 'function'
                      }
                      onClick={handleSaveDraftPhotos}
                    >
                      Save photos
                    </CButton>
                  </>
                ) : (
                  <CButton
                    type="button"
                    color="primary"
                    size="sm"
                    className="inspection-general-evidence-drawer-done"
                    aria-label={`Done with ${title}`}
                    onClick={() => setDrawerOpen(false)}
                  >
                    Done
                  </CButton>
                )}
              </div>
            </div>
          ) : null}
        </MobileBottomDrawer>
        {useStagedDrawer ? (
          <ActionConfirmModal
            visible={confirmCloseDraftPhotos}
            title="Save photos first?"
            message="You have photo changes ready to save. Save them before closing, or discard the changes."
            confirmLabel="Discard changes"
            confirmColor="danger"
            cancelLabel="Keep editing"
            mobileDrawer
            onClose={() => setConfirmCloseDraftPhotos(false)}
            onConfirm={() => {
              setConfirmCloseDraftPhotos(false)
              discardDraftPhotoChanges()
            }}
          />
        ) : null}
      </div>
    )
  }

  if (resolvedPresentation !== 'card') {
    return (
      <div
        ref={cardRef}
        className={`inspection-general-evidence-section inspection-evidence--${
          resolvedPresentation === 'inset' ? 'inset' : 'inline'
        } d-grid gap-3`}
      >
        <div
          className={`flex-wrap justify-content-between align-items-center gap-2 ${
            showTitle || !readOnly ? 'd-flex' : 'd-none'
          }`}
        >
          {showTitle ? <div className="fw-semibold">{title}</div> : null}
          {!readOnly ? actions : null}
        </div>
        <div className="d-grid gap-3">
          {drawerDescription && !readOnly ? (
            <div className="small text-body-secondary">{drawerDescription}</div>
          ) : null}
          {remarksField}
          {gallery}
        </div>
      </div>
    )
  }

  return (
    <CCard className="inspection-general-evidence-card" ref={cardRef}>
      <CCardHeader className="inspection-general-evidence-card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
        {showTitle ? <div className="fw-semibold">{title}</div> : null}
        {!readOnly ? actions : null}
      </CCardHeader>
      <CCardBody className="inspection-general-evidence-card-body d-grid gap-3">
        {drawerDescription && !readOnly ? (
          <div className="small text-body-secondary">{drawerDescription}</div>
        ) : null}
        {remarksField}
        {gallery}
      </CCardBody>
    </CCard>
  )
}
