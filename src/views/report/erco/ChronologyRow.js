import React from 'react'
import { CButton, CCol, CFormInput, CRow, CTooltip } from '@coreui/react'
import { ArrowDown, ArrowUp, GripVertical, Trash2 } from 'lucide-react'
import { addMinutesToTime } from './chronologyUtils'

const ChronologyRow = ({
  row,
  idx,
  rowsCount,
  rowRef,
  eventFieldRefs,
  draggingRowId,
  dragOverRowId,
  draggingEventRowId,
  dragOverEventRowId,
  hoveredEventRowId,
  setHoveredEventRowId,
  focusedEventRowId,
  setFocusedEventRowId,
  swappedRowIds,
  swapEffectScope,
  updateChronologyRow,
  moveChronologyRow,
  removeChronologyRow,
  addChronologyRowAfter,
  handleRowGripPointerDown,
  handleEventGripPointerDown,
  incidentTime,
}) => {
  const isFirst = idx === 0
  const isLast = idx >= rowsCount - 1
  const isOnly = rowsCount <= 1

  const rowSwapStyle =
    swappedRowIds.includes(row.id) && swapEffectScope === 'row'
      ? {
          backgroundColor: 'rgba(0, 126, 122, 0.12)',
          borderRadius: '0.5rem',
          transition: 'background-color 280ms ease',
        }
      : { transition: 'background-color 280ms ease' }

  const eventSwapStyle =
    swappedRowIds.includes(row.id) && swapEffectScope === 'event'
      ? {
          backgroundColor: 'rgba(0, 126, 122, 0.12)',
          borderRadius: '0.5rem',
          transition: 'background-color 280ms ease',
        }
      : { transition: 'background-color 280ms ease' }

  const showEventGrip =
    hoveredEventRowId === row.id || focusedEventRowId === row.id || draggingEventRowId === row.id

  const isRowDragging = draggingRowId === row.id
  const isRowDragTarget = dragOverRowId === row.id && !isRowDragging
  const isEventDragging = draggingEventRowId === row.id
  const isEventDragTarget = dragOverEventRowId === row.id && !isEventDragging

  return (
    <CRow
      ref={rowRef}
      className={[
        'g-2 mb-2 align-items-end',
        isRowDragging ? 'opacity-25' : '',
        isRowDragTarget ? 'border border-primary rounded-2 bg-primary bg-opacity-10' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={rowSwapStyle}
    >
      <CCol xs={5} md={2} className="order-1">
        <CFormInput
          type="time"
          value={row.time}
          placeholder="--:--"
          aria-label={`Time for chronology row ${idx + 1}`}
          onChange={(event) => updateChronologyRow(row.id, { time: event.target.value })}
        />
      </CCol>

      <CCol xs={12} md={8} className="order-3 order-md-2">
        <div
          ref={(el) => {
            // eslint-disable-next-line react-hooks/immutability
            if (el) eventFieldRefs.current[row.id] = el
            else delete eventFieldRefs.current[row.id]
          }}
          className={[
            'position-relative d-flex align-items-center gap-2',
            isEventDragging ? 'opacity-25' : '',
            isEventDragTarget ? 'border border-primary rounded-2 bg-primary bg-opacity-10' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={eventSwapStyle}
          onMouseEnter={() => setHoveredEventRowId(row.id)}
          onMouseLeave={() => setHoveredEventRowId((prev) => (prev === row.id ? null : prev))}
        >
          <CFormInput
            value={row.action}
            aria-label={`Event / Action for chronology row ${idx + 1}`}
            className="pe-5"
            onChange={(e) => updateChronologyRow(row.id, { action: e.target.value })}
            onFocus={() => setFocusedEventRowId(row.id)}
            onBlur={() => setFocusedEventRowId((prev) => (prev === row.id ? null : prev))}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              const baseTime = String(row?.time || incidentTime || '').trim()
              addChronologyRowAfter(row.id, { time: addMinutesToTime(baseTime, 5), action: '' })
            }}
          />
          <div
            className="position-absolute end-0 top-50 translate-middle-y me-2 d-none d-md-flex"
            style={{ opacity: showEventGrip ? 1 : 0.2, transition: 'opacity 150ms ease' }}
          >
            <CTooltip content="Drag event only">
              <CButton
                type="button"
                color="light"
                aria-label={`Drag event only for chronology row ${idx + 1}`}
                className="p-1 border-0 bg-transparent text-body-secondary shadow-none"
                style={{
                  cursor: isEventDragging ? 'grabbing' : 'grab',
                  touchAction: 'none',
                  minWidth: 40,
                  minHeight: 40,
                }}
                onPointerDown={(e) => handleEventGripPointerDown(e, row.id)}
              >
                <GripVertical size={13} />
              </CButton>
            </CTooltip>
          </div>
        </div>
      </CCol>

      <CCol xs={7} md={2} className="order-2 order-md-3 d-flex justify-content-end gap-1">
        <CTooltip content="Drag to reorder row">
          <CButton
            type="button"
            color="light"
            aria-label={`Drag chronology row ${idx + 1}`}
            className="p-1 border-0 bg-transparent text-body-secondary shadow-none d-none d-md-inline-flex"
            style={{
              cursor: isRowDragging ? 'grabbing' : 'grab',
              touchAction: 'none',
              minWidth: 40,
              minHeight: 40,
            }}
            onPointerDown={(e) => handleRowGripPointerDown(e, row.id)}
          >
            <GripVertical size={14} />
          </CButton>
        </CTooltip>

        <CTooltip content={isFirst ? 'This row is already at the top' : 'Move row up'}>
          <span className="d-inline-flex" tabIndex={isFirst ? 0 : -1}>
            <CButton
              type="button"
              color="light"
              disabled={isFirst}
              onClick={() => moveChronologyRow(idx, idx - 1)}
              aria-label={`Move chronology row ${idx + 1} up`}
              className="p-1 border-0 bg-transparent text-body-secondary shadow-none"
              style={{ minWidth: 40, minHeight: 40 }}
            >
              <ArrowUp size={14} />
            </CButton>
          </span>
        </CTooltip>

        <CTooltip content={isLast ? 'This row is already at the bottom' : 'Move row down'}>
          <span className="d-inline-flex" tabIndex={isLast ? 0 : -1}>
            <CButton
              type="button"
              color="light"
              disabled={isLast}
              onClick={() => moveChronologyRow(idx, idx + 1)}
              aria-label={`Move chronology row ${idx + 1} down`}
              className="p-1 border-0 bg-transparent text-body-secondary shadow-none"
              style={{ minWidth: 40, minHeight: 40 }}
            >
              <ArrowDown size={14} />
            </CButton>
          </span>
        </CTooltip>

        {isOnly ? (
          <CTooltip content="Cannot delete the last remaining row.">
            <span className="d-inline-flex" tabIndex={0}>
              <CButton
                type="button"
                color="light"
                disabled
                aria-label="Delete row"
                className="p-1 border-0 bg-transparent text-danger shadow-none"
                style={{ minWidth: 40, minHeight: 40 }}
              >
                <Trash2 size={14} />
              </CButton>
            </span>
          </CTooltip>
        ) : (
          <CTooltip content="Delete row">
            <CButton
              type="button"
              color="light"
              onClick={() => removeChronologyRow(row.id)}
              aria-label="Delete row"
              className="p-1 border-0 bg-transparent text-danger shadow-none"
              style={{ minWidth: 40, minHeight: 40 }}
            >
              <Trash2 size={14} />
            </CButton>
          </CTooltip>
        )}
      </CCol>
    </CRow>
  )
}

export default ChronologyRow
