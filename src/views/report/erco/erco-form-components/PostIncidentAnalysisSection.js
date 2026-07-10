import React from 'react'
import { CAlert, CButton, CFormInput } from '@coreui/react'
import { Camera, ChevronDown, ChevronUp, ClipboardCheck, Trash2 } from 'lucide-react'
import CreateActionButton from 'src/components/CreateActionButton'
import IconOptionGrid from 'src/components/IconOptionGrid'
import TypeManagerModal from 'src/components/report-workflow/TypeManagerModal'
import { ReportPhotoImage } from 'src/components/report-workflow/ReportViewComponents'
import { uid } from '../../utils'
import {
  deleteReportMedia,
  getReportPhotoBytes,
  reportPhotoFailureMessage,
  uploadReportPhotosSequentially,
} from 'src/services/api/reportMediaApi'
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
import useIsMobile from './useIsMobile'
import {
  clearPendingCameraOperation,
  getInterruptedCameraFallback,
  isLikelyEmbeddedBrowser,
  markPendingCameraOperation,
  markPendingCameraUploadStarted,
  subscribeToCameraReturn,
} from 'src/utils/cameraRecovery'

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

const PostIncidentAnalysisSection = ({ value, onChange, pushToast, onBeforeCameraOpen }) => {
  const section = React.useMemo(() => normalizeSection(value), [value])
  const isMobile = useIsMobile()
  const cameraPhotoInputRef = React.useRef(null)
  const uploadPhotoInputRef = React.useRef(null)
  const photoOperationRef = React.useRef(0)
  const photoAbortRef = React.useRef(null)
  const [isPhotoProcessing, setIsPhotoProcessing] = React.useState(false)
  const [cameraPhotoFallback, setCameraPhotoFallback] = React.useState(
    () => getInterruptedCameraFallback('erco')?.message || '',
  )
  const [photoUploadProgress, setPhotoUploadProgress] = React.useState(null)
  React.useEffect(() => () => photoAbortRef.current?.abort(), [])
  React.useEffect(
    () =>
      subscribeToCameraReturn('erco', (fallback) =>
        setCameraPhotoFallback(fallback?.message || ''),
      ),
    [],
  )
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

  const handleUploadPhotos = async (event, source = 'upload') => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (files.length === 0) return
    if (source === 'camera') markPendingCameraUploadStarted('erco')
    const operation = ++photoOperationRef.current
    photoAbortRef.current?.abort()
    const controller = new AbortController()
    photoAbortRef.current = controller
    setIsPhotoProcessing(true)
    setCameraPhotoFallback('')
    const existing = Array.isArray(section.photos) ? section.photos : []
    const remaining = Math.max(0, 10 - existing.length)
    if (!remaining) {
      pushToast?.('Maximum 10 photos are allowed.', {
        title: 'Photo limit reached',
        color: 'warning',
      })
      setIsPhotoProcessing(false)
      return
    }
    try {
      const failures = []
      const uploaded = await uploadReportPhotosSequentially({
        files: files.slice(0, remaining),
        module: 'erco',
        source,
        signal: controller.signal,
        onFailure: (failure) => failures.push(failure),
        onProgress: (progress) => setPhotoUploadProgress({ ...progress, retrying: false }),
        onRetry: (progress) => setPhotoUploadProgress({ ...progress, percent: 0, retrying: true }),
      })
      if (operation !== photoOperationRef.current) {
        await Promise.all(uploaded.map((photo) => deleteReportMedia(photo.mediaId)))
        return
      }
      let total = existing.reduce((sum, photo) => sum + getReportPhotoBytes(photo), 0)
      const accepted = []
      for (const photo of uploaded) {
        if (total + photo.sizeBytes > 12 * 1024 * 1024) {
          await deleteReportMedia(photo.mediaId)
          failures.push({ code: 'total_size_exceeded', fileName: photo.fileName })
        } else {
          total += photo.sizeBytes
          accepted.push({ id: uid(), ...photo, description: '' })
        }
      }
      if (accepted.length) {
        updateSection((current) => ({
          photos: [...(Array.isArray(current.photos) ? current.photos : []), ...accepted],
        }))
        pushToast?.(
          `${accepted.length} photo${accepted.length > 1 ? 's' : ''} added to post-incident analysis.`,
          { title: 'Photos updated', color: 'success' },
        )
        clearPendingCameraOperation()
      }
      failures.forEach((failure) =>
        pushToast?.(
          failure.code === 'total_size_exceeded'
            ? 'Total photo size must be 12 MB or smaller.'
            : reportPhotoFailureMessage(failure.code, failure.fileName),
          { title: 'Upload warning', color: 'warning' },
        ),
      )
      if (source === 'camera' && failures.length)
        setCameraPhotoFallback(reportPhotoFailureMessage(failures[0].code, failures[0].fileName))
    } catch (error) {
      if (error?.name !== 'AbortError')
        setCameraPhotoFallback(source === 'camera' ? reportPhotoFailureMessage(error?.code) : '')
    } finally {
      if (operation === photoOperationRef.current) setIsPhotoProcessing(false)
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
    <div className="d-grid gap-2">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div className="fw-semibold">Photographs</div>
        <CreateActionButton
          label="Add photo"
          icon={<Camera size={13} className="me-1 align-text-bottom" />}
          onClick={() => {
            if (navigator.onLine === false) {
              setCameraPhotoFallback('Connect to the internet before taking or uploading a photo.')
              return
            }
            if (isLikelyEmbeddedBrowser()) {
              setCameraPhotoFallback(
                'Open this page in Safari, Chrome, Edge, or Samsung Internet to use the camera.',
              )
              return
            }
            markPendingCameraOperation({
              module: 'erco',
              targetKind: 'postIncidentAnalysis',
              photosKey: 'photos',
            })
            try {
              Promise.resolve(onBeforeCameraOpen?.()).catch(() => {})
            } catch {
              // Draft persistence is best-effort and must not block the native camera.
            }
            cameraPhotoInputRef.current?.click()
          }}
          disabled={isPhotoProcessing}
        />
        <CButton
          type="button"
          color="secondary"
          variant="outline"
          size="sm"
          disabled={isPhotoProcessing}
          onClick={() => uploadPhotoInputRef.current?.click()}
        >
          Upload photos
        </CButton>
      </div>
      <CFormInput
        ref={cameraPhotoInputRef}
        id="post-analysis-photo-upload"
        type="file"
        aria-label="Take post-incident photo"
        accept="image/*"
        capture="environment"
        onChange={(event) => handleUploadPhotos(event, 'camera')}
        className="d-none"
        disabled={isPhotoProcessing}
      />
      <CFormInput
        ref={uploadPhotoInputRef}
        type="file"
        aria-label="Upload post-incident photos"
        accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple
        onChange={(event) => handleUploadPhotos(event, 'upload')}
        className="d-none"
        disabled={isPhotoProcessing}
      />
      {cameraPhotoFallback ? (
        <CAlert color="warning" className="mb-0">
          {cameraPhotoFallback}{' '}
          <CButton
            type="button"
            color="warning"
            size="sm"
            className="ms-2"
            onClick={() => uploadPhotoInputRef.current?.click()}
          >
            Upload photo
          </CButton>
        </CAlert>
      ) : null}
      {isPhotoProcessing ? (
        <div className="small text-body-secondary" role="status">
          {photoUploadProgress?.retrying ? 'Retrying photo upload' : 'Uploading photo'}{' '}
          {Number(photoUploadProgress?.percent || 0)}%
        </div>
      ) : null}
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
              <ReportPhotoImage
                photo={photo}
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
                aria-label={`Description for ${photo.fileName || 'photo'}`}
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
        <div className="rounded-3 border border-light-subtle bg-light-subtle p-3 text-body-secondary">
          No photos yet. Upload photos to continue.
        </div>
      )}
    </div>
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
