import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type IssueSeverity = "critical" | "high" | "medium";

type FinancialIssue = {
    severity: IssueSeverity;
    issue: string;
    message: string;
    timesheet_id?: string | number;
    shift_id?: string | number;
    invoice_id?: string | number;
    [key: string]: unknown;
};

/**
 * 💰 FINANCIAL DATA VALIDATOR
 *
 * CRITICAL SECURITY: Validates financial data consistency before operations
 * Prevents tampering, detects drift, enforces locks
 *
 * Use cases:
 * - Pre-invoice validation (ensure rates match across shift→timesheet→invoice)
 * - Edit validation (block edits to locked records)
 * - Amendment detection (flag when underlying data changes post-invoice)
 */

serve(async (req) => {
    try {
        // Initialize Supabase client
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Authenticate user
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { "Content-Type": "application/json" } }
            );
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { "Content-Type": "application/json" } }
            );
        }

        const {
            operation_type, // 'pre_invoice', 'edit_validation', 'detect_drift'
            timesheet_ids,
            shift_id,
            invoice_id
        } = await req.json();

        console.log(`🔍 [Financial Validator] Operation: ${operation_type}`);

        // OPERATION 1: Pre-invoice validation
        if (operation_type === 'pre_invoice' && timesheet_ids) {
            const { data: timesheets, error: timesheetsError } = await supabase
                .from("timesheets")
                .select("*")
                .in("id", timesheet_ids);

            if (timesheetsError) {
                throw timesheetsError;
            }

            const { data: shifts, error: shiftsError } = await supabase
                .from("shifts")
                .select("*");

            if (shiftsError) {
                throw shiftsError;
            }

            const issues: FinancialIssue[] = [];

            for (const timesheet of timesheets) {
                // Check if already locked
                if (timesheet.financial_locked) {
                    issues.push({
                        severity: 'critical',
                        timesheet_id: timesheet.id,
                        issue: 'already_invoiced',
                        message: 'Timesheet already locked - cannot re-invoice'
                    });
                    continue;
                }

                // Find related shift
                const shift = shifts.find(s =>
                    s.id === timesheet.booking_id ||
                    (s.date === timesheet.shift_date && s.client_id === timesheet.client_id)
                );

                if (!shift) {
                    issues.push({
                        severity: 'high',
                        timesheet_id: timesheet.id,
                        issue: 'missing_shift',
                        message: 'No matching shift found for timesheet'
                    });
                    continue;
                }

                // Validate rate consistency
                if (Math.abs(shift.charge_rate - timesheet.charge_rate) > 0.01) {
                    issues.push({
                        severity: 'critical',
                        timesheet_id: timesheet.id,
                        shift_id: shift.id,
                        issue: 'rate_mismatch',
                        message: `Rate mismatch: Shift £${shift.charge_rate}/hr vs Timesheet £${timesheet.charge_rate}/hr`,
                        shift_rate: shift.charge_rate,
                        timesheet_rate: timesheet.charge_rate
                    });
                }

                // Validate hours consistency (allow 15min tolerance)
                const hoursDiff = Math.abs((timesheet.total_hours || 0) - (shift.duration_hours || 0));
                if (hoursDiff > 0.25 && hoursDiff > (shift.duration_hours * 0.1)) {
                    issues.push({
                        severity: 'medium',
                        timesheet_id: timesheet.id,
                        shift_id: shift.id,
                        issue: 'hours_mismatch',
                        message: `Hours variance: Shift ${shift.duration_hours}h vs Timesheet ${timesheet.total_hours}h`,
                        variance: hoursDiff
                    });
                }

                // Check location if client requires it
                const { data: client } = await supabase
                    .from("clients")
                    .select("*")
                    .eq("id", timesheet.client_id)
                    .single();

                if (client?.contract_terms?.require_location_specification) {
                    if (!timesheet.work_location_within_site) {
                        issues.push({
                            severity: 'critical',
                            timesheet_id: timesheet.id,
                            issue: 'missing_location',
                            message: 'Client requires location specification - missing from timesheet'
                        });
                    }
                }
            }

            return new Response(
                JSON.stringify({
                    success: issues.filter(i => i.severity === 'critical').length === 0,
                    validation_passed: issues.length === 0,
                    issues,
                    critical_count: issues.filter(i => i.severity === 'critical').length,
                    warning_count: issues.filter(i => i.severity === 'medium' || i.severity === 'high').length,
                    recommendation: issues.filter(i => i.severity === 'critical').length > 0
                        ? 'BLOCK_INVOICE_GENERATION'
                        : issues.length > 0
                        ? 'WARN_BEFORE_GENERATING'
                        : 'PROCEED'
                }),
                { headers: { "Content-Type": "application/json" } }
            );
        }

        // OPERATION 2: Edit validation (check if record is locked)
        if (operation_type === 'edit_validation') {
            const { entity_type, entity_id, proposed_changes } = await req.json();

            if (entity_type === 'timesheet') {
                const { data: timesheet, error: timesheetError } = await supabase
                    .from("timesheets")
                    .select("*")
                    .eq("id", entity_id)
                    .single();

                if (timesheetError || !timesheet) {
                    return new Response(
                        JSON.stringify({
                            allowed: false,
                            reason: 'Timesheet not found'
                        }),
                        { headers: { "Content-Type": "application/json" } }
                    );
                }

                if (timesheet.financial_locked) {
                    // Check what fields are being changed
                    const financialFields = ['total_hours', 'pay_rate', 'charge_rate', 'staff_pay_amount', 'client_charge_amount'];
                    const attemptingFinancialChange = Object.keys(proposed_changes || {}).some(
                        field => financialFields.includes(field)
                    );

                    if (attemptingFinancialChange) {
                        return new Response(
                            JSON.stringify({
                                allowed: false,
                                reason: 'FINANCIAL_LOCK_VIOLATION',
                                message: '🔒 This timesheet is financially locked (already invoiced). Cannot modify rates or hours.',
                                locked_at: timesheet.financial_locked_at,
                                locked_by: timesheet.financial_locked_by,
                                invoice_id: timesheet.invoice_id,
                                action_required: 'CREATE_INVOICE_AMENDMENT'
                            }),
                            { headers: { "Content-Type": "application/json" } }
                        );
                    }
                }

                return new Response(
                    JSON.stringify({
                        allowed: true,
                        message: 'Edit permitted - non-financial fields or unlocked record'
                    }),
                    { headers: { "Content-Type": "application/json" } }
                );
            }

            if (entity_type === 'shift') {
                const { data: shift, error: shiftError } = await supabase
                    .from("shifts")
                    .select("*")
                    .eq("id", entity_id)
                    .single();

                if (shiftError || !shift) {
                    return new Response(
                        JSON.stringify({
                            allowed: false,
                            reason: 'Shift not found'
                        }),
                        { headers: { "Content-Type": "application/json" } }
                    );
                }

                if (shift.financial_locked) {
                    const financialFields = ['pay_rate', 'charge_rate', 'duration_hours', 'work_location_within_site'];
                    const attemptingFinancialChange = Object.keys(proposed_changes || {}).some(
                        field => financialFields.includes(field)
                    );

                    if (attemptingFinancialChange) {
                        return new Response(
                            JSON.stringify({
                                allowed: false,
                                reason: 'FINANCIAL_LOCK_VIOLATION',
                                message: '🔒 This shift is financially locked (timesheet approved). Cannot modify rates/hours/location.',
                                locked_at: shift.financial_locked_at,
                                locked_by: shift.financial_locked_by,
                                action_required: 'CREATE_AMENDMENT_REQUEST'
                            }),
                            { headers: { "Content-Type": "application/json" } }
                        );
                    }
                }

                return new Response(
                    JSON.stringify({
                        allowed: true,
                        message: 'Edit permitted - non-financial fields or unlocked record'
                    }),
                    { headers: { "Content-Type": "application/json" } }
                );
            }

            return new Response(
                JSON.stringify({
                    allowed: false,
                    reason: 'Unknown entity type'
                }),
                { headers: { "Content-Type": "application/json" } }
            );
        }

        // OPERATION 3: Detect drift (check if invoice underlying data changed)
        if (operation_type === 'detect_drift' && invoice_id) {
            const { data: invoice, error: invoiceError } = await supabase
                .from("invoices")
                .select("*")
                .eq("id", invoice_id)
                .single();

            if (invoiceError || !invoice) {
                return new Response(
                    JSON.stringify({ error: 'Invoice not found' }),
                    { status: 404, headers: { "Content-Type": "application/json" } }
                );
            }

            const driftIssues: FinancialIssue[] = [];

            // Check each line item's timesheet
            for (const lineItem of invoice.line_items || []) {
                if (!lineItem.timesheet_id) continue;

                const { data: timesheet } = await supabase
                    .from("timesheets")
                    .select("*")
                    .eq("id", lineItem.timesheet_id)
                    .single();

                if (!timesheet) {
                    driftIssues.push({
                        severity: 'critical',
                        timesheet_id: lineItem.timesheet_id,
                        issue: 'timesheet_deleted',
                        message: 'Timesheet referenced in invoice no longer exists'
                    });
                    continue;
                }

                // Compare invoice line item vs current timesheet data
                if (timesheet.total_hours !== lineItem.hours) {
                    driftIssues.push({
                        severity: 'critical',
                        timesheet_id: timesheet.id,
                        issue: 'hours_changed',
                        message: `Hours changed post-invoice: Invoice ${lineItem.hours}h → Current ${timesheet.total_hours}h`,
                        invoice_value: lineItem.hours,
                        current_value: timesheet.total_hours
                    });
                }

                if (Math.abs(timesheet.charge_rate - lineItem.rate) > 0.01) {
                    driftIssues.push({
                        severity: 'critical',
                        timesheet_id: timesheet.id,
                        issue: 'rate_changed',
                        message: `Rate changed post-invoice: Invoice £${lineItem.rate}/hr → Current £${timesheet.charge_rate}/hr`,
                        invoice_value: lineItem.rate,
                        current_value: timesheet.charge_rate
                    });
                }

                if (timesheet.work_location_within_site !== lineItem.work_location_within_site) {
                    driftIssues.push({
                        severity: 'high',
                        timesheet_id: timesheet.id,
                        issue: 'location_changed',
                        message: `Location changed post-invoice: "${lineItem.work_location_within_site}" → "${timesheet.work_location_within_site}"`,
                        invoice_value: lineItem.work_location_within_site,
                        current_value: timesheet.work_location_within_site
                    });
                }

                // Check if timesheet snapshot exists (should if using new system)
                if (timesheet.financial_snapshot) {
                    const snapshot = timesheet.financial_snapshot;

                    // Validate snapshot hasn't been tampered with
                    if (snapshot.total_hours !== lineItem.hours ||
                        snapshot.charge_rate !== lineItem.rate) {
                        driftIssues.push({
                            severity: 'critical',
                            timesheet_id: timesheet.id,
                            issue: 'snapshot_mismatch',
                            message: '⚠️ CRITICAL: Financial snapshot does not match invoice - possible tampering',
                            snapshot: snapshot,
                            invoice_line: lineItem
                        });
                    }
                }
            }

            if (driftIssues.length > 0) {
                // Create AdminWorkflow for investigation
                await supabase
                    .from("admin_workflows")
                    .insert({
                        agency_id: invoice.agency_id,
                        type: 'other',
                        priority: 'critical',
                        title: `🚨 Invoice Data Drift Detected - ${invoice.invoice_number}`,
                        description: `Critical: Invoice ${invoice.invoice_number} has ${driftIssues.length} data inconsistencies. Underlying timesheet data changed after invoice was sent. This may indicate tampering or system error.`,
                        related_entity: {
                            entity_type: 'invoice',
                            entity_id: invoice.id
                        },
                        auto_created: true
                    });

                // Log to ChangeLog
                await supabase
                    .from("change_logs")
                    .insert({
                        agency_id: invoice.agency_id,
                        change_type: 'other',
                        affected_entity_type: 'invoice',
                        affected_entity_id: invoice.id,
                        old_value: JSON.stringify(invoice.immutable_sent_snapshot || {}),
                        new_value: JSON.stringify(driftIssues),
                        reason: 'Automated drift detection - data changed after invoice sent',
                        changed_by: 'system',
                        changed_by_email: 'system@base44.com',
                        changed_at: new Date().toISOString(),
                        risk_level: 'critical',
                        flagged_for_review: true
                    });
            }

            return new Response(
                JSON.stringify({
                    has_drift: driftIssues.length > 0,
                    drift_issues: driftIssues,
                    critical_count: driftIssues.filter(i => i.severity === 'critical').length,
                    recommendation: driftIssues.filter(i => i.severity === 'critical').length > 0
                        ? 'CREATE_INVOICE_AMENDMENT_IMMEDIATELY'
                        : 'NO_ACTION_NEEDED'
                }),
                { headers: { "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({
                error: 'Invalid operation_type. Must be: pre_invoice, edit_validation, or detect_drift'
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
        );

    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('❌ [Financial Validator] Error:', err);
        return new Response(
            JSON.stringify({
                success: false,
                error: err.message
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});
