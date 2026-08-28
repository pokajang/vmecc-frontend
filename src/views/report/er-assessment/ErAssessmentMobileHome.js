import React, { useEffect, useMemo, useState } from 'react'
import { ClipboardCheck, Flame, Gauge, HardHat, Truck, Zap } from 'lucide-react'
import {
  CButton,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import CreateActionButton from 'src/components/CreateActionButton'
import {
  MobileRecentRecordsSection,
  MobileTypeSelectionSection,
  MobileWorkflowDraftCard,
} from 'src/components/report-workflow/mobile-home'
import { createErAssessmentType, fetchErAssessmentTemplate } from '../reportApi'
import { formatMobileReportDate } from '../reportUiUtils'
import { ER_ASSESSMENT_TYPES, normalizeErAssessmentTemplate } from './constants'

const ER_ASSESSMENT_TYPE_ICONS = Object.freeze({
  'working-at-height': HardHat,
  'confined-space': Gauge,
  'hot-work': Flame,
  'lifting-operations': Truck,
  'electrical-work': Zap,
})

const typeIcon = (value) => ER_ASSESSMENT_TYPE_ICONS[value] || ClipboardCheck

const ErAssessmentMobileHome = ({
  draftRows = [],
  recentRecords = [],
  recordsCount = 0,
  recordScope,
  onRecordScopeChange,
  isRecordsLoading = false,
  onSelectType,
  onContinueDraft,
  onDeleteDraft,
  onOpenRecord,
  onViewRecords,
}) => {
  const draftRow = draftRows[0] || null
  const [assessmentTypes, setAssessmentTypes] = useState(ER_ASSESSMENT_TYPES)
  const [showAddType, setShowAddType] = useState(false)
  const [typeName, setTypeName] = useState('')
  const [requirements, setRequirements] = useState('')
  const [worstCaseScenario, setWorstCaseScenario] = useState('')
  const [addError, setAddError] = useState('')
  const [isSavingType, setIsSavingType] = useState(false)

  const refreshAssessmentTypes = async () => {
    const template = await fetchErAssessmentTemplate()
    if (template) setAssessmentTypes(normalizeErAssessmentTemplate(template))
  }

  useEffect(() => {
    void refreshAssessmentTypes().catch(() => {})
  }, [])

  const typeOptions = useMemo(
    () =>
      assessmentTypes.map(({ value, label }) => ({
        value,
        title: label,
        icon: typeIcon(value),
      })),
    [assessmentTypes],
  )

  const openAddType = () => {
    setTypeName('')
    setRequirements('')
    setWorstCaseScenario('')
    setAddError('')
    setShowAddType(true)
  }

  const saveType = async () => {
    const parsedRequirements = requirements
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean)
    if (!typeName.trim()) {
      setAddError('Type name is required.')
      return
    }
    if (!parsedRequirements.length) {
      setAddError('Add at least one assessment requirement.')
      return
    }

    setIsSavingType(true)
    setAddError('')
    try {
      const created = await createErAssessmentType({
        label: typeName.trim(),
        worstCaseScenario: worstCaseScenario.trim(),
        requirements: parsedRequirements,
        iconKey: 'ClipboardCheck',
      })
      if (!created) throw new Error('Unable to add the assessment type.')
      const [nextType] = normalizeErAssessmentTemplate({ assessmentTypes: [created] })
      if (nextType) {
        setAssessmentTypes((current) => [...current, nextType])
      } else {
        await refreshAssessmentTypes()
      }
      setShowAddType(false)
      onSelectType?.(nextType?.value || created.id)
    } catch (error) {
      setAddError(error?.message || 'Unable to add the assessment type. Please try again.')
    } finally {
      setIsSavingType(false)
    }
  }
  const recentRecordItems = recentRecords.slice(0, 3).map((row) => ({
    key: row.recordKey || row.id,
    layout: 'compact',
    title: row.assessmentTypeLabel || row.incidentType || 'ER Assessment',
    subtitle: row.location || 'Location unavailable',
    status: (
      <>
        <div className="small fw-semibold text-nowrap">{row.status || '--'}</div>
        <div className="small text-body-secondary text-nowrap">{formatMobileReportDate(row)}</div>
      </>
    ),
    ariaLabel: `Open ${row.assessmentTypeLabel || row.incidentType || 'ER Assessment'} record`,
    onOpen: () => onOpenRecord?.(row),
  }))

  return (
    <div
      className="mobile-workflow-home d-md-none d-grid gap-3 mb-3"
      data-testid="er-assessment-report-mobile-home"
    >
      <MobileTypeSelectionSection
        title="Choose type"
        data-testid="er-assessment-report-mobile-type-selection"
        headerAction={
          <CreateActionButton
            label="Add type"
            className="mobile-workflow-home__compact-action"
            onClick={openAddType}
          />
        }
        options={typeOptions}
        onChange={(value) => value && onSelectType?.(value)}
      />

      <CModal
        alignment="center"
        visible={showAddType}
        onClose={() => !isSavingType && setShowAddType(false)}
      >
        <CModalHeader>
          <CModalTitle>Add ER Assessment type</CModalTitle>
        </CModalHeader>
        <CModalBody className="d-grid gap-3">
          <div>
            <CFormLabel htmlFor="er-assessment-type-name">Type name</CFormLabel>
            <CFormInput
              id="er-assessment-type-name"
              value={typeName}
              disabled={isSavingType}
              onChange={(event) => setTypeName(event.target.value)}
            />
          </div>
          <div>
            <CFormLabel htmlFor="er-assessment-type-requirements">
              Assessment requirements
            </CFormLabel>
            <CFormTextarea
              id="er-assessment-type-requirements"
              rows={6}
              value={requirements}
              disabled={isSavingType}
              placeholder="One requirement per line"
              onChange={(event) => setRequirements(event.target.value)}
            />
          </div>
          <div>
            <CFormLabel htmlFor="er-assessment-type-worst-case">
              Worst-case scenario (optional)
            </CFormLabel>
            <CFormTextarea
              id="er-assessment-type-worst-case"
              rows={3}
              value={worstCaseScenario}
              disabled={isSavingType}
              onChange={(event) => setWorstCaseScenario(event.target.value)}
            />
          </div>
          {addError ? <div className="small text-danger">{addError}</div> : null}
        </CModalBody>
        <CModalFooter>
          <CButton
            color="light"
            variant="outline"
            disabled={isSavingType}
            onClick={() => setShowAddType(false)}
          >
            Cancel
          </CButton>
          <CButton color="primary" disabled={isSavingType} onClick={() => void saveType()}>
            {isSavingType ? 'Adding...' : 'Add type'}
          </CButton>
        </CModalFooter>
      </CModal>

      {draftRow ? (
        <MobileWorkflowDraftCard
          ariaLabel="Continue ER Assessment draft"
          summary={[draftRow.incidentType || 'ER Assessment', draftRow.location]
            .filter(Boolean)
            .join(' - ')}
          savedLabel={formatMobileReportDate(draftRow, 'Saved')}
          onContinue={() => onContinueDraft?.(draftRow)}
          onDelete={() => onDeleteDraft?.(draftRow)}
        />
      ) : null}

      <MobileRecentRecordsSection
        testId="er-assessment-report-mobile-records"
        recordScope={recordScope}
        onRecordScopeChange={onRecordScopeChange}
        recordsCount={recordsCount}
        items={recentRecordItems}
        sectionKey="recent-er-assessments"
        isLoading={isRecordsLoading}
        onViewRecords={onViewRecords}
      />
    </div>
  )
}

export default ErAssessmentMobileHome
