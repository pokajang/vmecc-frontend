import React from 'react'
import { CBadge, CButton, CCard, CCardBody, CCardHeader } from '@coreui/react'
import { Pencil, Trash2 } from 'lucide-react'
import CreateActionButton from 'src/components/CreateActionButton'
import { formatCurrency, formatDate, parseAmount } from './utils/claimFormUtils'
import { getItemSummaryText } from './utils/claimSubmissionUtils'

const ClaimSubmissionSavedItemsCard = ({
  isExceptionalClaim,
  savedItems,
  editingIndex,
  totalAmount,
  onAddItem,
  onEditItem,
  onRemoveItem,
  onPreviewAttachment,
}) => (
  <CCard>
    <CCardHeader className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2">
      <span>{isExceptionalClaim ? 'Saved Exceptional Items' : 'Saved Claim Items'}</span>
      <CreateActionButton
        label={isExceptionalClaim ? 'Add Exceptional Item' : 'Add Item'}
        onClick={onAddItem}
      />
    </CCardHeader>
    <CCardBody className="d-grid gap-3">
      {savedItems.length === 0 ? (
        <div className="text-body-secondary">
          {isExceptionalClaim
            ? 'No exceptional items yet. Add the first exception entry for review.'
            : 'No saved claim items yet. Start by adding the first claim item.'}
        </div>
      ) : (
        <div className="d-grid gap-2">
          {savedItems.map((item, index) => (
            <div
              key={`${item.category}-${item.expenseDate}-${index}`}
              className="d-flex align-items-start gap-3 border-bottom pb-3"
            >
              <div className="d-flex flex-column align-items-center gap-2">
                <CButton
                  color="link"
                  size="sm"
                  className="d-inline-flex align-items-center justify-content-center p-0 text-body-secondary"
                  onClick={() => onEditItem(index)}
                >
                  <Pencil size={14} />
                </CButton>
                <CButton
                  color="link"
                  size="sm"
                  className="d-inline-flex align-items-center justify-content-center p-0 text-danger"
                  onClick={() => onRemoveItem(index)}
                >
                  <Trash2 size={14} />
                </CButton>
              </div>
              <div className="flex-grow-1">
                <div className="d-flex align-items-center flex-wrap gap-2">
                  <span className="fw-semibold">{item.category}</span>
                  {item.expenseDate && (
                    <span className="small text-body-secondary">
                      {formatDate(item.expenseDate)}
                    </span>
                  )}
                  {item.attachmentName && (
                    <CBadge
                      color="light"
                      className="text-body-secondary"
                      role="button"
                      style={{ cursor: 'pointer' }}
                      title="Preview attachment"
                      onClick={() => onPreviewAttachment(item)}
                    >
                      {item.attachmentName.length > 18
                        ? `${item.attachmentName.slice(0, 12)}...${item.attachmentName.slice(-4)}`
                        : item.attachmentName}
                    </CBadge>
                  )}
                  {editingIndex === index && <CBadge color="info">Editing</CBadge>}
                </div>
                <div className="small text-body-secondary mt-1">{getItemSummaryText(item)}</div>
              </div>
              <div className="fw-semibold text-nowrap">
                {formatCurrency(parseAmount(item.amount))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-1 d-flex justify-content-between align-items-center">
        <span className="fw-semibold">
          {isExceptionalClaim ? 'Total Exceptional Claim Amount' : 'Total Claim Amount'}
        </span>
        <span className="h5 mb-0">{formatCurrency(totalAmount)}</span>
      </div>
    </CCardBody>
  </CCard>
)

export default ClaimSubmissionSavedItemsCard
