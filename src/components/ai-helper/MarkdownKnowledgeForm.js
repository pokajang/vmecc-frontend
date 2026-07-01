import { CButton, CFormCheck, CFormInput, CFormLabel, CFormSelect } from '@coreui/react'

import { KNOWLEDGE_SCOPE_GLOBAL, KNOWLEDGE_SCOPE_MODULE } from './constants'

const MarkdownKnowledgeForm = ({
  markdownAcknowledged,
  markdownFile,
  markdownFileInputKey,
  markdownModuleKey,
  markdownScope,
  markdownTitle,
  markdownUploading,
  visibleKnowledgeModules,
  onMarkdownAcknowledgedChange,
  onMarkdownFileChange,
  onMarkdownModuleKeyChange,
  onMarkdownScopeChange,
  onMarkdownTitleChange,
  onUploadMarkdownKnowledge,
}) => (
  <section className="ai-helper-knowledge__section">
    <div className="ai-helper-knowledge__section-title">Upload MD</div>
    <CFormLabel className="ai-helper-knowledge__field-label" htmlFor="ai-helper-markdown-file">
      Markdown file
    </CFormLabel>
    <CFormInput
      id="ai-helper-markdown-file"
      key={markdownFileInputKey}
      type="file"
      accept=".md,.markdown,text/markdown,text/plain"
      onChange={onMarkdownFileChange}
      disabled={markdownUploading}
      aria-label="Upload Markdown knowledge"
    />
    <div className="ai-helper-knowledge__hint">
      Upload trusted Markdown guidance. Frontmatter is optional; these form fields override title
      and module scope.
    </div>
    <CFormLabel
      className="ai-helper-knowledge__field-label mt-2"
      htmlFor="ai-helper-markdown-title"
    >
      Title
    </CFormLabel>
    <CFormInput
      id="ai-helper-markdown-title"
      type="text"
      value={markdownTitle}
      onChange={(event) => onMarkdownTitleChange(event.target.value)}
      placeholder="Optional. Defaults to frontmatter title or file name."
      disabled={markdownUploading}
      aria-label="Markdown knowledge title"
    />
    <div className="ai-helper-knowledge__hint">
      Use a short name that helps administrators recognize this guidance later.
    </div>
    <CFormLabel
      className="ai-helper-knowledge__field-label mt-2"
      htmlFor="ai-helper-markdown-scope"
    >
      Use this guide for
    </CFormLabel>
    <CFormSelect
      id="ai-helper-markdown-scope"
      value={markdownScope}
      onChange={(event) => {
        const nextScope = event.target.value
        onMarkdownScopeChange(nextScope)
        if (
          nextScope === KNOWLEDGE_SCOPE_MODULE &&
          !markdownModuleKey &&
          visibleKnowledgeModules.length
        ) {
          onMarkdownModuleKeyChange(visibleKnowledgeModules[0].key)
        }
      }}
      disabled={markdownUploading}
      aria-label="Markdown knowledge scope"
    >
      <option value={KNOWLEDGE_SCOPE_GLOBAL}>General guidance</option>
      <option value={KNOWLEDGE_SCOPE_MODULE} disabled={!visibleKnowledgeModules.length}>
        Specific module
      </option>
    </CFormSelect>
    <div className="ai-helper-knowledge__hint">
      General guidance is available across Ask AI. Specific module limits this Markdown guidance to
      the module you choose.
    </div>
    {markdownScope === KNOWLEDGE_SCOPE_MODULE ? (
      <>
        <CFormLabel
          className="ai-helper-knowledge__field-label mt-2"
          htmlFor="ai-helper-markdown-module"
        >
          Module
        </CFormLabel>
        <CFormSelect
          id="ai-helper-markdown-module"
          value={markdownModuleKey}
          onChange={(event) => onMarkdownModuleKeyChange(event.target.value)}
          disabled={markdownUploading}
          aria-label="Markdown knowledge module"
        >
          {!visibleKnowledgeModules.length ? <option value="">No modules available</option> : null}
          {visibleKnowledgeModules.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </CFormSelect>
        <div className="ai-helper-knowledge__hint">
          The module list follows the modules visible to your administrator account.
        </div>
      </>
    ) : null}
    <CFormLabel
      className="ai-helper-knowledge__field-label mt-2"
      htmlFor="ai-helper-markdown-acknowledgement"
    >
      Acknowledgement
    </CFormLabel>
    <CFormCheck
      id="ai-helper-markdown-acknowledgement"
      className="mt-1"
      checked={markdownAcknowledged}
      onChange={(event) => onMarkdownAcknowledgedChange(event.target.checked)}
      disabled={markdownUploading}
      label="I confirm this Markdown file is valid VMECC operational guidance and is applicable for Ask AI responses."
    />
    <CButton
      color="primary"
      className="mt-3"
      size="sm"
      onClick={onUploadMarkdownKnowledge}
      disabled={
        !markdownFile ||
        !markdownAcknowledged ||
        markdownUploading ||
        (markdownScope === KNOWLEDGE_SCOPE_MODULE && !markdownModuleKey)
      }
    >
      {markdownUploading ? 'Uploading...' : 'Upload Markdown'}
    </CButton>
  </section>
)

export default MarkdownKnowledgeForm
