import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from "react";
import { ArrowLeft, BookOpen, Check, ChevronRight, Folder, Pencil, Plus, Trash2 } from "lucide-react";

type ChapterStatus = "Not started" | "Partially complete" | "Basics complete" | "Theory complete" | "Numericals complete" | "Fully complete";
type Chapter = { id: string; title: string; status: ChapterStatus };
type FolderLayout = { cols: number; rows: number };
type Gesture = { kind: "resize" | "move"; subject: string; pointerId: number; x: number; y: number; cols: number; rows: number; over: string | null; lastCols: number; lastRows: number };
type Props = { subjects: string[] };
const KEY = "essentialstudy.syllabus";
const LAYOUT_KEY = "essentialstudy.syllabus.folderLayout";
const STATUSES: ChapterStatus[] = ["Not started", "Partially complete", "Basics complete", "Theory complete", "Numericals complete", "Fully complete"];
const DEFAULT_LAYOUT: FolderLayout = { cols: 6, rows: 3 };

function readSyllabus(): Record<string, Chapter[]> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Array<Partial<Chapter> & { done?: boolean }>>;
    return Object.fromEntries(Object.entries(parsed).map(([subject, items]) => [subject, (Array.isArray(items) ? items : []).map(item => ({
      id: item.id || (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random())),
      title: item.title || "Untitled chapter",
      status: STATUSES.includes(item.status as ChapterStatus) ? item.status as ChapterStatus : item.done ? "Fully complete" : "Not started"
    }))]));
  } catch { return {}; }
}

function readFolderLayout(): { sizes: Record<string, FolderLayout>; order: string[] } {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (!raw) return { sizes: {}, order: [] };
    const parsed = JSON.parse(raw) as { sizes?: Record<string, FolderLayout>; order?: string[] };
    const sizes = Object.fromEntries(Object.entries(parsed.sizes ?? {}).filter(([, value]) => value && Number.isFinite(value.cols) && Number.isFinite(value.rows)).map(([subject, value]) => [subject, {
      cols: Math.max(3, Math.min(12, Math.round(value.cols))),
      rows: Math.max(2, Math.min(7, Math.round(value.rows)))
    }]));
    return { sizes, order: Array.isArray(parsed.order) ? parsed.order.filter(item => typeof item === "string") : [] };
  } catch { return { sizes: {}, order: [] }; }
}

function progressValue(status: ChapterStatus) {
  if (status === "Fully complete") return 100;
  if (status === "Not started") return 0;
  if (status === "Partially complete") return 25;
  return 55;
}

export default function Syllabus({ subjects }: Props) {
  const initialLayout = useRef(readFolderLayout());
  const [chapters, setChapters] = useState<Record<string, Chapter[]>>(readSyllabus);
  const [folderSizes, setFolderSizes] = useState<Record<string, FolderLayout>>(initialLayout.current.sizes);
  const [folderOrder, setFolderOrder] = useState<string[]>(initialLayout.current.order);
  const [active, setActive] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(chapters)); } catch { /* Keep this session usable. */ } }, [chapters]);
  useEffect(() => { try { localStorage.setItem(LAYOUT_KEY, JSON.stringify({ sizes: folderSizes, order: folderOrder })); } catch { /* Keep this session usable. */ } }, [folderSizes, folderOrder]);
  useEffect(() => {
    if (active && !subjects.includes(active)) setActive(null);
    setFolderOrder(current => current.filter(item => subjects.includes(item)));
  }, [subjects, active]);

  const subjectStats = useMemo(() => subjects.map(subject => {
    const items = chapters[subject] ?? [];
    const average = items.length ? Math.round(items.reduce((sum, item) => sum + progressValue(item.status), 0) / items.length) : 0;
    return { subject, total: items.length, completed: items.filter(item => item.status === "Fully complete").length, average };
  }), [subjects, chapters]);
  const orderedStats = useMemo(() => {
    const rank = new Map(folderOrder.map((subject, index) => [subject, index]));
    return [...subjectStats].sort((a, b) => (rank.get(a.subject) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.subject) ?? Number.MAX_SAFE_INTEGER));
  }, [subjectStats, folderOrder]);
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

  const startGesture = (kind: Gesture["kind"], subject: string, event: ReactPointerEvent<HTMLElement>) => {
    if (!editMode || !gridRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    const current = folderSizes[subject] ?? DEFAULT_LAYOUT;
    gesture.current = { kind, subject, pointerId: event.pointerId, x: event.clientX, y: event.clientY, cols: current.cols, rows: current.rows, over: subject, lastCols: current.cols, lastRows: current.rows };
    gridRef.current.setPointerCapture(event.pointerId);
    if (kind === "move") {
      setDragging(subject);
      const tile = gridRef.current.querySelector<HTMLElement>(`[data-subject="${CSS.escape(subject)}"]`);
      tile?.classList.add("is-dragging");
    }
  };

  const moveGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId || !gridRef.current) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (current.kind === "resize") {
      const style = window.getComputedStyle(gridRef.current);
      const gap = Number.parseFloat(style.columnGap) || 0;
      const rowGap = Number.parseFloat(style.rowGap) || 0;
      const rowHeight = Number.parseFloat(style.gridAutoRows) || 40;
      const cellWidth = (gridRef.current.getBoundingClientRect().width - gap * 11) / 12;
      const cols = Math.max(3, Math.min(12, current.cols + Math.round(dx / (cellWidth + gap))));
      const rows = Math.max(2, Math.min(7, current.rows + Math.round(dy / (rowHeight + rowGap))));
      if (cols !== current.lastCols || rows !== current.lastRows) {
        current.lastCols = cols;
        current.lastRows = rows;
        setFolderSizes(previous => ({ ...previous, [current.subject]: { cols, rows } }));
      }
      return;
    }

    const tile = gridRef.current.querySelector<HTMLElement>(`[data-subject="${CSS.escape(current.subject)}"]`);
    if (tile) tile.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(1.025)`;
    const candidates = [...gridRef.current.querySelectorAll<HTMLElement>("[data-subject]")].filter(node => node.dataset.subject !== current.subject);
    let target: HTMLElement | null = null;
    let best = Number.POSITIVE_INFINITY;
    for (const candidate of candidates) {
      const rect = candidate.getBoundingClientRect();
      const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      if (inside) { target = candidate; break; }
      const distance = Math.hypot(event.clientX - (rect.left + rect.width / 2), event.clientY - (rect.top + rect.height / 2));
      if (distance < best) { best = distance; target = candidate; }
    }
    gridRef.current.querySelectorAll(".drop-target").forEach(node => node.classList.remove("drop-target"));
    if (target && best < 180) {
      current.over = target.dataset.subject ?? current.subject;
      target.classList.add("drop-target");
    } else current.over = current.subject;
  };

  const endGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId || !gridRef.current) return;
    const tile = gridRef.current.querySelector<HTMLElement>(`[data-subject="${CSS.escape(current.subject)}"]`);
    if (tile) { tile.style.transform = ""; tile.classList.remove("is-dragging"); }
    gridRef.current.querySelectorAll(".drop-target").forEach(node => node.classList.remove("drop-target"));
    if (current.kind === "move" && current.over && current.over !== current.subject) {
      setFolderOrder(previous => {
        const all = [...subjects].sort((a, b) => {
          const ai = previous.indexOf(a), bi = previous.indexOf(b);
          return (ai < 0 ? Number.MAX_SAFE_INTEGER : ai) - (bi < 0 ? Number.MAX_SAFE_INTEGER : bi);
        });
        const from = all.indexOf(current.subject), to = all.indexOf(current.over!);
        if (from < 0 || to < 0) return previous;
        all.splice(from, 1);
        all.splice(to, 0, current.subject);
        return all;
      });
    }
    gesture.current = null;
    setDragging(null);
  };

  if (!subjects.length) return <section className="syllabus-page"><p className="eyebrow">YOUR ACADEMICS</p><h1>Syllabus<span>.</span></h1><p className="syllabus-muted">Add subjects in your profile to create your study folders.</p></section>;

  return <section className="syllabus-page">
    <div className="syllabus-heading">
      {active && <button className="syllabus-back" onClick={() => { setActive(null); setDraft(""); setEditMode(false); }}><ArrowLeft size={16} /> All subjects</button>}
      <div className="syllabus-heading-row"><div><p className="eyebrow">YOUR ACADEMICS</p><h1>{active || "Syllabus"}<span>.</span></h1></div>
        {!active && <button className={editMode ? "syllabus-edit-toggle is-active" : "syllabus-edit-toggle"} onClick={() => setEditMode(value => !value)} aria-pressed={editMode} aria-label={editMode ? "Finish editing subjects" : "Edit subjects"} title={editMode ? "Done editing" : "Edit layout"}>{editMode ? <Check size={17} /> : <Pencil size={17} />}<span>{editMode ? "Done" : "Edit"}</span></button>}
      </div>
      <p className="syllabus-muted">{active ? "Keep track of what you have covered in this subject." : editMode ? "Drag a folder to move it. Pull its corner grip to resize." : "Your subjects, organised in one place."}</p>
    </div>

    {!active ? <div className={editMode ? "syllabus-folder-grid edit-mode" : "syllabus-folder-grid"} ref={gridRef} onPointerMove={moveGesture} onPointerUp={endGesture} onPointerCancel={endGesture}>
      {orderedStats.map(({ subject, total, completed, average }) => {
        const size = folderSizes[subject] ?? DEFAULT_LAYOUT;
        return <article className={dragging === subject ? "syllabus-folder is-dragging" : "syllabus-folder"} key={subject} data-subject={subject}
          style={{ gridColumn: `span ${size.cols}`, gridRow: `span ${size.rows}` }}
          onPointerDown={event => startGesture("move", subject, event)}>
          <button className="syllabus-folder-open" onClick={() => { if (!editMode) setActive(subject); }} aria-label={editMode ? `${subject}, editing layout` : `Open ${subject} folder`} tabIndex={editMode ? -1 : 0}>
            <span className="syllabus-folder-top"><span className="syllabus-folder-icon"><Folder size={21} /></span><ChevronRight size={17} className="syllabus-folder-arrow" /></span>
            <strong>{subject}</strong><span className="syllabus-folder-meta">{total} {total === 1 ? "chapter" : "chapters"} · {completed} completed</span>
            <span className="syllabus-folder-track"><span style={{ width: average + "%" }} /></span><span className="syllabus-folder-percent">{average}% covered</span>
          </button>
          {editMode && <button className="syllabus-folder-resize" onPointerDown={event => startGesture("resize", subject, event)} aria-label={`Resize ${subject} folder`} title="Drag to resize"><span className="syllabus-cotton-grip" aria-hidden="true" /></button>}
        </article>;
      })}
    </div> : <>
      <div className="syllabus-subject-summary"><div><strong>{activeItems.length}</strong><span>chapters</span></div><div><strong>{activeItems.filter(item => item.status === "Fully complete").length}</strong><span>fully complete</span></div><div className="syllabus-subject-progress"><div><span>Overall progress</span><strong>{totalProgress}%</strong></div><div className="syllabus-progress-track"><span style={{ width: totalProgress + "%" }} /></div></div></div>
      <form className="syllabus-add" onSubmit={addChapter}><input value={draft} onChange={event => setDraft(event.target.value)} maxLength={100} placeholder="Add a chapter" aria-label="Chapter name" /><button type="submit" aria-label="Add chapter" disabled={!draft.trim()}><Plus size={18} /></button></form>
      <div className="syllabus-chapters">{activeItems.map((item, index) => <article className={item.status === "Fully complete" ? "syllabus-chapter done" : "syllabus-chapter"} key={item.id}><span className="syllabus-chapter-number">{String(index + 1).padStart(2, "0")}</span><div className="syllabus-chapter-main"><strong>{item.title}</strong><span className="syllabus-chapter-status">{item.status === "Fully complete" ? <><Check size={12} /> Fully complete</> : item.status}</span></div><select className="syllabus-status-select" aria-label={`Progress for ${item.title}`} value={item.status} onChange={event => updateStatus(item.id, event.target.value as ChapterStatus)}>{STATUSES.map(status => <option key={status} value={status}>{status}</option>)}</select><button className="syllabus-delete" onClick={() => deleteChapter(item.id)} aria-label={`Delete ${item.title}`}><Trash2 size={15} /></button></article>)}{activeItems.length === 0 && <div className="syllabus-empty"><BookOpen size={22} /><strong>Your folder is empty</strong><span>Add the chapters you need to cover.</span></div>}</div>
    </>}
  </section>;
}
