// components/DeveloperDashboard.tsx
import React, { useState } from "react";
import "./DeveloperDashboard.css";
import { Plus, Trash2, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { Project, ProjectTimelineEvent } from "../types/models";

export type ViewMode = "supervisor" | "developer";

interface DeveloperDashboardProps {
  view: ViewMode;
  project: string;
  currentUser: string;
  projectData?: Project | null;
  timelineEvents?: ProjectTimelineEvent[];
  onAddTaskLog: (log: Omit<LogEntry, "id" | "submittedAt">) => void;
}

interface Task {
  id: string;
  description: string;
}

interface LogEntry {
  id: string;
  project: string;
  date: string;
  status: "full" | "partial" | "unavailable";
  hoursWorked: number;
  tasks: Task[];
  partialReason?: string;
  unavailableReason?: string;
  submittedBy: string;
  submittedAt: string;
}

const DeveloperDashboard: React.FC<DeveloperDashboardProps> = ({
  project,
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddTask = () => {
    const taskDescription = newTask.trim() || "Describe task...";
    const newTaskObj = {
      id: Date.now().toString(),
      description: taskDescription,
    };
    setTasks((prevTasks) => [...prevTasks, newTaskObj]);
    setNewTask("");
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

  const handleReasonKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
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

  const handleSaveLog = async () => {
    if (status === "partial" && !partialReason.trim()) {
      alert("Please provide a reason for partial availability.");
      return;
    }
    if (status === "unavailable" && !unavailableReason.trim()) {
      alert("Please provide a reason for unavailability.");
      return;
    }

    setIsSubmitting(true);

    const logData: Omit<LogEntry, "id" | "submittedAt"> = {
      project: project,
      date: selectedDate,
      status: status,
      hoursWorked: status === "unavailable" ? 0 : hoursWorked,
      tasks: status === "unavailable" ? [] : tasks,
      partialReason: status === "partial" ? partialReason : undefined,
      unavailableReason:
        status === "unavailable" ? unavailableReason : undefined,
      submittedBy: currentUser,
    };

    try {
      await onAddTaskLog(logData);

      // Reset form
      setTasks([]);
      setNewTask("");
      if (status === "partial") {
        setPartialReason("");
      }
      if (status === "unavailable") {
        setUnavailableReason("");
      }
      setHoursWorked(8);

      alert("Log saved successfully!");
    } catch (error) {
      console.error("Error saving log:", error);
      alert("Failed to save log. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "full":
        return <CheckCircle size={16} />;
      case "partial":
        return <AlertCircle size={16} />;
      case "unavailable":
        return <XCircle size={16} />;
      default:
        return null;
    }
  };

  return (
    <div className="developer-dashboard">
      <div className="page-header">
        <div className="page-header-content">
          <div>
            <h2>{project}</h2>
          </div>
          <div className="user-info">
            <span className="user-name">{currentUser}</span>
            <span className="user-role"></span>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="availability-section">
          <h3>Log Your Availability</h3>

          <div className="form-group">
            <label>Date</label>

            <div className="date-input-wrapper">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="date-input"
              />
            </div>
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
                {getStatusIcon("full")}
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
                {getStatusIcon("partial")}
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
                {getStatusIcon("unavailable")}
                Unavailable
              </button>
            </div>
          </div>

          {status === "partial" && (
            <div className="form-group">
              <label>
                Reason for Partial Availability{" "}
                <span className="required">*</span>
              </label>
              <input
                type="text"
                value={partialReason}
                onChange={(e) => setPartialReason(e.target.value)}
                placeholder="Enter reason..."
                onKeyDown={handleReasonKeyDown}
                className="reason-input"
              />
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
              <label>
                Reason for Unavailability <span className="required">*</span>
              </label>
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
                        aria-label="Delete task"
                      >
                        <Trash2 size={14} />
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
                  <Plus size={16} />
                  Add Task
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            className="save-log-btn"
            onClick={handleSaveLog}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save Log"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeveloperDashboard;
