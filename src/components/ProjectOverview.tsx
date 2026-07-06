// components/ProjectOverview.tsx
import React from 'react';
import { Project } from '../types/models';
import './ProjectOverview.css';

interface Props {
  project: Project | null;
}

const ProjectOverview: React.FC<Props> = ({ project }) => {
  if (!project) return null;

  const supervisors = project.teamMembers.filter(
    (m) => m.role?.toLowerCase() === 'supervisor',
  ).length;

  const teamCount = project.teamMembers.length;

  return (
    <div className="project-overview">
      <h4 className="po-title">Project Overview</h4>
      <div className="po-row">
        <div className="po-label">Description</div>
        <div className="po-value">{project.description || '—'}</div>
      </div>
      <div className="po-row">
        <div className="po-label">Status</div>
        <div className="po-value">{project.status}</div>
      </div>
      <div className="po-row">
        <div className="po-label">Priority</div>
        <div className="po-value">{project.priority}</div>
      </div>
      <div className="po-row">
        <div className="po-label">Team Members</div>
        <div className="po-value">{teamCount}</div>
      </div>
      <div className="po-row">
        <div className="po-label">Supervisors</div>
        <div className="po-value">{supervisors}</div>
      </div>
      <div className="po-subprojects">
        <div className="po-subprojects-title">Sub-projects</div>
        <ul>
          {project.subProjects && project.subProjects.length > 0 ? (
            project.subProjects.map((sp) => (
              <li key={sp.id} className="po-subproject-item">
                <div className="sp-name">{sp.name}</div>
                <div className="sp-hours">{sp.timeUsed}/{sp.timeTotal}h</div>
              </li>
            ))
          ) : (
            <li className="po-subproject-item">No sub-projects</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default ProjectOverview;
