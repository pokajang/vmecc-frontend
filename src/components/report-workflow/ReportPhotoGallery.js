import React from 'react'
import EvidencePhotoGallery from 'src/components/media/EvidencePhotoGallery'

const ReportPhotoGallery = ({
  photos = [],
  title = 'Photographs',
  contextLabel = 'Report',
  hiddenDescriptionValues = [],
}) => (
  <EvidencePhotoGallery
    photos={photos}
    title={title}
    contextLabel={contextLabel}
    hiddenDescriptionValues={hiddenDescriptionValues}
  />
)

export default ReportPhotoGallery
