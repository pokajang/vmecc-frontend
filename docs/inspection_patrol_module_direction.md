# Inspection & Patrol Module Direction

## 1. Purpose

Build a unified **Inspection & Patrol** module for the OSHWARE-style web application. The module must support both planned inspections and quick issue reporting from the field.

The module must not be designed as one fixed inspection form. It must be designed as a **template-driven inspection engine** where different inspection use cases load different sections, checklist items, fields, conditional logic, and action workflows.

The system must support the following operational reality:

- Some inspections are planned and event-based, such as shift patrols, plant status patrols, fire water pump house checks, 5S inspections, fire extinguisher inspections, vehicle pre-operational checks, and emergency readiness checks.
- Some observations are quick and finding-based, where the user sees an issue and wants to report it immediately without starting a full inspection event.
- A single inspection event may cover a long duration, multiple zones, multiple assets, multiple checkpoints, and several findings.
- A finding may need corrective action and close-out after the inspection event itself has already been completed.

The final design must use a **hybrid parent-child model**:

```text
Inspection Event
  └── Inspection Item / Checkpoint / Asset Check
        └── Finding
              └── Corrective Action / Close-Out
```

The parent-level inspection event represents the operational record of the inspection or patrol. The child-level items represent what was checked. Findings represent actionable issues discovered during the inspection or reported independently.

---

## 2. Core Design Principle

Use **one unified module** with two main entry points:

```text
1. Start Inspection
2. Report Finding
```

### 2.1 Start Inspection

This is for structured, planned, or recurring inspection work. The user selects an inspection template, and the system loads the appropriate form sections and checklist items.

Examples:

- Plant Status Patrol
- Fire Water Pump House Inspection
- Vehicle Pre-Operational Inspection
- Emergency Equipment Readiness Check
- Fire Extinguisher Monthly Inspection
- Housekeeping / 5S Inspection
- Chemical Safety Review
- Wildlife Monitoring
- Site Activity Observation

### 2.2 Report Finding

This is for fast field reporting. The user should be able to report an issue quickly, with or without an active inspection event.

Examples:

- Pump leakage observed
- Road cracking identified
- Barricade missing
- Scaffold blocking access
- Fire extinguisher obstructed
- SDS folder incomplete
- Chemical label missing
- Wildlife sighting
- Equipment not operational

The **Report Finding** workflow must be short, mobile-friendly, and able to create an actionable record immediately.

---

## 3. Event-Based vs Finding-Based Behaviour

The system must support both behaviour types.

### 3.1 Event-Based Inspection

An event-based inspection is used when an inspector performs a scheduled or planned inspection activity over a period of time.

Example:

```text
Inspection Event: Plant Status Patrol
Date: 31 March 2026
Shift: Night
Patrol Time: 1926-2004
Zones Covered: Zone 3, Zone 4/4B, Zone 5
Inspector: User A
```

Inside this event, the user may check multiple areas and assets:

```text
Zone 3
- ER01
- ER02
- EP03
- ER04
- RC05

Zone 4/4B
- Jockey Pump No. 1
- Jockey Pump No. 2
- Electrical Pump No. 3
- Electrical Pump No. 4
- Diesel Pump
- Diesel Tank Level
- Pipeline Pressure
- Sump Pump Indicator

Zone 5
- DN10
- DN11
- DN12
- CN01
```

The inspection event remains open while the user performs the patrol. The system must allow progressive saving and must not require the whole form to be completed in one sitting.

### 3.2 Finding-Based Reporting

A finding-based record is used when the user sees a specific issue and wants to report it immediately.

Example:

```text
Finding: Jockey Pump No. 2 minor leakage
Location: Zone 4/4B, Fire Water Pump House
Asset: Jockey Pump No. 2
Priority: Medium
Photo: Uploaded
Immediate Action: Reported to maintenance
Status: Open
```

A finding may be linked to:

- An active inspection event
- A specific inspection item / checkpoint
- A specific asset / machine / workstation
- A location only, if no asset exists
- No inspection event, if it was reported ad hoc

### 3.3 Required Hybrid Logic

The system must behave as follows:

```text
Inspection Event = proof that an inspection or patrol was performed
Inspection Item = proof that a specific area, asset, or checklist point was checked
Finding = proof that an issue was found
Corrective Action = proof that the issue was assigned, resolved, verified, and closed
```

Inspection events and findings must have separate lifecycle statuses.

An inspection event can be closed while its findings remain open.

Example:

```text
Inspection Event: 31 March Night Patrol
Status: Closed

Finding: Jockey Pump No. 2 minor leakage
Status: In Progress
```

---

## 4. Functional Scope

The module must include the following functional areas:

1. Inspection template management
2. Dynamic inspection form rendering
3. Inspection event creation and progress tracking
4. Inspection item / checkpoint recording
5. Quick finding reporting
6. Corrective action assignment
7. Photo and attachment upload
8. Supervisor review and verification
9. Finding close-out
10. Dashboard and filtering
11. Export-ready reporting

---

## 5. User Roles

Use a role-based access approach. Initial roles may be simple.

### 5.1 Inspector

The inspector can:

- Start an inspection event
- Continue an in-progress inspection event
- Complete and submit an inspection event
- Record inspection item statuses
- Add readings
- Upload photos
- Report findings
- Add immediate actions
- View own assigned inspections and findings

### 5.2 Supervisor / Reviewer

The supervisor can:

- View submitted inspections
- Review inspection records
- Assign corrective actions
- Reassign responsible persons
- Verify finding closure
- Reject insufficient closure evidence
- Close inspection events
- Close findings after verification

### 5.3 Action Owner

The action owner can:

- View assigned findings
- Update corrective action progress
- Add action remarks
- Upload close-out evidence
- Submit action for verification

### 5.4 Admin

The admin can:

- Create and edit inspection templates
- Create and edit inspection sections
- Create and edit dynamic fields
- Configure field options
- Configure conditional logic
- Manage locations, zones, assets, and users
- Configure statuses and priority levels where applicable

---

## 6. Main User Flows

## 6.1 Flow A: Start Planned Inspection

```text
User clicks "Start Inspection"
→ System shows available inspection templates
→ User selects template
→ User fills common inspection header
→ System creates inspection_event with status "In Progress"
→ System loads template sections and items
→ User completes items progressively
→ User records findings where needed
→ User submits event
→ Event status changes to "Submitted"
→ Supervisor reviews event
→ Event status changes to "Reviewed" or "Closed"
```

Important behaviour:

- The event must be created as soon as the user starts the inspection.
- The form must auto-save regularly.
- Each inspection item should save independently.
- Findings should be submitted immediately and not wait for final event submission.

## 6.2 Flow B: Continue In-Progress Inspection

```text
User opens "My In-Progress Inspections"
→ System lists active inspection events
→ User selects event
→ System loads saved progress
→ User continues checking remaining items
→ User submits when complete
```

The system must prevent data loss from network interruption, accidental page close, or long inspection duration.

## 6.3 Flow C: Add Finding During Active Inspection

```text
User is inside an inspection event
→ User clicks "Add Finding"
→ System pre-fills event, location, zone, and selected asset/checkpoint if available
→ User enters finding details
→ User uploads photo evidence if available
→ User sets risk level / priority
→ User records immediate action
→ User submits finding
→ Finding becomes visible to supervisor immediately
→ User returns to inspection event and continues
```

## 6.4 Flow D: Quick Report Finding Without Inspection Event

```text
User clicks "Report Finding"
→ User selects location / zone / asset if available
→ User enters finding title and description
→ User uploads photo
→ User selects priority
→ User records immediate action
→ User submits
→ System creates standalone finding
→ Supervisor assigns corrective action
```

This finding may have `inspection_event_id = null`.

## 6.5 Flow E: Corrective Action Close-Out

```text
Supervisor assigns finding to action owner
→ Action owner updates progress
→ Action owner uploads close-out evidence
→ Action owner marks action as "Resolved"
→ Supervisor reviews evidence
→ Supervisor verifies closure
→ Finding status changes to "Closed"
```

If evidence is insufficient:

```text
Supervisor rejects closure
→ Finding status changes back to "In Progress"
→ Supervisor adds rejection remark
→ Action owner revises action
```

---

## 7. Inspection Status Model

Do not use only one status field for everything. Use separate statuses for event, item, finding, and corrective action.

### 7.1 Inspection Event Status

```text
Draft
In Progress
Submitted
Reviewed
Closed
Cancelled
```

Recommended meaning:

| Status | Meaning |
|---|---|
| Draft | Event created but not actively started or incomplete setup |
| In Progress | Inspection is ongoing |
| Submitted | Inspector has completed and submitted the event |
| Reviewed | Supervisor has reviewed the submitted event |
| Closed | Event is administratively complete |
| Cancelled | Event was cancelled and should not be treated as completed |

### 7.2 Inspection Item Status

```text
Pending
Checked
Issue Found
Not Applicable
Skipped
```

Recommended meaning:

| Status | Meaning |
|---|---|
| Pending | Item has not been checked |
| Checked | Item checked with no issue |
| Issue Found | Item checked and one or more findings were raised |
| Not Applicable | Item is not applicable for this inspection |
| Skipped | Item was skipped and should require a reason |

### 7.3 Finding Status

```text
Open
Assigned
In Progress
Resolved
Verification Required
Closed
Rejected
Cancelled
```

Recommended meaning:

| Status | Meaning |
|---|---|
| Open | Finding created but no owner assigned yet |
| Assigned | Responsible person or party assigned |
| In Progress | Corrective action is ongoing |
| Resolved | Action owner claims action is completed |
| Verification Required | Awaiting supervisor verification |
| Closed | Finding verified and closed |
| Rejected | Closure evidence rejected or action inadequate |
| Cancelled | Finding cancelled with justification |

### 7.4 Corrective Action Status

```text
Not Assigned
Assigned
In Progress
Completed
Verified
Rejected
Overdue
```

Corrective action due dates must be monitored separately from inspection event closure.

---

## 8. Template-Driven Form Design

The inspection module must use templates.

A template defines:

- Template name
- Category
- Description
- Applicable locations or assets
- Sections
- Fields
- Field types
- Required fields
- Options
- Conditional logic
- Scoring rules, if needed later
- Version number
- Active / inactive status

### 8.1 Template Examples

#### 8.1.1 Plant Status Patrol

Sections:

```text
Header
Zone 3 Equipment Status
Zone 4/4B Fire Water Pump House
Zone 5 Port / Vessel Equipment
General Remarks
Findings
```

Fields may include:

```text
ER01 status
ER02 status
EP03 status
ER04 status
RC05 status
Jockey Pump No. 1 mode
Jockey Pump No. 1 pressure
Jockey Pump No. 2 mode
Jockey Pump No. 2 pressure
Electrical Pump No. 3 mode
Electrical Pump No. 4 mode
Diesel pump mode
Diesel tank level
Pipeline pressure
Sump pump indicator
DN10 status
DN11 status
DN12 status
CN01 status
Weather
Patrol start time
Patrol end time
```

#### 8.1.2 Fire Water Pump House Inspection

Sections:

```text
Pump Status
Pressure Readings
Diesel Pump and Tank
Leakage Observation
Access / Area Condition
Findings and Actions
```

Fields:

```text
Jockey Pump No. 1 mode
Jockey Pump No. 1 pressure
Jockey Pump No. 2 mode
Jockey Pump No. 2 pressure
Electrical Pump No. 3 mode
Electrical Pump No. 4 mode
Diesel pump mode
Diesel tank percentage
Pipeline pressure
Sump pump indicator
Leakage observed?
Pressure drop observed?
Access obstruction?
Scaffold obstruction?
Road/access issue?
Photo evidence
Remarks
```

#### 8.1.3 Site Patrol Observation

Sections:

```text
Area Observed
Activity Observed
Control Verification
Hazard Observation
Immediate Action
Follow-Up
```

Fields:

```text
Zone
Exact location
Activity observed
Contractor / party involved
Work status
Barricade provided?
Signage provided?
Access controlled?
Scaffolding observed?
Lifting activity observed?
Housekeeping acceptable?
Hazard observed?
Hazard type
Existing control
Immediate action taken
Finding required?
Photo evidence
```

#### 8.1.4 Vehicle / ER Equipment Pre-Operational Inspection

Sections:

```text
Vehicle Readiness
Emergency Equipment
Communication Equipment
Defect Reporting
Final Readiness
```

Fields:

```text
Vehicle selected
Fuel level
Tyre condition
Light condition
Siren condition
Brake condition
Radio checked?
Emergency tools available?
FRT checked?
RIV checked?
Equipment defect found?
Ready for response?
```

#### 8.1.5 Wildlife Monitoring

Sections:

```text
Monitoring Location
Trap / Cage Condition
Animal Sighting
Response Action
Escalation
```

Fields:

```text
Wild boar cage checked?
Trap condition
Animal sighting?
Wildlife type
Location of sighting
Abnormality observed?
Area secured?
Escalation required?
Action taken
Photo evidence
```

---

## 9. Common Header Fields

Every inspection event should have a common header.

Recommended fields:

```text
Inspection title
Inspection template
Inspection category
Date
Start time
End time
Shift
Site
Location
Zone
Route
Weather
Inspector
Department
Contractor / party involved
Overall status
General remarks
```

Not every field must appear for every template. Template settings can decide which common fields are visible, required, optional, or hidden.

---

## 10. Dynamic Field Types

Support these field types:

```text
text
textarea
number
date
time
datetime
dropdown
radio
checkbox
yes_no
status
reading
photo
file_upload
signature
location
person
asset
risk_level
priority
```

### 10.1 Reading Field

A reading field should support:

```text
value
unit
minimum limit
maximum limit
normal range
abnormal flag
```

Example:

```text
Field: Pipeline Pressure
Value: 10
Unit: bar
```

### 10.2 Status Field

A status field should support reusable options such as:

```text
Operational
Not Operational
Auto
Manual
Off
Normal
Abnormal
Good
Not Good
N/A
```

### 10.3 Photo Field

Photo fields should support:

```text
single photo
multiple photos
caption
linked finding
linked item
uploaded by
uploaded at
```

### 10.4 Asset Field

Asset fields should allow the user to select a machine, workstation, vehicle, or equipment.

The asset may include:

```text
asset code
asset name
asset type
location
zone
status
QR code value
```

---

## 11. Conditional Logic

The dynamic form engine must support conditional fields.

Example 1:

```json
{
  "when": {
    "field_key": "leakage_observed",
    "operator": "equals",
    "value": "yes"
  },
  "then": {
    "show_fields": [
      "leakage_location",
      "leakage_severity",
      "photo_evidence",
      "immediate_action",
      "corrective_action_required"
    ],
    "require_fields": [
      "photo_evidence",
      "immediate_action"
    ]
  }
}
```

Example 2:

```json
{
  "when": {
    "field_key": "equipment_status",
    "operator": "equals",
    "value": "not_operational"
  },
  "then": {
    "show_fields": [
      "reason_not_operational",
      "maintenance_status",
      "affected_operation",
      "follow_up_required"
    ],
    "require_fields": [
      "reason_not_operational",
      "follow_up_required"
    ]
  }
}
```

Example 3:

```json
{
  "when": {
    "field_key": "finding_required",
    "operator": "equals",
    "value": "yes"
  },
  "then": {
    "open_subform": "finding_form"
  }
}
```

The conditional logic should be stored as JSON in the database so templates can be changed without code changes.

---

## 12. Finding Form Requirements

The finding form must be usable both inside and outside an inspection event.

Recommended fields:

```text
Finding title
Finding description
Finding type
Site
Location
Zone
Asset / workstation / machine
Linked inspection event
Linked inspection item
Risk level
Priority
Immediate action taken
Corrective action required
Responsible person / party
Due date
Photo evidence
Status
Reported by
Reported at
```

### 12.1 Finding Type Options

Initial finding types:

```text
Unsafe Condition
Unsafe Act
Equipment Defect
Housekeeping Issue
Fire Protection Issue
Chemical Safety Issue
Environmental Issue
Wildlife Issue
Access / Road Issue
Documentation Issue
Other
```

### 12.2 Risk Level Options

Simple risk level options:

```text
Low
Medium
High
Critical
```

### 12.3 Priority Options

Simple priority options:

```text
Low
Medium
High
Urgent
```

Risk level and priority are related but not necessarily the same. Risk level describes hazard severity. Priority describes how quickly the organisation wants to act.

---

## 13. Corrective Action Requirements

Every finding may have one or more corrective actions.

Recommended fields:

```text
Finding ID
Action description
Action type
Responsible person
Responsible department / contractor
Due date
Status
Progress remarks
Completion remarks
Close-out evidence
Submitted by
Submitted at
Verified by
Verified at
Verification remarks
```

### 13.1 Action Type Options

```text
Immediate Correction
Corrective Action
Preventive Action
Maintenance Work Order
Administrative Follow-Up
Training / Briefing
Escalation
```

### 13.2 Overdue Logic

A corrective action is overdue when:

```text
current_date > due_date
AND status is not Completed, Verified, or Closed
```

The dashboard must highlight overdue actions.

---

## 14. Database Direction

The database must be flexible enough to support many inspection types without creating a new table for every form.

Use a template-driven structure.

### 14.1 Suggested Tables

```text
inspection_templates
inspection_template_sections
inspection_template_fields
inspection_template_conditions
inspection_events
inspection_event_items
inspection_answers
inspection_findings
inspection_corrective_actions
inspection_attachments
locations
assets
users
```

### 14.2 inspection_templates

```text
id
name
category
description
version_no
is_active
created_by
created_at
updated_by
updated_at
```

### 14.3 inspection_template_sections

```text
id
template_id
section_name
section_description
sequence_no
is_repeatable
is_required
created_at
updated_at
```

`is_repeatable` is useful for cases where the user may need to check multiple assets under the same section.

Example:

```text
Section: Fire Extinguisher Check
Repeatable: Yes
```

### 14.4 inspection_template_fields

```text
id
template_id
section_id
field_label
field_key
field_type
options_json
validation_json
unit
placeholder
help_text
is_required
is_visible
sequence_no
created_at
updated_at
```

### 14.5 inspection_template_conditions

```text
id
template_id
source_field_key
operator
compare_value
action_json
created_at
updated_at
```

The `action_json` may contain show, hide, require, unrequire, calculate, or open subform actions.

### 14.6 inspection_events

```text
id
template_id
inspection_no
title
category
site_id
location_id
zone
route
shift
weather
start_time
end_time
inspector_id
status
overall_status
overall_remarks
submitted_at
reviewed_by
reviewed_at
closed_by
closed_at
created_at
updated_at
```

### 14.7 inspection_event_items

```text
id
inspection_event_id
template_section_id
template_field_group_id
asset_id
location_id
zone
item_label
item_sequence
status
checked_by
checked_at
remarks
created_at
updated_at
```

Use this table to represent a checked checkpoint, asset, machine, workstation, or repeated checklist item.

### 14.8 inspection_answers

```text
id
inspection_event_id
inspection_event_item_id
template_field_id
field_key
value_text
value_number
value_date
value_datetime
value_json
unit
status
remarks
answered_by
answered_at
created_at
updated_at
```

Use multiple value columns to support different field types while still allowing generic form rendering.

### 14.9 inspection_findings

```text
id
finding_no
inspection_event_id
inspection_event_item_id
asset_id
location_id
zone
finding_type
title
description
risk_level
priority
immediate_action
corrective_action_required
responsible_person_id
responsible_party
 due_date
status
reported_by
reported_at
verified_by
verified_at
verification_remarks
created_at
updated_at
```

`inspection_event_id` and `inspection_event_item_id` must be nullable to allow standalone findings.

### 14.10 inspection_corrective_actions

```text
id
finding_id
action_no
action_type
action_description
responsible_person_id
responsible_party
due_date
status
progress_remarks
completion_remarks
submitted_by
submitted_at
verified_by
verified_at
verification_remarks
created_at
updated_at
```

### 14.11 inspection_attachments

```text
id
inspection_event_id
inspection_event_item_id
finding_id
corrective_action_id
file_path
file_name
file_type
mime_type
caption
uploaded_by
uploaded_at
created_at
updated_at
```

Attachments must be linkable to event, item, finding, or corrective action.

### 14.12 assets

```text
id
asset_code
asset_name
asset_type
site_id
location_id
zone
qr_code
status
is_active
created_at
updated_at
```

### 14.13 locations

```text
id
site_id
location_name
zone
parent_location_id
is_active
created_at
updated_at
```

---

## 15. Validation Rules

### 15.1 Inspection Event Validation

Before submission, validate:

- Required header fields are completed.
- Required sections are completed.
- Required fields are answered.
- Skipped required items have a reason.
- Any item marked `Issue Found` has at least one linked finding or remark.
- End time is after start time.

### 15.2 Finding Validation

Before finding submission, validate:

- Finding title is completed.
- Location or asset is selected.
- Description is completed.
- Risk level is selected.
- Priority is selected.
- Immediate action is required for High, Critical, or Urgent findings.
- Photo evidence may be required depending on finding type or priority.

### 15.3 Corrective Action Validation

Before action assignment, validate:

- Responsible person or party is assigned.
- Due date is provided.
- Action description is completed.

Before action close-out, validate:

- Completion remarks are provided.
- Close-out evidence is uploaded if required.
- Supervisor verification is recorded before final closure.

---

## 16. Auto-Save and Offline-Friendly Behaviour

Long inspection events must not depend on one final submit action only.

Required behaviour:

```text
- Save inspection event immediately after creation.
- Auto-save header updates.
- Auto-save each answer after field blur or section change.
- Auto-save each item/checkpoint independently.
- Allow user to resume incomplete inspections.
- Show last saved timestamp.
- Prevent duplicate submission.
```

Optional future behaviour:

```text
- Local browser storage for temporary offline capture.
- Sync queue when connection returns.
- Conflict resolution if the same record is edited from multiple devices.
```

For Version 1, server-side autosave is sufficient if the app is online-only.

---

## 17. UI Direction

## 17.1 Main Module Page

The main page should show:

```text
- Start Inspection button
- Report Finding button
- My In-Progress Inspections
- Pending Review
- Open Findings
- Overdue Actions
- Recent Inspections
```

Recommended filters:

```text
Inspection type
Status
Date range
Shift
Site
Zone
Inspector
Finding status
Priority
Responsible person
```

## 17.2 Start Inspection Screen

```text
Select Inspection Type / Template
Select Site / Location / Zone
Select Shift
Enter Start Time
Select Weather if applicable
Start button
```

## 17.3 Inspection Event Form Screen

Use a section-based layout.

Recommended layout:

```text
Header card
Progress indicator
Section navigation
Checklist / dynamic fields
Add Finding button
Save draft button
Submit inspection button
```

The form should show:

```text
Total items
Completed items
Pending items
Items with findings
```

Example:

```text
Progress: 12 / 18 items completed
Findings: 3 open
Last saved: 10:42 AM
```

## 17.4 Quick Finding Screen

Keep this form short.

Recommended fields shown first:

```text
Location / Zone
Asset / Workstation
Finding title
Description
Photo
Risk level
Priority
Immediate action
Submit
```

Advanced fields can be collapsed under:

```text
More Details
```

## 17.5 Review Screen

Supervisor should see:

```text
Inspection summary
Timeline
Checked items
Findings raised
Photos
Inspector remarks
Review decision
```

Review actions:

```text
Approve / Review Complete
Return for clarification
Assign findings
Close event
```

## 17.6 Finding Detail Screen

Show:

```text
Finding title
Status
Risk level
Priority
Location
Asset
Reported by
Reported at
Description
Immediate action
Photos
Corrective actions
Comments / timeline
Close-out evidence
Verification decision
```

---

## 18. Dashboard Requirements

The dashboard should provide operational visibility.

Initial widgets:

```text
Total inspections this month
Inspections in progress
Submitted inspections pending review
Open findings
High / critical findings
Overdue corrective actions
Findings by location
Findings by inspection type
Repeated findings by asset
```

Useful trend indicators:

```text
Most frequent finding type
Most affected asset
Most affected zone
Average close-out time
Recurring overdue responsible party
```

---

## 19. Reporting and Export

The module should support report generation later.

Initial export formats:

```text
PDF
Excel / CSV
```

Inspection event report should include:

```text
Inspection header
Checklist answers
Readings
Status of each item
Findings
Photos
Immediate actions
Corrective actions
Review details
Signatures if available
```

Finding report should include:

```text
Finding details
Risk level
Photos
Immediate action
Corrective action
Responsible person
Due date
Status history
Close-out evidence
Verification details
```

---

## 20. Notification Direction

Version 1 can keep notification simple.

Trigger notifications when:

```text
Finding created
Finding assigned
Corrective action due soon
Corrective action overdue
Action marked resolved
Closure rejected
Finding closed
Inspection submitted for review
```

Notification channels can initially be in-app only. Email or WhatsApp can be added later.

---

## 21. Audit Trail

The module should maintain an audit trail for critical actions.

Track:

```text
Record created
Record updated
Status changed
Finding assigned
Due date changed
Action submitted
Closure verified
Closure rejected
Attachment uploaded
Attachment deleted
```

Suggested table:

```text
audit_logs
- id
- entity_type
- entity_id
- action
- old_value_json
- new_value_json
- performed_by
- performed_at
- ip_address
- user_agent
```

This is important because inspection and corrective action records may later be used as compliance evidence.

---

## 22. Numbering Format

Use human-readable reference numbers.

Suggested formats:

```text
Inspection Event: INS-2026-000001
Finding: FND-2026-000001
Corrective Action: ACT-2026-000001
```

The numbering should be generated by the backend to prevent duplicates.

---

## 23. Versioning of Templates

Templates must support versioning.

Reason:

If an admin changes a template in the future, old inspection records must still remain readable based on the template version used at the time.

Rules:

```text
- Each template has version_no.
- Submitted inspections must store the template version used.
- Editing an active template should either create a new version or only affect future inspections.
- Historical inspection records must not break when template fields are changed.
```

---

## 24. Minimum Viable Product Scope

For Version 1, build only the essentials.

### 24.1 Must Have

```text
- Template list seeded by developer
- Start Inspection
- Dynamic form rendering
- Save inspection event
- Save inspection item answers
- Submit inspection event
- Quick Report Finding
- Add Finding inside inspection event
- Assign responsible person
- Set due date
- Upload photos
- Update finding status
- Close finding after verification
- Basic dashboard
- Basic filtering
```

### 24.2 Should Have

```text
- Template admin UI
- Conditional logic UI
- Export to PDF
- Export to Excel / CSV
- In-app notifications
- Audit trail
```

### 24.3 Later

```text
- Offline mode
- QR code asset scanning
- GPS tagging
- Advanced scoring
- Risk matrix engine
- AI finding summarisation
- Mobile app wrapper
- WhatsApp notification
- Work order integration
```

---

## 25. Suggested Initial Templates to Seed

Seed these templates first:

```text
1. Plant Status Patrol
2. Fire Water Pump House Inspection
3. Site Patrol Observation
4. Vehicle / ER Equipment Pre-Operational Inspection
5. Housekeeping / 5S Inspection
6. Fire Extinguisher Monthly Inspection
7. Chemical Safety Review
8. Wildlife Monitoring
```

Do not overbuild too many templates initially. The purpose is to prove the dynamic inspection engine works.

---

## 26. Suggested API Endpoints

Use REST-style endpoints if the application is Laravel or similar.

### 26.1 Templates

```text
GET    /api/inspection/templates
GET    /api/inspection/templates/{id}
POST   /api/inspection/templates
PUT    /api/inspection/templates/{id}
DELETE /api/inspection/templates/{id}
```

### 26.2 Inspection Events

```text
GET    /api/inspection/events
GET    /api/inspection/events/{id}
POST   /api/inspection/events
PUT    /api/inspection/events/{id}
POST   /api/inspection/events/{id}/submit
POST   /api/inspection/events/{id}/review
POST   /api/inspection/events/{id}/close
```

### 26.3 Inspection Items / Answers

```text
GET    /api/inspection/events/{id}/items
POST   /api/inspection/events/{id}/items
PUT    /api/inspection/items/{itemId}
POST   /api/inspection/events/{id}/answers
PUT    /api/inspection/answers/{answerId}
```

### 26.4 Findings

```text
GET    /api/inspection/findings
GET    /api/inspection/findings/{id}
POST   /api/inspection/findings
PUT    /api/inspection/findings/{id}
POST   /api/inspection/findings/{id}/assign
POST   /api/inspection/findings/{id}/resolve
POST   /api/inspection/findings/{id}/verify
POST   /api/inspection/findings/{id}/reject
POST   /api/inspection/findings/{id}/close
```

### 26.5 Corrective Actions

```text
GET    /api/inspection/findings/{id}/actions
POST   /api/inspection/findings/{id}/actions
PUT    /api/inspection/actions/{actionId}
POST   /api/inspection/actions/{actionId}/complete
POST   /api/inspection/actions/{actionId}/verify
```

### 26.6 Attachments

```text
POST   /api/inspection/attachments
DELETE /api/inspection/attachments/{id}
```

---

## 27. Frontend Component Direction

Recommended components:

```text
InspectionDashboard
InspectionTemplateSelector
InspectionEventForm
InspectionHeaderForm
InspectionSectionRenderer
InspectionFieldRenderer
InspectionProgressCard
InspectionItemCard
FindingQuickForm
FindingDetailDrawer
CorrectiveActionPanel
AttachmentUploader
ReviewPanel
StatusBadge
PriorityBadge
```

### 27.1 Dynamic Field Renderer

Create a central field renderer that maps field types to components.

Pseudo-logic:

```text
switch field.field_type:
  case "text": render text input
  case "textarea": render textarea
  case "number": render number input
  case "dropdown": render select
  case "radio": render radio group
  case "checkbox": render checkbox group
  case "yes_no": render yes/no toggle
  case "reading": render value + unit input
  case "photo": render attachment uploader
  case "asset": render asset selector
  case "person": render user selector
  case "risk_level": render risk level dropdown
```

Do not hardcode inspection-specific forms in separate React components unless absolutely necessary. The system should render most templates from JSON configuration.

---

## 28. Example Template JSON

Use this as a conceptual example. Actual implementation may differ.

```json
{
  "name": "Fire Water Pump House Inspection",
  "category": "Fire Protection",
  "version_no": 1,
  "sections": [
    {
      "section_name": "Pump Status",
      "sequence_no": 1,
      "fields": [
        {
          "field_label": "Jockey Pump No. 1 Mode",
          "field_key": "jockey_pump_1_mode",
          "field_type": "dropdown",
          "options": ["Auto", "Manual", "Off", "N/A"],
          "required": true
        },
        {
          "field_label": "Jockey Pump No. 1 Pressure",
          "field_key": "jockey_pump_1_pressure",
          "field_type": "reading",
          "unit": "psi",
          "required": true
        },
        {
          "field_label": "Jockey Pump No. 2 Mode",
          "field_key": "jockey_pump_2_mode",
          "field_type": "dropdown",
          "options": ["Auto", "Manual", "Off", "N/A"],
          "required": true
        },
        {
          "field_label": "Jockey Pump No. 2 Pressure",
          "field_key": "jockey_pump_2_pressure",
          "field_type": "reading",
          "unit": "psi",
          "required": true
        }
      ]
    },
    {
      "section_name": "Abnormality",
      "sequence_no": 2,
      "fields": [
        {
          "field_label": "Leakage Observed?",
          "field_key": "leakage_observed",
          "field_type": "yes_no",
          "required": true
        },
        {
          "field_label": "Leakage Description",
          "field_key": "leakage_description",
          "field_type": "textarea",
          "required": false,
          "visible_when": {
            "field_key": "leakage_observed",
            "operator": "equals",
            "value": "yes"
          }
        },
        {
          "field_label": "Photo Evidence",
          "field_key": "photo_evidence",
          "field_type": "photo",
          "required": false,
          "visible_when": {
            "field_key": "leakage_observed",
            "operator": "equals",
            "value": "yes"
          }
        }
      ]
    }
  ]
}
```

---

## 29. Example Data Scenarios

### 29.1 Patrol Completed With No Findings

```text
inspection_events.status = Closed
inspection_event_items.status = Checked
inspection_findings = none
```

Meaning:

```text
The inspection was completed and no issue was found.
```

### 29.2 Patrol Completed With Open Findings

```text
inspection_events.status = Closed
inspection_event_items.status = Issue Found
inspection_findings.status = In Progress
```

Meaning:

```text
The inspection was completed, but the issue remains under corrective action.
```

### 29.3 Quick Finding Without Inspection Event

```text
inspection_findings.inspection_event_id = null
inspection_findings.status = Open
```

Meaning:

```text
The issue was reported independently outside a structured inspection event.
```

### 29.4 Repeated Issue on Same Asset

If the same asset has repeated findings:

```text
Asset: Jockey Pump No. 2
Finding 1: Minor leakage, 29 March
Finding 2: Minor leakage, 30 March
Finding 3: Minor leakage, 31 March
```

The dashboard should be able to identify this as a recurring issue later.

---

## 30. Important Implementation Notes

1. Do not create separate database tables for every inspection type.
2. Do not make the inspection form fully hardcoded.
3. Do not force every finding to belong to an inspection event.
4. Do not force the inspection event to remain open until all corrective actions are closed.
5. Do not treat inspection closure and finding closure as the same process.
6. Do not make the quick finding form too long.
7. Do not require every inspection event to have findings.
8. Do not lose records of areas checked with no abnormality.
9. Do not overwrite historical inspection answers when templates are edited.
10. Do not depend on final submit only. Use progressive save.

---

## 31. Recommended Development Sequence

Build in this order:

```text
1. Database migrations for templates, events, items, answers, findings, actions, attachments
2. Seed initial inspection templates
3. API for listing templates
4. API for creating inspection event
5. API for saving answers
6. API for submitting inspection event
7. Quick finding API
8. Add finding inside inspection event
9. Finding list and detail page
10. Corrective action assignment and update
11. Supervisor review and verification
12. Dashboard counters
13. Attachment upload
14. Export report
15. Template admin UI
```

The first milestone should prove this flow:

```text
Start Inspection
→ Fill dynamic form
→ Add finding
→ Submit inspection
→ Assign corrective action
→ Close finding
```

---

## 32. Final Architecture Summary

The final module must behave like this:

```text
Inspection & Patrol Module
├── Start Inspection
│   ├── Template-driven inspection form
│   ├── Event-level progress
│   ├── Item/checkpoint-level records
│   ├── Asset/workstation status
│   ├── Readings and observations
│   ├── Photos
│   └── Submit/review/close event
│
└── Report Finding
    ├── Standalone or linked to active inspection
    ├── Location and asset reference
    ├── Issue description
    ├── Risk and priority
    ├── Photo evidence
    ├── Corrective action
    └── Verify and close
```

The correct design decision is:

```text
Treat inspection progress as event-based at the parent level.
Treat checked machines, workstations, areas, and findings as child-level records.
Allow quick finding reporting independently from a full inspection event.
```

This gives the system the right balance between:

```text
- field practicality
- quick reporting
- audit evidence
- long patrol support
- asset-specific issue tracking
- corrective action management
- future scalability
```

