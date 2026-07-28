import React, { useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CFormCheck,
  CFormInput,
  CFormLabel,
} from '@coreui/react'

import { uploadAiHelperMarkdownKnowledge } from 'src/services/apiClient'

const AiHelperMarkdownUploadCard = ({ onUploaded = () => {} }) => {
  const [file, setFile] = useState(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [title, setTitle] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  const upload = async () => {
    if (!file || !acknowledged || uploading) return
    if (!/\.(md|markdown)$/i.test(file.name || '')) {
      setError('Upload a Markdown .md file.')
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title.trim())
    formData.append('acknowledged', 'true')

    setUploading(true)
    setError(null)
    setNotice(null)
    try {
      const response = await uploadAiHelperMarkdownKnowledge(formData)
      setFile(null)
      setFileInputKey((current) => current + 1)
      setTitle('')
      setAcknowledged(false)
      setNotice(response?.message || 'Markdown knowledge uploaded.')
      await onUploaded()
    } catch (uploadError) {
      setError(uploadError?.payload?.message || 'Unable to upload Markdown knowledge.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <CCard className="mb-4" data-testid="ai-helper-markdown-upload">
      <CCardHeader>Private AI Knowledge Upload</CCardHeader>
      <CCardBody>
        <p className="small text-body-secondary">
          Internal Ask AI content. It won&apos;t appear in the reference document library.
        </p>
        {error ? <CAlert color="danger">{error}</CAlert> : null}
        {notice ? <CAlert color="success">{notice}</CAlert> : null}
        <CFormLabel htmlFor="ai-helper-admin-markdown-file">Markdown file</CFormLabel>
        <CFormInput
          id="ai-helper-admin-markdown-file"
          key={fileInputKey}
          type="file"
          accept=".md,.markdown,text/markdown,text/plain"
          disabled={uploading}
          onChange={(event) => {
            const nextFile = event.target.files?.[0] || null
            setFile(nextFile)
            setError(null)
            if (nextFile && !title.trim()) setTitle(nextFile.name.replace(/\.(md|markdown)$/i, ''))
          }}
        />
        <CFormLabel className="mt-3" htmlFor="ai-helper-admin-markdown-title">
          Title
        </CFormLabel>
        <CFormInput
          id="ai-helper-admin-markdown-title"
          value={title}
          maxLength={140}
          disabled={uploading}
          placeholder="Optional. Defaults to file name or frontmatter title."
          onChange={(event) => setTitle(event.target.value)}
        />
        <CFormCheck
          id="ai-helper-admin-markdown-acknowledgement"
          className="mt-3"
          checked={acknowledged}
          disabled={uploading}
          label="I confirm this Markdown is approved source material for Ask AI."
          onChange={(event) => setAcknowledged(event.target.checked)}
        />
        <CButton
          className="mt-3"
          size="sm"
          color="primary"
          disabled={!file || !acknowledged || uploading}
          onClick={upload}
        >
          {uploading ? 'Uploading...' : 'Upload private knowledge'}
        </CButton>
      </CCardBody>
    </CCard>
  )
}

export default AiHelperMarkdownUploadCard
