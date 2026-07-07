// components/EditUser.tsx - Complete updated version

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import "./UserManagement.css";
import { User } from "../types/models";
import { dataService } from "../lib/dataService";

interface EditUserProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedUser: User) => void;
  projects: string[];
  currentProject?: string;
}

const EditUser: React.FC<EditUserProps> = ({
  user,
  isOpen,
  onClose,
  onSave,
  projects,
  currentProject,
}) => {
  const [editedUser, setEditedUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [updateType, setUpdateType] = useState<"global" | "project">("project");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setEditedUser({ ...user });
      setUpdateType("project");
      setError(null);
    }
  }, [user]);

  if (!isOpen || !editedUser || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      console.log('📝 Submitting edit for user:', editedUser);
      console.log('Update type:', updateType);
      console.log('Current project:', currentProject);

      if (updateType === "project" && currentProject) {
        // Update role ONLY for this project
        const project = projects.find(p => p === currentProject);
        if (!project) {
          throw new Error(`Project "${currentProject}" not found`);
        }
        
        const projectData = await dataService.getProjects();
        const projectObj = projectData.find(p => p.name === project);
        
        if (!projectObj) {
          throw new Error(`Project "${project}" not found in database`);
        }
        
        console.log(`📝 Updating role for user ${user.id} in project ${projectObj.id}`);
        
        // Update project-specific role
        await dataService.updateTeamMemberRole(
          projectObj.id,
          user.id,
          editedUser.role || "Developer"
        );
        console.log(`✅ Role updated for project ${project} only`);
        
        // Also update user profile if name or email changed
        if (editedUser.name !== user.name || editedUser.email !== user.email) {
          await dataService.updateUser(user.id, {
            name: editedUser.name,
            email: editedUser.email,
          });
        }
      } else {
        // Update user globally (all projects)
        console.log('📝 Updating user globally');
        await dataService.updateUser(user.id, {
          name: editedUser.name,
          email: editedUser.email,
          role: editedUser.role,
          status: editedUser.status,
        });
        console.log(`✅ User updated globally`);
      }

      // Refresh data
      const [] = await Promise.all([
        dataService.getAllUsers(),
        dataService.getAllProjects(),
      ]);
      
      // Call onSave with updated user
      onSave(editedUser);
      
      // Close modal
      onClose();
      
      alert(`✅ User updated successfully!`);
    } catch (error: any) {
      console.error("Error updating user:", error);
      setError(error.message || "Failed to update user. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="modal-header">
            <h3>Edit User</h3>
            <button type="button" className="close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
          <div className="modal-body">
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                value={editedUser.name}
                onChange={(e) =>
                  setEditedUser({ ...editedUser, name: e.target.value })
                }
                placeholder="Enter full name"
                required
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={editedUser.email}
                onChange={(e) =>
                  setEditedUser({ ...editedUser, email: e.target.value })
                }
                placeholder="Enter email address"
                required
              />
            </div>

            <div className="form-group">
              <label>Role Update Type</label>
              <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    value="project"
                    checked={updateType === "project"}
                    onChange={() => setUpdateType("project")}
                  />
                  This Project Only
                  <span style={{ fontSize: '11px', color: '#8888aa', marginLeft: '4px' }}>
                    ({currentProject || 'Current Project'})
                  </span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    value="global"
                    checked={updateType === "global"}
                    onChange={() => setUpdateType("global")}
                  />
                  All Projects
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>
                {updateType === "project" 
                  ? `Role in ${currentProject || 'this project'}` 
                  : "Global Role (All Projects)"}
              </label>
              <select
                value={editedUser.role}
                onChange={(e) =>
                  setEditedUser({ ...editedUser, role: e.target.value })
                }
              >
                <option value="Developer">Developer</option>
                <option value="Supervisor">Supervisor</option>
                <option value="Admin">Admin</option>
              </select>
              {updateType === "project" && (
                <p style={{ fontSize: '12px', color: '#8888aa', marginTop: '4px' }}>
                  Only changes the role for {currentProject || 'this project'}
                </p>
              )}
              {updateType === "global" && (
                <p style={{ fontSize: '12px', color: '#ff6b6b', marginTop: '4px' }}>
                  ⚠️ Changes role for ALL projects
                </p>
              )}
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                value={editedUser.status}
                onChange={(e) =>
                  setEditedUser({ ...editedUser, status: e.target.value })
                }
              >
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
                <option value="Left">Left</option>
              </select>
            </div>

            {error && (
              <div className="error-message" style={{ color: '#dc3545', marginTop: '8px' }}>
                {error}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="cancel-btn"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="create-btn"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUser;