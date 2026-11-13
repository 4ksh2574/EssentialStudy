import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarClock, Check, ClipboardList, Plus, RotateCcw, Trash2, X } from "lucide-react";

type Exam = { id: string; title: string; subject: string; date: string; kind: string; note: string };
type Revision = { id: string; subject: string; chapter: string; date: string; status: "To revise" | "In progress" | "Revised"; note: string };
type Props = { subjects: string[] };
const EXAM_KEY = "essentialstudy.exams";
const REVISION_KEY = "essentialstudy.revision";
const SYLLABUS_KEY = "essentialstudy.syllabus";
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
};
const makeId = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random());
function readList<T,>(key: string): T[] {
  try { const value = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(value) ? value : []; }
  catch { return []; }
}
function dayLabel(value: string) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(new Date(value + "T00:00:00"));
}
function daysUntil(value: string) {
  return Math.round((new Date(value + "T00:00:00").getTime() - new Date(today() + "T00:00:00").getTime()) / 86400000);
}
export default function Exams({ subjects }: Props) {
  const [exams, setExams] = useState<Exam[]>(() => readList<Exam>(EXAM_KEY));
  const [revision, setRevision] = useState<Revision[]>(() => readList<Revision>(REVISION_KEY));
  const [tab, setTab] = useState<"Exams" | "Revision">("Exams");
  const [showPast, setShowPast] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(subjects[0] ?? "");
  const [date, setDate] = useState(today());
  const [kind, setKind] = useState("School exam");
  const [chapter, setChapter] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<Revision["status"]>("To revise");

  useEffect(() => { try { localStorage.setItem(EXAM_KEY, JSON.stringify(exams)); } catch { /* Keep this session usable. */ } }, [exams]);
  useEffect(() => { try { localStorage.setItem(REVISION_KEY, JSON.stringify(revision)); } catch { /* Keep this session usable. */ } }, [revision]);

  const chapters = useMemo(() => {
    try {
      const data = JSON.parse(localStorage.getItem(SYLLABUS_KEY) || "{}") as Record<string, Array<{title?: string}>>;
      return (data[subject] ?? []).map(item => item.title || "").filter(Boolean);
    } catch { return []; }
  }, [subject]);
  const upcoming = useMemo(() => exams.filter(item => item.date >= today()).sort((a,b) => a.date.localeCompare(b.date)), [exams]);
  const past = useMemo(() => exams.filter(item => item.date < today()).sort((a,b) => b.date.localeCompare(a.date)), [exams]);
  const nextExam = upcoming[0];
  const revisedCount = revision.filter(item => item.status === "Revised").length;

  const openNew = () => {
    setEditingId(null); setTitle(""); setSubject(subjects[0] ?? ""); setDate(today());
    setKind("School exam"); setChapter(""); setNote(""); setStatus("To revise"); setFormOpen(true);
  };
  const openExam = (item: Exam) => {
    setEditingId(item.id); setTitle(item.title); setSubject(item.subject); setDate(item.date);
    setKind(item.kind); setNote(item.note); setChapter(""); setFormOpen(true);
  };
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!subject || !date) return;
    if (tab === "Exams") {
      if (!title.trim()) return;
      const item: Exam = { id: editingId ?? makeId(), title: title.trim(), subject, date, kind, note: note.trim() };
      setExams(current => editingId ? current.map(old => old.id === editingId ? item : old) : [...current, item]);
    } else {
      if (!chapter.trim()) return;
      const item: Revision = { id: editingId ?? makeId(), subject, chapter: chapter.trim(), date, status, note: note.trim() };
      setRevision(current => editingId ? current.map(old => old.id === editingId ? item : old) : [...current, item]);
    }
    setFormOpen(false); setEditingId(null);
  };
  const remove = (id: string) => {
    if (tab === "Exams") setExams(current => current.filter(item => item.id !== id));
    else setRevision(current => current.filter(item => item.id !== id));
  };
  const cycleStatus = (id: string) => setRevision(current => current.map(item => item.id === id
    ? { ...item, status: item.status === "To revise" ? "In progress" : item.status === "In progress" ? "Revised" : "To revise" } : item));

  if (!subjects.length) return <section className="exams-page"><p className="eyebrow">PREPARE WITH CLARITY</p><h1>Exams & revision<span>.</span></h1><p className="exams-muted">Add subjects to your profile to start planning.</p></section>;

  return <section className="exams-page">
    <div className="exams-heading">
      <div><p className="eyebrow">PREPARE WITH CLARITY</p><h1>Exams & revision<span>.</span></h1><p className="exams-muted">A simple view of what is coming and what needs another look.</p></div>
      <button className="primary-button exams-add" onClick={openNew}><Plus size={16} /> Add {tab === "Exams" ? "exam" : "topic"}</button>
    </div>
    <div className="exams-tabs">
      <button className={tab === "Exams" ? "active" : ""} onClick={() => { setTab("Exams"); setShowPast(false); }}>Exams <span>{upcoming.length}</span></button>
      <button className={tab === "Revision" ? "active" : ""} onClick={() => setTab("Revision")}>Revision <span>{revision.length}</span></button>
    </div>

    {tab === "Exams" ? <>
      <div className="exams-summary">
        <span className="exams-summary-icon"><CalendarClock size={19} /></span>
        <div><small>NEXT EXAM</small><strong>{nextExam ? nextExam.title : "Nothing scheduled"}</strong><span>{nextExam ? `${nextExam.subject} · ${dayLabel(nextExam.date)}` : "Add an exam to start your countdown."}</span></div>
        {nextExam && <b>{daysUntil(nextExam.date) === 0 ? "Today" : daysUntil(nextExam.date) === 1 ? "1 day" : `${daysUntil(nextExam.date)} days`}</b>}
      </div>
      <div className="exams-list-heading"><h2>{showPast ? "Past exams" : "Upcoming exams"}</h2><button onClick={() => setShowPast(value => !value)}>{showPast ? "Show upcoming" : `View past · ${past.length}`}</button></div>
      {(showPast ? past : upcoming).length ? <div className="exams-list">
        {(showPast ? past : upcoming).map(item => <article className="exam-row" key={item.id}>
          <span className="exam-date"><strong>{new Date(item.date + "T00:00:00").getDate()}</strong><small>{new Intl.DateTimeFormat(undefined,{month:"short"}).format(new Date(item.date+"T00:00:00"))}</small></span>
          <div className="exam-copy"><strong>{item.title}</strong><span>{item.subject} · {item.kind}</span>{item.note && <small>{item.note}</small>}</div>
          {!showPast && <span className="exam-countdown">{daysUntil(item.date) === 0 ? "Today" : daysUntil(item.date) === 1 ? "Tomorrow" : `${daysUntil(item.date)}d left`}</span>}
          <div className="exam-actions"><button aria-label="Edit exam" onClick={() => openExam(item)}>Edit</button><button aria-label="Delete exam" onClick={() => remove(item.id)}><Trash2 size={14}/></button></div>
        </article>)}
      </div> : <div className="exams-empty"><CalendarClock size={23}/><strong>{showPast ? "No past exams" : "No exams planned"}</strong><p>{showPast ? "Completed dates will appear here." : "Add your next test or exam to keep it in view."}</p>{!showPast && <button onClick={openNew}><Plus size={14}/> Add an exam</button>}</div>}
    </> : <>
      <div className="revision-progress"><div><span>REVISION PROGRESS</span><strong>{revisedCount} of {revision.length} revised</strong></div><div className="revision-track"><i style={{width: revision.length ? `${revisedCount / revision.length * 100}%` : "0%"}}/></div></div>
      {revision.length ? <div className="revision-list">
        {[...revision].sort((a,b) => a.date.localeCompare(b.date)).map(item => <article className="revision-row" key={item.id}>
          <button className={item.status === "Revised" ? "revision-check done" : "revision-check"} onClick={() => cycleStatus(item.id)} aria-label="Change revision status">{item.status === "Revised" ? <Check size={15}/> : <RotateCcw size={15}/>}</button>
          <div className="revision-copy"><strong>{item.chapter}</strong><span>{item.subject} · {dayLabel(item.date)}</span>{item.note && <small>{item.note}</small>}</div>
          <button className={`revision-status status-${item.status.toLowerCase().replace(" ","-")}`} onClick={() => cycleStatus(item.id)}>{item.status}</button>
          <button className="revision-delete" aria-label="Delete revision topic" onClick={() => remove(item.id)}><Trash2 size={14}/></button>
        </article>)}
      </div> : <div className="exams-empty"><ClipboardList size={23}/><strong>No revision topics yet</strong><p>Add chapters from your syllabus and track each revision pass.</p><button onClick={openNew}><Plus size={14}/> Add a topic</button></div>}
    </>}

    {formOpen && <div className="exams-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setFormOpen(false); }}>
      <form className="exams-form" onSubmit={save}>
        <header><div><span>{editingId ? "UPDATE YOUR PLAN" : "MAKE A PLAN"}</span><h2>{editingId ? "Edit" : "Add"} {tab === "Exams" ? "exam" : "revision topic"}</h2></div><button type="button" onClick={() => setFormOpen(false)} aria-label="Close"><X size={18}/></button></header>
        {tab === "Exams" ? <label className="exams-field"><span>Exam name</span><input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Mathematics unit test" maxLength={90} required autoFocus/></label> : <label className="exams-field"><span>Chapter</span><input list="revision-chapters" value={chapter} onChange={e => setChapter(e.target.value)} placeholder="Choose or type a chapter" maxLength={100} required autoFocus/><datalist id="revision-chapters">{chapters.map(value => <option key={value} value={value}/>)}</datalist></label>}
        <div className="exams-field-pair">
          <label className="exams-field"><span>Subject</span><select value={subject} onChange={e => setSubject(e.target.value)}>{subjects.map(value => <option key={value}>{value}</option>)}</select></label>
          <label className="exams-field"><span>{tab === "Exams" ? "Exam type" : "Status"}</span>{tab === "Exams" ? <select value={kind} onChange={e => setKind(e.target.value)}><option>School exam</option><option>Unit test</option><option>Practical</option><option>Mock test</option><option>Other</option></select> : <select value={status} onChange={e => setStatus(e.target.value as Revision["status"])}><option>To revise</option><option>In progress</option><option>Revised</option></select>}</label>
        </div>
        <label className="exams-field"><span>{tab === "Exams" ? "Exam date" : "Revision date"}</span><input type="date" value={date} onChange={e => setDate(e.target.value)} required/></label>
        <label className="exams-field"><span>Note <small>Optional</small></span><textarea rows={3} value={note} onChange={e => setNote(e.target.value)} maxLength={500} placeholder="Anything to remember..."/></label>
        <footer><button type="button" onClick={() => setFormOpen(false)}>Cancel</button><button type="submit" disabled={tab === "Exams" ? !title.trim() : !chapter.trim()}>Save</button></footer>
      </form>
    </div>}
  </section>;
}
