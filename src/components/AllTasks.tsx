// components/AllTasks.tsx
import React, { useState, useEffect } from 'react';
import './AllTasks.css';
import { /*ViewMode,*/ Project, User } from '../types/models';

export type ViewMode = 'supervisor' | 'developer';

interface Task {
  id: string;
  description: string;
}

interface LogEntry {
  id: string;
  project: string;
  date: string;
  status: 'full' | 'partial' | 'unavailable';
  hoursWorked: number;
  tasks: Task[];
  partialReason?: string;
  unavailableReason?: string;
  submittedBy: string;
  submittedAt: string;
}

interface AllTasksProps {
  view: ViewMode;
  project: string;
  projectsData?: Project[];
  usersData?: User[];
}

// Global storage for logs - in a real app, this would be an API/database
// This is shared across components
const initialTaskLogs: LogEntry[] = [
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
];

export const taskLogs: LogEntry[] = [...initialTaskLogs];

// Function to add a log entry (called from DeveloperDashboard)
export const addTaskLog = (log: Omit<LogEntry, 'id' | 'submittedAt'>) => {
  const newLog: LogEntry = {
    ...log,
    id: Date.now().toString(),
    submittedAt: new Date().toISOString(),
  };
  taskLogs.unshift(newLog); // Add to beginning for newest first
  return newLog;
};

// Function to get all logs
export const getTaskLogs = (): LogEntry[] => {
  return taskLogs;
};

// Function to get logs for a specific project
export const getProjectLogs = (projectName: string): LogEntry[] => {
  return taskLogs.filter(log => log.project === projectName);
};

const AllTasks: React.FC<AllTasksProps> = ({ /*view,*/ project, projectsData, usersData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>(project || 'All Projects');
  const [selectedUser, setSelectedUser] = useState<string>('All Users');

  // Sync selectedProject when parent project prop changes
  useEffect(() => {
    if (project) setSelectedProject(project);
  }, [project]);

  // Get all unique users (prefer usersData if provided)
  const getUniqueUsers = () => {
    if (usersData && usersData.length > 0) {
      return ['All Users', ...usersData.map(u => u.name)];
    }
    const users = new Set<string>();
    taskLogs.forEach(log => users.add(log.submittedBy));
    return ['All Users', ...Array.from(users)];
  };

  // Get all unique projects (prefer projectsData if provided)
  const getUniqueProjects = () => {
    if (projectsData && projectsData.length > 0) {
      return ['All Projects', ...projectsData.map(p => p.name)];
    }
    const projects = new Set<string>();
    taskLogs.forEach(log => projects.add(log.project));
    return ['All Projects', ...Array.from(projects)];
  };

  // Filter logs based on search, project, and user
  useEffect(() => {
    let filtered = taskLogs;

    // Filter by project
    if (selectedProject && selectedProject !== 'All Projects') {
      filtered = filtered.filter(log => log.project === selectedProject);
    }

    // Filter by user
    if (selectedUser && selectedUser !== 'All Users') {
      filtered = filtered.filter(log => log.submittedBy === selectedUser);
    }

    // Filter by search term (search in task descriptions)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(log => 
        log.tasks.some(task => task.description.toLowerCase().includes(term)) ||
        log.project.toLowerCase().includes(term) ||
        log.submittedBy.toLowerCase().includes(term)
      );
    }

    setFilteredLogs(filtered);
  }, [searchTerm, selectedProject, selectedUser]);

  // Get stats
  const totalTasks = filteredLogs.reduce((sum, log) => sum + log.tasks.length, 0);
  const totalHours = filteredLogs.reduce((sum, log) => sum + log.hoursWorked, 0);
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
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Search is reactive via searchTerm state and useEffect,
      // so Enter simply confirms the current query.

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
        {/* Stats Cards */}
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

        {/* Filters */}
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

        {/* Log Entries */}
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
                      {log.submittedBy.charAt(0).toUpperCase()}
                    </div>
                    <div className="log-user-details">
                      <span className="log-user-name">{log.submittedBy}</span>
                      <span className="log-project-name">{log.project}</span>
                    </div>
                  </div>
                  <div className="log-meta">
                    <span className={`log-status ${getStatusBadgeClass(log.status)}`}>
                      {getStatusLabel(log.status)}
                    </span>
                    <span className="log-hours">{log.hoursWorked}h</span>
                    <span className="log-date">{formatDate(log.date)}</span>
                  </div>
                </div>

                <div className="log-body">
                  {log.tasks.length > 0 ? (
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
                    Submitted {formatTime(log.submittedAt)}
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