// components/UserTimeline.tsx
import React, { useState, useEffect } from 'react';
import { formatDate } from '../utils/dateUtils';
import { Briefcase, Flag, FileText, Calendar } from 'lucide-react';
import './UserTimeline.css';
import { ViewMode, User, Project } from '../types/models';

interface TimelineEvent {
  id: string;
  project: string;
  subProject?: string;
  user: string;
  date: string;
  hours: number;
  type: 'work' | 'leave' | 'milestone';
  description: string;
}

interface UserTimelineProps {
  view: ViewMode;
  project: string;
  users: User[];
  projectsData: Project[];
}

const UserTimeline: React.FC<UserTimelineProps> = ({ 
  project, 
  users, 
  projectsData 
}) => {
  const [selectedUser, setSelectedUser] = useState<string>('All users');
  const [selectedProject, setSelectedProject] = useState<string>(
    project === 'All Projects' ? 'All projects' : project
  );

  // Update when project prop changes from App
  useEffect(() => {
    if (project === 'All Projects') {
      setSelectedProject('All projects');
    } else {
      setSelectedProject(project);
    }
  }, [project]);

  // Build project users mapping
  const projectUsers: Record<string, string[]> = projectsData.reduce((acc, projectData) => {
    acc[projectData.name] = projectData.teamMembers.map(member => member.name);
    return acc;
  }, {} as Record<string, string[]>);

  const allUsers = ['All users', ...Array.from(new Set(users.map(user => user.name)))];
  const allProjects = ['All projects', ...projectsData.map((p) => p.name)];

 
  // Generate timeline events based on selected project and user
  const getTimelineEvents = (): TimelineEvent[] => {
    const events: TimelineEvent[] = [];
    const months = ['Mar 26', 'Apr 26', 'May 26', 'Jun 26'];
    const types: ('work' | 'leave' | 'milestone')[] = ['work', 'work', 'work', 'leave', 'milestone'];
    const descriptions = [
      'Completed sprint tasks',
      'Code review',
      'Meeting with team',
      'Bug fixes',
      'Feature development',
      'Documentation',
      'Testing',
      'Deployment',
      'Client meeting',
      'Design review'
    ];

    // Get users for the selected project
    let usersList: string[] = [];
    if (selectedProject === 'All projects') {
      // Get all users from all projects
      Object.values(projectUsers).forEach((projectUserList) => {
        projectUserList.forEach((user) => {
          if (!usersList.includes(user)) {
            usersList.push(user);
          }
        });
      });
    } else if (projectUsers[selectedProject]) {
      usersList = projectUsers[selectedProject];
    }

    // Filter by user
    if (selectedUser !== 'All users') {
      usersList = usersList.filter(u => u === selectedUser);
    }

    // Generate events for each user
    usersList.forEach((user) => {
      const numEvents = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < numEvents; i++) {
        const monthIndex = Math.floor(Math.random() * months.length);
        const day = 1 + Math.floor(Math.random() * 28);
        const type = types[Math.floor(Math.random() * types.length)];
        const description = descriptions[Math.floor(Math.random() * descriptions.length)];
        
        // Determine which project this event belongs to
        let eventProject = selectedProject;
        if (selectedProject === 'All projects') {
          // Assign to a random project the user is part of
          const userProjects = Object.keys(projectUsers).filter(p => 
            projectUsers[p].includes(user)
          );
          eventProject = userProjects.length > 0 
            ? userProjects[Math.floor(Math.random() * userProjects.length)]
            : 'Project Beta';
        }

        events.push({
          id: `${user}-${i}-${Date.now()}-${Math.random()}`,
          project: eventProject,
          subProject: ['Design', 'Development', 'Testing', 'UI/UX', 'Backend', 'Frontend'][Math.floor(Math.random() * 6)],
          user: user,
          date: `${months[monthIndex]} ${day}`,
          hours: 1 + Math.floor(Math.random() * 8),
          type: type,
          description: description
        });
      }
    });

    // Sort by date
    events.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });

    return events;
  };

  const timelineEvents = getTimelineEvents();

  // Group events by month
  const groupedEvents: Record<string, TimelineEvent[]> = {};
  timelineEvents.forEach(event => {
    const month = event.date.split(' ')[0] + ' ' + event.date.split(' ')[1];
    if (!groupedEvents[month]) {
      groupedEvents[month] = [];
    }
    groupedEvents[month].push(event);
  });

  // Get unique users for the selected project
  const getAvailableUsers = () => {
    if (selectedProject === 'All projects') {
      return allUsers;
    }
    return ['All users', ...(projectUsers[selectedProject] || [])];
  };

  // Get unique projects for the selected user
  const getAvailableProjects = () => {
    if (selectedUser === 'All users') {
      return allProjects;
    }
    // Find which projects the selected user belongs to
    const userProjects = Object.keys(projectUsers).filter(p => 
      projectUsers[p].includes(selectedUser)
    );
    return ['All projects', ...userProjects];
  };

  const getTypeIcon = (type: string) => {
    const iconProps = {
      size: 16,
      className: "type-icon"
    };
    
    switch(type) {
      case 'work':
        return <Briefcase {...iconProps} />;
      case 'leave':
        return <Calendar {...iconProps} />;
      case 'milestone':
        return <Flag {...iconProps} />;
      default:
        return <FileText {...iconProps} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'work':
        return '#4f72e8';
      case 'leave':
        return '#ff6b6b';
      case 'milestone':
        return '#fdcb6e';
      default:
        return '#8888aa';
    }
  };

  // Get users for the current selected project (for sidebar display)
  const getProjectUsers = () => {
    if (selectedProject === 'All projects') {
      return [];
    }
    return projectUsers[selectedProject] || [];
  };

  return (
    <div className="user-timeline">
      <div className="page-header">
        <div className="page-header-content">
          <div>
            <h2>{project}</h2>
            <span className="project-description">
              {project === 'All projects' ? 'All projects overview' : 
               project === 'Project Alpha' ? 'Main product development sprint' :
               project === 'Project Beta' ? 'Client portal redesign' :
               project === 'Service VAS' ? 'Test description' : 'Project overview'}
            </span>
          </div>
        </div>
      </div>

      <div className="timeline-content">
        <div className="timeline-header">
          <h3>User Timeline</h3>
          <p className="timeline-subtitle">
            A bird's-eye view of every team member's involvement across projects and sub-projects.
          </p>
        </div>

        {/* Filters */}
        <div className="timeline-filters">
          <div className="filter-group">
            <label>User</label>
            <select 
              value={selectedUser} 
              onChange={(e) => setSelectedUser(e.target.value)}
              className="filter-select"
            >
              {getAvailableUsers().map((user) => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>All projects</label>
            <select 
              value={selectedProject} 
              onChange={(e) => setSelectedProject(e.target.value)}
              className="filter-select"
            >
              {getAvailableProjects().map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Timeline */}
        <div className="timeline-container">
          {Object.keys(groupedEvents).length === 0 ? (
            <div className="no-events">
              <p>No timeline events found for the selected filters.</p>
            </div>
          ) : (
            Object.keys(groupedEvents).map((month) => (
              <div key={month} className="timeline-month">
                <div className="month-header">
                  <span className="month-label">{month}</span>
                </div>
                <div className="timeline-events">
                  {groupedEvents[month].map((event, index) => (
                    <div key={event.id} className="timeline-event">
                      <div className="event-line">
                        <div className="event-dot" style={{ background: getTypeColor(event.type) }} />
                        {index < groupedEvents[month].length - 1 && (
                          <div className="event-connector" />
                        )}
                      </div>
                      <div className="event-card">
                        <div className="event-header">
                          <span className="event-user">{event.user}</span>
                          <span className="event-date">{formatDate(event.date)}</span>
                        </div>
                        <div className="event-body">
                          <span className="event-icon">{getTypeIcon(event.type)}</span>
                          <div className="event-details">
                            <span className="event-description">{event.description}</span>
                            <span className="event-project">{event.project}</span>
                            {event.subProject && (
                              <span className="event-subproject">→ {event.subProject}</span>
                            )}
                          </div>
                          <span className="event-hours">{event.hours}h</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Project Users Sidebar */}
        {selectedProject !== 'All projects' && getProjectUsers().length > 0 && (
          <div className="project-users-sidebar">
            <h4>{selectedProject}</h4>
            <ul>
              {getProjectUsers().map((user) => (
                <li key={user}>{user}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserTimeline;