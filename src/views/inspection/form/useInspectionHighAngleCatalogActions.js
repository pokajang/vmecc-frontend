import {
  addHighAngleCustomCompartment,
  addHighAngleCustomItem,
  deleteHighAngleCustomCompartment,
  deleteHighAngleCustomItem,
  updateHighAngleCustomCompartment,
  updateHighAngleCustomItem,
} from './inspectionHighAngleCatalogActions'

const useInspectionHighAngleCatalogActions = ({ getLatestForm, updateForm }) => {
  const applyHighAngleChange = (builder) => {
    const latest = getLatestForm()
    const nextForm = builder(latest)
    if (nextForm !== latest) updateForm(nextForm)
  }

  return {
    addHighAngleCompartment: (payload) =>
      applyHighAngleChange((form) => addHighAngleCustomCompartment(form, payload)),
    updateHighAngleCompartment: (target, payload) =>
      applyHighAngleChange((form) => updateHighAngleCustomCompartment(form, target, payload)),
    deleteHighAngleCompartment: (target) =>
      applyHighAngleChange((form) => deleteHighAngleCustomCompartment(form, target)),
    addHighAngleItem: (payload) =>
      applyHighAngleChange((form) => addHighAngleCustomItem(form, payload)),
    updateHighAngleItem: (target, payload) =>
      applyHighAngleChange((form) => updateHighAngleCustomItem(form, target, payload)),
    deleteHighAngleItem: (target) =>
      applyHighAngleChange((form) => deleteHighAngleCustomItem(form, target)),
  }
}

export default useInspectionHighAngleCatalogActions
