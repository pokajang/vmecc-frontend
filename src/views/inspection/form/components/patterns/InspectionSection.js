import React from 'react'

export const InspectionSectionHeading = ({
  as: Heading = 'h3',
  title,
  description = '',
  action = null,
  className = '',
}) => (
  <div
    className={`inspection-section-heading d-flex flex-wrap align-items-start justify-content-between gap-2 ${className}`.trim()}
  >
    <div className="min-w-0">
      <Heading className="inspection-section-heading__title mb-0">{title}</Heading>
      {description ? (
        <div className="inspection-section-heading__description text-body-secondary">
          {description}
        </div>
      ) : null}
    </div>
    {action ? <div className="inspection-section-heading__action">{action}</div> : null}
  </div>
)

export const InspectionSection = ({
  as: Component = 'section',
  title = '',
  description = '',
  action = null,
  headingAs = 'h3',
  className = '',
  children,
  ...props
}) => (
  <Component className={`inspection-section d-grid gap-3 ${className}`.trim()} {...props}>
    {title ? (
      <InspectionSectionHeading
        as={headingAs}
        title={title}
        description={description}
        action={action}
      />
    ) : null}
    {children}
  </Component>
)

export const InspectionInset = ({ tone = 'neutral', className = '', children, ...props }) => (
  <div
    className={`inspection-inset inspection-inset--${tone} d-grid gap-2 ${className}`.trim()}
    {...props}
  >
    {children}
  </div>
)
