import React from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CRow,
  CListGroup,
  CListGroupItem,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { Pencil } from 'lucide-react'
import EditControls from 'src/components/EditControls'
import useOvertimeRateSettingsController from '../hooks/useOvertimeRateSettingsController'
import { OVERTIME_BASE_HOUR_MODES, OVERTIME_NORMAL_HOURS_STRATEGIES } from '../utils'
import { ROLE_OPTIONS } from 'src/constants/roles'
import {
  NORMAL_HOURS_STRATEGY_OPTIONS,
  SAMPLE_BASIC_SALARY_DEFAULT,
  SAMPLE_MONTH_DAYS,
  SAMPLE_OVERTIME_HOURS,
  formatMoney,
  getNormalHoursStrategyLabel,
} from './overtimeRateSettingsTabConfig'

const OvertimeRateSettingsTab = ({ vm, handlers }) => {
  const { otRateSettings, otRateDirty, formatDateTime } = vm
  const {
    resetOvertimeRates,
    reloadOvertimeRates,
    persistOvertimeRates,
    updateOvertimeApplicabilityField,
    updateOvertimeRateField,
    updateOvertimeBaseHourField,
  } = handlers
  const {
    isApplicabilityEditing,
    setIsApplicabilityEditing,
    isRateEditing,
    setIsRateEditing,
    isBaseEditing,
    setIsBaseEditing,
    baseError,
    sampleBasicSalaryInput,
    setSampleBasicSalaryInput,
    isSampleBasicSalaryEditing,
    setIsSampleBasicSalaryEditing,
    rateHistory,
    baseHourCalculation,
    normalHoursStrategy,
    roleNormalHoursPerDay,
    defaultRoleHoursPerDay,
    roleNormalHourOverrideCount,
    hasRoleNormalHourOverrides,
    roleNormalHourOverrideEntries,
    selectedRoleOverrides,
    otApplicabilityRoles,
    formatValue,
    sampleOvertimeBreakdown,
    handleRateSave,
    handleRateCancel,
    handleBaseSave,
    handleBaseCancel,
    handleBaseResetDefaults,
    handleApplicabilitySave,
    handleApplicabilityCancel,
    discardUnsavedOtEdits,
  } = useOvertimeRateSettingsController({
    otRateSettings,
    otRateDirty,
    reloadOvertimeRates,
    persistOvertimeRates,
    updateOvertimeBaseHourField,
  })

  return (
    <>
      <CCard>
        <CCardHeader className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div>OT Applicability</div>
          <EditControls
            editMode={isApplicabilityEditing}
            loading={false}
            onEdit={() => {
              if (isRateEditing || isBaseEditing) {
                if (!discardUnsavedOtEdits()) return
              }
              setIsApplicabilityEditing(true)
            }}
            onSave={handleApplicabilitySave}
            onCancel={handleApplicabilityCancel}
          />
        </CCardHeader>
        <CCardBody className="d-grid gap-2">
          {isApplicabilityEditing ? (
            <div className="d-grid gap-2">
              <div className="text-body-secondary">Select which role applicable for OT claim.</div>
              <CRow className="g-2">
                {ROLE_OPTIONS.map((role) => {
                  const checked = otApplicabilityRoles.includes(role)
                  return (
                    <CCol md={6} key={role}>
                      <CFormCheck
                        id={`ot-applicability-role-${role.replace(/\s+/g, '-').toLowerCase()}`}
                        label={role}
                        checked={checked}
                        onChange={(event) => {
                          const nextRoles = event.target.checked
                            ? [...otApplicabilityRoles, role]
                            : otApplicabilityRoles.filter((entry) => entry !== role)
                          updateOvertimeApplicabilityField('roles', Array.from(new Set(nextRoles)))
                        }}
                      />
                    </CCol>
                  )
                })}
              </CRow>
            </div>
          ) : (
            <CRow className="py-2 g-2">
              <CCol md={5} className="text-body-secondary">
                Applicable Roles
              </CCol>
              <CCol md={7} className="text-md-end text-break">
                {otApplicabilityRoles.length > 1 ? (
                  <ol className="mb-0 ps-3 text-start d-inline-block">
                    {otApplicabilityRoles.map((role) => (
                      <li key={role}>{role}</li>
                    ))}
                  </ol>
                ) : (
                  otApplicabilityRoles[0] || '-'
                )}
              </CCol>
              <CCol xs={12} className="small text-body-secondary">
                Select which role applicable for OT claim.
              </CCol>
            </CRow>
          )}
        </CCardBody>
      </CCard>
      <CCard className="mt-3">
        <CCardHeader className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div>Overtime Rate Settings</div>
          <div className="d-flex align-items-center gap-2">
            {isRateEditing && (
              <CButton
                size="sm"
                className="text-primary px-2 py-1 border-0 bg-transparent shadow-none"
                onClick={resetOvertimeRates}
              >
                Reset defaults
              </CButton>
            )}
            <EditControls
              editMode={isRateEditing}
              loading={false}
              onEdit={() => {
                if (isBaseEditing || isApplicabilityEditing) {
                  if (!discardUnsavedOtEdits()) return
                }
                setIsApplicabilityEditing(false)
                setIsRateEditing(true)
              }}
              onSave={handleRateSave}
              onCancel={handleRateCancel}
            />
          </div>
        </CCardHeader>
        <CCardBody className="d-grid gap-3">
          {isRateEditing ? (
            <CRow className="g-3">
              <CCol md={4}>
                <CFormLabel htmlFor="ot-weekday-multiplier">Weekday OT rate</CFormLabel>
                <CFormInput
                  id="ot-weekday-multiplier"
                  type="number"
                  min="1"
                  step="0.1"
                  value={otRateSettings.weekdayMultiplier}
                  onChange={(event) =>
                    updateOvertimeRateField('weekdayMultiplier', event.target.value)
                  }
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel htmlFor="ot-weekend-multiplier">Weekend OT rate</CFormLabel>
                <CFormInput
                  id="ot-weekend-multiplier"
                  type="number"
                  min="1"
                  step="0.1"
                  value={otRateSettings.weekendMultiplier}
                  onChange={(event) =>
                    updateOvertimeRateField('weekendMultiplier', event.target.value)
                  }
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel htmlFor="ot-holiday-multiplier">Public holiday OT rate</CFormLabel>
                <CFormInput
                  id="ot-holiday-multiplier"
                  type="number"
                  min="1"
                  step="0.1"
                  value={otRateSettings.publicHolidayMultiplier}
                  onChange={(event) =>
                    updateOvertimeRateField('publicHolidayMultiplier', event.target.value)
                  }
                />
              </CCol>
            </CRow>
          ) : (
            <div className="d-grid gap-2">
              <CRow className="py-2">
                <CCol md={5} className="text-body-secondary">
                  Weekday OT rate
                </CCol>
                <CCol md={7} className="text-md-end text-break">
                  {formatValue(otRateSettings.weekdayMultiplier, { suffix: 'x' })}
                </CCol>
              </CRow>
              <CRow className="py-2">
                <CCol md={5} className="text-body-secondary">
                  Weekend OT rate
                </CCol>
                <CCol md={7} className="text-md-end text-break">
                  {formatValue(otRateSettings.weekendMultiplier, { suffix: 'x' })}
                </CCol>
              </CRow>
              <CRow className="py-2">
                <CCol md={5} className="text-body-secondary">
                  Public holiday OT rate
                </CCol>
                <CCol md={7} className="text-md-end text-break">
                  {formatValue(otRateSettings.publicHolidayMultiplier, { suffix: 'x' })}
                </CCol>
              </CRow>
            </div>
          )}
        </CCardBody>
      </CCard>
      <CCard className="mt-3">
        <CCardHeader className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div>Base Hour Calculation</div>
          <div className="d-flex align-items-center gap-2">
            {isBaseEditing && (
              <CButton
                size="sm"
                className="text-primary px-2 py-1 border-0 bg-transparent shadow-none"
                onClick={handleBaseResetDefaults}
              >
                Reset defaults
              </CButton>
            )}
            <EditControls
              editMode={isBaseEditing}
              loading={false}
              onEdit={() => {
                if (isRateEditing || isApplicabilityEditing) {
                  if (!discardUnsavedOtEdits()) return
                }
                setIsApplicabilityEditing(false)
                setBaseError(null)
                setIsBaseEditing(true)
              }}
              onSave={handleBaseSave}
              onCancel={handleBaseCancel}
            />
          </div>
        </CCardHeader>
        <CCardBody className="d-grid gap-3">
          {baseError ? <div className="small text-danger">{baseError}</div> : null}
          {isBaseEditing ? (
            <>
              <CRow className="g-3">
                <CCol md={4}>
                  <CFormLabel htmlFor="ot-base-hour-mode">Calculation mode</CFormLabel>
                  <CFormSelect
                    id="ot-base-hour-mode"
                    value={baseHourCalculation?.mode || OVERTIME_BASE_HOUR_MODES.AUTO_STATUTORY}
                    onChange={(event) => updateOvertimeBaseHourField('mode', event.target.value)}
                  >
                    <option value={OVERTIME_BASE_HOUR_MODES.AUTO_STATUTORY}>Auto statutory</option>
                    <option value={OVERTIME_BASE_HOUR_MODES.MONTH_DAYS_DIVISION}>
                      Month days division
                    </option>
                  </CFormSelect>
                </CCol>
                <CCol md={4}>
                  <CFormLabel htmlFor="ot-normal-hours-strategy">Normal hours strategy</CFormLabel>
                  <CFormSelect
                    id="ot-normal-hours-strategy"
                    value={normalHoursStrategy}
                    onChange={(event) =>
                      updateOvertimeBaseHourField('normalHoursStrategy', event.target.value)
                    }
                  >
                    {NORMAL_HOURS_STRATEGY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol md={4}>
                  <CFormLabel htmlFor="ot-base-hour-divisor">Monthly divisor</CFormLabel>
                  {baseHourCalculation?.mode === OVERTIME_BASE_HOUR_MODES.MONTH_DAYS_DIVISION ? (
                    <CFormInput
                      id="ot-base-hour-divisor"
                      value="N/A (calendar month days)"
                      disabled
                    />
                  ) : (
                    <CFormInput
                      id="ot-base-hour-divisor"
                      type="number"
                      min="1"
                      step="1"
                      value={baseHourCalculation?.monthlyDivisor || '26'}
                      onChange={(event) =>
                        updateOvertimeBaseHourField('monthlyDivisor', event.target.value)
                      }
                    />
                  )}
                  {baseHourCalculation?.mode === OVERTIME_BASE_HOUR_MODES.MONTH_DAYS_DIVISION && (
                    <div className="small text-body-secondary mt-1">
                      N/A in this mode (uses calendar days in OT month).
                    </div>
                  )}
                </CCol>
                {normalHoursStrategy === OVERTIME_NORMAL_HOURS_STRATEGIES.GLOBAL && (
                  <CCol md={4}>
                    <CFormLabel htmlFor="ot-base-hour-normal">Global normal hours/day</CFormLabel>
                    <CFormInput
                      id="ot-base-hour-normal"
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={baseHourCalculation?.globalNormalHoursPerDay || '8'}
                      onChange={(event) =>
                        updateOvertimeBaseHourField('globalNormalHoursPerDay', event.target.value)
                      }
                    />
                  </CCol>
                )}
                {normalHoursStrategy === OVERTIME_NORMAL_HOURS_STRATEGIES.STATUTORY_8H && (
                  <CCol md={4}>
                    <CFormLabel htmlFor="ot-base-hour-normal-statutory">
                      Statutory normal hours/day
                    </CFormLabel>
                    <CFormInput id="ot-base-hour-normal-statutory" value="8" disabled />
                  </CCol>
                )}
                {normalHoursStrategy === OVERTIME_NORMAL_HOURS_STRATEGIES.ROLE_BASED && (
                  <CCol md={4}>
                    <CFormLabel htmlFor="ot-role-based-note">Role-based mode</CFormLabel>
                    <CFormInput
                      id="ot-role-based-note"
                      value="Enabled (override by selected roles)"
                      disabled
                    />
                  </CCol>
                )}
              </CRow>
              {normalHoursStrategy === OVERTIME_NORMAL_HOURS_STRATEGIES.ROLE_BASED && (
                <div className="d-grid gap-2">
                  <div className="small text-body-secondary">
                    Select roles that need custom normal hours/day. Only selected roles will show
                    input fields. Unselected roles fallback to statutory 8h.
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {ROLE_OPTIONS.map((role) => {
                      const checked = selectedRoleOverrides.includes(role)
                      return (
                        <div key={`ot-role-select-${role}`} className="border rounded px-3 py-2">
                          <CFormCheck
                            id={`ot-role-hours-toggle-${role.replace(/\s+/g, '-').toLowerCase()}`}
                            label={role}
                            checked={checked}
                            onChange={(event) => {
                              const nextRoleHours = { ...roleNormalHoursPerDay }
                              if (event.target.checked) {
                                if (!Object.prototype.hasOwnProperty.call(nextRoleHours, role)) {
                                  nextRoleHours[role] = '8'
                                }
                              } else {
                                delete nextRoleHours[role]
                              }
                              updateOvertimeBaseHourField('roleNormalHoursPerDay', nextRoleHours)
                            }}
                          />
                        </div>
                      )
                    })}
                  </div>
                  {selectedRoleOverrides.length > 0 && (
                    <CListGroup>
                      {selectedRoleOverrides.map((role, index) => (
                        <CListGroupItem
                          key={`ot-role-hours-input-${role}`}
                          className="d-flex flex-wrap align-items-center justify-content-between gap-2"
                        >
                          <div className="text-body-secondary">
                            {index + 1}. {role}
                          </div>
                          <div className="d-inline-flex align-items-center gap-2">
                            <CFormInput
                              type="number"
                              min="0.1"
                              step="0.1"
                              style={{ width: 140 }}
                              value={String(roleNormalHoursPerDay?.[role] ?? '')}
                              onChange={(event) => {
                                const nextRoleHours = { ...roleNormalHoursPerDay }
                                nextRoleHours[role] = String(event.target.value ?? '')
                                updateOvertimeBaseHourField('roleNormalHoursPerDay', nextRoleHours)
                              }}
                            />
                            <span className="small text-body-secondary">hours/day</span>
                          </div>
                        </CListGroupItem>
                      ))}
                    </CListGroup>
                  )}
                </div>
              )}
              <div className="small text-body-secondary">
                {baseHourCalculation?.mode === OVERTIME_BASE_HOUR_MODES.MONTH_DAYS_DIVISION
                  ? 'Formula: hourly base = (basic salary / days in overtime month) / normal hours per day.'
                  : 'Formula: hourly base = (basic salary / monthly divisor) / normal hours per day.'}{' '}
                {normalHoursStrategy === OVERTIME_NORMAL_HOURS_STRATEGIES.STATUTORY_8H
                  ? 'Normal hours/day uses statutory fixed 8h.'
                  : normalHoursStrategy === OVERTIME_NORMAL_HOURS_STRATEGIES.GLOBAL
                    ? 'Normal hours/day uses global value.'
                    : 'Normal hours/day resolves role override -> default role value -> statutory 8h.'}
              </div>
            </>
          ) : (
            <div className="d-grid gap-2">
              <CRow className="py-2">
                <CCol md={5} className="text-body-secondary">
                  Calculation mode
                </CCol>
                <CCol md={7} className="text-md-end text-break">
                  {baseHourCalculation?.mode === OVERTIME_BASE_HOUR_MODES.MONTH_DAYS_DIVISION
                    ? 'Month days division'
                    : 'Auto statutory'}
                </CCol>
              </CRow>
              <CRow className="py-2">
                <CCol md={5} className="text-body-secondary">
                  Monthly divisor
                </CCol>
                <CCol md={7} className="text-md-end text-break">
                  {baseHourCalculation?.mode === OVERTIME_BASE_HOUR_MODES.MONTH_DAYS_DIVISION
                    ? 'N/A (calendar month days)'
                    : formatValue(baseHourCalculation?.monthlyDivisor)}
                </CCol>
              </CRow>
              <CRow className="py-2">
                <CCol md={5} className="text-body-secondary">
                  Normal hours strategy
                </CCol>
                <CCol md={7} className="text-md-end text-break">
                  {getNormalHoursStrategyLabel(normalHoursStrategy)}
                </CCol>
              </CRow>
              {normalHoursStrategy === OVERTIME_NORMAL_HOURS_STRATEGIES.STATUTORY_8H && (
                <CRow className="py-2">
                  <CCol md={5} className="text-body-secondary">
                    Statutory normal hours/day
                  </CCol>
                  <CCol md={7} className="text-md-end text-break">
                    8
                  </CCol>
                </CRow>
              )}
              {normalHoursStrategy === OVERTIME_NORMAL_HOURS_STRATEGIES.GLOBAL && (
                <CRow className="py-2">
                  <CCol md={5} className="text-body-secondary">
                    Global normal hours/day
                  </CCol>
                  <CCol md={7} className="text-md-end text-break">
                    {formatValue(baseHourCalculation?.globalNormalHoursPerDay)}
                  </CCol>
                </CRow>
              )}
              {normalHoursStrategy === OVERTIME_NORMAL_HOURS_STRATEGIES.ROLE_BASED && (
                <>
                  <CRow className="py-2">
                    <CCol md={5} className="text-body-secondary">
                      Role-based fallback
                    </CCol>
                    <CCol md={7} className="text-md-end text-break">
                      Statutory 8h
                    </CCol>
                  </CRow>
                  <CRow className="py-2">
                    <CCol md={5} className="text-body-secondary">
                      Role overrides configured
                    </CCol>
                    <CCol md={7} className="text-md-end text-break">
                      {roleNormalHourOverrideCount}
                    </CCol>
                  </CRow>
                  {hasRoleNormalHourOverrides && (
                    <CRow className="py-2">
                      <CCol md={5} className="text-body-secondary">
                        Override list
                      </CCol>
                      <CCol md={7} className="text-md-end text-break">
                        {roleNormalHourOverrideEntries.length > 1 ? (
                          <ol className="mb-0 ps-3 text-start d-inline-block">
                            {roleNormalHourOverrideEntries.map(([role, value]) => (
                              <li key={`ot-role-override-read-${role}`}>
                                {role} ({value})
                              </li>
                            ))}
                          </ol>
                        ) : (
                          `${roleNormalHourOverrideEntries[0]?.[0] || '-'} (${roleNormalHourOverrideEntries[0]?.[1] || '-'})`
                        )}
                      </CCol>
                    </CRow>
                  )}
                </>
              )}
            </div>
          )}
        </CCardBody>
      </CCard>
      <CCard className="mt-3">
        <CCardHeader>Sample Calculation</CCardHeader>
        <CCardBody className="d-grid gap-2">
          {sampleOvertimeBreakdown.available ? (
            <div className="rounded-3 shadow-sm overflow-hidden bg-white">
              <CTable align="middle" className="mb-0" responsive>
                <CTableHead color="light">
                  <CTableRow>
                    <CTableHeaderCell className="text-center" style={{ width: '56px' }}>
                      #
                    </CTableHeaderCell>
                    <CTableHeaderCell>Item</CTableHeaderCell>
                    <CTableHeaderCell>Formula</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Result</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  <CTableRow>
                    <CTableDataCell className="text-center text-body-secondary">1</CTableDataCell>
                    <CTableDataCell>Sample Basic Salary</CTableDataCell>
                    <CTableDataCell>-</CTableDataCell>
                    <CTableDataCell className="text-end">
                      <div className="d-inline-flex align-items-center gap-2">
                        <CButton
                          type="button"
                          color="link"
                          size="sm"
                          className="p-0 text-primary d-inline-flex align-items-center justify-content-center"
                          title="Edit sample basic salary (UI only)"
                          onClick={() => setIsSampleBasicSalaryEditing((prev) => !prev)}
                        >
                          <Pencil size={13} />
                        </CButton>
                        {isSampleBasicSalaryEditing ? (
                          <CFormInput
                            id="ot-sample-basic-salary-inline"
                            type="number"
                            min="0"
                            step="0.01"
                            value={sampleBasicSalaryInput}
                            style={{ width: 140 }}
                            autoFocus
                            onBlur={() => setIsSampleBasicSalaryEditing(false)}
                            onChange={(event) => setSampleBasicSalaryInput(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === 'Escape') {
                                setIsSampleBasicSalaryEditing(false)
                              }
                            }}
                          />
                        ) : (
                          <span>{formatMoney(sampleOvertimeBreakdown.sampleBasicSalary)}</span>
                        )}
                      </div>
                    </CTableDataCell>
                  </CTableRow>
                  <CTableRow>
                    <CTableDataCell className="text-center text-body-secondary">2</CTableDataCell>
                    <CTableDataCell>Hourly Base Rate</CTableDataCell>
                    <CTableDataCell>
                      {sampleOvertimeBreakdown.mode === OVERTIME_BASE_HOUR_MODES.MONTH_DAYS_DIVISION
                        ? `(${sampleOvertimeBreakdown.sampleBasicSalary.toFixed(2)} / ${SAMPLE_MONTH_DAYS}) / ${sampleOvertimeBreakdown.hoursPerDay}`
                        : `(${sampleOvertimeBreakdown.sampleBasicSalary.toFixed(2)} / ${sampleOvertimeBreakdown.divisor}) / ${sampleOvertimeBreakdown.hoursPerDay}`}
                      {sampleOvertimeBreakdown.strategy ===
                      OVERTIME_NORMAL_HOURS_STRATEGIES.STATUTORY_8H
                        ? ' (statutory 8h)'
                        : sampleOvertimeBreakdown.strategy ===
                            OVERTIME_NORMAL_HOURS_STRATEGIES.GLOBAL
                          ? ' (global hours/day)'
                          : ' (role-based default hours/day)'}
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      {formatMoney(sampleOvertimeBreakdown.hourlyBase)}
                    </CTableDataCell>
                  </CTableRow>
                  <CTableRow>
                    <CTableDataCell className="text-center text-body-secondary">3</CTableDataCell>
                    <CTableDataCell>OT Type: Weekday ({SAMPLE_OVERTIME_HOURS}h)</CTableDataCell>
                    <CTableDataCell>
                      {SAMPLE_OVERTIME_HOURS}h x RM {sampleOvertimeBreakdown.hourlyBase.toFixed(2)}
                      /h x {sampleOvertimeBreakdown.weekday}x
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      {formatMoney(sampleOvertimeBreakdown.weekdayPayout)}
                    </CTableDataCell>
                  </CTableRow>
                  <CTableRow>
                    <CTableDataCell className="text-center text-body-secondary">4</CTableDataCell>
                    <CTableDataCell>OT Type: Weekend ({SAMPLE_OVERTIME_HOURS}h)</CTableDataCell>
                    <CTableDataCell>
                      {SAMPLE_OVERTIME_HOURS}h x RM {sampleOvertimeBreakdown.hourlyBase.toFixed(2)}
                      /h x {sampleOvertimeBreakdown.weekend}x
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      {formatMoney(sampleOvertimeBreakdown.weekendPayout)}
                    </CTableDataCell>
                  </CTableRow>
                  <CTableRow>
                    <CTableDataCell className="text-center text-body-secondary">5</CTableDataCell>
                    <CTableDataCell>
                      OT Type: Public Holiday ({SAMPLE_OVERTIME_HOURS}h)
                    </CTableDataCell>
                    <CTableDataCell>
                      {SAMPLE_OVERTIME_HOURS}h x RM {sampleOvertimeBreakdown.hourlyBase.toFixed(2)}
                      /h x {sampleOvertimeBreakdown.holiday}x
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      {formatMoney(sampleOvertimeBreakdown.holidayPayout)}
                    </CTableDataCell>
                  </CTableRow>
                </CTableBody>
              </CTable>
            </div>
          ) : (
            <div className="text-warning">{sampleOvertimeBreakdown.message}</div>
          )}
        </CCardBody>
      </CCard>
      <CCard className="mt-3">
        <CCardHeader>Last Updated</CCardHeader>
        <CCardBody className="small text-body-secondary d-grid gap-2">
          {rateHistory.length === 0
            ? 'No edits were made.'
            : rateHistory.map((entry, index) => (
                <div
                  key={entry.id || `${entry.at}-${index}`}
                  className={index < rateHistory.length - 1 ? 'pb-2 mb-1' : ''}
                >
                  <div>
                    {entry.at ? formatDateTime(entry.at) : '-'} by {entry.by || '-'}
                  </div>
                  <div>
                    Weekday: {formatValue(entry.weekdayMultiplier, { suffix: 'x' })} | Weekend:{' '}
                    {formatValue(entry.weekendMultiplier, { suffix: 'x' })} | Public Holiday:{' '}
                    {formatValue(entry.publicHolidayMultiplier, { suffix: 'x' })}
                  </div>
                  <div>
                    Base Hour Mode: {formatValue(entry.baseHourMode)} | Divisor:{' '}
                    {formatValue(entry.monthlyDivisor)} | Hours/Day:{' '}
                    {formatValue(entry.globalNormalHoursPerDay)} | Strategy:{' '}
                    {formatValue(entry.normalHoursStrategy)} | Default Role Hours:{' '}
                    {formatValue(entry.defaultRoleHoursPerDay)} | Role Overrides:{' '}
                    {formatValue(entry.roleOverrideCount)}
                  </div>
                </div>
              ))}
        </CCardBody>
      </CCard>
    </>
  )
}

export default OvertimeRateSettingsTab
