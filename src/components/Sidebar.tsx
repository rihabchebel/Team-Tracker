// components/Sidebar.tsx
import React from 'react';
import './Sidebar.css';

export type ViewMode = 'supervisor' | 'developer';
export type PageType = 'users' | 'timeline' | 'settings' | 'tasks';

interface SidebarProps {
  view: ViewMode;
  currentPage: PageType;
  selectedProject: string;
  onViewSwitch: (view: ViewMode) => void;
  onPageChange: (page: PageType) => void;
  onProjectSelect: (project: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  view,
  currentPage,
  selectedProject,
  onViewSwitch,
  onPageChange,
  onProjectSelect
}) => {
  const projects = [
    'Project Alpha',
    'Project Beta',
    'Service VAS',
    'TMA',
    ...(view === 'supervisor' ? ['test'] : []),
  ];

  const navigationItems = [
    { id: 'users' as PageType, label: 'Manage Users', icon: '👥' },
    { id: 'timeline' as PageType, label: 'User Timeline', icon: '📅' },
    { id: 'settings' as PageType, label: 'Project Settings', icon: '⚙️' },
    { id: 'tasks' as PageType, label: 'All Tasks', icon: '📋' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-content">
        {/* View Switcher */}
        <div className="view-switcher">
          <button
            className={`view-btn ${view === 'supervisor' ? 'active' : ''}`}
            onClick={() => onViewSwitch('supervisor')}
          >
            <span className="view-icon">👔</span>
            Supervisor View
          </button>
          <button
            className={`view-btn ${view === 'developer' ? 'active' : ''}`}
            onClick={() => onViewSwitch('developer')}
          >
            <span className="view-icon">💻</span>
            Developer View
          </button>
        </div>

        {/* Projects Section - Scrollable */}
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
                  <span className="project-icon">📁</span>
                  {project}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Navigation */}
        <div className="nav-section">
          <ul className="nav-list">
            {navigationItems.map((item) => (
              <li
                key={item.id}
                className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
                onClick={() => onPageChange(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </li>
            ))}
          </ul>
        </div>

        {/* Logout */}
        <div className="logout-section">
          <button className="logout-btn">
            <span className="logout-icon">🚪</span>
            Log Out
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;