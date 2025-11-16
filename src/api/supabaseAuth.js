import { supabase } from './supabaseClient';

function getSiteUrl() {
  if (import.meta.env?.VITE_SITE_URL) {
    return import.meta.env.VITE_SITE_URL.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:5173';
}

const RESET_PASSWORD_PATH = '/reset-password';

/**
 * Supabase Authentication API
 * Provides Base44-compatible auth methods
 */
export const supabaseAuth = {
  /**
   * Check if user is authenticated
   * @returns {Promise<boolean>}
   */
  async isAuthenticated() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return !!session;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  },

  /**
   * Get current user with profile
   * Similar to base44.auth.me()
   * @returns {Promise<object>}
   */
  async me() {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Not authenticated');
      }

      // Get user profile from profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        // Return basic user info if profile doesn't exist
        return {
          id: user.id,
          email: user.email,
          user_type: 'pending',
          agency_id: null,
          client_id: null,
          full_name: user.user_metadata?.full_name || null,
          phone: user.user_metadata?.phone || null,
          profile_photo_url: user.user_metadata?.avatar_url || null,
        };
      }

      // Map profile to Base44-compatible user object
      return {
        id: profile.id,
        email: profile.email || user.email,
        user_type: profile.user_type || 'pending',
        agency_id: profile.agency_id,
        client_id: profile.client_id,
        full_name: profile.full_name,
        phone: profile.phone,
        profile_photo_url: profile.profile_photo_url,
        role: profile.user_type, // Map user_type to role for compatibility
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      throw error;
    }
  },

  /**
   * Sign out user
   * @param {string} redirectUrl - Optional redirect URL after logout
   */
  async logout(redirectUrl = null) {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  },

  /**
   * Sign in with email and password
   */
  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  },

  /**
   * Sign in wrapper for Base44 compatibility
   */
  async signInWithPassword(credentials) {
    return this.signIn(credentials.email, credentials.password);
  },

  /**
   * Sign up with email and password
   * ✅ SIMPLIFIED: Database trigger handles role detection and linking
   * @param {string} email
   * @param {string} password
   * @param {object} metadata - Optional user metadata (e.g., full_name)
   */
  async signUp(email, password, metadata = {}) {
    try {
      const siteUrl = getSiteUrl();

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${siteUrl}/`,
        },
      });

      if (error) throw error;

      // Database trigger automatically:
      // ✅ Checks if email exists in staff/agencies/clients tables
      // ✅ Creates profile with correct user_type
      // ✅ Links to agency_id if invited
      // ✅ Sends notification if uninvited

      return data;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  },

  /**
   * Request password reset via email
   */
  async requestPasswordReset(email) {
    try {
      const siteUrl = getSiteUrl();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}${RESET_PASSWORD_PATH}`,
      });
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error requesting password reset:', error);
      throw error;
    }
  },

  /**
   * Update password for the current session
   */
  async updatePassword(newPassword) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  },
};

// Export as User for compatibility with Base44
export const User = supabaseAuth;


