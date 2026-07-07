// components/ProjectOverview.tsx
import React from 'react';
import { Project } from '../types/models';
import './ProjectOverview.css';
import { hasRole, getAllRoles, getRoleDisplayName } from '../utils/roleUtils';

interface Props {
  project: Project | null;
}

const ProjectOverview: React.FC<Props> = ({ project }) => {
  if (!project) return null;

  // ✅ FIXED: Use hasRole utility to check for supervisor
  const supervisors = project.teamMembers.filter((m) => {
    return hasRole(m.role, 'supervisor');
  }).length;

  const teamCount = project.teamMembers.length;

  // ✅ Get all unique roles for display
  const getUniqueRoles = () => {
    const roles = new Set<string>();
    project.teamMembers.forEach((m) => {
      const memberRoles = getAllRoles(m.role);
      memberRoles.forEach(r => roles.add(getRoleDisplayName(r)));
    });
    return Array.from(roles);
  };

  const uniqueRoles = getUniqueRoles();

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
      <div className="po-row">
        <div className="po-label">Roles</div>
        <div className="po-value">
          {uniqueRoles.length > 0 ? uniqueRoles.join(', ') : '—'}
        </div>
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