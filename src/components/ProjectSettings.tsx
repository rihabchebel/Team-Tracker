// components/ProjectSettings.tsx
import React, { useState, useEffect } from 'react';
import './ProjectSettings.css';
import { formatDate } from '../utils/dateUtils';
import { ViewMode, Project, SubProject } from '../types/models';
import { dataService } from '../lib/dataService';
import { Plus, Minus, Edit2, Trash2, X, Clock, Users } from 'lucide-react';

interface ProjectSettingsProps {
  view: ViewMode;
  project: string;
  projectsData: Project[];
  onProjectsUpdate: (projects: Project[]) => void;
  onProjectSelect?: (project: string) => void;
}

const ProjectSettings: React.FC<ProjectSettingsProps> = ({ 
  view: _view, // Prefix with underscore to indicate intentionally unused
  project, 
  projectsData, 
  onProjectsUpdate,
  onProjectSelect
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [showAddSubProject, setShowAddSubProject] = useState(false);
  const [newSubProject, setNewSubProject] = useState({ name: '', timeTotal: 50 });
  const [editingSubProject, setEditingSubProject] = useState<string | null>(null);
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '', totalHours: 300 });
  const [loading, setLoading] = useState(false);
  const [editSubProjectData, setEditSubProjectData] = useState<SubProject | null>(null);

  // Get the current project - updates when project prop changes
  const currentProject = projectsData?.find(p => p.name === project) || projectsData?.[0] || null;

  // Set selected project ID when currentProject changes
  useEffect(() => {
    if (currentProject) {
      setSelectedProjectId(currentProject.id);
    }
  }, [currentProject]);

  // Handle project click - notify parent App
  const handleProjectClick = (projectName: string) => {
    const clickedProject = projectsData.find(p => p.name === projectName);
    if (clickedProject) {
      setSelectedProjectId(clickedProject.id);
      if (onProjectSelect) {
        onProjectSelect(projectName);
      }
    }
  };

  const handleAddSubProject = async () => {
    if (!currentProject || !newSubProject.name.trim()) return;
    
    setLoading(true);
    try {
      const updatedProject = await dataService.addSubProject(
        currentProject.id,
        {
          name: newSubProject.name,
          timeUsed: 0,
          timeTotal: newSubProject.timeTotal,
        }
      );
      
      const updatedProjects = projectsData.map(p => 
        p.id === currentProject.id ? updatedProject : p
      );
      onProjectsUpdate(updatedProjects);
      
      setNewSubProject({ name: '', timeTotal: 50 });
      setShowAddSubProject(false);
    } catch (error) {
      console.error('Error adding sub-project:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubProject = async (subProjectId: string) => {
    if (!currentProject) return;
    if (!window.confirm('Delete this sub-project?')) return;
    
    setLoading(true);
    try {
      const updatedProject = await dataService.deleteSubProject(
        currentProject.id,
        subProjectId
      );
      
      const updatedProjects = projectsData.map(p => 
        p.id === currentProject.id ? updatedProject : p
      );
      onProjectsUpdate(updatedProjects);
    } catch (error) {
      console.error('Error deleting sub-project:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fix: handleUpdateSubProject should accept parameters
  const handleUpdateSubProject = async (subProjectId: string, updates: Partial<SubProject>) => {
    if (!currentProject) return;
    
    setLoading(true);
    try {
      const updatedProject = await dataService.updateSubProject(
        currentProject.id,
        subProjectId,
        updates
      );
      
      const updatedProjects = projectsData.map(p => 
        p.id === currentProject.id ? updatedProject : p
      );
      onProjectsUpdate(updatedProjects);
      
      setEditingSubProject(null);
      setEditSubProjectData(null);
    } catch (error) {
      console.error('Error updating sub-project:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fix: Save edited sub-project
  const handleSaveEditedSubProject = async () => {
    if (!currentProject || !editingSubProject || !editSubProjectData) return;
    
    await handleUpdateSubProject(editingSubProject, {
      name: editSubProjectData.name,
      timeUsed: editSubProjectData.timeUsed,
      timeTotal: editSubProjectData.timeTotal,
    });
  };

  const handleAddProject = async () => {
    if (!newProject.name.trim()) return;
    
    setLoading(true);
    try {
      const created = await dataService.createProject({
        name: newProject.name,
        description: newProject.description || 'No description',
        totalHours: newProject.totalHours,
        usedHours: 0,
        subProjects: [],
        teamMembers: [],
      });
      
      onProjectsUpdate([...projectsData, created]);
      setNewProject({ name: '', description: '', totalHours: 300 });
      setShowAddProject(false);
      
      if (onProjectSelect) {
        onProjectSelect(created.name);
      }
    } catch (error) {
      console.error('Error creating project:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (projectsData.length <= 1) {
      alert('Cannot delete the last project');
      return;
    }
    if (!window.confirm('Delete this project?')) return;
    
    setLoading(true);
    try {
      await dataService.deleteProject(projectId);
      const updatedProjects = projectsData.filter(p => p.id !== projectId);
      onProjectsUpdate(updatedProjects);
      
      if (onProjectSelect && updatedProjects.length > 0) {
        onProjectSelect(updatedProjects[0].name);
      }
    } catch (error) {
      console.error('Error deleting project:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = (used: number, total: number) => {
    return total > 0 ? Math.round((used / total) * 100) : 0;
  };

  const getTotalProgress = () => {
    if (!currentProject) return 0;
    return currentProject.totalHours > 0 
      ? Math.round((currentProject.usedHours / currentProject.totalHours) * 100)
      : 0;
  };

  // Show loading state if no projects
  if (!projectsData || projectsData.length === 0) {
    return (
      <div className="project-settings-container">
        <div className="page-header">
          <div className="page-header-content">
            <div>
              <h2>Project Settings</h2>
              <span className="project-description">No projects available</span>
            </div>
          </div>
        </div>
        <div className="dashboard-content">
          <p>Loading projects...</p>
        </div>
      </div>
    );
  }

  // If current project is null, show message
  if (!currentProject) {
    return (
      <div className="project-settings-container">
        <div className="page-header">
          <div className="page-header-content">
            <div>
              <h2>{project}</h2>
              <span className="project-description">Project not found</span>
            </div>
          </div>
        </div>
        <div className="dashboard-content">
          <p>Project not found. Please select a different project.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="project-settings-container">
      {/* Project List */}
      <div className="project-selector">
        <div className="project-selector-header">
          <h3>Projects</h3>
          <button className="add-project-btn" onClick={() => setShowAddProject(true)}>
            <Plus size={16} />
            New Project
          </button>
        </div>
        
        <div className="project-list">
          {projectsData.map((p) => (
            <div
              key={p.id}
              className={`project-item ${selectedProjectId === p.id ? 'active' : ''}`}
              onClick={() => handleProjectClick(p.name)}
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
                    handleDeleteProject(p.id);
                  }}
                  title="Delete project"
                >
                  <X size={16} />
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
          <h3>{currentProject.name} - Time Tracking</h3>
          <div className="total-time">
            <Clock size={16} />
            <span className="time-label">Total Time:</span>
            <span className="time-value">{currentProject.usedHours}/{currentProject.totalHours}h</span>
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
          {currentProject.subProjects && currentProject.subProjects.length > 0 ? (
            currentProject.subProjects.map((subProject) => (
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
                      className="action-btn time-btn minus"
                      onClick={() => handleUpdateSubProject(subProject.id, { timeUsed: Math.max(0, subProject.timeUsed - 1) })}
                      title="Subtract 1 hour"
                      disabled={loading || subProject.timeUsed <= 0}
                    >
                      <Minus size={14} />
                    </button>
                    <button 
                      className="action-btn time-btn plus"
                      onClick={() => handleUpdateSubProject(subProject.id, { timeUsed: Math.min(subProject.timeTotal, subProject.timeUsed + 1) })}
                      title="Add 1 hour"
                      disabled={loading || subProject.timeUsed >= subProject.timeTotal}
                    >
                      <Plus size={14} />
                    </button>
                    <button 
                      className="action-btn edit-btn"
                      onClick={() => {
                        setEditingSubProject(subProject.id);
                        setEditSubProjectData({ ...subProject });
                      }}
                      title="Edit sub-project"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      className="action-btn delete-btn"
                      onClick={() => handleDeleteSubProject(subProject.id)}
                      title="Delete sub-project"
                    >
                      <Trash2 size={14} />
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
            ))
          ) : (
            <div className="no-sub-projects">No sub-projects yet</div>
          )}

          <button 
            className="add-sub-project-btn"
            onClick={() => setShowAddSubProject(true)}
          >
            <Plus size={16} />
            Add Sub-Project
          </button>
        </div>
      </div>

      {/* Team Members Section */}
      <div className="team-members-section">
        <div className="section-header">
          <h3>Team Members</h3>
          <button className="add-member-btn">
            <Users size={16} />
            Add Member
          </button>
        </div>

        <div className="team-members-table">
          {currentProject.teamMembers && currentProject.teamMembers.length > 0 ? (
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
                {currentProject.teamMembers.map((member) => (
                  <tr key={member.id}>
                    <td>{member.name}</td>
                    <td>
                      <span className={`role-badge ${member.role === 'Supervisor' ? 'role-supervisor' : 'role-developer'}`}>
                        {member.role}
                      </span>
                    </td>
                    <td>{formatDate(member.joined)}</td>
                    <td>{member.left ? formatDate(member.left) : '—'}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="action-btn edit-btn" title="Edit member">
                          <Edit2 size={14} />
                        </button>
                        <button className="action-btn delete-btn" title="Remove member">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="no-members">No team members yet</div>
          )}
        </div>
      </div>

      {/* Add Sub-Project Modal */}
      {showAddSubProject && (
        <div className="modal-overlay-centered" onClick={() => setShowAddSubProject(false)}>
          <div className="modal-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Sub-Project</h3>
              <button className="close-btn" onClick={() => setShowAddSubProject(false)}>
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
              <button className="cancel-btn" onClick={() => setShowAddSubProject(false)}>Cancel</button>
              <button className="create-btn" onClick={handleAddSubProject} disabled={loading}>
                {loading ? 'Adding...' : 'Add Sub-Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Sub-Project Modal */}
      {editingSubProject && editSubProjectData && (
        <div className="modal-overlay-centered" onClick={() => {
          setEditingSubProject(null);
          setEditSubProjectData(null);
        }}>
          <div className="modal-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Sub-Project</h3>
              <button className="close-btn" onClick={() => {
                setEditingSubProject(null);
                setEditSubProjectData(null);
              }}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Sub-Project Name</label>
                <input
                  type="text"
                  value={editSubProjectData.name}
                  onChange={(e) => setEditSubProjectData({ ...editSubProjectData, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Total Hours</label>
                <input
                  type="number"
                  value={editSubProjectData.timeTotal}
                  onChange={(e) => setEditSubProjectData({ ...editSubProjectData, timeTotal: parseInt(e.target.value) || 0 })}
                  min="1"
                  step="1"
                />
              </div>
              <div className="form-group">
                <label>Used Hours</label>
                <input
                  type="number"
                  value={editSubProjectData.timeUsed}
                  onChange={(e) => setEditSubProjectData({ ...editSubProjectData, timeUsed: parseInt(e.target.value) || 0 })}
                  min="0"
                  max={editSubProjectData.timeTotal}
                  step="1"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => {
                setEditingSubProject(null);
                setEditSubProjectData(null);
              }}>Cancel</button>
              <button className="create-btn" onClick={handleSaveEditedSubProject} disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      {showAddProject && (
        <div className="modal-overlay-centered" onClick={() => setShowAddProject(false)}>
          <div className="modal-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Project</h3>
              <button className="close-btn" onClick={() => setShowAddProject(false)}>
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
                  min="1"
                  step="10"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowAddProject(false)}>Cancel</button>
              <button className="create-btn" onClick={handleAddProject} disabled={loading}>
                {loading ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectSettings;