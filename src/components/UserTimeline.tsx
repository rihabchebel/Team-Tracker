// components/UserTimeline.tsx
import React from 'react';

export type ViewMode = 'supervisor' | 'developer';

interface UserTimelineProps {
  view: ViewMode;
  project: string;
}

const UserTimeline: React.FC<UserTimelineProps> = ({ view, project }) => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h2>{project} - User Timeline</h2>
        <span className="project-description">Activity and timeline view</span>
      </div>
      <div className="content-area">
        <p>User timeline content goes here...</p>
      </div>
    </div>
  );
};

export default UserTimeline;