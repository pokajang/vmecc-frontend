import React from 'react'
import { CButton, CFormInput } from '@coreui/react'
import { ChevronDown, ChevronUp, ClipboardCheck } from 'lucide-react'
import CreateActionButton from 'src/components/CreateActionButton'
import MobileChoiceList from 'src/components/report-workflow/MobileChoiceList'
import ResponsiveChoiceSelector from 'src/components/report-workflow/ResponsiveChoiceSelector'
import TypeManagerModal from 'src/components/report-workflow/TypeManagerModal'
import { uid } from '../../utils'
import ReportPhotoSection from '../../shared/emergency-report/ReportPhotoSection'
import {
  ACTIVE_CARD_BG,
  ACTIVE_CARD_BORDER,
  SECTION_META,
  SHOW_LESS_VALUE,
  SHOW_MORE_VALUE,
  TOGGLE_CARD_BG,
  TOGGLE_CARD_BORDER,
  buildInitialOptionsBySection,
  normalizeKey,
  normalizeSection,
} from './postIncidentAnalysisConstants'
import useIsMobile, { ERCO_MOBILE_QUERY } from './useIsMobile'

const MOBILE_SECTION_ORDER = [
  'strengths',
  'resourcesMobilised',
  'improvementOpportunities',
  'photos',
]
const MOBILE_SECTION_LABELS = {
  strengths: 'Strengths',
  resourcesMobilised: 'Resources',
  improvementOpportunities: 'Improvements',
  photos: 'Photos',
}

const PostIncidentAnalysisSection = ({
  value,
  onChange,
  pushToast,
  onBeforeCameraOpen,
  allowCapture = true,
  fieldErrors = {},
  onPhotoProcessingChange,
}) => {
  const section = React.useMemo(() => normalizeSection(value), [value])
  const isMobile = useIsMobile()
  const [showAllBySection, setShowAllBySection] = React.useState({
    strengths: false,
    resourcesMobilised: false,
    improvementOpportunities: false,
  })
  const [optionsBySection, setOptionsBySection] = React.useState(buildInitialOptionsBySection)
  const [addModalSectionKey, setAddModalSectionKey] = React.useState('')
  const [addModalEditMode, setAddModalEditMode] = React.useState(false)
  const [editingItemKey, setEditingItemKey] = React.useState('')
  const [newItemName, setNewItemName] = React.useState('')
  const [addItemError, setAddItemError] = React.useState('')
  const [openMobileSection, setOpenMobileSection] = React.useState('')

  const updateSection = (patch) => {
    if (typeof onChange !== 'function') return
    onChange((currentValue) => {
      const current = normalizeSection(currentValue)
      const resolvedPatch = typeof patch === 'function' ? patch(current) : patch
      return { ...current, ...resolvedPatch }
    })
  }

  const toggleOption = (key, optionValue) => {
    if (optionValue === SHOW_MORE_VALUE || optionValue === SHOW_LESS_VALUE) {
      setShowAllBySection((prev) => ({ ...prev, [key]: optionValue === SHOW_MORE_VALUE }))
      return
    }
    const rows = Array.isArray(section[key]) ? section[key] : []
    const normalizedValue = String(optionValue || '').trim()
    if (!normalizedValue) return

    const exists = rows.includes(normalizedValue)
    const nextRows = exists
      ? rows.filter((row) => row !== normalizedValue)
      : [...rows, normalizedValue]
    updateSection({ [key]: nextRows })
  }

  const getSelectedCount = React.useCallback(
    (key) => {
      if (key === 'photos') return Array.isArray(section.photos) ? section.photos.length : 0
      return Array.isArray(section[key]) ? section[key].length : 0
    },
    [section],
  )

  const getFirstIncompleteMobileSection = React.useCallback(() => {
    return MOBILE_SECTION_ORDER.find((key) => getSelectedCount(key) === 0) || 'strengths'
  }, [getSelectedCount])

  React.useEffect(() => {
    if (!isMobile) return
    if (!openMobileSection) {
      setOpenMobileSection(getFirstIncompleteMobileSection())
    }
  }, [getFirstIncompleteMobileSection, isMobile, openMobileSection])

  React.useEffect(() => {
    if (!isMobile) return
    if (fieldErrors.postIncidentStrengths) setOpenMobileSection('strengths')
    else if (fieldErrors.postIncidentPhotos) setOpenMobileSection('photos')
  }, [fieldErrors.postIncidentPhotos, fieldErrors.postIncidentStrengths, isMobile])

  const buildVisibleOptions = (key) => {
    const sectionMeta = SECTION_META[key] || {}
    const visibleLimit = Number(sectionMeta.visibleLimit) || 3
    const baseOptions = Array.isArray(optionsBySection[key]) ? optionsBySection[key] : []
    const selectedRows = Array.isArray(section[key]) ? section[key] : []

    const mergedMap = new Map()
    baseOptions.forEach((option) => {
      const valueKey = normalizeKey(option?.value)
      if (!valueKey || mergedMap.has(valueKey)) return
      mergedMap.set(valueKey, option)
    })
    selectedRows.forEach((item) => {
      const valueText = String(item || '').trim()
      const valueKey = normalizeKey(valueText)
      if (!valueKey || mergedMap.has(valueKey)) return
      mergedMap.set(valueKey, {
        value: valueText,
        title: valueText,
        description: '',
      })
    })

    const merged = Array.from(mergedMap.values())
    if (merged.length <= visibleLimit) return merged

    if (showAllBySection[key]) {
      return [
        ...merged,
        {
          value: SHOW_LESS_VALUE,
          title: 'Show less',
          description:
            sectionMeta.showLessText ||
            `Show fewer ${SECTION_META[key]?.title?.toLowerCase() || 'options'}.`,
          icon: ChevronUp,
        },
      ]
    }

    return [
      ...merged.slice(0, visibleLimit),
      {
        value: SHOW_MORE_VALUE,
        title: 'Show more',
        description:
          sectionMeta.showMoreText ||
          `View all ${SECTION_META[key]?.title?.toLowerCase() || 'options'}.`,
        icon: ChevronDown,
      },
    ]
  }

  const openAddModal = (key) => {
    setAddModalSectionKey(key)
    setAddModalEditMode(false)
    setEditingItemKey('')
    setNewItemName('')
    setAddItemError('')
  }

  const closeAddModal = () => {
    setAddModalSectionKey('')
    setAddModalEditMode(false)
    setEditingItemKey('')
    setNewItemName('')
    setAddItemError('')
  }

  const saveNewItem = () => {
    const sectionKey = String(addModalSectionKey || '').trim()
    if (!sectionKey) return
    const itemName = String(newItemName || '').trim()
    if (!itemName) {
      setAddItemError('Item name is required.')
      return
    }

    const allOptions = Array.isArray(optionsBySection[sectionKey])
      ? optionsBySection[sectionKey]
      : []
    const editKey = normalizeKey(editingItemKey)
    const exists = allOptions.some((row) => {
      const rowKey = normalizeKey(row?.value)
      if (!rowKey) return false
      if (editKey && rowKey === editKey) return false
      return rowKey === normalizeKey(itemName)
    })
    if (exists) {
      setAddItemError('This item already exists.')
      return
    }

    setOptionsBySection((prev) => {
      const current = Array.isArray(prev[sectionKey]) ? prev[sectionKey] : []
      const next = editKey
        ? current.map((row) => {
            const rowKey = normalizeKey(row?.value)
            if (rowKey !== editKey) return row
            return { value: itemName, title: itemName }
          })
        : [...current, { value: itemName, title: itemName }]
      return {
        ...prev,
        [sectionKey]: next,
      }
    })
    setShowAllBySection((prev) => ({ ...prev, [sectionKey]: true }))

    const selectedRows = Array.isArray(section[sectionKey]) ? section[sectionKey] : []
    if (editKey) {
      const nextSelectedRows = selectedRows
        .map((row) => (normalizeKey(row) === editKey ? itemName : row))
        .reduce((acc, row) => {
          const rowText = String(row || '').trim()
          if (!rowText) return acc
          if (acc.some((item) => normalizeKey(item) === normalizeKey(rowText))) return acc
          acc.push(rowText)
          return acc
        }, [])
      updateSection({ [sectionKey]: nextSelectedRows })
    } else if (!selectedRows.includes(itemName)) {
      updateSection({ [sectionKey]: [...selectedRows, itemName] })
    }
    closeAddModal()
  }

  const getModalManageRows = (key) => {
    const sectionKey = String(key || '').trim()
    if (!sectionKey) return []

    const baseRows = Array.isArray(optionsBySection[sectionKey]) ? optionsBySection[sectionKey] : []
    const selected = Array.isArray(section[sectionKey]) ? section[sectionKey] : []
    const byKey = new Map()

    baseRows.forEach((row) => {
      const keyValue = normalizeKey(row?.value)
      if (!keyValue || byKey.has(keyValue)) return
      byKey.set(keyValue, {
        value: String(row?.value || '').trim(),
        title: String(row?.title || row?.value || '').trim(),
      })
    })
    selected.forEach((row) => {
      const valueText = String(row || '').trim()
      const keyValue = normalizeKey(valueText)
      if (!keyValue || byKey.has(keyValue)) return
      byKey.set(keyValue, {
        value: valueText,
        title: valueText,
      })
    })

    return Array.from(byKey.values()).sort((a, b) =>
      String(a?.title || '').localeCompare(String(b?.title || ''), undefined, {
        sensitivity: 'base',
        numeric: true,
      }),
    )
  }

  const startEditItem = (value) => {
    const itemText = String(value || '').trim()
    if (!itemText) return
    setEditingItemKey(itemText)
    setNewItemName(itemText)
    setAddItemError('')
    setAddModalEditMode(false)
  }

  const removeItem = (sectionKey, value) => {
    const rowKey = normalizeKey(value)
    if (!rowKey) return

    setOptionsBySection((prev) => ({
      ...prev,
      [sectionKey]: (Array.isArray(prev[sectionKey]) ? prev[sectionKey] : []).filter(
        (row) => normalizeKey(row?.value) !== rowKey,
      ),
    }))
    updateSection({
      [sectionKey]: (Array.isArray(section[sectionKey]) ? section[sectionKey] : []).filter(
        (row) => normalizeKey(row) !== rowKey,
      ),
    })
    if (normalizeKey(editingItemKey) === rowKey) {
      setEditingItemKey('')
      setNewItemName('')
      setAddItemError('')
      setAddModalEditMode(true)
    }
  }

  const renderCardSection = (key) => {
    const meta = SECTION_META[key]
    const selectedRows = Array.isArray(section[key]) ? section[key] : []
    const options = buildVisibleOptions(key)
    const sectionColumns =
      key === 'resourcesMobilised' && options.length === 5 ? { xs: 6, md: true } : { xs: 6, md: 3 }

    return (
      <div
        key={key}
        className="d-grid gap-2"
        data-erco-field={key === 'strengths' ? 'postIncidentStrengths' : undefined}
      >
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div className="fw-semibold">{meta.title}</div>
          <CreateActionButton label={meta.addLabel} onClick={() => openAddModal(key)} />
        </div>
        <ResponsiveChoiceSelector
          isMobile={isMobile}
          options={options}
          value={selectedRows}
          onChange={(optionValue) => toggleOption(key, optionValue)}
          selectionMode="multi"
          ariaLabel={meta.title}
          toggleValue={
            options.some((option) => option?.value === SHOW_MORE_VALUE)
              ? SHOW_MORE_VALUE
              : options.some((option) => option?.value === SHOW_LESS_VALUE)
                ? SHOW_LESS_VALUE
                : ''
          }
          variant="compact"
          columns={sectionColumns}
          cardProps={(option, isSelected) => {
            if (option?.value === SHOW_MORE_VALUE || option?.value === SHOW_LESS_VALUE) {
              return {
                bodyClassName: 'd-flex align-items-start',
                paddingClassName: 'p-3',
                style: {
                  backgroundColor: TOGGLE_CARD_BG,
                  borderColor: TOGGLE_CARD_BORDER,
                  borderStyle: 'dashed',
                },
                className: 'text-primary',
                iconContainerClassName: 'bg-body text-primary',
                titleClassName: 'fw-semibold text-primary',
                descriptionClassName: 'mb-0 mt-1 text-body-secondary',
              }
            }

            return {
              icon: null,
              bodyClassName: 'd-flex align-items-start',
              paddingClassName: 'p-3',
              titleClassName: 'fw-normal text-body-secondary',
              ...(isSelected
                ? {
                    style: {
                      backgroundColor: ACTIVE_CARD_BG,
                      borderColor: ACTIVE_CARD_BORDER,
                    },
                  }
                : {}),
            }
          }}
        />
      </div>
    )
  }

  const renderPillSection = (key) => {
    const meta = SECTION_META[key]
    const selectedRows = Array.isArray(section[key]) ? section[key] : []
    const selectedSet = new Set(selectedRows.map(normalizeKey))

    const visibleLimit = isMobile ? 3 : SECTION_META[key]?.visibleLimit || 4
    const showAll = showAllBySection[key]

    const baseOptions = Array.isArray(optionsBySection[key]) ? optionsBySection[key] : []
    const mergedMap = new Map()
    baseOptions.forEach((option) => {
      const valueKey = normalizeKey(option?.value)
      if (!valueKey || mergedMap.has(valueKey)) return
      mergedMap.set(valueKey, option)
    })
    selectedRows.forEach((item) => {
      const valueText = String(item || '').trim()
      const valueKey = normalizeKey(valueText)
      if (!valueKey || mergedMap.has(valueKey)) return
      mergedMap.set(valueKey, { value: valueText, title: valueText })
    })
    const allOptions = Array.from(mergedMap.values())
    const hasMore = !showAll && allOptions.length > visibleLimit
    const options = showAll ? allOptions : allOptions.slice(0, visibleLimit)

    if (isMobile) {
      return (
        <div key={key} className="d-grid gap-2">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div className="fw-semibold">{meta.title}</div>
            <CreateActionButton label={meta.addLabel} onClick={() => openAddModal(key)} />
          </div>
          <MobileChoiceList
            mode="multiple"
            ariaLabel={meta.title}
            options={options}
            value={selectedRows}
            onChange={(optionValue) => toggleOption(key, optionValue)}
            footerAction={
              hasMore || showAll
                ? {
                    label: hasMore ? 'Show all' : 'Show less',
                    expanded: showAll,
                    icon: hasMore ? <ChevronDown size={15} /> : <ChevronUp size={15} />,
                    onClick: () => setShowAllBySection((prev) => ({ ...prev, [key]: !showAll })),
                  }
                : null
            }
          />
        </div>
      )
    }

    return (
      <div key={key} className="d-grid gap-2">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div className="fw-semibold">{meta.title}</div>
          <CreateActionButton label={meta.addLabel} onClick={() => openAddModal(key)} />
        </div>
        <div className="d-flex flex-wrap gap-2">
          {options.map((option) => {
            const isSelected = selectedSet.has(normalizeKey(option.value))
            return (
              <button
                key={option.value}
                type="button"
                className="btn btn-sm rounded-pill px-3 py-1"
                style={
                  isSelected
                    ? {
                        backgroundColor: 'rgba(0,126,122,1)',
                        borderColor: 'rgba(0,126,122,1)',
                        color: '#fff',
                      }
                    : {
                        backgroundColor: 'transparent',
                        border: '1px solid var(--cui-border-color, #d8dbe0)',
                        color: 'var(--cui-body-color)',
                      }
                }
                onClick={() => toggleOption(key, option.value)}
              >
                {option.title}
              </button>
            )
          })}
          {hasMore ? (
            <button
              type="button"
              className="btn btn-sm rounded-pill px-3 py-1 d-inline-flex align-items-center gap-1 text-primary"
              style={{ border: '1px dashed rgba(0,126,122,0.5)', backgroundColor: 'transparent' }}
              onClick={() => setShowAllBySection((prev) => ({ ...prev, [key]: true }))}
            >
              <ChevronDown size={12} />
              Show all
            </button>
          ) : null}
          {showAll ? (
            <button
              type="button"
              className="btn btn-sm rounded-pill px-3 py-1 d-inline-flex align-items-center gap-1 text-primary"
              style={{ border: '1px dashed rgba(0,126,122,0.5)', backgroundColor: 'transparent' }}
              onClick={() => setShowAllBySection((prev) => ({ ...prev, [key]: false }))}
            >
              <ChevronUp size={12} />
              Show less
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  const renderPhotosSection = () => (
    <ReportPhotoSection
      moduleKey="erco"
      photos={section.photos}
      onChange={(photos) => updateSection({ photos })}
      pushToast={pushToast}
      onBeforeCameraOpen={onBeforeCameraOpen}
      allowCapture={allowCapture}
      uploadLabel="Upload incident photos"
      title="Incident photographs"
      required
      error={fieldErrors.postIncidentPhotos}
      descriptionMaxLength={2000}
      onProcessingChange={onPhotoProcessingChange}
      emptyMessage=""
    />
  )

  const renderMobileSectionBody = (key) => {
    if (key === 'resourcesMobilised') return renderPillSection(key)
    if (key === 'photos') return renderPhotosSection()
    return renderCardSection(key)
  }

  const renderMobileAccordionSection = (key) => {
    const isOpen = openMobileSection === key
    const count = getSelectedCount(key)
    const countLabel =
      key === 'photos' ? `${count} photo${count === 1 ? '' : 's'}` : `${count} selected`
    const ToggleIcon = isOpen ? ChevronUp : ChevronDown

    return (
      <section key={key} className="erco-analysis-mobile-section">
        <button
          type="button"
          className="erco-analysis-mobile-section__header"
          aria-expanded={isOpen}
          onClick={() => setOpenMobileSection(key)}
        >
          <span className="erco-analysis-mobile-section__title">
            {MOBILE_SECTION_LABELS[key] || SECTION_META[key]?.title || key}
          </span>
          <span className="erco-analysis-mobile-section__meta">
            {countLabel}
            <ToggleIcon size={15} />
          </span>
        </button>
        {isOpen ? (
          <div className="erco-analysis-mobile-section__body">{renderMobileSectionBody(key)}</div>
        ) : null}
      </section>
    )
  }

  return (
    <div className="d-grid gap-4">
      <TypeManagerModal
        visible={Boolean(addModalSectionKey)}
        mobileDrawer
        mobileDrawerQuery={ERCO_MOBILE_QUERY}
        onClose={closeAddModal}
        editMode={addModalEditMode}
        onSetEditMode={setAddModalEditMode}
        editTitle={`Edit ${SECTION_META[addModalSectionKey]?.title || 'Items'}`}
        addTitle={SECTION_META[addModalSectionKey]?.modalTitle || 'Add Item'}
        options={getModalManageRows(addModalSectionKey)}
        onStartEdit={(row) => startEditItem(row?.value)}
        onRequestDelete={({ value }) => removeItem(addModalSectionKey, value)}
        nameLabel="Item Name"
        nameValue={newItemName}
        onChangeName={(value) => {
          setNewItemName(value)
          if (addItemError) setAddItemError('')
        }}
        namePlaceholder="Enter item name"
        showDescriptionField={false}
        error={addItemError}
        editingKey={editingItemKey}
        editingLabel="Editing item"
        editButtonLabel={SECTION_META[addModalSectionKey]?.editLabel || 'Edit items'}
        onSave={saveNewItem}
        saveLabel="Save Item"
        updateLabel="Update Item"
        showRowIcon={false}
      />

      <div className="d-flex align-items-center gap-2 fw-semibold">
        <ClipboardCheck size={16} />
        Post Incident Analysis
      </div>

      {isMobile ? (
        <div className="erco-analysis-mobile-accordion">
          {MOBILE_SECTION_ORDER.map((key) => renderMobileAccordionSection(key))}
        </div>
      ) : (
        <>
          {renderPillSection('resourcesMobilised')}
          {renderCardSection('strengths')}
          {renderCardSection('improvementOpportunities')}
          {renderPhotosSection()}
        </>
      )}
    </div>
  )
}

export default PostIncidentAnalysisSection
