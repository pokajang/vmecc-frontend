import { OVERTIME_NORMAL_HOURS_STRATEGIES } from '../utils'

export const SAMPLE_BASIC_SALARY_DEFAULT = '3000'
export const SAMPLE_MONTH_DAYS = 30
export const SAMPLE_OVERTIME_HOURS = 2

export const formatMoney = (value) => `RM ${Number(value || 0).toFixed(2)}`

export const NORMAL_HOURS_STRATEGY_OPTIONS = [
  { value: OVERTIME_NORMAL_HOURS_STRATEGIES.STATUTORY_8H, label: 'Statutory (8h fixed)' },
  { value: OVERTIME_NORMAL_HOURS_STRATEGIES.GLOBAL, label: 'Global hours/day' },
  { value: OVERTIME_NORMAL_HOURS_STRATEGIES.ROLE_BASED, label: 'Custom by role' },
]

export const getNormalHoursStrategyLabel = (value) =>
  NORMAL_HOURS_STRATEGY_OPTIONS.find((entry) => entry.value === value)?.label ||
  'Statutory (8h fixed)'
