import React from 'react'
import {
  CButton,
  CFormInput,
  CFormLabel,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import { Camera, ChevronDown, ChevronUp, ClipboardCheck, Pencil, Plus, Trash2 } from 'lucide-react'
import CreateActionButton from 'src/components/CreateActionButton'
import IconOptionGrid from 'src/components/IconOptionGrid'
import { uid } from '../../utils'
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
import { compressPhotoFile, isLikelyImageFile, readFileAsDataUrl } from './postIncidentImageUtils'
import useIsMobile from './useIsMobile'

const PostIncidentAnalysisSection = ({ value, onChange, pushToast }) => {
  const section = React.useMemo(() => normalizeSection(value), [value])
  const isMobile = useIsMobile()
  const photoInputRef = React.useRef(null)
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

  const updateSection = (patch) => {
    if (typeof onChange !== 'function') return
    onChange({
      ...section,
      ...patch,
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

  const handleUploadPhotos = async (event) => {
    const MAX_BYTES = 1.5 * 1024 * 1024
    const TARGET_BYTES = 900 * 1024
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return
    try {
      const processed = await Promise.all(
        files.map(async (file) => {
          if (!isLikelyImageFile(file)) {
            return { kind: 'skipped', reason: 'not-image', file }
          }

          let finalFile = file
          let wasCompressed = false
          if (file.size > TARGET_BYTES) {
            finalFile = await compressPhotoFile(file, TARGET_BYTES)
            wasCompressed = finalFile.size < file.size
          }

          if (finalFile.size > MAX_BYTES) {
            return { kind: 'skipped', reason: 'too-large', file: finalFile }
          }

          return { kind: 'ok', file: finalFile, wasCompressed }
        }),
      )

      const accepted = processed.filter((row) => row.kind === 'ok')
      const skippedTooLarge = processed.filter(
        (row) => row.kind === 'skipped' && row.reason === 'too-large',
      ).length
      const skippedNotImage = processed.filter(
        (row) => row.kind === 'skipped' && row.reason === 'not-image',
      ).length
      const compressedCount = accepted.filter((row) => row.wasCompressed).length

      if (accepted.length === 0) {
        if (skippedTooLarge > 0) {
          pushToast?.(
            `${skippedTooLarge} photo${skippedTooLarge > 1 ? 's were' : ' was'} still above 1.5 MB after compression.`,
            { title: 'Photo too large', color: 'warning' },
          )
        }
        if (skippedNotImage > 0) {
          pushToast?.(
            `${skippedNotImage} file${skippedNotImage > 1 ? 's are' : ' is'} not a valid image.`,
            { title: 'Invalid file', color: 'warning' },
          )
        }
        return
      }

      const nextPhotos = await Promise.all(
        accepted.map(async (row) => ({
          id: uid(),
          fileName: String(row?.file?.name || 'photo'),
          url: await readFileAsDataUrl(row.file),
          description: '',
        })),
      )
      updateSection({
        photos: [...(Array.isArray(section.photos) ? section.photos : []), ...nextPhotos],
      })

      const baseMessage = `${accepted.length} photo${accepted.length > 1 ? 's' : ''} added to post-incident analysis.`
      if (compressedCount > 0) {
        pushToast?.(`${baseMessage} ${compressedCount} auto-compressed.`, {
          title: 'Photos updated',
          color: 'success',
        })
      } else {
        pushToast?.(baseMessage, {
          title: 'Photos updated',
          color: 'success',
        })
      }
      if (skippedTooLarge > 0) {
        pushToast?.(
          `${skippedTooLarge} photo${skippedTooLarge > 1 ? 's were' : ' was'} skipped because it remained above 1.5 MB after compression.`,
          { title: 'Photo too large', color: 'warning' },
        )
      }
      if (skippedNotImage > 0) {
        pushToast?.(
          `${skippedNotImage} file${skippedNotImage > 1 ? 's were' : ' was'} skipped because only images are supported.`,
          { title: 'Invalid file', color: 'warning' },
        )
      }
    } catch {
      pushToast?.('Unable to process one or more photos.', {
        title: 'Upload failed',
        color: 'danger',
      })
    } finally {
      event.target.value = ''
    }
    return

    const validFiles = files.filter((f) => f.size <= MAX_BYTES)
    const skipped = files.length - validFiles.length

    if (skipped > 0) {
      pushToast?.(
        `${skipped} photo${skipped > 1 ? 's' : ''} skipped — each file must be under 1.5 MB.`,
        { title: 'Photo too large', color: 'warning' },
      )
    }

    if (validFiles.length === 0) {
      event.target.value = ''
      return
    }

    try {
      const nextPhotos = await Promise.all(
        validFiles.map(async (file) => ({
          id: uid(),
          fileName: String(file?.name || 'photo'),
          url: await readFileAsDataUrl(file),
          description: '',
        })),
      )
      updateSection({
        photos: [...(Array.isArray(section.photos) ? section.photos : []), ...nextPhotos],
      })
      pushToast?.(
        `${validFiles.length} photo${validFiles.length > 1 ? 's' : ''} added to post-incident analysis.`,
        { title: 'Photos updated', color: 'success' },
      )
    } catch {
      pushToast?.('Unable to process one or more photos.', {
        title: 'Upload failed',
        color: 'danger',
      })
    } finally {
      event.target.value = ''
    }
  }

  const removePhoto = (photoId) => {
    const nextPhotos = (Array.isArray(section.photos) ? section.photos : []).filter(
      (photo) => String(photo?.id || '') !== String(photoId || ''),
    )
    updateSection({ photos: nextPhotos })
  }

  const updatePhotoDescription = (photoId, description) => {
    const nextPhotos = (Array.isArray(section.photos) ? section.photos : []).map((photo) => {
      if (String(photo?.id || '') !== String(photoId || '')) return photo
      return {
        ...photo,
        description: String(description || ''),
      }
    })
    updateSection({ photos: nextPhotos })
  }

  const renderCardSection = (key) => {
    const meta = SECTION_META[key]
    const selectedRows = Array.isArray(section[key]) ? section[key] : []
    const options = buildVisibleOptions(key)
    const sectionColumns =
      key === 'resourcesMobilised' && options.length === 5 ? { xs: 6, md: true } : { xs: 6, md: 3 }

    return (
      <div key={key} className="d-grid gap-2">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div className="fw-semibold">{meta.title}</div>
          <CreateActionButton label={meta.addLabel} onClick={() => openAddModal(key)} />
        </div>
        <IconOptionGrid
          options={options}
          value={selectedRows}
          onChange={(optionValue) => toggleOption(key, optionValue)}
          variant="compact"
          columns={sectionColumns}
          showDescription
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
                iconContainerClassName: 'bg-white text-primary',
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

  return (
    <div className="d-grid gap-4">
      <CModal
        visible={Boolean(addModalSectionKey)}
        alignment="center"
        onClose={closeAddModal}
        fullscreen="sm"
        scrollable
      >
        <CModalHeader>
          <CModalTitle>
            {addModalEditMode
              ? `Edit ${SECTION_META[addModalSectionKey]?.title || 'Items'}`
              : SECTION_META[addModalSectionKey]?.modalTitle || 'Add Item'}
          </CModalTitle>
        </CModalHeader>
        <CModalBody className="d-grid gap-3">
          {addModalEditMode ? (
            <div className="d-grid gap-2" style={{ maxHeight: 460, overflowY: 'auto' }}>
              {getModalManageRows(addModalSectionKey).map((row) => (
                <div
                  key={row.value}
                  className="d-flex justify-content-between align-items-center gap-2 border rounded px-2 py-2"
                >
                  <div style={{ minWidth: 0 }} className="text-truncate">
                    {row.title || row.value}
                  </div>
                  <div className="d-flex align-items-center gap-1">
                    <CButton
                      type="button"
                      size="sm"
                      color="link"
                      className="text-primary p-1 d-inline-flex align-items-center bg-transparent border-0 shadow-none"
                      onClick={() => startEditItem(row.value)}
                    >
                      <Pencil size={14} />
                    </CButton>
                    <CButton
                      type="button"
                      size="sm"
                      color="link"
                      className="text-danger p-1 d-inline-flex align-items-center bg-transparent border-0 shadow-none"
                      onClick={() => removeItem(addModalSectionKey, row.value)}
                    >
                      <Trash2 size={14} />
                    </CButton>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div>
                <CFormLabel>Item Name</CFormLabel>
                <CFormInput
                  value={newItemName}
                  invalid={Boolean(addItemError)}
                  placeholder="Enter item name"
                  onChange={(event) => {
                    setNewItemName(event.target.value)
                    if (addItemError) setAddItemError('')
                  }}
                />
              </div>
              {addItemError ? <div className="small text-danger">{addItemError}</div> : null}
              <div className="pt-1">
                <CreateActionButton
                  label={SECTION_META[addModalSectionKey]?.editLabel || 'Edit items'}
                  onClick={() => setAddModalEditMode(true)}
                  size="sm"
                />
              </div>
            </>
          )}
        </CModalBody>
        <CModalFooter>
          {addModalEditMode ? (
            <>
              <CButton color="light" onClick={() => setAddModalEditMode(false)}>
                Back
              </CButton>
              <CButton color="light" onClick={closeAddModal}>
                Close
              </CButton>
            </>
          ) : (
            <>
              <CButton color="light" onClick={closeAddModal}>
                Cancel
              </CButton>
              <CButton color="primary" onClick={saveNewItem}>
                {editingItemKey ? 'Update Item' : 'Save Item'}
              </CButton>
            </>
          )}
        </CModalFooter>
      </CModal>

      <div className="d-flex align-items-center gap-2 fw-semibold">
        <ClipboardCheck size={16} />
        Post Incident Analysis
      </div>

      {renderPillSection('resourcesMobilised')}
      {renderCardSection('strengths')}
      {renderCardSection('improvementOpportunities')}

      <div className="d-grid gap-2">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div className="fw-semibold">Photographs</div>
          <CreateActionButton
            label="Add photo"
            icon={<Camera size={13} className="me-1 align-text-bottom" />}
            onClick={() => photoInputRef.current?.click()}
          />
        </div>
        <CFormInput
          ref={photoInputRef}
          id="post-analysis-photo-upload"
          type="file"
          accept="image/*"
          multiple
          onChange={handleUploadPhotos}
          className="d-none"
        />
        {Array.isArray(section.photos) && section.photos.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {section.photos.map((photo, index) => (
              <div
                key={photo.id || `${photo.fileName || 'photo'}-${index}`}
                className="rounded-3 border border-light-subtle p-2 d-grid gap-2"
              >
                <img
                  src={photo.url}
                  alt={photo.fileName || 'Incident photo'}
                  style={{
                    width: '100%',
                    height: '140px',
                    objectFit: 'cover',
                    borderRadius: '4px',
                  }}
                />
                <div className="small text-truncate">{photo.fileName || 'Photo'}</div>
                <CFormInput
                  size="sm"
                  value={String(photo?.description || '')}
                  placeholder="Add image description"
                  onChange={(event) => updatePhotoDescription(photo.id, event.target.value)}
                />
                <CButton
                  type="button"
                  color="danger"
                  variant="outline"
                  size="sm"
                  className="d-inline-flex align-items-center justify-content-center gap-1"
                  onClick={() => removePhoto(photo.id)}
                >
                  <Trash2 size={14} />
                  Remove
                </CButton>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-body-secondary">No photos uploaded yet.</div>
        )}
      </div>
    </div>
  )
}

export default PostIncidentAnalysisSection
