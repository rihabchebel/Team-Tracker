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
}

const Sidebar: React.FC<SidebarProps> = ({
  view,
  currentPage,
  selectedProject,
  projects,
  onViewSwitch,
  onPageChange,
  onProjectSelect
}) => {
  const navigationItems = [
    { id: 'dashboard' as PageType, label: 'All Projects', icon: LayoutDashboard },
    { id: 'tasks' as PageType, label: 'All Tasks', icon: ListTodo },
    { id: 'timeline' as PageType, label: 'User Timeline', icon: Calendar },
    { id: 'settings' as PageType, label: 'Project Settings', icon: Settings },
    { id: 'users' as PageType, label: 'Manage Users', icon: Users },
  ];

  // Handle dashboard click - always set to All Projects and dashboard page
  const handleDashboardClick = () => {
    onProjectSelect('All Projects'); // This will set selectedProject to 'All Projects' and currentPage to 'dashboard'
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-content">
        {/* View Switcher */}
        <div className="view-switcher">
          <div className="view-label">Switch to {view === 'supervisor' ? 'Developer' : 'Management'} View</div>
          <button
            className={`view-btn ${view === 'supervisor' ? 'active' : ''}`}
            onClick={() => onViewSwitch('supervisor')}
          >
            <Eye className="view-icon" size={16} />
            Supervisor View
          </button>
          <button
            className={`view-btn ${view === 'developer' ? 'active' : ''}`}
            onClick={() => onViewSwitch('developer')}
          >
            <Code2 className="view-icon" size={16} />
            Developer View
          </button>
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
        <div className="nav-section">
          <ul className="nav-list">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              // Check if this nav item is active
              const isActive = item.id === 'dashboard' 
                ? currentPage === 'dashboard' && selectedProject === 'All Projects'
                : currentPage === item.id;
              
              return (
                <li
                  key={item.id}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (item.id === 'dashboard') {
                      // Dashboard always shows All Projects
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

        {/* Logout */}
        <div className="logout-section">
          <button className="logout-btn">
            <LogOut className="logout-icon" size={16} />
            Log Out
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;