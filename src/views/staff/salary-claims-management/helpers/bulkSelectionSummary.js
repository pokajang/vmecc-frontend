export const buildBulkSelectionSummary = (
  rows = [],
  {
    predicate = () => true,
    getAmount = () => null,
    formatCurrency = (value) => String(value ?? ''),
    maxItems = 3,
  } = {},
) => {
  const eligibleRows = (Array.isArray(rows) ? rows : []).filter((row) => predicate(row))
  const amountValues = eligibleRows
    .map((row) => Number(getAmount(row)))
    .filter((value) => Number.isFinite(value))
  const totalAmount = amountValues.reduce((sum, value) => sum + value, 0)
  const hasAmountTotal = amountValues.length > 0

  return {
    rows: eligibleRows,
    count: eligibleRows.length,
    sampleItems: eligibleRows.slice(0, maxItems).map((row) => ({
      key: `${String(row?.ownerId || '')}::${String(row?.id || '')}`,
      id: row?.id || '-',
      owner: row?.ownerLabel || row?.submittedBy || row?.employee || '-',
      period: row?.period || '-',
      amount: hasAmountTotal ? formatCurrency(Number(getAmount(row)) || 0) : '',
    })),
    remainingCount: Math.max(eligibleRows.length - maxItems, 0),
    totalAmount,
    totalLabel: hasAmountTotal ? formatCurrency(totalAmount) : '',
  }
}

export default buildBulkSelectionSummary
