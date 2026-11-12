import { useState } from "react";
import Onboarding, { type StudentProfile } from "./components/Onboarding";
import Planner from "./components/Planner";
import { AnimatePresence, motion } from "motion/react";
import {
  BookOpen, CalendarDays, Check, ChevronRight, CircleHelp,
  Clock3, GraduationCap, LayoutDashboard, ListTodo, Moon,
  Plus, Search, Settings2, Sparkles, Sun, Target
} from "lucide-react";

type Section = "Home" | "Planner" | "Syllabus" | "Calendar";

const navItems = [
  { label: "Home" as const, icon: LayoutDashboard },
  { label: "Planner" as const, icon: ListTodo },
  { label: "Syllabus" as const, icon: BookOpen },
  { label: "Calendar" as const, icon: CalendarDays }
];

const tasks = [
  { title: "Revise quadratic equations", subject: "Mathematics", time: "Today · 5:00 PM", done: false },
  { title: "Read the chapter summary", subject: "Biology", time: "Today · 6:30 PM", done: false },
  { title: "Complete motion worksheet", subject: "Physics", time: "Tomorrow", done: true }
];

function App() {
  const [profile, setProfile] = useState<StudentProfile | null>(() => {
    try {
      const saved = localStorage.getItem("essentialstudy.profile");
      return saved ? JSON.parse(saved) as StudentProfile : null;
    } catch {
      return null;
    }
  });
  const [section, setSection] = useState<Section>("Home");
  const [dark, setDark] = useState(false);
  const [completed, setCompleted] = useState<string[]>(["Complete motion worksheet"]);

  const toggleTask = (title: string) => {
    setCompleted((current) =>
      current.includes(title) ? current.filter((item) => item !== title) : [...current, title]
    );
  };

  if (!profile) {
    return <Onboarding onComplete={(nextProfile) => {
      try {
        localStorage.setItem("essentialstudy.profile", JSON.stringify(nextProfile));
      } catch {
        // Continue with in-memory profile if browser storage is unavailable.
      }
      setProfile(nextProfile);
    }} />;
  }

  return (
    <main className={dark ? "app dark" : "app"}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar">
        <a className="brand" href="#home" onClick={() => setSection("Home")}>
          <span className="brand-mark"><GraduationCap size={21} strokeWidth={2.2} /></span>
          <span>Essential<span className="brand-accent">Study</span></span>
        </a>
        <div className="top-actions">
          <button className="icon-button" aria-label="Search"><Search size={18} /></button>
          <button className="icon-button" aria-label="Toggle theme" onClick={() => setDark(!dark)}>
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="profile-chip" aria-label="Profile and settings"><span>{profile.name.slice(0, 1).toUpperCase()}</span></button>
        </div>
      </header>

      <div className="page-layout">
        <aside className="sidebar">
          <p className="eyebrow">WORKSPACE</p>
          <nav className="side-nav" aria-label="Main navigation">
            {navItems.map(({ label, icon: Icon }) => (
              <button key={label} className={section === label ? "nav-link active" : "nav-link"} onClick={() => setSection(label)}>
                <Icon size={18} /><span>{label}</span>
                {section === label && <motion.span layoutId="nav-indicator" className="nav-indicator" />}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="help-card">
              <span className="help-icon"><CircleHelp size={17} /></span>
              <strong>Need a hand?</strong>
              <p>Your study space, one step at a time.</p>
              <button onClick={() => setSection("Planner")}>Explore planner <ChevronRight size={14} /></button>
            </div>
            <button className="settings-link"><Settings2 size={17} /> Settings</button>
          </div>
        </aside>

        <section className="content">
          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 9, filter: "blur(5px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -6, filter: "blur(3px)" }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              {section === "Planner" ? (
                <Planner subjects={profile.subjects} />
              ) : section === "Home" ? (
                <>
                  <div className="welcome-row">
                    <div>
                      <p className="eyebrow">YOUR PERSONAL STUDY SPACE</p>
                      <h1>A little progress,<br /><span>every day.</span></h1>
                      <p className="intro">Class {profile.classLevel} · {profile.board}{profile.state ? ` · ${profile.state}` : ""} · {profile.session}. A calmer place to plan, learn and keep moving forward.</p>
                    </div>
                    <div className="date-pill"><CalendarDays size={16} /> Wednesday, 11 November</div>
                  </div>

                  <div className="hero-card">
                    <div className="hero-copy">
                      <span className="hero-kicker"><Sparkles size={14} /> YOUR DAY, AT A GLANCE</span>
                      <h2>Make room for<br />what matters.</h2>
                      <p>Your study journey starts with one small step. Set up your workspace to make it yours.</p>
                      <button className="primary-button" onClick={() => setSection("Planner")}>Plan my day <ChevronRight size={16} /></button>
                    </div>
                    <div className="hero-art" aria-hidden="true">
                      <div className="orbit orbit-a" /><div className="orbit orbit-b" />
                      <div className="book-illustration"><BookOpen size={58} strokeWidth={1.2} /></div>
                      <span className="float-dot dot-a" /><span className="float-dot dot-b" />
                      <span className="float-star">✳</span>
                    </div>
                  </div>

                  <div className="section-heading">
                    <div><p className="eyebrow">A CLEAR START</p><h2>Your overview</h2></div>
                    <button className="text-button" onClick={() => setSection("Planner")}>View planner <ChevronRight size={15} /></button>
                  </div>

                  <div className="stats-grid">
                    <article className="stat-card"><span className="stat-icon mint"><ListTodo size={18} /></span><p>Tasks for today</p><strong>3</strong><small>Keep your momentum</small></article>
                    <article className="stat-card"><span className="stat-icon lilac"><Target size={18} /></span><p>Study goal</p><strong>—</strong><small>Set your daily target</small></article>
                    <article className="stat-card"><span className="stat-icon peach"><Clock3 size={18} /></span><p>Focus time</p><strong>—</strong><small>Your sessions will appear here</small></article>
                  </div>

                  <div className="section-heading task-heading">
                    <div><p className="eyebrow">STAY ON TRACK</p><h2>Coming up</h2></div>
                    <button className="text-button" onClick={() => setSection("Planner")}>All tasks <ChevronRight size={15} /></button>
                  </div>
                  <div className="task-list">
                    {tasks.map((task) => {
                      const done = completed.includes(task.title);
                      return <button className={done ? "task-row is-done" : "task-row"} key={task.title} onClick={() => toggleTask(task.title)}>
                        <span className="task-check">{done && <Check size={14} />}</span>
                        <span className="task-main"><strong>{task.title}</strong><small>{task.subject} · {task.time}</small></span>
                        <ChevronRight size={16} className="task-arrow" />
                      </button>;
                    })}
                  </div>
                </>
              ) : (
                <div className="empty-section">
                  <span className="empty-icon">{section === "Planner" ? <ListTodo /> : section === "Syllabus" ? <BookOpen /> : <CalendarDays />}</span>
                  <p className="eyebrow">ESSENTIALSTUDY / {section.toUpperCase()}</p>
                  <h1>{section}</h1>
                  <p>This space is being prepared. We'll build and test this module before moving to the next one.</p>
                  <button className="primary-button" onClick={() => setSection("Home")}>Back to overview <ChevronRight size={16} /></button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      </div>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navItems.map(({ label, icon: Icon }) => (
          <button key={label} className={section === label ? "mobile-nav-item active" : "mobile-nav-item"} onClick={() => setSection(label)}>
            <Icon size={19} /><span>{label}</span>
          </button>
        ))}
      </nav>
      <button className="quick-add" aria-label="Add a task" onClick={() => setSection("Planner")}><Plus size={22} /></button>
    </main>
  );
}

export default App;
