import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import 'src/scss/style.scss'
import PhotoEditorGallery from 'src/components/report-workflow/PhotoEditorGallery'
import ReportPhotoGallery from 'src/components/report-workflow/ReportPhotoGallery'
import { PhotosGrid } from 'src/components/report-workflow/ReportViewComponents'
import { PhotoGallery } from 'src/views/inspection/form/components/InspectionDisplayShared'

const h = React.createElement
const svgPhoto = (label, color) =>
  `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="960" height="720" viewBox="0 0 960 720">
      <rect width="960" height="720" fill="${color}" />
      <circle cx="480" cy="310" r="150" fill="#ffffff" opacity="0.72" />
      <text x="480" y="560" text-anchor="middle" font-family="sans-serif" font-size="54" fill="#132238">${label}</text>
    </svg>
  `)}`

const initialPhotos = [
  {
    id: 'photo-1',
    fileName: 'DEVICE_PRIVATE_MEDIA_HARNESS_987654.jpg',
    url: svgPhoto('Pump coupling', '#b9d8ff'),
    description: 'Damaged pump coupling',
  },
  {
    id: 'photo-2',
    fileName: 'DEVICE_PRIVATE_MEDIA_HARNESS_123456.jpg',
    url: svgPhoto('Corrective action', '#c9efd4'),
    description: '',
  },
]

const section = (testId, title, content) =>
  h('section', { 'data-testid': testId }, h('h2', { className: 'h5' }, title), content)

const Harness = () => {
  const [editablePhotos, setEditablePhotos] = useState(initialPhotos)

  return h(
    'main',
    {
      className: 'container-fluid py-3 d-grid gap-4',
      'data-testid': 'day6-media-harness',
    },
    section(
      'report-gallery',
      'Report evidence',
      h(ReportPhotoGallery, { photos: initialPhotos, title: 'Report evidence photos' }),
    ),
    section(
      'inspection-read-only',
      'Inspection evidence',
      h(PhotoGallery, { readOnly: true, photos: initialPhotos }),
    ),
    section('resolution-grid', 'Resolution evidence', h(PhotosGrid, { photos: initialPhotos })),
    section(
      'photo-editor',
      'Editable evidence',
      h(PhotoEditorGallery, {
        photos: editablePhotos,
        onChangeDescription: (target, description) =>
          setEditablePhotos((current) =>
            current.map((photo) => (photo.id === target.id ? { ...photo, description } : photo)),
          ),
        onRemove: (target) =>
          setEditablePhotos((current) => current.filter((photo) => photo.id !== target.id)),
      }),
    ),
  )
}

createRoot(document.getElementById('root')).render(h(Harness))
