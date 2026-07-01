import React, { useMemo, useState } from 'react'
import { CButton, CFormInput } from '@coreui/react'
import { X } from 'lucide-react'
import IconOptionGrid from 'src/components/IconOptionGrid'

export const INSPECTION_LOCATION_SEARCH_THRESHOLD = 12

const normalizeSearchText = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')

const getOptionSearchText = (option = {}) =>
  normalizeSearchText(
    [option.title, option.label, option.value, option.description].filter(Boolean).join(' '),
  )

const withoutToggleOption = (options = [], toggleValue = '') =>
  (Array.isArray(options) ? options : []).filter(
    (option) => String(option?.value || '') !== String(toggleValue || ''),
  )

const InspectionLocationOptionPicker = ({
  options = [],
  visibleOptions = [],
  value,
  onChange,
  searchPlaceholder = 'Search location...',
  searchAriaLabel = 'Search locations',
  clearSearchAriaLabel = 'Clear location search',
  emptySearchMessage = 'No locations match this search.',
  threshold = INSPECTION_LOCATION_SEARCH_THRESHOLD,
  toggleValue = '',
  variant = 'compact',
  showDescription = true,
  columns = { xs: 6, md: 3 },
  cardProps = {},
  getOptionKey,
  ariaLabel,
  testIdPrefix,
}) => {
  const searchableOptions = useMemo(
    () => withoutToggleOption(options, toggleValue),
    [options, toggleValue],
  )
  const searchScopeKey = useMemo(
    () => searchableOptions.map((option) => String(option?.value || '')).join('\u001f'),
    [searchableOptions],
  )
  const [searchState, setSearchState] = useState({ scopeKey: '', text: '' })
  const shouldShowSearch = searchableOptions.length > threshold
  const searchText =
    shouldShowSearch && searchState.scopeKey === searchScopeKey ? searchState.text : ''
  const normalizedSearch = normalizeSearchText(searchText)

  const displayedOptions = useMemo(() => {
    if (!shouldShowSearch || !normalizedSearch) return visibleOptions

    return searchableOptions.filter((option) =>
      getOptionSearchText(option).includes(normalizedSearch),
    )
  }, [normalizedSearch, searchableOptions, shouldShowSearch, visibleOptions])

  const emptyState =
    shouldShowSearch && normalizedSearch ? (
      <div className="rounded-3 border bg-light-subtle p-3 text-body-secondary">
        {emptySearchMessage}
      </div>
    ) : null

  return (
    <div className="d-grid gap-3">
      {shouldShowSearch ? (
        <div className="d-flex align-items-center gap-2">
          <CFormInput
            value={searchText}
            placeholder={searchPlaceholder}
            aria-label={searchAriaLabel}
            onChange={(event) =>
              setSearchState({ scopeKey: searchScopeKey, text: event.target.value })
            }
          />
          {searchText ? (
            <CButton
              type="button"
              color="secondary"
              variant="outline"
              className="inspection-compact-action-btn d-inline-flex align-items-center justify-content-center"
              aria-label={clearSearchAriaLabel}
              onClick={() => setSearchState({ scopeKey: searchScopeKey, text: '' })}
            >
              <X size={16} />
            </CButton>
          ) : null}
        </div>
      ) : null}

      <IconOptionGrid
        options={displayedOptions}
        value={value}
        onChange={onChange}
        variant={variant}
        showDescription={showDescription}
        columns={columns}
        cardProps={cardProps}
        getOptionKey={getOptionKey}
        ariaLabel={ariaLabel}
        testIdPrefix={testIdPrefix}
        emptyState={emptyState}
      />
    </div>
  )
}

export default InspectionLocationOptionPicker
