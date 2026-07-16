// pages/PerformanceDashboard.tsx - Friday as working day with improved CSS

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
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
  User as UserIcon,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import "./PerformanceDashboard.css";
import {
  ViewMode,
  User,
  Project,
  LogEntry,
  UserActivity,
  ProjectTimelineEvent,
} from "../types/models";
import { formatDate, formatDateLong, formatShortDate } from "../utils/dateUtils";
import {
  getPrimaryRole,
  getAllRoles,
  hasRole,
  hasMultipleRoles,
  getRoleDisplayName,
  getRoleBadgeClass,
  getRolePriority,
} from "../utils/roleUtils";

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
  isCompleted?: boolean;
  completedAt?: string;
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

const formatRoleDisplay = (role: string): string => {
  return getRoleDisplayName(role);
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
  // ✅ Dark theme state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : false;
  });

  // ✅ Heatmap year state
  const [heatmapYear, setHeatmapYear] = useState<number>(new Date().getFullYear());
  const heatmapContainerRef = useRef<HTMLDivElement>(null);

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
  const [, setUserHasSupervisorRole] = useState(false);

  const isAll = project === "All Projects";

  // ✅ Toggle dark theme
  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", newTheme ? "dark" : "light");
  };

  // ✅ Apply theme on mount
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDarkMode ? "dark" : "light");
  }, []);

  // ✅ Check user's actual roles
  useEffect(() => {
    const checkUserRoles = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile, error } = await supabase
            .from("user_profiles")
            .select("roles")
            .eq("id", user.id)
            .single();
            
          if (!error && profile) {
            const roles = profile.roles || [];
            const hasSupervisor = roles.some((r: any) => 
              r === 'supervisor' || r === 'Supervisor'
            );
            setUserHasSupervisorRole(hasSupervisor);
          }
        }
      } catch (error) {
        console.error("Error checking user roles:", error);
      }
    };
    
    checkUserRoles();
  }, []);

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
    const role = getPrimaryRole(member.role);
    const seed = hashString(`${member.id}|hours|${project}`);
    const base = role === "supervisor" || role === "admin" ? 36 : 28;
    const variation = Math.floor(randFromSeed(seed) * 18);
    return base + variation;
  };

  const rolePriority = (role: any): number => {
    return getRolePriority(role);
  };

  const sortByRolePriority = (a: DashboardMember, b: DashboardMember) => {
    return rolePriority(a.role) - rolePriority(b.role);
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
    isCompleted: (currentProjectData as any)?.isCompleted || false,
    completedAt: (currentProjectData as any)?.completedAt || null,
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
      isCompleted: false,
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
      isCompleted: (currentProjectData as any)?.isCompleted || false,
      completedAt: (currentProjectData as any)?.completedAt || null,
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

  // ✅ FULL YEAR HEATMAP FUNCTIONS

  const getHoursForDate = (
    member: DashboardMember,
    date: Date,
  ): number => {
    const dateStr = date.toISOString().split("T")[0];
    const log = projectTaskLogs.find(
      (entry) => entry.submittedById === member.id && entry.date === dateStr,
    );
    return log?.hoursWorked || 0;
  };

  const getTasksForDate = (
    member: DashboardMember,
    date: Date,
  ): string[] => {
    const dateStr = date.toISOString().split("T")[0];
    const log = projectTaskLogs.find(
      (entry) => entry.submittedById === member.id && entry.date === dateStr,
    );
    return (log?.tasks || []).map((task) => task.description);
  };

  const getSupervisorNotesForDate = (
    member: DashboardMember,
    date: Date,
  ): string => {
    const dateStr = date.toISOString().split("T")[0];
    const note = projectTimeline.find((event) => {
      const created = event.created_at.split("T")[0];
      const matchesUser = event.user_id ? event.user_id === member.id : true;
      return created === dateStr && matchesUser;
    });

    if (note) return note.description;
    return "No notes for this day.";
  };

  const handleFullYearCellClick = (
    member: DashboardMember,
    date: Date,
    status: "full" | "partial" | "unavailable" | "no-log",
  ) => {
    const hoursWorked = getHoursForDate(member, date);
    const tasksCompleted = getTasksForDate(member, date);
    const noteKey = `${project}|${member.id}|${date.toISOString()}`;
    const supervisorNotes = getSupervisorNotesForDate(member, date);
    const addedSupervisorNotes = addedSupervisorNotesByCell[noteKey] ?? [];

    const detailData: HeatmapDetailData = {
      noteKey,
      memberName: member.name,
      date: formatDateLong(date.toISOString()),
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

  // ✅ Year navigation with today button
  const handleYearChange = (direction: number) => {
    const newYear = heatmapYear + direction;
    setHeatmapYear(newYear);
  };

  const goToToday = () => {
    const today = new Date();
    setHeatmapYear(today.getFullYear());
    setTimeout(() => {
      if (heatmapContainerRef.current) {
        const todayDate = new Date();
        const dayOfYear = Math.floor((todayDate.getTime() - new Date(todayDate.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
        const cellWidth = 14;
        const scrollPosition = dayOfYear * cellWidth - 100;
        heatmapContainerRef.current.scrollLeft = Math.max(0, scrollPosition);
      }
    }, 100);
  };

  // Get month names for headers
  const getMonthHeaders = () => {
    const months = [];
    for (let m = 0; m < 12; m++) {
      const date = new Date(heatmapYear, m, 1);
      const daysInMonth = new Date(heatmapYear, m + 1, 0).getDate();
      months.push({
        name: date.toLocaleDateString('en-US', { month: 'short' }),
        days: daysInMonth,
      });
    }
    return months;
  };

  const monthHeaders = getMonthHeaders();

  // ✅ Handle cell click for 30-day heatmap

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

  // Add Member Handler (unchanged)
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

      const { data: existingProfile, error: profileCheckError } = await supabase
        .from("user_profiles")
        .select("id, full_name, email, roles")
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

        let currentRoles: string[] = [];
        if (existingProfile.roles) {
          if (Array.isArray(existingProfile.roles)) {
            currentRoles = existingProfile.roles;
          } else if (typeof existingProfile.roles === "string") {
            try {
              currentRoles = JSON.parse(existingProfile.roles);
            } catch {
              currentRoles = [];
            }
          } else if (typeof existingProfile.roles === "object") {
            currentRoles = Object.values(existingProfile.roles);
          }
        }

        const roleToAdd = newMember.role.toLowerCase();

        if (!currentRoles.includes(roleToAdd)) {
          const updatedRoles = [...currentRoles, roleToAdd];
          const { error: updateRolesError } = await supabase
            .from("user_profiles")
            .update({
              roles: updatedRoles,
            })
            .eq("id", userId);

          if (updateRolesError) {
            console.warn("Could not update roles:", updateRolesError);
          } else {
            console.log("✅ Roles updated:", updatedRoles);
          }
        }
      } else {
        console.log("📝 Creating new user...");
        const tempPassword = Math.random().toString(36).slice(-8) + "A1!";

        try {
          const { data: authData, error: authError } =
            await supabase.auth.admin.createUser({
              email: newMember.email,
              password: tempPassword,
              email_confirm: true,
              user_metadata: {
                full_name: newMember.name,
              },
            });

          if (authError) throw authError;

          userId = authData.user.id;
          isNewUser = true;
          console.log("✅ Auth user created:", userId);

          const profileData = {
            id: userId,
            email: newMember.email,
            full_name: newMember.name,
            roles: [newMember.role.toLowerCase()],
          };

          const { error: profileError } = await supabase
            .from("user_profiles")
            .insert(profileData);

          if (profileError) {
            console.error("❌ Error creating profile:", profileError);
            if (profileError.message?.includes("roles")) {
              console.log("🔄 Retrying without roles...");
              const { error: retryError } = await supabase
                .from("user_profiles")
                .insert({
                  id: userId,
                  email: newMember.email,
                  full_name: newMember.name,
                });

              if (retryError) throw retryError;
            } else {
              throw profileError;
            }
          }
          console.log("✅ User profile created");
        } catch (adminError: any) {
          console.error("❌ Error creating user:", adminError);

          if (
            adminError.message?.includes("already exists") ||
            adminError.status === 409
          ) {
            const { data: existingUser, error: findError } = await supabase
              .from("user_profiles")
              .select("id")
              .eq("email", newMember.email)
              .maybeSingle();

            if (findError || !existingUser) {
              throw new Error("User exists but profile not found.");
            }
            userId = existingUser.id;
            isNewUser = false;
          } else {
            throw adminError;
          }
        }
      }

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
      } else {
        const { error: teamError } = await supabase
          .from("team_members")
          .insert({
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
      }

      const updatedProject = {
        ...currentProject,
        teamMembers: [
          ...currentProject.teamMembers.filter((m) => m.id !== userId),
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

      if (isNewUser) {
        try {
          const { mailerSendService } = await import("../lib/mailerSend");
          await mailerSendService.sendInvitation({
            email: newMember.email,
            full_name: newMember.name,
            token: crypto.randomUUID(),
            invited_by: "Admin",
            role: finalRole,
            project_name: currentProject.name,
            project_id: currentProject.id,
          });
          console.log("✅ Invitation email sent");
        } catch (emailError) {
          console.warn("⚠️ Invitation email failed:", emailError);
        }
      }

      setNewMember({ name: "", email: "", role: "Developer" });
      setShowAddMember(false);
      setIsLoading(false);

      const successMessage = isNewUser
        ? `✅ ${newMember.name} has been created and added to ${currentProject.name}!`
        : `✅ ${newMember.name} has been added to ${currentProject.name}!`;

      alert(successMessage);
    } catch (error: any) {
      console.error("❌ Unexpected error:", error);
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
      <div className={`performance-dashboard ${isDarkMode ? "dark" : ""}`}>
        <div className="page-header">
          <div className="page-header-content">
            <div>
              <h2>{project}</h2>
            </div>
            <button className="theme-toggle-btn" onClick={toggleTheme}>
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
        <div className="dashboard-content">
          <p>No data available for this project.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`performance-dashboard ${isDarkMode ? "dark" : ""}`}>
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
              {projectData.isCompleted && (
                <span className="project-completed-badge-header"> ✅ Completed</span>
              )}
            </h2>
          </div>
          <div className="header-actions">
            <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle theme">
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
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
      </div>

      <div className="dashboard-content">
        <div className="dashboard-header">
          <h3>Performance Dashboard</h3>

          {!isAll && (
            <div className="dashboard-tabs">
              <button
                className={`tab-btn ${activeTab === "roster" ? "active" : ""}`}
                onClick={() => setActiveTab("roster")}
              >
                <Users size={14} />
                Team Roster
              </button>

              {(isAdmin || view === "supervisor") && (
                <button
                  className={`tab-btn ${activeTab === "heatmap" ? "active" : ""}`}
                  onClick={() => setActiveTab("heatmap")}
                >
                  <Calendar size={14} />
                  Heatmap
                </button>
              )}

              {(isAdmin || view === "supervisor") && (
                <button
                  className={`tab-btn ${activeTab === "analytics" ? "active" : ""}`}
                  onClick={() => setActiveTab("analytics")}
                >
                  <BarChart3 size={14} />
                  Analytics
                </button>
              )}
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
                      Name {getSortIcon("name")}
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
                  {filteredMembers.map((member) => {
                    const hasMultiple = hasMultipleRoles(member.role);
                    const allRoles = getAllRoles(member.role);
                    const primaryRole = getPrimaryRole(member.role);

                    return (
                      <tr key={member.id}>
                        <td className="member-cell">
                          <div className="member-avatar">
                            {getInitials(member.name)}
                          </div>
                          <div>
                            <div>{member.name}</div>
                            {hasMultiple && (
                              <div className="multiple-roles-indicator">
                                <span className="green-dot"></span>
                                <span className="roles-text">
                                  {allRoles
                                    .map((r) => formatRoleDisplay(r))
                                    .join(" + ")}
                                </span>
                              </div>
                            )}
                          </div>
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
                                  {formatRoleDisplay(m.role)} · {m.projectName}
                                </span>
                              ))}
                              {hasMultiple && (
                                <div
                                  className="global-roles"
                                  style={{ marginTop: "4px", width: "100%" }}
                                >
                                  <span className="global-roles-label">
                                    Also:
                                  </span>
                                  {allRoles
                                    .filter((r: string) => r !== primaryRole)
                                    .map((role: string, idx: number) => (
                                      <span
                                        key={idx}
                                        className={`role-badge-small ${getRoleBadgeClass(role)}`}
                                      >
                                        {formatRoleDisplay(role)}
                                      </span>
                                    ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <span
                                className={`role-badge ${getRoleBadgeClass(member.role)}`}
                              >
                                {formatRoleDisplay(member.role)}
                              </span>
                              {hasMultiple && (
                                <div
                                  className="global-roles"
                                  style={{ marginTop: "4px" }}
                                >
                                  <span className="global-roles-label">
                                    Also:
                                  </span>
                                  {allRoles
                                    .filter((r: string) => r !== primaryRole)
                                    .map((role: string, idx: number) => (
                                      <span
                                        key={idx}
                                        className={`role-badge-small ${getRoleBadgeClass(role)}`}
                                      >
                                        {formatRoleDisplay(role)}
                                      </span>
                                    ))}
                                </div>
                              )}
                            </div>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!isAll && activeTab === "heatmap" && (
          <div className="heatmap-section">
            <div className="heatmap-header-wrapper">
              <h4>Availability Heatmap ({heatmapYear})</h4>
              <div className="heatmap-controls">
                <button 
                  className="heatmap-year-btn"
                  onClick={() => handleYearChange(-1)}
                  title="Previous Year"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="heatmap-year-display">{heatmapYear}</span>
                <button 
                  className="heatmap-year-btn"
                  onClick={() => handleYearChange(1)}
                  title="Next Year"
                >
                  <ChevronRight size={14} />
                </button>
                <button 
                  className={`heatmap-year-btn today-btn ${heatmapYear === new Date().getFullYear() ? 'active' : ''}`}
                  onClick={goToToday}
                  title="Jump to current year"
                >
                  Today
                </button>
              </div>
              {teamMembers.some(m => m.joined) && (
                <div className="heatmap-join-info">
                  <UserIcon size={14} />
                  <span>Join dates shown</span>
                </div>
              )}
              {projectData.isCompleted && (
                <div className="heatmap-completed-badge">
                  ✅ Project Completed
                </div>
              )}
            </div>
            
            <div className="heatmap-scroll-container" ref={heatmapContainerRef}>
              <div className="heatmap-container">
                {/* Month headers */}
                <div className="heatmap-month-headers">
                  <div className="heatmap-member-label">Member</div>
                  {monthHeaders.map((month, index) => (
                    <div 
                      key={index} 
                      className="heatmap-month-header"
                      style={{ 
                        gridColumn: `span ${month.days}` 
                      }}
                    >
                      {month.name}
                    </div>
                  ))}
                </div>

                {/* Member rows with heatmap cells */}
                <div className="heatmap-members">
                  {teamMembers.slice(0, 8).map((member) => {
                    let joinedDate: Date | null = null;
                    if (member.joined) {
                      try {
                        if (member.joined.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                          const parts = member.joined.split('/');
                          joinedDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                        } else {
                          joinedDate = new Date(member.joined);
                        }
                        if (isNaN(joinedDate.getTime())) joinedDate = null;
                      } catch {
                        joinedDate = null;
                      }
                    }
                    
                    return (
                      <div key={member.id} className="heatmap-member">
                        <span className="member-name">
                          <span className="member-name-text">
                            {member.name}
                            {member.status === "Left" && (
                              <span className="member-status-left"> (left)</span>
                            )}
                          </span>
                          {hasRole(member.role, "supervisor") && (
                            <span className="member-role-badge supervisor-badge">
                              Supervisor
                            </span>
                          )}
                          {joinedDate && (
                            <span className="member-join-badge" title={`Joined: ${formatDateLong(member.joined)}`}>
                              <Calendar size={10} />
                              <span>{formatShortDate(member.joined)}</span>
                            </span>
                          )}
                        </span>
                        
                        <div className="heatmap-row">
                          {Array.from({ length: 365 }, (_, dayIndex) => {
                            const date = new Date(heatmapYear, 0, dayIndex + 1);
                            const dayOfWeek = date.getDay();
                            // ✅ Friday (5) is now a working day, only Saturday (6) and Sunday (0) are weekends
                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                            
                            let isBeforeStart = false;
                            if (joinedDate) {
                              const compareDate = new Date(date);
                              compareDate.setHours(0, 0, 0, 0);
                              const join = new Date(joinedDate);
                              join.setHours(0, 0, 0, 0);
                              isBeforeStart = compareDate < join;
                            }
                            
                            const isFuture = date > new Date();
                            
                            let status = 'no-log';
                            let hours = 0;
                            
                            if (!isBeforeStart && !isFuture && !isWeekend) {
                              const dateStr = date.toISOString().split('T')[0];
                              const log = projectTaskLogs.find(
                                (entry) => entry.submittedById === member.id && 
                                entry.date === dateStr
                              );
                              if (log) {
                                status = log.status;
                                hours = log.hoursWorked || 0;
                              }
                            }
                            
                            const isCompleted = projectData.isCompleted && 
                              date <= new Date(projectData.completedAt || '');
                            
                            return (
                              <div
                                key={dayIndex}
                                className={`heatmap-cell ${status} ${isWeekend ? 'weekend' : ''} ${isFuture ? 'future' : ''} ${isCompleted ? 'project-completed' : ''}`}
                                onClick={() => {
                                  if (!isBeforeStart && !isFuture && !isWeekend) {
                                    handleFullYearCellClick(member, date, status as any);
                                  }
                                }}
                                title={
                                  isBeforeStart 
                                    ? `Before join date (${joinedDate ? formatDateLong(member.joined) : 'N/A'})` 
                                    : isFuture
                                    ? 'Future date'
                                    : isWeekend
                                    ? 'Weekend'
                                    : `${member.name} - ${status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}${hours > 0 ? ` - ${hours}h` : ''}`
                                }
                                style={{ 
                                  cursor: isBeforeStart || isFuture || isWeekend ? 'default' : 'pointer',
                                  opacity: isBeforeStart || isFuture ? 0.3 : 1
                                }}
                              >
                                {isWeekend && <span className="heatmap-weekend-indicator">•</span>}
                                {isBeforeStart && <span className="heatmap-before-start-indicator">—</span>}
                                {isFuture && <span className="heatmap-future-indicator">·</span>}
                                {isCompleted && <span className="heatmap-completed-indicator">✓</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="heatmap-legend">
                  <span className="legend-label">Legend:</span>
                  <span className="legend-item full">● Full</span>
                  <span className="legend-item partial">● Partial</span>
                  <span className="legend-item unavailable">● Unavailable</span>
                  <span className="legend-item no-log">○ No Log</span>
                  <span className="legend-item weekend">● Weekend (Sat/Sun)</span>
                  <span className="legend-item before-start">— Before Join</span>
                  <span className="legend-item completed">✓ Completed</span>
                </div>
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
              {projectData.isCompleted && (
                <div className="stat-card completed-card">
                  <div className="stat-card-header">
                    <div className="stat-info">
                      <span className="stat-name">Project Status</span>
                    </div>
                  </div>
                  <div className="stat-details">
                    <div className="stat-item">
                      <span className="stat-value" style={{ color: '#00b894' }}>
                        ✅ Completed
                      </span>
                      <span style={{ fontSize: '12px', color: '#8888aa' }}>
                        {projectData.completedAt && formatDate(projectData.completedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
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
                        {formatRoleDisplay(member.role)}
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
        <div className={`modal-overlay ${isDarkMode ? "dark" : ""}`} onClick={closeModal}>
          <div
            className={`modal heatmap-detail-modal ${isDarkMode ? "dark" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-header-info">
                <h3>{selectedCell.memberName}</h3>
                <span
                  className={`role-badge ${getRoleBadgeClass(selectedCell.role)}`}
                  style={{ fontSize: "11px", padding: "2px 12px" }}
                >
                  {formatRoleDisplay(selectedCell.role)}
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
          className={`modal-overlay-centered ${isDarkMode ? "dark" : ""}`}
          onClick={() => setShowAddMember(false)}
        >
          <div className={`modal-centered ${isDarkMode ? "dark" : ""}`} onClick={(e) => e.stopPropagation()}>
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
                  <option value="Admin">Admin</option>
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