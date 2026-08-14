import React from 'react'
import {
  CBadge,
  CButton,
  CContainer,
  COffcanvas,
  COffcanvasBody,
  COffcanvasHeader,
  COffcanvasTitle,
} from '@coreui/react'
import { X } from 'lucide-react'
import InlineFeedbackMessage from 'src/components/InlineFeedbackMessage'
import ModuleNavTabs from 'src/components/ModuleNavTabs'
import ModulePageHeader from 'src/components/ModulePageHeader'
import TableLoader from 'src/components/TableLoader'
import { statusToneMap } from './inspectionModuleUtils'
import InspectionMobileHome from './InspectionMobileHome'
import InspectionModuleModalStack from './InspectionModuleModalStack'
import {
  AllExtinguishersView,
  InspectionDetailView,
  InspectionFormView,
  InspectionRecordsView,
  InspectionReviewView,
} from './InspectionModuleSections'
import InspectionModuleHeaderActions from './InspectionModuleHeaderActions'

export const buildInspectionPageTitle = ({
  activeSection,
  isUpdatingExistingRecord = false,
  recordsSectionActive,
  showMobileRecords,
}) => {
  let mobileTitle

  if (activeSection === 'review') {
    mobileTitle = isUpdatingExistingRecord ? 'Review Updates' : 'Review Inspection'
  } else if (activeSection === 'extinguishers') {
    mobileTitle = 'All Extinguishers'
  } else if (activeSection === 'records' && !showMobileRecords) {
    mobileTitle = 'Conduct Inspection'
  } else if (recordsSectionActive) {
    mobileTitle = 'Inspection Records'
  } else {
    mobileTitle = isUpdatingExistingRecord ? 'Edit Inspection' : 'Conduct Inspection'
  }

  return (
    <>
      <span className="d-md-none">{mobileTitle}</span>
      <span className="d-none d-md-inline">Inspection</span>
    </>
  )
}

export const buildInspectionHeaderActions = ({
  canConduct = true,
  isCreateSection,
  onMobileBack,
  onStartNew,
  showMobileBackAction,
}) => (
  <InspectionModuleHeaderActions
    showMobileBackAction={showMobileBackAction}
    onMobileBack={onMobileBack}
    isCreateSection={isCreateSection}
    onStartNew={onStartNew}
    canConduct={canConduct}
  />
)

export const renderInspectionStatusBadge = (status) => {
  const label = String(status || 'Unknown').trim() || 'Unknown'
  const tone = statusToneMap[label.toLowerCase()] || 'secondary'
  return <CBadge color={tone}>{label}</CBadge>
}

const InspectionModuleLayout = ({
  activeSection,
  formViewProps,
  headerActions,
  isDeleting,
  isSubmitting,
  modalProps,
  pageTitle,
  recordsSectionActive,
  recordsViewProps,
  reviewViewProps,
  detailViewProps,
  runGuardedAction,
  startNew,
  clearContinuationState,
  navigate,
  reportBasePath,
  recordsReturnPath,
  feedback,
  canConduct = true,
  showExtinguisherCatalog = true,
}) => {
  return (
    <CContainer fluid className="inspection-module-page" data-testid="inspection-module">
      <ModulePageHeader title={pageTitle} actions={headerActions} />
      {activeSection !== 'detail' ? (
        <InlineFeedbackMessage feedback={feedback} className="mb-3" />
      ) : null}
      {(isDeleting || isSubmitting) && (
        <div
          className="inspection-loading-overlay"
          role="status"
          aria-live="polite"
          aria-label={
            isSubmitting ? 'Submitting inspection report' : 'Processing inspection action'
          }
        >
          <div className="inspection-loading-overlay__panel">
            <TableLoader message={isSubmitting ? 'Submitting report...' : 'Please wait...'} />
          </div>
        </div>
      )}

      <InspectionModuleModalStack {...modalProps} />

      <ModuleNavTabs
        className="d-none d-md-flex"
        items={[
          {
            key: 'records',
            label: 'Records',
            active: recordsSectionActive,
            onClick: () =>
              runGuardedAction(() => {
                clearContinuationState()
                navigate(reportBasePath)
              }),
          },
          ...(showExtinguisherCatalog
            ? [
                {
                  key: 'all-extinguishers',
                  label: 'All Extinguishers',
                  active: activeSection === 'extinguishers',
                  onClick: () =>
                    runGuardedAction(() => {
                      clearContinuationState()
                      navigate(`${reportBasePath}/all-extinguishers`)
                    }),
                },
              ]
            : []),
          ...(canConduct
            ? [
                {
                  key: 'new',
                  label: 'Conduct Inspection',
                  active: activeSection === 'form' || activeSection === 'review',
                  onClick: () => runGuardedAction(startNew),
                  dataTestId: 'inspection-new',
                },
              ]
            : []),
        ]}
      />

      {activeSection === 'records' ? (
        <InspectionRecordsView InspectionMobileHome={InspectionMobileHome} {...recordsViewProps} />
      ) : null}

      {activeSection === 'extinguishers' && showExtinguisherCatalog ? (
        <AllExtinguishersView />
      ) : null}

      {activeSection === 'detail' ? (
        <COffcanvas
          visible
          placement="end"
          onHide={() => navigate(recordsReturnPath || reportBasePath)}
          className="inspection-detail-drawer"
          backdrop
          scroll
        >
          <COffcanvasHeader className="inspection-detail-drawer__header">
            <COffcanvasTitle>Inspection Details</COffcanvasTitle>
            <CButton
              type="button"
              color="link"
              className="inspection-detail-drawer__close ms-auto p-1 text-body-secondary"
              aria-label="Close inspection details"
              onClick={() => navigate(recordsReturnPath || reportBasePath)}
            >
              <X size={18} />
            </CButton>
          </COffcanvasHeader>
          {feedback?.message ? (
            <div className="inspection-detail-drawer__feedback">
              <InlineFeedbackMessage feedback={feedback} />
            </div>
          ) : null}
          <COffcanvasBody className="inspection-detail-drawer__body">
            <InspectionDetailView {...detailViewProps} />
          </COffcanvasBody>
        </COffcanvas>
      ) : null}

      {activeSection === 'review' ? <InspectionReviewView {...reviewViewProps} /> : null}

      {activeSection === 'form' ? <InspectionFormView {...formViewProps} /> : null}
    </CContainer>
  )
}

export default InspectionModuleLayout
