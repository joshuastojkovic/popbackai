import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  business_name: string | null;
  business_type: string | null;
  phone: string | null;
  avatar_url: string | null;
  google_review_url: string | null;
  email_notifications: boolean | null;
  campaign_notifications: boolean | null;
  review_notifications: boolean | null;
  onboarding_completed: boolean | null;
  created_at: string;
  updated_at: string;
};
