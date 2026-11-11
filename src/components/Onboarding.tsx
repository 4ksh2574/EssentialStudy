import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, BookOpen, Check, GraduationCap, Plus, Sparkles, UserRound } from "lucide-react";

export type StudentProfile = {
  name: string;
  board: string;
  state: string;
  classLevel: string;
  session: string;
  school: string;
  subjects: string[];
};

type Props = { onComplete: (profile: StudentProfile) => void };

const boards = ["CBSE", "ICSE", "ISC", "State Board", "Other"];
const classes = Array.from({ length: 12 }, (_, i) => String(i + 1));

export default function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [board, setBoard] = useState("CBSE");
  const [state, setState] = useState("");
  const [classLevel, setClassLevel] = useState("11");
  const [session, setSession] = useState("2026–27");
  const [school, setSchool] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subjectInput, setSubjectInput] = useState("");
  const [error, setError] = useState("");

  const addSubject = () => {
    const value = subjectInput.trim().replace(/\s+/g, " ");
    if (!value) return;
    if (subjects.some((subject) => subject.toLowerCase() === value.toLowerCase())) {
      setError("That subject is already on your list.");
      return;
    }
    setSubjects((current) => [...current, value]);
    setSubjectInput("");
    setError("");
  };

  const next = () => {
    setError("");
    if (step === 0 && !name.trim()) {
      setError("Enter your name to continue.");
      return;
    }
    if (step === 1 && board === "State Board" && !state.trim()) {
      setError("Add your state or board name to continue.");
      return;
    }
    setStep((current) => Math.min(2, current + 1));
  };

  const finish = (event: FormEvent) => {
    event.preventDefault();
    onComplete({
      name: name.trim(),
      board,
      state: board === "State Board" ? state.trim() : "",
      classLevel,
      session,
      school: school.trim(),
      subjects
    });
  };

  const steps = [
    { title: "A little about you", detail: "Let's set up your personal study space.", icon: UserRound },
    { title: "Your academics", detail: "We'll use this to organise your school year.", icon: GraduationCap },
    { title: "Your subjects", detail: "Add the subjects you're studying right now.", icon: BookOpen }
  ];
  const StepIcon = steps[step].icon;

  return (
    <main className="onboarding-screen">
      <div className="onboarding-glow onboarding-glow-a" />
      <div className="onboarding-glow onboarding-glow-b" />
      <header className="onboarding-top">
        <a className="brand" href="#welcome" aria-label="EssentialStudy home">
          <span className="brand-mark"><GraduationCap size={21} strokeWidth={2.2} /></span>
          <span>Essential<span className="brand-accent">Study</span></span>
        </a>
        <span className="setup-label"><Sparkles size={14} /> PERSONAL SETUP</span>
      </header>

      <section className="onboarding-wrap">
        <div className="onboarding-progress" aria-label={`Step ${step + 1} of 3`}>
          {steps.map((item, index) => (
            <div className={index <= step ? "progress-segment complete" : "progress-segment"} key={item.title}>
              <span />
            </div>
          ))}
        </div>
        <div className="onboarding-step-count">STEP {step + 1} <span>OF 3</span></div>

        <AnimatePresence mode="wait">
          <motion.form
            key={step}
            className="onboarding-card"
            onSubmit={step === 2 ? finish : (event) => { event.preventDefault(); next(); }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            <div className="onboarding-icon"><StepIcon size={22} /></div>
            <p className="eyebrow">LET'S MAKE IT YOURS</p>
            <h1>{steps[step].title}</h1>
            <p className="onboarding-subtitle">{steps[step].detail}</p>

            {step === 0 && (
              <div className="field-stack">
                <label className="field-label" htmlFor="student-name">What should we call you?</label>
                <input id="student-name" autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" maxLength={60} />
                <label className="field-label" htmlFor="school-name">School name <span className="optional">OPTIONAL</span></label>
                <input id="school-name" value={school} onChange={(event) => setSchool(event.target.value)} placeholder="Your school" maxLength={100} />
                <p className="privacy-note">Your profile stays private unless you choose to share it.</p>
              </div>
            )}

            {step === 1 && (
              <div className="field-stack">
                <label className="field-label" htmlFor="board">Board</label>
                <select id="board" value={board} onChange={(event) => setBoard(event.target.value)}>
                  {boards.map((item) => <option key={item}>{item}</option>)}
                </select>
                {board === "State Board" && (
                  <>
                    <label className="field-label" htmlFor="state-name">State / board name</label>
                    <input id="state-name" value={state} onChange={(event) => setState(event.target.value)} placeholder="e.g. Delhi, Maharashtra" maxLength={70} />
                  </>
                )}
                <div className="field-pair">
                  <div>
                    <label className="field-label" htmlFor="class-level">Class</label>
                    <select id="class-level" value={classLevel} onChange={(event) => setClassLevel(event.target.value)}>
                      {classes.map((item) => <option value={item} key={item}>Class {item}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="field-label" htmlFor="session">Academic session</label>
                    <select id="session" value={session} onChange={(event) => setSession(event.target.value)}>
                      <option>2025–26</option><option>2026–27</option><option>2027–28</option><option>2028–29</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="field-stack">
                <label className="field-label" htmlFor="subject-input">Add a subject <span className="optional">YOU CAN EDIT THESE LATER</span></label>
                <div className="subject-entry">
                  <input id="subject-input" value={subjectInput} onChange={(event) => { setSubjectInput(event.target.value); setError(""); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addSubject(); } }} placeholder="e.g. Mathematics" maxLength={45} />
                  <button type="button" className="subject-add" onClick={addSubject} aria-label="Add subject"><Plus size={18} /></button>
                </div>
                <div className="subject-chips">
                  {subjects.length === 0 ? <span className="subject-empty">Your subjects will appear here.</span> : subjects.map((subject) => (
                    <button type="button" className="subject-chip" key={subject} onClick={() => setSubjects((current) => current.filter((item) => item !== subject))}>
                      {subject}<span aria-hidden="true">×</span>
                    </button>
                  ))}
                </div>
                <p className="privacy-note">No syllabus is preloaded. You stay in control of your subjects and chapters.</p>
              </div>
            )}

            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="onboarding-actions">
              {step > 0 && <button type="button" className="back-button" onClick={() => { setError(""); setStep((current) => current - 1); }}><ArrowLeft size={16} /> Back</button>}
              <button type="submit" className="primary-button onboarding-next">
                {step === 2 ? <>Create my study space <Check size={16} /></> : <>Continue <ArrowRight size={16} /></>}
              </button>
            </div>
            {step === 2 && <button type="button" className="skip-subjects" onClick={() => onComplete({ name: name.trim(), board, state: board === "State Board" ? state.trim() : "", classLevel, session, school: school.trim(), subjects: [] })}>I'll add subjects later</button>}
          </motion.form>
        </AnimatePresence>
        <p className="onboarding-footnote">A focused space for your learning journey.</p>
      </section>
    </main>
  );
}
