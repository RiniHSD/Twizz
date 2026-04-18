import { createClient } from '@supabase/supabase-js';

// TODO: Replace with your Supabase Project URL and Anon Key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Uploads a file to a Supabase bucket and returns its public URL
 * @param {File} file 
 * @param {string} bucketName e.g., 'tuizz-images'
 */
export async function uploadImage(file, bucketName = 'image') {
  if (!file) return null;
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file);

  if (error) {
    console.error("Supabase Upload Error:", error);
    throw error;
  }

  const { data: publicData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  return publicData.publicUrl;
}
