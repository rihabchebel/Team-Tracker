// components/PerformanceDashboard.tsx
import React, { useState, useEffect } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Users,
  BarChart3,
  X,
  UserPlus,
  Clock,
  Calendar,
} from "lucide-react";
import { supabase } from "../lib/dataService";
import "./PerformanceDashboard.css";
import {
  ViewMode,
  User,
  Project,
  LogEntry,
  UserActivity,
  ProjectTimelineEvent,
} from "../types/models";
import { formatDate, formatDateLong } from "../utils/dateUtils";
import { adminAuth } from "@/lib/supabase";

type MemberStatus = "Active" | "Left" | "On Leave";

type DashboardMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  memberSince: string;
  activeHours: number;
  status: MemberStatus;
  joined: string;
  left?: string;
  memberships?: { projectName: string; role: string }[];
};

interface ProjectData {
  id: string;
  name: string;
  description: string;
  budget: number;
  hoursSpent: number;
  teamMembers: DashboardMember[];
}

interface PerformanceDashboardProps {
  view: ViewMode;
  project: string;
  users: User[];
  projectsData: Project[];
  taskLogs?: LogEntry[];
  userActivity?: UserActivity[];
  timelineEvents?: ProjectTimelineEvent[];
  onProjectsUpdate?: (projects: Project[]) => void;
  onProjectSelect?: (project: string) => void;
  isAdmin?: boolean;
}

interface HeatmapDetailData {
  noteKey: string;
  memberName: string;
  date: string;
  hoursWorked: number;
  tasksCompleted: string[];
  supervisorNotes: string;
  addedSupervisorNotes: string[];
  newSupervisorNote: string;
  status: "full" | "partial" | "unavailable" | "no-log";
  role: string;
}

// ============================================
// HELPER: Get role badge class
// ============================================
const getRoleBadgeClass = (role: string): string => {
  const roleMap: Record<string, string> = {
    supervisor: "role-supervisor",
    developer: "role-developer",
    guest: "role-guest",
    admin: "role-admin",
    "project manager": "role-project-manager",
    "project-manager": "role-project-manager",
    pm: "role-pm",
    lead: "role-lead",
    "team lead": "role-team-lead",
    "team-lead": "role-team-lead",
    designer: "role-designer",
    "ui/ux": "role-ui-ux",
    "ui-ux": "role-ui-ux",
    qa: "role-qa",
    tester: "role-tester",
    devops: "role-devops",
    analyst: "role-analyst",
    "business analyst": "role-business-analyst",
    "business-analyst": "role-business-analyst",
    contractor: "role-contractor",
    intern: "role-intern",
    consultant: "role-consultant",
  };

  const normalizedRole = role?.toLowerCase() || "developer";
  return roleMap[normalizedRole] || "role-developer";
};

// ============================================
// HELPER: Get role display name
// ============================================
const getRoleDisplayName = (role: string): string => {
  const displayMap: Record<string, string> = {
    supervisor: "Supervisor",
    developer: "Developer",
    guest: "Guest",
    admin: "Admin",
    "project manager": "Project Manager",
    "project-manager": "Project Manager",
    pm: "Project Manager",
    lead: "Team Lead",
    "team lead": "Team Lead",
    "team-lead": "Team Lead",
    designer: "Designer",
    "ui/ux": "UI/UX Designer",
    "ui-ux": "UI/UX Designer",
    qa: "QA Engineer",
    tester: "Tester",
    devops: "DevOps Engineer",
    analyst: "Analyst",
    "business analyst": "Business Analyst",
    "business-analyst": "Business Analyst",
    contractor: "Contractor",
    intern: "Intern",
    consultant: "Consultant",
  };

  const normalizedRole = role?.toLowerCase() || "developer";
  return displayMap[normalizedRole] || role || "Developer";
};

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  view,
  project,
  users,
  projectsData,
  taskLogs = [],
  userActivity = [],
  timelineEvents = [],
  onProjectsUpdate,
  onProjectSelect,
  isAdmin = false,
}) => {
  const [activeTab, setActiveTab] = useState<
    "heatmap" | "roster" | "analytics"
  >("roster");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<string>("All Users");
  const [selectedProjectFilter, setSelectedProjectFilter] =
    useState<string>("All Projects");
  const [roleFilter, setRoleFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [sortField, setSortField] = useState<keyof DashboardMember>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedCell, setSelectedCell] = useState<HeatmapDetailData | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [addedSupervisorNotesByCell, setAddedSupervisorNotesByCell] = useState<
    Record<string, string[]>
  >({});
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    role: "Developer",
  });
  const [isLoading, setIsLoading] = useState(false);

  const isAll = project === "All Projects";

  useEffect(() => {
    console.log("PerformanceDashboard: Project changed to:", project);
  }, [project]);

  // Helper functions
  const hashString = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  };

  const randFromSeed = (seed: number) => {
    const a = 9301,
      c = 49297,
      m = 233280;
    return ((seed * a + c) % m) / m;
  };

  const deriveEmail = (memberId: string, memberName: string) => {
    const user = users.find((u) => u.id === memberId);
    if (user?.email) return user.email;
    return `${memberName.toLowerCase().replace(/\s+/g, ".")}@example.com`;
  };

  const deriveMemberSince = (memberId: string, joined: string) => {
    const user = users.find((u) => u.id === memberId);
    if (user?.created) return user.created;
    return joined;
  };

  const deriveStatus = (
    member: Project["teamMembers"][number],
  ): MemberStatus => {
    if (member.left) return "Left";

    const explicitStatus = (member as any)?.status;
    if (explicitStatus) {
      const s = String(explicitStatus).toLowerCase();
      if (s === "left") return "Left";
      if (s === "on leave" || s === "on_leave" || s === "onleave")
        return "On Leave";
      return "Active";
    }

    return "Active";
  };

  const deriveActiveHours = (
    member: Project["teamMembers"][number],
    status: string,
  ) => {
    if (status === "Left" || member.left) return 0;
    const role = member.role?.toLowerCase() || "developer";
    const seed = hashString(`${member.id}|hours|${project}`);
    const base = role === "supervisor" || role === "admin" ? 36 : 28;
    const variation = Math.floor(randFromSeed(seed) * 18);
    return base + variation;
  };

  // Build project data
  const dashboardProject = projectsData.find((p) => p.name === project);
  const defaultProject = projectsData[0] || null;
  const currentProjectData = dashboardProject || defaultProject;

  let dashboardTeamMembers: DashboardMember[] = [];
  let projectData: ProjectData = {
    id: currentProjectData?.id || "0",
    name: currentProjectData?.name || "Unknown Project",
    description: currentProjectData?.description || "No description available",
    budget: currentProjectData?.totalHours || 0,
    hoursSpent: currentProjectData?.usedHours || 0,
    teamMembers: [],
  };

  if (isAll) {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        email: string;
        memberSince: string;
        memberships: { projectName: string; role: string }[];
      }
    >();

    users.forEach((u) => {
      map.set(u.id, {
        id: u.id,
        name: u.name,
        email: u.email || "",
        memberSince: u.created || "",
        memberships: [],
      });
    });

    projectsData.forEach((p) => {
      p.teamMembers.forEach((m) => {
        const entry = map.get(m.id);
        if (entry) {
          entry.memberships.push({
            projectName: p.name,
            role: m.role || "Developer",
          });
        } else {
          map.set(m.id, {
            id: m.id,
            name: m.name,
            email: deriveEmail(m.id, m.name),
            memberSince: deriveMemberSince(m.id, m.joined),
            memberships: [{ projectName: p.name, role: m.role || "Developer" }],
          });
        }
      });
    });

    dashboardTeamMembers = Array.from(map.values()).map((entry) => ({
      id: entry.id,
      name: entry.name,
      email: entry.email,
      role: entry.memberships[0]?.role || "Developer",
      memberSince: entry.memberSince,
      activeHours: 0,
      status: "Active" as MemberStatus,
      memberships: entry.memberships,
      joined: entry.memberSince,
    }));

    projectData = {
      id: "all",
      name: "All Projects",
      description: "Overview of all projects and team members",
      budget: projectsData.reduce((sum, p) => sum + p.totalHours, 0),
      hoursSpent: projectsData.reduce((sum, p) => sum + p.usedHours, 0),
      teamMembers: dashboardTeamMembers,
    };
  } else {
    dashboardTeamMembers = (currentProjectData?.teamMembers || []).map(
      (member) => {
        const status = deriveStatus(member);
        return {
          id: member.id,
          name: member.name,
          email: deriveEmail(member.id, member.name),
          role: member.role,
          memberSince: deriveMemberSince(member.id, member.joined),
          activeHours: deriveActiveHours(member, status),
          status: status,
          joined: member.joined,
          left: member.left,
        };
      },
    );

    projectData = {
      id: currentProjectData?.id || "0",
      name: currentProjectData?.name || "Unknown Project",
      description:
        currentProjectData?.description || "No description available",
      budget: currentProjectData?.totalHours || 0,
      hoursSpent: currentProjectData?.usedHours || 0,
      teamMembers: dashboardTeamMembers,
    };
  }

  const { teamMembers, budget, hoursSpent } = projectData;
  const projectTaskLogs = taskLogs.filter((log) =>
    isAll
      ? true
      : log.project === project || log.projectId === currentProjectData?.id,
  );
  const projectActivities = userActivity.filter((activity) =>
    isAll
      ? true
      : activity.project_name === project ||
        activity.project_id === currentProjectData?.id,
  );
  const projectTimeline = timelineEvents.filter((event) =>
    isAll
      ? true
      : event.project_name === project ||
        event.project_id === currentProjectData?.id,
  );
  const heatmapDates = Array.from({ length: 30 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - index));
    return date.toISOString().split("T")[0];
  });

  const getAvailableUsers = () => {
    const userSet = new Set(teamMembers.map((m) => m.name));
    return ["All Users", ...Array.from(userSet)];
  };

  const getAvailableProjects = () => {
    if (isAll) {
      return ["All Projects", ...projectsData.map((p) => p.name)];
    }
    return ["All Projects", project];
  };

  const rolePriority = (role: string) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return 0;
      case "supervisor":
        return 1;
      case "developer":
        return 2;
      default:
        return 3;
    }
  };

  const sortByRolePriority = (a: DashboardMember, b: DashboardMember) => {
    return rolePriority(a.role) - rolePriority(b.role);
  };

  const filteredMembers = teamMembers
    .filter((member) => {
      const matchesSearch =
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesUser =
        selectedUser === "All Users" || member.name === selectedUser;

      let matchesProject = true;
      if (selectedProjectFilter !== "All Projects") {
        if (isAll) {
          matchesProject =
            member.memberships?.some(
              (m) => m.projectName === selectedProjectFilter,
            ) || false;
        } else {
          matchesProject = project === selectedProjectFilter;
        }
      }

      const matchesRole = roleFilter === "All" || member.role === roleFilter;
      const matchesStatus =
        statusFilter === "All" || member.status === statusFilter;

      return (
        matchesSearch &&
        matchesUser &&
        matchesProject &&
        matchesRole &&
        matchesStatus
      );
    })
    .sort((a, b) => {
      const roleDiff = sortByRolePriority(a, b);
      if (roleDiff !== 0) return roleDiff;

      const aValue = a[sortField as keyof DashboardMember] || "";
      const bValue = b[sortField as keyof DashboardMember] || "";
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }
      return 0;
    });

  const handleSort = (field: keyof DashboardMember) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Active":
        return "status-active";
      case "Left":
        return "status-left";
      case "On Leave":
        return "status-on-leave";
      default:
        return "";
    }
  };

  const getInitials = (name: string) => {
    return name.charAt(0);
  };

  const getSortIcon = (field: keyof DashboardMember) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp size={14} />
    ) : (
      <ChevronDown size={14} />
    );
  };

  const budgetPercentage =
    budget > 0 ? Math.round((hoursSpent / budget) * 100) : 0;

  const totalLoggedHours = projectTaskLogs.reduce(
    (sum, log) => sum + (log.hoursWorked || 0),
    0,
  );
  const completionPercentage =
    budget > 0 ? Math.min(100, Math.round((hoursSpent / budget) * 100)) : 0;
  const productivityByUser = teamMembers
    .map((member) => {
      const memberHours = projectTaskLogs
        .filter((log) => log.submittedById === member.id)
        .reduce((sum, log) => sum + (log.hoursWorked || 0), 0);
      return { member, hours: memberHours };
    })
    .sort((a, b) => b.hours - a.hours);

  // Heatmap functions
  const getCellStatus = (
    member: DashboardMember,
    dayIndex: number,
  ): "full" | "partial" | "unavailable" | "no-log" => {
    if (member.activeHours === 0 || member.status === "Left") {
      return "no-log";
    }
    const targetDate = heatmapDates[dayIndex];
    const log = projectTaskLogs.find(
      (entry) => entry.submittedById === member.id && entry.date === targetDate,
    );
    if (!log) return "no-log";
    return log.status;
  };

  const getHoursForStatus = (
    member: DashboardMember,
    dayIndex: number,
  ): number => {
    const targetDate = heatmapDates[dayIndex];
    const log = projectTaskLogs.find(
      (entry) => entry.submittedById === member.id && entry.date === targetDate,
    );
    return log?.hoursWorked || 0;
  };

  const getTasksForStatus = (
    member: DashboardMember,
    dayIndex: number,
  ): string[] => {
    const targetDate = heatmapDates[dayIndex];
    const log = projectTaskLogs.find(
      (entry) => entry.submittedById === member.id && entry.date === targetDate,
    );
    return (log?.tasks || []).map((task) => task.description);
  };

  const getSupervisorNotes = (
    status: string,
    member: DashboardMember,
    dayIndex: number,
  ): string => {
    const targetDate = heatmapDates[dayIndex];
    const note = projectTimeline.find((event) => {
      const created = event.created_at.split("T")[0];
      const matchesUser = event.user_id ? event.user_id === member.id : true;
      return created === targetDate && matchesUser;
    });

    if (note) return note.description;

    if (status === "no-log") return "No logs available for this day.";
    if (status === "partial") return "Partial availability logged.";
    if (status === "unavailable") return "Unavailable for this day.";
    return "Logged activity recorded.";
  };

  const handleCellClick = (
    member: DashboardMember,
    dayIndex: number,
    status: "full" | "partial" | "unavailable" | "no-log",
  ) => {
    const hoursWorked = getHoursForStatus(member, dayIndex);
    const tasksCompleted = getTasksForStatus(member, dayIndex);
    const noteKey = `${project}|${member.id}|${dayIndex}`;
    const supervisorNotes = getSupervisorNotes(status, member, dayIndex);
    const addedSupervisorNotes = addedSupervisorNotesByCell[noteKey] ?? [];

    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() - (29 - dayIndex));

    const formattedDate = formatDateLong(targetDate.toISOString());

    const detailData: HeatmapDetailData = {
      noteKey,
      memberName: member.name,
      date: formattedDate,
      hoursWorked,
      tasksCompleted,
      supervisorNotes,
      addedSupervisorNotes,
      newSupervisorNote: "",
      status,
      role: member.role,
    };

    setSelectedCell(detailData);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCell(null);
  };

  const handleNewSupervisorNoteChange = (note: string) => {
    setSelectedCell((current) =>
      current ? { ...current, newSupervisorNote: note } : current,
    );
  };

  const handleAddSupervisorNote = () => {
    if (!selectedCell || !selectedCell.newSupervisorNote.trim()) return;
    const note = selectedCell.newSupervisorNote.trim();
    const nextNotes = [...selectedCell.addedSupervisorNotes, note];
    setSelectedCell({
      ...selectedCell,
      addedSupervisorNotes: nextNotes,
      newSupervisorNote: "",
    });
    setAddedSupervisorNotesByCell((notes) => ({
      ...notes,
      [selectedCell.noteKey]: nextNotes,
    }));
  };

  // Add Member Handler

  const handleAddMember = async () => {
    if (!isAdmin) {
      alert("You do not have permission to add members.");
      return;
    }
    if (!newMember.name.trim() || !newMember.email.trim()) {
      alert("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      const currentProject = projectsData.find((p) => p.name === project);
      if (!currentProject) {
        alert("Project not found");
        return;
      }

      let userId: string;
      let isNewUser = false;

      // 1. CHECK IF USER EXISTS IN user_profiles
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from("user_profiles")
        .select("id, full_name, email")
        .eq("email", newMember.email)
        .maybeSingle();

      if (profileCheckError && profileCheckError.code !== "PGRST116") {
        console.error("Error checking existing profile:", profileCheckError);
        alert("Error checking user. Please try again.");
        return;
      }

      if (existingProfile) {
        userId = existingProfile.id;
        isNewUser = false;
        console.log("✅ User already exists:", existingProfile);
      } else {
        // 2. CREATE USER USING ADMIN API
        console.log("📝 Creating user via admin API...");

        // Generate a temporary password
        const tempPassword = Math.random().toString(36).slice(-8) + "A1!";

        try {
          // Create auth user
          const { user } = await adminAuth.createUser(
            newMember.email,
            tempPassword,
            {
              name: newMember.name,
              role: newMember.role.toLowerCase(),
            },
          );

          userId = user.id;
          isNewUser = true;
          console.log("✅ Auth user created:", userId);

          // Create user profile
          await adminAuth.createUserProfile(
            userId,
            newMember.name,
            newMember.email,
            newMember.role,
          );
          console.log("✅ User profile created");
        } catch (adminError: any) {
          console.error("❌ Admin API error:", adminError);

          // If user already exists in auth, try to get their ID
          if (adminError.message?.includes("already exists")) {
            const { data: existingAuth } = await supabase
              .from("auth.users")
              .select("id")
              .eq("email", newMember.email)
              .single();

            if (existingAuth) {
              userId = existingAuth.id;
              isNewUser = false;
            } else {
              throw new Error("User exists but could not be found.");
            }
          } else {
            throw adminError;
          }
        }
      }

      // 3. CHECK PROJECT MEMBERSHIP
      const { data: existingMember, error: memberCheckError } = await supabase
        .from("team_members")
        .select("id, role")
        .eq("project_id", currentProject.id)
        .eq("user_id", userId)
        .maybeSingle();

      if (memberCheckError && memberCheckError.code !== "PGRST116") {
        console.error("Error checking membership:", memberCheckError);
        alert("Error checking membership. Please try again.");
        return;
      }

      // 4. VALIDATE ROLE
      const validRoles = ["Supervisor", "Developer", "Admin"];
      const roleMap: Record<string, string> = {
        developer: "Developer",
        supervisor: "Supervisor",
        admin: "Admin",
      };

      const finalRole = roleMap[newMember.role.toLowerCase()] || "Developer";

      if (!validRoles.includes(finalRole)) {
        alert(`Invalid role. Please use one of: ${validRoles.join(", ")}`);
        return;
      }

      if (existingMember) {
        // Update role
        const { error: updateError } = await supabase
          .from("team_members")
          .update({
            role: finalRole,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingMember.id);

        if (updateError) {
          console.error("Error updating member role:", updateError);
          alert("Failed to update member role. Please try again.");
          return;
        }

        // Update local state
        const updatedProject = {
          ...currentProject,
          teamMembers: currentProject.teamMembers.map((m) =>
            m.id === userId ? { ...m, role: finalRole } : m,
          ),
        };

        const updatedProjects = projectsData.map((p) =>
          p.id === currentProject.id ? updatedProject : p,
        );

        if (onProjectsUpdate) {
          onProjectsUpdate(updatedProjects);
        }

        setNewMember({ name: "", email: "", role: "Developer" });
        setShowAddMember(false);
        alert(
          `${newMember.name}'s role has been updated to "${finalRole}" in ${currentProject.name}!`,
        );
        setIsLoading(false);
        return;
      }

      // 5. ADD NEW TEAM MEMBER
      const { error: teamError } = await supabase.from("team_members").insert({
        project_id: currentProject.id,
        user_id: userId,
        role: finalRole,
        joined_at: new Date().toISOString(),
      });

      if (teamError) {
        console.error("Error adding team member:", teamError);
        alert(`Failed to add member: ${teamError.message}`);
        return;
      }

      // Update local state
      const updatedProject = {
        ...currentProject,
        teamMembers: [
          ...currentProject.teamMembers,
          {
            id: userId,
            name: newMember.name,
            role: finalRole,
            joined: new Date().toLocaleDateString("en-GB"),
          },
        ],
      };

      const updatedProjects = projectsData.map((p) =>
        p.id === currentProject.id ? updatedProject : p,
      );

      if (onProjectsUpdate) {
        onProjectsUpdate(updatedProjects);
      }

      setNewMember({ name: "", email: "", role: "Developer" });
      setShowAddMember(false);

      const successMessage = isNewUser
        ? `${newMember.name} has been created and added to ${currentProject.name}!`
        : `${newMember.name} has been added to ${currentProject.name}!`;

      alert(successMessage);
    } catch (error: any) {
      console.error("Unexpected error:", error);
      alert(error.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectNameClick = (projectName: string) => {
    if (onProjectSelect) {
      onProjectSelect(projectName);
    }
  };

  if (!currentProjectData && !isAll) {
    return (
      <div className="performance-dashboard">
        <div className="page-header">
          <div className="page-header-content">
            <div>
              <h2>{project}</h2>
              {/* Description removed from error state too */}
            </div>
          </div>
        </div>
        <div className="dashboard-content">
          <p>No data available for this project.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="performance-dashboard">
      <div className="page-header">
        <div className="page-header-content">
          <div>
            <h2
              style={{ cursor: onProjectSelect ? "pointer" : "default" }}
              onClick={() => {
                if (!isAll && onProjectSelect) {
                  handleProjectNameClick(project);
                }
              }}
            >
              {project}
            </h2>
            {/* ❌ DESCRIPTION COMPLETELY REMOVED FROM HERE */}
          </div>
          {isAdmin && !isAll && (
            <button
              className="add-member-btn"
              onClick={() => setShowAddMember(true)}
            >
              <UserPlus size={16} />
              Add Member
            </button>
          )}
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-header">
          <h3>Performance Dashboard</h3>
          {!isAll && (
            <div className="dashboard-tabs">
              <button
                className={`tab-btn ${activeTab === "heatmap" ? "active" : ""}`}
                onClick={() => setActiveTab("heatmap")}
              >
                <Calendar size={14} />
                Heatmap
              </button>
              <button
                className={`tab-btn ${activeTab === "roster" ? "active" : ""}`}
                onClick={() => setActiveTab("roster")}
              >
                <Users size={14} />
                Team Roster
              </button>
              <button
                className={`tab-btn ${activeTab === "analytics" ? "active" : ""}`}
                onClick={() => setActiveTab("analytics")}
              >
                <BarChart3 size={14} />
                Analytics
              </button>
            </div>
          )}
        </div>

        {activeTab === "roster" && (
          <div className="roster-section">
            <div className="timeline-filters">
              <div className="filter-group">
                <label>User</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="filter-select"
                >
                  {getAvailableUsers().map((user) => (
                    <option key={user} value={user}>
                      {user}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>Project</label>
                <select
                  value={selectedProjectFilter}
                  onChange={(e) => setSelectedProjectFilter(e.target.value)}
                  className="filter-select"
                >
                  {getAvailableProjects().map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>Role</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="All">All Roles</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Developer">Developer</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Left">Left</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Search</label>
                <div className="search-box">
                  <Search size={16} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search members..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="table-container">
              <table className="roster-table">
                <thead>
                  <tr>
                    <th
                      onClick={() => handleSort("name")}
                      className="sortable-header"
                    >
                      Member {getSortIcon("name")}
                    </th>
                    <th
                      onClick={() => handleSort("email")}
                      className="sortable-header"
                    >
                      Email {getSortIcon("email")}
                    </th>
                    <th>Role / Projects</th>
                    <th
                      onClick={() => handleSort("memberSince")}
                      className="sortable-header"
                    >
                      Member Since {getSortIcon("memberSince")}
                    </th>
                    <th
                      onClick={() => handleSort("activeHours")}
                      className="sortable-header"
                    >
                      Active Hours {getSortIcon("activeHours")}
                    </th>
                    <th
                      onClick={() => handleSort("status")}
                      className="sortable-header"
                    >
                      Status {getSortIcon("status")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => (
                    <tr key={member.id}>
                      <td className="member-cell">
                        <div className="member-avatar">
                          {getInitials(member.name)}
                        </div>
                        {member.name}
                      </td>
                      <td>{member.email}</td>
                      <td>
                        {isAll && member.memberships ? (
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            {member.memberships.map((m) => (
                              <span
                                key={`${member.id}-${m.projectName}`}
                                className={`role-badge ${getRoleBadgeClass(m.role)}`}
                              >
                                {getRoleDisplayName(m.role)} · {m.projectName}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span
                            className={`role-badge ${getRoleBadgeClass(member.role)}`}
                          >
                            {getRoleDisplayName(member.role)}
                          </span>
                        )}
                      </td>
                      <td>{formatDate(member.memberSince)}</td>
                      <td>{member.activeHours}h</td>
                      <td>
                        <span
                          className={`status-badge ${getStatusBadgeClass(member.status)}`}
                        >
                          {member.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!isAll && activeTab === "heatmap" && (
          <div className="heatmap-section">
            <h4>Availability Heatmap (Last 30 Working Days)</h4>
            <div className="heatmap-placeholder">
              <div className="heatmap-members">
                {teamMembers.slice(0, 8).map((member) => (
                  <div key={member.id} className="heatmap-member">
                    <span className="member-name">
                      <span className="member-name-text">
                        {member.name}
                        {member.status === "Left" && (
                          <span className="member-status-left"> (left)</span>
                        )}
                      </span>
                      {member.role === "Supervisor" && (
                        <span className="member-role-badge supervisor-badge">
                          Supervisor
                        </span>
                      )}
                    </span>
                    <div className="heatmap-row">
                      {Array.from({ length: 30 }, (_, i) => {
                        const status = getCellStatus(member, i);
                        return (
                          <div
                            key={i}
                            className={`heatmap-cell ${status}`}
                            onClick={() => handleCellClick(member, i, status)}
                            title={`${member.name} - ${status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")}`}
                            style={{ cursor: "pointer" }}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="heatmap-legend">
                <span className="legend-label">Legend:</span>
                <span className="legend-item full">Full</span>
                <span className="legend-item partial">Partial</span>
                <span className="legend-item unavailable">Unavailable</span>
                <span className="legend-item no-log">No Log</span>
              </div>
            </div>
          </div>
        )}

        {!isAll && activeTab === "analytics" && (
          <div className="analytics-section">
            <div className="budget-section">
              <div className="budget-info">
                <span className="budget-label">Budget vs Hours Spent</span>
                <span className="budget-value">
                  <span className="hours-spent">{hoursSpent}h</span>
                  <span className="budget-separator">/</span>
                  <span className="budget-total">{budget}h</span>
                  <span className="budget-percentage">
                    ({budgetPercentage}%)
                  </span>
                </span>
              </div>
              <div className="budget-bar">
                <div
                  className="budget-bar-fill"
                  style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                />
              </div>
            </div>

            <div className="stats-grid" style={{ marginBottom: "16px" }}>
              <div className="stat-card">
                <div className="stat-card-header">
                  <div className="stat-info">
                    <span className="stat-name">Logged Hours</span>
                  </div>
                </div>
                <div className="stat-details">
                  <div className="stat-item">
                    <span className="stat-value">{totalLoggedHours}h</span>
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-card-header">
                  <div className="stat-info">
                    <span className="stat-name">Completion</span>
                  </div>
                </div>
                <div className="stat-details">
                  <div className="stat-item">
                    <span className="stat-value">{completionPercentage}%</span>
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-card-header">
                  <div className="stat-info">
                    <span className="stat-name">Activity Events</span>
                  </div>
                </div>
                <div className="stat-details">
                  <div className="stat-item">
                    <span className="stat-value">
                      {projectActivities.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <h4>Developer Stats</h4>
            <div className="stats-grid">
              {productivityByUser.map(({ member, hours }) => (
                <div key={member.id} className="stat-card">
                  <div className="stat-card-header">
                    <div className="stat-avatar">
                      {getInitials(member.name)}
                    </div>
                    <div className="stat-info">
                      <span className="stat-name">{member.name}</span>
                      <span
                        className={`role-badge ${getRoleBadgeClass(member.role)}`}
                        style={{ fontSize: "11px", padding: "2px 10px" }}
                      >
                        {getRoleDisplayName(member.role)}
                      </span>
                    </div>
                  </div>
                  <div className="stat-details">
                    <div className="stat-item">
                      <span className="stat-label">
                        <Clock size={12} />
                        Hours
                      </span>
                      <span className="stat-value">{hours}h</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">
                        <Calendar size={12} />
                        Since
                      </span>
                      <span className="stat-value">
                        {formatDate(member.memberSince)}
                      </span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Status</span>
                      <span
                        className={`stat-status ${member.status === "Active" ? "status-active" : "status-left"}`}
                      >
                        {member.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Heatmap Detail Modal */}
      {isModalOpen && selectedCell && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal heatmap-detail-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-header-info">
                <h3>{selectedCell.memberName}</h3>
                <span
                  className={`role-badge ${getRoleBadgeClass(selectedCell.role)}`}
                  style={{ fontSize: "11px", padding: "2px 12px" }}
                >
                  {getRoleDisplayName(selectedCell.role)}
                </span>
                <span className={`status-badge-small ${selectedCell.status}`}>
                  {selectedCell.status.charAt(0).toUpperCase() +
                    selectedCell.status.slice(1).replace("-", " ")}
                </span>
              </div>
              <button className="close-btn" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-item detail-date">
                <span className="detail-value">{selectedCell.date}</span>
              </div>

              <div className="detail-item detail-hours">
                <span className="detail-value hours-value-large">
                  {selectedCell.hoursWorked}
                </span>
                <span className="detail-label">hours worked</span>
              </div>

              <div className="detail-item detail-tasks">
                <span className="detail-label">Tasks Completed</span>
                <div className="task-tags">
                  {selectedCell.tasksCompleted.map((task, index) => (
                    <span key={index} className="task-tag">
                      {task}
                    </span>
                  ))}
                  {selectedCell.tasksCompleted.length === 0 && (
                    <span className="no-tasks">No tasks completed</span>
                  )}
                </div>
              </div>

              <div className="detail-item detail-notes">
                <span className="detail-label">Supervisor Notes</span>
                <p className="notes-text">{selectedCell.supervisorNotes}</p>
                {selectedCell.addedSupervisorNotes.length > 0 && (
                  <>
                    {selectedCell.addedSupervisorNotes.map((note, index) => (
                      <p
                        key={`${selectedCell.noteKey}-${index}`}
                        className="notes-text added-note-text"
                      >
                        {note}
                      </p>
                    ))}
                  </>
                )}
                {view === "supervisor" && (
                  <div className="notes-input-container">
                    <textarea
                      className="notes-input"
                      value={selectedCell.newSupervisorNote}
                      onChange={(e) =>
                        handleNewSupervisorNoteChange(e.target.value)
                      }
                      placeholder="Write a new supervisor note..."
                    />
                    <button
                      className="add-note-btn"
                      onClick={handleAddSupervisorNote}
                      disabled={!selectedCell.newSupervisorNote.trim()}
                    >
                      Add Note
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="mark-read-btn" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div
          className="modal-overlay-centered"
          onClick={() => setShowAddMember(false)}
        >
          <div className="modal-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Member to {project}</h3>
              <button
                className="close-btn"
                onClick={() => setShowAddMember(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>
                  Member Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={newMember.name}
                  onChange={(e) =>
                    setNewMember({
                      ...newMember,
                      name: e.target.value,
                    })
                  }
                  placeholder="Enter member name"
                />
              </div>
              <div className="form-group">
                <label>
                  Email <span className="required">*</span>
                </label>
                <input
                  type="email"
                  value={newMember.email}
                  onChange={(e) =>
                    setNewMember({
                      ...newMember,
                      email: e.target.value,
                    })
                  }
                  placeholder="Enter email address"
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  value={newMember.role}
                  onChange={(e) =>
                    setNewMember({
                      ...newMember,
                      role: e.target.value,
                    })
                  }
                >
                  <option value="Developer">Developer</option>
                  <option value="Supervisor">Supervisor</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="cancel-btn"
                onClick={() => setShowAddMember(false)}
              >
                Cancel
              </button>
              <button
                className="create-btn"
                onClick={handleAddMember}
                disabled={!newMember.name || !newMember.email || isLoading}
              >
                {isLoading ? "Adding..." : "Add Member"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceDashboard;
