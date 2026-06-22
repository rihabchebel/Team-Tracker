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
}

interface UserManagementProps {
  view: ViewMode;
  project: string;
}

const UserManagement: React.FC<UserManagementProps> = ({ view, project }) => {
  const [users] = useState<User[]>([
    { id: '1', name: 'Alice Johnson', email: 'alice@example.com', created: '14/04/2026', role: 'Admin' },
    { id: '2', name: 'Bob Smith', email: 'bob@example.com', created: '14/04/2026', role: 'Developer' },
    { id: '3', name: 'Carol Davis', email: 'carol@example.com', created: '14/04/2026', role: 'Designer' },
    { id: '4', name: 'Dave Wilson', email: 'dave@example.com', created: '14/04/2026', role: 'Developer' },
    { id: '5', name: 'Eve Martinez', email: 'eve@example.com', created: '14/04/2026', role: 'Manager' },
    { id: '6', name: 'Frank Brown', email: 'frank@example.com', created: '14/04/2026', role: 'Developer' },
    { id: '7', name: 'Guest', email: 'guest@localhost', created: '22/06/2026', role: 'Guest' },
  ]);

  const [searchTerm] = useState('');

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="user-management">
      <div className="page-header">
        <div className="page-header-content">
          <div>
            <h2>{project}</h2>
            <span className="project-description">Client portal redesign</span>
          </div>
        </div>
      </div>

      <div className="content-area">
        <div className="management-toolbar">
          <div className="toolbar-left">
            <div className="user-count">
              <span>{filteredUsers.length} users</span>
            </div>
          </div>
        </div>

        <div className="table-container">
          <table className="user-table">
            <thead>
              <tr>
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;