const MS_PER_DAY = 24 * 60 * 60 * 1000

const parseIsoDateParts = (value) => {
  const match = String(value || '')
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null

  return { year, month, day }
}

const utcDateOnly = ({ year, month, day }) => Date.UTC(year, month - 1, day)

const todayUtcDateOnly = (referenceDate = new Date()) =>
  Date.UTC(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate())

export const calculateFireExtinguisherDaysLeft = (
  certificationValidity,
  referenceDate = new Date(),
) => {
  const parts = parseIsoDateParts(certificationValidity)
  if (!parts) return ''

  return String(Math.round((utcDateOnly(parts) - todayUtcDateOnly(referenceDate)) / MS_PER_DAY))
}
