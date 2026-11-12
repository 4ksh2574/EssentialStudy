import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, X, Pencil, Trash2, Check, ClipboardList, Gift, Sun, GraduationCap, Flag, PartyPopper } from "lucide-react";

type EventType = "Birthday" | "Holiday" | "Personal event" | "Exam" | "Deadline";
type CalendarEvent = { id:string; title:string; date:string; type:EventType; details:string; yearly:boolean; createdAt:number };
type StudyTask = { id:string; title:string; subject:string; dueDate:string; completed:boolean };
const EVENT_KEY="essentialstudy.calendar.events";
const TASK_KEY="essentialstudy.tasks";
const types:EventType[]=["Personal event","Birthday","Holiday","Exam","Deadline"];
const nationalDays=[{title:"Republic Day",date:"01-26"},{title:"Independence Day",date:"08-15"},{title:"Gandhi Jayanti",date:"10-02"}];
const weekdays=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const dateValue=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const dateObj=(s:string)=>new Date(`${s}T12:00:00`);
const validDate=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s);
function readEvents():CalendarEvent[]{try{const v=JSON.parse(localStorage.getItem(EVENT_KEY)||"[]");return Array.isArray(v)?v.filter(x=>x&&typeof x.id==="string"&&typeof x.title==="string"&&validDate(x.date)&&types.includes(x.type)&&typeof x.details==="string"):[]}catch{return[]}}
function readTasks():StudyTask[]{try{const v=JSON.parse(localStorage.getItem(TASK_KEY)||"[]");return Array.isArray(v)?v.filter(x=>x&&typeof x.id==="string"&&typeof x.title==="string"&&typeof x.dueDate==="string"&&typeof x.completed==="boolean"):[]}catch{return[]}}
function makeId(){return crypto.randomUUID?.()??`${Date.now()}-${Math.random()}`}
function monthDays(month:Date){const first=new Date(month.getFullYear(),month.getMonth(),1);const start=new Date(month.getFullYear(),month.getMonth(),1-first.getDay());return Array.from({length:42},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d})}
function niceDate(s:string){return dateObj(s).toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})}
function eventOnDate(e:CalendarEvent,date:string){return e.yearly?e.date.slice(5)===date.slice(5):e.date===date}
function builtIns(date:string){return nationalDays.filter(x=>x.date===date.slice(5)).map(x=>({...x,type:"Holiday" as const,id:`national-${x.date}`,details:"National observance",yearly:true,createdAt:0}))}
function iconFor(type:string){if(type==="Birthday")return Gift;if(type==="Holiday")return Sun;if(type==="Exam")return GraduationCap;if(type==="Deadline")return Flag;if(type==="Personal event")return PartyPopper;return CalendarDays}
export default function Calendar(){
 const [events,setEvents]=useState<CalendarEvent[]>(readEvents);
 const [tasks,setTasks]=useState<StudyTask[]>(readTasks);
 const [month,setMonth]=useState(()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth(),1)});
 const [selected,setSelected]=useState(dateValue(new Date()));
 const [formOpen,setFormOpen]=useState(false);
 const [editing,setEditing]=useState<string|null>(null);
 const [title,setTitle]=useState("");
 const [date,setDate]=useState(dateValue(new Date()));
 const [type,setType]=useState<EventType>("Personal event");
 const [details,setDetails]=useState("");
 const [yearly,setYearly]=useState(false);
 const [error,setError]=useState("");
 useEffect(()=>{try{localStorage.setItem(EVENT_KEY,JSON.stringify(events))}catch{}},[events]);
 useEffect(()=>{const refresh=()=>setTasks(readTasks());window.addEventListener("focus",refresh);window.addEventListener("storage",refresh);return()=>{window.removeEventListener("focus",refresh);window.removeEventListener("storage",refresh)}},[]);
 const days=useMemo(()=>monthDays(month),[month]);
 const selectedEvents=useMemo(()=>[...events.filter(e=>eventOnDate(e,selected)),...builtIns(selected)], [events,selected]);
 const selectedTasks=tasks.filter(t=>t.dueDate===selected);
 const eventsFor=(d:string)=>events.filter(e=>eventOnDate(e,d)).length+builtIns(d).length;
 const tasksFor=(d:string)=>tasks.filter(t=>t.dueDate===d).length;
 const monthLabel=month.toLocaleDateString("en-IN",{month:"long",year:"numeric"});
 const today=dateValue(new Date());
 const changeMonth=(n:number)=>{const next=new Date(month.getFullYear(),month.getMonth()+n,1);setMonth(next);setSelected(dateValue(next))};
 const openAdd=()=>{setEditing(null);setTitle("");setDate(selected);setType("Personal event");setDetails("");setYearly(false);setError("");setFormOpen(true)};
 const edit=(e:CalendarEvent)=>{setEditing(e.id);setTitle(e.title);setDate(e.date);setType(e.type);setDetails(e.details);setYearly(e.yearly);setError("");setFormOpen(true)};
 const close=()=>{setFormOpen(false);setEditing(null);setError("")};
 const save=(ev:FormEvent)=>{ev.preventDefault();if(!title.trim()||!validDate(date)){setError("Add a title and a valid date.");return}const item:CalendarEvent={id:editing??makeId(),title:title.trim(),date,type,details:details.trim(),yearly:type==="Birthday"&&yearly,createdAt:Date.now()};setEvents(current=>editing?current.map(x=>x.id===editing?{...item,createdAt:x.createdAt}:x):[item,...current]);setSelected(date);const d=dateObj(date);setMonth(new Date(d.getFullYear(),d.getMonth(),1));close()};
 const remove=(id:string)=>setEvents(current=>current.filter(e=>e.id!==id));
 return <section className="calendar-v2">
  <header className="cal2-header"><div><p className="eyebrow">YOUR DATES, AT A GLANCE</p><h1>Calendar</h1><p>Keep the important days close.</p></div><button className="cal2-add" onClick={openAdd}><Plus size={17}/> Add date</button></header>
  <div className="cal2-main">
   <section className="cal2-month">
    <div className="cal2-month-head"><div><span className="cal2-overline">MONTHLY VIEW</span><h2>{monthLabel}</h2></div><div className="cal2-month-controls"><button onClick={()=>{setMonth(new Date());setSelected(today)}}>Today</button><button aria-label="Previous month" onClick={()=>changeMonth(-1)}><ChevronLeft size={18}/></button><button aria-label="Next month" onClick={()=>changeMonth(1)}><ChevronRight size={18}/></button></div></div>
    <div className="cal2-weekdays">{weekdays.map(d=><span key={d}>{d}</span>)}</div>
    <div className="cal2-grid">{days.map(d=>{const value=dateValue(d);const count=eventsFor(value)+tasksFor(value);return <button key={value} onClick={()=>setSelected(value)} aria-pressed={selected===value} className={["cal2-day",d.getMonth()!==month.getMonth()?"muted":"",value===today?"today":"",value===selected?"chosen":""].join(" ")}><span>{d.getDate()}</span>{count>0&&<i className="cal2-dots"><b/><b className={eventsFor(value)>0?"has-event":""}/></i>}</button>})}</div>
    <div className="cal2-legend"><span><i className="dot-task"/> Study task</span><span><i className="dot-event"/> Personal date</span><span><i className="dot-holiday"/> Holiday</span></div>
   </section>
   <aside className="cal2-agenda"><div className="cal2-agenda-top"><div><span className="cal2-overline">YOUR AGENDA</span><h2>{niceDate(selected)}</h2></div><button aria-label="Add date" onClick={openAdd}><Plus size={18}/></button></div>
    {selectedTasks.length===0&&selectedEvents.length===0?<div className="cal2-empty"><CalendarDays size={24}/><strong>A clear day</strong><span>Nothing planned here yet.</span></div>:<div className="cal2-list">
     {selectedTasks.map(t=><article className="cal2-item" key={t.id}><span className="cal2-item-icon task"><ClipboardList size={17}/></span><div><strong>{t.title}</strong><small>{t.subject||"Study task"} · Planner</small></div><span className="cal2-kind">Task</span>{t.completed&&<Check size={14}/>}</article>)}
     {selectedEvents.map(e=>{const Icon=iconFor(e.type);return <article className="cal2-item" key={e.id}><span className={`cal2-item-icon ${e.type.toLowerCase().replace(" ","-")}`}><Icon size={17}/></span><div><strong>{e.title}</strong><small>{e.details||e.type}{e.yearly?" · Repeats yearly":""}</small></div><span className="cal2-kind">{e.type}</span>{!e.id.startsWith("national-")&&<div className="cal2-actions"><button aria-label="Edit date" onClick={()=>edit(e)}><Pencil size={14}/></button><button aria-label="Delete date" onClick={()=>remove(e.id)}><Trash2 size={14}/></button></div>}</article>})}
    </div>}
    <button className="cal2-add-inline" onClick={openAdd}><Plus size={15}/> Add something to this day</button>
   </aside>
  </div>
  {formOpen&&<div className="cal2-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><form className="cal2-form" onSubmit={save}><div className="cal2-form-head"><div><span className="cal2-overline">{editing?"EDIT DATE":"MAKE A DATE"} </span><h2>{editing?"Update details":"Add to calendar"}</h2></div><button type="button" aria-label="Close" onClick={close}><X size={18}/></button></div>
   <label className="cal2-field"><span>What is it?</span><input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Birthday, school event..." maxLength={80}/></label>
   <div className="cal2-form-row"><label className="cal2-field"><span>Date</span><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label className="cal2-field"><span>Category</span><select value={type} onChange={e=>{setType(e.target.value as EventType);if(e.target.value!=="Birthday")setYearly(false)}}>{types.map(t=><option key={t}>{t}</option>)}</select></label></div>
   <label className="cal2-field"><span>Notes <small>Optional</small></span><textarea value={details} onChange={e=>setDetails(e.target.value)} rows={2} maxLength={200} placeholder="A little detail to remember"/></label>
   {type==="Birthday"&&<label className="cal2-repeat"><input type="checkbox" checked={yearly} onChange={e=>setYearly(e.target.checked)}/> Repeat every year</label>}
   {error&&<p className="cal2-error">{error}</p>}<div className="cal2-form-footer"><button type="button" onClick={close}>Cancel</button><button type="submit">{editing?"Save changes":"Save date"}</button></div>
  </form></div>}
 </section>
}