import { SALARY_STATUTORY_RATES_KEY } from './constants'

export const defaultSalaryStatutoryRates = () => ({
  epf: { employeeRate: 0.11, employerRate: 0.13 },
  perkeso: { employeeRate: 0.005, employerRate: 0.005 },
  sip: { employeeRate: 0.002, employerRate: 0.002 },
  updatedAt: null,
  updatedBy: '',
})

const normalizeRateValue = (value, fallback) => {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed) || parsed < 0) return fallback
  return parsed
}

export const normalizeSalaryStatutoryRates = (value = {}) => {
  const defaults = defaultSalaryStatutoryRates()
  return {
    epf: {
      employeeRate: normalizeRateValue(value?.epf?.employeeRate, defaults.epf.employeeRate),
      employerRate: normalizeRateValue(value?.epf?.employerRate, defaults.epf.employerRate),
    },
    perkeso: {
      employeeRate: normalizeRateValue(value?.perkeso?.employeeRate, defaults.perkeso.employeeRate),
      employerRate: normalizeRateValue(value?.perkeso?.employerRate, defaults.perkeso.employerRate),
    },
    sip: {
      employeeRate: normalizeRateValue(value?.sip?.employeeRate, defaults.sip.employeeRate),
      employerRate: normalizeRateValue(value?.sip?.employerRate, defaults.sip.employerRate),
    },
    updatedAt: value?.updatedAt || null,
    updatedBy: value?.updatedBy || '',
  }
}

export const loadSalaryStatutoryRates = () => {
  try {
    const raw = localStorage.getItem(SALARY_STATUTORY_RATES_KEY)
    if (!raw) return defaultSalaryStatutoryRates()
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return defaultSalaryStatutoryRates()
    return normalizeSalaryStatutoryRates(parsed)
  } catch {
    return defaultSalaryStatutoryRates()
  }
}

export const saveSalaryStatutoryRates = (next) => {
  try {
    localStorage.setItem(
      SALARY_STATUTORY_RATES_KEY,
      JSON.stringify(normalizeSalaryStatutoryRates(next)),
    )
    return true
  } catch {
    return false
  }
}
