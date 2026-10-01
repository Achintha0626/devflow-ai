import { useState } from "react";
import { formatTaskLabel, STATUS_TRANSITIONS } from "../tasks/taskUtils";
import { KanbanCard } from "./KanbanCard";

export function KanbanColumn({
  status,
  tasks,
  draggedTask,
  pendingTaskIds,
  onMove,
  onDragStart,
  onDragEnd,
}) {
  const [isDropTarget, setIsDropTarget] = useState(false);
  const acceptsDraggedTask = Boolean(
    draggedTask
      && !pendingTaskIds.has(draggedTask.id)
      && STATUS_TRANSITIONS[draggedTask.status]?.includes(status)
  );

  const handleDragOver = (event) => {
    if (!acceptsDraggedTask) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setIsDropTarget(true);
  };

  const handleDragLeave = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setIsDropTarget(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDropTarget(false);
    if (!acceptsDraggedTask) return;

    const taskId = event.dataTransfer.getData("text/plain");
    const task = tasks.find((item) => item.id === taskId) || draggedTask;
    if (task && task.status !== status) onMove(task, status);
  };

  return (
    <section
      className={`kanban-column${isDropTarget && acceptsDraggedTask ? " is-drop-target" : ""}`}
      aria-label={`${formatTaskLabel(status)} column, ${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <header className="kanban-column__header">
        <h2>{formatTaskLabel(status)}</h2>
        <span className="kanban-column__count">{tasks.length}</span>
      </header>
      <div className="kanban-column__cards">
        {tasks.length === 0 ? (
          <p className="kanban-column__empty">No tasks</p>
        ) : tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            pending={pendingTaskIds.has(task.id)}
            onMove={onMove}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
      </div>
    </section>
  );
}