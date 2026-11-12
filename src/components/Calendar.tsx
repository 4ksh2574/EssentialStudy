import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CalendarDays, Check, ChevronLeft, ChevronRight, ClipboardList,
  Flag, GraduationCap, Pencil, Plus, Trash2, X
} from "lucide-react";

type EventType = "Exam" | "Deadline" | "Event" | "Holiday";
type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  type: EventType;
  details: string;
  createdAt: number;
};
type StudyTask = {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  completed: boolean;
};

const EVENT_STORAGE_KEY = "essentialstudy.calendar.events";
const TASK_STORAGE_KEY = "essentialstudy.tasks";
const eventTypes: EventType[] = ["Exam", "Deadline", "Event", "Holiday"];
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function localDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromValue(value: string) {
  return new Date(`${value}T12:00:00`);
}

function readEvents(): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(EVENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is CalendarEvent =>
      item !== null &&
      typeof item === "object" &&
      typeof item.id === "string" &&
      typeof item.title === "string" &&
      typeof item.date === "string" &&
      eventTypes.includes(item.type) &&
      typeof item.details === "string" &&
      typeof item.createdAt === "number"
    );
  } catch {
    return [];
  }
}

function readTasks(): StudyTask[] {
  try {
    const raw = localStorage.getItem(TASK_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is StudyTask =>
      item !== null &&
      typeof item === "object" &&
      typeof item.id === "string" &&
      typeof item.title === "string" &&
      typeof item.subject === "string" &&
      typeof item.dueDate === "string" &&
      typeof item.completed === "boolean"
    );
  } catch {
    return [];
  }
}

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function buildMonthDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = new Date(month.getFullYear(), month.getMonth(), 1 - firstDay.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return {
      date,
      value: localDateValue(date),
      inCurrentMonth: date.getMonth() === month.getMonth()
    };
  });
}

function formatMonth(date: Date) {
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function formatSelectedDate(value: string) {
  return dateFromValue(value).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });
}

export default function Calendar() {
  const [events, setEvents] = useState<CalendarEvent[]>(readEvents);
  const [tasks, setTasks] = useState<StudyTask[]>(readTasks);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => localDateValue());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState(() => localDateValue());
  const [eventType, setEventType] = useState<EventType>("Event");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(events));
    } catch {
      // Keep the calendar usable for the current session if storage is unavailable.
    }
  }, [events]);

  useEffect(() => {
    const refreshTasks = () => setTasks(readTasks());
    window.addEventListener("focus", refreshTasks);
    window.addEventListener("storage", refreshTasks);
    return () => {
      window.removeEventListener("focus", refreshTasks);
      window.removeEventListener("storage", refreshTasks);
    };
  }, []);

  const monthDays = useMemo(() => buildMonthDays(month), [month]);
  const selectedTasks = useMemo(
    () => tasks.filter((task) => task.dueDate === selectedDate),
    [tasks, selectedDate]
  );
  const selectedEvents = useMemo(
    () => events.filter((event) => event.date === selectedDate).sort((a, b) => a.createdAt - b.createdAt),
    [events, selectedDate]
  );
  const eventsByDate = useMemo(() => {
    const result: Record<string, CalendarEvent[]> = {};
    events.forEach((event) => {
      (result[event.date] ??= []).push(event);
    });
    return result;
  }, [events]);
  const tasksByDate = useMemo(() => {
    const result: Record<string, StudyTask[]> = {};
    tasks.forEach((task) => {
      if (task.dueDate) (result[task.dueDate] ??= []).push(task);
    });
    return result;
  }, [tasks]);

  const moveMonth = (offset: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    setMonth(next);
    setSelectedDate(localDateValue(next));
  };

  const openNewEvent = () => {
    setEditingId(null);
    setTitle("");
    setEventDate(selectedDate);
    setEventType("Event");
    setDetails("");
    setError("");
    setShowForm(true);
  };

  const editEvent = (event: CalendarEvent) => {
    setEditingId(event.id);
    setTitle(event.title);
    setEventDate(event.date);
    setEventType(event.type);
    setDetails(event.details);
    setError("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setError("");
  };

  const saveEvent = (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle || !eventDate) {
      setError("Add a title and date to save this event.");
      return;
    }

    if (editingId) {
      setEvents((current) => current.map((event) =>
        event.id === editingId
          ? { ...event, title: cleanTitle, date: eventDate, type: eventType, details: details.trim() }
          : event
      ));
    } else {
      setEvents((current) => [{
        id: createId(),
        title: cleanTitle,
        date: eventDate,
        type: eventType,
        details: details.trim(),
        createdAt: Date.now()
      }, ...current]);
    }

    setSelectedDate(eventDate);
    const savedDate = dateFromValue(eventDate);
    setMonth(new Date(savedDate.getFullYear(), savedDate.getMonth(), 1));
    closeForm();
  };

  const deleteEvent = (id: string) => {
    setEvents((current) => current.filter((event) => event.id !== id));
    if (editingId === id) closeForm();
  };

  const today = localDateValue();

  return (
    <section className="calendar-module">
      <header className="calendar-heading">
        <div>
          <p className="eyebrow">YOUR SCHEDULE</p>
          <h1>Calendar</h1>
          <p className="calendar-subtitle">Keep deadlines, exams and important days in one place.</p>
        </div>
        <button className="calendar-add-button" onClick={openNewEvent}>
          <Plus size={16} /> Add event
        </button>
      </header>

      {showForm && (
        <form className="calendar-form" onSubmit={saveEvent}>
          <div className="calendar-form-heading">
            <div>
              <p className="eyebrow">{editingId ? "UPDATE DETAILS" : "ADD TO YOUR CALENDAR"}</p>
              <h2>{editingId ? "Edit event" : "New event"}</h2>
            </div>
            <button type="button" className="calendar-icon-action" aria-label="Close form" onClick={closeForm}>
              <X size={17} />
            </button>
          </div>
          <label className="calendar-field calendar-field-wide">
            <span>Title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Mathematics exam" maxLength={80} autoFocus />
          </label>
          <div className="calendar-form-row">
            <label className="calendar-field">
              <span>Date</span>
              <input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} />
            </label>
            <label className="calendar-field">
              <span>Type</span>
              <select value={eventType} onChange={(event) => setEventType(event.target.value as EventType)}>
                {eventTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
          </div>
          <label className="calendar-field calendar-field-wide">
            <span>Notes <small>Optional</small></span>
            <input value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Room, chapters or anything to remember" maxLength={180} />
          </label>
          {error && <p className="calendar-error" role="alert">{error}</p>}
          <div className="calendar-form-actions">
            <button type="button" className="calendar-cancel-button" onClick={closeForm}>Cancel</button>
            <button type="submit" className="calendar-save-button">{editingId ? "Save changes" : "Save event"}</button>
          </div>
        </form>
      )}

      <div className="calendar-layout">
        <section className="calendar-panel" aria-label="Monthly calendar">
          <div className="calendar-toolbar">
            <div>
              <p className="eyebrow">MONTH VIEW</p>
              <h2>{formatMonth(month)}</h2>
            </div>
            <div className="calendar-month-actions">
              <button className="calendar-today-button" onClick={() => {
                const now = new Date();
                setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                setSelectedDate(today);
              }}>Today</button>
              <button className="calendar-icon-action" aria-label="Previous month" onClick={() => moveMonth(-1)}><ChevronLeft size={18} /></button>
              <button className="calendar-icon-action" aria-label="Next month" onClick={() => moveMonth(1)}><ChevronRight size={18} /></button>
            </div>
          </div>

          <div className="calendar-weekdays">
            {weekdays.map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="calendar-days">
            {monthDays.map(({ date, value, inCurrentMonth }) => {
              const dayEvents = eventsByDate[value] ?? [];
              const dayTasks = tasksByDate[value] ?? [];
              const markers = [
                ...(dayTasks.length ? ["task"] : []),
                ...dayEvents.slice(0, 3).map((event) => event.type.toLowerCase())
              ];
              return (
                <button
                  type="button"
                  key={value}
                  className={[
                    "calendar-day",
                    inCurrentMonth ? "" : "outside-month",
                    value === selectedDate ? "selected" : "",
                    value === today ? "is-today" : ""
                  ].filter(Boolean).join(" ")}
                  onClick={() => setSelectedDate(value)}
                  aria-pressed={value === selectedDate}
                  aria-label={`${formatSelectedDate(value)}, ${dayTasks.length + dayEvents.length} items`}
                >
                  <span className="calendar-day-number">{date.getDate()}</span>
                  <span className="calendar-day-markers">
                    {markers.slice(0, 3).map((marker, index) => <i className={`calendar-marker marker-${marker}`} key={`${value}-${index}`} />)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="calendar-legend">
            <span><i className="calendar-marker marker-task" /> Tasks</span>
            <span><i className="calendar-marker marker-exam" /> Exams</span>
            <span><i className="calendar-marker marker-event" /> Events</span>
            <span><i className="calendar-marker marker-holiday" /> Holidays</span>
          </div>
        </section>

        <aside className="calendar-agenda">
          <div className="calendar-agenda-heading">
            <div>
              <p className="eyebrow">DAY PLAN</p>
              <h2>{formatSelectedDate(selectedDate)}</h2>
            </div>
            <button className="calendar-icon-action" aria-label="Add event on selected day" onClick={openNewEvent}><Plus size={17} /></button>
          </div>

          {selectedTasks.length === 0 && selectedEvents.length === 0 ? (
            <div className="calendar-empty">
              <span><CalendarDays size={21} /></span>
              <strong>Nothing scheduled</strong>
              <p>This day is clear. Add an event or keep it that way.</p>
            </div>
          ) : (
            <div className="calendar-agenda-list">
              {selectedTasks.map((task) => (
                <article className={task.completed ? "calendar-agenda-item task-complete" : "calendar-agenda-item"} key={`task-${task.id}`}>
                  <span className="calendar-agenda-symbol task-symbol">{task.completed ? <Check size={15} /> : <ClipboardList size={15} />}</span>
                  <div className="calendar-agenda-copy">
                    <strong>{task.title}</strong>
                    <span>{task.subject || "Study task"} · Planner</span>
                  </div>
                  <span className="calendar-item-kind">Task</span>
                </article>
              ))}
              {selectedEvents.map((event) => (
                <article className="calendar-agenda-item" key={event.id}>
                  <span className={`calendar-agenda-symbol kind-${event.type.toLowerCase()}`}>
                    {event.type === "Exam" ? <GraduationCap size={15} /> : event.type === "Deadline" ? <Flag size={15} /> : <CalendarDays size={15} />}
                  </span>
                  <div className="calendar-agenda-copy">
                    <strong>{event.title}</strong>
                    <span>{event.details || event.type}</span>
                  </div>
                  <div className="calendar-event-actions">
                    <button className="calendar-mini-action" aria-label={`Edit ${event.title}`} onClick={() => editEvent(event)}><Pencil size={14} /></button>
                    <button className="calendar-mini-action delete" aria-label={`Delete ${event.title}`} onClick={() => deleteEvent(event.id)}><Trash2 size={14} /></button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <button className="calendar-agenda-add" onClick={openNewEvent}><Plus size={15} /> Add an event</button>
        </aside>
      </div>
    </section>
  );
}
