export const ROLE_OPTIONS = [
  'System Administrator',
  'Contract Manager',
  'Human Resource',
  'Finance',
  'Admin',
  'Incident Commander',
  'Assistant Incident Commander',
  'Tactical Response Team',
  'Client Contract Manager',
  'Representative',
]

export const ROLE_SCOPE_MAP = {
  'System Administrator': 'global',
  'Contract Manager': 'office',
  'Human Resource': 'office',
  Finance: 'office',
  Admin: 'office',
  'Incident Commander': 'site',
  'Assistant Incident Commander': 'site',
  'Tactical Response Team': 'site',
  'Client Contract Manager': 'client_site',
  Representative: 'client_site',
}

export const ROLE_PRIORITY = [
  'System Administrator',
  'Admin',
  'Human Resource',
  'Finance',
  'Contract Manager',
  'Incident Commander',
  'Assistant Incident Commander',
  'Tactical Response Team',
  'Client Contract Manager',
  'Representative',
]

const LEGACY_ROLE_ALIASES = {
  client: 'Representative',
  'system admin': 'System Administrator',
  sysadmin: 'System Administrator',
  'system administrator': 'System Administrator',
}

export const normalizeLegacyRole = (role) => {
  const trimmed = String(role || '').trim()
  if (!trimmed) return ''
  return LEGACY_ROLE_ALIASES[trimmed.toLowerCase()] || trimmed
}

export const ROLE_ABBREVIATIONS = {
  'System Administrator': 'SA',
  'Contract Manager': 'CM',
  'Human Resource': 'HR',
  Finance: 'Fin',
  Admin: 'Adm',
  'Incident Commander': 'IC',
  'Assistant Incident Commander': 'AIC',
  'Tactical Response Team': 'TRT',
  'Client Contract Manager': 'Client CM',
  Representative: 'Client Rep',
}
