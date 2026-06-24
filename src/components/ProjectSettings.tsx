// components/ProjectSettings.tsx
import React, { useState } from 'react';
import { Edit3, Trash2, Plus, X } from 'lucide-react';
import './ProjectSettings.css';

export type ViewMode = 'supervisor' | 'developer';

interface SubProject {
  id: string;
  name: string;
  timeUsed: number;
  timeTotal: number;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  joined: string;
  left?: string;
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

interface ProjectSettingsProps {
  view: ViewMode;
  project: string;
  projectsData: ProjectData[];
  onProjectsUpdate: (updatedProjects: ProjectData[]) => void;
}

const ProjectSettings: React.FC<ProjectSettingsProps> = ({ 
 // view, 
  project, 
  projectsData, 
  onProjectsUpdate 
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    projectsData.find(p => p.name === project)?.id || projectsData[0]?.id || '2'
  );
  const [showAddSubProject, setShowAddSubProject] = useState(false);
  const [newSubProject, setNewSubProject] = useState({ name: '', timeTotal: 50 });
  const [editingSubProject, setEditingSubProject] = useState<string | null>(null);
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '', totalHours: 300 });
  const [showAddMember, setShowAddMember] = useState(false);
  const [newTeamMember, setNewTeamMember] = useState({ name: '', role: 'Developer' as TeamMember['role'] });

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
      const updatedProjects = projectsData.map(p => {
        if (p.id === selectedProjectId) {
          return {
            ...p,
            subProjects: [...p.subProjects, subProject],
            totalHours: p.totalHours + newSubProject.timeTotal,
          };
        }
        return p;
      });
      onProjectsUpdate(updatedProjects);
      setNewSubProject({ name: '', timeTotal: 50 });
      setShowAddSubProject(false);
    }
  };

  const handleDeleteSubProject = (subProjectId: string) => {
    const subProject = selectedProject.subProjects.find(sp => sp.id === subProjectId);
    if (subProject) {
      const updatedProjects = projectsData.map(p => {
        if (p.id === selectedProjectId) {
          return {
            ...p,
            subProjects: p.subProjects.filter(sp => sp.id !== subProjectId),
            totalHours: p.totalHours - subProject.timeTotal,
            usedHours: p.usedHours - subProject.timeUsed,
          };
        }
        return p;
      });
      onProjectsUpdate(updatedProjects);
    }
  };

  const handleUpdateSubProject = (subProjectId: string, field: keyof SubProject, value: any) => {
    const updatedProjects = projectsData.map(p => {
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
    });
    onProjectsUpdate(updatedProjects);
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
      const updatedProjects = [...projectsData, project];
      onProjectsUpdate(updatedProjects);
      setNewProject({ name: '', description: '', totalHours: 300 });
      setShowAddProject(false);
      setSelectedProjectId(project.id);
    }
  };

  const handleAddTeamMember = () => {
    if (!newTeamMember.name.trim()) {
      return;
    }

    const teamMember: TeamMember = {
      id: Date.now().toString(),
      name: newTeamMember.name.trim(),
      role: newTeamMember.role,
      joined: new Date().toISOString().split('T')[0],
    };

    const updatedProjects = projectsData.map(p => {
      if (p.id === selectedProjectId) {
        return {
          ...p,
          teamMembers: [...p.teamMembers, teamMember],
        };
      }
      return p;
    });

    onProjectsUpdate(updatedProjects);
    setNewTeamMember({ name: '', role: 'Developer' });
    setShowAddMember(false);
  };

  const handleDeleteTeamMember = (memberId: string) => {
    const updatedProjects = projectsData.map(p => {
      if (p.id === selectedProjectId) {
        return {
          ...p,
          teamMembers: p.teamMembers.filter(member => member.id !== memberId),
        };
      }
      return p;
    });

    onProjectsUpdate(updatedProjects);
  };

  const handleAddMemberSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleAddTeamMember();
  };

  const handleAddSubProjectSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleAddSubProject();
  };

  const handleEditSubProjectSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEditingSubProject(null);
  };

  const handleAddProjectSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleAddProject();
  };

  const handleDeleteProject = (projectId: string) => {
    if (projectsData.length > 1) {
      const updatedProjects = projectsData.filter(p => p.id !== projectId);
      onProjectsUpdate(updatedProjects);
      if (selectedProjectId === projectId) {
        setSelectedProjectId(updatedProjects[0].id);
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
                  <X size={18} />
                </button>
              </div>
              <div className="project-item-description">{p.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Rest of the component remains the same... */}
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
                    <Edit3 size={16} />
                  </button>
                  <button 
                    className="action-btn delete-btn"
                    onClick={() => handleDeleteSubProject(subProject.id)}
                    title="Delete sub-project"
                  >
                    <Trash2 size={16} />
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
            <Plus size={16} /> Add Sub-Project
          </button>
        </div>
      </div>

      {/* Team Members Section */}
      <div className="team-members-section">
        <div className="section-header">
          <h3>Team Members</h3>
          <button className="add-member-btn" onClick={() => setShowAddMember(true)}>
            <Plus size={16} /> Add Member
          </button>
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
                      <button className="action-btn edit-btn" title="Edit member">
                        <Edit3 size={16} />
                      </button>
                      <button
                        className="action-btn delete-btn"
                        title="Remove member"
                        onClick={() => handleDeleteTeamMember(member.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="modal-overlay" onClick={() => setShowAddMember(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleAddMemberSubmit}>
              <div className="modal-header">
                <h3>Add Team Member</h3>
                <button className="close-btn" type="button" onClick={() => setShowAddMember(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Member Name</label>
                  <input
                    type="text"
                    value={newTeamMember.name}
                    onChange={(e) => setNewTeamMember({ ...newTeamMember, name: e.target.value })}
                    placeholder="Enter member name"
                  />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select
                    value={newTeamMember.role}
                    onChange={(e) => setNewTeamMember({ ...newTeamMember, role: e.target.value as TeamMember['role'] })}
                  >
                    <option value="Developer">Developer</option>
                    <option value="Supervisor">Supervisor</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button className="cancel-btn" type="button" onClick={() => setShowAddMember(false)}>Cancel</button>
                <button className="create-btn" type="submit">Add Member</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Sub-Project Modal */}
      {showAddSubProject && (
        <div className="modal-overlay" onClick={() => setShowAddSubProject(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleAddSubProjectSubmit}>
              <div className="modal-header">
                <h3>Add Sub-Project</h3>
                <button className="close-btn" type="button" onClick={() => setShowAddSubProject(false)}>
                  <X size={18} />
                </button>
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
                <button className="cancel-btn" type="button" onClick={() => setShowAddSubProject(false)}>Cancel</button>
                <button className="create-btn" type="submit">Add Sub-Project</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Sub-Project Modal */}
      {editingSubProject && (
        <div className="modal-overlay" onClick={() => setEditingSubProject(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleEditSubProjectSubmit}>
              <div className="modal-header">
                <h3>Edit Sub-Project</h3>
                <button className="close-btn" type="button" onClick={() => setEditingSubProject(null)}>
                  <X size={18} />
                </button>
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
                <button className="cancel-btn" type="button" onClick={() => setEditingSubProject(null)}>Cancel</button>
                <button className="create-btn" type="submit">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      {showAddProject && (
        <div className="modal-overlay" onClick={() => setShowAddProject(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleAddProjectSubmit}>
              <div className="modal-header">
                <h3>Create New Project</h3>
                <button className="close-btn" type="button" onClick={() => setShowAddProject(false)}>
                  <X size={18} />
                </button>
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
                    min="0"
                    step="10"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="cancel-btn" type="button" onClick={() => setShowAddProject(false)}>Cancel</button>
                <button className="create-btn" type="submit">Create Project</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectSettings;