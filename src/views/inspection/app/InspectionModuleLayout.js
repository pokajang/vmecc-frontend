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
  if (activeSection === 'review') {
    return isUpdatingExistingRecord ? 'Review Updates' : 'Review Inspection'
  }
  if (activeSection === 'extinguishers') return 'All Extinguishers'

  if (activeSection === 'records' && !showMobileRecords) {
    return (
      <>
        <span className="d-md-none">Conduct Inspection</span>
        <span className="d-none d-md-inline">Inspection Records</span>
      </>
    )
  }

  if (recordsSectionActive) return 'Inspection Records'
  return isUpdatingExistingRecord ? 'Edit Inspection' : 'Conduct Inspection'
}

export const buildInspectionHeaderActions = ({
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
  feedback,
}) => {
  return (
    <CContainer fluid className="inspection-module-page" data-testid="inspection-module">
      <ModulePageHeader title={pageTitle} actions={headerActions} />
      <InlineFeedbackMessage feedback={feedback} className="mb-3" />
      {(isDeleting || isSubmitting) && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.18)',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: '28px 36px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
            }}
          >
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
          {
            key: 'new',
            label: 'New',
            active: activeSection === 'form' || activeSection === 'review',
            onClick: () => runGuardedAction(startNew),
            dataTestId: 'inspection-new',
          },
        ]}
      />

      {activeSection === 'records' ? (
        <InspectionRecordsView InspectionMobileHome={InspectionMobileHome} {...recordsViewProps} />
      ) : null}

      {activeSection === 'extinguishers' ? <AllExtinguishersView /> : null}

      {activeSection === 'detail' ? (
        <COffcanvas
          visible
          placement="end"
          onHide={() => navigate(reportBasePath)}
          className="inspection-detail-drawer"
          backdrop
          scroll
        >
          <COffcanvasHeader className="inspection-detail-drawer__header">
            <COffcanvasTitle>Inspection Details</COffcanvasTitle>
            <CButton
              type="button"
              color="link"
              className="inspection-detail-drawer__close p-1 text-body-secondary"
              aria-label="Close inspection details"
              onClick={() => navigate(reportBasePath)}
            >
              <X size={18} />
            </CButton>
          </COffcanvasHeader>
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
