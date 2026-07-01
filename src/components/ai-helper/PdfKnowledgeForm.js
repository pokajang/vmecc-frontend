import { CButton, CFormCheck, CFormInput, CFormLabel, CFormSelect } from '@coreui/react'

import { KNOWLEDGE_SCOPE_GLOBAL, KNOWLEDGE_SCOPE_MODULE } from './constants'

const PdfKnowledgeForm = ({
  knowledgeAcknowledged,
  knowledgeFile,
  knowledgeFileInputKey,
  knowledgeModuleKey,
  knowledgeScope,
  knowledgeTitle,
  knowledgeUploading,
  knowledgeVisibility,
  visibleKnowledgeModules,
  onKnowledgeAcknowledgedChange,
  onKnowledgeFileChange,
  onKnowledgeModuleKeyChange,
  onKnowledgeScopeChange,
  onKnowledgeTitleChange,
  onKnowledgeVisibilityChange,
  onUploadKnowledge,
}) => (
  <section className="ai-helper-knowledge__section">
    <div className="ai-helper-knowledge__section-title">Upload PDF</div>
    <CFormLabel className="ai-helper-knowledge__field-label" htmlFor="ai-helper-knowledge-file">
      PDF file
    </CFormLabel>
    <CFormInput
      id="ai-helper-knowledge-file"
      key={knowledgeFileInputKey}
      type="file"
      accept="application/pdf,.pdf"
      onChange={onKnowledgeFileChange}
      disabled={knowledgeUploading}
      aria-label="Upload knowledge PDF"
    />
    <div className="ai-helper-knowledge__hint">
      Ask AI reads text only. Images, screenshots, diagrams, and scanned pages are not learned.
    </div>
    <CFormLabel
      className="ai-helper-knowledge__field-label mt-2"
      htmlFor="ai-helper-knowledge-title"
    >
      Title
    </CFormLabel>
    <CFormInput
      id="ai-helper-knowledge-title"
      type="text"
      value={knowledgeTitle}
      onChange={(event) => onKnowledgeTitleChange(event.target.value)}
      placeholder="Optional. Defaults to the PDF file name."
      disabled={knowledgeUploading}
      aria-label="Knowledge title"
    />
    <div className="ai-helper-knowledge__hint">
      Use a short name that helps you recognize this guidance later.
    </div>
    <CFormLabel
      className="ai-helper-knowledge__field-label mt-2"
      htmlFor="ai-helper-knowledge-scope"
    >
      Use this guide for
    </CFormLabel>
    <CFormSelect
      id="ai-helper-knowledge-scope"
      value={knowledgeScope}
      onChange={(event) => {
        const nextScope = event.target.value
        onKnowledgeScopeChange(nextScope)
        if (
          nextScope === KNOWLEDGE_SCOPE_MODULE &&
          !knowledgeModuleKey &&
          visibleKnowledgeModules.length
        ) {
          onKnowledgeModuleKeyChange(visibleKnowledgeModules[0].key)
        }
      }}
      disabled={knowledgeUploading}
      aria-label="Knowledge scope"
    >
      <option value={KNOWLEDGE_SCOPE_GLOBAL}>General guidance</option>
      <option value={KNOWLEDGE_SCOPE_MODULE} disabled={!visibleKnowledgeModules.length}>
        Specific module
      </option>
    </CFormSelect>
    <div className="ai-helper-knowledge__hint">
      General guidance lets Ask AI use this PDF as broad VMECC reference knowledge. Specific module
      limits it to the module you choose.
    </div>
    {knowledgeScope === KNOWLEDGE_SCOPE_MODULE ? (
      <>
        <CFormLabel
          className="ai-helper-knowledge__field-label mt-2"
          htmlFor="ai-helper-knowledge-module"
        >
          Module
        </CFormLabel>
        <CFormSelect
          id="ai-helper-knowledge-module"
          value={knowledgeModuleKey}
          onChange={(event) => onKnowledgeModuleKeyChange(event.target.value)}
          disabled={knowledgeUploading}
          aria-label="Knowledge module"
        >
          {!visibleKnowledgeModules.length ? <option value="">No modules available</option> : null}
          {visibleKnowledgeModules.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </CFormSelect>
        <div className="ai-helper-knowledge__hint">
          Ask AI uses module guidance only when helping with the selected module. The list follows
          the modules visible to your account.
        </div>
      </>
    ) : null}
    <CFormLabel
      className="ai-helper-knowledge__field-label mt-2"
      htmlFor="ai-helper-knowledge-visibility"
    >
      Availability
    </CFormLabel>
    <CFormSelect
      id="ai-helper-knowledge-visibility"
      value={knowledgeVisibility}
      onChange={(event) => onKnowledgeVisibilityChange(event.target.value)}
      disabled={knowledgeUploading}
      aria-label="Knowledge visibility"
    >
      <option value="personal">Use for me only</option>
      <option value="shared">Share with others</option>
    </CFormSelect>
    <div className="ai-helper-knowledge__hint">
      Use for me only keeps this source personal. Shared guidance can be used after processing, and
      system administrators may audit it later.
    </div>
    <CFormLabel
      className="ai-helper-knowledge__field-label mt-2"
      htmlFor="ai-helper-knowledge-acknowledgement"
    >
      Acknowledgement
    </CFormLabel>
    <CFormCheck
      id="ai-helper-knowledge-acknowledgement"
      className="mt-1"
      checked={knowledgeAcknowledged}
      onChange={(event) => onKnowledgeAcknowledgedChange(event.target.checked)}
      disabled={knowledgeUploading}
      label="I confirm this file is valid VMECC operational guidance and is applicable for Ask AI responses."
    />
    <CButton
      color="primary"
      className="mt-3"
      size="sm"
      onClick={onUploadKnowledge}
      disabled={
        !knowledgeFile ||
        !knowledgeAcknowledged ||
        knowledgeUploading ||
        (knowledgeScope === KNOWLEDGE_SCOPE_MODULE && !knowledgeModuleKey)
      }
    >
      {knowledgeUploading ? 'Uploading...' : 'Upload knowledge'}
    </CButton>
  </section>
)

export default PdfKnowledgeForm
