// src/lib/testDB.ts
import { User, Project, LogEntry } from '../types/models';

// Mock data for development
let mockUsers: User[] = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com', created: '14/04/2026', role: 'Supervisor', project: 'Project Alpha' },
  { id: '2', name: 'Bob Smith', email: 'bob@example.com', created: '14/04/2026', role: 'Developer', project: 'Project Alpha' },
  { id: '3', name: 'Carol Davis', email: 'carol@example.com', created: '14/04/2026', role: 'Developer', project: 'Project Beta' },
  { id: '4', name: 'Dave Wilson', email: 'dave@example.com', created: '14/04/2026', role: 'Developer', project: 'Project Beta' },
  { id: '5', name: 'Eve Martinez', email: 'eve@example.com', created: '14/04/2026', role: 'Supervisor', project: 'Service VAS' },
  { id: '6', name: 'Frank Brown', email: 'frank@example.com', created: '14/04/2026', role: 'Developer', project: 'Service VAS' },
  { id: '7', name: 'Guest', email: 'guest@local', created: '22/06/2026', role: 'Developer' },
];

let mockProjects: Project[] = [
  {
    id: '1',
    name: 'Project Alpha',
    description: 'Main product development sprint',
    totalHours: 500,
    usedHours: 0,
    subProjects: [
      { id: 'sp2', name: 'Design Phase', timeUsed: 0, timeTotal: 150 },
      { id: 'sp3', name: 'Development', timeUsed: 0, timeTotal: 250 },
      { id: 'sp4', name: 'Testing', timeUsed: 0, timeTotal: 100 },
    ],
    teamMembers: [
      { id: '1', name: 'Alice Johnson', role: 'Supervisor', joined: '2026-03-15' },
      { id: '2', name: 'Bob Smith', role: 'Developer', joined: '2026-03-15' },
      { id: '3', name: 'Carol Davis', role: 'Developer', joined: '2026-03-15', left: '2026-05-20' },
    ]
  },
  {
    id: '2',
    name: 'Project Beta',
    description: 'Client portal redesign',
    totalHours: 300,
    usedHours: 0,
    subProjects: [
      { id: 'sp6', name: 'UI/UX Design', timeUsed: 0, timeTotal: 80 },
      { id: 'sp7', name: 'Frontend Dev', timeUsed: 0, timeTotal: 120 },
      { id: 'sp8', name: 'Backend Dev', timeUsed: 0, timeTotal: 100 },
    ],
    teamMembers: [
      { id: '3', name: 'Carol Davis', role: 'Supervisor', joined: '2026-03-15' },
      { id: '4', name: 'Dave Wilson', role: 'Developer', joined: '2026-03-15' },
      { id: '1', name: 'Alice Johnson', role: 'Developer', joined: '2026-03-15', left: '2026-05-20' },
    ]
  },
  {
    id: '3',
    name: 'Service VAS',
    description: 'Test description',
    totalHours: 300,
    usedHours: 0,
    subProjects: [
      { id: 'sp1', name: 'T', timeUsed: 0, timeTotal: 10 },
      { id: 'sp10', name: 'Infrastructure', timeUsed: 0, timeTotal: 100 },
      { id: 'sp11', name: 'Integration', timeUsed: 0, timeTotal: 120 },
      { id: 'sp12', name: 'Testing', timeUsed: 0, timeTotal: 70 },
    ],
    teamMembers: [
      { id: '5', name: 'Eve Martinez', role: 'Supervisor', joined: '2026-03-15' },
      { id: '6', name: 'Frank Brown', role: 'Developer', joined: '2026-03-15' },
      { id: '4', name: 'Dave Wilson', role: 'Developer', joined: '2026-03-15', left: '2026-05-20' },
    ]
  },
  {
    id: '4',
    name: 'TMA',
    description: 'B2C',
    totalHours: 200,
    usedHours: 0,
    subProjects: [
      { id: 'sp14', name: 'Research', timeUsed: 0, timeTotal: 60 },
      { id: 'sp15', name: 'Implementation', timeUsed: 0, timeTotal: 140 },
    ],
    teamMembers: [
      { id: '7', name: 'Guest', role: 'Supervisor', joined: '2026-03-15' },
      { id: '1', name: 'Alice Johnson', role: 'Developer', joined: '2026-03-15', left: '2026-05-20' },
    ]
  }
];

let mockLogs: LogEntry[] = [
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
  }
];

// Data service with mock implementation
export const testDB = {
  // Users
  getUsers: async (): Promise<User[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...mockUsers]), 100);
    });
  },

  createUser: async (user: Omit<User, 'id'>): Promise<User> => {
    const newUser = { ...user, id: Date.now().toString() };
    mockUsers.push(newUser);
    return new Promise((resolve) => {
      setTimeout(() => resolve(newUser), 100);
    });
  },

  updateUser: async (id: string, updates: Partial<User>): Promise<User> => {
    const index = mockUsers.findIndex(u => u.id === id);
    if (index !== -1) {
      mockUsers[index] = { ...mockUsers[index], ...updates };
    }
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockUsers[index]), 100);
    });
  },

  deleteUser: async (id: string): Promise<void> => {
    const index = mockUsers.findIndex(u => u.id === id);
    if (index !== -1) {
      mockUsers.splice(index, 1);
    }
    return new Promise((resolve) => {
      setTimeout(() => resolve(), 100);
    });
  },

  // Projects
  getProjects: async (): Promise<Project[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...mockProjects]), 100);
    });
  },

  getProjectByName: async (name: string): Promise<Project | null> => {
    const project = mockProjects.find(p => p.name === name);
    return new Promise((resolve) => {
      setTimeout(() => resolve(project ? { ...project } : null), 100);
    });
  },

  createProject: async (project: Omit<Project, 'id'>): Promise<Project> => {
    const newProject = { ...project, id: Date.now().toString() };
    mockProjects.push(newProject);
    return new Promise((resolve) => {
      setTimeout(() => resolve(newProject), 100);
    });
  },

  updateProject: async (id: string, updates: Partial<Project>): Promise<Project> => {
    const index = mockProjects.findIndex(p => p.id === id);
    if (index !== -1) {
      mockProjects[index] = { ...mockProjects[index], ...updates };
    }
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockProjects[index]), 100);
    });
  },

  deleteProject: async (id: string): Promise<void> => {
    const index = mockProjects.findIndex(p => p.id === id);
    if (index !== -1) {
      mockProjects.splice(index, 1);
    }
    return new Promise((resolve) => {
      setTimeout(() => resolve(), 100);
    });
  },

  // Logs
  getLogs: async (): Promise<LogEntry[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...mockLogs]), 100);
    });
  },

  createLog: async (log: Omit<LogEntry, 'id' | 'submittedAt'>): Promise<LogEntry> => {
    const newLog: LogEntry = {
      ...log,
      id: Date.now().toString(),
      submittedAt: new Date().toISOString(),
    };
    mockLogs.unshift(newLog);
    return new Promise((resolve) => {
      setTimeout(() => resolve(newLog), 100);
    });
  },

  // Team Members
  addTeamMember: async (projectId: string, member: any): Promise<Project> => {
    const project = mockProjects.find(p => p.id === projectId);
    if (project) {
      project.teamMembers.push(member);
    }
    return new Promise((resolve) => {
      setTimeout(() => resolve(project!), 100);
    });
  },

  removeTeamMember: async (projectId: string, memberId: string): Promise<Project> => {
    const project = mockProjects.find(p => p.id === projectId);
    if (project) {
      project.teamMembers = project.teamMembers.filter(m => m.id !== memberId);
    }
    return new Promise((resolve) => {
      setTimeout(() => resolve(project!), 100);
    });
  },

  // Sub Projects
  addSubProject: async (projectId: string, subProject: any): Promise<Project> => {
    const project = mockProjects.find(p => p.id === projectId);
    if (project) {
      project.subProjects.push(subProject);
      project.totalHours += subProject.timeTotal;
    }
    return new Promise((resolve) => {
      setTimeout(() => resolve(project!), 100);
    });
  },

  updateSubProject: async (projectId: string, subProjectId: string, updates: any): Promise<Project> => {
    const project = mockProjects.find(p => p.id === projectId);
    if (project) {
      const subProject = project.subProjects.find(sp => sp.id === subProjectId);
      if (subProject) {
        const oldTotal = subProject.timeTotal;
        Object.assign(subProject, updates);
        project.totalHours = project.totalHours - oldTotal + subProject.timeTotal;
        project.usedHours = project.subProjects.reduce((sum, sp) => sum + sp.timeUsed, 0);
      }
    }
    return new Promise((resolve) => {
      setTimeout(() => resolve(project!), 100);
    });
  },

  deleteSubProject: async (projectId: string, subProjectId: string): Promise<Project> => {
    const project = mockProjects.find(p => p.id === projectId);
    if (project) {
      const subProject = project.subProjects.find(sp => sp.id === subProjectId);
      if (subProject) {
        project.totalHours -= subProject.timeTotal;
        project.usedHours -= subProject.timeUsed;
        project.subProjects = project.subProjects.filter(sp => sp.id !== subProjectId);
      }
    }
    return new Promise((resolve) => {
      setTimeout(() => resolve(project!), 100);
    });
  },
};

// Export a hook for using the test database
export const useTestDB = () => {
  return testDB;
};