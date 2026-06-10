import { useState } from 'react'
import { defaultInspectionForm } from './utils'

const useInspectionForm = () => {
  const [form, setForm] = useState(defaultInspectionForm)
  const [fieldErrors, setFieldErrors] = useState({})

  return { form, setForm, fieldErrors, setFieldErrors }
}

export default useInspectionForm
