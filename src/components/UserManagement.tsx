// components/UserManagement.tsx
import React, { useState } from 'react';
// Option 1: If you have CSS, uncomment this line
// import './UserManagement.css';

export type ViewMode = 'supervisor' | 'developer';

interface User {
  id: string;
  name: string;
  email: string;
  created: string;
  role?: string;
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
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'Developer' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateUser = () => {
    if (newUser.name && newUser.email) {
      const user: User = {
        id: Date.now().toString(),
        name: newUser.name,
        email: newUser.email,
        created: new Date().toLocaleDateString('en-GB'),
        role: newUser.role,
      };
      setUsers([...users, user]);
      setNewUser({ name: '', email: '', role: 'Developer' });
      setShowModal(false);
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (view === 'supervisor') {
      setUsers(users.filter(user => user.id !== userId));
    }
  };

  const handleBulkDelete = () => {
    if (view === 'supervisor' && selectedUsers.length > 0) {
      setUsers(users.filter(user => !selectedUsers.includes(user.id)));
      setSelectedUsers([]);
    }
  };

  const toggleUserSelection = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(user => user.id));
    }
  };

  return (
    <div className="user-management">
      <div className="page-header">
        <div className="page-header-content">
          <div>
            <h2>{project}</h2>
            <span className="project-description">Client portal redesign</span>
          </div>
          {view === 'supervisor' && (
            <button className="create-btn" onClick={() => setShowModal(true)}>
              <span className="btn-icon">➕</span>
              Create & Invite User
            </button>
          )}
        </div>
      </div>

      <div className="content-area">
        <div className="management-toolbar">
          <div className="toolbar-left">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {view === 'supervisor' && selectedUsers.length > 0 && (
              <button className="bulk-delete-btn" onClick={handleBulkDelete}>
                Delete Selected ({selectedUsers.length})
              </button>
            )}
          </div>
          <div className="toolbar-right">
            <span className="user-count">{filteredUsers.length} users</span>
          </div>
        </div>

        <div className="table-container">
          <table className="user-table">
            <thead>
              <tr>
                {view === 'supervisor' && (
                  <th className="checkbox-cell">
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                )}
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  {view === 'supervisor' && (
                    <td className="checkbox-cell">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                      />
                    </td>
                  )}
                  <td>
                    <div className="user-name-cell">
                      <div className="user-avatar">
                        {user.name.charAt(0)}
                      </div>
                      {user.name}
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`role-badge role-${user.role?.toLowerCase()}`}>
                      {user.role || 'User'}
                    </span>
                  </td>
                  <td>{user.created}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="action-btn edit" title="Edit user">
                        ✏️
                      </button>
                      <button className="action-btn view" title="View details">
                        👁️
                      </button>
                      {view === 'supervisor' && (
                        <button
                          className="action-btn delete"
                          title="Delete user"
                          onClick={() => handleDeleteUser(user.id)}
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

      {/* Create User Modal */}
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
                <label htmlFor="userName">Full Name</label>
                <input
                  id="userName"
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="userEmail">Email Address</label>
                <input
                  id="userEmail"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
              <div className="form-group">
                <label htmlFor="userRole">Role</label>
                <select
                  id="userRole"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="Admin">Admin</option>
                  <option value="Developer">Developer</option>
                  <option value="Designer">Designer</option>
                  <option value="Manager">Manager</option>
                  <option value="Guest">Guest</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="create-btn" onClick={handleCreateUser}>
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