// src/types/models.ts
export type ViewMode = "supervisor" | "developer";
export type PageType = "dashboard" | "users" | "timeline" | "settings" | "tasks";

export interface User {
  id: string;
  name: string;
  email: string;
  created: string;
  role?: string;
  password?: string;
  project?: string;
  projectId?: string;
  projectIds?: string[];
  status?: string;
  memberships?: {
    projectName: string;
    role: string;
  }[];
}

export type MemberStatus = 'Active' | 'Inactive' | 'On Leave';

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