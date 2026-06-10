import React from 'react'
import { Loader } from 'lucide-react'

const ButtonLoader = ({ label = 'Loading...', size = 14, className = '' }) => (
  <span className={`d-inline-flex align-items-center ${className}`.trim()}>
    <Loader size={size} className={label ? 'icon-spin me-2' : 'icon-spin'} />
    {label ? <span>{label}</span> : null}
  </span>
)

export default ButtonLoader
