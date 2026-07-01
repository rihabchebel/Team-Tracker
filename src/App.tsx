// App.tsx - Fixed version
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
  // ============================================================
  // ✅ ALL HOOKS MUST BE CALLED AT THE TOP LEVEL
  // ============================================================
  
  // 1. Auth hook
  const { user, loading: authLoading, signOut } = useAuth();
  
  // 2. State hooks
  const [state, setState] = useState<AppState>({
    view: "supervisor",
    currentPage: "dashboard",
    selectedProject: "All Projects",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [projectsData, setProjectsData] = useState<Project[]>([]);
  const [usersData, setUsersData] = useState<User[]>([]);
  const [taskLogs, setTaskLogs] = useState<LogEntry[]>([]);

  // 3. useEffect for data loading
  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
      try {
        setIsLoading(true);
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
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user]);

  // 4. useEffect for syncing users
  useEffect(() => {
    if (projectsData.length > 0 && usersData.length > 0) {
      // This function needs to be defined before use
      const reconciled = usersData.map((u) => {
        if (u.project) {
          const proj = projectsData.find((p) => p.name === u.project);
          const member = proj?.teamMembers.find((m) => m.id === u.id);
          if (member) return { ...u, role: member.role, project: proj!.name };
        }
        // ... rest of reconciliation logic
        return u;
      });
      setUsersData(reconciled);
    }
  }, [projectsData, state.selectedProject]);

  // 5. Helper functions can be defined after hooks
  // (They're not hooks, so they can be anywhere)
  const currentProjectData =
    projectsData.find((p) => p.name === state.selectedProject) ||
    projectsData[0];

  const deriveCurrentUser = () => {
    if (!currentProjectData || isLoading)
      return { name: user?.user_metadata?.name || "Guest", email: user?.email || "guest@localhost" };

    const preferredRole =
      state.view === "supervisor" ? "Supervisor" : "Developer";
    let member = currentProjectData.teamMembers.find(
      (m) => m.role === preferredRole,
    );
    if (!member) member = currentProjectData.teamMembers[0];
    const name = member?.name || user?.user_metadata?.name || "Guest";
    const email = usersData.find((u) => u.name === name)?.email || user?.email || "guest@localhost";
    return { name, email };
  };

  const { name: currentUserName, email: currentUserEmail } =
    deriveCurrentUser();

  // ============================================================
  // ✅ NOW conditional returns are safe - ALL hooks are already called
  // ============================================================
  
  // Show loading screen while checking auth
  if (authLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // If not authenticated, show login
  if (!user) {
    return <Login />;
  }

  // ============================================================
  // The rest of the component (event handlers, render logic)
  // ============================================================
  
  // Handlers
  const handleAddTaskLog = (log: Omit<LogEntry, "id" | "submittedAt">) => {
    const newLog: LogEntry = {
      ...log,
      id: Date.now().toString(),
      submittedAt: new Date().toISOString(),
    };

    setTaskLogs((prevLogs) => [newLog, ...prevLogs]);
    setProjectsData((prevProjects) =>
      prevProjects.map((projectData) => {
        if (projectData.name === log.project) {
          return {
            ...projectData,
            usedHours: projectData.usedHours + log.hoursWorked,
          };
        }
        return projectData;
      }),
    );

    dataService
      .createLog({
        ...log,
        submittedById: user?.id || "1",
      })
      .catch(console.error);

    return newLog;
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

  const handleProjectsUpdate = (updatedProjects: Project[]) => {
    setProjectsData(updatedProjects);
    setUsersData((prevUsers) => {
      // Reconciliation logic here
      return prevUsers;
    });
    const stillExists = updatedProjects.some(
      (p) => p.name === state.selectedProject,
    );
    if (!stillExists && updatedProjects.length > 0) {
      setState({ ...state, selectedProject: "All Projects" });
    }
  };

  const handleUsersUpdate = (updatedUsers: User[]) => {
    setUsersData(updatedUsers);
    updatedUsers.forEach(async (user) => {
      await dataService.updateUser(user.id, user).catch(console.error);
    });
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setProjectsData([]);
      setUsersData([]);
      setTaskLogs([]);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Render page based on current state
  const renderPage = () => {
    if (isLoading) {
      return <div className="loading">Loading...</div>;
    }

    if (state.view === "developer" && state.currentPage === "dashboard") {
      const effectiveProject =
        state.selectedProject === "All Projects"
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
          />
        );
    }
  };

  const projectNames = projectsData.map((p) => p.name);

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
        />
        <main className="main-content">{renderPage()}</main>
      </div>
      <DebugPanel />
    </div>
  );
};

export default App;