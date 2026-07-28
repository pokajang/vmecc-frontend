import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CFormSwitch,
  CSpinner,
  CToast,
  CToastBody,
  CToaster,
} from '@coreui/react'
import { Save } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import ButtonLoader from 'src/components/ButtonLoader'
import { fetchModuleActivation, saveModuleActivation } from 'src/services/apiClient'
import { normalizeModuleActivationPayload } from 'src/utils/modules'

const ROOT_KEY = '__root__'

const buildModuleTree = (registry = []) => {
  const childrenByParent = new Map()
  registry.forEach((module) => {
    const parent = module.parent || ROOT_KEY
    const children = childrenByParent.get(parent) || []
    children.push(module)
    childrenByParent.set(parent, children)
  })
  return childrenByParent
}

const configuredValue = (configured, key) => configured?.[key] !== false

const buildDraftEffectiveState = (registry = [], configured = {}) => {
  const moduleByKey = new Map(registry.map((module) => [module.key, module]))
  const cache = new Map()

  const resolve = (key, seen = new Set()) => {
    if (cache.has(key)) return cache.get(key)
    const module = moduleByKey.get(key)
    if (!module || seen.has(key)) {
      return { enabled: true, reason: null, blockingModule: null }
    }

    if (module.locked) {
      const state = { enabled: true, reason: null, blockingModule: null }
      cache.set(key, state)
      return state
    }

    if (configured?.[key] === false) {
      const state = { enabled: false, reason: 'configured_disabled', blockingModule: key }
      cache.set(key, state)
      return state
    }

    const nextSeen = new Set(seen)
    nextSeen.add(key)

    if (module.parent) {
      const parentState = resolve(module.parent, nextSeen)
      if (parentState.enabled === false) {
        const state = {
          enabled: false,
          reason: 'parent_disabled',
          blockingModule: parentState.blockingModule || module.parent,
        }
        cache.set(key, state)
        return state
      }
    }

    for (const dependency of module.dependencies || []) {
      const dependencyState = resolve(dependency, nextSeen)
      if (dependencyState.enabled === false) {
        const state = {
          enabled: false,
          reason: 'dependency_disabled',
          blockingModule: dependencyState.blockingModule || dependency,
        }
        cache.set(key, state)
        return state
      }
    }

    const state = { enabled: true, reason: null, blockingModule: null }
    cache.set(key, state)
    return state
  }

  return registry.reduce((acc, module) => {
    acc[module.key] = resolve(module.key)
    return acc
  }, {})
}

const ModuleRow = ({
  childrenByParent,
  configured,
  effective,
  module,
  moduleByKey,
  onToggle,
  saving,
  depth = 0,
}) => {
  const state = effective?.[module.key] || { enabled: true }
  const checked = configuredValue(configured, module.key)
  const parentState = module.parent ? effective?.[module.parent] : null
  const disabledByParent = module.parent && parentState?.enabled === false
  const disabled = saving || module.locked || disabledByParent
  const blockingLabel =
    state.blockingModule && moduleByKey.get(state.blockingModule)
      ? moduleByKey.get(state.blockingModule).label
      : state.blockingModule
  const children = childrenByParent.get(module.key) || []

  return (
    <>
      <div
        className="d-flex align-items-start justify-content-between gap-3 border rounded px-3 py-3 mb-2"
        style={{ marginLeft: depth ? `${depth * 18}px` : 0 }}
      >
        <div className="min-w-0">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className="fw-semibold">{module.label}</span>
            {module.locked && <CBadge color="light">Locked</CBadge>}
            {state.enabled === false && (
              <CBadge color="warning" textColor="dark">
                Inactive
              </CBadge>
            )}
          </div>
          <div className="small text-body-secondary mt-1">{module.description}</div>
          {state.enabled === false && (
            <div className="small text-warning mt-1">
              {state.reason === 'parent_disabled'
                ? `Inactive because parent module ${blockingLabel || 'is disabled'} is off.`
                : state.reason === 'dependency_disabled'
                  ? `Inactive because dependency ${blockingLabel || 'is disabled'} is off.`
                  : 'Inactive because this module is disabled.'}
            </div>
          )}
        </div>
        <CFormSwitch
          className="flex-shrink-0"
          checked={module.locked ? true : checked}
          disabled={disabled}
          onChange={(event) => onToggle(module.key, event.target.checked)}
          aria-label={`Toggle ${module.label}`}
        />
      </div>
      {children.map((child) => (
        <ModuleRow
          key={child.key}
          childrenByParent={childrenByParent}
          configured={configured}
          effective={effective}
          module={child}
          moduleByKey={moduleByKey}
          onToggle={onToggle}
          saving={saving}
          depth={depth + 1}
        />
      ))}
    </>
  )
}

const ModuleActivationMatrix = () => {
  const dispatch = useDispatch()
  const storeActivation = useSelector((state) => state.moduleActivation)
  const [moduleActivation, setModuleActivation] = useState(storeActivation)
  const [configuredDraft, setConfiguredDraft] = useState(storeActivation?.configured || {})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const payload = normalizeModuleActivationPayload(await fetchModuleActivation())
        if (!active) return
        setModuleActivation(payload)
        setConfiguredDraft(payload.configured || {})
        dispatch({ type: 'set', moduleActivation: payload })
      } catch (err) {
        if (!active) return
        setError(err?.message || 'Unable to load module activation settings.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [dispatch])

  const registry = useMemo(() => moduleActivation?.registry || [], [moduleActivation?.registry])
  const moduleByKey = useMemo(
    () => new Map(registry.map((module) => [module.key, module])),
    [registry],
  )
  const childrenByParent = useMemo(() => buildModuleTree(registry), [registry])
  const draftEffective = useMemo(
    () => buildDraftEffectiveState(registry, configuredDraft),
    [configuredDraft, registry],
  )
  const groupedRoots = useMemo(() => {
    const roots = childrenByParent.get(ROOT_KEY) || []
    return roots.reduce((groups, module) => {
      const group = module.group || 'Other'
      if (!groups[group]) groups[group] = []
      groups[group].push(module)
      return groups
    }, {})
  }, [childrenByParent])

  const hasChanges = useMemo(
    () =>
      JSON.stringify(configuredDraft || {}) !== JSON.stringify(moduleActivation?.configured || {}),
    [configuredDraft, moduleActivation?.configured],
  )

  const toggleModule = useCallback((key, enabled) => {
    setConfiguredDraft((prev) => {
      const next = { ...(prev || {}) }
      if (enabled) {
        delete next[key]
      } else {
        next[key] = false
      }
      return next
    })
  }, [])

  const save = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      const payload = normalizeModuleActivationPayload(await saveModuleActivation(configuredDraft))
      setModuleActivation(payload)
      setConfiguredDraft(payload.configured || {})
      dispatch({ type: 'set', moduleActivation: payload })
      setToast(
        <CToast autohide delay={3500} color="success">
          <CToastBody>Module activation settings updated.</CToastBody>
        </CToast>,
      )
    } catch (err) {
      setError(err?.message || 'Unable to save module activation settings.')
    } finally {
      setSaving(false)
    }
  }, [configuredDraft, dispatch])

  if (loading) {
    return (
      <div className="py-5 text-center">
        <CSpinner color="primary" />
      </div>
    )
  }

  return (
    <div data-testid="settings-modules-panel">
      <CToaster push={toast} placement="bottom-end" className="mb-3 me-3" />
      <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
        <div>
          <div className="fw-semibold">Module Activation</div>
          <div className="small text-body-secondary">
            Turning off a parent also disables its child modules.
          </div>
        </div>
        <CButton color="primary" size="sm" disabled={!hasChanges || saving} onClick={save}>
          {saving ? (
            <ButtonLoader label="Saving..." size={13} />
          ) : (
            <Save size={14} className="me-1" />
          )}
          {!saving ? 'Save' : null}
        </CButton>
      </div>

      {moduleActivation?.forceAllEnabled && (
        <CAlert color="warning">Emergency override is active. All modules are forced on.</CAlert>
      )}

      {error && <CAlert color="danger">{error}</CAlert>}

      {Object.entries(groupedRoots).map(([group, modules]) => (
        <div key={group} className="mb-4">
          <div className="text-uppercase text-body-secondary fw-semibold small mb-2">{group}</div>
          {modules.map((module) => (
            <ModuleRow
              key={module.key}
              childrenByParent={childrenByParent}
              configured={configuredDraft}
              effective={draftEffective}
              module={module}
              moduleByKey={moduleByKey}
              onToggle={toggleModule}
              saving={saving}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export default ModuleActivationMatrix
