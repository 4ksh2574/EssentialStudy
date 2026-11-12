import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CalendarDays, Check, Circle, Filter,
  ListTodo, Pencil, Plus, Search, Trash2, X
} from "lucide-react";

type Priority = "Low" | "Medium" | "High";
type StudyTask = {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  priority: Priority;
  notes: string;
  completed: boolean;
  createdAt: number;
};
type FilterKey = "All" | "Today" | "Upcoming" | "Completed";
type SortKey = "priority" | "dueDate" | "createdAt" | "subject";
type Props = { subjects: string[] };

const STORAGE_KEY = "essentialstudy.tasks";

function localDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readTasks(): StudyTask[] {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is StudyTask =>
      item && typeof item === "object" &&
      typeof item.id === "string" &&
      typeof item.title === "string" &&
      typeof item.subject === "string" &&
      typeof item.dueDate === "string" &&
      ["Low", "Medium", "High"].includes(item.priority) &&
      typeof item.notes === "string" &&
      typeof item.completed === "boolean" &&
      typeof item.createdAt === "number"
    );
  } catch {
    return [];
  }
}

function formatDueDate(value: string) {
  if (!value) return "No due date";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "No due date";
  const today = localDateValue();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (value === today) return "Today";
  if (value === localDateValue(tomorrow)) return "Tomorrow";
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export default function Planner({ subjects }: Props) {
  const [tasks, setTasks] = useState<StudyTask[]>(readTasks);
  const [filter, setFilter] = useState<FilterKey>("All");
  const [sortBy, setSortBy] = useState<SortKey>("priority");
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(subjects[0] ?? "");
  const [dueDate, setDueDate] = useState(localDateValue());
  const [priority, setPriority] = useState<Priority>("Medium");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      // Keep the current session usable when browser storage is unavailable.
    }
  }, [tasks]);

  const today = localDateValue();
  const counts = useMemo(() => ({
    All: tasks.length,
    Today: tasks.filter((task) => !task.completed && task.dueDate === today).length,
    Upcoming: tasks.filter((task) => !task.completed && (!task.dueDate || task.dueDate > today)).length,
    Completed: tasks.filter((task) => task.completed).length
  }), [tasks, today]);

  const visibleTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return tasks
      .filter((task) => {
        if (filter === "Today" && (task.completed || task.dueDate !== today)) return false;
        if (filter === "Upcoming" && (task.completed || (task.dueDate && task.dueDate <= today))) return false;
        if (filter === "Completed" && !task.completed) return false;
        if (normalizedQuery && !`${task.title} ${task.subject} ${task.notes}`.toLowerCase().includes(normalizedQuery)) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
        if (sortBy === "priority") {
          const rank = { High: 0, Medium: 1, Low: 2 };
          return rank[a.priority] - rank[b.priority] ||
            (a.dueDate || "9999").localeCompare(b.dueDate || "9999") ||
            b.createdAt - a.createdAt;
        }
        if (sortBy === "dueDate") {
          return (a.dueDate || "9999").localeCompare(b.dueDate || "9999") || b.createdAt - a.createdAt;
        }
        if (sortBy === "createdAt") return b.createdAt - a.createdAt;
        return a.subject.localeCompare(b.subject, undefined, { sensitivity: "base" }) ||
          (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
      });
  }, [tasks, filter, query, today, sortBy]);

  const resetForm = () => {
    setTitle("");
    setSubject(subjects[0] ?? "");
    setDueDate(localDateValue());
    setPriority("Medium");
    setNotes("");
    setEditingId(null);
    setError("");
    setShowForm(false);
  };

  const openNewTask = () => {
    setEditingId(null);
    setTitle("");
    setSubject(subjects[0] ?? "");
    setDueDate(localDateValue());
    setPriority("Medium");
    setNotes("");
    setError("");
    setShowForm(true);
  };

  const openEditTask = (task: StudyTask) => {
    setEditingId(task.id);
    setTitle(task.title);
    setSubject(task.subject);
    setDueDate(task.dueDate);
    setPriority(task.priority);
    setNotes(task.notes);
    setError("");
    setShowForm(true);
  };

  const saveTask = (event: FormEvent) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError("Add a task title to continue.");
      return;
    }
    const cleanTask: StudyTask = {
      id: editingId ?? (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now())),
      title: cleanTitle,
      subject: subject.trim() || "General",
      dueDate,
      priority,
      notes: notes.trim(),
      completed: editingId ? tasks.find((task) => task.id === editingId)?.completed ?? false : false,
      createdAt: editingId ? tasks.find((task) => task.id === editingId)?.createdAt ?? Date.now() : Date.now()
    };
    setTasks((current) => editingId
      ? current.map((task) => task.id === editingId ? cleanTask : task)
      : [cleanTask, ...current]);
    resetForm();
  };

  const toggleComplete = (id: string) => {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, completed: !task.completed } : task));
  };

  const deleteTask = (id: string) => {
    setTasks((current) => current.filter((task) => task.id !== id));
  };

  return (
    <div className="planner-page">
      <div className="planner-heading">
        <div>
          <p className="eyebrow">YOUR PERSONAL WORKSPACE</p>
          <h1>Planner<span>.</span></h1>
          <p className="planner-intro">Keep assignments, homework and study goals in one calm place.</p>
        </div>
        <button className="primary-button planner-add-button" onClick={openNewTask}><Plus size={16} /> Add task</button>
      </div>

      <div className="planner-summary">
        <div className="planner-summary-icon"><ListTodo size={19} /></div>
        <div><strong>{tasks.filter((task) => !task.completed).length} tasks left</strong><span>{counts.Completed} completed so far</span></div>
        <div className="planner-summary-progress" aria-label={tasks.length ? `${Math.round(counts.Completed / tasks.length * 100)} percent completed` : "No tasks yet"}>
          <span style={{ width: `${tasks.length ? counts.Completed / tasks.length * 100 : 0}%` }} />
        </div>
      </div>

      <div className="planner-toolbar">
        <div className="planner-filters" role="tablist" aria-label="Filter tasks">
          {(["All", "Today", "Upcoming", "Completed"] as FilterKey[]).map((item) => (
            <button key={item} role="tab" aria-selected={filter === item} className={filter === item ? "planner-filter active" : "planner-filter"} onClick={() => setFilter(item)}>
              {item}<span>{counts[item]}</span>
            </button>
          ))}
        </div>
        <label className="planner-search">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks" aria-label="Search tasks" />
        </label>
        <label className="planner-sort">
          <span>Sort</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortKey)} aria-label="Sort tasks">
            <option value="priority">Priority</option>
            <option value="dueDate">Due date</option>
            <option value="createdAt">Date created</option>
            <option value="subject">Subject</option>
          </select>
        </label>
      </div>

      <div className="planner-list-heading">
        <div><p className="eyebrow">YOUR TASKS</p><h2>{filter === "All" ? "Everything in one place" : filter + " tasks"}</h2></div>
        <span><Filter size={14} /> {visibleTasks.length} shown</span>
      </div>

      <div className="planner-task-list">
        <AnimatePresence initial={false}>
          {visibleTasks.map((task) => {
            const overdue = !task.completed && task.dueDate && task.dueDate < today;
            return (
              <motion.article key={task.id} className={task.completed ? "planner-task completed" : "planner-task"} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, marginBottom: 0 }} transition={{ duration: 0.18 }}>
                <button className="planner-task-check" onClick={() => toggleComplete(task.id)} aria-label={task.completed ? "Mark as incomplete" : "Mark as complete"}>
                  {task.completed ? <Check size={15} /> : <Circle size={19} />}
                </button>
                <div className="planner-task-content">
                  <strong>{task.title}</strong>
                  <div className="planner-task-meta">
                    <span>{task.subject}</span>
                    <i />
                    <span className={overdue ? "due overdue" : "due"}><CalendarDays size={12} /> {overdue ? "Overdue · " : ""}{formatDueDate(task.dueDate)}</span>
                    <span className={`priority priority-${task.priority.toLowerCase()}`}>{task.priority}</span>
                  </div>
                  {task.notes && <p className="planner-task-notes">{task.notes}</p>}
                </div>
                <div className="planner-task-actions">
                  <button onClick={() => openEditTask(task)} aria-label={`Edit ${task.title}`}><Pencil size={15} /></button>
                  <button onClick={() => deleteTask(task.id)} aria-label={`Delete ${task.title}`}><Trash2 size={15} /></button>
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>
        {visibleTasks.length === 0 && (
          <div className="planner-empty">
            <span><Check size={21} /></span>
            <strong>{query ? "No matching tasks" : filter === "Completed" ? "Nothing completed yet" : "You're all caught up"}</strong>
            <p>{query ? "Try another search term." : "Add a task whenever something needs your attention."}</p>
            {!query && filter !== "Completed" && <button className="text-button" onClick={openNewTask}>Add your first task <Plus size={14} /></button>}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div className="planner-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) resetForm(); }}>
            <motion.form className="planner-modal" onSubmit={saveTask} initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} transition={{ duration: 0.2 }}>
              <div className="planner-modal-heading">
                <div><p className="eyebrow">{editingId ? "UPDATE YOUR PLAN" : "MAKE A PLAN"}</p><h2>{editingId ? "Edit task" : "Add a task"}</h2></div>
                <button type="button" className="planner-modal-close" onClick={resetForm} aria-label="Close"><X size={18} /></button>
              </div>
              <label className="planner-field">Task title<input autoFocus maxLength={120} value={title} onChange={(event) => { setTitle(event.target.value); setError(""); }} placeholder="e.g. Finish mathematics assignment" /></label>
              <div className="planner-field-grid">
                <label className="planner-field">Subject
                  {subjects.length ? <select value={subject} onChange={(event) => setSubject(event.target.value)}>{subjects.map((item) => <option key={item}>{item}</option>)}<option value="General">General</option></select> : <input maxLength={45} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="e.g. Mathematics" />}
                </label>
                <label className="planner-field">Due date<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
              </div>
              <label className="planner-field">Priority<select value={priority} onChange={(event) => setPriority(event.target.value as Priority)}><option>Low</option><option>Medium</option><option>High</option></select></label>
              <label className="planner-field">Notes <span>OPTIONAL</span><textarea rows={3} maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Add a little detail or a reminder…" /></label>
              {error && <p className="form-error" role="alert">{error}</p>}
              <div className="planner-modal-actions">
                <button type="button" className="back-button" onClick={resetForm}>Cancel</button>
                <button type="submit" className="primary-button">{editingId ? "Save changes" : "Save task"} <Check size={15} /></button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
