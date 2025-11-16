import { supabase } from './supabaseClient';

/**
 * Ensure a profile exists for the current authenticated user.
 * Creates a minimal profile if none exists.
 */
export async function ensureUserProfile({
  userId,
  email,
  fullName = null,
  userType = 'pending',
  phone = null,
  agencyId = null,
}) {
  if (!userId) {
    throw new Error('Missing userId when ensuring profile');
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, user_type, agency_id')
      .eq('id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (data) {
      return data;
    }

    const insertPayload = {
      id: userId,
      email,
      full_name: fullName,
      user_type: userType,
      phone,
      agency_id: agencyId,
    };

    const { data: inserted, error: insertError } = await supabase
      .from('profiles')
      .insert(insertPayload)
      .select('id, user_type, agency_id')
      .single();

    if (insertError) {
      throw insertError;
    }

    return inserted;
  } catch (error) {
    console.error('Error ensuring profile:', error);
    throw error;
  }
}



