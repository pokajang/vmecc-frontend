import React from 'react'
import { CButton } from '@coreui/react'
import { Calendar, Pencil } from 'lucide-react'
import ClaimPeriodSection from './ClaimPeriodSection'
import { CLAIM_TYPE_META } from './utils/claimFormUtils'

const ClaimFormHeaderRow = ({
  claimType,
  periodConfirmed,
  periodLabel,
  periodValue,
  periodOptions,
  isClaimTypeLocked,
  onEditType,
  onEditPeriod,
  onConfirmPeriod,
  onPeriodValueChange,
}) => (
  <div className="d-flex flex-wrap align-items-start gap-3">
    <div
      className="rounded-3 border d-flex align-items-center gap-2 px-3 py-3 bg-white"
      style={{ minWidth: 240 }}
    >
      {(() => {
        const meta = CLAIM_TYPE_META[claimType] || CLAIM_TYPE_META.expense
        const Icon = meta.icon
        return (
          <>
            <div
              className="rounded-circle d-inline-flex align-items-center justify-content-center bg-light text-primary"
              style={{ width: 28, height: 28, flex: '0 0 28px' }}
            >
              <Icon size={14} />
            </div>
            <span className="fw-medium">{meta.label}</span>
            {!isClaimTypeLocked && (
              <CButton
                color="light"
                size="sm"
                type="button"
                className="ms-auto d-inline-flex align-items-center justify-content-center"
                style={{ width: 32, height: 32 }}
                onClick={onEditType}
                title="Edit claim type"
              >
                <Pencil size={14} />
              </CButton>
            )}
          </>
        )
      })()}
    </div>
    {periodConfirmed ? (
      <div
        className="rounded-3 border d-flex align-items-center gap-2 px-3 py-3 bg-white"
        style={{ minWidth: 240 }}
      >
        <div
          className="rounded-circle d-inline-flex align-items-center justify-content-center bg-light text-primary"
          style={{ width: 28, height: 28, flex: '0 0 28px' }}
        >
          <Calendar size={14} />
        </div>
        <span className="fw-medium">{periodLabel || periodValue}</span>
        <CButton
          color="light"
          size="sm"
          type="button"
          className="ms-auto d-inline-flex align-items-center justify-content-center"
          style={{ width: 32, height: 32 }}
          onClick={onEditPeriod}
        >
          <Pencil size={14} />
        </CButton>
      </div>
    ) : (
      <ClaimPeriodSection
        options={periodOptions}
        value={periodValue}
        onChange={onPeriodValueChange}
        confirmed={periodConfirmed}
        onConfirm={onConfirmPeriod}
        onChangePeriod={onEditPeriod}
        compact
        frameless
      />
    )}
  </div>
)

export default ClaimFormHeaderRow
