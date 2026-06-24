export type ViewMode = "supervisor" | "developer";
export type PageType =
  | "dashboard"
  | "users"
  | "timeline"
  | "settings"
  | "tasks";

export interface User {
  id: string;
  name: string;
  email: string;
  created: string;
  role?: string;
  password?: string;
  project?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  joined: string;
  left?: string;
}

export interface SubProject {
  id: string;
  name: string;
  timeUsed: number;
  timeTotal: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  totalHours: number;
  usedHours: number;
  subProjects: SubProject[];
  teamMembers: TeamMember[];
}
