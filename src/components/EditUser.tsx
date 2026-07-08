// components/EditUser.tsx - Fixed for JSONB roles and Lint error

import React, { useState, useEffect } from "react";
import { User } from "../types/models";
import { X } from "lucide-react";
import "./EditUser.css";
// ✅ Import role utilities
import {
  getPrimaryRole,
  getAllRoles,
  getRoleDisplayName,
} from "../utils/roleUtils";

interface EditUserProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedUser: User) => void;
  currentProject?: string;
}

const EditUser: React.FC<EditUserProps> = ({
  user,
  isOpen,
  onClose,
  onSave,
  currentProject,
}) => {
  const [formData, setFormData] = useState<User | null>(null);
  const [roleUpdateType, setRoleUpdateType] = useState<"project" | "all">(
    "project",
  );
  const [projectRole, setProjectRole] = useState<string>("Developer");

  useEffect(() => {
    if (user) {
      // ✅ Get primary role from JSONB array or string
      const primaryRole = getPrimaryRole(user.role);
      const allRoles = getAllRoles(user.role);
      
      setFormData({
        ...user,
        role: primaryRole, // Store primary role as string for display
        roles: allRoles, // Store all roles for reference
      });
      
      // Set project role based on current project membership
      if (currentProject && user.memberships) {
        const membership = (user.memberships || []).find(
          (m: any) => m.projectName === currentProject
        );
        setProjectRole(membership?.role || "Developer");
      } else {
        setProjectRole(primaryRole || "Developer");
      }
    }
  }, [user, currentProject]);

  if (!isOpen || !formData) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => (prev ? { ...prev, [name]: value } : null));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    let updatedUser = { ...formData };

    if (roleUpdateType === "project" && currentProject) {
      // Only update role for this project
      updatedUser = {
        ...updatedUser,
        role: projectRole,
        project: currentProject,
      };
    } else {
      // Update role for all projects
      updatedUser = {
        ...updatedUser,
        role: projectRole,
      };
    }

    onSave(updatedUser);
  };

  // ✅ Get role options
  const roleOptions = ["Developer", "Supervisor", "Admin"];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal edit-user-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit User</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name || ""}
                onChange={handleChange}
                placeholder="Enter full name"
                required
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email || ""}
                onChange={handleChange}
                placeholder="Enter email address"
                required
              />
            </div>

            {/* ✅ Show current roles */}
            <div className="form-group">
              <label>Current Roles</label>
              <div className="current-roles-display">
                {getAllRoles(user?.role).map((role, idx) => (
                  <span key={idx} className="role-badge-small">
                    {getRoleDisplayName(role)}
                  </span>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Role Update Type</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="roleUpdateType"
                    value="project"
                    checked={roleUpdateType === "project"}
                    onChange={() => setRoleUpdateType("project")}
                  />
                  <div>
                    <span className="radio-title">This Project Only</span>
                    <span className="radio-description">
                      (Current Project: {currentProject || "None"})
                    </span>
                  </div>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="roleUpdateType"
                    value="all"
                    checked={roleUpdateType === "all"}
                    onChange={() => setRoleUpdateType("all")}
                  />
                  <div>
                    <span className="radio-title">All Projects</span>
                    <span className="radio-description">
                      Changes role for all projects
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {roleUpdateType === "project" && currentProject ? (
              <div className="form-group">
                <label>Role in this project</label>
                <select
                  value={projectRole}
                  onChange={(e) => setProjectRole(e.target.value)}
                  className="role-select"
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <small className="form-hint">
                  Only changes the role for this project
                </small>
              </div>
            ) : (
              <div className="form-group">
                <label>Role (All Projects)</label>
                <select
                  name="role"
                  value={projectRole}
                  onChange={(e) => setProjectRole(e.target.value)}
                  className="role-select"
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <small className="form-hint">
                  Changes role for all projects
                </small>
              </div>
            )}

            <div className="form-group">
              <label>Status</label>
              <select
                name="status"
                value={formData.status || "Active"}
                onChange={handleChange}
                className="status-select"
              >
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
                <option value="Left">Left</option>
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="cancel-btn" onClick={onClose}>
              CANCEL
            </button>
            <button type="submit" className="save-btn">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUser;