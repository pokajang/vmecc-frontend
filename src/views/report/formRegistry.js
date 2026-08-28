import DrillForm from './drill/DrillForm'
import ErcoForm from './erco/ErcoForm'
import FitnessTestForm from './fitness-test/FitnessTestForm'
import ErAssessmentForm from './er-assessment/ErAssessmentForm'

export const FORM_REGISTRY = {
  drill: DrillForm,
  erco: ErcoForm,
  'fitness-test': FitnessTestForm,
  'er-assessment': ErAssessmentForm,
}
