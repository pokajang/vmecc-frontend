import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CProgress,
} from '@coreui/react'
import { CircleCheck, HeartPulse, ShieldCheck, TriangleAlert, UserRound } from 'lucide-react'

import { MALAYSIA_STATE_OPTIONS } from 'src/constants/malaysiaStates'
import ButtonLoader from 'src/components/ButtonLoader'
import { updateOnboardingState, updateProfile } from 'src/services/apiClient'
import {
  PROFILE_COMPLETION_GROUPS,
  TRT_REMINDER_DELAY_MS,
  TRT_PROFILE_ONBOARDING_KEY,
  TRT_PROFILE_ONBOARDING_VERSION,
  getTrtOperationalProfileCompleteness,
  getTrtProfileOnboardingStorageKey,
  hasCriticalMedicalInfoAcknowledgement,
} from 'src/onboarding/trtProfileCompletion'

const WELCOME_PROMPT_DELAY_MS = 2000
const PROMPT_ROUTES = new Set(['/dashboard', '/profile', '/profile/security'])

const relationshipOptions = [
  'Spouse',
  'Mother',
  'Father',
  'Sibling',
  'Child',
  'Uncle',
  'Aunt',
  'Guardian',
  'Friend',
  'Other',
]

const iconByStep = {
  personal: UserRound,
  emergency: ShieldCheck,
  medical: HeartPulse,
}

const formatMobile = (value) => {
  const digits = (value || '').replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)} ${digits.slice(3)}`
  return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`
}

const toListArray = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const toListString = (value) => (Array.isArray(value) ? value.join(', ') : '')

const isFilled = (value) => String(value || '').trim().length > 0

const getFirstName = (user) => {
  const raw = String(user?.name || user?.email || '').trim()
  if (!raw) return 'there'
  if (raw.includes('@')) return raw.split('@')[0]
  return raw.split(/\s+/)[0]
}

const readStorageRecord = (key) => {
  if (typeof localStorage === 'undefined') return null
  try {
    return JSON.parse(localStorage.getItem(key) || 'null')
  } catch {
    return null
  }
}

const writeStorageRecord = (key, record) => {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(record))
  } catch {
    // Non-fatal. The onboarding prompt can appear again if storage is unavailable.
  }
}

const isSuppressed = (record, now = Date.now()) => {
  if (!record || typeof record !== 'object') return false
  if (record.dismissed === true || record.dismissedAt || record.completedAt) return true
  const snoozeUntil = Date.parse(record.snoozedUntil || record.snoozeUntil || '')
  return Number.isFinite(snoozeUntil) && snoozeUntil > now
}

const getEffectiveSuppressionRecord = (serverRecord, fallbackRecord) => {
  if (isSuppressed(serverRecord)) return serverRecord
  if (isSuppressed(fallbackRecord)) return fallbackRecord
  return serverRecord || fallbackRecord
}

const mergeOnboardingState = (user, key, state) => ({
  ...user,
  onboarding: {
    ...(user?.onboarding || {}),
    [key]: state,
  },
})

const normalizePersonalForm = (user = {}) => ({
  name: user.name || '',
  ic_number: user.ic_number || '',
  phone: formatMobile(user.phone || ''),
  address: user.address || '',
  state: user.state || '',
})

const normalizeEmergencyForm = (user = {}) => {
  const contact = user.emergency_contact || {}
  return {
    name: contact.name || '',
    relationship: contact.relationship || '',
    phone: formatMobile(contact.phone || ''),
  }
}

const normalizeMedicalForm = (user = {}) => {
  const medical =
    user.medical_info && typeof user.medical_info === 'object' ? user.medical_info : {}
  return {
    noKnownCriticalMedicalInfo: medical.noKnownCriticalMedicalInfo === true,
    bloodType: medical.bloodType || '',
    allergies: toListString(medical.allergies || []),
    conditions: toListString(medical.conditions || []),
    medications: toListString(medical.medications || []),
    notes: medical.notes || '',
  }
}

const getStepProgress = (activeStep) => {
  const index = PROFILE_COMPLETION_GROUPS.findIndex((group) => group.key === activeStep)
  return {
    index: index === -1 ? 0 : index,
    percent: ((index === -1 ? 1 : index + 1) / PROFILE_COMPLETION_GROUPS.length) * 100,
  }
}

const validateStep = ({ activeStep, personalForm, emergencyForm, medicalForm }) => {
  if (activeStep === 'personal') {
    return [
      ['name', 'Name'],
      ['ic_number', 'IC number'],
      ['phone', 'Mobile number'],
      ['address', 'Home address'],
      ['state', 'State'],
    ]
      .filter(([key]) => !isFilled(personalForm[key]))
      .map(([, label]) => label)
  }

  if (activeStep === 'emergency') {
    return [
      ['name', 'Emergency contact name'],
      ['relationship', 'Emergency contact relationship'],
      ['phone', 'Emergency contact mobile number'],
    ]
      .filter(([key]) => !isFilled(emergencyForm[key]))
      .map(([, label]) => label)
  }

  const medicalPayload = buildMedicalPayload(medicalForm)
  return hasCriticalMedicalInfoAcknowledgement(medicalPayload)
    ? []
    : ['Critical medical info acknowledgement']
}

const buildMedicalPayload = (form) => ({
  noKnownCriticalMedicalInfo: form.noKnownCriticalMedicalInfo === true,
  bloodType: form.noKnownCriticalMedicalInfo ? '' : form.bloodType || '',
  allergies: form.noKnownCriticalMedicalInfo ? [] : toListArray(form.allergies || ''),
  conditions: form.noKnownCriticalMedicalInfo ? [] : toListArray(form.conditions || ''),
  medications: form.noKnownCriticalMedicalInfo ? [] : toListArray(form.medications || ''),
  notes: form.noKnownCriticalMedicalInfo ? '' : form.notes || '',
})

const MissingSummary = ({ missingByGroup }) => (
  <div className="d-grid gap-2">
    {PROFILE_COMPLETION_GROUPS.map((group) => {
      const missing = missingByGroup[group.key] || []
      const isComplete = missing.length === 0
      const Icon = iconByStep[group.key]
      return (
        <div
          key={group.key}
          className="d-flex align-items-center justify-content-between gap-3 rounded border bg-body p-2"
        >
          <div className="d-flex align-items-center gap-2 min-w-0">
            <Icon size={17} className="text-primary flex-shrink-0" aria-hidden="true" />
            <div className="fw-semibold text-truncate">{group.title}</div>
          </div>
          <span
            className={`d-inline-flex align-items-center gap-1 flex-shrink-0 ${
              isComplete ? 'text-success' : 'text-warning'
            }`}
          >
            {isComplete ? (
              <CircleCheck size={16} aria-hidden="true" />
            ) : (
              <TriangleAlert size={16} aria-hidden="true" />
            )}
            {isComplete ? 'Complete' : 'Incomplete'}
          </span>
        </div>
      )
    })}
  </div>
)

const FormField = ({ id, label, children }) => (
  <div>
    <CFormLabel htmlFor={id}>{label}</CFormLabel>
    {children}
  </div>
)

const TextInputField = ({ id, label, ...props }) => (
  <FormField id={id} label={label}>
    <CFormInput id={id} {...props} />
  </FormField>
)

const TextareaField = ({ id, label, ...props }) => (
  <FormField id={id} label={label}>
    <CFormTextarea id={id} {...props} />
  </FormField>
)

const SelectField = ({ id, label, children, ...props }) => (
  <FormField id={id} label={label}>
    <CFormSelect id={id} {...props}>
      {children}
    </CFormSelect>
  </FormField>
)

const TrtProfileCompletionOnboarding = () => {
  const dispatch = useDispatch()
  const location = useLocation()
  const authUser = useSelector((state) => state.authUser)
  const completeness = useMemo(() => getTrtOperationalProfileCompleteness(authUser), [authUser])
  const storageKey = useMemo(() => getTrtProfileOnboardingStorageKey(authUser?.id), [authUser?.id])
  const serverOnboardingRecord = authUser?.onboarding?.[TRT_PROFILE_ONBOARDING_KEY] || null

  const [visible, setVisible] = useState(false)
  const [mode, setMode] = useState('prompt')
  const [activeStep, setActiveStep] = useState('personal')
  const [personalForm, setPersonalForm] = useState(() => normalizePersonalForm(authUser))
  const [emergencyForm, setEmergencyForm] = useState(() => normalizeEmergencyForm(authUser))
  const [medicalForm, setMedicalForm] = useState(() => normalizeMedicalForm(authUser))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isPromptRoute = PROMPT_ROUTES.has(location.pathname)

  useEffect(() => {
    if (!authUser?.id || !completeness.applies || (!isPromptRoute && mode === 'prompt')) {
      setVisible(false)
      setMode('prompt')
      return
    }

    if (completeness.complete) {
      if (mode !== 'complete') {
        setVisible(false)
      }
      return
    }

    const record = getEffectiveSuppressionRecord(
      serverOnboardingRecord,
      readStorageRecord(storageKey),
    )
    if (isSuppressed(record)) {
      setVisible(false)
      return undefined
    }

    const timer = setTimeout(() => {
      setVisible(true)
    }, WELCOME_PROMPT_DELAY_MS)

    return () => clearTimeout(timer)
  }, [
    authUser?.id,
    completeness.applies,
    completeness.complete,
    isPromptRoute,
    mode,
    serverOnboardingRecord,
    storageKey,
  ])

  useEffect(() => {
    if (!visible || !authUser?.id) return
    setPersonalForm(normalizePersonalForm(authUser))
    setEmergencyForm(normalizeEmergencyForm(authUser))
    setMedicalForm(normalizeMedicalForm(authUser))
    setActiveStep(completeness.missingGroups[0] || 'personal')
    setError('')
  }, [authUser, completeness.missingGroups, visible])

  if (!authUser?.id || !completeness.applies || (completeness.complete && mode !== 'complete')) {
    return null
  }

  const handleStart = () => {
    setMode('flow')
    setActiveStep(completeness.missingGroups[0] || 'personal')
    setError('')
  }

  const persistProfileOnboardingEvent = async ({ event, payload = {}, fallbackRecord }) => {
    try {
      const response = await updateOnboardingState(TRT_PROFILE_ONBOARDING_KEY, {
        version: TRT_PROFILE_ONBOARDING_VERSION,
        event,
        ...payload,
      })
      const nextState = response?.data?.[TRT_PROFILE_ONBOARDING_KEY]
      if (nextState) {
        dispatch({
          type: 'set',
          authUser: mergeOnboardingState(authUser, TRT_PROFILE_ONBOARDING_KEY, nextState),
        })
      }
      return nextState
    } catch {
      if (fallbackRecord) {
        writeStorageRecord(storageKey, fallbackRecord)
      }
      return null
    }
  }

  const handleRemindLater = async () => {
    const snoozedUntil = new Date(Date.now() + TRT_REMINDER_DELAY_MS).toISOString()
    setVisible(false)
    await persistProfileOnboardingEvent({
      event: 'snoozed',
      payload: { snoozedUntil },
      fallbackRecord: {
        snoozedUntil,
        snoozeUntil: snoozedUntil,
        updatedAt: new Date().toISOString(),
      },
    })
  }

  const handleExploreMyself = () => {
    setVisible(false)
  }

  const saveCurrentStep = async () => {
    if (saving) return

    const missing = validateStep({ activeStep, personalForm, emergencyForm, medicalForm })
    if (missing.length > 0) {
      setError(`Please complete: ${missing.join(', ')}.`)
      return
    }

    setSaving(true)
    setError('')

    try {
      const payload =
        activeStep === 'personal'
          ? {
              name: personalForm.name,
              ic_number: personalForm.ic_number,
              phone: personalForm.phone,
              address: personalForm.address,
              state: personalForm.state,
            }
          : activeStep === 'emergency'
            ? { emergency_contact: emergencyForm }
            : { medical_info: buildMedicalPayload(medicalForm) }

      const response = await updateProfile(payload)
      const nextUser = response?.user || null
      dispatch({ type: 'set', authUser: nextUser })

      const nextCompleteness = getTrtOperationalProfileCompleteness(nextUser)
      if (nextCompleteness.complete) {
        setMode('complete')
      } else {
        setActiveStep(nextCompleteness.missingGroups[0] || 'personal')
      }
    } catch (err) {
      setError(err?.payload?.message || err?.message || 'Unable to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const currentStep = PROFILE_COMPLETION_GROUPS.find((group) => group.key === activeStep)
  const progress = getStepProgress(activeStep)
  const firstName = getFirstName(authUser)

  return (
    <CModal
      alignment="center"
      visible={visible}
      onClose={saving ? undefined : mode === 'complete' ? handleExploreMyself : handleRemindLater}
      scrollable
      fullscreen="sm"
      size="lg"
    >
      <CModalHeader>
        <CModalTitle>
          {mode === 'prompt'
            ? `Welcome, ${firstName}`
            : mode === 'complete'
              ? 'Profile ready'
              : 'Complete your operational profile'}
        </CModalTitle>
      </CModalHeader>
      <CModalBody className="d-grid gap-3">
        {mode === 'prompt' && (
          <>
            <div>
              <h4 className="mb-2">
                Hi, {firstName}, as part of the Tactical Response Team, let&apos;s complete a few
                things before you start using this system.
              </h4>
              <p className="mb-0 text-body-secondary">
                This only takes a moment and helps supervisors and response leads reach the right
                person quickly when needed.
              </p>
            </div>
            <MissingSummary missingByGroup={completeness.missingByGroup} />
          </>
        )}

        {mode === 'flow' && (
          <>
            <div>
              <div className="d-flex align-items-center justify-content-between gap-3 mb-2">
                <div>
                  <div>{currentStep?.title}</div>
                  <div className="text-body-secondary">{currentStep?.description}</div>
                </div>
                <span className="text-body-secondary">
                  Step {progress.index + 1} of {PROFILE_COMPLETION_GROUPS.length}
                </span>
              </div>
              <CProgress thin color="primary" value={progress.percent} />
            </div>

            {error && (
              <CAlert color="danger" className="mb-0">
                {error}
              </CAlert>
            )}

            {activeStep === 'personal' && (
              <div className="d-grid gap-3">
                <TextInputField
                  id="trt-profile-name"
                  label="Name"
                  value={personalForm.name}
                  onChange={(event) =>
                    setPersonalForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  disabled={saving}
                />
                <TextInputField
                  id="trt-profile-ic-number"
                  label="IC number"
                  value={personalForm.ic_number}
                  onChange={(event) =>
                    setPersonalForm((prev) => ({ ...prev, ic_number: event.target.value }))
                  }
                  disabled={saving}
                  placeholder="e.g. 900101-01-1234"
                />
                <TextInputField
                  id="trt-profile-phone"
                  label="Mobile number"
                  value={personalForm.phone}
                  onChange={(event) =>
                    setPersonalForm((prev) => ({
                      ...prev,
                      phone: formatMobile(event.target.value),
                    }))
                  }
                  disabled={saving}
                  inputMode="tel"
                  placeholder="012 3456 789"
                />
                <TextareaField
                  id="trt-profile-address"
                  label="Home address"
                  rows={2}
                  value={personalForm.address}
                  onChange={(event) =>
                    setPersonalForm((prev) => ({ ...prev, address: event.target.value }))
                  }
                  disabled={saving}
                />
                <SelectField
                  id="trt-profile-state"
                  label="State"
                  value={personalForm.state}
                  onChange={(event) =>
                    setPersonalForm((prev) => ({ ...prev, state: event.target.value }))
                  }
                  disabled={saving}
                >
                  <option value="">Select state</option>
                  {MALAYSIA_STATE_OPTIONS.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </SelectField>
              </div>
            )}

            {activeStep === 'emergency' && (
              <div className="d-grid gap-3">
                <TextInputField
                  id="trt-profile-emergency-name"
                  label="Emergency contact name"
                  value={emergencyForm.name}
                  onChange={(event) =>
                    setEmergencyForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  disabled={saving}
                />
                <SelectField
                  id="trt-profile-emergency-relationship"
                  label="Relationship"
                  value={emergencyForm.relationship}
                  onChange={(event) =>
                    setEmergencyForm((prev) => ({ ...prev, relationship: event.target.value }))
                  }
                  disabled={saving}
                >
                  <option value="">Select relationship</option>
                  {relationshipOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </SelectField>
                <TextInputField
                  id="trt-profile-emergency-phone"
                  label="Emergency contact mobile number"
                  value={emergencyForm.phone}
                  onChange={(event) =>
                    setEmergencyForm((prev) => ({
                      ...prev,
                      phone: formatMobile(event.target.value),
                    }))
                  }
                  disabled={saving}
                  inputMode="tel"
                  placeholder="012 3456 789"
                />
              </div>
            )}

            {activeStep === 'medical' && (
              <div className="d-grid gap-3">
                <CAlert color="warning" className="mb-0">
                  Declare only information that may affect emergency support during field work.
                </CAlert>
                <CFormCheck
                  id="trt-no-known-medical-info"
                  label="No known critical medical info"
                  checked={medicalForm.noKnownCriticalMedicalInfo}
                  onChange={(event) =>
                    setMedicalForm((prev) => ({
                      ...prev,
                      noKnownCriticalMedicalInfo: event.target.checked,
                      ...(event.target.checked
                        ? {
                            bloodType: '',
                            allergies: '',
                            conditions: '',
                            medications: '',
                            notes: '',
                          }
                        : {}),
                    }))
                  }
                  disabled={saving}
                />
                <TextInputField
                  id="trt-profile-blood-type"
                  label="Blood type"
                  value={medicalForm.bloodType}
                  onChange={(event) =>
                    setMedicalForm((prev) => ({
                      ...prev,
                      noKnownCriticalMedicalInfo: false,
                      bloodType: event.target.value,
                    }))
                  }
                  disabled={saving || medicalForm.noKnownCriticalMedicalInfo}
                  placeholder="e.g., A+, O-, AB"
                />
                <TextInputField
                  id="trt-profile-allergies"
                  label="Allergies"
                  value={medicalForm.allergies}
                  onChange={(event) =>
                    setMedicalForm((prev) => ({
                      ...prev,
                      noKnownCriticalMedicalInfo: false,
                      allergies: event.target.value,
                    }))
                  }
                  disabled={saving || medicalForm.noKnownCriticalMedicalInfo}
                  placeholder="e.g., peanuts, penicillin"
                />
                <TextInputField
                  id="trt-profile-conditions"
                  label="Medical conditions"
                  value={medicalForm.conditions}
                  onChange={(event) =>
                    setMedicalForm((prev) => ({
                      ...prev,
                      noKnownCriticalMedicalInfo: false,
                      conditions: event.target.value,
                    }))
                  }
                  disabled={saving || medicalForm.noKnownCriticalMedicalInfo}
                  placeholder="e.g., asthma, hypertension"
                />
                <TextInputField
                  id="trt-profile-medications"
                  label="Medications"
                  value={medicalForm.medications}
                  onChange={(event) =>
                    setMedicalForm((prev) => ({
                      ...prev,
                      noKnownCriticalMedicalInfo: false,
                      medications: event.target.value,
                    }))
                  }
                  disabled={saving || medicalForm.noKnownCriticalMedicalInfo}
                  placeholder="e.g., inhaler, metformin"
                />
                <TextareaField
                  id="trt-profile-medical-notes"
                  label="Notes"
                  rows={3}
                  value={medicalForm.notes}
                  onChange={(event) =>
                    setMedicalForm((prev) => ({
                      ...prev,
                      noKnownCriticalMedicalInfo: false,
                      notes: event.target.value,
                    }))
                  }
                  disabled={saving || medicalForm.noKnownCriticalMedicalInfo}
                  placeholder="Additional details that may help in emergencies"
                />
              </div>
            )}
          </>
        )}

        {mode === 'complete' && (
          <div className="d-flex align-items-start gap-3">
            <CircleCheck size={24} className="text-success flex-shrink-0 mt-1" aria-hidden="true" />
            <div>
              <h4 className="mb-2">Your operational profile is ready.</h4>
              <p className="mb-0 text-body-secondary">
                Your contact, emergency, and medical readiness details are complete. You can now
                continue using the system.
              </p>
            </div>
          </div>
        )}
      </CModalBody>
      <CModalFooter className="d-flex flex-wrap justify-content-end gap-2">
        {mode === 'prompt' && (
          <>
            <CButton color="secondary" variant="outline" onClick={handleRemindLater}>
              Remind me later
            </CButton>
            <CButton color="primary" onClick={handleStart}>
              Complete profile
            </CButton>
          </>
        )}
        {mode === 'flow' && (
          <>
            <CButton
              color="secondary"
              variant="ghost"
              onClick={handleRemindLater}
              disabled={saving}
            >
              Remind me later
            </CButton>
            <CButton color="primary" onClick={saveCurrentStep} disabled={saving}>
              {saving ? <ButtonLoader label="Saving..." /> : 'Save and continue'}
            </CButton>
          </>
        )}
        {mode === 'complete' && (
          <>
            <CButton color="primary" onClick={handleExploreMyself}>
              Continue
            </CButton>
          </>
        )}
      </CModalFooter>
    </CModal>
  )
}

export default TrtProfileCompletionOnboarding
