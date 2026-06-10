import { buildClaimHistoryEntries as buildCanonicalClaimHistoryEntries } from 'src/components/auditHistory'

export const truncateAttachmentLabel = (name) => {
  const value = String(name || '')
  if (!value) return ''
  if (value.length <= 18) return value
  return `${value.slice(0, 12)}...${value.slice(-4)}`
}

export const buildSubmittedClaimItems = (selectedClaim, parseAmount) => {
  if (!selectedClaim) return []
  if (Array.isArray(selectedClaim.items) && selectedClaim.items.length > 0) {
    return selectedClaim.items.map((item, index) => ({
      id: `${selectedClaim.id}-${index}`,
      title: item.category || item.claimType || selectedClaim.category || 'Claim item',
      date: item.expenseDate || item.claimDate || selectedClaim.submittedAt || '',
      note: item.lineNotes || item.notes || '',
      attachmentId:
        Number(item.attachmentId || item.attachment_id || item?.attachment?.id || 0) || null,
      attachmentName: item.attachmentName || '',
      attachmentMimeType: String(
        item.attachmentMimeType || item.attachment_mime_type || item?.attachment?.mime_type || '',
      ).trim(),
      attachmentSizeBytes:
        Number(
          item.attachmentSizeBytes || item.attachment_size_bytes || item?.attachment?.size || 0,
        ) || 0,
      amount: parseAmount(item.amount),
      raw: item,
    }))
  }
  return [
    {
      id: `${selectedClaim.id}-summary`,
      title: selectedClaim.category || 'Claim item',
      date: selectedClaim.submittedAt || '',
      note: selectedClaim.notes || 'No line item details were saved for this submission.',
      attachmentId:
        Number(
          selectedClaim.attachmentId ||
            selectedClaim.attachment_id ||
            selectedClaim?.attachment?.id ||
            0,
        ) || null,
      attachmentName: selectedClaim.attachmentName || '',
      attachmentMimeType: String(
        selectedClaim.attachmentMimeType ||
          selectedClaim.attachment_mime_type ||
          selectedClaim?.attachment?.mime_type ||
          '',
      ).trim(),
      attachmentSizeBytes:
        Number(
          selectedClaim.attachmentSizeBytes ||
            selectedClaim.attachment_size_bytes ||
            selectedClaim?.attachment?.size ||
            0,
        ) || 0,
      amount: parseAmount(selectedClaim.amount),
      raw: {
        category: selectedClaim.category || '',
        expenseDate: selectedClaim.submittedAt || '',
        lineNotes: selectedClaim.notes || '',
        attachmentId:
          Number(
            selectedClaim.attachmentId ||
              selectedClaim.attachment_id ||
              selectedClaim?.attachment?.id ||
              0,
          ) || null,
        attachmentName: selectedClaim.attachmentName || '',
        attachmentMimeType:
          selectedClaim.attachmentMimeType ||
          selectedClaim.attachment_mime_type ||
          selectedClaim?.attachment?.mime_type ||
          '',
        attachmentSizeBytes:
          Number(
            selectedClaim.attachmentSizeBytes ||
              selectedClaim.attachment_size_bytes ||
              selectedClaim?.attachment?.size ||
              0,
          ) || 0,
        amount: selectedClaim.amount,
      },
    },
  ]
}

export const buildSelectedClaimItemDetails = ({
  selectedClaim,
  selectedClaimItem,
  formatDate,
  formatCurrency,
}) => {
  if (!selectedClaimItem) return []
  const raw =
    selectedClaimItem.raw && typeof selectedClaimItem.raw === 'object' ? selectedClaimItem.raw : {}
  const claimType = String(selectedClaim?.type || '').trim()
  const details = []
  const addDetail = (label, value, { always = false } = {}) => {
    const hasValue = !(
      value === null ||
      typeof value === 'undefined' ||
      String(value).trim() === ''
    )
    if (!always && !hasValue) return
    details.push({ label, value: hasValue ? value : '-' })
  }

  if (claimType === 'salary') {
    addDetail('Adjustment Type', raw.claimType || selectedClaimItem.title || '-', { always: true })
    addDetail(
      'Claim Date',
      raw.claimDate
        ? formatDate(raw.claimDate)
        : selectedClaimItem.date
          ? formatDate(selectedClaimItem.date)
          : '-',
      { always: true },
    )
    addDetail('Amount', formatCurrency(selectedClaimItem.amount), { always: true })
    addDetail('Remarks', selectedClaimItem.note || '-', { always: true })
    addDetail('Attachment', selectedClaimItem.attachmentName || '-', {
      always: true,
    })
    return details
  }

  const category = String(raw.category || selectedClaimItem.title || '').trim()
  addDetail('Category', category || selectedClaimItem.title || '-', { always: true })
  addDetail('Date', selectedClaimItem.date ? formatDate(selectedClaimItem.date) : '-', {
    always: true,
  })
  addDetail('Amount', formatCurrency(selectedClaimItem.amount), { always: true })
  addDetail('Remarks', selectedClaimItem.note || '-', { always: true })
  addDetail('Attachment', selectedClaimItem.attachmentName || '-', { always: true })

  if (category === 'Mileage') {
    addDetail('From Location', raw.fromLocation)
    addDetail('To Location', raw.toLocation)
    addDetail('Distance KM', raw.distanceKm)
    addDetail('Rate Per KM', raw.ratePerKm)
  }
  if (category === 'Travel' || category === 'Hotel') {
    addDetail('Destination', raw.destination)
    addDetail('Trip Date From', raw.tripDateFrom ? formatDate(raw.tripDateFrom) : '')
    addDetail('Trip Date To', raw.tripDateTo ? formatDate(raw.tripDateTo) : '')
  }
  if (category === 'Mobile' || category === 'Internet') {
    addDetail('Billing Period', raw.billedPeriod)
  }
  if (claimType === 'other') {
    addDetail('Approval Note', raw.approvalNote)
  }

  return details
}

export const buildClaimHistoryEntries = (selectedClaim) => {
  return buildCanonicalClaimHistoryEntries(selectedClaim)
}
