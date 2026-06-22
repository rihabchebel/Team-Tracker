// components/UserManagement.tsx
import React, { useState } from 'react';
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
    { id: '1', name: 'Alice Johnson', email: 'alice@example.com', created: '14/04/2026', role: 'Admin' },
    { id: '2', name: 'Bob Smith', email: 'bob@example.com', created: '14/04/2026', role: 'Developer' },
    { id: '3', name: 'Carol Davis', email: 'carol@example.com', created: '14/04/2026', role: 'Designer' },
    { id: '4', name: 'Dave Wilson', email: 'dave@example.com', created: '14/04/2026', role: 'Developer' },
    { id: '5', name: 'Eve Martinez', email: 'eve@example.com', created: '14/04/2026', role: 'Manager' },
    { id: '6', name: 'Frank Brown', email: 'frank@example.com', created: '14/04/2026', role: 'Developer' },
    { id: '7', name: 'Guest', email: 'guest@local', created: '22/06/2026', role: 'Guest' },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Developer',
    project: ''
  });

  const [searchTerm, setSearchTerm] = useState('');

  // Project descriptions mapping
  const projectDescriptions: Record<string, string> = {
    'Project Alpha': 'Main product development sprint',
    'Project Beta': 'Client portal redesign',
    'Service VAS': 'Test description',
    'test': 'test',
    'T': 'test',
    'All Tasks': 'All tasks overview'
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
      setShowModal(false);
    }
  };

  return (
    <div className="user-management">
      <div className="page-header">
        <div className="page-header-content">
          <div>
            <h2>{project}</h2>
            <span className="project-description">{getProjectDescription(project)}</span>
          </div>
          {view === 'supervisor' && (
            <button className="create-user-btn" onClick={() => setShowModal(true)}>
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
                    <button className="action-link">✏️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create & Invite User Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create & Invite User</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>
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
              <button className="cancel-btn" onClick={() => setShowModal(false)}>
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
    </div>
  );
};

export default UserManagement;