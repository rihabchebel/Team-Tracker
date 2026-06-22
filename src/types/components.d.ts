// src/types/components.d.ts

// Import types from your components
import { ViewMode, PageType } from '../App';

// Declare component prop types
export interface HeaderProps {
  user: string;
  email: string;
}

export interface SidebarProps {
  view: ViewMode;
  currentPage: PageType;
  selectedProject: string;
  onViewSwitch: (view: ViewMode) => void;
  onPageChange: (page: PageType) => void;
  onProjectSelect: (project: string) => void;
}

export interface User {
  id: string;
  name: string;
  email: string;
  created: string;
  role?: string;
}

export interface UserManagementProps {
  view: ViewMode;
  project: string;
}

export interface UserTimelineProps {
  view: ViewMode;
  project: string;
}

export interface ProjectSettingsProps {
  view: ViewMode;
  project: string;
}

export interface AllTasksProps {
  view: ViewMode;
  project: string;
}