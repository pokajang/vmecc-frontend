import { uid } from '../utils'
import { getLocalDateInputValue } from 'src/utils/localDate'

export const defaultDrillForm = () => ({
  reportDate: getLocalDateInputValue(),
  reportTime: '',
  weather: 'Clear',
  incidentType: '',
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
  if (form.incidentType.trim() || form.location.trim() || form.details.trim()) return true
  if (form.summary.trim()) return true
  return form.chronology.some((x) => x.time || x.action.trim())
}
