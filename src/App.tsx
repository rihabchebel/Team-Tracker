// src/App.tsx - Fixed TypeScript errors
import React, { useEffect, useState, useMemo } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import "./App.css";
import Header from "./components/Header";
import Sidebar, { PageType as SidebarPageType } from "./components/Sidebar";
import UserManagement from "./pages/UserManagement";
import ProjectSettings from "./pages/ProjectSettings";
import UserTimeline from "./pages/UserTimeline";
import AllTasks from "./pages/AllTasks";
import PerformanceDashboard from "./pages/PerformanceDashboard";
import DeveloperDashboard from "./pages/DeveloperDashboard";
import Login from "./pages/Login";
import { AdminSignUp } from "./pages/AdminSignUp";
import { AcceptInvitation } from "./pages/AcceptInvitation";
import { ProtectedRoute } from "./guards/ProtectedRoute";
import { SetupGuard } from "./guards/SetupGuard";
// ✅ Import supabase ONCE from supabase.ts
import { supabase } from "./lib/supabase";
// ✅ Import types ONCE from models
import {
  ViewMode,
  User,
  Project,
  LogEntry,
  ProjectTimelineEvent,
  UserActivity,
} from "./types/models";
import { dataService } from "./lib/dataService";
import { useAuth } from "./context/AuthContext";
import { AuthGuard } from "./guards/AuthGuard";

type PageType = SidebarPageType;

interface AppState {
  view: ViewMode;
  selectedProject: string;
}

const PAGE_PATHS: Record<PageType, string> = {
  dashboard: "/dashboard",
  users: "/dashboard/users",
  timeline: "/dashboard/timeline",
  settings: "/dashboard/settings",
  tasks: "/dashboard/tasks",
  performance: "/dashboard/performance",
};

const pageFromPathname = (pathname: string): PageType => {
  const entry = (Object.entries(PAGE_PATHS) as [PageType, string][]).find(
    ([, path]) => path === pathname,
  );
  return entry ? entry[0] : "dashboard";
};

const DashboardShell: React.FC = () => {
  const {
    user,
    loading: authLoading,
    profile,
    signOut,
    isAdmin,
    supervisorProjects,
    developerProjects,
    dashboardMode,
    setDashboardMode,
  } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const currentPage = pageFromPathname(location.pathname);

  const [state, setState] = useState<AppState>({
    view: "supervisor",
    selectedProject: searchParams.get("project") || "All Projects",
  });

  useEffect(() => {
    if (!dashboardMode) return;
    if (dashboardMode === "admin") {
      setState((currentState) => ({ ...currentState, view: "supervisor" }));
    } else if (dashboardMode === "supervisor") {
      setState((currentState) => ({ ...currentState, view: "supervisor" }));
    } else if (dashboardMode === "developer") {
      setState((currentState) => ({ ...currentState, view: "developer" }));
    }
  }, [dashboardMode]);

  const [isLoading, setIsLoading] = useState(true);
  const [projectsData, setProjectsData] = useState<Project[]>([]);
  const [usersData, setUsersData] = useState<User[]>([]);
  const [taskLogs, setTaskLogs] = useState<LogEntry[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<ProjectTimelineEvent[]>(
    [],
  );
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const forceRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log("🔄 Loading data from Supabase...");

        const { users, projects, logs, timeline, activity } =
          await dataService.getAllData();

        console.log("✅ Data loaded:", {
          users: users.length,
          projects: projects.length,
          logs: logs.length,
          timeline: timeline.length,
          activity: activity.length,
        });

        setUsersData(users);
        setProjectsData(projects);
        setTaskLogs(logs);
        setTimelineEvents(timeline);
        setUserActivity(activity);
      } catch (loadError) {
        console.error("❌ Error loading data:", loadError);
        setError("Failed to load data. Please refresh the page.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = dataService.subscribeToDataChanges(() => {
      void (async () => {
        const { users, projects, logs, timeline, activity } =
          await dataService.getAllData();
        setUsersData(users);
        setProjectsData(projects);
        setTaskLogs(logs);
        setTimelineEvents(timeline);
        setUserActivity(activity);
        forceRefresh();
      })();
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  const refreshData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { users, projects, logs, timeline, activity } =
        await dataService.refreshData();
      setUsersData(users);
      setProjectsData(projects);
      setTaskLogs(logs);
      setTimelineEvents(timeline);
      setUserActivity(activity);
      forceRefresh();
      console.log("✅ Data refreshed successfully");
    } catch (refreshError) {
      console.error("❌ Error refreshing data:", refreshError);
      setError("Failed to refresh data.");
    } finally {
      setIsLoading(false);
    }
  };

  const deriveCurrentUser = () => {
    const currentName =
      profile?.full_name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.display_name;
    const currentEmail = profile?.email || user?.email;

    return {
      name: currentName || "Guest",
      email: currentEmail || "guest@localhost",
    };
  };

  const { name: currentUserName, email: currentUserEmail } =
    deriveCurrentUser();

  const userProjectCount = useMemo(() => {
    if (!user?.id) return 0;
    return projectsData.filter((project) =>
      project.teamMembers.some((member) => member.id === user.id),
    ).length;
  }, [projectsData, user?.id]);

  // ✅ FIXED: Properly maps DeveloperDashboard log data to database schema
  const handleAddTaskLog = async (
    log: Omit<LogEntry, "id" | "submittedAt">,
  ): Promise<void> => {
    try {
      // Find the project to get the project_id
      const projectObj = projectsData.find((p) => p.name === log.project);

      if (!projectObj) {
        console.error("❌ Project not found:", log.project);
        throw new Error(`Project "${log.project}" not found`);
      }

      // ✅ Get the first sub-project ID if available
      const subProjectId =
        projectObj.subProjects && projectObj.subProjects.length > 0
          ? projectObj.subProjects[0].id
          : null;

      // ✅ Build the log data matching the database schema
      const logData = {
        project_id: projectObj.id,
        user_id: user?.id || null,
        sub_project_id: subProjectId,
        date: log.date,
        status: log.status,
        hours_worked: log.hoursWorked,
        tasks: log.tasks || [],
        partial_reason: log.partialReason || null,
        unavailable_reason: log.unavailableReason || null,
        submitted_by: currentUserName,
        is_approved: false,
      };

      console.log("📤 Creating log with data:", logData);

      const { data: newLog, error } = await supabase
        .from("task_logs")
        .insert([logData])
        .select()
        .single();

      if (error) {
        console.error("❌ Supabase error:", error);
        throw new Error(error.message);
      }

      // ✅ Update local state with the new log
      setTaskLogs((prevLogs) => [
        {
          id: newLog.id,
          project: log.project,
          projectName: log.project,
          date: newLog.date,
          status: newLog.status,
          hoursWorked: newLog.hours_worked,
          tasks: newLog.tasks || [],
          partialReason: newLog.partial_reason || undefined,
          unavailableReason: newLog.unavailable_reason || undefined,
          submittedBy: newLog.submitted_by || currentUserName,
          submittedAt: newLog.submitted_at,
          submittedById: newLog.user_id,
          projectId: newLog.project_id,
          subProjectId: newLog.sub_project_id,
          isApproved: newLog.is_approved,
        },
        ...prevLogs,
      ]);

      // ✅ Refresh projects to update used hours
      const refreshedProjects = await dataService.getAllProjects();
      setProjectsData(refreshedProjects);
      forceRefresh();

      console.log("✅ Log created successfully:", newLog);
    } catch (taskLogError) {
      console.error("❌ Error adding task log:", taskLogError);
      alert("Failed to add task log. Please try again.");
      throw taskLogError;
    }
  };

  const handleViewSwitch = (view: ViewMode) => {
    setState({ ...state, view });
  };

  const handlePageChange = (page: PageType) => {
    navigate({
      pathname: PAGE_PATHS[page],
      search: searchParams.toString() ? `?${searchParams.toString()}` : "",
    });
  };

  const handleProjectSelect = (project: string) => {
    const shouldStayOnPage =
      currentPage === "settings" || currentPage === "performance";

    setState({ ...state, selectedProject: project });

    const nextParams = new URLSearchParams(searchParams);
    if (project === "All Projects") {
      nextParams.delete("project");
    } else {
      nextParams.set("project", project);
    }

    navigate({
      pathname: shouldStayOnPage ? location.pathname : PAGE_PATHS.dashboard,
      search: nextParams.toString() ? `?${nextParams.toString()}` : "",
    });
  };

  const handleProjectsUpdate = async (updatedProjects: Project[]) => {
    try {
      const [freshUsers, freshProjects] = await Promise.all([
        dataService.getAllUsers(),
        dataService.getAllProjects(),
      ]);

      setUsersData(freshUsers);
      setProjectsData(freshProjects);
      forceRefresh();
    } catch (error) {
      console.error("Error refreshing data:", error);
      setProjectsData(updatedProjects);
    }
  };

  const handleUsersUpdate = async (updatedUsers: User[]) => {
    try {
      const [freshUsers, freshProjects] = await Promise.all([
        dataService.getAllUsers(),
        dataService.getAllProjects(),
      ]);

      setUsersData(freshUsers);
      setProjectsData(freshProjects);
      forceRefresh();
    } catch (error) {
      console.error("Error refreshing data:", error);
      setUsersData(updatedUsers);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setProjectsData([]);
      setUsersData([]);
      setTaskLogs([]);
      setError(null);
      window.location.href = "/login";
    } catch (logoutError) {
      console.error("Logout error:", logoutError);
    }
  };

  const hasProjects = userProjectCount > 0;

  const NoAccessPage = () => (
    <div className="no-access-page">
      <div className="no-access-container">
        <div className="no-access-icon">🔒</div>
        <h3>No Access</h3>
        <p>You don't have access to any projects.</p>
        <p className="no-access-sub">
          Please contact an administrator to be added to a project.
        </p>
      </div>
    </div>
  );

  const renderPage = () => {
    if (isLoading) {
      return <div className="loading">Loading data from Supabase...</div>;
    }

    if (error) {
      return (
        <div className="error-container">
          <p className="error-message">⚠️ {error}</p>
          <button className="retry-btn" onClick={refreshData}>
            Retry
          </button>
        </div>
      );
    }

    if (currentPage === "performance" && !hasProjects) {
      return <NoAccessPage />;
    }

    if (state.view === "developer" && currentPage === "dashboard") {
      const effectiveProject =
        state.selectedProject === "All Projects"
          ? projectsData[0]?.name || ""
          : state.selectedProject;

      return (
        <DeveloperDashboard
          view={state.view}
          project={effectiveProject}
          currentUser={currentUserName}
          projectData={
            projectsData.find((item) => item.name === effectiveProject) || null
          }
          timelineEvents={timelineEvents}
          onAddTaskLog={handleAddTaskLog}
          onProjectsUpdate={handleProjectsUpdate}
          onTaskComplete={forceRefresh}
        />
      );
    }

    switch (currentPage) {
      case "dashboard":
        return (
          <PerformanceDashboard
            view={state.view}
            project={state.selectedProject}
            users={usersData}
            projectsData={projectsData}
            taskLogs={taskLogs}
            userActivity={userActivity}
            timelineEvents={timelineEvents}
            onProjectsUpdate={handleProjectsUpdate}
            onProjectSelect={handleProjectSelect}
            isAdmin={!!isAdmin}
          />
        );
      case "performance":
        return (
          <PerformanceDashboard
            view={state.view}
            project={state.selectedProject}
            users={usersData}
            projectsData={projectsData}
            taskLogs={taskLogs}
            userActivity={userActivity}
            timelineEvents={timelineEvents}
            onProjectsUpdate={handleProjectsUpdate}
            onProjectSelect={handleProjectSelect}
            isAdmin={!!isAdmin}
          />
        );
      case "users":
        return (
          <UserManagement
            view={state.view}
            project={state.selectedProject}
            users={usersData}
            projectsData={projectsData}
            onUsersUpdate={handleUsersUpdate}
            onProjectsUpdate={handleProjectsUpdate}
            isAdmin={!!isAdmin}
          />
        );
      case "timeline":
        return (
          <UserTimeline
            view={state.view}
            project={state.selectedProject}
            users={usersData}
            projectsData={projectsData}
            timelineEvents={timelineEvents}
          />
        );
      case "settings":
        return (
          <ProjectSettings
            view={state.view}
            project={state.selectedProject}
            projectsData={projectsData}
            onProjectsUpdate={handleProjectsUpdate}
            onProjectSelect={handleProjectSelect}
            isAdmin={!!isAdmin}
          />
        );
      case "tasks":
        return (
          <AllTasks
            view={state.view}
            project={state.selectedProject}
            projectsData={projectsData}
            usersData={usersData}
            taskLogs={taskLogs}
          />
        );
      default:
        return (
          <PerformanceDashboard
            view={state.view}
            project={state.selectedProject}
            users={usersData}
            projectsData={projectsData}
            taskLogs={taskLogs}
            userActivity={userActivity}
            timelineEvents={timelineEvents}
            onProjectsUpdate={handleProjectsUpdate}
            onProjectSelect={handleProjectSelect}
            isAdmin={!!isAdmin}
          />
        );
    }
  };

  const projectNames = projectsData.map((project) => project.name);

  if (authLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Authenticating...</p>
      </div>
    );
  }

  const roleSwitchBanner =
    dashboardMode === "both" ? (
      <div className="role-switch-banner">
        <p>Choose your active project role for this session:</p>
        <div className="role-toggle-buttons">
          <button
            className={state.view === "supervisor" ? "active" : ""}
            onClick={() => setDashboardMode && setDashboardMode("supervisor")}
          >
            Supervisor View
          </button>
          <button
            className={state.view === "developer" ? "active" : ""}
            onClick={() => setDashboardMode && setDashboardMode("developer")}
          >
            Developer View
          </button>
        </div>
      </div>
    ) : null;

  return (
    <div className="app-container">
      <Header
        user={currentUserName}
        email={currentUserEmail}
        onLogout={handleLogout}
      />
      <div className="main-layout">
        <Sidebar
          view={state.view}
          currentPage={currentPage}
          selectedProject={state.selectedProject}
          projects={projectNames}
          projectsData={projectsData}
          onViewSwitch={handleViewSwitch}
          onPageChange={handlePageChange}
          onProjectSelect={handleProjectSelect}
          onLogout={handleLogout}
          isAdmin={!!isAdmin}
          hasSupervisor={!!isAdmin || (supervisorProjects || []).length > 0}
          hasDeveloper={!!isAdmin || (developerProjects || []).length > 0}
          userProjectCount={userProjectCount}
          currentUserRole={profile?.role}
        />
        <main className="main-content">
          {roleSwitchBanner}
          <div key={refreshTrigger}>{renderPage()}</div>
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <SetupGuard>
        <AuthGuard>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/admin-signup" element={<AdminSignUp />} />
            <Route
              path="/accept-invitation/:token"
              element={<AcceptInvitation />}
            />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardShell />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardShell />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/users"
              element={
                <ProtectedRoute>
                  <DashboardShell />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/timeline"
              element={
                <ProtectedRoute>
                  <DashboardShell />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/settings"
              element={
                <ProtectedRoute>
                  <DashboardShell />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/tasks"
              element={
                <ProtectedRoute>
                  <DashboardShell />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/performance"
              element={
                <ProtectedRoute>
                  <DashboardShell />
                </ProtectedRoute>
              }
            />

            <Route
              path="*"
              element={
                <ProtectedRoute>
                  <Navigate to="/dashboard" replace />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthGuard>
      </SetupGuard>
    </BrowserRouter>
  );
}

export default App;
