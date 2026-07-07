import {
  buildStructuredSectionHandlers,
  buildStructuredSectionRef,
} from './inspectionFormStructuredSection'

const useInspectionStructuredHandlers = ({ handlerProps, refs, selectedTypeDefinition }) => {
  const structuredSectionRef = buildStructuredSectionRef({
    ...refs,
    fieldRefKey: selectedTypeDefinition?.fieldRefKey,
  })
  const StructuredEditSection = selectedTypeDefinition?.EditSection || null
  const structuredSectionHandlers = buildStructuredSectionHandlers({
    ...handlerProps,
    fieldRefKey: selectedTypeDefinition?.fieldRefKey,
  })

  return {
    StructuredEditSection,
    structuredSectionHandlers,
    structuredSectionRef,
  }
}

export default useInspectionStructuredHandlers
