import { EPF_CATEGORY, SOCSO_CATEGORY } from './constants'
import { parseAmount, roundMoney } from './money'

const ceilRinggit = (value) => Math.ceil(Number(value) || 0)

const getUpperBand = (wage, bandSize) => Math.ceil(wage / bandSize) * bandSize

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100

const getEpfConfig = (category) => {
  switch (category) {
    case EPF_CATEGORY.PART_A_UNDER_60:
      return {
        tableBased: true,
        lowThreshold: 5000,
        highThreshold: 20000,
        lowBand: 20,
        midBand: 100,
        rates: {
          low: { employer: 0.13, employee: 0.11 },
          mid: { employer: 0.12, employee: 0.11 },
          high: { employer: 0.12, employee: 0.11 },
        },
        bonusCrossing5000EmployerRate: 0.13,
      }
    case EPF_CATEGORY.PART_C_60_AND_ABOVE:
      return {
        tableBased: true,
        lowThreshold: 5000,
        highThreshold: 20000,
        lowBand: 20,
        midBand: 100,
        rates: {
          low: { employer: 0.065, employee: 0.055 },
          mid: { employer: 0.06, employee: 0.055 },
          high: { employer: 0.06, employee: 0.055 },
        },
        bonusCrossing5000EmployerRate: 0.065,
      }
    case EPF_CATEGORY.PART_E_MALAYSIAN_60_AND_ABOVE:
      return {
        tableBased: true,
        lowThreshold: 5000,
        highThreshold: 20000,
        lowBand: 20,
        midBand: 100,
        rates: {
          low: { employer: 0.04, employee: 0.0 },
          mid: { employer: 0.04, employee: 0.0 },
          high: { employer: 0.04, employee: 0.0 },
        },
        bonusCrossing5000EmployerRate: 0.04,
      }
    case EPF_CATEGORY.PART_F_NON_MALAYSIAN:
      return {
        tableBased: false,
        rates: {
          all: { employer: 0.02, employee: 0.02 },
        },
      }
    default:
      return null
  }
}

const calculateEpfExactSplit = (wage, employerRate, employeeRate) => {
  const employerExact = round2(wage * employerRate)
  const employeeExact = round2(wage * employeeRate)
  const totalRounded = ceilRinggit(round2(employerExact + employeeExact))
  const employee = ceilRinggit(employeeExact)
  const employer = Math.max(totalRounded - employee, 0)
  return {
    employee,
    employer,
    total: totalRounded,
  }
}

export const calculateEPF = ({
  wage,
  category = EPF_CATEGORY.PART_A_UNDER_60,
  bonusCrosses5000FromAtMost5000 = false,
} = {}) => {
  const monthlyWage = parseAmount(wage)
  if (monthlyWage <= 0 || monthlyWage <= 10) {
    return {
      employee: 0,
      employer: 0,
      total: 0,
      category,
      method: 'nil',
      baseWage: monthlyWage,
    }
  }

  const cfg = getEpfConfig(category)
  if (!cfg) {
    return {
      employee: 0,
      employer: 0,
      total: 0,
      category,
      method: 'unsupported_category',
      baseWage: monthlyWage,
    }
  }

  if (!cfg.tableBased) {
    const split = calculateEpfExactSplit(
      monthlyWage,
      cfg.rates.all.employer,
      cfg.rates.all.employee,
    )
    return {
      ...split,
      category,
      method: 'exact_percentage',
      baseWage: monthlyWage,
    }
  }

  if (bonusCrosses5000FromAtMost5000 && monthlyWage > cfg.lowThreshold) {
    const split = calculateEpfExactSplit(
      monthlyWage,
      cfg.bonusCrossing5000EmployerRate,
      cfg.rates.high.employee,
    )
    return {
      ...split,
      category,
      method: 'bonus_special_rule',
      baseWage: monthlyWage,
    }
  }

  if (monthlyWage > 10 && monthlyWage <= cfg.lowThreshold) {
    const upperBand = getUpperBand(monthlyWage, cfg.lowBand)
    const employee = ceilRinggit(upperBand * cfg.rates.low.employee)
    const employer = ceilRinggit(upperBand * cfg.rates.low.employer)
    return {
      employee,
      employer,
      total: employee + employer,
      category,
      method: 'table_rm20_band',
      baseWage: monthlyWage,
      upperBand,
    }
  }

  if (monthlyWage > cfg.lowThreshold && monthlyWage <= cfg.highThreshold) {
    const upperBand = getUpperBand(monthlyWage, cfg.midBand)
    const employee = ceilRinggit(upperBand * cfg.rates.mid.employee)
    const employer = ceilRinggit(upperBand * cfg.rates.mid.employer)
    return {
      employee,
      employer,
      total: employee + employer,
      category,
      method: 'table_rm100_band',
      baseWage: monthlyWage,
      upperBand,
    }
  }

  const split = calculateEpfExactSplit(
    monthlyWage,
    cfg.rates.high.employer,
    cfg.rates.high.employee,
  )
  return {
    ...split,
    category,
    method: 'exact_percentage',
    baseWage: monthlyWage,
  }
}

const WAGE_BANDS = [
  { no: 1, minExclusive: 0, maxInclusive: 30 },
  { no: 2, minExclusive: 30, maxInclusive: 50 },
  { no: 3, minExclusive: 50, maxInclusive: 70 },
  { no: 4, minExclusive: 70, maxInclusive: 100 },
  { no: 5, minExclusive: 100, maxInclusive: 140 },
  { no: 6, minExclusive: 140, maxInclusive: 200 },
  { no: 7, minExclusive: 200, maxInclusive: 300 },
  { no: 8, minExclusive: 300, maxInclusive: 400 },
  { no: 9, minExclusive: 400, maxInclusive: 500 },
  { no: 10, minExclusive: 500, maxInclusive: 600 },
  { no: 11, minExclusive: 600, maxInclusive: 700 },
  { no: 12, minExclusive: 700, maxInclusive: 800 },
  { no: 13, minExclusive: 800, maxInclusive: 900 },
  { no: 14, minExclusive: 900, maxInclusive: 1000 },
  { no: 15, minExclusive: 1000, maxInclusive: 1100 },
  { no: 16, minExclusive: 1100, maxInclusive: 1200 },
  { no: 17, minExclusive: 1200, maxInclusive: 1300 },
  { no: 18, minExclusive: 1300, maxInclusive: 1400 },
  { no: 19, minExclusive: 1400, maxInclusive: 1500 },
  { no: 20, minExclusive: 1500, maxInclusive: 1600 },
  { no: 21, minExclusive: 1600, maxInclusive: 1700 },
  { no: 22, minExclusive: 1700, maxInclusive: 1800 },
  { no: 23, minExclusive: 1800, maxInclusive: 1900 },
  { no: 24, minExclusive: 1900, maxInclusive: 2000 },
  { no: 25, minExclusive: 2000, maxInclusive: 2100 },
  { no: 26, minExclusive: 2100, maxInclusive: 2200 },
  { no: 27, minExclusive: 2200, maxInclusive: 2300 },
  { no: 28, minExclusive: 2300, maxInclusive: 2400 },
  { no: 29, minExclusive: 2400, maxInclusive: 2500 },
  { no: 30, minExclusive: 2500, maxInclusive: 2600 },
  { no: 31, minExclusive: 2600, maxInclusive: 2700 },
  { no: 32, minExclusive: 2700, maxInclusive: 2800 },
  { no: 33, minExclusive: 2800, maxInclusive: 2900 },
  { no: 34, minExclusive: 2900, maxInclusive: 3000 },
  { no: 35, minExclusive: 3000, maxInclusive: 3100 },
  { no: 36, minExclusive: 3100, maxInclusive: 3200 },
  { no: 37, minExclusive: 3200, maxInclusive: 3300 },
  { no: 38, minExclusive: 3300, maxInclusive: 3400 },
  { no: 39, minExclusive: 3400, maxInclusive: 3500 },
  { no: 40, minExclusive: 3500, maxInclusive: 3600 },
  { no: 41, minExclusive: 3600, maxInclusive: 3700 },
  { no: 42, minExclusive: 3700, maxInclusive: 3800 },
  { no: 43, minExclusive: 3800, maxInclusive: 3900 },
  { no: 44, minExclusive: 3900, maxInclusive: 4000 },
  { no: 45, minExclusive: 4000, maxInclusive: 4100 },
  { no: 46, minExclusive: 4100, maxInclusive: 4200 },
  { no: 47, minExclusive: 4200, maxInclusive: 4300 },
  { no: 48, minExclusive: 4300, maxInclusive: 4400 },
  { no: 49, minExclusive: 4400, maxInclusive: 4500 },
  { no: 50, minExclusive: 4500, maxInclusive: 4600 },
  { no: 51, minExclusive: 4600, maxInclusive: 4700 },
  { no: 52, minExclusive: 4700, maxInclusive: 4800 },
  { no: 53, minExclusive: 4800, maxInclusive: 4900 },
  { no: 54, minExclusive: 4900, maxInclusive: 5000 },
  { no: 55, minExclusive: 5000, maxInclusive: 5100 },
  { no: 56, minExclusive: 5100, maxInclusive: 5200 },
  { no: 57, minExclusive: 5200, maxInclusive: 5300 },
  { no: 58, minExclusive: 5300, maxInclusive: 5400 },
  { no: 59, minExclusive: 5400, maxInclusive: 5500 },
  { no: 60, minExclusive: 5500, maxInclusive: 5600 },
  { no: 61, minExclusive: 5600, maxInclusive: 5700 },
  { no: 62, minExclusive: 5700, maxInclusive: 5800 },
  { no: 63, minExclusive: 5800, maxInclusive: 5900 },
  { no: 64, minExclusive: 5900, maxInclusive: 6000 },
  { no: 65, minExclusive: 6000, maxInclusive: Infinity },
]

const ACT4_RATES = [
  [0.4, 0.1, 0.3],
  [0.7, 0.2, 0.5],
  [1.1, 0.3, 0.8],
  [1.5, 0.4, 1.1],
  [2.1, 0.6, 1.5],
  [2.95, 0.85, 2.1],
  [4.35, 1.25, 3.1],
  [6.15, 1.75, 4.4],
  [7.85, 2.25, 5.6],
  [9.65, 2.75, 6.9],
  [11.35, 3.25, 8.1],
  [13.15, 3.75, 9.4],
  [14.85, 4.25, 10.6],
  [16.65, 4.75, 11.9],
  [18.35, 5.25, 13.1],
  [20.15, 5.75, 14.4],
  [21.85, 6.25, 15.6],
  [23.65, 6.75, 16.9],
  [25.35, 7.25, 18.1],
  [27.15, 7.75, 19.4],
  [28.85, 8.25, 20.6],
  [30.65, 8.75, 21.9],
  [32.35, 9.25, 23.1],
  [34.15, 9.75, 24.4],
  [35.85, 10.25, 25.6],
  [37.65, 10.75, 26.9],
  [39.35, 11.25, 28.1],
  [41.15, 11.75, 29.4],
  [42.85, 12.25, 30.6],
  [44.65, 12.75, 31.9],
  [46.35, 13.25, 33.1],
  [48.15, 13.75, 34.4],
  [49.85, 14.25, 35.6],
  [51.65, 14.75, 36.9],
  [53.35, 15.25, 38.1],
  [55.15, 15.75, 39.4],
  [56.85, 16.25, 40.6],
  [58.65, 16.75, 41.9],
  [60.35, 17.25, 43.1],
  [62.15, 17.75, 44.4],
  [63.85, 18.25, 45.6],
  [65.65, 18.75, 46.9],
  [67.35, 19.25, 48.1],
  [69.15, 19.75, 49.4],
  [70.85, 20.25, 50.6],
  [72.65, 20.75, 51.9],
  [74.35, 21.25, 53.1],
  [76.15, 21.75, 54.4],
  [77.85, 22.25, 55.6],
  [79.65, 22.75, 56.9],
  [81.35, 23.25, 58.1],
  [83.15, 23.75, 59.4],
  [84.85, 24.25, 60.6],
  [86.65, 24.75, 61.9],
  [88.35, 25.25, 63.1],
  [90.15, 25.75, 64.4],
  [91.85, 26.25, 65.6],
  [93.65, 26.75, 66.9],
  [95.35, 27.25, 68.1],
  [97.15, 27.75, 69.4],
  [98.85, 28.25, 70.6],
  [100.65, 28.75, 71.9],
  [102.35, 29.25, 73.1],
  [104.15, 29.75, 74.4],
  [104.15, 29.75, 74.4],
]

const ACT800_RATES = [
  [0.05, 0.05],
  [0.1, 0.1],
  [0.15, 0.15],
  [0.2, 0.2],
  [0.25, 0.25],
  [0.35, 0.35],
  [0.5, 0.5],
  [0.7, 0.7],
  [0.9, 0.9],
  [1.1, 1.1],
  [1.3, 1.3],
  [1.5, 1.5],
  [1.7, 1.7],
  [1.9, 1.9],
  [2.1, 2.1],
  [2.3, 2.3],
  [2.5, 2.5],
  [2.7, 2.7],
  [2.9, 2.9],
  [3.1, 3.1],
  [3.3, 3.3],
  [3.5, 3.5],
  [3.7, 3.7],
  [3.9, 3.9],
  [4.1, 4.1],
  [4.3, 4.3],
  [4.5, 4.5],
  [4.7, 4.7],
  [4.9, 4.9],
  [5.1, 5.1],
  [5.3, 5.3],
  [5.5, 5.5],
  [5.7, 5.7],
  [5.9, 5.9],
  [6.1, 6.1],
  [6.3, 6.3],
  [6.5, 6.5],
  [6.7, 6.7],
  [6.9, 6.9],
  [7.1, 7.1],
  [7.3, 7.3],
  [7.5, 7.5],
  [7.7, 7.7],
  [7.9, 7.9],
  [8.1, 8.1],
  [8.3, 8.3],
  [8.5, 8.5],
  [8.7, 8.7],
  [8.9, 8.9],
  [9.1, 9.1],
  [9.3, 9.3],
  [9.5, 9.5],
  [9.7, 9.7],
  [9.9, 9.9],
  [10.1, 10.1],
  [10.3, 10.3],
  [10.5, 10.5],
  [10.7, 10.7],
  [10.9, 10.9],
  [11.1, 11.1],
  [11.3, 11.3],
  [11.5, 11.5],
  [11.7, 11.7],
  [11.9, 11.9],
  [11.9, 11.9],
]

const findWageBandIndex = (wage) => {
  const monthlyWage = parseAmount(wage)
  const index = WAGE_BANDS.findIndex((band) => {
    if (band.no === 1) return monthlyWage <= band.maxInclusive
    if (band.maxInclusive === Infinity) return monthlyWage > band.minExclusive
    return monthlyWage > band.minExclusive && monthlyWage <= band.maxInclusive
  })
  return index >= 0 ? index : WAGE_BANDS.length - 1
}

export const calculateSocso = (wage, category = SOCSO_CATEGORY.FIRST) => {
  const monthlyWage = parseAmount(wage)
  if (monthlyWage <= 0) {
    return {
      employer: 0,
      employee: 0,
      total: 0,
      bandNo: null,
    }
  }
  const bandIndex = findWageBandIndex(wage)
  const row = ACT4_RATES[bandIndex] || ACT4_RATES[ACT4_RATES.length - 1]
  const employerFirst = parseAmount(row[0])
  const employeeFirst = parseAmount(row[1])
  const employerSecond = parseAmount(row[2])
  if (category === SOCSO_CATEGORY.SECOND) {
    return {
      employer: roundMoney(employerSecond),
      employee: 0,
      total: roundMoney(employerSecond),
      bandNo: bandIndex + 1,
    }
  }
  return {
    employer: roundMoney(employerFirst),
    employee: roundMoney(employeeFirst),
    total: roundMoney(employerFirst + employeeFirst),
    bandNo: bandIndex + 1,
  }
}

export const calculateEis = (wage) => {
  const monthlyWage = parseAmount(wage)
  if (monthlyWage <= 0) {
    return {
      employer: 0,
      employee: 0,
      total: 0,
      bandNo: null,
    }
  }
  const bandIndex = findWageBandIndex(wage)
  const row = ACT800_RATES[bandIndex] || ACT800_RATES[ACT800_RATES.length - 1]
  const employer = roundMoney(row[0])
  const employee = roundMoney(row[1])
  return {
    employer,
    employee,
    total: roundMoney(employer + employee),
    bandNo: bandIndex + 1,
  }
}

export const calculatePerkesoEis = (wage, socsoCategory = SOCSO_CATEGORY.FIRST) => {
  const socso = calculateSocso(wage, socsoCategory)
  const eis = calculateEis(wage)
  return {
    socso,
    eis,
    combined: {
      employer: roundMoney(socso.employer + eis.employer),
      employee: roundMoney(socso.employee + eis.employee),
      total: roundMoney(socso.total + eis.total),
    },
  }
}
