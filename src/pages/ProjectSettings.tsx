// pages/ProjectSettings.tsx - Fixed for JSONB roles (NO INFINITE RECURSION)

import React, { useState, useEffect, useRef } from 'react';
import './ProjectSettings.css';
import { formatDate } from '../utils/dateUtils';
import { ViewMode, Project, SubProject, TeamMember } from '../types/models';
import { dataService, supabase } from '../lib/dataService';
import { Plus, Minus, Edit2, Trash2, X, Clock, Users, AlertTriangle } from 'lucide-react';
// ✅ Import role utilities
import {
  getAllRoles,
  hasMultipleRoles,
  getRoleDisplayName,
  getRoleBadgeClass,
  getRolePriority
} from '../utils/roleUtils';

interface ProjectSettingsProps {
  view: ViewMode;
  project: string;
  projectsData: Project[];
  onProjectsUpdate: (projects: Project[]) => void;
  onProjectSelect?: (project: string) => void;
  isAdmin?: boolean;
}

// ============================================
// DELETE CONFIRMATION MODAL COMPONENT
// ============================================
interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemName: string;
  itemDetail?: string;
  isLoading?: boolean;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  itemDetail,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay-centered" onClick={onClose}>
      <div className="modal-centered delete-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header delete-header">
          <div className="delete-icon-wrapper">
            <AlertTriangle size={24} className="delete-icon" />
          </div>
          <h3>{title}</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body delete-body">
          <p className="delete-message">{message}</p>
          <div className="delete-item-info">
            <div className="delete-item-name">{itemName}</div>
            {itemDetail && <div className="delete-item-detail">{itemDetail}</div>}
          </div>
          <p className="delete-warning">
            This action cannot be undone. All associated data will be permanently removed.
          </p>
        </div>
        <div className="modal-footer delete-footer">
          <button className="cancel-btn" onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          <button className="delete-confirm-btn" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ProjectSettings: React.FC<ProjectSettingsProps> = ({ 
  view,
  project, 
  projectsData, 
  onProjectsUpdate,
  onProjectSelect,
  isAdmin = false,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [showAddSubProject, setShowAddSubProject] = useState(false);
  const [newSubProject, setNewSubProject] = useState({ name: '', timeTotal: 50 });
  const [editingSubProject, setEditingSubProject] = useState<string | null>(null);
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '', totalHours: 300 });
  const [loading, setLoading] = useState(false);
  const [editSubProjectData, setEditSubProjectData] = useState<SubProject | null>(null);
  const [localProjects, setLocalProjects] = useState<Project[]>(projectsData);
  const isInternalUpdate = useRef(false);

  // ============================================
  // ADD MEMBER STATE
  // ============================================
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    role: 'Developer'
  });
  const [isAddingMember, setIsAddingMember] = useState(false);

  // ============================================
  // DELETE CONFIRMATION STATE
  // ============================================
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'project' | 'subproject' | 'member';
    id: string;
    name: string;
    detail?: string;
  }>({
    isOpen: false,
    type: 'project',
    id: '',
    name: '',
    detail: '',
  });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isInternalUpdate.current) {
      setLocalProjects(projectsData);
    }
    isInternalUpdate.current = false;
  }, [projectsData]);

  const currentProject = localProjects?.find(p => p.name === project) || localProjects?.[0] || null;

  useEffect(() => {
    if (currentProject) {
      setSelectedProjectId(currentProject.id);
    }
  }, [currentProject]);

  const handleProjectClick = (projectName: string) => {
    if (projectName === project) return;
    
    const clickedProject = localProjects.find(p => p.name === projectName);
    if (clickedProject) {
      setSelectedProjectId(clickedProject.id);
      if (onProjectSelect) {
        onProjectSelect(projectName);
      }
    }
  };

  // ============================================
  // RECALCULATE PROJECT TOTALS IN DATABASE
  // ============================================
  const recalculateProjectTotals = async (projectId: string) => {
    try {
      const { data: allSubProjects, error: fetchError } = await supabase
        .from('sub_projects')
        .select('*')
        .eq('project_id', projectId);

      if (fetchError) throw fetchError;

      const totalHours = allSubProjects.reduce((sum: number, sp: any) => sum + (sp.time_total || 0), 0);
      const totalUsed = allSubProjects.reduce((sum: number, sp: any) => sum + (sp.time_used || 0), 0);

      const { error: updateError } = await supabase
        .from('projects')
        .update({
          total_hours: totalHours,
          used_hours: totalUsed,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId);

      if (updateError) throw updateError;

      return { totalHours, totalUsed };
    } catch (error) {
      console.error('Error recalculating project totals:', error);
      throw error;
    }
  };

  // ============================================
  // REFRESH PROJECTS
  // ============================================
  const refreshProjects = async () => {
    try {
      const refreshedProjects = await dataService.getAllProjects();
      setLocalProjects(refreshedProjects);
      onProjectsUpdate(refreshedProjects);
    } catch (error) {
      console.error('Error refreshing projects:', error);
    }
  };

  // ============================================
  // SUB-PROJECT CRUD
  // ============================================
  const handleAddSubProject = async () => {
    if (!currentProject || !newSubProject.name.trim()) return;
    
    setLoading(true);
    try {
      const { data: newSub, error } = await supabase
        .from('sub_projects')
        .insert({
          project_id: currentProject.id,
          name: newSubProject.name,
          time_used: 0,
          time_total: newSubProject.timeTotal,
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Sub-project created:', newSub);

      await recalculateProjectTotals(currentProject.id);
      await refreshProjects();
      
      setNewSubProject({ name: '', timeTotal: 50 });
      setShowAddSubProject(false);
    } catch (error) {
      console.error('Error adding sub-project:', error);
      alert('Failed to add sub-project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSubProject = async (subProjectId: string, updates: Partial<SubProject>) => {
    if (!currentProject) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('sub_projects')
        .update({
          name: updates.name,
          time_used: updates.timeUsed,
          time_total: updates.timeTotal,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subProjectId)
        .eq('project_id', currentProject.id);

      if (error) throw error;

      await recalculateProjectTotals(currentProject.id);
      await refreshProjects();
      
      setEditingSubProject(null);
      setEditSubProjectData(null);
    } catch (error) {
      console.error('Error updating sub-project:', error);
      alert('Failed to update sub-project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubProject = async (subProjectId: string) => {
    if (!currentProject) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('sub_projects')
        .delete()
        .eq('id', subProjectId)
        .eq('project_id', currentProject.id);

      if (error) throw error;

      await recalculateProjectTotals(currentProject.id);
      await refreshProjects();
    } catch (error) {
      console.error('Error deleting sub-project:', error);
      alert('Failed to delete sub-project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEditedSubProject = async () => {
    if (!currentProject || !editingSubProject || !editSubProjectData) return;
    
    await handleUpdateSubProject(editingSubProject, {
      name: editSubProjectData.name,
      timeUsed: editSubProjectData.timeUsed,
      timeTotal: editSubProjectData.timeTotal,
    });
  };

  // ============================================
  // PROJECT CRUD
  // ============================================
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
      
      await refreshProjects();
      
      setNewProject({ name: '', description: '', totalHours: 300 });
      setShowAddProject(false);
      
      if (onProjectSelect) {
        onProjectSelect(created.name);
      }
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (localProjects.length <= 1) {
      alert('Cannot delete the last project');
      return;
    }
    
    setLoading(true);
    try {
      await dataService.deleteProject(projectId);
      await refreshProjects();
      
      if (onProjectSelect && localProjects.length > 1) {
        const remainingProjects = localProjects.filter(p => p.id !== projectId);
        if (remainingProjects.length > 0) {
          onProjectSelect(remainingProjects[0].name);
        }
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // DELETE HANDLERS WITH CONFIRMATION
  // ============================================
  const confirmDelete = (type: 'project' | 'subproject' | 'member', id: string, name: string, detail?: string) => {
    setDeleteModal({
      isOpen: true,
      type,
      id,
      name,
      detail,
    });
  };

  const handleDeleteConfirmed = async () => {
    const { type, id, name } = deleteModal;
    setIsDeleting(true);

    try {
      switch (type) {
        case 'project':
          await handleDeleteProject(id);
          break;
        case 'subproject':
          await handleDeleteSubProject(id);
          break;
        case 'member':
          await handleRemoveMember(id);
          break;
      }
      alert(`${name} deleted successfully!`);
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      alert(`Failed to delete ${name}. Please try again.`);
    } finally {
      setIsDeleting(false);
      setDeleteModal({ isOpen: false, type: 'project', id: '', name: '', detail: '' });
    }
  };

  // ============================================
  // TEAM MEMBER CRUD
  // ============================================
  const handleAddMember = async () => {
    if (!currentProject) {
      alert('No project selected');
      return;
    }
    
    if (!newMember.name.trim() || !newMember.email.trim()) {
      alert('Please fill in all fields');
      return;
    }

    const existingMember = currentProject.teamMembers?.find(
      (m: TeamMember) => m.name.toLowerCase() === newMember.name.toLowerCase()
    );
    if (existingMember) {
      alert('This member already exists in the project.');
      return;
    }

    setIsAddingMember(true);
    try {
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .insert({
          full_name: newMember.name,
          email: newMember.email,
          role: newMember.role.toLowerCase(),
          status: 'active',
        })
        .select()
        .single();

      if (userError) throw userError;

      await dataService.addTeamMember(
        currentProject.id,
        userData.id,
        newMember.role.toLowerCase()
      );

      await refreshProjects();

      setNewMember({ name: '', email: '', role: 'Developer' });
      setShowAddMember(false);
      
      alert('Member added successfully!');
    } catch (error) {
      console.error('Error adding member:', error);
      alert('Failed to add member. Please try again.');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!currentProject) return;

    try {
      await dataService.removeTeamMember(currentProject.id, memberId);
      await refreshProjects();
    } catch (error) {
      console.error('Error removing member:', error);
      throw error;
    }
  };

  // ============================================
  // HELPERS - FIXED FOR JSONB ROLES (NO RECURSION)
  // ============================================
  const getProgressPercentage = (used: number, total: number) => {
    return total > 0 ? Math.round((used / total) * 100) : 0;
  };

  const getTotalProgress = () => {
    if (!currentProject) return 0;
    return currentProject.totalHours > 0 
      ? Math.round((currentProject.usedHours / currentProject.totalHours) * 100)
      : 0;
  };

  // ✅ FIXED: Use the imported utility functions directly - NO local wrappers
  // ✅ Simply use getRoleBadgeClass, getRoleDisplayName, getRolePriority, getAllRoles, hasMultipleRoles
  // ✅ directly from the import at the top of the file

  // ✅ FIXED: Sort members by role priority
  const sortMembersByRole = (members: TeamMember[]) => {
    return [...members].sort((a, b) => {
      const priorityA = getRolePriority(a.role);
      const priorityB = getRolePriority(b.role);
      return priorityA - priorityB;
    });
  };

  // ============================================
  // RENDER
  // ============================================
  // ============================================
  // ADD PROJECT MODAL (shared across all render branches)
  // ============================================
  const addProjectModal = showAddProject && (
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
  );

  if (!localProjects || localProjects.length === 0) {
    return (
      <div className="project-settings-container">
        <div className="project-selector">
          <div className="project-selector-header">
            <h3>Projects</h3>
            <button className="add-project-btn" onClick={() => setShowAddProject(true)}>
              <Plus size={16} />
              New Project
            </button>
          </div>
          <div className="project-list">
            <div className="no-projects">No projects available. Create one!</div>
          </div>
        </div>
        {addProjectModal}
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="project-settings-container">
        <div className="project-selector">
          <div className="project-selector-header">
            <h3>Projects</h3>
            <button className="add-project-btn" onClick={() => setShowAddProject(true)}>
              <Plus size={16} />
              New Project
            </button>
          </div>
          <div className="project-list">
            {localProjects.map((p) => (
              <div
                key={p.id}
                className="project-item"
                onClick={() => handleProjectClick(p.name)}
              >
                <div className="project-item-header">
                  <div className="project-item-info">
                    <span className="project-item-name">{p.name}</span>
                    <span className="project-item-hours">{p.totalHours}h</span>
                  </div>
                </div>
                <div className="project-item-description">{p.description}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="time-tracking-section">
          <p>Project not found. Please select a different project.</p>
        </div>
        {addProjectModal}
      </div>
    );
  }

  // ✅ FIXED: Sort members by role priority
  const sortedMembers = currentProject.teamMembers 
    ? sortMembersByRole(currentProject.teamMembers)
    : [];

  return (
    <div className="project-settings-container">
      {/* Project Selector */}
      <div className="project-selector">
        <div className="project-selector-header">
          <h3>Projects</h3>
          <button className="add-project-btn" onClick={() => setShowAddProject(true)}>
            <Plus size={16} />
            New Project
          </button>
        </div>
        
        <div className="project-list">
          {localProjects.map((p) => (
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
                {localProjects.length > 1 && (
                  <button 
                    className="delete-project-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDelete('project', p.id, p.name, p.description);
                    }}
                    title="Delete project"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
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
                      onClick={() => confirmDelete('subproject', subProject.id, subProject.name, `${subProject.timeUsed}/${subProject.timeTotal}h`)}
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
          <h3>
            <Users size={16} />
            Team Members ({sortedMembers.length})
          </h3>
          {(isAdmin || view === 'supervisor') && (
            <button className="add-member-btn" onClick={() => setShowAddMember(true)}>
              <Users size={16} />
              Add Member
            </button>
          )}
        </div>

        <div className="team-members-table">
          {sortedMembers.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedMembers.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className="member-info">
                        <div className="member-avatar">
                          {member.name?.charAt(0) || '?'}
                        </div>
                        <span>{member.name}</span>
                        {/* ✅ Show multiple roles indicator */}
                        {hasMultipleRoles(member.role) && (
                          <span className="multiple-roles-indicator" style={{ marginLeft: '8px' }}>
                            <span className="green-dot"></span>
                            <span className="roles-text" style={{ fontSize: '10px' }}>
                              {getAllRoles(member.role).join(' + ')}
                            </span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {/* ✅ Show all roles - using imported getRoleBadgeClass and getRoleDisplayName */}
                      {(() => {
                        const roles = getAllRoles(member.role);
                        return roles.map((role, idx) => (
                          <span 
                            key={idx}
                            className={`role-badge ${getRoleBadgeClass(role)}`}
                            style={{ marginRight: '4px' }}
                          >
                            {getRoleDisplayName(role)}
                          </span>
                        ));
                      })()}
                    </td>
                    <td>{formatDate(member.joined)}</td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="action-btn delete-btn" 
                          onClick={() => confirmDelete('member', member.id, member.name, member.role)}
                          title="Remove member"
                        >
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

      {/* ============================================
          MODALS (unchanged)
          ============================================ */}

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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubProject();
                    }
                  }}
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubProject();
                    }
                  }}
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveEditedSubProject();
                    }
                  }}
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveEditedSubProject();
                    }
                  }}
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveEditedSubProject();
                    }
                  }}
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
      {addProjectModal}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="modal-overlay-centered" onClick={() => setShowAddMember(false)}>
          <div className="modal-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Member to {currentProject.name}</h3>
              <button className="close-btn" onClick={() => setShowAddMember(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>
                  Member Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={newMember.name}
                  onChange={(e) =>
                    setNewMember({
                      ...newMember,
                      name: e.target.value,
                    })
                  }
                  placeholder="Enter member name"
                />
              </div>
              <div className="form-group">
                <label>
                  Email <span className="required">*</span>
                </label>
                <input
                  type="email"
                  value={newMember.email}
                  onChange={(e) =>
                    setNewMember({
                      ...newMember,
                      email: e.target.value,
                    })
                  }
                  placeholder="Enter email address"
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  value={newMember.role}
                  onChange={(e) =>
                    setNewMember({
                      ...newMember,
                      role: e.target.value,
                    })
                  }
                >
                  <option value="Developer">Developer</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="cancel-btn"
                onClick={() => setShowAddMember(false)}
              >
                Cancel
              </button>
              <button
                className="create-btn"
                onClick={handleAddMember}
                disabled={
                  !newMember.name || !newMember.email || isAddingMember
                }
              >
                {isAddingMember ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, type: 'project', id: '', name: '', detail: '' })}
        onConfirm={handleDeleteConfirmed}
        title={
          deleteModal.type === 'project' ? 'Delete Project' :
          deleteModal.type === 'subproject' ? 'Delete Sub-Project' :
          'Remove Member'
        }
        message={
          deleteModal.type === 'project' ? 'Are you sure you want to delete this project?' :
          deleteModal.type === 'subproject' ? 'Are you sure you want to delete this sub-project?' :
          'Are you sure you want to remove this team member?'
        }
        itemName={deleteModal.name}
        itemDetail={deleteModal.detail}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default ProjectSettings;