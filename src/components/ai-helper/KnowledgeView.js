import { ArrowLeft } from 'lucide-react'

import { KNOWLEDGE_VIEW_LIST, KNOWLEDGE_VIEW_UPLOAD } from './constants'
import KnowledgeListView from './KnowledgeListView'
import KnowledgeReaderModal from './KnowledgeReaderModal'
import PdfKnowledgeForm from './PdfKnowledgeForm'

const KnowledgeView = ({
  authUser,
  backButtonRef,
  canManageKnowledge,
  knowledgeAcknowledged,
  knowledgeDeleteTarget,
  knowledgeEntries,
  knowledgeError,
  knowledgeFile,
  knowledgeFileInputKey,
  knowledgeInitialLoading,
  knowledgeLoading,
  knowledgeReaderError,
  knowledgeReaderLoading,
  knowledgeReaderOpen,
  knowledgeTitle,
  knowledgeUpdatingId,
  knowledgeUploading,
  knowledgeView,
  knowledgeVisibility,
  selectedKnowledgeDetail,
  onBack,
  onConfirmDeleteKnowledge,
  onKnowledgeAcknowledgedChange,
  onKnowledgeDeleteTargetChange,
  onKnowledgeErrorChange,
  onKnowledgeFileChange,
  onKnowledgeReaderClose,
  onKnowledgeTitleChange,
  onKnowledgeViewChange,
  onKnowledgeVisibilityChange,
  onLoadKnowledge,
  onOpenKnowledge,
  onUploadKnowledge,
}) => {
  const selectView = (view) => {
    onKnowledgeViewChange(view)
    onKnowledgeDeleteTargetChange(null)
    onKnowledgeErrorChange(null)
  }

  return (
    <div className="ai-helper-knowledge">
      <div className="ai-helper-history__header">
        <div>
          <button
            type="button"
            className="ai-helper-history__back"
            ref={backButtonRef}
            onClick={onBack}
            aria-label="Back to chat"
          >
            <ArrowLeft size={16} />
            <span>Back to chat</span>
          </button>
          <div className="ai-helper-history__heading">Reference documents</div>
        </div>
      </div>

      <div className="ai-helper-knowledge__body">
        <div className="ai-helper-knowledge__switch" role="group" aria-label="Document view">
          <button
            type="button"
            className={knowledgeView === KNOWLEDGE_VIEW_UPLOAD ? 'active' : ''}
            onClick={() => selectView(KNOWLEDGE_VIEW_UPLOAD)}
            aria-pressed={knowledgeView === KNOWLEDGE_VIEW_UPLOAD}
          >
            Upload PDF
          </button>
          <button
            type="button"
            className={knowledgeView === KNOWLEDGE_VIEW_LIST ? 'active' : ''}
            onClick={() => selectView(KNOWLEDGE_VIEW_LIST)}
            aria-pressed={knowledgeView === KNOWLEDGE_VIEW_LIST}
          >
            Document library
          </button>
        </div>

        {knowledgeError ? <div className="ai-helper-history__error">{knowledgeError}</div> : null}

        {knowledgeView === KNOWLEDGE_VIEW_UPLOAD ? (
          <PdfKnowledgeForm
            knowledgeAcknowledged={knowledgeAcknowledged}
            knowledgeFile={knowledgeFile}
            knowledgeFileInputKey={knowledgeFileInputKey}
            knowledgeTitle={knowledgeTitle}
            knowledgeUploading={knowledgeUploading}
            knowledgeVisibility={knowledgeVisibility}
            onKnowledgeAcknowledgedChange={onKnowledgeAcknowledgedChange}
            onKnowledgeFileChange={onKnowledgeFileChange}
            onKnowledgeTitleChange={onKnowledgeTitleChange}
            onKnowledgeVisibilityChange={onKnowledgeVisibilityChange}
            onUploadKnowledge={onUploadKnowledge}
          />
        ) : null}

        {knowledgeView === KNOWLEDGE_VIEW_LIST ? (
          <KnowledgeListView
            authUser={authUser}
            canManageKnowledge={canManageKnowledge}
            knowledgeDeleteTarget={knowledgeDeleteTarget}
            knowledgeEntries={knowledgeEntries}
            knowledgeInitialLoading={knowledgeInitialLoading}
            knowledgeLoading={knowledgeLoading}
            knowledgeUpdatingId={knowledgeUpdatingId}
            onConfirmDeleteKnowledge={onConfirmDeleteKnowledge}
            onKnowledgeDeleteTargetChange={onKnowledgeDeleteTargetChange}
            onLoadKnowledge={onLoadKnowledge}
            onOpenKnowledge={onOpenKnowledge}
          />
        ) : null}
      </div>

      <KnowledgeReaderModal
        detail={selectedKnowledgeDetail}
        error={knowledgeReaderError}
        loading={knowledgeReaderLoading}
        open={knowledgeReaderOpen}
        onClose={onKnowledgeReaderClose}
      />
    </div>
  )
}

export default KnowledgeView
