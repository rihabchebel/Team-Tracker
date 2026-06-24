// App.tsx
import React, { useState } from 'react';
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

interface AppState {
  view: ViewMode;
  currentPage: PageType;
  selectedProject: string;
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    view: 'supervisor',
    currentPage: 'dashboard', 
    selectedProject: 'Project Beta'
  });

  // Projects state - lifted up from ProjectSettings
  const [projectsData, setProjectsData] = useState<Project[]>([
    {
      id: '1',
      name: 'Project Alpha',
      description: 'Main product development sprint',
      totalHours: 500,
      usedHours: 0,
      subProjects: [
        { id: 'sp2', name: 'Design Phase', timeUsed: 0, timeTotal: 150 },
        { id: 'sp3', name: 'Development', timeUsed: 0, timeTotal: 250 },
        { id: 'sp4', name: 'Testing', timeUsed: 0, timeTotal: 100 },
      ],
      teamMembers: [
        { id: '1', name: 'Alice Johnson', role: 'Supervisor', joined: '2026-03-15' },
        { id: '2', name: 'Bob Smith', role: 'Developer', joined: '2026-03-15' },
        { id: '3', name: 'Carol Davis', role: 'Developer', joined: '2026-03-15' , left: '2026-05-20' },
      ]
    },
    {
      id: '2',
      name: 'Project Beta',
      description: 'Client portal redesign',
      totalHours: 300,
      usedHours: 0,
      subProjects: [
        { id: 'sp6', name: 'UI/UX Design', timeUsed: 0, timeTotal: 80 },
        { id: 'sp7', name: 'Frontend Dev', timeUsed: 0, timeTotal: 120 },
        { id: 'sp8', name: 'Backend Dev', timeUsed: 0, timeTotal: 100 },
      ],
      teamMembers: [
        { id: '3', name: 'Carol Davis', role: 'Supervisor', joined: '2026-03-15' },
        { id: '4', name: 'Dave Wilson', role: 'Developer', joined: '2026-03-15' },
        { id: '1', name: 'Alice Johnson', role: 'Developer', joined: '2026-03-15' , left: '2026-05-20' },
      ]
    },
    {
      id: '3',
      name: 'Service VAS',
      description: 'Test description',
      totalHours: 300,
      usedHours: 0,
      subProjects: [
        { id: 'sp1', name: 'T', timeUsed: 0, timeTotal: 10 },
        { id: 'sp10', name: 'Infrastructure', timeUsed: 0, timeTotal: 100 },
        { id: 'sp11', name: 'Integration', timeUsed: 0, timeTotal: 120 },
        { id: 'sp12', name: 'Testing', timeUsed: 0, timeTotal: 70 },
      ],
      teamMembers: [
        { id: '5', name: 'Eve Martinez', role: 'Supervisor', joined: '2026-03-15' },
        { id: '6', name: 'Frank Brown', role: 'Developer', joined: '2026-03-15' },
        { id: '4', name: 'Dave Wilson', role: 'Developer', joined: '2026-03-15' , left: '2026-05-20' },
      ]
    },
    {
      id: '4',
      name: 'TMA',
      description: 'B2C',
      totalHours: 200,
      usedHours: 0,
      subProjects: [
        { id: 'sp14', name: 'Research', timeUsed: 0, timeTotal: 60 },
        { id: 'sp15', name: 'Implementation', timeUsed: 0, timeTotal: 140 },
      ],
      teamMembers: [
        { id: '7', name: 'Guest', role: 'Supervisor', joined: '2026-03-15' },
        { id: '1', name: 'Alice Johnson', role: 'Developer', joined: '2026-03-15' , left: '2026-05-20' },
      ]
    }
  ]);

  const [usersData, setUsersData] = useState<User[]>([
    { id: '1', name: 'Alice Johnson', email: 'alice@example.com', created: '14/04/2026', role: 'Supervisor', project: 'Project Alpha' },
    { id: '2', name: 'Bob Smith', email: 'bob@example.com', created: '14/04/2026', role: 'Developer', project: 'Project Alpha' },
    { id: '3', name: 'Carol Davis', email: 'carol@example.com', created: '14/04/2026', role: 'Developer', project: 'Project Beta' },
    { id: '4', name: 'Dave Wilson', email: 'dave@example.com', created: '14/04/2026', role: 'Developer', project: 'Project Beta' },
    { id: '5', name: 'Eve Martinez', email: 'eve@example.com', created: '14/04/2026', role: 'Supervisor', project: 'Service VAS' },
    { id: '6', name: 'Frank Brown', email: 'frank@example.com', created: '14/04/2026', role: 'Developer', project: 'Service VAS' },
    { id: '7', name: 'Guest', email: 'guest@local', created: '22/06/2026', role: 'Developer' },
  ]);

  const [taskLogs, setTaskLogs] = useState<LogEntry[]>([
    {
      id: 'log-1',
      project: 'Project Alpha',
      date: '2026-06-23',
      status: 'full',
      hoursWorked: 7,
      tasks: [
        { id: 'task-1', description: 'Finalized UI components' },
        { id: 'task-2', description: 'Reviewed PRs for dashboard' }
      ],
      submittedBy: 'Alice Johnson',
      submittedAt: '2026-06-23T16:30:00.000Z'
    },
    {
      id: 'log-2',
      project: 'Project Alpha',
      date: '2026-06-22',
      status: 'partial',
      hoursWorked: 4,
      tasks: [
        { id: 'task-3', description: 'Updated user onboarding flows' }
      ],
      partialReason: 'Client meeting took longer than expected',
      submittedBy: 'Alice Johnson',
      submittedAt: '2026-06-22T15:20:00.000Z'
    },
    {
      id: 'log-3',
      project: 'Project Beta',
      date: '2026-06-23',
      status: 'full',
      hoursWorked: 8,
      tasks: [
        { id: 'task-4', description: 'Implemented backend API endpoint' },
        { id: 'task-5', description: 'Fixed bug in auth flow' }
      ],
      submittedBy: 'Carol Davis',
      submittedAt: '2026-06-23T17:10:00.000Z'
    },
    {
      id: 'log-4',
      project: 'Project Beta',
      date: '2026-06-22',
      status: 'unavailable',
      hoursWorked: 0,
      tasks: [],
      unavailableReason: 'Out sick',
      submittedBy: 'Carol Davis',
      submittedAt: '2026-06-22T09:05:00.000Z'
    },
    {
      id: 'log-5',
      project: 'Service VAS',
      date: '2026-06-23',
      status: 'full',
      hoursWorked: 7,
      tasks: [
        { id: 'task-6', description: 'Completed integration tests' },
        { id: 'task-7', description: 'Optimized service response time' }
      ],
      submittedBy: 'Eve Martinez',
      submittedAt: '2026-06-23T14:40:00.000Z'
    },
    {
      id: 'log-6',
      project: 'Service VAS',
      date: '2026-06-22',
      status: 'partial',
      hoursWorked: 3,
      tasks: [
        { id: 'task-8', description: 'Reviewed third-party API docs' }
      ],
      partialReason: 'Waiting on environment access',
      submittedBy: 'Eve Martinez',
      submittedAt: '2026-06-22T15:50:00.000Z'
    },
    {
      id: 'log-7',
      project: 'TMA',
      date: '2026-06-23',
      status: 'full',
      hoursWorked: 8,
      tasks: [
        { id: 'task-9', description: 'Completed prototype testing' },
        { id: 'task-10', description: 'Documented user feedback' }
      ],
      submittedBy: 'Guest',
      submittedAt: '2026-06-23T18:00:00.000Z'
    },
    {
      id: 'log-8',
      project: 'TMA',
      date: '2026-06-22',
      status: 'partial',
      hoursWorked: 5,
      tasks: [
        { id: 'task-11', description: 'Worked on landing page layout' }],
      partialReason: 'Design review meeting',
      submittedBy: 'Guest',
      submittedAt: '2026-06-22T16:15:00.000Z'
    }
  ]);

  const currentProjectData = projectsData.find((p) => p.name === state.selectedProject) || projectsData[0];

  // Reconcile helper: ensure `usersData` reflects roles/project assignments in `projectsData`.
  // Preference order: user's assigned project (`user.project`), then the currently selected project, then any project.
  const reconcileUsersWithProjects = (projects: Project[], users: User[], preferredProjectName?: string) => {
    return users.map(u => {
      // 1) try user's assigned project
      if (u.project) {
        const proj = projects.find(p => p.name === u.project);
        const member = proj?.teamMembers.find(m => m.id === u.id);
        if (member) return { ...u, role: member.role, project: proj!.name };
      }

      // 2) try preferredProjectName (e.g., currently selected project)
      if (preferredProjectName) {
        const proj = projects.find(p => p.name === preferredProjectName);
        const member = proj?.teamMembers.find(m => m.id === u.id);
        if (member) return { ...u, role: member.role, project: proj!.name };
      }

      // 3) fallback: find any project containing the member
      for (const proj of projects) {
        const member = proj.teamMembers.find(m => m.id === u.id);
        if (member) {
          return { ...u, role: member.role, project: proj.name };
        }
      }

      return u;
    });
  };

  // Ensure initial sync on mount
  React.useEffect(() => {
    setUsersData(prev => reconcileUsersWithProjects(projectsData, prev, state.selectedProject));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derive current user based on active view: Developer -> Developer, Supervisor -> Supervisor
  const deriveCurrentUser = () => {
    if (!currentProjectData) return { name: 'Guest', email: 'guest@localhost' };

    const preferredRole = state.view === 'supervisor' ? 'Supervisor' : 'Developer';
    let member = currentProjectData.teamMembers.find((m) => m.role === preferredRole);
    // Fallback to any team member
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
    // Reconcile users with the updated projects, preferring the currently selected project
    setUsersData(prevUsers => reconcileUsersWithProjects(updatedProjects, prevUsers, state.selectedProject));
    // If the selected project was deleted, select the first one
    const stillExists = updatedProjects.some(p => p.name === state.selectedProject);
    if (!stillExists && updatedProjects.length > 0) {
      setState({ ...state, selectedProject: updatedProjects[0].name });
    }
  };

  const handleUsersUpdate = (updatedUsers: User[]) => {
    // Detect name changes and propagate to task logs and project members
    const renames: { id: string; oldName: string; newName: string }[] = [];
    updatedUsers.forEach((u) => {
      const prev = usersData.find(p => p.id === u.id);
      if (prev && prev.name !== u.name) {
        renames.push({ id: u.id, oldName: prev.name, newName: u.name });
      }
    });

    // Reconcile updatedUsers against current projects, preferring each user's assigned project
    const reconciled = reconcileUsersWithProjects(projectsData, updatedUsers, state.selectedProject);
    setUsersData(reconciled);

    if (renames.length > 0) {
      // Update task logs (match by previous displayed name)
      setTaskLogs(prevLogs => prevLogs.map(log => {
        const found = renames.find(r => r.oldName === log.submittedBy);
        return found ? { ...log, submittedBy: found.newName } : log;
      }));

      // Ensure project team member names also reflect the change (id-based)
      setProjectsData(prevProjects => prevProjects.map(project => ({
        ...project,
        teamMembers: project.teamMembers.map(m => {
          const r = renames.find(rr => rr.id === m.id);
          return r ? { ...m, name: r.newName } : m;
        })
      })));
    }
  };

  const renderPage = () => {
    // If in developer view and on dashboard, show DeveloperDashboard
    if (state.view === 'developer' && state.currentPage === 'dashboard') {
      return (
        <DeveloperDashboard
          view={state.view}
          project={state.selectedProject}
          currentUser={currentUserName}
          onAddTaskLog={handleAddTaskLog}
        />
      );
    }

    switch (state.currentPage) {
      case 'dashboard':
        return <PerformanceDashboard view={state.view} project={state.selectedProject} users={usersData} projectsData={projectsData} />;
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
        return <PerformanceDashboard view={state.view} project={state.selectedProject} users={usersData} projectsData={projectsData} />;
    }
  };

  // Get project names for sidebar (include All Projects)
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