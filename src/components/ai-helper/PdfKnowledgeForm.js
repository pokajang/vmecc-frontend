import { CButton, CFormCheck, CFormInput, CFormLabel, CFormSelect } from '@coreui/react'

const PdfKnowledgeForm = ({
  knowledgeAcknowledged,
  knowledgeFile,
  knowledgeFileInputKey,
  knowledgeTitle,
  knowledgeUploading,
  knowledgeVisibility,
  onKnowledgeAcknowledgedChange,
  onKnowledgeFileChange,
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
      aria-label="Upload reference PDF"
    />
    <div className="ai-helper-knowledge__hint">
      This PDF is stored as a view-only reference document. Ask AI does not ingest, OCR, or learn
      from the uploaded file.
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
      aria-label="Document title"
    />
    <div className="ai-helper-knowledge__hint">
      Use a short name that helps users recognize the document later.
    </div>
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
      aria-label="Document visibility"
    >
      <option value="personal">Only me</option>
      <option value="shared">Everyone</option>
    </CFormSelect>
    <div className="ai-helper-knowledge__hint">
      Personal documents are visible only to you. Shared documents are visible to other signed-in
      users in the reference library.
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
      label="I confirm this PDF is appropriate to share at the selected visibility."
    />
    <CButton
      color="primary"
      className="mt-3"
      size="sm"
      onClick={onUploadKnowledge}
      disabled={!knowledgeFile || !knowledgeAcknowledged || knowledgeUploading}
    >
      {knowledgeUploading ? 'Uploading...' : 'Upload document'}
    </CButton>
  </section>
)

export default PdfKnowledgeForm
