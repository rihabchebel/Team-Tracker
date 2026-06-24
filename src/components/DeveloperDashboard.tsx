// components/DeveloperDashboard.tsx
import React, { useState } from "react";
import "./DeveloperDashboard.css";

export type ViewMode = "supervisor" | "developer";

interface DeveloperDashboardProps {
  view: ViewMode;
  project: string;
  currentUser: string;
  onAddTaskLog: (log: Omit<LogEntry, 'id' | 'submittedAt'>) => void;
}

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

interface Task {
  id: string;
  description: string;
}

const DeveloperDashboard: React.FC<DeveloperDashboardProps> = ({
  /*view,*/ project,
  currentUser,
  onAddTaskLog,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [status, setStatus] = useState<"full" | "partial" | "unavailable">(
    "full",
  );
  const [hoursWorked, setHoursWorked] = useState<number>(8);
  const [partialReason, setPartialReason] = useState<string>("");
  const [unavailableReason, setUnavailableReason] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");

  const handleAddTask = () => {
    const taskDescription = newTask.trim() || "Describe task...";
    const newTaskObj = {
      id: Date.now().toString(),
      description: taskDescription,
    };
    setTasks((prevTasks) => [...prevTasks, newTaskObj]);
    setNewTask("");
    console.log("Task added:", newTaskObj);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter((task) => task.id !== taskId));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTask();
    }
  };

  // Handle Enter key for reason inputs - prevents form submission
  const handleReasonKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Move to next focusable element or blur
      const form = e.currentTarget.form;
      if (form) {
        const elements = Array.from(form.elements);
        const currentIndex = elements.indexOf(e.currentTarget);
        const nextElement = elements[currentIndex + 1] as HTMLElement;
        if (nextElement && nextElement.focus) {
          nextElement.focus();
        } else {
          e.currentTarget.blur();
        }
      }
    }
  };

  const handleSaveLog = () => {
    // Validate required fields
    if (status === "partial" && !partialReason.trim()) {
      alert("Please provide a reason for partial availability.");
      return;
    }
    if (status === "unavailable" && !unavailableReason.trim()) {
      alert("Please provide a reason for unavailability.");
      return;
    }

    const logData: Omit<LogEntry, 'id' | 'submittedAt'> = {
      project: project,
      date: selectedDate,
      status: status,
      hoursWorked: status === "unavailable" ? 0 : hoursWorked,
      tasks: status === "unavailable" ? [] : tasks,
      partialReason: status === "partial" ? partialReason : undefined,
      unavailableReason: status === "unavailable" ? unavailableReason : undefined,
      submittedBy: currentUser,
    };

    onAddTaskLog(logData);
    console.log("Log saved:", logData);
    alert("Log saved successfully!");

    // Reset form
    setTasks([]);
    setNewTask("");
    if (status === "partial") {
      setPartialReason("");
    }
    if (status === "unavailable") {
      setUnavailableReason("");
    }
  };

  return (
    <div className="developer-dashboard">
      {/* Project Header */}
      <div className="dashboard-header">
        <div className="project-info">
          <h2>{project}</h2>
          <span className="project-description">
            Main product development sprint
          </span>
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
                className={`status-btn ${status === "full" ? "active full" : ""}`}
                onClick={() => {
                  setStatus("full");
                  setPartialReason("");
                  setUnavailableReason("");
                }}
              >
                Full
              </button>
              <button
                type="button"
                className={`status-btn ${status === "partial" ? "active partial" : ""}`}
                onClick={() => {
                  setStatus("partial");
                  setUnavailableReason("");
                }}
              >
                Partial
              </button>
              <button
                type="button"
                className={`status-btn ${status === "unavailable" ? "active unavailable" : ""}`}
                onClick={() => {
                  setStatus("unavailable");
                  setPartialReason("");
                  setHoursWorked(0);
                }}
              >
                Unavailable
              </button>
            </div>
          </div>

          {status === "partial" && (
            <div className="form-group">
              <div className="reason-input-container">
                <label>Reason for Partial Availability <span className="required">*</span></label>
                <input
                  type="text"
                  value={partialReason}
                  onChange={(e) => setPartialReason(e.target.value)}
                  placeholder="Enter reason..."
                  onKeyDown={handleReasonKeyDown}
                  className="reason-input"
                />
              </div>
              <label>Hours Worked (max 8)</label>
              <div className="hours-input-container">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="8"
                  value={hoursWorked}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value)) {
                      const clampedValue = Math.min(Math.max(value, 0), 8);
                      setHoursWorked(clampedValue);
                    } else if (e.target.value === "") {
                      // Allow empty input
                    }
                  }}
                  className="hours-input"
                />
                <span className="hours-value">{hoursWorked}h</span>
              </div>
            </div>
          )}

          {status === "full" && (
            <div className="form-group">
              <label>Hours Worked</label>
              <div className="hours-input-container">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="8"
                  value={hoursWorked}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value)) {
                      const clampedValue = Math.min(Math.max(value, 0), 8);
                      setHoursWorked(clampedValue);
                    } else if (e.target.value === "") {
                      // Allow empty input
                    }
                  }}
                  className="hours-input"
                />
                <span className="hours-value">{hoursWorked}h</span>
              </div>
            </div>
          )}

          {status === "unavailable" && (
            <div className="form-group">
              <label>Reason for Unavailability <span className="required">*</span></label>
              <input
                type="text"
                value={unavailableReason}
                onChange={(e) => setUnavailableReason(e.target.value)}
                placeholder="Enter reason..."
                onKeyDown={handleReasonKeyDown}
                className="reason-input"
              />
            </div>
          )}

          {/* Tasks Section */}
          {status !== "unavailable" && (
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
              </div>

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
          )}

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