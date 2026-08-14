import React from 'react'
import { Camera } from 'lucide-react'
import CreateActionButton from './CreateActionButton'

const MediaAddActionButton = ({ label = 'Add photo', icon, className = '', ...buttonProps }) => (
  <CreateActionButton
    {...buttonProps}
    label={label}
    icon={icon || <Camera size={16} />}
    className={`media-add-action ${className}`.trim()}
  />
)

export default MediaAddActionButton
