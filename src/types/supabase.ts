export interface SupabaseUser {
  id: string;
  name: string;
  email: string;
  created_at: string;
  role: string;
}

export interface SupabaseProject {
  id: string;
  name: string;
  description: string;
  total_hours: number;
  used_hours: number;
}

export interface SupabaseMembership {
  id: string;
  user_id: string;
  project_id: string;
  role: string;
  joined_at: string;
  left_at?: string;
}

export interface SupabaseTaskLog {
  id: string;
  project_id: string;
  user_id: string;
  date: string;
  status: "full" | "partial" | "unavailable";
  hours_worked: number;
  partial_reason?: string;
  unavailable_reason?: string;
  submitted_at: string;
}
