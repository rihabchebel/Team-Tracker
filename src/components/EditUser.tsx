// components/EditUser.tsx
import React, { useState, useEffect } from 'react';
import './UserManagement.css';

interface User {
  id: string;
  name: string;
  email: string;
  created: string;
  role?: string;
  password?: string;
  project?: string;
}

interface EditUserProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedUser: User) => void;
  projects: string[];
  currentUserRole?: string; // 'supervisor' or 'developer'
}

const EditUser: React.FC<EditUserProps> = ({
  user,
  isOpen,
  onClose,
  onSave,
  projects,
  currentUserRole = 'developer'
}) => {
  const [formData, setFormData] = useState<User | null>(null);
  const [password, setPassword] = useState('');
  const isSupervisor = currentUserRole === 'supervisor';

  useEffect(() => {
    if (user) {
      setFormData({ ...user });
      setPassword('');
    }
  }, [user]);

  if (!isOpen || !formData) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      const updatedUser = { ...formData };
      if (password) {
        updatedUser.password = password;
      }
      onSave(updatedUser);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit User</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>
                Full Name <span className="required">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name || ''}
                onChange={handleChange}
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
                name="email"
                value={formData.email || ''}
                onChange={handleChange}
                placeholder="Enter email address"
                required
              />
            </div>

            {/* Supervisor-only fields */}
            {isSupervisor && (
              <>
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password (optional)"
                  />
                  <small style={{ color: '#8888aa', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    Leave blank to keep current password
                  </small>
                </div>

                <div className="form-group">
                  <label>Role</label>
                  <select
                    name="role"
                    value={formData.role || 'Developer'}
                    onChange={handleChange}
                  >
                    <option value="Developer">Developer</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Manager">Manager</option>
                    <option value="Designer">Designer</option>
                    <option value="Admin">Admin</option>
                    <option value="Guest">Guest</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Assign to Project (optional)</label>
                  <select
                    name="project"
                    value={formData.project || ''}
                    onChange={handleChange}
                  >
                    <option value="">None</option>
                    {projects.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Developer view - show read-only info */}
            {!isSupervisor && (
              <div style={{ 
                marginTop: '16px', 
                padding: '16px', 
                background: '#f8f9fc', 
                borderRadius: '6px',
                border: '1px dashed #d0d3e0'
              }}>
                <p style={{ 
                  margin: '0 0 8px 0', 
                  color: '#8888aa', 
                  fontSize: '13px',
                  fontWeight: '500'
                }}>
                  ℹ️ Read-only fields (Supervisor only)
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#666', fontSize: '13px' }}>Role:</span>
                    <span style={{ color: '#1a1a2e', fontSize: '13px', fontWeight: '500' }}>
                      {formData.role || 'Developer'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#666', fontSize: '13px' }}>Project:</span>
                    <span style={{ color: '#1a1a2e', fontSize: '13px', fontWeight: '500' }}>
                      {formData.project || 'None'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div style={{ 
              marginTop: '16px', 
              padding: '12px', 
              background: '#f8f9fc', 
              borderRadius: '6px',
              fontSize: '13px',
              color: '#666'
            }}>
              <span style={{ fontWeight: '600' }}>Created:</span> {formData.created || 'N/A'}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="cancel-btn" onClick={onClose}>
              CANCEL
            </button>
            <button 
              type="submit" 
              className="create-btn"
              disabled={!formData.name || !formData.email}
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUser;