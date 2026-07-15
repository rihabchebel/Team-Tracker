// components/Sidebar.tsx
import React from 'react';
import {
  Eye,
  Folder,
  ListTodo,
  Calendar,
  Settings,
  Users,
  LogOut,
  Code2,
  LayoutDashboard,
  User // ✅ Add User icon for no role message
} from 'lucide-react';
import './Sidebar.css';
import ProjectOverview from './ProjectOverview';
import { Project } from '../types/models';
import { hasRole } from '../utils/roleUtils';

export type ViewMode = 'supervisor' | 'developer';
export type PageType = 'dashboard' | 'users' | 'timeline' | 'settings' | 'tasks' | 'performance';

interface SidebarProps {
  view: ViewMode;
  currentPage: PageType;
  selectedProject: string;
  projects: string[];
  onViewSwitch: (view: ViewMode) => void;
  onPageChange: (page: PageType) => void;
  onProjectSelect: (project: string) => void;
  onLogout?: () => void;
  isAdmin?: boolean;
  hasSupervisor?: boolean;
  hasDeveloper?: boolean;
  projectsData?: Project[];
  currentUserRole?: any;
  userProjectCount?: number;
}

const Sidebar: React.FC<SidebarProps> = ({
  view,
  currentPage,
  selectedProject,
  projects,
  onViewSwitch,
  onPageChange,
  onProjectSelect,
  onLogout,
  isAdmin = false,
  hasSupervisor = false,
  hasDeveloper = false,
  projectsData = [],
  currentUserRole,
  userProjectCount = 0,
}) => {
  const userIsAdmin = isAdmin || (currentUserRole ? hasRole(currentUserRole, 'admin') : false);
  const userHasSupervisor = hasSupervisor || (currentUserRole ? hasRole(currentUserRole, 'supervisor') : false);
  const userHasDeveloper = hasDeveloper || (currentUserRole ? hasRole(currentUserRole, 'developer') : false);

  const hasAnyRole = userIsAdmin || userHasSupervisor || userHasDeveloper || userProjectCount > 0;

  const adminLinks = [
    { id: 'dashboard' as PageType, label: 'Admin Dashboard', icon: LayoutDashboard },
    { id: 'users' as PageType, label: 'Manage Users', icon: Users },
    { id: 'settings' as PageType, label: 'Project Settings', icon: Settings },
    { id: 'tasks' as PageType, label: 'Logged Tasks', icon: ListTodo },
  ];

  const supervisorLinks = [
    { id: 'dashboard' as PageType, label: 'Supervisor Dashboard', icon: LayoutDashboard },
    { id: 'timeline' as PageType, label: 'Project Management', icon: Calendar },
    { id: 'settings' as PageType, label: 'Project Settings', icon: Settings },
    { id: 'users' as PageType, label: 'Manage Users', icon: Users },
    { id: 'tasks' as PageType, label: 'Logged Tasks', icon: ListTodo },
  ];

  const developerLinks = [
    { id: 'dashboard' as PageType, label: 'Developer Dashboard', icon: LayoutDashboard },
    { id: 'tasks' as PageType, label: 'My Tasks', icon: ListTodo },
    { id: 'timeline' as PageType, label: 'Project Timeline', icon: Calendar },
  ];

  const renderNavSection = (title: string, links: typeof adminLinks) => (
    <div className="nav-section">
      <h3 className="nav-title">{title}</h3>
      <ul className="nav-list">
        {links.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === 'dashboard'
            ? currentPage === 'dashboard' && selectedProject === 'All Projects'
            : currentPage === item.id;

          return (
            <li
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => {
                if (item.id === 'dashboard') {
                  handleDashboardClick();
                } else {
                  onPageChange(item.id);
                }
              }}
            >
              <Icon className="nav-icon" size={16} />
              <span className="nav-label">{item.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );

  const handleDashboardClick = () => {
    onProjectSelect('All Projects');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-content">
        {hasAnyRole && (
          <div className="view-switcher">
            <div className="view-label">View Mode</div>
            
            {(userIsAdmin || userHasSupervisor) && (
              <button
                className={`view-btn ${view === 'supervisor' ? 'active' : ''}`}
                onClick={() => onViewSwitch('supervisor')}
              >
                <Eye className="view-icon" size={16} />
                Supervisor View
              </button>
            )}

            {userHasDeveloper && (
              <button
                className={`view-btn ${view === 'developer' ? 'active' : ''}`}
                onClick={() => onViewSwitch('developer')}
              >
                <Code2 className="view-icon" size={16} />
                Developer View
              </button>
            )}
          </div>
        )}

        {!hasAnyRole && (
          <div className="nav-section no-role-section">
            <div className="no-role-message">
              <div className="no-role-icon-wrapper">
                <User className="no-role-icon" size={32} /> {/* ✅ Use User icon instead of emoji */}
              </div>
              <div className="no-role-title">No project role assigned.</div>
              <div className="no-role-subtitle">Contact an admin to be added to a project.</div>
            </div>
          </div>
        )}

        {hasAnyRole && projects.length > 0 && (
          <div className="nav-section projects-section">
            <h3 className="nav-title">PROJECTS</h3>
            <div className="nav-list-wrapper">
              <ul className="nav-list">
                {projects.map((project) => (
                  <li
                    key={project}
                    className={`nav-item ${selectedProject === project ? 'active' : ''}`}
                    onClick={() => onProjectSelect(project)}
                  >
                    <Folder className="nav-icon" size={16} />
                    <span className="nav-label">{project}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {hasAnyRole && projectsData && projectsData.length > 0 && (
          <div className="sidebar-project-overview">
            <ProjectOverview
              project={projectsData.find((p) => p.name === selectedProject) || null}
            />
          </div>
        )}

        {hasAnyRole && (
          <>
            {userIsAdmin && renderNavSection('Admin', adminLinks)}
            {userHasSupervisor && renderNavSection('Supervisor', supervisorLinks)}
            {userHasDeveloper && renderNavSection('Developer', developerLinks)}
          </>
        )}

        <div className="logout-section">
          <button 
            className="logout-btn" 
            onClick={onLogout}
          >
            <LogOut className="logout-icon" size={16} />
            Log Out
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;