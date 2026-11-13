import { useMemo } from "react";
import { BarChart3, BookOpen, CalendarClock, CheckCircle2, ClipboardCheck, Clock3 } from "lucide-react";

type Task = { id?: string; completed?: boolean; subject?: string };
type Chapter = { title?: string; status?: string; done?: boolean };
type Exam = { id?: string; title?: string; subject?: string; date?: string };
type Revision = { id?: string; subject?: string; chapter?: string; status?: string; date?: string };
type Slot = { id?: string; day?: string; title?: string; subject?: string; start?: string; end?: string; kind?: string };
type Props = { subjects: string[] };
const read = <T,>(key: string, fallback: T): T => {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; }
  catch { return fallback; }
};
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
const dayNames = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const statusProgress: Record<string,number> = {
  "Not started":0, "Partially complete":25, "Basics complete":55,
  "Theory complete":55, "Numericals complete":55, "Fully complete":100
};
function mins(value?: string) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return 0;
  const [h,m] = value.split(":").map(Number);
  return h * 60 + m;
}
function duration(value: number) {
  const h=Math.floor(value/60), m=value%60;
  return [h ? h+"h" : "", m ? m+"m" : ""].filter(Boolean).join(" ") || "0m";
}
function prettyDate(value?: string) {
  if (!value) return "";
  const d=new Date(value+"T00:00:00");
  return Number.isNaN(d.getTime()) ? "" : new Intl.DateTimeFormat(undefined,{day:"numeric",month:"short"}).format(d);
}
export default function Analytics({subjects}:Props) {
  const tasks = read<Task[]>("essentialstudy.tasks",[]);
  const syllabus = read<Record<string,Chapter[]>>("essentialstudy.syllabus",{});
  const exams = read<Exam[]>("essentialstudy.exams",[]);
  const revision = read<Revision[]>("essentialstudy.revision",[]);
  const slots = read<Slot[]>("essentialstudy.timetable",[]);
  const taskDone = tasks.filter(t=>t.completed).length;
  const taskRate = tasks.length ? Math.round(taskDone/tasks.length*100) : 0;
  const allChapters = subjects.flatMap(subject=>(Array.isArray(syllabus[subject])?syllabus[subject]:[]).map(ch=>({...ch,subject})));
  const syllabusRate = allChapters.length ? Math.round(allChapters.reduce((sum,ch)=>sum+(statusProgress[ch.status || (ch.done ? "Fully complete":"Not started")] ?? 0),0)/allChapters.length) : 0;
  const revised = revision.filter(item=>item.status==="Revised").length;
  const revisionRate = revision.length ? Math.round(revised/revision.length*100) : 0;
  const today = dateKey(new Date());
  const nextExam = exams.filter(e=>e.date && e.date>=today).sort((a,b)=>(a.date||"").localeCompare(b.date||""))[0];
  const weekly = useMemo(()=>dayNames.map((name,index)=>{
    const dayFull=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"][index];
    const total=slots.filter(s=>s.day===dayFull && s.kind==="Study").reduce((sum,s)=>sum+Math.max(0,mins(s.end)-mins(s.start)),0);
    return {name,total};
  }),[slots]);
  const maxMinutes = Math.max(60,...weekly.map(d=>d.total));
  const weeklyTotal = weekly.reduce((sum,d)=>sum+d.total,0);
  const subjectStats = subjects.map(subject=>{
    const chapters=Array.isArray(syllabus[subject])?syllabus[subject]:[];
    const percent=chapters.length?Math.round(chapters.reduce((sum,ch)=>sum+(statusProgress[ch.status || (ch.done?"Fully complete":"Not started")]??0),0)/chapters.length):0;
    return {subject,percent,total:chapters.length,done:chapters.filter(ch=>ch.status==="Fully complete"||(!ch.status&&ch.done)).length};
  }).filter(s=>s.total).sort((a,b)=>b.percent-a.percent);
  const hasData = tasks.length || allChapters.length || revision.length || slots.length || exams.length;

  return <section className="analytics-page">
    <header className="analytics-heading"><div><p className="eyebrow">YOUR STUDY PATTERNS</p><h1>Analytics<span>.</span></h1><p className="analytics-muted">A clear snapshot of the work you have planned and completed.</p></div></header>
    <div className="analytics-stats">
      <article className="analytics-stat"><span><CheckCircle2 size={17}/></span><small>TASKS COMPLETED</small><strong>{taskDone}<i> / {tasks.length}</i></strong><div className="analytics-track"><b style={{width:taskRate+"%"}}/></div><em>{tasks.length?taskRate+"% complete":"No tasks yet"}</em></article>
      <article className="analytics-stat"><span><BookOpen size={17}/></span><small>SYLLABUS PROGRESS</small><strong>{allChapters.length?syllabusRate+"%":"—"}</strong><div className="analytics-track"><b style={{width:syllabusRate+"%"}}/></div><em>{allChapters.length?allChapters.length+" chapters added":"Add chapters in Syllabus"}</em></article>
      <article className="analytics-stat"><span><ClipboardCheck size={17}/></span><small>REVISION COMPLETE</small><strong>{revision.length?revisionRate+"%":"—"}</strong><div className="analytics-track"><b style={{width:revisionRate+"%"}}/></div><em>{revision.length?revised+" of "+revision.length+" topics revised":"No revision topics yet"}</em></article>
      <article className="analytics-stat"><span><CalendarClock size={17}/></span><small>NEXT EXAM</small><strong className="analytics-exam">{nextExam?.title || "—"}</strong><em>{nextExam?prettyDate(nextExam.date)+" · "+(nextExam.subject||""):"No upcoming exam added"}</em></article>
    </div>
    <div className="analytics-lower">
      <article className="analytics-panel analytics-week">
        <div className="analytics-panel-heading"><div><p className="eyebrow">TIMETABLE</p><h2>Planned study time</h2></div><span><Clock3 size={14}/> {duration(weeklyTotal)} / week</span></div>
        <div className="analytics-bars" role="img" aria-label="Planned study minutes by weekday">
          {weekly.map(day=><div className="analytics-bar-column" key={day.name}><div className="analytics-bar-track"><i style={{height:Math.max(day.total?5:0,day.total/maxMinutes*100)+"%"}}/></div><small>{day.name}</small><b>{day.total?duration(day.total):"—"}</b></div>)}
        </div>
        <p className="analytics-footnote">Based on Study blocks in your weekly timetable, not a timer or actual tracked hours.</p>
      </article>
      <article className="analytics-panel analytics-subjects">
        <div className="analytics-panel-heading"><div><p className="eyebrow">SYLLABUS</p><h2>By subject</h2></div><BookOpen size={16}/></div>
        {subjectStats.length ? <div className="analytics-subject-list">{subjectStats.map(item=><div className="analytics-subject" key={item.subject}><div><strong>{item.subject}</strong><span>{item.done}/{item.total} complete</span></div><div className="analytics-track"><b style={{width:item.percent+"%"}}/></div><small>{item.percent}%</small></div>)}</div> : <div className="analytics-small-empty">Add chapters to your subjects to see progress here.</div>}
      </article>
    </div>
    {!hasData && <div className="analytics-empty"><BarChart3 size={22}/><strong>Your study data will appear here</strong><p>Start with a task, syllabus chapter, revision topic or timetable block. Analytics will update automatically.</p></div>}
    <p className="analytics-note">Your analytics are calculated from data saved in this browser. They are not synced across devices.</p>
  </section>;
}
