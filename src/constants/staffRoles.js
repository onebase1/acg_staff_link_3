/**
 * ✅ CENTRALIZED STAFF ROLES CONFIGURATION
 * 
 * This is the SINGLE SOURCE OF TRUTH for all staff roles across the application.
 * 
 * IMPORTANT: All UI dropdowns MUST import from this file to ensure consistency.
 * 
 * Used in:
 * - InviteStaffModal.jsx (staff invite)
 * - PostShiftV2.jsx (create shift)
 * - StaffForm.jsx (staff registration)
 * - Any other component with role dropdowns
 * 
 * Database: staff.role column uses these exact values
 */

export const STAFF_ROLES = [
  {
    value: 'nurse',
    label: 'Registered Nurse',
    icon: '🩺',
    description: 'Qualified registered nurse with NMC pin',
    aliases: ['rn', 'registered_nurse']
  },
  {
    value: 'healthcare_assistant',
    label: 'Healthcare Assistant (HCA)',
    icon: '👨‍⚕️',
    description: 'Healthcare assistant providing personal care',
    aliases: ['hca', 'care_worker', 'care_assistant', 'carer']
  },
  {
    value: 'senior_care_worker',
    label: 'Senior Care Worker',
    icon: '⭐',
    description: 'Experienced care worker with supervisory responsibilities',
    aliases: ['senior_carer', 'senior_hca']
  },
  {
    value: 'support_worker',
    label: 'Support Worker',
    icon: '🤝',
    description: 'Support worker assisting with daily living activities',
    aliases: ['support_staff']
  },
  {
    value: 'specialist_nurse',
    label: 'Specialist Nurse',
    icon: '💉',
    description: 'Specialist nurse with advanced qualifications',
    aliases: ['specialist_rn']
  }
];

/**
 * Get role label by value
 * @param {string} value - Role value (e.g., 'nurse')
 * @returns {string} Role label (e.g., 'Registered Nurse')
 */
export const getRoleLabel = (value) => {
  const role = STAFF_ROLES.find(r => r.value === value);
  return role ? role.label : value;
};

/**
 * Get role icon by value
 * @param {string} value - Role value (e.g., 'nurse')
 * @returns {string} Role icon (e.g., '🩺')
 */
export const getRoleIcon = (value) => {
  const role = STAFF_ROLES.find(r => r.value === value);
  return role ? role.icon : '👤';
};

/**
 * Format role value for display
 * Converts 'healthcare_assistant' to 'Healthcare Assistant'
 * @param {string} value - Role value
 * @returns {string} Formatted role name
 */
export const formatRoleName = (value) => {
  if (!value) return '';
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Check if a role value is valid
 * @param {string} value - Role value to check
 * @returns {boolean} True if valid
 */
export const isValidRole = (value) => {
  return STAFF_ROLES.some(r => r.value === value);
};

/**
 * Get all role values as array
 * @returns {string[]} Array of role values
 */
export const getRoleValues = () => {
  return STAFF_ROLES.map(r => r.value);
};

/**
 * DEPRECATED ROLES - DO NOT USE
 * These roles have been removed from the system
 */
export const DEPRECATED_ROLES = [
  'care_worker', // Replaced by 'healthcare_assistant' or 'support_worker'
  'hca' // Use 'healthcare_assistant' instead
];

/**
 * Migration map for deprecated roles
 * Use this to migrate old data to new role values
 */
export const ROLE_MIGRATION_MAP = {
  'care_worker': 'healthcare_assistant',
  'hca': 'healthcare_assistant'
};

/**
 * Migrate deprecated role to current role
 * @param {string} oldRole - Deprecated role value
 * @returns {string} Current role value
 */
export const migrateRole = (oldRole) => {
  return ROLE_MIGRATION_MAP[oldRole] || oldRole;
};

/**
 * Normalize role value from alias to canonical value
 * Handles: HCA → healthcare_assistant, care_worker → healthcare_assistant, etc.
 * @param {string} roleValue - Role value or alias
 * @returns {string} Canonical role value
 */
export const normalizeRole = (roleValue) => {
  if (!roleValue) return '';

  const normalized = roleValue.toLowerCase().trim();

  // Check if it's already a valid role
  if (STAFF_ROLES.some(r => r.value === normalized)) {
    return normalized;
  }

  // Check aliases
  for (const role of STAFF_ROLES) {
    if (role.aliases && role.aliases.includes(normalized)) {
      return role.value;
    }
  }

  // Check migration map
  if (ROLE_MIGRATION_MAP[normalized]) {
    return ROLE_MIGRATION_MAP[normalized];
  }

  // Return original if no match found
  return roleValue;
};

/**
 * Get all possible role values including aliases
 * @returns {string[]} Array of all role values and aliases
 */
export const getAllRoleVariants = () => {
  const variants = [];
  STAFF_ROLES.forEach(role => {
    variants.push(role.value);
    if (role.aliases) {
      variants.push(...role.aliases);
    }
  });
  return variants;
};

