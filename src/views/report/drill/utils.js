import { uid } from '../utils'

export const defaultDrillForm = () => ({
  reportDate: new Date().toISOString().slice(0, 10),
  reportTime: '',
  weather: 'Clear',
  incidentType: 'Fire Drill',
  location: '',
  details: '',
  summary: '',
  sc: '',
  asc: '',
  chronology: [{ id: uid(), time: '', action: '' }],
})

export const isDrillDirty = (form) => {
  const d = defaultDrillForm()
  if (form.reportDate !== d.reportDate || form.reportTime || form.weather !== d.weather) return true
  if (form.incidentType !== d.incidentType || form.location.trim() || form.details.trim())
    return true
  if (form.summary.trim()) return true
  return form.chronology.some((x) => x.time || x.action.trim())
}
