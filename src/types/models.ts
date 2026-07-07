// src/types/models.ts
export type ViewMode = "supervisor" | "developer";
export type PageType =
  | "dashboard"
  | "users"
  | "timeline"
  | "settings"
  | "tasks";

export interface User {
  id: string;
  name: string;        // Maps to full_name in DB
  email: string;
  created: string;     // Maps to created in DB
  role?: string;       // Maps to role in DB
  password?: string;
  project?: string;
  projectId?: string;
  projectIds?: string[];
  status?: string;     // Maps to status in DB
  memberships?: {
    projectName: string;
    role: string;
  }[];
}

export type MemberStatus = "Active" | "Left";

export interface TeamMember {
  id: string;
  name: string;
  email?: string;
  role: string;
  roleProjects?: string[];
  memberSince?: string;
  activeHours?: number;
  status?: MemberStatus;
  joined: string;
  left?: string;
}

export interface SubProject {
  id: string;
  name: string;
  timeUsed: number;
  timeTotal: number;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: "active" | "completed" | "archived" | "on-hold";
  priority: "low" | "medium" | "high" | "urgent";
  totalHours: number;
  usedHours: number;
  subProjects: SubProject[];
  teamMembers: TeamMember[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Task {
  id: string;
  description: string;
}

export interface LogEntry {
  id: string;
  project: string;
  projectId?: string;
  date: string;
  status: "full" | "partial" | "unavailable";
  hoursWorked: number;
  tasks: Task[];
  partialReason?: string;
  unavailableReason?: string;
  submittedBy: string;
  submittedById?: string;
  submittedAt: string;
}

// Supabase models
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
export interface Invitation {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "supervisor" | "developer";
  project_id: string | null;
  project_name?: string;
  token: string;
  status: "pending" | "accepted" | "rejected" | "expired";
  invited_by: string;
  invited_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
  expires_at: string;
}

export interface UserActivity {
  id: string;
  user_id: string;
  project_id: string;
  sub_project_id?: string;
  activity_type: string;
  description: string;
  metadata: any;
  created_at: string;
  hours: number;
  user_name?: string;
  project_name?: string;
}

export interface ProjectTimelineEvent {
  id: string;
  project_id: string;
  user_id?: string;
  event_type: string;
  description: string;
  metadata: any;
  created_at: string;
  user_name?: string;
  project_name?: string;
}
