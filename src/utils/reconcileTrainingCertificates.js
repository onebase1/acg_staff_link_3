/**
 * 🔄 TRAINING CERTIFICATE RECONCILIATION UTILITY
 * 
 * Auto-recovers orphaned compliance records that were uploaded but never
 * linked to staff.mandatory_training (e.g., due to browser crash, power outage).
 * 
 * Used by:
 * - ProfileSetup.jsx (staff self-service)
 * - StaffForm.jsx (admin editing)
 * 
 * @param {Object} supabase - Supabase client instance
 * @param {string} staffId - Staff member's UUID
 * @param {Object} currentMandatoryTraining - Current mandatory_training JSONB from staff record
 * @returns {Object} Reconciled mandatory_training object with any orphaned certs linked
 */

// Mapping from compliance document_name to mandatory_training keys
const TRAINING_NAME_TO_KEY_MAP = {
  'manual handling': 'manual_handling',
  'manual handling & moving people': 'manual_handling',
  'moving and handling': 'moving_and_handling',
  'safeguarding children': 'safeguarding_children',
  'safeguarding adults': 'safeguarding_adults',
  'safeguarding vulnerable adults': 'safeguarding_adults',
  'fire safety': 'fire_safety',
  'infection control': 'infection_control',
  'food hygiene': 'food_hygiene',
  'first aid': 'first_aid',
  'health and safety': 'health_and_safety',
  'coshh': 'coshh',
  'medication administration': 'medication_administration',
  'basic life support': 'basic_life_support',
  'bls': 'basic_life_support',
  'mental capacity act': 'mental_capacity_act',
  'mca': 'mental_capacity_act',
  'deprivation of liberty': 'deprivation_of_liberty',
  'dols': 'deprivation_of_liberty',
};

export async function reconcileTrainingCertificates(supabase, staffId, currentMandatoryTraining = {}) {
  if (!staffId) {
    console.log('⚠️ [Reconcile] No staffId provided, skipping reconciliation');
    return currentMandatoryTraining;
  }

  try {
    // Fetch all training certificates from compliance table for this staff
    const { data: complianceCerts, error } = await supabase
      .from('compliance')
      .select('id, document_name, issue_date, expiry_date, reference_number, issuing_authority')
      .eq('staff_id', staffId)
      .eq('document_type', 'training_certificate');

    if (error) {
      console.error('❌ [Reconcile] Error fetching compliance records:', error);
      return currentMandatoryTraining;
    }

    if (!complianceCerts || complianceCerts.length === 0) {
      console.log('ℹ️ [Reconcile] No compliance training certificates found');
      return currentMandatoryTraining;
    }

    console.log(`🔍 [Reconcile] Found ${complianceCerts.length} compliance training certificates`);

    // Build a set of all certificate IDs already linked in mandatory_training
    const linkedCertIds = new Set();
    
    // Check core training entries
    Object.values(currentMandatoryTraining).forEach(entry => {
      if (entry && Array.isArray(entry.certificate_ids)) {
        entry.certificate_ids.forEach(id => linkedCertIds.add(id));
      }
    });

    // Check additional training entries
    const additionalList = Array.isArray(currentMandatoryTraining.additional) 
      ? currentMandatoryTraining.additional 
      : [];
    additionalList.forEach(item => {
      if (item && Array.isArray(item.certificate_ids)) {
        item.certificate_ids.forEach(id => linkedCertIds.add(id));
      }
    });

    // Find orphaned certificates (exist in compliance but not linked)
    const orphanedCerts = complianceCerts.filter(cert => !linkedCertIds.has(cert.id));

    if (orphanedCerts.length === 0) {
      console.log('✅ [Reconcile] All certificates are properly linked');
      return currentMandatoryTraining;
    }

    console.log(`🔧 [Reconcile] Found ${orphanedCerts.length} orphaned certificates - auto-linking...`);

    // Create a copy of mandatory_training to modify
    const reconciled = { ...currentMandatoryTraining };
    const newAdditional = [...additionalList];

    for (const cert of orphanedCerts) {
      const normalizedName = (cert.document_name || '').toLowerCase().trim();
      const trainingKey = TRAINING_NAME_TO_KEY_MAP[normalizedName];

      if (trainingKey) {
        // Core training - link to appropriate key
        const existing = reconciled[trainingKey] || {};
        reconciled[trainingKey] = {
          ...existing,
          completed_date: cert.issue_date || existing.completed_date || '',
          expiry_date: cert.expiry_date || existing.expiry_date || '',
          certificate_ref: cert.reference_number || existing.certificate_ref || '',
          certificate_ids: [...(existing.certificate_ids || []), cert.id],
        };
        console.log(`✅ [Reconcile] Linked "${cert.document_name}" → mandatory_training.${trainingKey}`);
      } else {
        // Additional/custom training
        newAdditional.push({
          id: `reconciled-${cert.id}`,
          name: cert.document_name,
          provider: cert.issuing_authority || '',
          completed_date: cert.issue_date || '',
          expiry_date: cert.expiry_date || '',
          certificate_ref: cert.reference_number || '',
          certificate_ids: [cert.id],
        });
        console.log(`✅ [Reconcile] Linked "${cert.document_name}" → mandatory_training.additional`);
      }
    }

    if (newAdditional.length > 0) {
      reconciled.additional = newAdditional;
    }

    console.log(`🎉 [Reconcile] Auto-linked ${orphanedCerts.length} orphaned certificates`);
    return reconciled;

  } catch (err) {
    console.error('❌ [Reconcile] Unexpected error:', err);
    return currentMandatoryTraining;
  }
}

export default reconcileTrainingCertificates;

