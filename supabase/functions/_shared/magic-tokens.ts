/**
 * 🔐 MAGIC TOKENS UTILITY
 * 
 * Provides both database-backed and HMAC-signed token generation/validation
 * for secure, time-limited download links.
 * 
 * USAGE:
 * - generateDatabaseToken() - Stores token in DB (trackable, revocable)
 * - generateSignedToken() - Creates HMAC-signed token (stateless, faster)
 * - validateDatabaseToken() - Validates DB token
 * - validateSignedToken() - Validates HMAC-signed token
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type DownloadFormat = 'pdf' | 'csv' | 'ics' | 'profile';

export interface TokenPayload {
    queue_id?: string;
    booking_id?: string;
    client_id?: string;
    agency_id?: string;
    client_email?: string;
    format?: DownloadFormat;
    expires_at: number; // Unix timestamp
}

export interface DatabaseTokenInput {
    booking_id?: string;
    client_id?: string;
    staff_id?: string;
    agency_id: string;
    download_type?: DownloadFormat;
    expires_days?: number; // Default 30
    metadata?: Record<string, unknown>;
}

const EXPIRY_DAYS = 30;

// ============================================================================
// DATABASE-BACKED TOKENS (Trackable, Revocable)
// ============================================================================

/**
 * Generate a database-backed magic token
 * Stores token in magic_link_tokens table for tracking and revocation
 */
export async function generateDatabaseToken(
    supabase: SupabaseClient,
    input: DatabaseTokenInput
): Promise<{ token: string; url: string }> {
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (input.expires_days || EXPIRY_DAYS));

    const { error } = await supabase
        .from('magic_link_tokens')
        .insert({
            token,
            booking_id: input.booking_id,
            client_id: input.client_id,
            staff_id: input.staff_id,
            agency_id: input.agency_id,
            download_type: input.download_type,
            expires_at: expiresAt.toISOString(),
            metadata: input.metadata || {}
        });

    if (error) {
        console.error('❌ [Magic Tokens] Failed to create token:', error);
        throw new Error(`Failed to create magic token: ${error.message}`);
    }

    const baseUrl = Deno.env.get('SUPABASE_URL') || '';
    const format = input.download_type || 'pdf';
    const url = `${baseUrl}/functions/v1/download-shift-schedule?token=${token}&format=${format}`;

    console.log(`✅ [Magic Tokens] Created DB token, expires ${expiresAt.toISOString()}`);
    return { token, url };
}

/**
 * Validate a database-backed token
 */
export async function validateDatabaseToken(
    supabase: SupabaseClient,
    token: string
): Promise<{ valid: boolean; data?: Record<string, unknown>; error?: string }> {
    const { data, error } = await supabase
        .from('magic_link_tokens')
        .select('*')
        .eq('token', token)
        .single();

    if (error || !data) {
        return { valid: false, error: 'Invalid token' };
    }

    if (new Date(data.expires_at) < new Date()) {
        return { valid: false, error: 'Token expired' };
    }

    // Note: We don't check used_at here - that's handled by the download function
    // to allow for retries if download fails

    return { valid: true, data };
}

// ============================================================================
// HMAC-SIGNED TOKENS (Stateless, Fast)
// ============================================================================

/**
 * Generate an HMAC-signed token (stateless - no DB storage)
 * Format: base64(payload).signature
 */
export async function generateSignedToken(payload: TokenPayload): Promise<string> {
    const secret = Deno.env.get('MAGIC_LINK_SECRET');
    if (!secret) {
        throw new Error('MAGIC_LINK_SECRET not configured');
    }

    // Default expiry to 30 days if not set
    if (!payload.expires_at) {
        payload.expires_at = Math.floor(Date.now() / 1000) + (EXPIRY_DAYS * 24 * 60 * 60);
    }

    const payloadStr = JSON.stringify(payload);
    const payloadB64 = btoa(payloadStr);

    // Create HMAC-SHA256 signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(payloadB64)
    );

    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
    return `${payloadB64}.${signatureB64}`;
}

/**
 * Validate an HMAC-signed token
 */
export async function validateSignedToken(
    token: string
): Promise<{ valid: boolean; payload?: TokenPayload; error?: string }> {
    const secret = Deno.env.get('MAGIC_LINK_SECRET');
    if (!secret) {
        return { valid: false, error: 'MAGIC_LINK_SECRET not configured' };
    }

    const parts = token.split('.');
    if (parts.length !== 2) {
        return { valid: false, error: 'Invalid token format' };
    }

    const [payloadB64, signatureB64] = parts;

    try {
        // Verify signature
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );

        const signatureBytes = Uint8Array.from(atob(signatureB64), c => c.charCodeAt(0));
        const isValid = await crypto.subtle.verify(
            'HMAC',
            key,
            signatureBytes,
            encoder.encode(payloadB64)
        );

        if (!isValid) {
            return { valid: false, error: 'Invalid signature' };
        }

        // Decode and parse payload
        const payloadStr = atob(payloadB64);
        const payload: TokenPayload = JSON.parse(payloadStr);

        // Check expiry
        if (payload.expires_at < Math.floor(Date.now() / 1000)) {
            return { valid: false, error: 'Token expired' };
        }

        return { valid: true, payload };
    } catch {
        return { valid: false, error: 'Token validation failed' };
    }
}

// ============================================================================
// HELPER: Generate download URLs for emails
// ============================================================================

/**
 * Generate magic link URLs for all formats (PDF, CSV, ICS)
 * Used by notification-digest-engine and weekly-client-summary
 */
export async function generateDownloadUrls(
    supabase: SupabaseClient,
    input: DatabaseTokenInput
): Promise<{
    pdf: string;
    csv: string;
    ics: string;
}> {
    const baseUrl = Deno.env.get('SUPABASE_URL') || '';

    // Create tokens for each format
    const [pdfResult, csvResult, icsResult] = await Promise.all([
        generateDatabaseToken(supabase, { ...input, download_type: 'pdf' }),
        generateDatabaseToken(supabase, { ...input, download_type: 'csv' }),
        generateDatabaseToken(supabase, { ...input, download_type: 'ics' })
    ]);

    return {
        pdf: pdfResult.url,
        csv: csvResult.url,
        ics: icsResult.url
    };
}

/**
 * Generate a single download URL for a specific format
 */
export async function generateDownloadUrl(
    supabase: SupabaseClient,
    input: DatabaseTokenInput
): Promise<string> {
    const result = await generateDatabaseToken(supabase, input);
    return result.url;
}

/**
 * Generate a secure link for a staff profile
 * Points to the staff-profile-linker Edge Function
 */
export async function generateStaffProfileLink(
    supabase: SupabaseClient,
    staff_id: string,
    client_id: string,
    agency_id: string
): Promise<string> {
    const { token } = await generateDatabaseToken(supabase, {
        staff_id,
        client_id,
        agency_id,
        download_type: 'profile',
        expires_days: 14 // Profiles links valid for 14 days
    });

    const baseUrl = Deno.env.get('SUPABASE_URL') || '';
    return `${baseUrl}/functions/v1/staff-profile-linker?token=${token}`;
}

