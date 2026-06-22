// components/ProjectSettings.tsx
import React from 'react';

export type ViewMode = 'supervisor' | 'developer';

interface ProjectSettingsProps {
  view: ViewMode;
  project: string;
}

const ProjectSettings: React.FC<ProjectSettingsProps> = ({ view, project }) => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h2>{project} - Settings</h2>
        <span className="project-description">Project configuration</span>
      </div>
      <div className="content-area">
        <p>Project settings content goes here...</p>
      </div>
    </div>
  );
};

export default ProjectSettings;