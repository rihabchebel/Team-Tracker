// components/UserManagement.tsx
import React, { useState } from 'react';
import { Edit3, Trash2, X, Plus } from 'lucide-react';
import EditUser from './EditUser';
import { formatDate } from '../utils/dateUtils';
import './UserManagement.css';
import { ViewMode, User, Project } from '../types/models';
import { dataService } from '../lib/dataService';
import { auth } from '../lib/supabase';

interface UserManagementProps {
  view: ViewMode;
  project: string;
  users: User[];
  projectsData: Project[];
  onUsersUpdate: (updatedUsers: User[]) => void;
  onProjectsUpdate: (updatedProjects: Project[]) => void;
  isAdmin?: boolean;
}

const UserManagement: React.FC<UserManagementProps> = ({ view, project, users, projectsData, onUsersUpdate, onProjectsUpdate, isAdmin = false }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Developer',
    project: ''
  });

  const [searchTerm /*, setSearchTerm*/] = useState('');
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [addRole, setAddRole] = useState<'Developer' | 'Supervisor'>('Developer');
  const [addTargetProject, setAddTargetProject] = useState<string>('');

  const isSupervisor = view === 'supervisor';

  const projects = projectsData.map((p) => p.name);

  // Project descriptions mapping
  const projectDescriptions: Record<string, string> = {
    'Project Alpha': 'Main product development sprint',
    'Project Beta': 'Client portal redesign',
    'Service VAS': 'Test description',
    'test': 'test',
    'T': 'test'
  };

  // Get users that have access to the current project
  const getProjectUsers = () => {
    if (project === 'All Projects') {
      return users;
    }
    
    const currentProject = projectsData.find(p => p.name === project);
    if (!currentProject) return users;
    
    const memberIds = currentProject.teamMembers.map(m => m.id);
    const projectUsers = users.filter(u => memberIds.includes(u.id));
    
    // If no users have access to this project, show all users
    if (projectUsers.length === 0) {
      return users.map(u => ({ ...u, project: project }));
    }
    
    return projectUsers;
  };

  const filteredUsers = getProjectUsers().filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get the description for the current project
  const getProjectDescription = (projectName: string): string => {
    return projectDescriptions[projectName] || 'No description available';
  };

  const handleCreateUser = async () => {
    if (!isAdmin) {
      alert('Only admins can create new users.');
      return;
    }

    if (!newUser.name || !newUser.email || !newUser.password) {
      alert('Please complete name, email, and password fields.');
      return;
    }

    if (!newUser.project || newUser.project === 'All Projects') {
      alert('Please select a project for this user.');
      return;
    }

    const projectObj = projectsData.find((p) => p.name === newUser.project);
    if (!projectObj) {
      alert('Selected project not found.');
      return;
    }

    try {
      // Create auth user first
      const signUpResult = await auth.signUp(newUser.email, newUser.password, {
        name: newUser.name,
      });

      if (!signUpResult.user?.id) {
        throw new Error('Unable to create auth user.');
      }

      const authUserId = signUpResult.user.id;

      // Create corresponding profile with the same auth user id
      const createdProfile = await dataService.createUserProfile({
        id: authUserId,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role.toLowerCase(),
      });

      if (!createdProfile) {
        throw new Error('Could not create user profile');
      }

      // Add team member for the selected project
      await dataService.addTeamMember(projectObj.id, authUserId, newUser.role);

      const refreshedProjects = await dataService.getAllProjects();
      const refreshedUsers = await dataService.getAllUsers();

      onProjectsUpdate(refreshedProjects);
      onUsersUpdate(refreshedUsers);

      setNewUser({ name: '', email: '', password: '', role: 'Developer', project: '' });
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Failed to create user. Please try again.');
    }
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  // Keep selectedUser object in sync if `users` prop updates externally
  React.useEffect(() => {
    if (!selectedUser) return;
    const latest = users.find(u => u.id === selectedUser.id);
    if (latest && (latest.name !== selectedUser.name || latest.email !== selectedUser.email || latest.role !== selectedUser.role || latest.project !== selectedUser.project)) {
      setSelectedUser(latest);
    }
  }, [users, selectedUser]);

  const handleSaveUser = (updatedUser: User) => {
    const updatedUsers = users.map(user => 
      user.id === updatedUser.id ? updatedUser : user
    );
    onUsersUpdate(updatedUsers);

    // Update team members in-place across projects
    const updatedProjects = projectsData.map((projectData) => {
      const hasMember = projectData.teamMembers.some(member => member.id === updatedUser.id);
      let nextTeamMembers = projectData.teamMembers;

      if (hasMember) {
        // Update existing member in-place
        nextTeamMembers = projectData.teamMembers.map(member =>
          member.id === updatedUser.id
            ? { ...member, name: updatedUser.name, role: updatedUser.role || 'Developer' }
            : member
        );
      } else if (projectData.name === updatedUser.project && updatedUser.project) {
        // Add to new project if assigned and not already present
        nextTeamMembers = [
          ...projectData.teamMembers,
          {
            id: updatedUser.id,
            name: updatedUser.name,
            role: updatedUser.role || 'Developer',
            joined: updatedUser.created,
          },
        ];
      }

      return {
        ...projectData,
        teamMembers: nextTeamMembers,
      };
    });
    onProjectsUpdate(updatedProjects);

    setShowEditModal(false);
    setSelectedUser(null);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedUser(null);
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (userToDelete) {
      const updatedUsers = users.filter(user => user.id !== userToDelete.id);
      onUsersUpdate(updatedUsers);

      const updatedProjects = projectsData.map((projectData) => ({
        ...projectData,
        teamMembers: projectData.teamMembers.filter(member => member.id !== userToDelete.id),
      }));
      onProjectsUpdate(updatedProjects);

      setShowDeleteModal(false);
      setUserToDelete(null);
    }
  };

  const handleAddUserToProject = async (user: User, role: 'Developer' | 'Supervisor', targetProject?: string) => {
    const projectName = targetProject || project;
    if (!projectName || projectName === 'All Projects') return;

    try {
      const projectObj = projectsData.find((p) => p.name === projectName);
      if (!projectObj) return;

      // Call backend to add team member
      await dataService.addTeamMember(projectObj.id, user.id, role);

      // Refresh projects and users from backend
      const refreshedProjects = await dataService.getAllProjects();
      const refreshedUsers = await dataService.getAllUsers();

      onProjectsUpdate(refreshedProjects);
      onUsersUpdate(refreshedUsers);
    } catch (error) {
      console.error('Error adding user to project:', error);
      alert('Failed to add user to project.');
    } finally {
      setAddingUserId(null);
      setAddTargetProject('');
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setUserToDelete(null);
  };

  const handleCreateUserSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleCreateUser();
  };

  return (
    <div className="user-management">
      <div className="page-header">
        <div className="page-header-content">
          <div>
            <h2>{project}</h2>
            <span className="project-description">{getProjectDescription(project)}</span>
          </div>
          {isAdmin && (
            <button className="create-user-btn" onClick={() => setShowCreateModal(true)}>
              Create & Invite User
            </button>
          )}
        </div>
      </div>

      <div className="content-area">
        <div className="user-management-header">
          <h3>User Management</h3>
        </div>

        <div className="table-container">
          <table className="user-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Created</th>
                <th>Project Role / Access</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const proj = projectsData.find(p => p.name === project);
                const member = proj?.teamMembers.find(m => m.id === user.id);

                // For 'All Projects' view, compute memberships across all projects
                const memberships = project === 'All Projects'
                  ? projectsData.map(pd => ({ projectName: pd.name, member: pd.teamMembers.find(m => m.id === user.id) })).filter(x => x.member)
                  : [];

                return (
                <tr key={user.id}>
                  <td className="user-name-cell">
                    <div className="user-avatar">
                      {user.name.charAt(0)}
                    </div>
                    {user.name}
                  </td>
                  <td>{user.email}</td>
                 <td>{formatDate(user.created)}</td>
                  <td>
                    {project === 'All Projects' ? (
                      memberships.length > 0 ? (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {memberships.map(({ projectName, member: m }) => (
                            <span key={projectName} className={`role-badge role-${(m!.role || 'Developer').toLowerCase()}`} title={projectName}>
                              {m!.role} · {projectName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="no-access">
                          <span className="no-access-text">No access</span>
                          {isSupervisor && (
                            <div className="add-inline">
                              {addingUserId === user.id ? (
                                <>
                                  <select value={addTargetProject} onChange={(e) => setAddTargetProject(e.target.value)}>
                                    <option value="">Select project</option>
                                    {projects.map(pn => (
                                      <option key={pn} value={pn}>{pn}</option>
                                    ))}
                                  </select>

                                  <select value={addRole} onChange={(e) => setAddRole(e.target.value as 'Developer' | 'Supervisor')}>
                                    <option value="Developer">Developer</option>
                                    <option value="Supervisor">Supervisor</option>
                                  </select>

                                  <button className="confirm-add" onClick={() => {
                                    handleAddUserToProject(user, addRole, addTargetProject);
                                  }}>Add</button>
                                  <button className="cancel-add" onClick={() => { setAddingUserId(null); setAddTargetProject(''); }}>Cancel</button>
                                </>
                              ) : (
                                <button className="add-icon-btn" onClick={() => { setAddingUserId(user.id); setAddRole('Developer'); setAddTargetProject(''); }} title="Add to project">
                                  <Plus size={14} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    ) : (
                      member ? (
                        <span className={`role-badge role-${(member.role || 'Developer').toLowerCase()}`}>{member.role || 'Developer'}</span>
                      ) : (
                        <div className="no-access">
                          <span className="no-access-text">No access</span>
                          {isSupervisor && (
                            <div className="add-inline">
                              {addingUserId === user.id ? (
                                <>
                                  <select value={addRole} onChange={(e) => setAddRole(e.target.value as 'Developer' | 'Supervisor')}>
                                    <option value="Developer">Developer</option>
                                    <option value="Supervisor">Supervisor</option>
                                  </select>

                                  <button className="confirm-add" onClick={() => {
                                    handleAddUserToProject(user, addRole);
                                  }}>Add</button>
                                  <button className="cancel-add" onClick={() => setAddingUserId(null)}>Cancel</button>
                                </>
                              ) : (
                                <button className="add-icon-btn" onClick={() => { setAddingUserId(user.id); setAddRole('Developer'); setAddTargetProject(''); }} title="Add to project">
                                  <Plus size={14} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="action-link edit-btn" 
                        onClick={() => handleEditClick(user)}
                        title="Edit User"
                      >
                        <Edit3 size={16} />
                      </button>
                      {isSupervisor && (
                        <button 
                          className="action-link delete-btn" 
                          onClick={() => handleDeleteClick(user)}
                          title="Delete User"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create & Invite User Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleCreateUserSubmit}>
              <div className="modal-header">
                <h3>Create & Invite User</h3>
                <button className="close-btn" type="button" onClick={() => setShowCreateModal(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                <label>
                  Full Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  Email <span className="required">*</span>
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="Enter email address"
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  Password <span className="required">*</span>
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Enter password"
                  required
                />
              </div>

              <div className="form-group">
                <label>Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="Developer">Developer</option>
                  <option value="Supervisor">Supervisor</option>
                </select>
              </div>

              <div className="form-group">
                <label>Assign to Project (optional)</label>
                <select
                  value={newUser.project}
                  onChange={(e) => setNewUser({ ...newUser, project: e.target.value })}
                >
                  <option value="">None</option>
                  {projects.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" type="button" onClick={() => setShowCreateModal(false)}>
                CANCEL
              </button>
              <button 
                className="create-btn" 
                type="submit"
                disabled={!newUser.name || !newUser.email || !newUser.password}
              >
                Create & Invite
              </button>
            </div>
          </form>
        </div>
      </div>
      )}

      {/* Edit User Modal */}
      <EditUser
        user={selectedUser}
        isOpen={showEditModal}
        onClose={handleCloseEditModal}
        onSave={handleSaveUser}
        projects={projects}
      />

      {/* Delete User Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <div className="modal-overlay" onClick={handleCancelDelete}>
          <div className="modal delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete User</h3>
              <button className="close-btn" onClick={handleCancelDelete}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                <h4 style={{ margin: '0 0 8px 0', color: '#1a1a2e' }}>
                  Are you sure you want to delete this user?
                </h4>
                <p style={{ color: '#666', margin: '0 0 4px 0' }}>
                  <strong>{userToDelete.name}</strong>
                </p>
                <p style={{ color: '#8888aa', fontSize: '14px', margin: '0' }}>
                  {userToDelete.email}
                </p>
                <div style={{ 
                  marginTop: '16px', 
                  padding: '12px', 
                  background: '#fff3f3', 
                  borderRadius: '6px',
                  border: '1px solid #ffcdd2',
                  color: '#d32f2f',
                  fontSize: '13px'
                }}>
                  This action cannot be undone. All user data will be permanently removed.
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid #eef0f5' }}>
              <button className="cancel-btn" onClick={handleCancelDelete}>
                CANCEL
              </button>
              <button 
                className="delete-btn-modal" 
                onClick={handleConfirmDelete}
                style={{
                  padding: '10px 24px',
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  letterSpacing: '0.5px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#c82333';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#dc3545';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;