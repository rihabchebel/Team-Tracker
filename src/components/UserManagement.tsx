// components/UserManagement.tsx
import React, { useState } from 'react';
import EditUser from './EditUser';
import './UserManagement.css';

export type ViewMode = 'supervisor' | 'developer';

interface User {
  id: string;
  name: string;
  email: string;
  created: string;
  role?: string;
  password?: string;
  project?: string;
}

interface UserManagementProps {
  view: ViewMode;
  project: string;
}

const UserManagement: React.FC<UserManagementProps> = ({ view, project }) => {
  const [users, setUsers] = useState<User[]>([
    { id: '1', name: 'Alice Johnson', email: 'alice@example.com', created: '14/04/2026', role: 'Supervisor' },
    { id: '2', name: 'Bob Smith', email: 'bob@example.com', created: '14/04/2026', role: 'Developer' },
    { id: '3', name: 'Carol Davis', email: 'carol@example.com', created: '14/04/2026', role: 'Developer' },
    { id: '4', name: 'Dave Wilson', email: 'dave@example.com', created: '14/04/2026', role: 'Developer' },
    { id: '5', name: 'Eve Martinez', email: 'eve@example.com', created: '14/04/2026', role: 'Supervisor' },
    { id: '6', name: 'Frank Brown', email: 'frank@example.com', created: '14/04/2026', role: 'Developer' },
    { id: '7', name: 'Guest', email: 'guest@local', created: '22/06/2026', role: 'Developer' },
  ]);
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
  const isSupervisor = view === 'supervisor';

  // Project descriptions mapping
  const projectDescriptions: Record<string, string> = {
    'Project Alpha': 'Main product development sprint',
    'Project Beta': 'Client portal redesign',
    'Service VAS': 'Test description',
    'test': 'test',
    'T': 'test'
  };

  const projects = ['Project Alpha', 'Project Beta', 'Service VAS', 'TMA'];

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get the description for the current project
  const getProjectDescription = (projectName: string): string => {
    return projectDescriptions[projectName] || 'No description available';
  };

  const handleCreateUser = () => {
    if (newUser.name && newUser.email && newUser.password) {
      const user: User = {
        id: Date.now().toString(),
        name: newUser.name,
        email: newUser.email,
        created: new Date().toLocaleDateString('en-GB'),
        role: newUser.role,
        project: newUser.project || undefined,
      };
      setUsers([...users, user]);
      setNewUser({ name: '', email: '', password: '', role: 'Developer', project: '' });
      setShowCreateModal(false);
    }
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleSaveUser = (updatedUser: User) => {
    setUsers(users.map(user => 
      user.id === updatedUser.id ? updatedUser : user
    ));
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
      setUsers(users.filter(user => user.id !== userToDelete.id));
      setShowDeleteModal(false);
      setUserToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setUserToDelete(null);
  };

  return (
    <div className="user-management">
      <div className="page-header">
        <div className="page-header-content">
          <div>
            <h2>{project}</h2>
            <span className="project-description">{getProjectDescription(project)}</span>
          </div>
          {isSupervisor && (
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="user-name-cell">
                    <div className="user-avatar">
                      {user.name.charAt(0)}
                    </div>
                    {user.name}
                  </td>
                  <td>{user.email}</td>
                  <td>{user.created}</td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="action-link edit-btn" 
                        onClick={() => handleEditClick(user)}
                        title="Edit User"
                      >
                        ✏️
                      </button>
                      {isSupervisor && (
                        <button 
                          className="action-link delete-btn" 
                          onClick={() => handleDeleteClick(user)}
                          title="Delete User"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create & Invite User Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create & Invite User</h3>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>
                ×
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
              <button className="cancel-btn" onClick={() => setShowCreateModal(false)}>
                CANCEL
              </button>
              <button 
                className="create-btn" 
                onClick={handleCreateUser}
                disabled={!newUser.name || !newUser.email || !newUser.password}
              >
                Create & Invite
              </button>
            </div>
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
        currentUserRole={view}
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