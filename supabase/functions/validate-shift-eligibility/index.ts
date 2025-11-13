import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * ✅ SHIFT ELIGIBILITY VALIDATOR
 *
 * Validates if a staff member is eligible to accept/be assigned to a shift.
 *
 * CRITICAL VALIDATION RULES:
 * 1. Role matching (care worker can't work nurse shifts)
 * 2. Nurse MUST have valid NMC PIN
 * 3. Senior care worker MUST have medication training
 * 4. Profile photo MANDATORY
 * 5. No expired compliance documents
 * 6. Minimum 2 references
 * 7. DBS check valid
 * 8. Right to work verified
 *
 * Returns: { eligible: boolean, reasons: string[], blockingIssues: string[] }
 */

serve(async (req) => {
    try {
        // Initialize Supabase client
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const { staff_id, shift_id } = await req.json();

        if (!staff_id || !shift_id) {
            return new Response(
                JSON.stringify({
                    error: 'Missing required fields: staff_id, shift_id'
                }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Fetch staff, shift, and compliance data
        const [staffResult, shiftResult, complianceResult] = await Promise.all([
            supabase.from("staff").select("*").eq("id", staff_id),
            supabase.from("shifts").select("*").eq("id", shift_id),
            supabase.from("compliance").select("*").eq("staff_id", staff_id)
        ]);

        const staff = staffResult.data?.[0];
        const shift = shiftResult.data?.[0];
        const allCompliance = complianceResult.data || [];

        if (!staff) {
            return new Response(
                JSON.stringify({
                    eligible: false,
                    error: 'Staff not found'
                }),
                { status: 404, headers: { "Content-Type": "application/json" } }
            );
        }

        if (!shift) {
            return new Response(
                JSON.stringify({
                    eligible: false,
                    error: 'Shift not found'
                }),
                { status: 404, headers: { "Content-Type": "application/json" } }
            );
        }

        const blockingIssues = [];
        const warnings = [];

        // ==========================================
        // CRITICAL VALIDATIONS (BLOCKING)
        // ==========================================

        // 1. ROLE MATCHING
        const roleHierarchy = {
            'specialist_nurse': ['specialist_nurse', 'nurse'],
            'nurse': ['nurse'],
            'senior_care_worker': ['senior_care_worker', 'care_worker', 'hca', 'support_worker'],
            'hca': ['hca', 'support_worker'],
            'support_worker': ['support_worker', 'hca'],
            'care_worker': ['care_worker']
        };

        const staffCanWorkAs = roleHierarchy[staff.role] || [staff.role];

        if (!staffCanWorkAs.includes(shift.role_required)) {
            blockingIssues.push({
                type: 'role_mismatch',
                severity: 'critical',
                message: `Role mismatch: You are ${staff.role.replace('_', ' ')} but this shift requires ${shift.role_required.replace('_', ' ')}`,
                actionRequired: 'Contact admin to update your role or apply for a different shift'
            });
        }

        // 2. NURSE NMC PIN CHECK
        if ((shift.role_required === 'nurse' || shift.role_required === 'specialist_nurse') && !staff.nmc_pin) {
            blockingIssues.push({
                type: 'missing_nmc_pin',
                severity: 'critical',
                message: 'Nurses must have a valid NMC PIN to work',
                actionRequired: 'Add your NMC PIN in your profile settings'
            });
        }

        // 3. SENIOR CARE WORKER MEDICATION TRAINING
        if (shift.role_required === 'senior_care_worker' && !staff.medication_trained) {
            blockingIssues.push({
                type: 'missing_medication_training',
                severity: 'critical',
                message: 'Senior care workers must complete medication administration training',
                actionRequired: 'Complete medication training and upload certificate'
            });
        }

        // 4. PROFILE PHOTO MANDATORY
        if (!staff.profile_photo_url) {
            blockingIssues.push({
                type: 'missing_profile_photo',
                severity: 'critical',
                message: 'Professional profile photo is mandatory before accepting shifts',
                actionRequired: 'Upload a clear, recent headshot in your profile'
            });
        }

        // 5. DBS CHECK
        const dbsCheck = allCompliance.find(c =>
            c.document_type === 'dbs_check' &&
            c.status === 'verified'
        );

        if (!dbsCheck) {
            blockingIssues.push({
                type: 'missing_dbs',
                severity: 'critical',
                message: 'Valid DBS check required to work in healthcare',
                actionRequired: 'Upload your DBS certificate in Compliance Tracker'
            });
        } else if (dbsCheck.expiry_date && new Date(dbsCheck.expiry_date) < new Date()) {
            blockingIssues.push({
                type: 'expired_dbs',
                severity: 'critical',
                message: 'Your DBS check has expired',
                actionRequired: 'Upload a new DBS certificate immediately'
            });
        }

        // 6. RIGHT TO WORK
        const rightToWork = allCompliance.find(c =>
            c.document_type === 'right_to_work' &&
            c.status === 'verified'
        );

        if (!rightToWork) {
            blockingIssues.push({
                type: 'missing_right_to_work',
                severity: 'critical',
                message: 'Right to work documentation required',
                actionRequired: 'Upload passport or visa in Compliance Tracker'
            });
        } else if (rightToWork.expiry_date && new Date(rightToWork.expiry_date) < new Date()) {
            blockingIssues.push({
                type: 'expired_right_to_work',
                severity: 'critical',
                message: 'Your right to work document has expired',
                actionRequired: 'Upload renewed visa/work permit immediately'
            });
        }

        // 7. REFERENCES (MINIMUM 2)
        if (!staff.references || staff.references.length < 2) {
            blockingIssues.push({
                type: 'insufficient_references',
                severity: 'critical',
                message: 'Minimum 2 written references required (CQC requirement)',
                actionRequired: 'Add 2 professional references in your profile'
            });
        }

        // 8. STAFF STATUS CHECK
        if (staff.status === 'suspended') {
            blockingIssues.push({
                type: 'suspended_account',
                severity: 'critical',
                message: 'Your account is currently suspended',
                actionRequired: 'Contact your agency administrator'
            });
        }

        if (staff.status === 'onboarding') {
            blockingIssues.push({
                type: 'onboarding_incomplete',
                severity: 'critical',
                message: 'Profile onboarding not complete',
                actionRequired: 'Complete all required profile sections to activate your account'
            });
        }

        // ==========================================
        // WARNINGS (NOT BLOCKING BUT IMPORTANT)
        // ==========================================

        // Expiring documents
        const expiringDocs = allCompliance.filter(c => {
            if (!c.expiry_date) return false;
            const daysUntilExpiry = Math.floor(
                (new Date(c.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)
            );
            return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
        });

        if (expiringDocs.length > 0) {
            warnings.push({
                type: 'documents_expiring_soon',
                severity: 'warning',
                message: `${expiringDocs.length} document(s) expiring within 30 days`,
                actionRequired: 'Renew documents before they expire to avoid shift cancellations'
            });
        }

        // Missing training
        const trainingCertificates = allCompliance.filter(c => c.document_type === 'training_certificate');
        if (trainingCertificates.length < 10) {
            warnings.push({
                type: 'incomplete_training',
                severity: 'warning',
                message: `Mandatory training incomplete (${trainingCertificates.length}/10)`,
                actionRequired: 'Complete all 10 mandatory training modules'
            });
        }

        // No occupational health clearance
        if (!staff.occupational_health?.cleared_to_work) {
            warnings.push({
                type: 'missing_occupational_health',
                severity: 'warning',
                message: 'Occupational health clearance not recorded',
                actionRequired: 'Complete occupational health assessment'
            });
        }

        // ==========================================
        // FINAL ELIGIBILITY DECISION
        // ==========================================

        const eligible = blockingIssues.length === 0;

        return new Response(
            JSON.stringify({
                eligible,
                staff: {
                    id: staff.id,
                    name: `${staff.first_name} ${staff.last_name}`,
                    role: staff.role,
                    status: staff.status
                },
                shift: {
                    id: shift.id,
                    role_required: shift.role_required,
                    date: shift.date
                },
                blockingIssues,
                warnings,
                summary: eligible
                    ? '✅ Staff member is eligible for this shift'
                    : `❌ Cannot accept shift: ${blockingIssues.length} critical issue(s)`
            }),
            { headers: { "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error('❌ [validateShiftEligibility] Error:', error);
        return new Response(
            JSON.stringify({
                eligible: false,
                error: error.message
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});
