import { uid } from '../utils'

export const defaultFitnessTestForm = () => ({
  reportDate: new Date().toISOString().slice(0, 10),
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
