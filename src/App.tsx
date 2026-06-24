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
import { ViewMode, PageType, User, Project } from './types/models';

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
        { id: '3', name: 'Carol Davis', role: 'Supervisor', joined: '2026-03-15' , left: '2026-05-20' },
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
    // If the selected project was deleted, select the first one
    const stillExists = updatedProjects.some(p => p.name === state.selectedProject);
    if (!stillExists && updatedProjects.length > 0) {
      setState({ ...state, selectedProject: updatedProjects[0].name });
    }
  };

  const handleUsersUpdate = (updatedUsers: User[]) => {
    setUsersData(updatedUsers);
  };

  const renderPage = () => {
    // If in developer view and on dashboard, show DeveloperDashboard
    if (state.view === 'developer' && state.currentPage === 'dashboard') {
      return <DeveloperDashboard view={state.view} project={state.selectedProject} />;
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
        return <AllTasks view={state.view} project={state.selectedProject} projectsData={projectsData} usersData={usersData} />;
      default:
        return <PerformanceDashboard view={state.view} project={state.selectedProject} users={usersData} projectsData={projectsData} />;
    }
  };

  // Get project names for sidebar
  const projectNames = projectsData.map(p => p.name);

  return (
    <div className="app-container">
      <Header user="Guest" email="guest@localhost" />
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