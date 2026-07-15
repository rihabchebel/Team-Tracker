// pages/DeveloperDashboard.tsx - All TypeScript errors fixed

import React, { useState, useEffect } from "react";
import "./DeveloperDashboard.css";
import { Plus, Trash2, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { Project, ProjectTimelineEvent, LogEntry } from "../types/models";
import { supabase } from "../lib/supabase"; // ✅ Fixed: using supabase.ts (not supabaseClient)

export type ViewMode = "supervisor" | "developer";

export interface Task {
  id: string;
  description: string;
  completed?: boolean;
}

interface DeveloperDashboardProps {
  view: ViewMode;
  project: string;
  currentUser: string;
  projectData?: Project | null;
  timelineEvents?: ProjectTimelineEvent[];
  onAddTaskLog: (
    log: Omit<LogEntry, "id" | "submittedAt">
  ) => void | Promise<void>;
  onProjectsUpdate?: (projects: Project[]) => void;
  onTaskComplete?: () => void;
}

const DeveloperDashboard: React.FC<DeveloperDashboardProps> = ({
  project,
  currentUser,
  projectData,
  onAddTaskLog,
  onProjectsUpdate,
  onTaskComplete,
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
  const [supervisorNotes, setSupervisorNotes] = useState<any[]>([]);
  const [, setIsLoadingNotes] = useState(false);

  // ✅ Check if project has isCompleted property (using type assertion with proper checking)
  const projectIsCompleted = (projectData as any)?.is_completed || false;
  // ✅ Removed unused projectCompletedAt variable

  // ✅ Load supervisor notes
  useEffect(() => {
    if (projectData?.id) {
      loadSupervisorNotes();
    }
  }, [projectData]);

  const loadSupervisorNotes = async () => {
    if (!projectData?.id) return;
    setIsLoadingNotes(true);
    try {
      const { data, error } = await supabase
        .from('supervisor_notes')
        .select('*')
        .eq('project_id', projectData.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSupervisorNotes(data || []);
    } catch (error) {
      console.error('Error loading supervisor notes:', error);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  const handleAddTask = () => {
    const taskDescription = newTask.trim() || "Describe task...";
    const newTaskObj: Task = {
      id: Date.now().toString(),
      description: taskDescription,
      completed: false,
    };
    setTasks((prevTasks) => [...prevTasks, newTaskObj]);
    setNewTask("");
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter((task) => task.id !== taskId));
  };

  const handleToggleTaskComplete = (taskId: string) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId 
          ? { ...task, completed: !task.completed }
          : task
      )
    );
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

    const completedTasks = tasks.filter(t => t.completed);
    const totalTasks = tasks.length;

    const logData: Omit<LogEntry, "id" | "submittedAt"> = {
      project: project,
      projectName: project,
      date: selectedDate,
      status: status,
      hoursWorked: status === "unavailable" ? 0 : hoursWorked,
      tasks: tasks,
      partialReason: status === "partial" ? partialReason : undefined,
      unavailableReason:
        status === "unavailable" ? unavailableReason : undefined,
      submittedBy: currentUser,
      submittedById: "",
      projectId: projectData?.id || "",
    };

    try {
      await onAddTaskLog(logData);

      // ✅ If all tasks are completed, mark project as completed
      if (totalTasks > 0 && completedTasks.length === totalTasks) {
        await handleProjectComplete();
      }

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

  const handleProjectComplete = async () => {
    if (!projectData?.id) return;
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectData.id);

      if (error) throw error;

      // Update local state
      if (onProjectsUpdate) {
        const { data: refreshedProjects } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: true });
        
        if (refreshedProjects) {
          onProjectsUpdate(refreshedProjects);
        }
      }

      if (onTaskComplete) {
        onTaskComplete();
      }

      alert("🎉 All tasks completed! Project marked as complete.");
    } catch (error) {
      console.error('Error completing project:', error);
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
            {projectIsCompleted && (
              <span className="project-completed-badge">✅ Completed</span>
            )}
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
                    <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                      <button
                        type="button"
                        className="task-checkbox"
                        onClick={() => handleToggleTaskComplete(task.id)}
                      >
                        {task.completed ? (
                          <CheckCircle size={16} className="checked" />
                        ) : (
                          <div className="checkbox-empty" />
                        )}
                      </button>
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

              {tasks.length > 0 && (
                <div className="task-progress">
                  <span>
                    Progress: {tasks.filter(t => t.completed).length}/{tasks.length} tasks completed
                  </span>
                  <div className="task-progress-bar">
                    <div 
                      className="task-progress-fill"
                      style={{ 
                        width: `${(tasks.filter(t => t.completed).length / tasks.length) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Supervisor Notes */}
          {supervisorNotes.length > 0 && (
            <div className="supervisor-notes-section">
              <h4>Supervisor Notes</h4>
              {supervisorNotes.map((note) => (
                <div key={note.id} className="supervisor-note-item">
                  <div className="note-header">
                    <span className="note-type">{note.note_type}</span>
                    <span className="note-date">
                      {new Date(note.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="note-text">{note.note_text}</p>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            className="save-log-btn"
            onClick={handleSaveLog}
            disabled={isSubmitting || projectIsCompleted}
          >
            {isSubmitting ? "Saving..." : projectIsCompleted ? "Project Complete" : "Save Log"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeveloperDashboard;