
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if required environment variables are set
if (!supabaseUrl || supabaseUrl === '') {
  console.error('VITE_SUPABASE_URL is not defined in environment variables');
}

if (!supabaseAnonKey || supabaseAnonKey === '') {
  console.error('VITE_SUPABASE_ANON_KEY is not defined in environment variables');
}

// For development: If environment variables are missing, use demo mode with localStorage
const isLocalStorageMode = !supabaseUrl || !supabaseAnonKey;

export const supabase = isLocalStorageMode 
  ? {
      from: (table: string) => ({
        select: () => ({
          data: null,
          error: new Error('Supabase is in localStorage mode due to missing credentials'),
        }),
        insert: () => ({
          data: null,
          error: new Error('Supabase is in localStorage mode due to missing credentials'),
        }),
      }),
    } as any // Type assertion to avoid TypeScript errors
  : createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConnected = !isLocalStorageMode;
