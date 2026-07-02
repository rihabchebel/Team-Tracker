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
  LayoutDashboard
} from 'lucide-react';
import './Sidebar.css';

export type ViewMode = 'supervisor' | 'developer';
export type PageType = 'dashboard' | 'users' | 'timeline' | 'settings' | 'tasks';

interface SidebarProps {
  view: ViewMode;
  currentPage: PageType;
  selectedProject: string;
  projects: string[];
  onViewSwitch: (view: ViewMode) => void;
  onPageChange: (page: PageType) => void;
  onProjectSelect: (project: string) => void;
  onLogout?: () => void; // Add this
  isAdmin?: boolean;
  hasSupervisor?: boolean;
  hasDeveloper?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  view,
  currentPage,
  selectedProject,
  projects,
  onViewSwitch,
  onPageChange,
  onProjectSelect,
  onLogout // Add this
  ,
  isAdmin = false,
  hasSupervisor = false,
  hasDeveloper = false,
}) => {
  const adminLinks = [
    { id: 'dashboard' as PageType, label: 'Admin Dashboard', icon: LayoutDashboard },
    { id: 'users' as PageType, label: 'Manage Users', icon: Users },
    { id: 'settings' as PageType, label: 'Project Settings', icon: Settings },
  ];

  const supervisorLinks = [
    { id: 'dashboard' as PageType, label: 'Supervisor Dashboard', icon: LayoutDashboard },
    { id: 'timeline' as PageType, label: 'Project Timeline', icon: Calendar },
    { id: 'settings' as PageType, label: 'Project Settings', icon: Settings },
    { id: 'users' as PageType, label: 'Manage Users', icon: Users },
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
        {/* View Switcher - only show role buttons if user has that role */}
        <div className="view-switcher">
          <div className="view-label">View Mode</div>
          {hasSupervisor && (
            <button
              className={`view-btn ${view === 'supervisor' ? 'active' : ''}`}
              onClick={() => onViewSwitch('supervisor')}
            >
              <Eye className="view-icon" size={16} />
              Supervisor View
            </button>
          )}

          {hasDeveloper && (
            <button
              className={`view-btn ${view === 'developer' ? 'active' : ''}`}
              onClick={() => onViewSwitch('developer')}
            >
              <Code2 className="view-icon" size={16} />
              Developer View
            </button>
          )}
        </div>

        {/* Projects Section - Only actual projects */}
        {projects.length > 0 && (
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

        {/* Navigation Items */}
        {isAdmin && renderNavSection('Admin', adminLinks)}
        {hasSupervisor && renderNavSection('Supervisor', supervisorLinks)}
        {hasDeveloper && renderNavSection('Developer', developerLinks)}
        {!isAdmin && !hasSupervisor && !hasDeveloper && (
          <div className="nav-section">
            <p className="nav-note">No project role assigned. Contact an admin.</p>
          </div>
        )}

        {/* Logout */}
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