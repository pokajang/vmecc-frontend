export const validateInspectionForm = (form) => {
  const errors = {}
  if (!Array.isArray(form.findings) || form.findings.length === 0) {
    errors.findings = 'Add at least one photo finding before submitting.'
  }
  return { isValid: Object.keys(errors).length === 0, errors }
}
