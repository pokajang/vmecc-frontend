import React, { useMemo, useRef } from 'react'
import { CListGroup, CListGroupItem } from '@coreui/react'
import { Check, CheckCircle2, ChevronRight } from 'lucide-react'

const buildClassName = (...parts) => parts.filter(Boolean).join(' ')

const sanitizeSegment = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const isSelectedValue = (value, optionValue, mode) =>
  mode === 'multiple' ? Array.isArray(value) && value.includes(optionValue) : value === optionValue

const MobileChoiceList = ({
  options = [],
  value,
  onChange,
  mode = 'single',
  ariaLabel,
  className = '',
  emptyState = null,
  footerAction = null,
  toggleValue = '',
  getOptionKey,
  testIdPrefix = '',
  showDescriptions = true,
  disabled = false,
}) => {
  const optionRefs = useRef([])
  const sourceOptions = Array.isArray(options) ? options : []
  const toggleOption = toggleValue
    ? sourceOptions.find((option) => String(option?.value || '') === String(toggleValue))
    : null
  const visibleOptions = toggleOption
    ? sourceOptions.filter((option) => String(option?.value || '') !== String(toggleValue))
    : sourceOptions
  const ToggleIcon = toggleOption?.icon
  const resolvedFooterAction =
    footerAction ||
    (toggleOption
      ? {
          label: toggleOption.title || toggleOption.label || 'Show more',
          expanded: /show less|show fewer/i.test(
            String(toggleOption.title || toggleOption.label || ''),
          ),
          icon: ToggleIcon ? <ToggleIcon size={15} /> : null,
          onClick: () => onChange?.(toggleOption.value, toggleOption),
        }
      : null)
  const hasAnyIcons = visibleOptions.some((option) => Boolean(option?.icon))
  const resolvedMode = ['action', 'single', 'multiple'].includes(mode) ? mode : 'single'
  const isSingle = resolvedMode === 'single'
  const isMultiple = resolvedMode === 'multiple'
  const firstEnabledIndex = visibleOptions.findIndex((option) => !disabled && !option?.disabled)
  const selectedIndex = isSingle
    ? visibleOptions.findIndex((option) => isSelectedValue(value, option?.value, resolvedMode))
    : -1
  const tabbableIndex = selectedIndex >= 0 ? selectedIndex : firstEnabledIndex
  const selectedValues = useMemo(() => (Array.isArray(value) ? new Set(value) : new Set()), [value])

  const selectOption = (option) => {
    if (disabled || option?.disabled || typeof onChange !== 'function') return
    onChange(option?.value, option)
  }

  const moveSingleSelection = (event, currentIndex) => {
    if (!isSingle) return
    const direction = ['ArrowDown', 'ArrowRight'].includes(event.key)
      ? 1
      : ['ArrowUp', 'ArrowLeft'].includes(event.key)
        ? -1
        : 0
    if (!direction && event.key !== 'Home' && event.key !== 'End') return

    event.preventDefault()
    const enabledIndexes = visibleOptions
      .map((option, index) => (!disabled && !option?.disabled ? index : -1))
      .filter((index) => index >= 0)
    if (!enabledIndexes.length) return

    let nextIndex
    if (event.key === 'Home') {
      nextIndex = enabledIndexes[0]
    } else if (event.key === 'End') {
      nextIndex = enabledIndexes[enabledIndexes.length - 1]
    } else {
      const currentEnabledIndex = enabledIndexes.indexOf(currentIndex)
      const nextEnabledIndex =
        (currentEnabledIndex + direction + enabledIndexes.length) % enabledIndexes.length
      nextIndex = enabledIndexes[nextEnabledIndex]
    }

    const nextOption = visibleOptions[nextIndex]
    optionRefs.current[nextIndex]?.focus()
    selectOption(nextOption)
  }

  if (!visibleOptions.length && !resolvedFooterAction) return emptyState

  const groupRole = isSingle ? 'radiogroup' : isMultiple ? 'group' : undefined

  return (
    <div
      className={buildClassName(
        'mobile-choice-list',
        !hasAnyIcons ? 'mobile-choice-list--no-icons' : '',
        className,
      )}
    >
      {visibleOptions.length ? (
        <CListGroup className="mobile-choice-list__options" role={groupRole} aria-label={ariaLabel}>
          {visibleOptions.map((option, index) => {
            const optionValue = option?.value
            const title = option?.title || option?.label || String(optionValue || '')
            const description = showDescriptions ? String(option?.description || '').trim() : ''
            const metaLabel = String(option?.metaLabel || '').trim()
            const MetaIcon = option?.metaIconKey === 'check' ? CheckCircle2 : null
            const OptionIcon = option?.icon
            const selected = isMultiple
              ? selectedValues.has(optionValue)
              : isSelectedValue(value, optionValue, resolvedMode)
            const optionDisabled = disabled || Boolean(option?.disabled)
            const key =
              (typeof getOptionKey === 'function' ? getOptionKey(option) : undefined) ||
              optionValue ||
              title
            const testId =
              option?.testId ||
              (testIdPrefix
                ? `${testIdPrefix}-${sanitizeSegment(optionValue || title)}`
                : undefined)
            const optionRole = isSingle ? 'radio' : isMultiple ? 'checkbox' : undefined

            return (
              <CListGroupItem
                key={String(key)}
                className="mobile-choice-list__item"
                role={groupRole ? 'presentation' : undefined}
              >
                <button
                  ref={(node) => {
                    optionRefs.current[index] = node
                  }}
                  type="button"
                  className={buildClassName(
                    'mobile-choice-list__trigger',
                    selected ? 'mobile-choice-list__trigger--selected' : '',
                  )}
                  role={optionRole}
                  aria-checked={optionRole ? selected : undefined}
                  aria-label={option?.ariaLabel}
                  disabled={optionDisabled}
                  tabIndex={isSingle ? (index === tabbableIndex ? 0 : -1) : undefined}
                  data-testid={testId}
                  onKeyDown={(event) => moveSingleSelection(event, index)}
                  onClick={() => selectOption(option)}
                >
                  {hasAnyIcons ? (
                    <span
                      className={buildClassName(
                        'mobile-choice-list__icon',
                        !OptionIcon ? 'mobile-choice-list__icon--empty' : '',
                      )}
                      aria-hidden="true"
                    >
                      {OptionIcon ? <OptionIcon size={18} /> : null}
                    </span>
                  ) : null}
                  <span className="mobile-choice-list__copy">
                    <span className="mobile-choice-list__title-line">
                      <span className="mobile-choice-list__title">{title}</span>
                      {metaLabel ? (
                        <span
                          className={buildClassName(
                            'mobile-choice-list__meta',
                            option?.metaTone === 'success'
                              ? 'mobile-choice-list__meta--success'
                              : '',
                          )}
                        >
                          {MetaIcon ? <MetaIcon size={13} aria-hidden="true" /> : null}
                          <span>{metaLabel}</span>
                        </span>
                      ) : null}
                    </span>
                    {description ? (
                      <span className="mobile-choice-list__description">{description}</span>
                    ) : null}
                  </span>
                  <span
                    className={buildClassName(
                      'mobile-choice-list__indicator',
                      selected ? 'mobile-choice-list__indicator--selected' : '',
                      resolvedMode === 'action' ? 'mobile-choice-list__indicator--action' : '',
                    )}
                    aria-hidden="true"
                  >
                    {resolvedMode === 'action' ? (
                      <ChevronRight size={18} />
                    ) : selected ? (
                      <Check size={15} strokeWidth={2.5} />
                    ) : null}
                  </span>
                </button>
              </CListGroupItem>
            )
          })}
        </CListGroup>
      ) : null}
      {resolvedFooterAction ? (
        <button
          type="button"
          className="mobile-choice-list__footer-action"
          aria-label={resolvedFooterAction.ariaLabel}
          aria-expanded={resolvedFooterAction.expanded}
          disabled={resolvedFooterAction.disabled}
          data-testid={resolvedFooterAction.testId}
          onClick={resolvedFooterAction.onClick}
        >
          {resolvedFooterAction.icon ? (
            <span className="mobile-choice-list__footer-icon" aria-hidden="true">
              {resolvedFooterAction.icon}
            </span>
          ) : null}
          <span>{resolvedFooterAction.label}</span>
        </button>
      ) : null}
    </div>
  )
}

export default MobileChoiceList
