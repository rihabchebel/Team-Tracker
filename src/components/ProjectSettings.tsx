// components/ProjectSettings.tsx
import React, { useState } from 'react';
import './ProjectSettings.css';

export type ViewMode = 'supervisor' | 'developer';

interface ProjectSettingsProps {
  view: ViewMode;
  project: string;
}

interface SubProject {
  id: string;
  name: string;
  timeUsed: number;
  timeTotal: number;
}

interface ProjectData {
  id: string;
  name: string;
  description: string;
  totalHours: number;
  usedHours: number;
  subProjects: SubProject[];
  teamMembers: TeamMember[];
}

interface TeamMember {
  id: string;
  name: string;
   role: 'Developer' | 'Supervisor';
  joined: string;
  left?: string;
}

const ProjectSettings: React.FC<ProjectSettingsProps> = ({ /*view, project */}) => {
  // Projects with their total hours and sub-projects
  const [projectsData, setProjectsData] = useState<ProjectData[]>([
    {
      id: '1',
      name: 'Project Alpha',
      description: 'Main product development sprint',
      totalHours: 500,
      usedHours: 0,
      subProjects: [
        { id: 'sp2', name: 'Design Phase', timeUsed: 0, timeTotal: 150 },
        { id: 'sp3', name: 'Development', timeUsed: 0, timeTotal: 250 },
        { id: 'sp4', name: 'Testing', timeUsed: 0, timeTotal: 100 },
      ],
      teamMembers: [
        { id: '1', name: 'Alice Johnson', role: 'Developer', joined: '2026-03-15' },
        { id: '2', name: 'Bob Smith', role: 'Developer', joined: '2026-03-15' },
      ]
    },
    {
      id: '2',
      name: 'Project Beta',
      description: 'Client portal redesign',
      totalHours: 300,
      usedHours: 0,
      subProjects: [
        { id: 'sp6', name: 'UI/UX Design', timeUsed: 0, timeTotal: 80 },
        { id: 'sp7', name: 'Frontend Dev', timeUsed: 0, timeTotal: 120 },
        { id: 'sp8', name: 'Backend Dev', timeUsed: 0, timeTotal: 100 },
      ],
      teamMembers: [
        { id: '3', name: 'Carol Davis', role: 'Supervisor', joined: '2026-03-15' },
        { id: '4', name: 'Dave Wilson', role: 'Developer', joined: '2026-03-15' },
      ]
    },
    {
      id: '3',
      name: 'Service VAS',
      description: 'Test description',
      totalHours: 300,
      usedHours: 0,
      subProjects: [
        { id: 'sp1', name: 'T', timeUsed: 0, timeTotal: 10 },
        { id: 'sp10', name: 'Infrastructure', timeUsed: 0, timeTotal: 100 },
        { id: 'sp11', name: 'Integration', timeUsed: 0, timeTotal: 120 },
        { id: 'sp12', name: 'Testing', timeUsed: 0, timeTotal: 70 },
      ],
      teamMembers: [
        { id: '5', name: 'Eve Martinez', role: 'Supervisor', joined: '2026-03-15' },
        { id: '6', name: 'Frank Brown', role: 'Developer', joined: '2026-03-15' },
      ]
    },
    {
      id: '4',
      name: 'TMA',
      description: 'B2C',
      totalHours: 200,
      usedHours: 0,
      subProjects: [
        { id: 'sp14', name: 'Research', timeUsed: 0, timeTotal: 60 },
        { id: 'sp15', name: 'Implementation', timeUsed: 0, timeTotal: 140 },
      ],
      teamMembers: [
        { id: '7', name: 'Grace Lee', role: 'Developer', joined: '2026-03-15' },
        { id: '8', name: 'Henry Kim', role: 'Developer', joined: '2026-03-15' },
      ]
    }
  ]);

  const [selectedProjectId, setSelectedProjectId] = useState<string>('2');
  const [showAddSubProject, setShowAddSubProject] = useState(false);
  const [newSubProject, setNewSubProject] = useState({ name: '', timeTotal: 50 });
  const [editingSubProject, setEditingSubProject] = useState<string | null>(null);
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '', totalHours: 300 });

  const selectedProject = projectsData.find(p => p.id === selectedProjectId) || projectsData[0];

  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
  };

  const handleAddSubProject = () => {
    if (newSubProject.name.trim()) {
      const subProject: SubProject = {
        id: Date.now().toString(),
        name: newSubProject.name,
        timeUsed: 0,
        timeTotal: newSubProject.timeTotal,
      };
      setProjectsData(prev => prev.map(p => {
        if (p.id === selectedProjectId) {
          return {
            ...p,
            subProjects: [...p.subProjects, subProject],
            totalHours: p.totalHours + newSubProject.timeTotal,
          };
        }
        return p;
      }));
      setNewSubProject({ name: '', timeTotal: 50 });
      setShowAddSubProject(false);
    }
  };

  const handleDeleteSubProject = (subProjectId: string) => {
    const subProject = selectedProject.subProjects.find(sp => sp.id === subProjectId);
    if (subProject) {
      setProjectsData(prev => prev.map(p => {
        if (p.id === selectedProjectId) {
          return {
            ...p,
            subProjects: p.subProjects.filter(sp => sp.id !== subProjectId),
            totalHours: p.totalHours - subProject.timeTotal,
            usedHours: p.usedHours - subProject.timeUsed,
          };
        }
        return p;
      }));
    }
  };

  const handleUpdateSubProject = (subProjectId: string, field: keyof SubProject, value: any) => {
    setProjectsData(prev => prev.map(p => {
      if (p.id === selectedProjectId) {
        const updatedSubProjects = p.subProjects.map(sp => {
          if (sp.id === subProjectId) {
            return { ...sp, [field]: value };
          }
          return sp;
        });
        const newTotal = updatedSubProjects.reduce((sum, sp) => sum + sp.timeTotal, 0);
        const newUsed = updatedSubProjects.reduce((sum, sp) => sum + sp.timeUsed, 0);
        return {
          ...p,
          subProjects: updatedSubProjects,
          totalHours: newTotal,
          usedHours: newUsed,
        };
      }
      return p;
    }));
  };

  const handleTimeUpdate = (subProjectId: string, increment: number) => {
    const subProject = selectedProject.subProjects.find(sp => sp.id === subProjectId);
    if (subProject) {
      const newTime = Math.max(0, Math.min(subProject.timeUsed + increment, subProject.timeTotal));
      handleUpdateSubProject(subProjectId, 'timeUsed', newTime);
    }
  };

  const handleAddProject = () => {
    if (newProject.name.trim()) {
      const project: ProjectData = {
        id: Date.now().toString(),
        name: newProject.name,
        description: newProject.description || 'No description',
        totalHours: newProject.totalHours,
        usedHours: 0,
        subProjects: [],
        teamMembers: [],
      };
      setProjectsData([...projectsData, project]);
      setNewProject({ name: '', description: '', totalHours: 300 });
      setShowAddProject(false);
      setSelectedProjectId(project.id);
    }
  };

  const handleDeleteProject = (projectId: string) => {
    if (projectsData.length > 1) {
      setProjectsData(prev => prev.filter(p => p.id !== projectId));
      if (selectedProjectId === projectId) {
        setSelectedProjectId(projectsData[0].id);
      }
    }
  };

  const getProgressPercentage = (used: number, total: number) => {
    return total > 0 ? Math.round((used / total) * 100) : 0;
  };

  const getTotalProgress = () => {
    return selectedProject.totalHours > 0 
      ? Math.round((selectedProject.usedHours / selectedProject.totalHours) * 100)
      : 0;
  };

  return (
    <div className="project-settings-container">
      {/* Project List */}
      <div className="project-selector">
        <div className="project-selector-header">
          <h3>Projects</h3>
          <button className="add-project-btn" onClick={() => setShowAddProject(true)}>
            + New Project
          </button>
        </div>
        
        <div className="project-list">
          {projectsData.map((p) => (
            <div
              key={p.id}
              className={`project-item ${selectedProjectId === p.id ? 'active' : ''}`}
              onClick={() => handleProjectSelect(p.id)}
            >
              <div className="project-item-header">
                <div className="project-item-info">
                  <span className="project-item-name">{p.name}</span>
                  <span className="project-item-hours">{p.totalHours}h</span>
                </div>
                <button 
                  className="delete-project-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Delete "${p.name}"?`)) {
                      handleDeleteProject(p.id);
                    }
                  }}
                  title="Delete project"
                >
                  ×
                </button>
              </div>
              <div className="project-item-description">{p.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Time Tracking Section */}
      <div className="time-tracking-section">
        <div className="section-header">
          <h3>{selectedProject.name} - Time Tracking</h3>
          <div className="total-time">
            <span className="time-label">Total Time:</span>
            <span className="time-value">{selectedProject.usedHours}/{selectedProject.totalHours}h</span>
          </div>
        </div>

        <div className="total-progress-bar">
          <div 
            className="total-progress-fill" 
            style={{ width: `${getTotalProgress()}%` }}
          />
          <span className="progress-text">{getTotalProgress()}%</span>
        </div>

        <div className="sub-projects-list">
          {selectedProject.subProjects.map((subProject) => (
            <div key={subProject.id} className="sub-project-item">
              <div className="sub-project-header">
                <div className="sub-project-info">
                  <span className="sub-project-name">{subProject.name}</span>
                  <span className="sub-project-time">
                    {subProject.timeUsed}/{subProject.timeTotal}h
                  </span>
                </div>
                <div className="sub-project-actions">
                  <button 
                    className="action-btn time-btn"
                    onClick={() => handleTimeUpdate(subProject.id, -1)}
                    title="Subtract 1 hour"
                  >
                    −
                  </button>
                  <button 
                    className="action-btn time-btn"
                    onClick={() => handleTimeUpdate(subProject.id, 1)}
                    title="Add 1 hour"
                  >
                    +
                  </button>
                  <button 
                    className="action-btn edit-btn"
                    onClick={() => setEditingSubProject(subProject.id)}
                    title="Edit sub-project"
                  >
                    ✏️
                  </button>
                  <button 
                    className="action-btn delete-btn"
                    onClick={() => handleDeleteSubProject(subProject.id)}
                    title="Delete sub-project"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <div className="sub-project-progress">
                <div 
                  className="sub-project-progress-fill" 
                  style={{ width: `${getProgressPercentage(subProject.timeUsed, subProject.timeTotal)}%` }}
                />
                <span className="progress-text-small">
                  {getProgressPercentage(subProject.timeUsed, subProject.timeTotal)}%
                </span>
              </div>
            </div>
          ))}

          <button 
            className="add-sub-project-btn"
            onClick={() => setShowAddSubProject(true)}
          >
            + Add Sub-Project
          </button>
        </div>
      </div>

      {/* Team Members Section */}
      <div className="team-members-section">
        <div className="section-header">
          <h3>Team Members</h3>
          <button className="add-member-btn">+ Add Member</button>
        </div>

        <div className="team-members-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Left</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {selectedProject.teamMembers.map((member) => (
                <tr key={member.id}>
                  <td>{member.name}</td>
                  <td><span className={`role-badge role-${member.role.toLowerCase()}`}>{member.role}</span></td>
                  <td>{member.joined}</td>
                  <td>{member.left || '—'}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="action-btn edit-btn" title="Edit member">✏️</button>
                      <button className="action-btn delete-btn" title="Remove member">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Sub-Project Modal */}
      {showAddSubProject && (
        <div className="modal-overlay" onClick={() => setShowAddSubProject(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Sub-Project</h3>
              <button className="close-btn" onClick={() => setShowAddSubProject(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Sub-Project Name</label>
                <input
                  type="text"
                  value={newSubProject.name}
                  onChange={(e) => setNewSubProject({ ...newSubProject, name: e.target.value })}
                  placeholder="Enter sub-project name"
                />
              </div>
              <div className="form-group">
                <label>Time Allocation (hours)</label>
                <input
                  type="number"
                  value={newSubProject.timeTotal}
                  onChange={(e) => setNewSubProject({ ...newSubProject, timeTotal: parseInt(e.target.value) || 0 })}
                  min="1"
                  step="1"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowAddSubProject(false)}>Cancel</button>
              <button className="create-btn" onClick={handleAddSubProject}>Add Sub-Project</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Sub-Project Modal */}
      {editingSubProject && (
        <div className="modal-overlay" onClick={() => setEditingSubProject(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Sub-Project</h3>
              <button className="close-btn" onClick={() => setEditingSubProject(null)}>×</button>
            </div>
            <div className="modal-body">
              {selectedProject.subProjects.map(sp => {
                if (sp.id === editingSubProject) {
                  return (
                    <div key={sp.id}>
                      <div className="form-group">
                        <label>Sub-Project Name</label>
                        <input
                          type="text"
                          value={sp.name}
                          onChange={(e) => handleUpdateSubProject(sp.id, 'name', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Total Hours</label>
                        <input
                          type="number"
                          value={sp.timeTotal}
                          onChange={(e) => handleUpdateSubProject(sp.id, 'timeTotal', parseInt(e.target.value) || 0)}
                          min="1"
                          step="1"
                        />
                      </div>
                      <div className="form-group">
                        <label>Used Hours</label>
                        <input
                          type="number"
                          value={sp.timeUsed}
                          onChange={(e) => handleUpdateSubProject(sp.id, 'timeUsed', parseInt(e.target.value) || 0)}
                          min="0"
                          max={sp.timeTotal}
                          step="1"
                        />
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setEditingSubProject(null)}>Cancel</button>
              <button className="create-btn" onClick={() => setEditingSubProject(null)}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      {showAddProject && (
        <div className="modal-overlay" onClick={() => setShowAddProject(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Project</h3>
              <button className="close-btn" onClick={() => setShowAddProject(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Project Name</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="Enter project name"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="Enter project description"
                />
              </div>
              <div className="form-group">
                <label>Total Hours</label>
                <input
                  type="number"
                  value={newProject.totalHours}
                  onChange={(e) => setNewProject({ ...newProject, totalHours: parseInt(e.target.value) || 300 })}
                  min="1"
                  step="10"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowAddProject(false)}>Cancel</button>
              <button className="create-btn" onClick={handleAddProject}>Create Project</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectSettings;