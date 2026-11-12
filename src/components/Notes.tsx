import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, BookOpenText, FileText, Plus, Search, Trash2, X } from "lucide-react";

type Note = {
  id: string;
  title: string;
  subject: string;
  chapter: string;
  content: string;
  updatedAt: number;
};
type Props = { subjects: string[] };
const KEY = "essentialstudy.notes";
const SYLLABUS_KEY = "essentialstudy.syllabus";

function readNotes(): Note[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Note[];
    return Array.isArray(parsed) ? parsed.filter(note =>
      note && typeof note.id === "string" && typeof note.title === "string" &&
      typeof note.content === "string" && typeof note.subject === "string"
    ) : [];
  } catch { return []; }
}

function readChapters(subject: string): string[] {
  try {
    const data = JSON.parse(localStorage.getItem(SYLLABUS_KEY) || "{}") as Record<string, Array<{ title?: string }>>;
    return (data[subject] ?? []).map(item => item.title || "").filter(Boolean);
  } catch { return []; }
}

function dateLabel(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(new Date(timestamp));
}

export default function Notes({ subjects }: Props) {
  const [notes, setNotes] = useState<Note[]>(readNotes);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All subjects");
  const [selected, setSelected] = useState<Note | null>(null);
  const [editing, setEditing] = useState<Note | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(subjects[0] ?? "");
  const [chapter, setChapter] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(notes)); } catch { /* Keep notes available in this session. */ }
  }, [notes]);

  const chapters = useMemo(() => subject ? readChapters(subject) : [], [subject]);
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return [...notes]
      .filter(note => filter === "All subjects" || note.subject === filter)
      .filter(note => !term || [note.title, note.subject, note.chapter, note.content].some(value => value.toLowerCase().includes(term)))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes, query, filter]);

  const openNew = () => {
    setFormOpen(true);
    setEditing(null);
    setTitle("");
    setSubject(subjects[0] ?? "");
    setChapter("");
    setBody("");
  };
  const openEdit = (note: Note) => {
    setFormOpen(true);
    setEditing(note);
    setTitle(note.title);
    setSubject(note.subject);
    setChapter(note.chapter);
    setBody(note.content);
    setSelected(null);
  };
  const save = (event: FormEvent) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    const cleanBody = body.trim();
    if (!cleanTitle || !cleanBody || !subject) return;
    const updated: Note = {
      id: editing?.id ?? (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now())),
      title: cleanTitle,
      subject,
      chapter,
      content: cleanBody,
      updatedAt: Date.now()
    };
    setNotes(current => editing ? current.map(note => note.id === editing.id ? updated : note) : [updated, ...current]);
    setEditing(null);
    setFormOpen(false);
  };
  const remove = (id: string) => {
    setNotes(current => current.filter(note => note.id !== id));
    setSelected(null);
  };

  if (!subjects.length) return <section className="notes-page"><p className="eyebrow">YOUR LEARNING LIBRARY</p><h1>Notes<span>.</span></h1><p className="notes-muted">Add subjects to your profile before creating study notes.</p></section>;

  return <section className="notes-page">
    <div className="notes-heading">
      <div><p className="eyebrow">YOUR LEARNING LIBRARY</p><h1>Notes<span>.</span></h1><p className="notes-muted">Keep the important things easy to find.</p></div>
      <button className="primary-button notes-add" onClick={openNew}><Plus size={16} /> New note</button>
    </div>

    <div className="notes-tools">
      <label className="notes-search"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search notes" aria-label="Search notes" /></label>
      <select className="notes-filter" value={filter} onChange={event => setFilter(event.target.value)} aria-label="Filter by subject">
        <option>All subjects</option>{subjects.map(item => <option key={item}>{item}</option>)}
      </select>
    </div>

    {visible.length ? <div className="notes-grid">
      {visible.map(note => <button className="notes-card" key={note.id} onClick={() => setSelected(note)}>
        <span className="notes-card-top"><span className="notes-card-icon"><FileText size={17} /></span><span>{dateLabel(note.updatedAt)}</span></span>
        <strong>{note.title}</strong>
        <span className="notes-card-subject">{note.subject}{note.chapter ? ` · ${note.chapter}` : ""}</span>
        <span className="notes-card-excerpt">{note.content}</span>
      </button>)}
    </div> : <div className="notes-empty">
      <span><BookOpenText size={22} /></span>
      <strong>{query || filter !== "All subjects" ? "No matching notes" : "Your study library is empty"}</strong>
      <p>{query || filter !== "All subjects" ? "Try another search or subject." : "Save concise notes, explanations and key ideas here."}</p>
      {!query && filter === "All subjects" && <button onClick={openNew}><Plus size={15} /> Create your first note</button>}
    </div>}

    {formOpen ? <div className="notes-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) { setEditing(null); setFormOpen(false); } }}>
      <form className="notes-form" onSubmit={save}>
        <header><div><span>{editing ? "EDIT YOUR NOTE" : "NEW STUDY NOTE"}</span><h2>{editing ? "Update note" : "Create a note"}</h2></div><button type="button" onClick={() => { setEditing(null); setFormOpen(false); }} aria-label="Close"><X size={18} /></button></header>
        <label className="notes-field"><span>Title</span><input value={title} onChange={event => setTitle(event.target.value)} maxLength={100} placeholder="Give your note a title" required autoFocus /></label>
        <div className="notes-field-pair">
          <label className="notes-field"><span>Subject</span><select value={subject} onChange={event => { setSubject(event.target.value); setChapter(""); }} required>{subjects.map(item => <option key={item}>{item}</option>)}</select></label>
          <label className="notes-field"><span>Chapter <small>Optional</small></span><select value={chapter} onChange={event => setChapter(event.target.value)}><option value="">No chapter</option>{chapters.map(item => <option key={item}>{item}</option>)}</select></label>
        </div>
        <label className="notes-field"><span>Note</span><textarea value={body} onChange={event => setBody(event.target.value)} maxLength={12000} rows={8} placeholder="Write the key ideas in your own words..." required /></label>
        <footer><button type="button" onClick={() => { setEditing(null); setFormOpen(false); }}>Cancel</button><button type="submit" disabled={!title.trim() || !body.trim()}>Save note</button></footer>
      </form>
    </div> : null}

    {selected && <div className="notes-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setSelected(null); }}>
      <article className="notes-detail">
        <header><button className="notes-back" onClick={() => setSelected(null)}><ArrowLeft size={16} /> All notes</button><button className="notes-close" onClick={() => setSelected(null)} aria-label="Close"><X size={18} /></button></header>
        <p className="eyebrow">{selected.subject}{selected.chapter ? ` · ${selected.chapter}` : ""}</p>
        <h2>{selected.title}</h2><span className="notes-detail-date">Updated {dateLabel(selected.updatedAt)}</span>
        <p className="notes-detail-body">{selected.content}</p>
        <footer><button className="notes-delete" onClick={() => remove(selected.id)}><Trash2 size={15} /> Delete</button><button onClick={() => openEdit(selected)}>Edit note</button></footer>
      </article>
    </div>}
  </section>;
}
