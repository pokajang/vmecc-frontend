import React from 'react'

const MobileOverlaySection = ({ children, count = null, className = '', span = false }) => (
  <div
    className={`mobile-overlay-section${span ? ' mobile-nav-sheet-span-2' : ''}${
      className ? ` ${className}` : ''
    }`}
  >
    <span>{children}</span>
    {typeof count === 'number' && <span className="mobile-overlay-section-count">{count}</span>}
  </div>
)

export default MobileOverlaySection
