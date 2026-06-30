// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials not found. Using mock data.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export type Tables = {
  users: {
    id: string;
    name: string;
    email: string;
    created_at: string;
    role: string;
    project: string | null;
    status: string | null;
  };
  projects: {
    id: string;
    name: string;
    description: string;
    total_hours: number;
    used_hours: number;
    created_at: string;
  };
  sub_projects: {
    id: string;
    project_id: string;
    name: string;
    time_used: number;
    time_total: number;
    created_at: string;
  };
  team_members: {
    id: string;
    project_id: string;
    user_id: string;
    role: string;
    joined_at: string;
    left_at: string | null;
  };
  task_logs: {
    id: string;
    project_id: string;
    user_id: string;
    date: string;
    status: 'full' | 'partial' | 'unavailable';
    hours_worked: number;
    tasks: { id: string; description: string }[];
    partial_reason?: string;
    unavailable_reason?: string;
    submitted_at: string;
  };
};

export type SupabaseClient = typeof supabase;

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!supabaseUrl && !!supabaseAnonKey;
};