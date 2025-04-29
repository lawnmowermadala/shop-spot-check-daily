
import { createClient } from '@supabase/supabase-js';

// Use the Supabase URL and key from the client.ts file
const supabaseUrl = "https://jvxgcxqutakvulcombjn.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2eGdjeHF1dGFrdnVsY29tYmpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU3NTM5NTUsImV4cCI6MjA2MTMyOTk1NX0.YkwLEroUB6ICxZNqIXkOfJiNb4yDgsoE1bjGjEZPj9c";

// Create the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Export a flag to indicate if Supabase is connected
export const isSupabaseConnected = true;
