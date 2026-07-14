// pages/AllTasks.tsx
import React, { useState, useEffect } from 'react';
import './AllTasks.css';
import { ViewMode, Project, User, LogEntry } from '../types/models';
import { formatDate, formatTime } from '../utils/dateUtils';

interface AllTasksProps {
  view: ViewMode;
  project: string;
  projectsData?: Project[];
  usersData?: User[];
  taskLogs: LogEntry[];
}

const AllTasks: React.FC<AllTasksProps> = ({ 
  project, 
  taskLogs = [] 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>(
    project === 'All Projects' ? 'All Projects' : project
  );
  const [selectedUser, setSelectedUser] = useState<string>('All Users');

  // Get unique users from actual data
  const getUniqueUsers = () => {
    const userSet = new Set<string>();
    taskLogs.forEach(log => {
      if (log.submittedBy) userSet.add(log.submittedBy);
    });
    return ['All Users', ...Array.from(userSet)];
  };

  // Get unique projects from actual data
  const getUniqueProjects = () => {
    const projectSet = new Set<string>();
    taskLogs.forEach(log => {
      if (log.project) projectSet.add(log.project);
    });
    return ['All Projects', ...Array.from(projectSet)];
  };

  // Update filtered logs when filters change
  useEffect(() => {
    let filtered = taskLogs;

    if (selectedProject && selectedProject !== 'All Projects') {
      filtered = filtered.filter(log => log.project === selectedProject);
    }

    if (selectedUser && selectedUser !== 'All Users') {
      filtered = filtered.filter(log => log.submittedBy === selectedUser);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(log => 
        log.tasks?.some(task => task.description?.toLowerCase().includes(term)) ||
        log.project?.toLowerCase().includes(term) ||
        log.submittedBy?.toLowerCase().includes(term)
      );
    }

    setFilteredLogs(filtered);
  }, [searchTerm, selectedProject, selectedUser, taskLogs]);

  // Reset selected project when prop changes
  useEffect(() => {
    if (project === 'All Projects') {
      setSelectedProject('All Projects');
    } else {
      setSelectedProject(project);
    }
  }, [project]);

  const totalTasks = filteredLogs.reduce((sum, log) => sum + (log.tasks?.length || 0), 0);
  const totalHours = filteredLogs.reduce((sum, log) => sum + (log.hoursWorked || 0), 0);
  const totalEntries = filteredLogs.length;

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'full':
        return 'status-full';
      case 'partial':
        return 'status-partial';
      case 'unavailable':
        return 'status-unavailable';
      default:
        return '';
    }
  };

  const getStatusLabel = (status: string) => {
    return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  return (
    <div className="all-tasks">
      <div className="page-header">
        <div className="page-header-content">
          <div>
            <h2>All Tasks</h2>
            <span className="project-description">
              A unified view of every task logged across projects
            </span>
          </div>
        </div>
      </div>

      <div className="all-tasks-content">
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-number">{totalEntries}</div>
            <div className="stat-label">Log Entries</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{totalTasks}</div>
            <div className="stat-label">Tasks Completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{totalHours.toFixed(1)}</div>
            <div className="stat-label">Hours Worked</div>
          </div>
        </div>

        <div className="filters-section">
          <div className="filter-group">
            <label>Project</label>
            <select 
              value={selectedProject} 
              onChange={(e) => setSelectedProject(e.target.value)}
              className="filter-select"
            >
              {getUniqueProjects().map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>User</label>
            <select 
              value={selectedUser} 
              onChange={(e) => setSelectedUser(e.target.value)}
              className="filter-select"
            >
              {getUniqueUsers().map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div className="filter-group search-group">
            <label>Search tasks...</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search tasks..."
              className="search-input"
            />
          </div>
        </div>

        <div className="logs-container">
          {filteredLogs.length === 0 ? (
            <div className="empty-state">
              <p>No tasks logged yet. Tasks will appear here once developers submit their logs.</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="log-entry">
                <div className="log-header">
                  <div className="log-user-info">
                    <div className="log-user-avatar">
                      {log.submittedBy?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="log-user-details">
                      <span className="log-user-name">{log.submittedBy || 'Unknown'}</span>
                      <span className="log-project-name">{log.project || 'No Project'}</span>
                    </div>
                  </div>
                  <div className="log-meta">
                    <span className={`log-status ${getStatusBadgeClass(log.status)}`}>
                      {getStatusLabel(log.status)}
                    </span>
                    <span className="log-hours">{log.hoursWorked || 0}h</span>
                    <span className="log-date">{formatDate(log.date)}</span>
                  </div>
                </div>

                <div className="log-body">
                  {log.tasks && log.tasks.length > 0 ? (
                    <div className="log-tasks">
                      {log.tasks.map((task) => (
                        <span key={task.id} className="log-task-tag">
                          {task.description}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="no-tasks-text">No tasks completed</span>
                  )}
                  
                  {log.partialReason && (
                    <div className="log-reason">
                      <span className="reason-label">Partial Reason:</span>
                      <span className="reason-text">{log.partialReason}</span>
                    </div>
                  )}
                  {log.unavailableReason && (
                    <div className="log-reason">
                      <span className="reason-label">Unavailable Reason:</span>
                      <span className="reason-text">{log.unavailableReason}</span>
                    </div>
                  )}
                </div>

                <div className="log-footer">
                  <span className="log-submitted">
                    Submitted {log.submittedAt ? formatTime(log.submittedAt) : 'Unknown'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AllTasks;