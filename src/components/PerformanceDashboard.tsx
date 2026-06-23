// components/PerformanceDashboard.tsx
import React, { useState } from 'react';
import './PerformanceDashboard.css';

export type ViewMode = 'supervisor' | 'developer';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  memberSince: string;
  activeHours: number;
  status: 'Active' | 'Left' | 'On Leave';
}

interface ProjectData {
  id: string;
  name: string;
  description: string;
  budget: number;
  hoursSpent: number;
  teamMembers: TeamMember[];
}

interface PerformanceDashboardProps {
  view: ViewMode;
  project: string;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ /*view,*/ project }) => {
  const [activeTab, setActiveTab] = useState<'heatmap' | 'roster' | 'analytics'>('roster');

  // Project data with different members for each project
  const projectData: Record<string, ProjectData> = {
    'Project Alpha': {
      id: '1',
      name: 'Project Alpha',
      description: 'Main product development sprint',
      budget: 500,
      hoursSpent: 224,
      teamMembers: [
        { id: '1', name: 'Alice Johnson', email: 'alice@example.com', role: 'Supervisor', memberSince: 'Mar 1, 2026', activeHours: 0, status: 'Active' },
        { id: '2', name: 'Bob Smith', email: 'bob@example.com', role: 'Developer', memberSince: 'Mar 1, 2026', activeHours: 80, status: 'Active' },
        { id: '3', name: 'Carol Davis', email: 'carol@example.com', role: 'Developer', memberSince: 'Mar 1, 2026', activeHours: 63, status: 'Active' },
        { id: '4', name: 'Frank Brown', email: 'frank@example.com', role: 'Developer', memberSince: 'Mar 1, 2026', activeHours: 27, status: 'Left' },
        { id: '5', name: 'Eve Martinez', email: 'eve@example.com', role: 'Developer', memberSince: 'Mar 5, 2026', activeHours: 46, status: 'Active' },
      ]
    },
    'Project Beta': {
      id: '2',
      name: 'Project Beta',
      description: 'Client portal redesign',
      budget: 300,
      hoursSpent: 150,
      teamMembers: [
        { id: '6', name: 'Dave Wilson', email: 'dave@example.com', role: 'Supervisor', memberSince: 'Mar 10, 2026', activeHours: 0, status: 'Active' },
        { id: '7', name: 'Grace Lee', email: 'grace@example.com', role: 'Developer', memberSince: 'Mar 15, 2026', activeHours: 45, status: 'Active' },
        { id: '8', name: 'Henry Kim', email: 'henry@example.com', role: 'Developer', memberSince: 'Mar 20, 2026', activeHours: 32, status: 'Active' },
        { id: '9', name: 'Ivy Chen', email: 'ivy@example.com', role: 'Developer', memberSince: 'Apr 1, 2026', activeHours: 12, status: 'On Leave' },
        { id: '10', name: 'Jack Wilson', email: 'jack@example.com', role: 'Developer', memberSince: 'Apr 5, 2026', activeHours: 28, status: 'Active' },
      ]
    },
    'Service VAS': {
      id: '3',
      name: 'Service VAS',
      description: 'Test description',
      budget: 300,
      hoursSpent: 89,
      teamMembers: [
        { id: '11', name: 'Karen White', email: 'karen@example.com', role: 'Supervisor', memberSince: 'Mar 1, 2026', activeHours: 15, status: 'Active' },
        { id: '12', name: 'Leo Martinez', email: 'leo@example.com', role: 'Developer', memberSince: 'Mar 5, 2026', activeHours: 34, status: 'Active' },
        { id: '13', name: 'Mia Thompson', email: 'mia@example.com', role: 'Developer', memberSince: 'Mar 10, 2026', activeHours: 28, status: 'Active' },
        { id: '14', name: 'Noah Garcia', email: 'noah@example.com', role: 'Developer', memberSince: 'Apr 1, 2026', activeHours: 12, status: 'Active' },
      ]
    },
    'test': {
      id: '4',
      name: 'test',
      description: 'Test project',
      budget: 100,
      hoursSpent: 45,
      teamMembers: [
        { id: '15', name: 'Olivia Brown', email: 'olivia@example.com', role: 'Supervisor', memberSince: 'Mar 15, 2026', activeHours: 8, status: 'Active' },
        { id: '16', name: 'Peter Davis', email: 'peter@example.com', role: 'Developer', memberSince: 'Mar 20, 2026', activeHours: 22, status: 'Active' },
        { id: '17', name: 'Quinn Smith', email: 'quinn@example.com', role: 'Developer', memberSince: 'Apr 1, 2026', activeHours: 15, status: 'Left' },
      ]
    },
    'All Tasks': {
      id: '5',
      name: 'All Tasks',
      description: 'All tasks overview',
      budget: 0,
      hoursSpent: 0,
      teamMembers: [
        { id: '18', name: 'Rachel Adams', email: 'rachel@example.com', role: 'Supervisor', memberSince: 'Mar 1, 2026', activeHours: 120, status: 'Active' },
        { id: '19', name: 'Sam Wilson', email: 'sam@example.com', role: 'Developer', memberSince: 'Mar 1, 2026', activeHours: 95, status: 'Active' },
        { id: '20', name: 'Tina Chen', email: 'tina@example.com', role: 'Developer', memberSince: 'Mar 15, 2026', activeHours: 67, status: 'Active' },
        { id: '21', name: 'Umar Khan', email: 'umar@example.com', role: 'Developer', memberSince: 'Apr 1, 2026', activeHours: 34, status: 'Active' },
        { id: '22', name: 'Guest', email: 'guest@local', role: 'Guest', memberSince: 'Jun 22, 2026', activeHours: 8, status: 'Active' },
      ]
    }
  };

  // Get current project data or use Project Beta as fallback
  const currentProject = projectData[project] || projectData['Project Beta'];
  const { teamMembers, budget, hoursSpent } = currentProject;

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Active':
        return 'status-active';
      case 'Left':
        return 'status-left';
      case 'On Leave':
        return 'status-on-leave';
      default:
        return '';
    }
  };

  const getInitials = (name: string) => {
    return name.charAt(0);
  };

  const budgetPercentage = budget > 0 ? Math.round((hoursSpent / budget) * 100) : 0;

  return (
    <div className="performance-dashboard">
      <div className="page-header">
        <div className="page-header-content">
          <div>
            <h2>{project}</h2>
            <span className="project-description">{currentProject.description}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-header">
          <h3>Performance Dashboard</h3>
          <div className="dashboard-tabs">
            <button 
              className={`tab-btn ${activeTab === 'heatmap' ? 'active' : ''}`}
              onClick={() => setActiveTab('heatmap')}
            >
              Heatmap
            </button>
            <button 
              className={`tab-btn ${activeTab === 'roster' ? 'active' : ''}`}
              onClick={() => setActiveTab('roster')}
            >
              Team Roster
            </button>
            <button 
              className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              Analytics
            </button>
          </div>
        </div>
        
        {activeTab === 'analytics' && (
          <div className="budget-section">
            <div className="budget-info">
              <span className="budget-label">Budget vs Hours Spent</span>
              <span className="budget-value">
                <span className="hours-spent">{hoursSpent}h</span>
                <span className="budget-separator">/</span>
                <span className="budget-total">{budget}h</span>
                <span className="budget-percentage">({budgetPercentage}%)</span>
              </span>
            </div>
            <div className="budget-bar">
              <div 
                className="budget-bar-fill" 
                style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
              />
            </div>
          </div>
        )}

        {activeTab === 'roster' && (
          <div className="roster-section">
            <div className="table-container">
              <table className="roster-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Member Since</th>
                    <th>Active Hours</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((member) => (
                    <tr key={member.id}>
                      <td className="member-cell">
                        <div className="member-avatar">
                          {getInitials(member.name)}
                        </div>
                        {member.name}
                      </td>
                      <td>{member.email}</td>
                      <td>
                        <span className={`role-badge ${member.role === 'Supervisor' ? 'role-supervisor' : 'role-developer'}`}>
                          {member.role}
                        </span>
                      </td>
                      <td>{member.memberSince}</td>
                      <td>{member.activeHours}h</td>
                      <td>
                        <span className={`status-badge ${getStatusBadgeClass(member.status)}`}>
                          {member.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'heatmap' && (
          <div className="heatmap-section">
            <h4>Availability Heatmap (Last 30 Working Days)</h4>
            <div className="heatmap-placeholder">
              <div className="heatmap-members">
                {teamMembers.slice(0, 6).map((member) => (
                  <div key={member.id} className="heatmap-member">
                    <span className="member-name">{member.name}</span>
                    <div className="heatmap-row">
                      {Array.from({ length: 30 }, (_, i) => (
                        <div 
                          key={i} 
                          className={`heatmap-cell ${Math.random() > 0.6 ? 'full' : Math.random() > 0.3 ? 'partial' : 'unavailable'}`}
                          title={`Day ${i + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="heatmap-legend">
                <span className="legend-label">Legend:</span>
                <span className="legend-item full">Full</span>
                <span className="legend-item partial">Partial</span>
                <span className="legend-item unavailable">Unavailable</span>
                <span className="legend-item no-log">No Log</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="analytics-section">
            <h4>Developer Stats</h4>
            <div className="stats-grid">
              {teamMembers.map((member) => (
                <div key={member.id} className="stat-card">
                  <div className="stat-card-header">
                    <div className="stat-avatar">
                      {getInitials(member.name)}
                    </div>
                    <div className="stat-info">
                      <span className="stat-name">{member.name}</span>
                      <span className="stat-role">{member.role}</span>
                    </div>
                  </div>
                  <div className="stat-details">
                    <div className="stat-item">
                      <span className="stat-label">Hours</span>
                      <span className="stat-value">{member.activeHours}h</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Status</span>
                      <span className={`stat-status ${member.status === 'Active' ? 'status-active' : 'status-left'}`}>
                        {member.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceDashboard;