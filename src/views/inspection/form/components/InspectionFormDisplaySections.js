import React, { useEffect, useState } from 'react'
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
  InspectionPhotoViewerModal,
  ManagedCheckToolbar,
  PhotoGallery,
  ScbaInspectionChecks,
}

const FALLBACK_INSPECTION_TYPE_ICON = resolveTypeIcon('ShieldAlert')

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
  readOnly = false,
  fieldError = false,
  compactOnMobile = false,
  drawerDescription = '',
  emptyMessage = 'No photos yet. Upload photos to continue.',
  compactActionLabel = 'Add photos (optional)',
  onTakePhoto,
  onUploadPhoto,
  onRemovePhoto,
  onChangePhotoDescription,
  cardRef,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const useMobileDrawer = useMediaQuery('(max-width: 575.98px)')
  const photoCount = Array.isArray(photos) ? photos.length : 0
  const showCompactMobile = compactOnMobile && useMobileDrawer && !readOnly

  const actions = (
    <div className="d-flex align-items-center gap-2">
      <CreateActionButton
        label={<span className="d-none d-sm-inline">Take photo</span>}
        ariaLabel="Take photo"
        icon={<Camera size={13} className="me-0 me-sm-1 align-text-bottom" />}
        importance="primary"
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
        onClick={onTakePhoto}
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
        onClick={onUploadPhoto}
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
        onRemove={onRemovePhoto}
        onChangeDescription={onChangePhotoDescription}
        emptyMessage={emptyMessage}
      />
      <FormFieldError>{fieldError ? 'Upload at least one inspection photo.' : ''}</FormFieldError>
    </>
  )

  if (showCompactMobile) {
    return (
      <div ref={cardRef} className="inspection-general-evidence-mobile-compact d-grid gap-2">
        <CreateActionButton
          label={`${compactActionLabel}${photoCount ? ` (${photoCount})` : ''}`}
          className="inspection-compact-action-btn justify-self-start"
          onClick={() => setDrawerOpen(true)}
        />
        <FormFieldError>{fieldError ? 'Upload at least one inspection photo.' : ''}</FormFieldError>
        <MobileBottomDrawer visible={drawerOpen} title={title} onClose={() => setDrawerOpen(false)}>
          <div className="inspection-general-evidence-drawer-body d-grid gap-3">
            {drawerActions}
            {drawerDescription ? (
              <div className="small text-body-secondary">{drawerDescription}</div>
            ) : null}
            {gallery}
          </div>
        </MobileBottomDrawer>
      </div>
    )
  }

  return (
    <CCard className="inspection-general-evidence-card" ref={cardRef}>
      <CCardHeader className="inspection-general-evidence-card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div className="fw-semibold">{title}</div>
        {!readOnly ? actions : null}
      </CCardHeader>
      <CCardBody className="inspection-general-evidence-card-body d-grid gap-3">
        {gallery}
      </CCardBody>
    </CCard>
  )
}
