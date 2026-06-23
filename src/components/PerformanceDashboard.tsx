// components/PerformanceDashboard.tsx
import React, { useState } from 'react';
import './PerformanceDashboard.css';

export type ViewMode = 'supervisor' | 'developer';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  memberSince: string;
  activeHours: number;
  status: 'Active' | 'Left' | 'On Leave';
}

interface ProjectData {
  id: string;
  name: string;
  description: string;
  budget: number;
  hoursSpent: number;
  teamMembers: TeamMember[];
}

interface PerformanceDashboardProps {
  view: ViewMode;
  project: string;
}

interface HeatmapDetailData {
  noteKey: string;
  memberName: string;
  date: string;
  hoursWorked: number;
  tasksCompleted: string[];
  supervisorNotes: string;
  addedSupervisorNotes: string[];
  newSupervisorNote: string;
  status: 'full' | 'partial' | 'unavailable' | 'no-log';
  role: string;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ view, project }) => {
  const [activeTab, setActiveTab] = useState<'heatmap' | 'roster' | 'analytics'>('roster');
  const [selectedCell, setSelectedCell] = useState<HeatmapDetailData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [addedSupervisorNotesByCell, setAddedSupervisorNotesByCell] = useState<Record<string, string[]>>({});

  const userManagementTeamMembers: TeamMember[] = [
    { id: '1', name: 'Alice Johnson', email: 'alice@example.com', role: 'Supervisor', memberSince: 'Apr 14, 2026', activeHours: 32, status: 'Active' },
    { id: '2', name: 'Bob Smith', email: 'bob@example.com', role: 'Developer', memberSince: 'Apr 14, 2026', activeHours: 80, status: 'Active' },
    { id: '3', name: 'Carol Davis', email: 'carol@example.com', role: 'Developer', memberSince: 'Apr 14, 2026', activeHours: 63, status: 'Active' },
    { id: '4', name: 'Dave Wilson', email: 'dave@example.com', role: 'Developer', memberSince: 'Apr 14, 2026', activeHours: 34, status: 'Active' },
    { id: '5', name: 'Eve Martinez', email: 'eve@example.com', role: 'Supervisor', memberSince: 'Apr 14, 2026', activeHours: 46, status: 'Active' },
    { id: '6', name: 'Frank Brown', email: 'frank@example.com', role: 'Developer', memberSince: 'Apr 14, 2026', activeHours: 27, status: 'Left' },
    { id: '7', name: 'Guest', email: 'guest@local', role: 'Developer', memberSince: 'Jun 22, 2026', activeHours: 8, status: 'Active' },
  ];

  const getTeamMembers = (memberIds: string[]) =>
    memberIds
      .map((memberId) => userManagementTeamMembers.find((member) => member.id === memberId))
      .filter((member): member is TeamMember => Boolean(member));

  const projectData: Record<string, ProjectData> = {
    'Project Alpha': {
      id: '1',
      name: 'Project Alpha',
      description: 'Main product development sprint',
      budget: 500,
      hoursSpent: 224,
      teamMembers: getTeamMembers(['1', '2', '3', '6'])
    },
    'Project Beta': {
      id: '2',
      name: 'Project Beta',
      description: 'Client portal redesign',
      budget: 300,
      hoursSpent: 150,
      teamMembers: getTeamMembers(['5', '4', '7'])
    },
    'Service VAS': {
      id: '3',
      name: 'Service VAS',
      description: 'Test description',
      budget: 300,
      hoursSpent: 89,
      teamMembers: getTeamMembers(['1', '4', '5', '6'])
    },
    'test': {
      id: '4',
      name: 'test',
      description: 'Test project',
      budget: 100,
      hoursSpent: 45,
      teamMembers: getTeamMembers(['5', '2', '6'])
    },
    'All Tasks': {
      id: '5',
      name: 'All Tasks',
      description: 'All tasks overview',
      budget: 0,
      hoursSpent: 0,
      teamMembers: userManagementTeamMembers
    }
  };

  const currentProject = projectData[project] || projectData['Project Beta'];
  const { teamMembers, budget, hoursSpent } = currentProject;

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Active':
        return 'status-active';
      case 'Left':
        return 'status-left';
      case 'On Leave':
        return 'status-on-leave';
      default:
        return '';
    }
  };

  const getInitials = (name: string) => {
    return name.charAt(0);
  };

  const budgetPercentage = budget > 0 ? Math.round((hoursSpent / budget) * 100) : 0;

  // Deterministic pseudo-random utilities so heatmap doesn't change every render
  const hashString = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  };

  const randFromSeed = (seed: number) => {
    // simple LCG-style transformation, deterministic for the same seed
    const a = 9301, c = 49297, m = 233280;
    return ((seed * a + c) % m) / m;
  };

  // Determine cell status based on member data and deterministic generation
  const getCellStatus = (member: TeamMember, dayIndex: number): 'full' | 'partial' | 'unavailable' | 'no-log' => {
    if (member.activeHours === 0 || member.status === 'Left') {
      return 'no-log';
    }
    const seed = hashString(`${member.id}|${dayIndex}|${project}`);
    const rand = randFromSeed(seed);
    // Weighted distribution: 40% full, 35% partial, 25% unavailable
    if (rand < 0.40) {
      return 'full';
    } else if (rand < 0.75) {
      return 'partial';
    } else {
      return 'unavailable';
    }
  };

  // Get hours based on status (deterministic)
  const getHoursForStatus = (status: string, member: TeamMember, dayIndex: number): number => {
    const seed = hashString(`${member.id}|hours|${dayIndex}|${status}|${project}`);
    const r = randFromSeed(seed);
    switch (status) {
      case 'full':
        return 6 + Math.floor(r * 3); // 6-8 hours
      case 'partial':
        return 2 + Math.floor(r * 3); // 2-4 hours
      case 'unavailable':
      case 'no-log':
        return 0;
      default:
        return 0;
    }
  };

  // Get tasks based on status
  const getTasksForStatus = (status: string, member: TeamMember, dayIndex: number): string[] => {
    const mockTasks = [
      'RTEST',
      'Feature development',
      'Bug fixes',
      'Code review',
      'Documentation',
      'Testing',
      'Deployment',
      'Meeting',
      'Design review',
      'Sprint planning',
      'Client call',
      'Code refactoring',
      'Database optimization',
      'API development',
      'UI implementation'
    ];
    
    const seedBase = hashString(`${member.id}|tasks|${dayIndex}|${status}|${project}`);
    let r = randFromSeed(seedBase);
    let numTasks = 0;
    if (status === 'full') {
      numTasks = 2 + Math.floor(r * 3); // 2-4 tasks
    } else if (status === 'partial') {
      numTasks = 1 + Math.floor(r * 2); // 1-2 tasks
    } else {
      numTasks = 0;
    }

    const tasksCompleted: string[] = [];
    const usedTasks = new Set<string>();
    for (let i = 0; i < numTasks; i++) {
      // change seed slightly per pick to avoid duplicates deterministically
      const pickSeed = seedBase + i * 1315423911;
      const pickRand = randFromSeed(pickSeed);
      const idx = Math.floor(pickRand * mockTasks.length);
      const task = mockTasks[idx];
      if (!usedTasks.has(task)) {
        usedTasks.add(task);
        tasksCompleted.push(task);
      }
    }
    return tasksCompleted;
  };

  // Get supervisor notes based on status
  const getSupervisorNotes = (status: string, member: TeamMember, dayIndex: number): string => {
    const notesMap: Record<string, string[]> = {
      'full': [
        'Excellent work, keep it up!',
        'Great progress on tasks.',
        'Consistent performance.',
        'Meeting all deadlines.',
        'Outstanding contribution.'
      ],
      'partial': [
        'Good effort, try to log more hours.',
        'Partial availability noted.',
        'Consider increasing work hours.',
        'Balancing multiple priorities.',
        'Productive despite limited hours.'
      ],
      'unavailable': [
        'No work logged for this day.',
        'Day off or unavailable.',
        'Please ensure you log your availability.',
        'No activity recorded.',
        'Unavailable - please update status.'
      ],
      'no-log': [
        'No logs available for this day.',
        'Please log your availability.',
        'Missing data for this date.',
        'No activity recorded.'
      ]
    };
    const notes = notesMap[status] || notesMap['no-log'];
    const seed = hashString(`${member.id}|notes|${dayIndex}|${status}|${project}`);
    const idx = Math.floor(randFromSeed(seed) * notes.length);
    return notes[idx];
  };

 const handleCellClick = (
  member: TeamMember,
  dayIndex: number,
  status: 'full' | 'partial' | 'unavailable' | 'no-log'
) => {
  const hoursWorked = getHoursForStatus(status, member, dayIndex);
  const tasksCompleted = getTasksForStatus(status, member, dayIndex);
  const noteKey = `${project}|${member.id}|${dayIndex}`;
  const supervisorNotes = getSupervisorNotes(status, member, dayIndex);
  const addedSupervisorNotes = addedSupervisorNotesByCell[noteKey] ?? [];

  const today = new Date();
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() - (29 - dayIndex));

  const formattedDate = targetDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const detailData: HeatmapDetailData = {
    noteKey,
    memberName: member.name,
    date: formattedDate,
    hoursWorked,
    tasksCompleted,
    supervisorNotes,
    addedSupervisorNotes,
    newSupervisorNote: '',
    status,
    role: member.role
  };

  setSelectedCell(detailData);
  setIsModalOpen(true);
};

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCell(null);
  };

  const handleNewSupervisorNoteChange = (note: string) => {
    setSelectedCell((current) => current ? { ...current, newSupervisorNote: note } : current);
  };

  const handleAddSupervisorNote = () => {
    if (!selectedCell || !selectedCell.newSupervisorNote.trim()) {
      return;
    }

    const note = selectedCell.newSupervisorNote.trim();
    const nextNotes = [...selectedCell.addedSupervisorNotes, note];

    setSelectedCell({
      ...selectedCell,
      addedSupervisorNotes: nextNotes,
      newSupervisorNote: ''
    });
    setAddedSupervisorNotesByCell((notes) => ({
      ...notes,
      [selectedCell.noteKey]: nextNotes
    }));
  };
  

  return (
    <div className="performance-dashboard">
      <div className="page-header">
        <div className="page-header-content">
          <div>
            <h2>{project}</h2>
            <span className="project-description">{currentProject.description}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-header">
          <h3>Performance Dashboard</h3>
          <div className="dashboard-tabs">
            <button 
              className={`tab-btn ${activeTab === 'heatmap' ? 'active' : ''}`}
              onClick={() => setActiveTab('heatmap')}
            >
              Heatmap
            </button>
            <button 
              className={`tab-btn ${activeTab === 'roster' ? 'active' : ''}`}
              onClick={() => setActiveTab('roster')}
            >
              Team Roster
            </button>
            <button 
              className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              Analytics
            </button>
          </div>
        </div>
        
        {activeTab === 'analytics' && (
          <div className="budget-section">
            <div className="budget-info">
              <span className="budget-label">Budget vs Hours Spent</span>
              <span className="budget-value">
                <span className="hours-spent">{hoursSpent}h</span>
                <span className="budget-separator">/</span>
                <span className="budget-total">{budget}h</span>
                <span className="budget-percentage">({budgetPercentage}%)</span>
              </span>
            </div>
            <div className="budget-bar">
              <div 
                className="budget-bar-fill" 
                style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
              />
            </div>
          </div>
        )}

        {activeTab === 'roster' && (
          <div className="roster-section">
            <div className="table-container">
              <table className="roster-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Member Since</th>
                    <th>Active Hours</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((member) => (
                    <tr key={member.id}>
                      <td className="member-cell">
                        <div className="member-avatar">
                          {getInitials(member.name)}
                        </div>
                        {member.name}
                      </td>
                      <td>{member.email}</td>
                      <td>
                        <span className={`role-badge ${member.role === 'Supervisor' ? 'role-supervisor' : 'role-developer'}`}>
                          {member.role}
                        </span>
                      </td>
                      <td>{member.memberSince}</td>
                      <td>{member.activeHours}h</td>
                      <td>
                        <span className={`status-badge ${getStatusBadgeClass(member.status)}`}>
                          {member.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'heatmap' && (
          <div className="heatmap-section">
            <h4>Availability Heatmap (Last 30 Working Days)</h4>
            <div className="heatmap-placeholder">
              <div className="heatmap-members">
                {teamMembers.slice(0, 8).map((member) => (
                  <div key={member.id} className="heatmap-member">
                    <span className="member-name">
                      <span className="member-name-text">
                        {member.name}
                        {member.status === 'Left' && <span className="member-status-left"> (left)</span>}
                      </span>
                      {member.role === 'Supervisor' && (
                        <span className="member-role-badge supervisor-badge">Supervisor</span>
                      )}
                    </span>
                    <div className="heatmap-row">
                      {Array.from({ length: 30 }, (_, i) => {
                        const status = getCellStatus(member, i);
                        return (
                          <div 
                            key={i} 
                            className={`heatmap-cell ${status}`}
                            onClick={() => handleCellClick(member, i, status)}
                            title={`${member.name} - ${status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}`}
                            style={{ cursor: 'pointer' }}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="heatmap-legend">
                <span className="legend-label">Legend:</span>
                <span className="legend-item full">Full</span>
                <span className="legend-item partial">Partial</span>
                <span className="legend-item unavailable">Unavailable</span>
                <span className="legend-item no-log">No Log</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="analytics-section">
            <h4>Developer Stats</h4>
            <div className="stats-grid">
              {teamMembers.map((member) => (
                <div key={member.id} className="stat-card">
                  <div className="stat-card-header">
                    <div className="stat-avatar">
                      {getInitials(member.name)}
                    </div>
                    <div className="stat-info">
                      <span className="stat-name">{member.name}</span>
                      <span className="stat-role">{member.role}</span>
                    </div>
                  </div>
                  <div className="stat-details">
                    <div className="stat-item">
                      <span className="stat-label">Hours</span>
                      <span className="stat-value">{member.activeHours}h</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Status</span>
                      <span className={`stat-status ${member.status === 'Active' ? 'status-active' : 'status-left'}`}>
                        {member.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Heatmap Detail Modal */}
      {isModalOpen && selectedCell && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal heatmap-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-info">
                <h3>{selectedCell.memberName}</h3>
                {selectedCell.role === 'Supervisor' && (
                  <span className="role-badge-small supervisor-badge">Supervisor</span>
                )}
                <span className={`status-badge-small ${selectedCell.status}`}>
                  {selectedCell.status.charAt(0).toUpperCase() + selectedCell.status.slice(1).replace('-', ' ')}
                </span>
              </div>
              <button className="close-btn" onClick={closeModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-item detail-date">
                <span className="detail-value">{selectedCell.date}</span>
              </div>

              <div className="detail-item detail-hours">
                <span className="detail-value hours-value-large">
                  {selectedCell.hoursWorked}
                </span>
                <span className="detail-label">hours worked</span>
              </div>

              <div className="detail-item detail-tasks">
                <span className="detail-label">Tasks Completed</span>
                <div className="task-tags">
                  {selectedCell.tasksCompleted.map((task, index) => (
                    <span key={index} className="task-tag">{task}</span>
                  ))}
                  {selectedCell.tasksCompleted.length === 0 && (
                    <span className="no-tasks">No tasks completed</span>
                  )}
                </div>
              </div>

              <div className="detail-item detail-notes">
                <span className="detail-label">Supervisor Notes</span>
                <p className="notes-text">{selectedCell.supervisorNotes}</p>

                {selectedCell.addedSupervisorNotes.length > 0 && (
                  <>
                    {selectedCell.addedSupervisorNotes.map((note, index) => (
                      <p key={`${selectedCell.noteKey}-${index}`} className="notes-text added-note-text">
                        {note}
                      </p>
                    ))}
                  </>
                )}

                {view === 'supervisor' && (
                  <>
                    <textarea
                      className="notes-text notes-input"
                      value={selectedCell.newSupervisorNote}
                      onChange={(e) => handleNewSupervisorNoteChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddSupervisorNote();
                        }
                      }}
                      placeholder="Write a new supervisor note..."
                    />
                  </>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="mark-read-btn" onClick={closeModal}>
                Mark as Read
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceDashboard;
