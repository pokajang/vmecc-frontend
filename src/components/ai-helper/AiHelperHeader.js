import { CDropdown, CDropdownItem, CDropdownMenu, CDropdownToggle, CTooltip } from '@coreui/react'
import { Clock3, FileUp, Languages, Plus, Sparkles, X } from 'lucide-react'

import { RESPONSE_LANGUAGE_OPTIONS, responseLanguageLabel } from './constants'

const AiHelperHeader = ({
  historyOpen,
  knowledgeOpen,
  responseLanguage,
  sending,
  onClose,
  onNewChat,
  onResponseLanguageChange,
  onToggleHistory,
  onToggleKnowledge,
}) => (
  <div className="ai-helper-header">
    <div className="ai-helper-header__brand">
      <div className="ai-helper-icon">
        <Sparkles size={17} />
      </div>
      <div className="ai-helper-header__title-wrap">
        <div className="ai-helper-title">
          <h2 className="ai-helper-title__text">Ask AI</h2>
          <span className="ai-helper-beta-text">Beta</span>
        </div>
      </div>
    </div>
    <div className="ai-helper-header__actions">
      <CTooltip content="Response language" placement="bottom">
        <span className="ai-helper-language-wrap">
          <CDropdown alignment="end">
            <CDropdownToggle
              caret={false}
              className="ai-helper-language-toggle"
              disabled={sending}
              aria-label="Response language"
              title="Response language"
            >
              <Languages size={15} />
              <span>{responseLanguageLabel(responseLanguage)}</span>
            </CDropdownToggle>
            <CDropdownMenu>
              {RESPONSE_LANGUAGE_OPTIONS.map((option) => (
                <CDropdownItem
                  key={option.value}
                  active={responseLanguage === option.value}
                  disabled={sending}
                  onClick={() => {
                    if (!sending) onResponseLanguageChange(option.value)
                  }}
                >
                  {option.label}
                </CDropdownItem>
              ))}
            </CDropdownMenu>
          </CDropdown>
        </span>
      </CTooltip>
      <CTooltip content={historyOpen ? 'Back to chat' : 'Chat history'} placement="bottom">
        <button
          type="button"
          className={`ai-helper-icon-btn${historyOpen ? ' active' : ''}`}
          onClick={onToggleHistory}
          aria-label={historyOpen ? 'Back to chat' : 'Open chat history'}
          title={historyOpen ? 'Back to chat' : 'Chat history'}
          disabled={sending}
        >
          <Clock3 size={16} />
        </button>
      </CTooltip>
      <CTooltip content="New chat" placement="bottom">
        <button
          type="button"
          className="ai-helper-icon-btn"
          onClick={onNewChat}
          aria-label="Start new Ask AI chat"
          title="New chat"
          disabled={sending}
        >
          <Plus size={16} />
        </button>
      </CTooltip>
      <CTooltip content="Reference documents" placement="bottom">
        <button
          type="button"
          className={`ai-helper-icon-btn${knowledgeOpen ? ' active' : ''}`}
          onClick={onToggleKnowledge}
          aria-label={knowledgeOpen ? 'Back to chat' : 'Open knowledge sources'}
          title="Reference documents"
          disabled={sending}
        >
          <FileUp size={16} />
        </button>
      </CTooltip>
      <CTooltip content="Close" placement="bottom">
        <button
          type="button"
          className="ai-helper-icon-btn"
          onClick={onClose}
          aria-label="Close Ask AI"
          title="Close"
        >
          <X size={16} />
        </button>
      </CTooltip>
    </div>
  </div>
)

export default AiHelperHeader
