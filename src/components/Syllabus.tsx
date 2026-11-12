import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, BookOpen, Check, ChevronRight, Folder, Grip, Plus, Trash2 } from "lucide-react";

type ChapterStatus = "Not started" | "Partially complete" | "Basics complete" | "Theory complete" | "Numericals complete" | "Fully complete";
type Chapter = { id: string; title: string; status: ChapterStatus };
type FolderSize = "small" | "medium" | "large";
type Props = { subjects: string[] };
const KEY = "essentialstudy.syllabus";
const SIZE_KEY = "essentialstudy.syllabus.folderSizes";
const STATUSES: ChapterStatus[] = ["Not started", "Partially complete", "Basics complete", "Theory complete", "Numericals complete", "Fully complete"];
const SIZES: FolderSize[] = ["small", "medium", "large"];

function readSyllabus(): Record<string, Chapter[]> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Array<Partial<Chapter> & { done?: boolean }>>;
    return Object.fromEntries(Object.entries(parsed).map(([subject, items]) => [
      subject,
      (Array.isArray(items) ? items : []).map(item => ({
        id: item.id || (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random())),
        title: item.title || "Untitled chapter",
        status: STATUSES.includes(item.status as ChapterStatus) ? item.status as ChapterStatus : item.done ? "Fully complete" : "Not started"
      }))
    ]));
  } catch { return {}; }
}

function readFolderSizes(): Record<string, FolderSize> {
  try {
    const raw = localStorage.getItem(SIZE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, FolderSize>;
    return Object.fromEntries(Object.entries(parsed).filter(([, size]) => SIZES.includes(size)));
  } catch { return {}; }
}

function progressValue(status: ChapterStatus) {
  if (status === "Fully complete") return 100;
  if (status === "Not started") return 0;
  if (status === "Partially complete") return 25;
  return 55;
}

export default function Syllabus({ subjects }: Props) {
  const [chapters, setChapters] = useState<Record<string, Chapter[]>>(readSyllabus);
  const [folderSizes, setFolderSizes] = useState<Record<string, FolderSize>>(readFolderSizes);
  const [active, setActive] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(chapters)); } catch { /* Keep this session usable. */ }
  }, [chapters]);

  useEffect(() => {
    try { localStorage.setItem(SIZE_KEY, JSON.stringify(folderSizes)); } catch { /* Keep this session usable. */ }
  }, [folderSizes]);

  useEffect(() => {
    if (active && !subjects.includes(active)) setActive(null);
  }, [subjects, active]);

  const subjectStats = useMemo(() => subjects.map(subject => {
    const items = chapters[subject] ?? [];
    const average = items.length ? Math.round(items.reduce((sum, item) => sum + progressValue(item.status), 0) / items.length) : 0;
    return { subject, total: items.length, completed: items.filter(item => item.status === "Fully complete").length, average };
  }), [subjects, chapters]);

  const activeItems = active ? chapters[active] ?? [] : [];
  const totalProgress = activeItems.length ? Math.round(activeItems.reduce((sum, item) => sum + progressValue(item.status), 0) / activeItems.length) : 0;

  const addChapter = (event: FormEvent) => {
    event.preventDefault();
    const title = draft.trim();
    if (!title || !active) return;
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
    setChapters(current => ({ ...current, [active]: [...(current[active] ?? []), { id, title, status: "Not started" }] }));
    setDraft("");
  };

  const updateStatus = (id: string, status: ChapterStatus) => {
    if (!active) return;
    setChapters(current => ({ ...current, [active]: (current[active] ?? []).map(chapter => chapter.id === id ? { ...chapter, status } : chapter) }));
  };

  const deleteChapter = (id: string) => {
    if (!active) return;
    setChapters(current => ({ ...current, [active]: (current[active] ?? []).filter(chapter => chapter.id !== id) }));
  };

  const cycleFolderSize = (subject: string) => {
    setFolderSizes(current => {
      const currentSize = current[subject] ?? "small";
      const nextSize = SIZES[(SIZES.indexOf(currentSize) + 1) % SIZES.length];
      return { ...current, [subject]: nextSize };
    });
  };

  if (!subjects.length) {
    return <section className="syllabus-page"><p className="eyebrow">YOUR ACADEMICS</p><h1>Syllabus<span>.</span></h1><p className="syllabus-muted">Add subjects in your profile to create your study folders.</p></section>;
  }

  return <section className="syllabus-page">
    <div className="syllabus-heading">
      {active && <button className="syllabus-back" onClick={() => { setActive(null); setDraft(""); }}><ArrowLeft size={16} /> All subjects</button>}
      <p className="eyebrow">YOUR ACADEMICS</p>
      <h1>{active || "Syllabus"}<span>.</span></h1>
      <p className="syllabus-muted">{active ? "Keep track of what you have covered in this subject." : "Your subjects, organised in one place."}</p>
    </div>

    {!active ? (
      <div className="syllabus-folder-grid">
        {subjectStats.map(({ subject, total, completed, average }) => {
          const size = folderSizes[subject] ?? "small";
          const nextSize = SIZES[(SIZES.indexOf(size) + 1) % SIZES.length];
          return <article className={`syllabus-folder size-${size}`} key={subject}>
            <button className="syllabus-folder-open" onClick={() => setActive(subject)} aria-label={`Open ${subject} folder`}>
              <span className="syllabus-folder-top"><span className="syllabus-folder-icon"><Folder size={21} /></span><ChevronRight size={17} className="syllabus-folder-arrow" /></span>
              <strong>{subject}</strong>
              <span className="syllabus-folder-meta">{total} {total === 1 ? "chapter" : "chapters"} · {completed} completed</span>
              <span className="syllabus-folder-track"><span style={{ width: average + "%" }} /></span>
              <span className="syllabus-folder-percent">{average}% covered</span>
            </button>
            <button className="syllabus-folder-resize" onClick={() => cycleFolderSize(subject)} aria-label={`Resize ${subject} folder, currently ${size}, next size ${nextSize}`} title={`Size: ${size}. Tap to change to ${nextSize}.`}><Grip size={15} /></button>
          </article>;
        })}
      </div>
    ) : (
      <>
        <div className="syllabus-subject-summary">
          <div><strong>{activeItems.length}</strong><span>chapters</span></div>
          <div><strong>{activeItems.filter(item => item.status === "Fully complete").length}</strong><span>fully complete</span></div>
          <div className="syllabus-subject-progress"><div><span>Overall progress</span><strong>{totalProgress}%</strong></div><div className="syllabus-progress-track"><span style={{ width: totalProgress + "%" }} /></div></div>
        </div>
        <form className="syllabus-add" onSubmit={addChapter}><input value={draft} onChange={event => setDraft(event.target.value)} maxLength={100} placeholder="Add a chapter" aria-label="Chapter name" /><button type="submit" aria-label="Add chapter" disabled={!draft.trim()}><Plus size={18} /></button></form>
        <div className="syllabus-chapters">
          {activeItems.map((item, index) => (
            <article className={item.status === "Fully complete" ? "syllabus-chapter done" : "syllabus-chapter"} key={item.id}>
              <span className="syllabus-chapter-number">{String(index + 1).padStart(2, "0")}</span>
              <div className="syllabus-chapter-main"><strong>{item.title}</strong><span className="syllabus-chapter-status">{item.status === "Fully complete" ? <><Check size={12} /> Fully complete</> : item.status}</span></div>
              <select className="syllabus-status-select" aria-label={`Progress for ${item.title}`} value={item.status} onChange={event => updateStatus(item.id, event.target.value as ChapterStatus)}>{STATUSES.map(status => <option key={status} value={status}>{status}</option>)}</select>
              <button className="syllabus-delete" onClick={() => deleteChapter(item.id)} aria-label={`Delete ${item.title}`}><Trash2 size={15} /></button>
            </article>
          ))}
          {activeItems.length === 0 && <div className="syllabus-empty"><BookOpen size={22} /><strong>Your folder is empty</strong><span>Add the chapters you need to cover.</span></div>}
        </div>
      </>
    )}
  </section>;
}
