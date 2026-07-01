import { ArrowLeft } from 'lucide-react'

import { KNOWLEDGE_VIEW_LIST, KNOWLEDGE_VIEW_MARKDOWN, KNOWLEDGE_VIEW_UPLOAD } from './constants'
import KnowledgeListView from './KnowledgeListView'
import KnowledgeReaderModal from './KnowledgeReaderModal'
import MarkdownKnowledgeForm from './MarkdownKnowledgeForm'
import PdfKnowledgeForm from './PdfKnowledgeForm'

const KnowledgeView = ({
  authUser,
  backButtonRef,
  isSysAdmin,
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
  knowledgeReaderPdfError,
  knowledgeReaderPdfLoading,
  knowledgeReaderPdfUrl,
  knowledgeReaderHasOriginal,
  knowledgeReaderMarkdownError,
  knowledgeReaderMarkdownLoading,
  knowledgeReaderMarkdownSource,
  knowledgeReaderOpen,
  knowledgeReaderTab,
  knowledgeModuleKey,
  knowledgeScope,
  knowledgeTitle,
  knowledgeUpdatingId,
  knowledgeUploading,
  knowledgeView,
  knowledgeVisibility,
  markdownAcknowledged,
  markdownFile,
  markdownFileInputKey,
  markdownModuleKey,
  markdownScope,
  markdownTitle,
  markdownUploading,
  selectedKnowledgeDetail,
  visibleKnowledgeModules,
  onBack,
  onConfirmDeleteKnowledge,
  onKnowledgeAcknowledgedChange,
  onKnowledgeDeleteTargetChange,
  onKnowledgeErrorChange,
  onKnowledgeFileChange,
  onKnowledgeModuleKeyChange,
  onKnowledgeReaderClose,
  onKnowledgeReaderTabChange,
  onKnowledgeScopeChange,
  onKnowledgeTitleChange,
  onKnowledgeViewChange,
  onKnowledgeVisibilityChange,
  onLoadKnowledge,
  onOpenKnowledge,
  onMarkdownAcknowledgedChange,
  onMarkdownFileChange,
  onMarkdownModuleKeyChange,
  onMarkdownScopeChange,
  onMarkdownTitleChange,
  onUploadKnowledge,
  onUploadMarkdownKnowledge,
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
          <div className="ai-helper-history__heading">Knowledge</div>
        </div>
      </div>

      <div className="ai-helper-knowledge__body">
        <div className="ai-helper-knowledge__switch" role="group" aria-label="Knowledge view">
          <button
            type="button"
            className={knowledgeView === KNOWLEDGE_VIEW_UPLOAD ? 'active' : ''}
            onClick={() => selectView(KNOWLEDGE_VIEW_UPLOAD)}
            aria-pressed={knowledgeView === KNOWLEDGE_VIEW_UPLOAD}
          >
            Upload PDF
          </button>
          {isSysAdmin ? (
            <button
              type="button"
              className={knowledgeView === KNOWLEDGE_VIEW_MARKDOWN ? 'active' : ''}
              onClick={() => selectView(KNOWLEDGE_VIEW_MARKDOWN)}
              aria-pressed={knowledgeView === KNOWLEDGE_VIEW_MARKDOWN}
            >
              Upload MD
            </button>
          ) : null}
          <button
            type="button"
            className={knowledgeView === KNOWLEDGE_VIEW_LIST ? 'active' : ''}
            onClick={() => selectView(KNOWLEDGE_VIEW_LIST)}
            aria-pressed={knowledgeView === KNOWLEDGE_VIEW_LIST}
          >
            Knowledge list
          </button>
        </div>

        {knowledgeError ? <div className="ai-helper-history__error">{knowledgeError}</div> : null}

        {knowledgeView === KNOWLEDGE_VIEW_UPLOAD ? (
          <PdfKnowledgeForm
            knowledgeAcknowledged={knowledgeAcknowledged}
            knowledgeFile={knowledgeFile}
            knowledgeFileInputKey={knowledgeFileInputKey}
            knowledgeModuleKey={knowledgeModuleKey}
            knowledgeScope={knowledgeScope}
            knowledgeTitle={knowledgeTitle}
            knowledgeUploading={knowledgeUploading}
            knowledgeVisibility={knowledgeVisibility}
            visibleKnowledgeModules={visibleKnowledgeModules}
            onKnowledgeAcknowledgedChange={onKnowledgeAcknowledgedChange}
            onKnowledgeFileChange={onKnowledgeFileChange}
            onKnowledgeModuleKeyChange={onKnowledgeModuleKeyChange}
            onKnowledgeScopeChange={onKnowledgeScopeChange}
            onKnowledgeTitleChange={onKnowledgeTitleChange}
            onKnowledgeVisibilityChange={onKnowledgeVisibilityChange}
            onUploadKnowledge={onUploadKnowledge}
          />
        ) : null}

        {isSysAdmin && knowledgeView === KNOWLEDGE_VIEW_MARKDOWN ? (
          <MarkdownKnowledgeForm
            markdownAcknowledged={markdownAcknowledged}
            markdownFile={markdownFile}
            markdownFileInputKey={markdownFileInputKey}
            markdownModuleKey={markdownModuleKey}
            markdownScope={markdownScope}
            markdownTitle={markdownTitle}
            markdownUploading={markdownUploading}
            visibleKnowledgeModules={visibleKnowledgeModules}
            onMarkdownAcknowledgedChange={onMarkdownAcknowledgedChange}
            onMarkdownFileChange={onMarkdownFileChange}
            onMarkdownModuleKeyChange={onMarkdownModuleKeyChange}
            onMarkdownScopeChange={onMarkdownScopeChange}
            onMarkdownTitleChange={onMarkdownTitleChange}
            onUploadMarkdownKnowledge={onUploadMarkdownKnowledge}
          />
        ) : null}

        {knowledgeView === KNOWLEDGE_VIEW_LIST ? (
          <KnowledgeListView
            authUser={authUser}
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
        activeTab={knowledgeReaderTab}
        readerHasOriginal={knowledgeReaderHasOriginal}
        detail={selectedKnowledgeDetail}
        error={knowledgeReaderError}
        loading={knowledgeReaderLoading}
        pdfError={knowledgeReaderPdfError}
        pdfLoading={knowledgeReaderPdfLoading}
        pdfUrl={knowledgeReaderPdfUrl}
        markdownError={knowledgeReaderMarkdownError}
        markdownLoading={knowledgeReaderMarkdownLoading}
        markdownSource={knowledgeReaderMarkdownSource}
        open={knowledgeReaderOpen}
        onClose={onKnowledgeReaderClose}
        onTabChange={onKnowledgeReaderTabChange}
      />
    </div>
  )
}

export default KnowledgeView
