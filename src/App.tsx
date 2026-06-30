// App.tsx
import React, { useState, useEffect } from 'react';
import './App.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import UserManagement from './components/UserManagement';
import ProjectSettings from './components/ProjectSettings';
import UserTimeline from './components/UserTimeline';
import AllTasks from './components/AllTasks';
import PerformanceDashboard from './components/PerformanceDashboard';
import DeveloperDashboard from './components/DeveloperDashboard';
import { ViewMode, PageType, User, Project, LogEntry } from './types/models';
import { dataService } from './lib/dataService';

interface AppState {
  view: ViewMode;
  currentPage: PageType;
  selectedProject: string;
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    view: 'supervisor',
    currentPage: 'dashboard', 
    selectedProject: 'All Projects'
  });

  const [isLoading, setIsLoading] = useState(true);
  const [projectsData, setProjectsData] = useState<Project[]>([]);
  const [usersData, setUsersData] = useState<User[]>([]);
  const [taskLogs, setTaskLogs] = useState<LogEntry[]>([]);

  // Load data from service
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const { users, projects, logs } = await dataService.getAllData();
        setUsersData(users);
        setProjectsData(projects);
        setTaskLogs(logs);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const currentProjectData = projectsData.find((p) => p.name === state.selectedProject) || projectsData[0];

  // Reconcile helper: ensure `usersData` reflects roles/project assignments in `projectsData`
  const reconcileUsersWithProjects = (projects: Project[], users: User[], preferredProjectName?: string) => {
    return users.map(u => {
      if (u.project) {
        const proj = projects.find(p => p.name === u.project);
        const member = proj?.teamMembers.find(m => m.id === u.id);
        if (member) return { ...u, role: member.role, project: proj!.name };
      }

      if (preferredProjectName) {
        const proj = projects.find(p => p.name === preferredProjectName);
        const member = proj?.teamMembers.find(m => m.id === u.id);
        if (member) return { ...u, role: member.role, project: proj!.name };
      }

      for (const proj of projects) {
        const member = proj.teamMembers.find(m => m.id === u.id);
        if (member) {
          return { ...u, role: member.role, project: proj.name };
        }
      }

      return u;
    });
  };

  // Sync users when projects change
  useEffect(() => {
    if (projectsData.length > 0 && usersData.length > 0) {
      setUsersData(prev => reconcileUsersWithProjects(projectsData, prev, state.selectedProject));
    }
  }, [projectsData, state.selectedProject]);

  // Derive current user based on active view
  const deriveCurrentUser = () => {
    if (!currentProjectData || isLoading) return { name: 'Guest', email: 'guest@localhost' };

    const preferredRole = state.view === 'supervisor' ? 'Supervisor' : 'Developer';
    let member = currentProjectData.teamMembers.find((m) => m.role === preferredRole);
    if (!member) member = currentProjectData.teamMembers[0];
    const name = member?.name || 'Guest';
    const email = usersData.find((u) => u.name === name)?.email || 'guest@localhost';
    return { name, email };
  };

  const { name: currentUserName, email: currentUserEmail } = deriveCurrentUser();

  const handleAddTaskLog = (log: Omit<LogEntry, 'id' | 'submittedAt'>) => {
    const newLog: LogEntry = {
      ...log,
      id: Date.now().toString(),
      submittedAt: new Date().toISOString(),
    };

    setTaskLogs((prevLogs) => [newLog, ...prevLogs]);
    setProjectsData((prevProjects) => prevProjects.map((projectData) => {
      if (projectData.name === log.project) {
        return {
          ...projectData,
          usedHours: projectData.usedHours + log.hoursWorked,
        };
      }
      return projectData;
    }));

    dataService.createLog({
      ...log,
      submittedById: '1',
    }).catch(console.error);

    return newLog;
  };

  const handleViewSwitch = (view: ViewMode) => {
    setState({ ...state, view });
  };

  const handlePageChange = (page: PageType) => {
    setState({ ...state, currentPage: page });
  };

  const handleProjectSelect = (project: string) => {
    setState({ 
      ...state, 
      selectedProject: project,
      currentPage: 'dashboard'
    });
  };

  const handleProjectsUpdate = (updatedProjects: Project[]) => {
    setProjectsData(updatedProjects);
    setUsersData(prevUsers => reconcileUsersWithProjects(updatedProjects, prevUsers, state.selectedProject));
    const stillExists = updatedProjects.some(p => p.name === state.selectedProject);
    if (!stillExists && updatedProjects.length > 0) {
      setState({ ...state, selectedProject: 'All Projects' });
    }
  };

  const handleUsersUpdate = (updatedUsers: User[]) => {
    const renames: { id: string; oldName: string; newName: string }[] = [];
    updatedUsers.forEach((u) => {
      const prev = usersData.find(p => p.id === u.id);
      if (prev && prev.name !== u.name) {
        renames.push({ id: u.id, oldName: prev.name, newName: u.name });
      }
    });

    const reconciled = reconcileUsersWithProjects(projectsData, updatedUsers, state.selectedProject);
    setUsersData(reconciled);

    if (renames.length > 0) {
      setTaskLogs(prevLogs => prevLogs.map(log => {
        const found = renames.find(r => r.oldName === log.submittedBy);
        return found ? { ...log, submittedBy: found.newName } : log;
      }));

      setProjectsData(prevProjects => prevProjects.map(project => ({
        ...project,
        teamMembers: project.teamMembers.map(m => {
          const r = renames.find(rr => rr.id === m.id);
          return r ? { ...m, name: r.newName } : m;
        })
      })));
    }

    updatedUsers.forEach(async (user) => {
      await dataService.updateUser(user.id, user).catch(console.error);
    });
  };

  const renderPage = () => {
    if (isLoading) {
      return <div className="loading">Loading...</div>;
    }

    // If in developer view and on dashboard, show DeveloperDashboard
    if (state.view === 'developer' && state.currentPage === 'dashboard') {
      const effectiveProject = state.selectedProject === 'All Projects' 
        ? (projectsData[0]?.name || '') 
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
      case 'dashboard':
        return (
          <PerformanceDashboard 
            view={state.view} 
            project={state.selectedProject}
            users={usersData}
            projectsData={projectsData}
          />
        );
      case 'users':
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
      case 'timeline':
        return (
          <UserTimeline
            view={state.view}
            project={state.selectedProject}
            users={usersData}
            projectsData={projectsData}
          />
        );
      case 'settings':
        return <ProjectSettings 
          view={state.view} 
          project={state.selectedProject}
          projectsData={projectsData}
          onProjectsUpdate={handleProjectsUpdate}
        />;
      case 'tasks':
        return <AllTasks view={state.view} project={state.selectedProject} projectsData={projectsData} usersData={usersData} taskLogs={taskLogs} />;
      default:
        return (
          <PerformanceDashboard 
            view={state.view} 
            project={state.selectedProject}
            users={usersData}
            projectsData={projectsData}
          />
        );
    }
  };

  // Get project names for sidebar
  const projectNames = ['All Projects', ...projectsData.map(p => p.name)];

  return (
    <div className="app-container">
      <Header user={currentUserName} email={currentUserEmail} />
      <div className="main-layout">
        <Sidebar
          view={state.view}
          currentPage={state.currentPage}
          selectedProject={state.selectedProject}
          projects={projectNames}
          onViewSwitch={handleViewSwitch}
          onPageChange={handlePageChange}
          onProjectSelect={handleProjectSelect}
        />
        <main className="main-content">
          {renderPage()}
          <div className="lovable-credit">Edit with Lovable</div>
        </main>
      </div>
    </div>
  );
};

export default App;