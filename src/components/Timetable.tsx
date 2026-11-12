import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlarmClock, BookOpen, Check, ChevronRight, Coffee, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
type Day = typeof DAYS[number];
type SlotKind = "Class" | "Study" | "Break" | "Other";
type Slot = {
  id: string;
  day: Day;
  title: string;
  subject: string;
  start: string;
  end: string;
  location: string;
  kind: SlotKind;
};
type Props = { subjects: string[] };
const KEY = "essentialstudy.timetable";
const KINDS: SlotKind[] = ["Class", "Study", "Break", "Other"];

function todayName(): Day {
  const day = new Date().getDay();
  return DAYS[day === 0 ? 6 : day - 1];
}
function readSlots(): Slot[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is Slot =>
      item && typeof item.id === "string" &&
      DAYS.includes(item.day) &&
      typeof item.title === "string" &&
      typeof item.subject === "string" &&
      typeof item.start === "string" &&
      typeof item.end === "string" &&
      typeof item.location === "string" &&
      KINDS.includes(item.kind)
    );
  } catch {
    return [];
  }
}
function minutes(value: string) {
  const [hours, mins] = value.split(":").map(Number);
  return hours * 60 + mins;
}
function durationLabel(total: number) {
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return [hours ? hours + "h" : "", mins ? mins + "m" : ""].filter(Boolean).join(" ") || "0m";
}
function timeLabel(value: string) {
  const [hours, mins] = value.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const display = hours % 12 || 12;
  return display + ":" + String(mins).padStart(2, "0") + " " + suffix;
}
function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? String(Date.now()) + "-" + Math.random().toString(36).slice(2);
}

export default function Timetable({ subjects }: Props) {
  const [slots, setSlots] = useState<Slot[]>(readSlots);
  const [day, setDay] = useState<Day>(todayName);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(subjects[0] ?? "General");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [location, setLocation] = useState("");
  const [kind, setKind] = useState<SlotKind>("Class");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(slots));
    } catch {
      // Keep the timetable usable for this session if storage is unavailable.
    }
  }, [slots]);

  const daySlots = useMemo(
    () => slots.filter((slot) => slot.day === day).sort((a, b) => a.start.localeCompare(b.start)),
    [slots, day]
  );
  const dayMinutes = daySlots.reduce((total, slot) => total + Math.max(0, minutes(slot.end) - minutes(slot.start)), 0);
  const totalSlots = slots.length;
  const openForm = (slot?: Slot) => {
    setEditing(slot?.id ?? null);
    setTitle(slot?.title ?? "");
    setSubject(slot?.subject ?? subjects[0] ?? "General");
    setStart(slot?.start ?? "09:00");
    setEnd(slot?.end ?? "10:00");
    setLocation(slot?.location ?? "");
    setKind(slot?.kind ?? "Class");
    setError("");
    setFormOpen(true);
  };
  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setError("");
  };
  const saveSlot = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError("Give this block a name.");
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end) || minutes(end) <= minutes(start)) {
      setError("End time must be later than start time.");
      return;
    }
    const next: Slot = {
      id: editing ?? makeId(),
      day,
      title: title.trim(),
      subject: subject.trim() || "General",
      start,
      end,
      location: location.trim(),
      kind
    };
    setSlots((current) => editing
      ? current.map((slot) => slot.id === editing ? next : slot)
      : [...current, next]
    );
    closeForm();
  };
  const removeSlot = (id: string) => setSlots((current) => current.filter((slot) => slot.id !== id));

  return (
    <section className="timetable-page">
      <header className="timetable-heading">
        <div><p className="eyebrow">BUILD A STEADY RHYTHM</p><h1>Timetable<span>.</span></h1><p className="timetable-intro">A clear shape for your school day and study time.</p></div>
        <button className="primary-button timetable-add" type="button" onClick={() => openForm()}><Plus size={16} /> Add block</button>
      </header>

      <section className="timetable-overview">
        <div className="timetable-overview-icon"><AlarmClock size={19} /></div>
        <div className="timetable-overview-copy"><strong>{totalSlots} scheduled {totalSlots === 1 ? "block" : "blocks"}</strong><span>{daySlots.length ? durationLabel(dayMinutes) + " planned on " + day : "Start with one repeatable routine."}</span></div>
        <div className="timetable-overview-days">{DAYS.map((item) => <button type="button" key={item} className={item === day ? "active" : ""} onClick={() => setDay(item)} aria-label={item + ", " + slots.filter((slot) => slot.day === item).length + " blocks"}><i className={slots.some((slot) => slot.day === item) ? "has-slots" : ""} /></button>)}</div>
      </section>

      <nav className="timetable-day-picker" aria-label="Choose weekday">
        {DAYS.map((item) => {
          const count = slots.filter((slot) => slot.day === item).length;
          return <button type="button" key={item} onClick={() => setDay(item)} className={day === item ? "active" : ""} aria-pressed={day === item}><span>{item.slice(0, 3)}</span><strong>{count || "—"}</strong></button>;
        })}
      </nav>

      <div className="timetable-list-heading">
        <div><span>YOUR WEEKLY ROUTINE</span><h2>{day}</h2></div>
        <span>{daySlots.length} {daySlots.length === 1 ? "block" : "blocks"}</span>
      </div>

      {daySlots.length ? (
        <div className="timetable-slots">
          <div className="timetable-rail" />
          {daySlots.map((slot, index) => {
            const Icon = slot.kind === "Break" ? Coffee : slot.kind === "Study" ? BookOpen : AlarmClock;
            return <article className={"timetable-slot kind-" + slot.kind.toLowerCase()} key={slot.id}>
              <div className="timetable-time"><strong>{timeLabel(slot.start)}</strong><span>{timeLabel(slot.end)}</span></div>
              <div className="timetable-slot-marker"><i /></div>
              <div className="timetable-slot-card">
                <span className="timetable-slot-icon"><Icon size={16} /></span>
                <div className="timetable-slot-copy"><strong>{slot.title}</strong><span>{slot.subject}{slot.location ? " · " + slot.location : ""}</span></div>
                <span className="timetable-kind">{slot.kind}</span>
                <div className="timetable-slot-actions"><button type="button" aria-label={"Edit " + slot.title} onClick={() => openForm(slot)}><Pencil size={14} /></button><button type="button" aria-label={"Delete " + slot.title} onClick={() => removeSlot(slot.id)}><Trash2 size={14} /></button></div>
              </div>
            </article>;
          })}
        </div>
      ) : (
        <div className="timetable-empty"><span><BookOpen size={20} /></span><strong>A day with room to design.</strong><p>Add classes, study sessions and breaks to build a routine that works for you.</p><button type="button" onClick={() => openForm()}><Plus size={15} /> Add your first block</button></div>
      )}

      <p className="timetable-footnote"><Check size={13} /> Your weekly routine is saved on this device.</p>

      {formOpen && <div className="timetable-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}>
        <form className="timetable-form" onSubmit={saveSlot}>
          <header><div><span>{editing ? "UPDATE YOUR ROUTINE" : "ADD TO YOUR ROUTINE"}</span><h2>{editing ? "Edit block" : "New timetable block"}</h2></div><button type="button" aria-label="Close" onClick={closeForm}><X size={18} /></button></header>
          <label className="timetable-field"><span>What are you doing?</span><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Mathematics, Physics lab..." maxLength={70} /></label>
          <div className="timetable-field-pair">
            <label className="timetable-field"><span>Subject</span><select value={subject} onChange={(event) => setSubject(event.target.value)}>{[...new Set([...subjects, "General"])].map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="timetable-field"><span>Block type</span><select value={kind} onChange={(event) => setKind(event.target.value as SlotKind)}>{KINDS.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
          <div className="timetable-field-pair">
            <label className="timetable-field"><span>Starts</span><input type="time" value={start} onChange={(event) => setStart(event.target.value)} /></label>
            <label className="timetable-field"><span>Ends</span><input type="time" value={end} onChange={(event) => setEnd(event.target.value)} /></label>
          </div>
          <label className="timetable-field"><span>Room or place <small>Optional</small></span><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="e.g. Room 12, Library" maxLength={50} /></label>
          {error && <p className="timetable-error">{error}</p>}
          <footer><button type="button" onClick={closeForm}>Cancel</button><button type="submit">{editing ? "Save changes" : "Add to timetable"} <ChevronRight size={14} /></button></footer>
        </form>
      </div>}
    </section>
  );
}
