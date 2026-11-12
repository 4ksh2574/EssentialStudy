import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CalendarDays, CalendarRange, ChevronDown, ChevronLeft, ChevronRight,
  Plus, X, Pencil, Trash2, Check, ClipboardList, Gift, Sun,
  GraduationCap, Flag, PartyPopper, Sparkles
} from "lucide-react";

type EventType = "Birthday" | "Holiday" | "Personal event" | "Exam" | "Deadline";
type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  type: EventType;
  details: string;
  yearly: boolean;
  createdAt: number;
};
type StudyTask = {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  completed: boolean;
};
type CalendarEntry = {
  id: string;
  title: string;
  date: string;
  kind: "task" | "event" | "holiday";
  subtitle: string;
  tag: string;
  completed?: boolean;
  event?: CalendarEvent;
};
type ViewMode = "day" | "upcoming";

const EVENT_KEY = "essentialstudy.calendar.events";
const TASK_KEY = "essentialstudy.tasks";
const eventTypes: EventType[] = ["Personal event", "Birthday", "Holiday", "Exam", "Deadline"];
const nationalDays = [
  { title: "Republic Day", month: 1, day: 26 },
  { title: "Independence Day", month: 8, day: 15 },
  { title: "Gandhi Jayanti", month: 10, day: 2 }
];
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateValue(date: Date) {
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}
function dateObject(value: string) {
  return new Date(value + "T12:00:00");
}
function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = dateObject(value);
  return !Number.isNaN(date.getTime()) && dateValue(date) === value;
}
function readEvents(): CalendarEvent[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(EVENT_KEY) || "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is CalendarEvent =>
      item && typeof item.id === "string" &&
      typeof item.title === "string" && validDate(item.date) &&
      eventTypes.includes(item.type) && typeof item.details === "string"
    ).map((item) => ({
      ...item,
      yearly: item.type === "Birthday" && item.yearly === true,
      createdAt: typeof item.createdAt === "number" ? item.createdAt : 0
    }));
  } catch {
    return [];
  }
}
function readTasks(): StudyTask[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(TASK_KEY) || "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is StudyTask =>
      item && typeof item.id === "string" &&
      typeof item.title === "string" &&
      typeof item.subject === "string" &&
      typeof item.dueDate === "string" &&
      typeof item.completed === "boolean"
    );
  } catch {
    return [];
  }
}
function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? String(Date.now()) + "-" + Math.random().toString(36).slice(2);
}
function monthDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(month.getFullYear(), month.getMonth(), 1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}
function monthName(date: Date) {
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}
function fullDate(value: string) {
  return dateObject(value).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
}
function iconFor(type: string) {
  if (type === "Birthday") return Gift;
  if (type === "Holiday") return Sun;
  if (type === "Exam") return GraduationCap;
  if (type === "Deadline") return Flag;
  if (type === "Personal event") return PartyPopper;
  return CalendarDays;
}
function entriesForDate(value: string, events: CalendarEvent[], tasks: StudyTask[]): CalendarEntry[] {
  const taskEntries: CalendarEntry[] = tasks
    .filter((task) => task.dueDate === value)
    .map((task) => ({
      id: "task-" + task.id,
      title: task.title,
      date: value,
      kind: "task",
      subtitle: task.subject || "Study task",
      tag: "Planner",
      completed: task.completed
    }));
  const eventEntries: CalendarEntry[] = events
    .filter((event) => event.yearly ? event.date.slice(5) === value.slice(5) : event.date === value)
    .map((event) => ({
      id: event.id,
      title: event.title,
      date: value,
      kind: event.type === "Holiday" ? "holiday" : "event",
      subtitle: event.details || event.type,
      tag: event.type,
      event
    }));
  const nationalEntries: CalendarEntry[] = nationalDays
    .filter((day) => {
      const month = String(day.month).padStart(2, "0");
      const date = String(day.day).padStart(2, "0");
      return value.slice(5) === month + "-" + date;
    })
    .map((day) => ({
      id: "national-" + day.month + "-" + day.day,
      title: day.title,
      date: value,
      kind: "holiday",
      subtitle: "National observance",
      tag: "National day"
    }));
  return [...taskEntries, ...eventEntries, ...nationalEntries];
}

export default function Calendar() {
  const today = dateValue(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>(readEvents);
  const [tasks, setTasks] = useState<StudyTask[]>(readTasks);
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [monthOpen, setMonthOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("day");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today);
  const [type, setType] = useState<EventType>("Personal event");
  const [details, setDetails] = useState("");
  const [yearly, setYearly] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(EVENT_KEY, JSON.stringify(events));
    } catch {
      // Keep the current session usable when browser storage is unavailable.
    }
  }, [events]);

  useEffect(() => {
    const refresh = () => setTasks(readTasks());
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const selectedDate = dateObject(selected);
  const ribbonDays = useMemo(
    () => Array.from({ length: 15 }, (_, index) => addDays(dateObject(selected), index - 7)),
    [selected]
  );
  const monthGrid = useMemo(() => monthDays(month), [month]);
  const selectedEntries = useMemo(
    () => entriesForDate(selected, events, tasks),
    [selected, events, tasks]
  );
  const upcomingDays = useMemo(() => {
    const result: { date: string; entries: CalendarEntry[] }[] = [];
    const start = dateObject(today);
    for (let offset = 1; offset <= 60; offset += 1) {
      const value = dateValue(addDays(start, offset));
      const entries = entriesForDate(value, events, tasks);
      if (entries.length) result.push({ date: value, entries });
    }
    return result;
  }, [events, tasks, today]);
  const upcomingCount = upcomingDays.reduce((total, day) => total + day.entries.length, 0);
  const selectedLabel = fullDate(selected);
  const isToday = selected === today;

  const chooseDate = (value: string) => {
    setSelected(value);
    const chosen = dateObject(value);
    setMonth(new Date(chosen.getFullYear(), chosen.getMonth(), 1));
  };
  const changeMonth = (amount: number) => {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };
  const goToday = () => {
    setSelected(today);
    setMonth(new Date(dateObject(today).getFullYear(), dateObject(today).getMonth(), 1));
    setView("day");
    setMonthOpen(false);
  };
  const openAdd = (value = selected) => {
    setEditing(null);
    setTitle("");
    setDate(value);
    setType("Personal event");
    setDetails("");
    setYearly(false);
    setError("");
    setFormOpen(true);
  };
  const editEvent = (event: CalendarEvent) => {
    setEditing(event.id);
    setTitle(event.title);
    setDate(event.date);
    setType(event.type);
    setDetails(event.details);
    setYearly(event.yearly);
    setError("");
    setFormOpen(true);
  };
  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setError("");
  };
  const saveEvent = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !validDate(date)) {
      setError("Add a title and choose a valid date.");
      return;
    }
    const item: CalendarEvent = {
      id: editing ?? makeId(),
      title: title.trim(),
      date,
      type,
      details: details.trim(),
      yearly: type === "Birthday" && yearly,
      createdAt: Date.now()
    };
    setEvents((current) => editing
      ? current.map((existing) => existing.id === editing
        ? { ...item, createdAt: existing.createdAt }
        : existing)
      : [item, ...current]
    );
    chooseDate(date);
    setView("day");
    closeForm();
  };
  const removeEvent = (id: string) => {
    setEvents((current) => current.filter((event) => event.id !== id));
  };

  const renderEntry = (entry: CalendarEntry) => {
    const Icon = entry.kind === "task" ? ClipboardList : iconFor(entry.tag);
    return (
      <article className={"esscal-entry " + entry.kind + (entry.completed ? " complete" : "")} key={entry.id + "-" + entry.date}>
        <span className="esscal-entry-mark"><Icon size={17} /></span>
        <div className="esscal-entry-copy">
          <strong>{entry.title}</strong>
          <span>{entry.subtitle}{entry.kind === "task" ? " · Planner" : entry.event?.yearly ? " · Every year" : ""}</span>
        </div>
        <span className="esscal-entry-tag">{entry.tag}</span>
        {entry.completed && <span className="esscal-complete"><Check size={13} /></span>}
        {entry.event && (
          <div className="esscal-entry-actions">
            <button type="button" aria-label="Edit event" onClick={() => editEvent(entry.event!)}><Pencil size={14} /></button>
            <button type="button" aria-label="Delete event" onClick={() => removeEvent(entry.event!.id)}><Trash2 size={14} /></button>
          </div>
        )}
      </article>
    );
  };

  return (
    <section className="esscal">
      <header className="esscal-header">
        <div>
          <p className="esscal-kicker">MAKE ROOM FOR WHAT MATTERS</p>
          <h1>Calendar<span>.</span></h1>
        </div>
        <div className="esscal-header-actions">
          <button className="esscal-month-trigger" type="button" onClick={() => setMonthOpen((open) => !open)} aria-expanded={monthOpen}>
            <CalendarRange size={16} />
            <span>{monthName(month)}</span>
            <ChevronDown size={14} className={monthOpen ? "rotated" : ""} />
          </button>
          <button className="esscal-add-button" type="button" onClick={() => openAdd()}>
            <Plus size={17} /><span>Add</span>
          </button>
        </div>
      </header>

      <section className="esscal-date-stage">
        <div className="esscal-date-copy">
          <span className="esscal-date-eyebrow">{isToday ? "TODAY" : "YOUR SELECTED DAY"}</span>
          <div className="esscal-date-line">
            <strong>{selectedDate.getDate()}</strong>
            <div>
              <span>{selectedDate.toLocaleDateString("en-IN", { weekday: "long" })}</span>
              <b>{selectedDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</b>
            </div>
          </div>
          <p>{selectedEntries.length ? selectedEntries.length + (selectedEntries.length === 1 ? " thing" : " things") + " on your schedule" : "A little room to focus."}</p>
        </div>
        <div className="esscal-date-ornament" aria-hidden="true"><span>{selectedDate.toLocaleDateString("en-IN", { weekday: "short" }).toUpperCase()}</span><i /><b>{String(selectedDate.getDate()).padStart(2, "0")}</b></div>
      </section>

      <nav className="esscal-date-rail" aria-label="Choose a date">
        {ribbonDays.map((day) => {
          const value = dateValue(day);
          const entries = entriesForDate(value, events, tasks);
          return (
            <button
              type="button"
              key={value}
              className={"esscal-date-chip" + (value === selected ? " active" : "") + (value === today ? " is-today" : "")}
              onClick={() => chooseDate(value)}
              aria-pressed={value === selected}
            >
              <span>{day.toLocaleDateString("en-IN", { weekday: "short" })}</span>
              <strong>{day.getDate()}</strong>
              <i className={entries.length ? "has-items" : ""} />
            </button>
          );
        })}
      </nav>

      {monthOpen && (
        <section className="esscal-month-panel">
          <div className="esscal-month-panel-head">
            <button type="button" aria-label="Previous month" onClick={() => changeMonth(-1)}><ChevronLeft size={17} /></button>
            <strong>{monthName(month)}</strong>
            <button type="button" aria-label="Next month" onClick={() => changeMonth(1)}><ChevronRight size={17} /></button>
          </div>
          <div className="esscal-month-grid">
            {weekdays.map((day) => <span className="esscal-month-weekday" key={day}>{day.slice(0, 1)}</span>)}
            {monthGrid.map((day) => {
              const value = dateValue(day);
              return (
                <button
                  type="button"
                  key={value}
                  className={"esscal-month-day" + (day.getMonth() !== month.getMonth() ? " outside" : "") + (value === selected ? " selected" : "") + (value === today ? " today" : "")}
                  onClick={() => { chooseDate(value); setMonthOpen(false); }}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
          <div className="esscal-month-panel-foot"><button type="button" onClick={goToday}>Jump to today</button></div>
        </section>
      )}

      <div className="esscal-viewbar">
        <div className="esscal-view-switch" role="tablist" aria-label="Calendar view">
          <button type="button" role="tab" aria-selected={view === "day"} className={view === "day" ? "active" : ""} onClick={() => setView("day")}>Day view</button>
          <button type="button" role="tab" aria-selected={view === "upcoming"} className={view === "upcoming" ? "active" : ""} onClick={() => setView("upcoming")}>Coming up <span>{upcomingCount}</span></button>
        </div>
        <button type="button" className="esscal-today-link" onClick={goToday}>Today <ChevronRight size={14} /></button>
      </div>

      {view === "day" ? (
        <section className="esscal-day-view">
          <div className="esscal-section-heading">
            <div><span>THE DAY, UNFOLDED</span><h2>{isToday ? "Your day" : selectedLabel.split(",")[0]}</h2></div>
            <span className="esscal-section-date">{selectedDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
          </div>
          {selectedEntries.length ? (
            <div className="esscal-timeline">
              <div className="esscal-timeline-line" />
              <div className="esscal-timeline-content">{selectedEntries.map(renderEntry)}</div>
            </div>
          ) : (
            <div className="esscal-empty">
              <span className="esscal-empty-icon"><Sparkles size={19} /></span>
              <div><strong>Nothing competing for your attention.</strong><p>Keep this space open, or add something worth remembering.</p></div>
              <button type="button" onClick={() => openAdd(selected)}><Plus size={15} /> Add a date</button>
            </div>
          )}
          {selected !== today && <button type="button" className="esscal-back-today" onClick={goToday}>Back to today</button>}
        </section>
      ) : (
        <section className="esscal-upcoming-view">
          <div className="esscal-section-heading">
            <div><span>THE NEXT 60 DAYS</span><h2>Coming up</h2></div>
            <span className="esscal-section-date">{upcomingCount} dates</span>
          </div>
          {upcomingDays.length ? (
            <div className="esscal-upcoming-list">
              {upcomingDays.map((day) => (
                <section className="esscal-upcoming-day" key={day.date}>
                  <button type="button" className="esscal-upcoming-date" onClick={() => { chooseDate(day.date); setView("day"); }}>
                    <strong>{dateObject(day.date).getDate()}</strong>
                    <span>{dateObject(day.date).toLocaleDateString("en-IN", { weekday: "short", month: "short" })}</span>
                    <ChevronRight size={15} />
                  </button>
                  <div className="esscal-upcoming-entries">{day.entries.map(renderEntry)}</div>
                </section>
              ))}
            </div>
          ) : (
            <div className="esscal-empty">
              <span className="esscal-empty-icon"><Sparkles size={19} /></span>
              <div><strong>Your next 60 days look clear.</strong><p>New tasks, birthdays and important dates will appear here.</p></div>
              <button type="button" onClick={() => openAdd(today)}><Plus size={15} /> Add a date</button>
            </div>
          )}
        </section>
      )}

      {formOpen && (
        <div className="esscal-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}>
          <form className="esscal-form" onSubmit={saveEvent}>
            <div className="esscal-form-head">
              <div><span>{editing ? "EDIT A DATE" : "SAVE A DATE"}</span><h2>{editing ? "Update details" : "What should we remember?"}</h2></div>
              <button type="button" aria-label="Close" onClick={closeForm}><X size={18} /></button>
            </div>
            <label className="esscal-field"><span>Title</span><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Birthday, school event..." maxLength={80} /></label>
            <div className="esscal-form-row">
              <label className="esscal-field"><span>Date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
              <label className="esscal-field"><span>Type</span><select value={type} onChange={(event) => { setType(event.target.value as EventType); if (event.target.value !== "Birthday") setYearly(false); }}>{eventTypes.map((eventType) => <option key={eventType}>{eventType}</option>)}</select></label>
            </div>
            <label className="esscal-field"><span>Notes <small>Optional</small></span><textarea value={details} onChange={(event) => setDetails(event.target.value)} rows={2} maxLength={200} placeholder="A detail to remember" /></label>
            {type === "Birthday" && <label className="esscal-repeat"><input type="checkbox" checked={yearly} onChange={(event) => setYearly(event.target.checked)} /> Repeat every year</label>}
            {error && <p className="esscal-error">{error}</p>}
            <div className="esscal-form-footer"><button type="button" onClick={closeForm}>Cancel</button><button type="submit">{editing ? "Save changes" : "Save date"}</button></div>
          </form>
        </div>
      )}
    </section>
  );
}
