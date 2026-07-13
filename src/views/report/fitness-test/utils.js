import { createReportSubmissionKey, uid } from '../utils'
import { getLocalDateInputValue } from 'src/utils/localDate'

export const defaultFitnessTestForm = () => ({
  schemaVersion: 1,
  submissionKey: createReportSubmissionKey('fitness-test'),
  reportDate: getLocalDateInputValue(),
  reportTime: '',
  weather: 'Routine',
  incidentType: 'Endurance Test',
  location: '',
  details: '',
  summary: '',
  sc: '',
  asc: '',
  chronology: [{ id: uid(), time: '', action: '' }],
})

export const isFitnessTestDirty = (form) => {
  const d = defaultFitnessTestForm()
  if (form.reportDate !== d.reportDate || form.reportTime || form.weather !== d.weather) return true
  if (form.incidentType !== d.incidentType || form.location.trim() || form.details.trim())
    return true
  if (form.summary.trim()) return true
  return form.chronology.some((x) => x.time || x.action.trim())
}
