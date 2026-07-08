// components/UserManagement.tsx - Fixed for JSONB roles

import React, { useState } from "react";
import { Edit3, Trash2, X, Plus } from "lucide-react";
import EditUser from "./EditUser";
import { formatDate } from "../utils/dateUtils";
import "./UserManagement.css";
import { ViewMode, User, Project } from "../types/models";
import { dataService } from "../lib/dataService";
import { auth } from "../lib/supabase";
// ✅ Import role utilities
import {
  getPrimaryRole,
  getRoleDisplayName,
  getRoleBadgeClass,
  getRolePriority
} from "../utils/roleUtils";


interface UserManagementProps {
  view: ViewMode;
  project: string;
  users: User[];
  projectsData: Project[];
  onUsersUpdate: (updatedUsers: User[]) => void;
  onProjectsUpdate: (updatedProjects: Project[]) => void;
  isAdmin?: boolean;
}

// ✅ Extended user type with proper typing
interface ExtendedUser extends User {
  memberships?: Array<{ projectName: string; role: string }>;
  allRoles?: string[];
  allMemberships?: Array<{ projectName: string; role: string }>;
}

const UserManagement: React.FC<UserManagementProps> = ({
  view,
  project,
  users,
  projectsData,
  onUsersUpdate,
  onProjectsUpdate,
  isAdmin = false,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "Developer",
    status: "Active",
    project: "",
  });

  const [searchTerm] = useState("");
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [addRole, setAddRole] = useState<"Developer" | "Supervisor">(
    "Developer",
  );
  const [, setAddTargetProject] = useState<string>("");

  const isSupervisor = view === "supervisor";
  const isAllProjects = project === "All Projects";

  const projects = projectsData.map((p) => p.name);

  // Get users that have access to the current project
  const getProjectUsers = (): ExtendedUser[] => {
    if (isAllProjects) {
      return users.map((user) => {
        // Get all memberships for this user
        const memberships = projectsData
          .map((p) => ({
            projectName: p.name,
            role: p.teamMembers.find((m) => m.id === user.id)?.role || null,
          }))
          .filter((m): m is { projectName: string; role: string } => m.role !== null);

        // ✅ Get UNIQUE roles from memberships using getPrimaryRole
        const rolesFromMemberships = Array.from(
          new Set(memberships.map((m) => getPrimaryRole(m.role)))
        );

        // ✅ Only add user.role if it's not already in the list
        let allRoles = [...rolesFromMemberships];
        if (user.role) {
          const primaryRole = getPrimaryRole(user.role);
          if (!allRoles.includes(primaryRole)) {
            allRoles.push(primaryRole);
          }
        }

        // ✅ If no roles found, default to ['developer']
        if (allRoles.length === 0) {
          allRoles = ['developer'];
        }

        return {
          ...user,
          memberships,
          allRoles: allRoles,
        };
      });
    }

    const currentProject = projectsData.find((p) => p.name === project);
    if (!currentProject) return [];

    const memberIds = currentProject.teamMembers.map((m) => m.id);
    const projectUsers = users.filter((u) => memberIds.includes(u.id));

    return projectUsers.map((user) => {
      const member = currentProject.teamMembers.find((m) => m.id === user.id);

      // Get all memberships across all projects
      const allMemberships = projectsData
        .map((p) => ({
          projectName: p.name,
          role: p.teamMembers.find((m) => m.id === user.id)?.role || null,
        }))
        .filter((m): m is { projectName: string; role: string } => m.role !== null);

      // ✅ Get UNIQUE roles from all memberships using getPrimaryRole
      const rolesFromMemberships = Array.from(
        new Set(allMemberships.map((m) => getPrimaryRole(m.role)))
      );

      // ✅ Only add user.role if it's not already in the list
      let allRoles = [...rolesFromMemberships];
      if (user.role) {
        const primaryRole = getPrimaryRole(user.role);
        if (!allRoles.includes(primaryRole)) {
          allRoles.push(primaryRole);
        }
      }

      // ✅ If no roles found, default to ['developer']
      if (allRoles.length === 0) {
        allRoles = ['developer'];
      }

      return {
        ...user,
        role: member?.role || user.role || 'Developer',
        project: project,
        allRoles: allRoles,
        allMemberships: allMemberships,
      };
    });
  };

  // ✅ FIXED: Use getRolePriority from roleUtils
  const rolePriority = (role: any): number => {
    return getRolePriority(role);
  };

  const filteredUsers = getProjectUsers()
    .filter(
      (user) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .sort((a, b) => {
      const roleDiff = rolePriority(a.role) - rolePriority(b.role);
      if (roleDiff !== 0) return roleDiff;
      return a.name.localeCompare(b.name);
    });

  // ✅ Helper function to format role display

  const handleCreateUser = async () => {
    if (!isAdmin) {
      alert("Only admins can create new users.");
      return;
    }

    const trimmedName = newUser.name.trim();
    const trimmedEmail = newUser.email.trim().toLowerCase();
    const trimmedPassword = newUser.password;

    if (!trimmedName || !trimmedEmail || !trimmedPassword) {
      alert("Please complete name, email, and password fields.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmedEmail)) {
      alert("Please enter a valid email address.");
      return;
    }

    const projectObj = newUser.project
      ? projectsData.find((p) => p.name === newUser.project)
      : null;

    if (newUser.project && !projectObj) {
      alert("Selected project not found.");
      return;
    }

    setIsCreating(true);

    try {
      console.log("📝 Creating/Checking user:", trimmedEmail);

      let authUserId: string;
      let isExistingUser = false;

      // First, try to sign up
      try {
        const signUpResult = await auth.signUp(trimmedEmail, trimmedPassword, {
          full_name: trimmedName,
          role: newUser.role.toLowerCase(),
        });
        console.log("✅ Auth user created:", signUpResult);

        if (signUpResult.user?.id) {
          authUserId = signUpResult.user.id;
        } else {
          throw new Error("No user ID returned from sign up");
        }
      } catch (signUpError: any) {
        // If user already exists, try to sign in
        if (signUpError.message?.includes("already registered") ||
          signUpError.message?.includes("User already registered")) {
          console.log("👤 User already exists, attempting to sign in...");

          try {
            const signInResult = await auth.signIn(trimmedEmail, trimmedPassword);
            if (signInResult.user?.id) {
              authUserId = signInResult.user.id;
              isExistingUser = true;
              console.log("✅ Existing user found:", authUserId);
            } else {
              throw new Error("Could not get existing user ID.");
            }
          } catch (signInError) {
            console.error("❌ Error signing in existing user:", signInError);
            throw new Error("User exists but could not be authenticated. Please check your password.");
          }
        } else {
          throw signUpError;
        }
      }

      // Create or update profile
      const createdProfile = await dataService.createUserProfile({
        id: authUserId,
        name: trimmedName,
        email: trimmedEmail,
        role: newUser.role.toLowerCase(),
        status: newUser.status.toLowerCase(),
      });

      console.log("✅ Profile created/updated:", createdProfile);

      if (!createdProfile) {
        throw new Error("Could not create or update user profile");
      }

      // IMPORTANT: Add to project if specified
      if (projectObj) {
        console.log(`📝 Adding user ${trimmedName} to project ${projectObj.name} with role ${newUser.role}`);

        // Check if user is already in the project
        const isMember = projectObj.teamMembers.some(m => m.id === authUserId);

        if (!isMember) {
          // Add to team_members with the correct role
          await dataService.addTeamMember(projectObj.id, authUserId, newUser.role);
          console.log(`✅ User added to project: ${projectObj.name} with role ${newUser.role}`);
        } else {
          console.log(`ℹ️ User is already a member of ${projectObj.name}`);
        }
      } else {
        console.log("ℹ️ No project selected, user added to system only");
      }

      // Refresh data from database
      const [refreshedProjects, refreshedUsers] = await Promise.all([
        dataService.getAllProjects(),
        dataService.getAllUsers(),
      ]);

      console.log("✅ Refreshed projects:", refreshedProjects.length);
      console.log("✅ Refreshed users:", refreshedUsers.length);

      onProjectsUpdate(refreshedProjects);
      onUsersUpdate(refreshedUsers);

      // Reset form
      setNewUser({
        name: "",
        email: "",
        password: "",
        role: "Developer",
        status: "Active",
        project: "",
      });
      setShowCreateModal(false);
      setIsCreating(false);

      const message = isExistingUser
        ? `✅ User "${trimmedName}" already exists and has been updated!`
        : `✅ User "${trimmedName}" created successfully!`;
      alert(message);
    } catch (error: any) {
      console.error("❌ Error creating user:", error);

      let errorMessage = "Failed to create user. ";
      if (error.message?.includes("duplicate key")) {
        errorMessage += "This email is already registered.";
      } else if (error.message?.includes("invalid")) {
        errorMessage += "Please check the email format.";
      } else {
        errorMessage += error.message || "Please try again.";
      }

      alert(errorMessage);
      setIsCreating(false);
    }
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  React.useEffect(() => {
    if (!selectedUser) return;
    const latest = users.find((u) => u.id === selectedUser.id);
    if (
      latest &&
      (latest.name !== selectedUser.name ||
        latest.email !== selectedUser.email ||
        latest.role !== selectedUser.role ||
        latest.project !== selectedUser.project)
    ) {
      setSelectedUser(latest);
    }
  }, [users, selectedUser]);

  const handleSaveUser = async (updatedUser: User) => {
    try {
      console.log("💾 Saving user:", updatedUser);

      await dataService.updateUser(updatedUser.id, {
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status,
      });

      if (project && project !== "All Projects") {
        const projectObj = projectsData.find((p) => p.name === project);
        if (projectObj) {
          await dataService.updateTeamMemberRole(
            projectObj.id,
            updatedUser.id,
            updatedUser.role || "Developer",
          );
          console.log(`✅ Role updated for project ${project} only`);
        }
      }

      const [finalProjects, finalUsers] = await Promise.all([
        dataService.getAllProjects(),
        dataService.getAllUsers(),
      ]);

      onProjectsUpdate(finalProjects);
      onUsersUpdate(finalUsers);

      console.log("🔍 Debug - After update:");
      console.log("Updated user:", updatedUser);
      console.log("Current project:", project);
      console.log("All projects:", finalProjects);
      console.log("All users:", finalUsers);

      setShowEditModal(false);
      setSelectedUser(null);

      alert("✅ User updated successfully!");
    } catch (error) {
      console.error("Error saving user:", error);
      alert("Failed to update user. Please try again.");
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedUser(null);
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete || isDeleting) return;

    setIsDeleting(true);
    try {
      console.log(`🗑️ Deleting user: ${userToDelete.name} (${userToDelete.id})`);
      console.log(`⚠️ This will remove the user from ALL projects!`);

      await dataService.deleteUser(userToDelete.id);

      const [refreshedProjects, refreshedUsers] = await Promise.all([
        dataService.getAllProjects(),
        dataService.getAllUsers(),
      ]);

      onProjectsUpdate(refreshedProjects);
      onUsersUpdate(refreshedUsers);

      setShowDeleteModal(false);
      setUserToDelete(null);

      alert(
        `✅ User "${userToDelete.name}" has been permanently deleted from ALL projects.`,
      );
    } catch (error) {
      console.error("❌ Error deleting user:", error);
      alert("Failed to delete user. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setUserToDelete(null);
  };

  const handleAddUserToProject = async (
    user: ExtendedUser,
    role: "Developer" | "Supervisor",
    targetProject?: string,
  ) => {
    const projectName = targetProject || project;
    if (!projectName || projectName === "All Projects") return;

    try {
      const projectObj = projectsData.find((p) => p.name === projectName);
      if (!projectObj) return;

      await dataService.addTeamMember(projectObj.id, user.id, role);

      const refreshedProjects = await dataService.getAllProjects();
      const refreshedUsers = await dataService.getAllUsers();

      onProjectsUpdate(refreshedProjects);
      onUsersUpdate(refreshedUsers);
    } catch (error) {
      console.error("Error adding user to project:", error);
      alert("Failed to add user to project.");
    } finally {
      setAddingUserId(null);
      setAddTargetProject("");
    }
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
          </div>
          {isAdmin && (
            <button
              className="create-user-btn"
              onClick={() => setShowCreateModal(true)}
            >
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
                <th>Status</th>
                <th>Project Role / Access</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user: ExtendedUser) => {
                const proj = projectsData.find((p) => p.name === project);
                const member = proj?.teamMembers.find((m) => m.id === user.id);

                const memberships = isAllProjects
                  ? projectsData
                    .map((pd) => ({
                      projectName: pd.name,
                      member: pd.teamMembers.find((m) => m.id === user.id),
                    }))
                    .filter((x) => x.member)
                  : [];

                // ✅ Get UNIQUE roles for this user using getAllRoles
                const allRoles = user.allRoles || [getPrimaryRole(user.role) || 'developer'];
                const uniqueRoles = Array.from(new Set(allRoles));
                const hasMultipleRolesFlag = uniqueRoles.length > 1;

                // ✅ Format role names for display
                const displayRoles = uniqueRoles.map((r: string) => getRoleDisplayName(r));

                return (
                  <tr key={user.id}>
                    <td className="user-name-cell">
                      <div className="user-avatar">{user.name.charAt(0)}</div>
                      <div>
                        <div>{user.name}</div>
                        {/* ✅ ONLY show green indicator if user has multiple UNIQUE roles */}
                        {hasMultipleRolesFlag && (
                          <div className="multiple-roles-indicator">
                            <span className="green-dot"></span>
                            <span className="roles-text">
                              {displayRoles.join(' + ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>{formatDate(user.created)}</td>
                    <td>
                      <span
                        className={`status-badge status-${(user.status || "Active").toLowerCase()}`}
                      >
                        {user.status ? user.status : "Active"}
                      </span>
                    </td>
                    <td>
                      {isAllProjects ? (
                        memberships.length > 0 ? (
                          <div className="roles-container">
                            {memberships.map(({ projectName, member: m }) => (
                              <span
                                key={projectName}
                                className={`role-badge ${getRoleBadgeClass(m!.role || "Developer")}`}
                                title={projectName}
                              >
                                {getRoleDisplayName(m!.role || "Developer")} · {projectName}
                              </span>
                            ))}
                            {/* ✅ Only show "Also:" if multiple UNIQUE roles */}
                            {hasMultipleRolesFlag && (
                              <div className="global-roles">
                                <span className="global-roles-label">Also:</span>
                                {uniqueRoles.map((role: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className={`role-badge-small ${getRoleBadgeClass(role)}`}
                                  >
                                    {getRoleDisplayName(role)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="no-access-text">No access</span>
                        )
                      ) : member ? (
                        <div>
                          <span
                            className={`role-badge ${getRoleBadgeClass(member.role || "Developer")}`}
                          >
                            {getRoleDisplayName(member.role || "Developer")} · {project}
                          </span>
                          {/* ✅ Only show other roles if multiple UNIQUE roles */}
                          {hasMultipleRolesFlag && (
                            <div className="global-roles" style={{ marginTop: '4px' }}>
                              <span className="global-roles-label">Also:</span>
                              {uniqueRoles
                                .filter((r: string) => getPrimaryRole(r) !== getPrimaryRole(member.role))
                                .map((role: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className={`role-badge-small ${getRoleBadgeClass(role)}`}
                                  >
                                    {getRoleDisplayName(role)}
                                  </span>
                                ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="no-access">
                          <span className="no-access-text">No access</span>
                          {/* ✅ Only show global roles if multiple UNIQUE roles */}
                          {hasMultipleRolesFlag && (
                            <div className="global-roles" style={{ marginTop: '4px' }}>
                              <span className="global-roles-label">Global:</span>
                              {uniqueRoles.map((role: string, idx: number) => (
                                <span
                                  key={idx}
                                  className={`role-badge-small ${getRoleBadgeClass(role)}`}
                                >
                                  {getRoleDisplayName(role)}
                                </span>
                              ))}
                            </div>
                          )}
                          {isSupervisor && (
                            <div className="add-inline">
                              {addingUserId === user.id ? (
                                <>
                                  <select
                                    value={addRole}
                                    onChange={(e) =>
                                      setAddRole(
                                        e.target.value as
                                          | "Developer"
                                          | "Supervisor",
                                      )
                                    }
                                  >
                                    <option value="Developer">Developer</option>
                                    <option value="Supervisor">
                                      Supervisor
                                    </option>
                                  </select>
                                  <button
                                    className="confirm-add"
                                    onClick={() => {
                                      handleAddUserToProject(user, addRole);
                                    }}
                                  >
                                    Add
                                  </button>
                                  <button
                                    className="cancel-add"
                                    onClick={() => setAddingUserId(null)}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <button
                                  className="add-icon-btn"
                                  onClick={() => {
                                    setAddingUserId(user.id);
                                    setAddRole("Developer");
                                    setAddTargetProject("");
                                  }}
                                  title="Add to project"
                                >
                                  <Plus size={14} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
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
        <div
          className="modal-overlay"
          onClick={() => setShowCreateModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleCreateUserSubmit}>
              <div className="modal-header">
                <h3>Create & Invite User</h3>
                <button
                  className="close-btn"
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                >
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
                    onChange={(e) =>
                      setNewUser({ ...newUser, name: e.target.value })
                    }
                    placeholder="Enter full name"
                    required
                    disabled={isCreating}
                  />
                </div>

                <div className="form-group">
                  <label>
                    Email <span className="required">*</span>
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                    placeholder="Enter email address"
                    required
                    disabled={isCreating}
                  />
                </div>

                <div className="form-group">
                  <label>
                    Password <span className="required">*</span>
                  </label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                    placeholder="Enter password (min 6 characters)"
                    required
                    minLength={6}
                    disabled={isCreating}
                  />
                </div>

                <div className="form-group">
                  <label>Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({ ...newUser, role: e.target.value })
                    }
                    disabled={isCreating}
                  >
                    <option value="Developer">Developer</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={newUser.status}
                    onChange={(e) =>
                      setNewUser({ ...newUser, status: e.target.value })
                    }
                    disabled={isCreating}
                  >
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Left">Left</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Assign to Project (optional)</label>
                  <select
                    value={newUser.project}
                    onChange={(e) =>
                      setNewUser({ ...newUser, project: e.target.value })
                    }
                    disabled={isCreating}
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
                <button
                  className="cancel-btn"
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreating}
                >
                  CANCEL
                </button>
                <button
                  className="create-btn"
                  type="submit"
                  disabled={
                    !newUser.name ||
                    !newUser.email ||
                    !newUser.password ||
                    newUser.password.length < 6 ||
                    isCreating
                  }
                >
                  {isCreating ? "Creating..." : "Create & Invite"}
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
        currentProject={isAllProjects ? undefined : project}
      />

      {/* Delete User Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <div className="modal-overlay" onClick={handleCancelDelete}>
          <div
            className="modal delete-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Delete User</h3>
              <button className="close-btn" onClick={handleCancelDelete}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: "center", padding: "8px 0" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
                <h4 style={{ margin: "0 0 8px 0", color: "#1a1a2e" }}>
                  Are you sure you want to delete this user?
                </h4>
                <p style={{ color: "#666", margin: "0 0 4px 0" }}>
                  <strong>{userToDelete.name}</strong>
                </p>
                <p style={{ color: "#8888aa", fontSize: "14px", margin: "0" }}>
                  {userToDelete.email}
                </p>
                <div
                  style={{
                    marginTop: "16px",
                    padding: "12px",
                    background: "#fff3f3",
                    borderRadius: "6px",
                    border: "1px solid #ffcdd2",
                    color: "#d32f2f",
                    fontSize: "13px",
                  }}
                >
                  This action cannot be undone. All user data will be
                  permanently removed.
                </div>
              </div>
            </div>
            <div
              className="modal-footer"
              style={{ borderTop: "1px solid #eef0f5" }}
            >
              <button className="cancel-btn" onClick={handleCancelDelete}>
                CANCEL
              </button>
              <button
                className="delete-btn-modal"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{
                  padding: "10px 24px",
                  background: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: isDeleting ? "not-allowed" : "pointer",
                  transition: "all 0.3s",
                  letterSpacing: "0.5px",
                  opacity: isDeleting ? 0.7 : 1,
                }}
              >
                {isDeleting ? "Deleting..." : "Delete User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;