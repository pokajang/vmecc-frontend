import { createDefaultFitnessTestForm } from './fitnessTestFormDomain'

export const defaultFitnessTestForm = () => createDefaultFitnessTestForm()

export const isFitnessTestDirty = (form) => {
  const d = defaultFitnessTestForm()
  if (form.reportDate !== d.reportDate || form.reportTime || form.weather !== d.weather) return true
  if (form.incidentType !== d.incidentType || form.location.trim() || form.details.trim())
    return true
  if (form.summary.trim()) return true
  return form.chronology.some((x) => x.time || x.action.trim())
}
