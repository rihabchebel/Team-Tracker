// App.tsx
import React, { useState } from 'react';
import './App.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import UserManagement from './components/UserManagement';
import ProjectSettings from './components/ProjectSettings';
import UserTimeline from './components/UserTimeline';
import AllTasks from './components/AllTasks';

export type ViewMode = 'supervisor' | 'developer';
export type PageType = 'users' | 'timeline' | 'settings' | 'tasks';

interface AppState {
  view: ViewMode;
  currentPage: PageType;
  selectedProject: string;
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    view: 'supervisor',
    currentPage: 'tasks',
    selectedProject: 'All Tasks'
  });

  const handleViewSwitch = (view: ViewMode) => {
    setState({ ...state, view });
  };

  const handlePageChange = (page: PageType) => {
    setState({ ...state, currentPage: page });
  };

  const handleProjectSelect = (project: string) => {
    setState({ ...state, selectedProject: project });
    // Navigate to appropriate page based on project
    if (project === 'All Tasks') {
      setState(prev => ({ ...prev, currentPage: 'tasks' }));
    } else {
      setState(prev => ({ ...prev, currentPage: 'users' }));
    }
  };

  const renderPage = () => {
    switch (state.currentPage) {
      case 'users':
        return <UserManagement view={state.view} project={state.selectedProject} />;
      case 'timeline':
        return <UserTimeline view={state.view} project={state.selectedProject} />;
      case 'settings':
        return <ProjectSettings view={state.view} project={state.selectedProject} />;
      case 'tasks':
        return <AllTasks view={state.view} project={state.selectedProject} />;
      default:
        return <AllTasks view={state.view} project={state.selectedProject} />;
    }
  };

  return (
    <div className="app-container">
      <Header user="Guest" email="guest@localhost" />
      <div className="main-layout">
        <Sidebar
          view={state.view}
          currentPage={state.currentPage}
          selectedProject={state.selectedProject}
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