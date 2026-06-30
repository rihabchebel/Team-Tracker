// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export type Tables = {
  users: {
    id: string;
    name: string;
    email: string;
    created: string;
    role: string;
    project: string | null;
  };
  projects: {
    id: string;
    name: string;
    description: string;
    total_hours: number;
    used_hours: number;
  };
  sub_projects: {
    id: string;
    project_id: string;
    name: string;
    time_used: number;
    time_total: number;
  };
  team_members: {
    id: string;
    project_id: string;
    user_id: string;
    role: string;
    joined: string;
    left: string | null;
  };
  task_logs: {
    id: string;
    project_id: string;
    user_id: string;
    date: string;
    status: 'full' | 'partial' | 'unavailable' | 'no-log';
    hours_worked: number;
    tasks: { id: string; description: string }[];
    submitted_at: string;
    partial_reason?: string;
    unavailable_reason?: string;
  };
};