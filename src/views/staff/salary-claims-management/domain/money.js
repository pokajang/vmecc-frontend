export const parseAmount = (value) => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export const roundMoney = (value) => Math.round(parseAmount(value) * 100) / 100
