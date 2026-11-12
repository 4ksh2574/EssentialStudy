import { useEffect, useState, type FormEvent } from "react";
import { BookOpen, Check, Plus, Trash2 } from "lucide-react";
type Chapter = { id: string; title: string; done: boolean };
type Props = { subjects: string[] };
const KEY = "essentialstudy.syllabus";
function readSyllabus(): Record<string, Chapter[]> { try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) as Record<string, Chapter[]> : {}; } catch { return {}; } }
export default function Syllabus({ subjects }: Props) {
 const [chapters, setChapters] = useState<Record<string, Chapter[]>>(readSyllabus);
 const [active, setActive] = useState(subjects[0] ?? "");
 const [draft, setDraft] = useState("");
 useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(chapters)); } catch { /* Keep this session usable. */ } }, [chapters]);
 useEffect(() => { if (!subjects.includes(active)) setActive(subjects[0] ?? ""); }, [subjects, active]);
 const items = chapters[active] ?? [];
 const completed = items.filter(item => item.done).length;
 const addChapter = (event: FormEvent) => { event.preventDefault(); const title = draft.trim(); if (!title || !active) return; setChapters(current => ({ ...current, [active]: [...(current[active] ?? []), { id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()), title, done: false }] })); setDraft(""); };
 if (!subjects.length) return <section className="syllabus-page"><p className="eyebrow">YOUR ACADEMICS</p><h1>Syllabus<span>.</span></h1><p className="syllabus-muted">Add subjects in your profile to organise chapters.</p></section>;
 return <section className="syllabus-page"><div className="syllabus-heading"><div><p className="eyebrow">YOUR ACADEMICS</p><h1>Syllabus<span>.</span></h1><p className="syllabus-muted">Track chapters at your own pace.</p></div></div>
 <div className="syllabus-subjects">{subjects.map(subject => <button key={subject} className={active === subject ? "syllabus-subject active" : "syllabus-subject"} onClick={() => setActive(subject)}>{subject}</button>)}</div>
 <div className="syllabus-progress"><div><strong>{active}</strong><span>{completed} of {items.length} completed</span></div><div className="syllabus-progress-track"><span style={{ width: (items.length ? completed / items.length * 100 : 0) + "%" }} /></div></div>
 <form className="syllabus-add" onSubmit={addChapter}><input value={draft} onChange={event => setDraft(event.target.value)} maxLength={100} placeholder="Add a chapter or topic" aria-label="Chapter name" /><button type="submit" aria-label="Add chapter" disabled={!draft.trim()}><Plus size={18} /></button></form>
 <div className="syllabus-chapters">{items.map(item => <article className={item.done ? "syllabus-chapter done" : "syllabus-chapter"} key={item.id}><button className="syllabus-check" onClick={() => setChapters(current => ({ ...current, [active]: current[active].map(chapter => chapter.id === item.id ? { ...chapter, done: !chapter.done } : chapter) }))} aria-label={item.done ? "Mark incomplete" : "Mark complete"}>{item.done && <Check size={14} />}</button><span>{item.title}</span><button className="syllabus-delete" onClick={() => setChapters(current => ({ ...current, [active]: current[active].filter(chapter => chapter.id !== item.id) }))} aria-label="Delete chapter"><Trash2 size={15} /></button></article>)}{items.length === 0 && <div className="syllabus-empty"><BookOpen size={22} /><strong>No chapters yet</strong><span>Add the first chapter for {active}.</span></div>}</div></section>;
}