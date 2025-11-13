import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

/**
 * 🏥 CARE HOME INBOUND EMAIL HANDLER
 *
 * Receives emails from care homes at: dominion@instayfs.co.uk (or any configured address)
 *
 * ✅ RESEND WEBHOOK INTEGRATION:
 * - Webhook URL: https://fbopzofxodevkhwuzfcf.supabase.co/functions/v1/careHomeInboundEmail
 * - Event type: email.received
 * - Payload structure: { type: "email.received", data: { from, to, subject, email_id } }
 * - 🔒 DOMAIN FILTER: Only processes emails to @instayfs.co.uk
 * - ⚠️ IMPORTANT: Webhook does NOT include email body - must fetch separately
 */

// ✅ Initialize Resend client with validation
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
if (!RESEND_API_KEY) {
    console.error('❌ [Care Home Email] RESEND_API_KEY environment variable is not set!');
}
const resend = new Resend(RESEND_API_KEY);

// ✅ Helper: Normalize email (handles Gmail aliases)
function normalizeEmail(email) {
    if (!email) return '';
    const lower = email.toLowerCase().trim();
    return lower.replace('@googlemail.com', '@gmail.com');
}

serve(async (req) => {
    // ✅ CRITICAL: Respond with 200 OK IMMEDIATELY to prevent timeout
    // Process webhook asynchronously after acknowledging receipt

    let bodyText = '';
    let event = null;

    try {
        console.log('🚀 [Care Home Email] ========== NEW WEBHOOK ==========');

        // Read body ONCE
        bodyText = await req.text();
        console.log('📦 [Care Home Email] Body received:', bodyText.substring(0, 200));

        if (!bodyText || bodyText.trim() === '') {
            console.log('⚠️ [Care Home Email] Empty body received');
            return new Response(JSON.stringify({
                success: false,
                error: 'Empty body'
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Parse JSON
        try {
            event = JSON.parse(bodyText);
            console.log('✅ [Care Home Email] JSON parsed');
        } catch (parseError) {
            console.error('❌ [Care Home Email] JSON parse failed:', parseError.message);
            return new Response(JSON.stringify({
                success: false,
                error: 'Invalid JSON'
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log('📋 [Care Home Email] Event type:', event?.type);

        // Check event type
        if (!event || event.type !== 'email.received') {
            console.log('⚠️ [Care Home Email] Not email.received event');
            return new Response(JSON.stringify({
                success: false,
                message: 'Not email.received event',
                received_type: event?.type || 'undefined'
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Extract data
        const { from, to, subject, email_id } = event.data || {};

        console.log('📧 [Care Home Email] From:', from);
        console.log('📧 [Care Home Email] To:', to);
        console.log('📧 [Care Home Email] Subject:', subject);
        console.log('📧 [Care Home Email] Email ID:', email_id);

        // Domain filter
        const toAddresses = Array.isArray(to) ? to : [to];
        const isForInstayfs = toAddresses.some(email =>
            email && email.toLowerCase().includes('@instayfs.co.uk')
        );

        if (!isForInstayfs) {
            console.log(`⚠️ [Care Home Email] Not for instayfs.co.uk (to: ${toAddresses.join(', ')})`);
            return new Response(JSON.stringify({
                success: true,
                message: 'Ignored - wrong domain'
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log('✅ [Care Home Email] Processing...');

        // ✅ PROCESS ASYNCHRONOUSLY (don't await - respond immediately)
        processEmail(event.data).catch(error => {
            console.error('❌ [Care Home Email] Async processing error:', error);
        });

        // ✅ RESPOND IMMEDIATELY with 200 OK
        return new Response(JSON.stringify({
            success: true,
            message: 'Webhook received, processing...'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('❌ [Care Home Email] Fatal error:', error);
        return new Response(JSON.stringify({
            error: error.message
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});

// ✅ ASYNC PROCESSING FUNCTION (runs after responding to webhook)
async function processEmail(data) {
    try {
        // Initialize Supabase client
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const { from, to, subject, email_id } = data;

        if (!from || !email_id) {
            console.log('⚠️ [Process Email] Missing from or email_id');
            return;
        }

        // Fetch email content
        let emailBody = '';
        try {
            console.log('🔍 [Process Email] Fetching content...');
            const emailContent = await resend.emails.receiving.get(email_id);
            emailBody = emailContent.data?.text || emailContent.text || '';
            console.log('✅ [Process Email] Content fetched');
        } catch (error) {
            console.error('❌ [Process Email] Fetch failed:', error.message);
            return;
        }

        // Match client
        const normalizedFrom = normalizeEmail(from);
        const { data: allClients, error: clientsError } = await supabase
            .from("clients")
            .select("*");

        if (clientsError) {
            console.error('❌ [Process Email] Failed to fetch clients:', clientsError);
            return;
        }

        let matchedClient = allClients.find(c => {
            const contactEmail = normalizeEmail(c.contact_person?.email);
            const billingEmail = normalizeEmail(c.billing_email);
            return contactEmail === normalizedFrom || billingEmail === normalizedFrom;
        });

        console.log(`🏥 [Process Email] Client: ${matchedClient ? matchedClient.name : 'NOT FOUND'}`);

        if (!matchedClient) {
            // Create workflow for unknown sender
            await supabase
                .from("admin_workflows")
                .insert({
                    type: 'other',
                    priority: 'medium',
                    status: 'pending',
                    title: `📧 Unknown Email - ${from}`,
                    description: `Email from ${from}\n\nSubject: ${subject}\nBody: ${emailBody.substring(0, 500)}`,
                    auto_created: true
                });

            console.log('✅ [Process Email] Workflow created for unknown sender');
            return;
        }

        // Check intent
        const isConfirmation = /\b(confirmed?|yes|accept)\b/i.test(subject + ' ' + emailBody);

        if (isConfirmation) {
            console.log('✅ [Process Email] Shift confirmation detected');
            // TODO: Handle confirmation logic
            return;
        }

        // Parse shift request with AI
        console.log('🤖 [Process Email] Parsing with AI...');

        // Use OpenAI to parse the email (Note: Using Supabase Edge Function doesn't have built-in LLM)
        // This would need to call OpenAI API directly or use a custom integration
        // For now, create a workflow for manual review

        // Create workflow for review
        await supabase
            .from("admin_workflows")
            .insert({
                agency_id: matchedClient.agency_id,
                type: 'other',
                priority: 'high',
                status: 'pending',
                title: `📧 Shift Request - ${matchedClient.name}`,
                description: `Email shift request from care home.\n\nSubject: ${subject}\n\nBody: ${emailBody}\n\nPlease review and create shifts manually.`,
                auto_created: true
            });

        console.log('✅ [Process Email] Workflow created for manual review');

    } catch (error) {
        console.error('❌ [Process Email] Error:', error);
    }
}
