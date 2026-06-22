// components/AllTasks.tsx
import React from 'react';

export type ViewMode = 'supervisor' | 'developer';

interface AllTasksProps {
  view: ViewMode;
  project: string;
}

const AllTasks: React.FC<AllTasksProps> = ({ view, project }) => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h2>{project} - All Tasks</h2>
        <span className="project-description">Task management</span>
      </div>
      <div className="content-area">
        <p>All tasks content goes here...</p>
      </div>
    </div>
  );
};

export default AllTasks;