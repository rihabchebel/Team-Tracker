// components/DeveloperDashboard.tsx
import React, { useState } from 'react';
import './DeveloperDashboard.css';

export type ViewMode = 'supervisor' | 'developer';

interface DeveloperDashboardProps {
  view: ViewMode;
  project: string;
}

interface Task {
  id: string;
  description: string;
}

const DeveloperDashboard: React.FC<DeveloperDashboardProps> = ({ /*view,*/ project }) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<'full' | 'partial' | 'unavailable'>('full');
  const [hoursWorked, setHoursWorked] = useState<number>(8);
  const [tasks, setTasks] = useState<Task[]>([]); // Empty array - no default task
  const [newTask, setNewTask] = useState('');

  const handleAddTask = () => {
    const taskDescription = newTask.trim() || 'Describe task...';
    const newTaskObj = {
      id: Date.now().toString(),
      description: taskDescription
    };
    setTasks(prevTasks => [...prevTasks, newTaskObj]);
    setNewTask('');
    console.log('Task added:', newTaskObj);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTask();
    }
  };

  const handleSaveLog = () => {
    // Save the log entry
    console.log('Log saved:', {
      project,
      date: selectedDate,
      status,
      hoursWorked,
      tasks
    });
    alert('Log saved successfully!');
  };

  return (
    <div className="developer-dashboard">
      {/* Project Header */}
      <div className="dashboard-header">
        <div className="project-info">
          <h2>{project}</h2>
          <span className="project-description">Main product development sprint</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-content">
        {/* Log Your Availability Section */}
        <div className="availability-section">
          <h3>Log Your Availability</h3>
          
          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="date-input"
            />
          </div>

          <div className="form-group">
            <label>Status</label>
            <div className="status-buttons">
              <button
                type="button"
                className={`status-btn ${status === 'full' ? 'active full' : ''}`}
                onClick={() => setStatus('full')}
              >
                Full
              </button>
              <button
                type="button"
                className={`status-btn ${status === 'partial' ? 'active partial' : ''}`}
                onClick={() => setStatus('partial')}
              >
                Partial
              </button>
              <button
                type="button"
                className={`status-btn ${status === 'unavailable' ? 'active unavailable' : ''}`}
                onClick={() => setStatus('unavailable')}
              >
                Unavailable
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Hours Worked (max 8)</label>
            <div className="hours-input-container">
              <input
                type="range"
                min="0"
                max="8"
                value={hoursWorked}
                onChange={(e) => setHoursWorked(Number(e.target.value))}
                className="hours-slider"
              />
              <span className="hours-value">{hoursWorked}h</span>
            </div>
          </div>

          {/* Tasks Section */}
          <div className="tasks-section">
            <h4>Completed Tasks</h4>
            <div className="task-list">
              {tasks.length === 0 ? (
                <div className="empty-tasks-message">
                  No tasks added yet. Add a task below.
                </div>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="task-item">
                    <span className="task-description">
                      {task.description}
                    </span>
                    <button
                      type="button"
                      className="delete-task-btn"
                      onClick={() => handleDeleteTask(task.id)}
                      aria-label="Delete task description"
                    >
                      &times;
                    </button>
                  </div>
                ))
              )}
              <div className="add-task-row">
                <input
                  type="text"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder="Describe task..."
                  className="task-input"
                  onKeyDown={handleKeyDown}
                />
                <button
                  type="button"
                  className="add-task-btn"
                  onClick={handleAddTask}
                >
                  + Add Task
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="save-log-btn"
            onClick={handleSaveLog}
          >
            Save Log
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeveloperDashboard;