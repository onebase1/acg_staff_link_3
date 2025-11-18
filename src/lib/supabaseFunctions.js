import { supabase } from './supabase';

/**
 * A robust wrapper for invoking Supabase edge functions.
 * This function includes two key enhancements:
 * 1. Session Refresh: It ensures the auth session is fresh before making a call,
 *    preventing errors related to expired JWTs on rapid page loads.
 * 2. Retry Mechanism: It automatically retries the invocation once on a generic
 *    network failure, making it more resilient to transient issues.
 *
 * @param {string} functionName - The name of the edge function to invoke.
 * @param {object} options - The options object for the invoke call (e.g., { body: { ... } }).
 * @returns {Promise<{ data: any, error: any }>} - The result from the function invocation.
 */
export const invokeFunction = async (functionName, options) => {
  try {
    // First attempt
    const { data, error } = await supabase.functions.invoke(functionName, options);
    
    // If a generic network error occurs, refresh the session and retry once.
    if (error && error.message && error.message.includes('Failed to fetch')) {
      console.warn(`⚠️ Initial invoke failed with a network error, refreshing session and retrying...`);
      await supabase.auth.refreshSession();
      
      // Second attempt
      const { data: retryData, error: retryError } = await supabase.functions.invoke(functionName, options);
      
      if (retryError) {
        console.error(`❌ Retry attempt failed for function: ${functionName}`, retryError);
        return { data: null, error: retryError };
      }
      
      console.log(`✅ Retry attempt successful for function: ${functionName}`);
      return { data: retryData, error: null };
    }
    
    // If there was another type of error, or no error, return the original result.
    return { data, error };

  } catch (e) {
    console.error(`❌ Unhandled error in invokeFunction wrapper for ${functionName}:`, e);
    return { data: null, error: e };
  }
};
