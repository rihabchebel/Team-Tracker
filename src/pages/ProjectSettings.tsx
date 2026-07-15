// pages/ProjectSettings.tsx - With Add Existing User & No Project Assignment Message

import React, { useState, useEffect, useRef } from 'react';
import './ProjectSettings.css';
import { formatDate } from '../utils/dateUtils';
import { ViewMode, Project, SubProject, TeamMember } from '../types/models';
import { dataService, supabase } from '../lib/dataService';
import { Plus, Minus, Edit2, Trash2, X, Clock, Users, AlertTriangle, Moon, Sun, UserPlus, Search, User } from 'lucide-react';
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

// ============================================
// EDIT MEMBER ROLE MODAL COMPONENT
// ============================================
interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (memberId: string, newRole: string) => Promise<void>;
  member: TeamMember | null;
  isLoading?: boolean;
}

const EditMemberModal: React.FC<EditMemberModalProps> = ({
  isOpen,
  onClose,
  onSave,
  member,
  isLoading = false,
}) => {
  const [selectedRole, setSelectedRole] = useState('Developer');

  useEffect(() => {
    if (member) {
      const roles = getAllRoles(member.role);
      setSelectedRole(roles.length > 0 ? roles[0].charAt(0).toUpperCase() + roles[0].slice(1) : 'Developer');
    }
  }, [member]);

  if (!isOpen || !member) return null;

  const handleSave = async () => {
    await onSave(member.id, selectedRole);
  };

  return (
    <div className="modal-overlay-centered" onClick={onClose}>
      <div className="modal-centered edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Member Role</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <div className="edit-member-info">
            <div className="member-avatar-large">
              {member.name?.charAt(0) || '?'}
            </div>
            <div>
              <div className="member-name-large">{member.name}</div>
              <div className="member-email-large">{member.email || 'No email'}</div>
            </div>
          </div>
          <div className="form-group">
            <label>
              Role <span className="required">*</span>
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              disabled={isLoading}
            >
              <option value="Developer">Developer</option>
              <option value="Supervisor">Supervisor</option>
              <option value="Admin">Admin</option>
              <option value="Project Manager">Project Manager</option>
              <option value="Team Lead">Team Lead</option>
              <option value="Designer">Designer</option>
              <option value="QA">QA</option>
              <option value="DevOps">DevOps</option>
              <option value="Analyst">Analyst</option>
              <option value="Intern">Intern</option>
              <option value="Consultant">Consultant</option>
              <option value="Contractor">Contractor</option>
            </select>
          </div>
          <div className="current-role-display">
            <span className="current-role-label">Current Role:</span>
            {(() => {
              const roles = getAllRoles(member.role);
              return roles.map((role, idx) => (
                <span 
                  key={idx}
                  className={`role-badge ${getRoleBadgeClass(role)}`}
                  style={{ marginLeft: '4px' }}
                >
                  {getRoleDisplayName(role)}
                </span>
              ));
            })()}
          </div>
        </div>
        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          <button 
            className="create-btn" 
            onClick={handleSave} 
            disabled={isLoading || !selectedRole}
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// ADD EXISTING USER MODAL
// ============================================
interface AddExistingUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (userId: string, role: string) => Promise<void>;
  currentProjectId: string;
  existingMemberIds: string[];
  isLoading?: boolean;
}

const AddExistingUserModal: React.FC<AddExistingUserModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  existingMemberIds,
  isLoading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState('Developer');
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableUsers();
    }
  }, [isOpen]);

  const fetchAvailableUsers = async () => {
    setLoadingUsers(true);
    try {
      // Fetch all users from user_profiles
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, roles')
        .order('full_name');

      if (error) throw error;

      // Filter out users already in the project
      const available = profiles.filter(
        (profile) => !existingMemberIds.includes(profile.id)
      );

      setAvailableUsers(available);
    } catch (error) {
      console.error('Error fetching users:', error);
      alert('Failed to load users. Please try again.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const filteredUsers = availableUsers.filter((user) => {
    const search = searchTerm.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search)
    );
  });

  const handleAdd = async () => {
    if (!selectedUserId) {
      alert('Please select a user to add.');
      return;
    }
    await onAdd(selectedUserId, selectedRole);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay-centered" onClick={onClose}>
      <div className="modal-centered add-user-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add Existing User to Project</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Search Users</label>
            <div className="search-box" style={{ display: 'flex', alignItems: 'center', border: '1px solid #d0d3e0', borderRadius: '6px', padding: '0 10px' }}>
              <Search size={16} style={{ color: '#8888aa' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or email..."
                style={{ border: 'none', padding: '10px', width: '100%', outline: 'none', background: 'transparent' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Select User <span className="required">*</span></label>
            {loadingUsers ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#8888aa' }}>
                Loading users...
              </div>
            ) : filteredUsers.length > 0 ? (
              <div className="user-select-list" style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #eef0f5', borderRadius: '6px' }}>
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`user-select-item ${selectedUserId === user.id ? 'selected' : ''}`}
                    onClick={() => setSelectedUserId(user.id)}
                    style={{
                      padding: '10px 14px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #eef0f5',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'background 0.2s',
                      background: selectedUserId === user.id ? 'rgba(79, 114, 232, 0.08)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedUserId !== user.id) {
                        e.currentTarget.style.background = '#f8f9fc';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedUserId !== user.id) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div className="user-avatar-small" style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #4f72e8, #6c5ce7)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '600',
                      fontSize: '13px',
                      flexShrink: 0,
                      textTransform: 'uppercase'
                    }}>
                      {user.full_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, color: '#1a1a2e' }}>{user.full_name}</div>
                      <div style={{ fontSize: '13px', color: '#8888aa' }}>{user.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#8888aa' }}>
                {searchTerm ? 'No users found matching your search.' : 'All users are already in this project.'}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              disabled={isLoading}
            >
              <option value="Developer">Developer</option>
              <option value="Supervisor">Supervisor</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          <button 
            className="create-btn" 
            onClick={handleAdd} 
            disabled={!selectedUserId || isLoading}
          >
            {isLoading ? 'Adding...' : 'Add to Project'}
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
  // ✅ Dark theme state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : false;
  });

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
  // ADD EXISTING USER STATE
  // ============================================
  const [showAddExistingUser, setShowAddExistingUser] = useState(false);
  const [isAddingExistingUser, setIsAddingExistingUser] = useState(false);

  // ============================================
  // EDIT MEMBER STATE
  // ============================================
  const [showEditMember, setShowEditMember] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [isSavingMember, setIsSavingMember] = useState(false);

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

  // ✅ Toggle dark theme
  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", newTheme ? "dark" : "light");
  };

  // ✅ Apply theme on mount
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDarkMode ? "dark" : "light");
  }, []);

  // ============================================
  // EFFECTS
  // ============================================
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

  // ============================================
  // HELPERS
  // ============================================
  const sortMembersByRole = (members: TeamMember[]) => {
    return [...members].sort((a, b) => {
      const priorityA = getRolePriority(a.role);
      const priorityB = getRolePriority(b.role);
      return priorityA - priorityB;
    });
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

  // ============================================
  // HANDLERS
  // ============================================
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

  // ✅ NEW: Handle adding existing user to project
  const handleAddExistingUser = async (userId: string, role: string) => {
    if (!currentProject) return;

    setIsAddingExistingUser(true);
    try {
      await dataService.addTeamMember(
        currentProject.id,
        userId,
        role
      );

      await refreshProjects();

      setShowAddExistingUser(false);
      alert('User added to project successfully!');
    } catch (error) {
      console.error('Error adding existing user:', error);
      alert('Failed to add user to project. Please try again.');
    } finally {
      setIsAddingExistingUser(false);
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

  // ✅ NEW: Handle editing member role
  const handleEditMember = (member: TeamMember) => {
    setEditingMember(member);
    setShowEditMember(true);
  };

  // ✅ NEW: Save member role
  const handleSaveMemberRole = async (memberId: string, newRole: string) => {
    if (!currentProject) return;

    setIsSavingMember(true);
    try {
      await dataService.updateTeamMemberRole(
        currentProject.id,
        memberId,
        newRole
      );

      await refreshProjects();

      setShowEditMember(false);
      setEditingMember(null);
      
      alert(`✅ Role updated to "${newRole}" successfully!`);
    } catch (error) {
      console.error('Error updating member role:', error);
      alert('Failed to update member role. Please try again.');
    } finally {
      setIsSavingMember(false);
    }
  };

  // ============================================
  // ✅ HOISTED MODAL - Rendered in ALL branches
  // ============================================
  const addProjectModal = showAddProject && (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        pointerEvents: 'auto',
      }}
      onClick={() => setShowAddProject(false)}
    >
      <div
        style={{
          backgroundColor: isDarkMode ? '#1a1a2e' : '#fff',
          padding: '24px',
          borderRadius: '12px',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
          maxHeight: '90vh',
          overflow: 'auto',
          color: isDarkMode ? '#e8e8f0' : '#1a1a2e',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: isDarkMode ? '#e8e8f0' : '#1a1a2e' }}>Create New Project</h3>
          <button
            onClick={() => setShowAddProject(false)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: isDarkMode ? '#8888aa' : '#8888aa',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, color: isDarkMode ? '#e8e8f0' : '#1a1a2e' }}>
              Project Name
            </label>
            <input
              type="text"
              value={newProject.name}
              onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
              placeholder="Enter project name"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: isDarkMode ? '1px solid #3a3a4e' : '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                background: isDarkMode ? '#1a1a2e' : '#fff',
                color: isDarkMode ? '#e8e8f0' : '#1a1a2e',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, color: isDarkMode ? '#e8e8f0' : '#1a1a2e' }}>
              Description
            </label>
            <input
              type="text"
              value={newProject.description}
              onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
              placeholder="Enter project description"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: isDarkMode ? '1px solid #3a3a4e' : '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                background: isDarkMode ? '#1a1a2e' : '#fff',
                color: isDarkMode ? '#e8e8f0' : '#1a1a2e',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, color: isDarkMode ? '#e8e8f0' : '#1a1a2e' }}>
              Total Hours
            </label>
            <input
              type="number"
              value={newProject.totalHours}
              onChange={(e) => setNewProject({ ...newProject, totalHours: parseInt(e.target.value) || 300 })}
              min="1"
              step="10"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: isDarkMode ? '1px solid #3a3a4e' : '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                background: isDarkMode ? '#1a1a2e' : '#fff',
                color: isDarkMode ? '#e8e8f0' : '#1a1a2e',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            onClick={() => setShowAddProject(false)}
            style={{
              padding: '8px 16px',
              border: isDarkMode ? '1px solid #3a3a4e' : '1px solid #ddd',
              borderRadius: '4px',
              background: isDarkMode ? '#2a2a3e' : '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              color: isDarkMode ? '#e8e8f0' : '#1a1a2e',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleAddProject}
            disabled={loading}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              background: loading ? '#ccc' : '#4f72e8',
              color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
            }}
          >
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================
  // RENDER BRANCHES
  // ============================================

  // BRANCH 1: No projects exist
  if (!localProjects || localProjects.length === 0) {
    return (
      <>
        <div className={`project-settings-container ${isDarkMode ? 'dark' : ''}`}>
          <div className="project-selector">
            <div className="project-selector-header">
              <h3>Projects</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button 
                  className="theme-toggle-btn" 
                  onClick={toggleTheme} 
                  title="Toggle theme"
                >
                  {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                </button>
                <button className="add-project-btn" onClick={() => setShowAddProject(true)}>
                  <Plus size={16} />
                  New Project
                </button>
              </div>
            </div>
            <div className="project-list">
              <div className="no-projects">No projects available. Create one!</div>
            </div>
          </div>
        </div>
        {addProjectModal}
      </>
    );
  }

  // BRANCH 2: Project not found
  if (!currentProject) {
    return (
      <>
        <div className={`project-settings-container ${isDarkMode ? 'dark' : ''}`}>
          <div className="project-selector">
            <div className="project-selector-header">
              <h3>Projects</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button 
                  className="theme-toggle-btn" 
                  onClick={toggleTheme} 
                  title="Toggle theme"
                >
                  {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                </button>
                <button className="add-project-btn" onClick={() => setShowAddProject(true)}>
                  <Plus size={16} />
                  New Project
                </button>
              </div>
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
        </div>
        {addProjectModal}
      </>
    );
  }

  // BRANCH 3: Main render
  const sortedMembers = currentProject.teamMembers 
    ? sortMembersByRole(currentProject.teamMembers)
    : [];

  return (
    <>
      <div className={`project-settings-container ${isDarkMode ? 'dark' : ''}`}>
        {/* Project Selector */}
        <div className="project-selector">
          <div className="project-selector-header">
            <h3>Projects</h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button 
                className="theme-toggle-btn" 
                onClick={toggleTheme} 
                title="Toggle theme"
              >
                {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button className="add-project-btn" onClick={() => setShowAddProject(true)}>
                <Plus size={16} />
                New Project
              </button>
            </div>
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
            <div style={{ display: 'flex', gap: '8px' }}>
              {(isAdmin || view === 'supervisor') && (
                <>
                  <button 
                    className="add-member-btn" 
                    onClick={() => setShowAddExistingUser(true)}
                    style={{ background: '#6c5ce7' }}
                  >
                    <UserPlus size={16} />
                    Add Existing User
                  </button>
                  <button className="add-member-btn" onClick={() => setShowAddMember(true)}>
                    <Users size={16} />
                    Add New Member
                  </button>
                </>
              )}
            </div>
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
                          {(isAdmin || view === 'supervisor') && (
                            <button 
                              className="action-btn edit-btn" 
                              onClick={() => handleEditMember(member)}
                              title="Edit member role"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
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
            
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <div ><User size={48} /></div>
                    <div style={{ fontSize: '16px', fontWeight: 500, color: '#1a1a2e', marginBottom: '4px' }}>
                      No project role assigned.
                    </div>
                    <div style={{ fontSize: '14px', color: '#8888aa' }}>
                      Contact an admin to be added to a project.
                    </div>
                  </div>
                
              
            
            )}
          </div>
        </div>

        {/* ============================================
            MODALS
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

        {/* Add New Member Modal */}
        {showAddMember && (
          <div className="modal-overlay-centered" onClick={() => setShowAddMember(false)}>
            <div className="modal-centered" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Add New Member to {currentProject.name}</h3>
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

        {/* Add Existing User Modal */}
        <AddExistingUserModal
          isOpen={showAddExistingUser}
          onClose={() => setShowAddExistingUser(false)}
          onAdd={handleAddExistingUser}
          currentProjectId={currentProject.id}
          existingMemberIds={currentProject.teamMembers?.map(m => m.id) || []}
          isLoading={isAddingExistingUser}
        />

        {/* Edit Member Modal */}
        <EditMemberModal
          isOpen={showEditMember}
          onClose={() => {
            setShowEditMember(false);
            setEditingMember(null);
          }}
          onSave={handleSaveMemberRole}
          member={editingMember}
          isLoading={isSavingMember}
        />

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
      {addProjectModal}
    </>
  );
};

export default ProjectSettings;