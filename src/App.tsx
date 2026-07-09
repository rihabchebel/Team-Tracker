// src/App.tsx
import React, { useEffect, useState } from "react";
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
import Sidebar from "./components/Sidebar";
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
import {
  ViewMode,
  PageType,
  User,
  Project,
  LogEntry,
  ProjectTimelineEvent,
  UserActivity,
} from "./types/models";
import { dataService } from "./lib/dataService";
import { useAuth } from "./context/AuthContext";
import { AuthGuard } from "./guards/AuthGuard";

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
  const [searchParams, setSearchParams] = useSearchParams();

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
  const [timelineEvents, setTimelineEvents] = useState<ProjectTimelineEvent[]>([]);
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

        const { users, projects, logs, timeline, activity } = await dataService.getAllData();

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

  // ✅ FIX: Subscribe to Realtime changes and force React to remount the page
  useEffect(() => {
    if (!user) return;

    const unsubscribe = dataService.subscribeToDataChanges(() => {
      void (async () => {
        const { users, projects, logs, timeline, activity } = await dataService.getAllData();
        setUsersData(users);
        setProjectsData(projects);
        setTaskLogs(logs);
        setTimelineEvents(timeline);
        setUserActivity(activity);
        
        // ⚡ Force the key on <div key={refreshTrigger}> to increment
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
      const { users, projects, logs, timeline, activity } = await dataService.refreshData();
      setUsersData(users);
      setProjectsData(projects);
      setTaskLogs(logs);
      setTimelineEvents(timeline);
      setUserActivity(activity);
      
      // ⚡ Force React to remount the page after a manual refresh
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

  const { name: currentUserName, email: currentUserEmail } = deriveCurrentUser();

  const handleAddTaskLog = async (log: Omit<LogEntry, "id" | "submittedAt">) => {
    try {
      const newLog = await dataService.createLog({
        ...log,
        submittedById: user?.id || "1",
        submittedBy: currentUserName,
      });

      setTaskLogs((prevLogs) => [newLog, ...prevLogs]);

      const refreshedProjects = await dataService.getAllProjects();
      setProjectsData(refreshedProjects);

      return newLog;
    } catch (taskLogError) {
      console.error("Error adding task log:", taskLogError);
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
    const shouldStayOnPage = currentPage === "settings";

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
      window.location.href = '/login';
    } catch (logoutError) {
      console.error("Logout error:", logoutError);
    }
  };

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
          projectData={projectsData.find((item) => item.name === effectiveProject) || null}
          timelineEvents={timelineEvents}
          onAddTaskLog={handleAddTaskLog}
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
      <Header user={currentUserName} email={currentUserEmail} onLogout={handleLogout} />
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
        />
        <main className="main-content">
          {roleSwitchBanner}
          {/* ✅ The key forces the entire page to reset whenever refreshTrigger increments */}
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
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/admin-signup" element={<AdminSignUp />} />
            <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />
            
            {/* Protected routes */}
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

            {/* Catch all */}
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