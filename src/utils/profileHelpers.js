/**
 * Profile Helpers - Module 21: Admin Profile Pre-Fill Core
 * Calculate profile completion percentage and manage profile data
 */

/**
 * Calculate profile completion percentage
 * Returns: { percentage: 85, missingFields: ['Bank Details', 'Photo'], sections: {...} }
 */
export const calculateProfileCompletion = (staffData) => {
  if (!staffData) return { percentage: 0, missingFields: [], sections: {} };

  const sections = {
    basicInfo: { total: 5, completed: 0, weight: 20 },
    contactInfo: { total: 4, completed: 0, weight: 15 },
    financial: { total: 2, completed: 0, weight: 15 },
    professional: { total: 3, completed: 0, weight: 15 },
    health: { total: 2, completed: 0, weight: 10 },
    documents: { total: 2, completed: 0, weight: 25 }
  };

  const missingFields = [];

  // Basic Info (20%)
  if (staffData.first_name?.trim()) sections.basicInfo.completed++;
  else missingFields.push('First Name');

  if (staffData.last_name?.trim()) sections.basicInfo.completed++;
  else missingFields.push('Last Name');

  if (staffData.email?.trim()) sections.basicInfo.completed++;
  else missingFields.push('Email');

  if (staffData.date_of_birth) sections.basicInfo.completed++;
  else missingFields.push('Date of Birth');

  if (staffData.role) sections.basicInfo.completed++;
  else missingFields.push('Role');

  // Contact Info (15%)
  if (staffData.phone?.trim()) sections.contactInfo.completed++;
  else missingFields.push('Phone');

  if (staffData.address?.line1?.trim()) sections.contactInfo.completed++;
  else missingFields.push('Address');

  if (staffData.address?.postcode?.trim()) sections.contactInfo.completed++;
  else missingFields.push('Postcode');

  if (staffData.emergency_contact?.name?.trim()) sections.contactInfo.completed++;
  else missingFields.push('Emergency Contact');

  // Financial (15%)
  if (staffData.ni_number?.trim()) sections.financial.completed++;
  else missingFields.push('NI Number');

  if (staffData.bank_details?.account_number?.trim() &&
      staffData.bank_details?.sort_code?.trim()) sections.financial.completed++;
  else missingFields.push('Bank Details');

  // Professional (15%)
  if (staffData.months_of_experience >= 0) sections.professional.completed++;
  else missingFields.push('Experience');

  if (staffData.employment_history?.length > 0) sections.professional.completed++;
  else missingFields.push('Employment History');

  if (staffData.references?.length > 0) sections.professional.completed++;
  else missingFields.push('References');

  // Health (10%)
  if (staffData.occupational_health?.cleared_to_work !== undefined) sections.health.completed++;
  else missingFields.push('Health Clearance');

  if (staffData.medication_trained !== undefined) sections.health.completed++;
  else missingFields.push('Medication Training Status');

  // Documents (25%)
  if (staffData.profile_photo_url?.trim()) sections.documents.completed++;
  else missingFields.push('Profile Photo');

  // Check if has any training certificates
  const hasTraining = staffData.mandatory_training &&
    Object.values(staffData.mandatory_training).some(t => t?.completed_date);
  if (hasTraining) sections.documents.completed++;
  else missingFields.push('Training Certificates');

  // Calculate weighted percentage
  let totalPercentage = 0;
  for (const section of Object.values(sections)) {
    const sectionPercent = (section.completed / section.total) * section.weight;
    totalPercentage += sectionPercent;
  }

  return {
    percentage: Math.round(totalPercentage),
    missingFields,
    sections
  };
};

/**
 * Get completion status badge color and text
 */
export const getCompletionBadge = (percentage) => {
  if (percentage >= 80) {
    return { color: 'green', text: 'Ready', icon: '✅' };
  } else if (percentage >= 50) {
    return { color: 'yellow', text: 'In Progress', icon: '⚠️' };
  } else {
    return { color: 'red', text: 'Incomplete', icon: '❌' };
  }
};

/**
 * Format missing fields for user-friendly display
 */
export const formatMissingFields = (missingFields) => {
  if (missingFields.length === 0) return 'Profile complete!';
  if (missingFields.length <= 3) return `Missing: ${missingFields.join(', ')}`;
  return `Missing ${missingFields.length} fields: ${missingFields.slice(0, 3).join(', ')} +${missingFields.length - 3} more`;
};

/**
 * Mask sensitive data (show last 4 characters only)
 */
export const maskSensitiveData = (value, showFull = false) => {
  if (!value || showFull) return value || '';
  if (value.length <= 4) return value;
  return '*'.repeat(value.length - 4) + value.slice(-4);
};

/**
 * Format sort code with dashes (XX-XX-XX)
 */
export const formatSortCode = (value) => {
  if (!value) return '';
  const digitsOnly = value.replace(/\D/g, '');
  if (digitsOnly.length <= 2) return digitsOnly;
  if (digitsOnly.length <= 4) return digitsOnly.slice(0, 2) + '-' + digitsOnly.slice(2);
  return digitsOnly.slice(0, 2) + '-' + digitsOnly.slice(2, 4) + '-' + digitsOnly.slice(4, 6);
};

/**
 * Validate UK National Insurance Number format
 */
export const isValidNINumber = (ni) => {
  if (!ni) return false;
  const niRegex = /^[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]$/i;
  return niRegex.test(ni.replace(/\s/g, ''));
};

