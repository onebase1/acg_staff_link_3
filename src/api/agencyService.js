import { supabase } from '@/lib/supabase';
import { invokeEdgeFunction } from './supabaseFunctions';

/**
 * Service for super-admin agency management flows
 */

function normaliseEmail(email) {
  return email ? email.trim().toLowerCase() : '';
}

function buildRpcPayload({
  agencyName,
  contactEmail,
  contactPhone,
  vatNumber,
  registrationNumber,
  address,
  bankDetails,
  billingEmail,
  paymentTermsDays,
  invoiceFrequency,
  adminEmail,
  adminFullName,
  status,
}) {
  return {
    p_name: agencyName,
    p_contact_email: contactEmail,
    p_admin_email: adminEmail,
    p_contact_phone: contactPhone,
    p_vat_number: vatNumber,
    p_registration_number: registrationNumber,
    p_address: address || {},
    p_bank_details: bankDetails || {},
    p_billing_email: billingEmail,
    p_payment_terms_days: paymentTermsDays,
    p_invoice_frequency: invoiceFrequency,
    p_admin_full_name: adminFullName,
    p_status: status,
  };
}

function summariseBankDetails(bankDetails = {}) {
  const name = bankDetails.account_name || null;
  const account = bankDetails.account_number || null;
  const sortCode = bankDetails.sort_code || null;
  const bankName = bankDetails.bank_name || null;

  return { name, account, sortCode, bankName };
}

export const agencyService = {
  /**
   * Create a new agency and queue an invitation for the first agency admin.
   * Relies on the `create_agency_with_admin` RPC defined in Supabase.
   */
  async createAgencyWithAdmin(payload) {
    const adminEmail = normaliseEmail(payload.adminEmail);
    const rpcPayload = buildRpcPayload({
      ...payload,
      adminEmail,
      billingEmail: normaliseEmail(payload.billingEmail),
      contactEmail: normaliseEmail(payload.contactEmail),
    });

    const { data, error } = await supabase.rpc('create_agency_with_admin', rpcPayload);
    if (error) {
      console.error('[agencyService] Failed to create agency with admin:', error);
      throw error;
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (!result) {
      throw new Error('Agency creation RPC returned no result');
    }

    // Fire-and-forget invite email (Edge Function holds service key)
    try {
      await invokeEdgeFunction('send-agency-admin-invite', {
        agencyId: result.agency_id,
        inviteToken: result.invite_token,
        adminEmail,
        adminName: payload.adminFullName,
        agencyName: payload.agencyName,
        bankSummary: summariseBankDetails(payload.bankDetails),
      });
    } catch (edgeError) {
      console.warn('[agencyService] Invite email failed to send via edge function:', edgeError);
    }

    return result;
  },

  async resendInvitation(invitationId) {
    const { data, error } = await supabase
      .from('agency_admin_invitations')
      .select('id, agency_id, email, invite_token, status, admin_name, agencies(name, bank_details)')
      .eq('id', invitationId)
      .single();

    if (error) throw error;

    if (!data) {
      throw new Error('Invitation not found');
    }

    try {
      await invokeEdgeFunction('send-agency-admin-invite', {
        agencyId: data.agency_id,
        inviteToken: data.invite_token,
        adminEmail: data.email,
        adminName: data.admin_name,
        agencyName: data.agencies?.name,
        bankSummary: summariseBankDetails(data.agencies?.bank_details),
      });
    } catch (edgeError) {
      console.warn('[agencyService] Invite email failed to send via edge function:', edgeError);
    }

    return data;
  },
};

