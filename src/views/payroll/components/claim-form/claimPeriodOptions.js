export const buildClaimPeriodOptions = (monthsBack = 2, locale = 'en-MY') => {
  const options = []
  const today = new Date()
  const anchor = new Date(today.getFullYear(), today.getMonth(), 1)
  for (let offset = 0; offset <= monthsBack; offset += 1) {
    const date = new Date(anchor.getFullYear(), anchor.getMonth() - offset, 1)
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const label = date.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
    options.push({ value, label })
  }
  return options
}
