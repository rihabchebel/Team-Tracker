// src/App.tsx
import React, { useState, useEffect } from "react";
import "./App.css";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import UserManagement from "./components/UserManagement";
import ProjectSettings from "./components/ProjectSettings";
import UserTimeline from "./components/UserTimeline";
import AllTasks from "./components/AllTasks";
import PerformanceDashboard from "./components/PerformanceDashboard";
import DeveloperDashboard from "./components/DeveloperDashboard";
import Login from "./components/Login";
import { ViewMode, PageType, User, Project, LogEntry } from "./types/models";
import { dataService } from "./lib/dataService";
import DebugPanel from "./components/DebugPanel";
import { useAuth } from "./context/AuthContext";

interface AppState {
  view: ViewMode;
  currentPage: PageType;
  selectedProject: string;
}

const App: React.FC = () => {
  const { user, loading: authLoading, profile, signOut, isAdmin, supervisorProjects, developerProjects, dashboardMode, setDashboardMode } = useAuth() as any;
  
  const [state, setState] = useState<AppState>({
    view: "supervisor",
    currentPage: "dashboard",
    selectedProject: "All Projects",
  });

  // If user has a dashboard preference from context, initialize view accordingly
  useEffect(() => {
    if (!dashboardMode) return;
    if (dashboardMode === 'admin') {
      // keep view as supervisor by default for admin
      setState((s) => ({ ...s, view: 'supervisor' }));
    } else if (dashboardMode === 'supervisor') {
      setState((s) => ({ ...s, view: 'supervisor' }));
    } else if (dashboardMode === 'developer') {
      setState((s) => ({ ...s, view: 'developer' }));
    }
  }, [dashboardMode]);

  const [isLoading, setIsLoading] = useState(true);
  const [projectsData, setProjectsData] = useState<Project[]>([]);
  const [usersData, setUsersData] = useState<User[]>([]);
  const [taskLogs, setTaskLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load data from Supabase
  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log("🔄 Loading data from Supabase...");
        
        const { users, projects, logs } = await dataService.getAllData();
        
        console.log("✅ Data loaded:", {
          users: users.length,
          projects: projects.length,
          logs: logs.length,
        });
        
        setUsersData(users);
        setProjectsData(projects);
        setTaskLogs(logs);
      } catch (error) {
        console.error("❌ Error loading data:", error);
        setError("Failed to load data. Please refresh the page.");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [user]);

  // Refresh data function
  const refreshData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { users, projects, logs } = await dataService.refreshData();
      setUsersData(users);
      setProjectsData(projects);
      setTaskLogs(logs);
      console.log("✅ Data refreshed successfully");
    } catch (error) {
      console.error("❌ Error refreshing data:", error);
      setError("Failed to refresh data.");
    } finally {
      setIsLoading(false);
    }
  };

  // Derive current user info
  const deriveCurrentUser = () => {
    const currentName = profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.display_name;
    const currentEmail = profile?.email || user?.email;

    return {
      name: currentName || "Guest",
      email: currentEmail || "guest@localhost",
    };
  };

  const { name: currentUserName, email: currentUserEmail } = deriveCurrentUser();

  // Handlers
  const handleAddTaskLog = async (log: Omit<LogEntry, "id" | "submittedAt">) => {
    try {
      const newLog = await dataService.createLog({
        ...log,
        submittedById: user?.id || "1",
        submittedBy: currentUserName,
      });
      
      setTaskLogs((prevLogs) => [newLog, ...prevLogs]);
      
      // Refresh project data to update used hours
      const refreshedProjects = await dataService.getAllProjects();
      setProjectsData(refreshedProjects);
      
      return newLog;
    } catch (error) {
      console.error("Error adding task log:", error);
      alert("Failed to add task log. Please try again.");
      throw error;
    }
  };

  const handleViewSwitch = (view: ViewMode) => {
    setState({ ...state, view });
  };

  const handlePageChange = (page: PageType) => {
    setState({ ...state, currentPage: page });
  };

  const handleProjectSelect = (project: string) => {
    const shouldStayOnPage = state.currentPage === 'settings';
    
    setState({
      ...state,
      selectedProject: project,
      ...(shouldStayOnPage ? {} : { currentPage: "dashboard" }),
    });
  };

  const handleProjectsUpdate = async (updatedProjects: Project[]) => {
    setProjectsData(updatedProjects);
    // Update user data based on project changes
    const refreshedUsers = await dataService.getAllUsers();
    setUsersData(refreshedUsers);
    
    const stillExists = updatedProjects.some(
      (p) => p.name === state.selectedProject,
    );
    if (!stillExists && updatedProjects.length > 0) {
      setState({ ...state, selectedProject: "All Projects" });
    }
  };

  const handleUsersUpdate = async (updatedUsers: User[]) => {
    setUsersData(updatedUsers);
    // Save each user update to Supabase
    for (const user of updatedUsers) {
      try {
        await dataService.updateUser(user.id, user);
      } catch (error) {
        console.error(`Error updating user ${user.name}:`, error);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setProjectsData([]);
      setUsersData([]);
      setTaskLogs([]);
      setError(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Render page based on current state
  const renderPage = () => {
    if (isLoading) {
      return <div className="loading">Loading data from Supabase...</div>;
    }

    if (error) {
      return (
        <div className="error-container">
          <p className="error-message">⚠️ {error}</p>
          <button className="retry-btn" onClick={refreshData}>Retry</button>
        </div>
      );
    }

    // Routing guard based on global/project roles
    if (state.view === "developer" && state.currentPage === "dashboard") {
      const effectiveProject = state.selectedProject === "All Projects"
        ? projectsData[0]?.name || ""
        : state.selectedProject;

      return (
        <DeveloperDashboard
          view={state.view}
          project={effectiveProject}
          currentUser={currentUserName}
          onAddTaskLog={handleAddTaskLog}
        />
      );
    }

    switch (state.currentPage) {
      case "dashboard":
        return (
          <PerformanceDashboard
            view={state.view}
            project={state.selectedProject}
            users={usersData}
            projectsData={projectsData}
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
            onProjectsUpdate={handleProjectsUpdate}
            onProjectSelect={handleProjectSelect}
            isAdmin={!!isAdmin}
          />
        );
    }
  };

  const projectNames = projectsData.map((p) => p.name);

  // Auth loading
  if (authLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Authenticating...</p>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Login />;
  }

  const roleSwitchBanner = dashboardMode === 'both' ? (
    <div className="role-switch-banner">
      <p>Choose your active project role for this session:</p>
      <div className="role-toggle-buttons">
        <button
          className={state.view === 'supervisor' ? 'active' : ''}
          onClick={() => setDashboardMode && setDashboardMode('supervisor')}
        >
          Supervisor View
        </button>
        <button
          className={state.view === 'developer' ? 'active' : ''}
          onClick={() => setDashboardMode && setDashboardMode('developer')}
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
          currentPage={state.currentPage}
          selectedProject={state.selectedProject}
          projects={projectNames}
          onViewSwitch={handleViewSwitch}
          onPageChange={handlePageChange}
          onProjectSelect={handleProjectSelect}
          onLogout={handleLogout}
          isAdmin={!!isAdmin}
          hasSupervisor={(supervisorProjects || []).length > 0}
          hasDeveloper={(developerProjects || []).length > 0}
        />
        <main className="main-content">
          {roleSwitchBanner}
          {renderPage()}
        </main>
      </div>
      <DebugPanel />
    </div>
  );
};

export default App;