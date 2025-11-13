import { supabase } from './supabaseClient';

/**
 * Supabase Storage API
 * Provides file upload and management functionality
 */

// Storage buckets
const BUCKETS = {
  DOCUMENTS: 'documents',
  PROFILE_PHOTOS: 'profile-photos',
  COMPLIANCE_DOCS: 'compliance-docs',
  TIMESHEET_DOCS: 'timesheet-docs',
};

/**
 * Upload a file to Supabase Storage
 * @param {File} file - File to upload
 * @param {string} bucket - Bucket name (default: 'documents')
 * @param {string} path - Optional path within bucket
 * @returns {Promise<{file_url: string}>}
 */
export async function uploadFile({ file, bucket = BUCKETS.DOCUMENTS, path = null }) {
  try {
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = path ? `${path}/${fileName}` : fileName;

    // Upload file
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return {
      file_url: urlData.publicUrl,
      path: filePath,
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

/**
 * Create a signed URL for a file
 * @param {string} bucket - Bucket name
 * @param {string} path - File path
 * @param {number} expiresIn - Expiration time in seconds (default: 3600)
 * @returns {Promise<string>}
 */
export async function createSignedUrl({ bucket, path, expiresIn = 3600 }) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) throw error;
    return data.signedUrl;
  } catch (error) {
    console.error('Error creating signed URL:', error);
    throw error;
  }
}

/**
 * Delete a file from storage
 * @param {string} bucket - Bucket name
 * @param {string} path - File path
 * @returns {Promise<void>}
 */
export async function deleteFile({ bucket, path }) {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

/**
 * Get public URL for a file
 * @param {string} bucket - Bucket name
 * @param {string} path - File path
 * @returns {string}
 */
export function getPublicUrl({ bucket, path }) {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  return data.publicUrl;
}

// Export bucket names for convenience
export { BUCKETS };


