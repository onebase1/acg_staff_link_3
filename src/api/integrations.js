// Migrated to Supabase - export Supabase storage and functions
import { uploadFile, createSignedUrl, getPublicUrl, BUCKETS } from './supabaseStorage';
import { invokeEdgeFunction } from './supabaseFunctions';

// Compatibility layer for Base44 integrations
export const Core = {
  UploadFile: async ({ file, bucket = 'documents', path = null }) => {
    const result = await uploadFile({ file, bucket, path });
    return { file_url: result.file_url };
  },
  CreateFileSignedUrl: async ({ bucket, path, expiresIn = 3600 }) => {
    const url = await createSignedUrl({ bucket, path, expiresIn });
    return { signedUrl: url };
  },
  InvokeLLM: async (params) => {
    // TODO: Implement LLM integration via Supabase Edge Function
    console.warn('⚠️ [Migration] InvokeLLM not yet migrated to Supabase Edge Functions');
    return invokeEdgeFunction('invoke-llm', params);
  },
  SendEmail: async (params) => {
    // TODO: Implement email via Supabase Edge Function
    console.warn('⚠️ [Migration] SendEmail not yet migrated to Supabase Edge Functions');
    return invokeEdgeFunction('send-email', params);
  },
  GenerateImage: async (params) => {
    console.warn('⚠️ [Migration] GenerateImage not yet migrated');
    throw new Error('GenerateImage not yet migrated');
  },
  ExtractDataFromUploadedFile: async (params) => {
    console.warn('⚠️ [Migration] ExtractDataFromUploadedFile not yet migrated');
    return invokeEdgeFunction('extract-data-from-file', params);
  },
  UploadPrivateFile: async ({ file, bucket = 'documents', path = null }) => {
    // Same as UploadFile for now (Supabase handles permissions via RLS)
    return Core.UploadFile({ file, bucket, path });
  },
};

// Export individual functions for convenience
export const InvokeLLM = Core.InvokeLLM;
export const SendEmail = Core.SendEmail;
export const UploadFile = Core.UploadFile;
export const GenerateImage = Core.GenerateImage;
export const ExtractDataFromUploadedFile = Core.ExtractDataFromUploadedFile;
export const CreateFileSignedUrl = Core.CreateFileSignedUrl;
export const UploadPrivateFile = Core.UploadPrivateFile;






