// components/EditUser.tsx
import React, { useState, useEffect } from 'react';
import './EditUser.css';
import { User } from '../types/models';

interface EditUserProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedUser: User) => void;
  projects: string[];
}

const EditUser: React.FC<EditUserProps> = ({
  user,
  isOpen,
  onClose,
  onSave,
  projects
}) => {
  const [formData, setFormData] = useState<User | null>(null);

  useEffect(() => {
    if (user) {
      setFormData({ ...user });
    }
  }, [user]);

  if (!isOpen || !formData) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      onSave(formData);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="modal-header">
            <h3>Edit User</h3>
            <button className="close-btn" type="button" onClick={onClose}>
              ×
            </button>
          </div>
          <div className="modal-body">
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Role</label>
              <select
                name="role"
                value={formData.role || 'developer'}
                onChange={handleChange}
              >
                <option value="developer">Developer</option>
                <option value="supervisor">Supervisor</option>
              </select>
            </div>

            <div className="form-group">
              <label>Project</label>
              <select
                name="project"
                value={formData.project || ''}
                onChange={handleChange}
              >
                <option value="">None</option>
                {projects.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button className="cancel-btn" type="button" onClick={onClose}>
              CANCEL
            </button>
            <button className="save-btn" type="submit">
              SAVE CHANGES
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUser;