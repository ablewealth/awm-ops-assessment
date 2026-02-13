import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  collection
} from 'firebase/firestore';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged
} from 'firebase/auth';
import {
  Save,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  ArrowUpRight,
  FileText,
  Clock,
  ShieldCheck,
  BarChart3,
  Zap,
  Users,
  Lightbulb,
  Target,
  CircleDot,
  ClipboardCheck
} from 'lucide-react';

const firebaseConfig = typeof __firebase_config !== 'undefined'
  ? JSON.parse(__firebase_config)
  : {
      apiKey: "YOUR_API_KEY",
      authDomain: "your-project.firebaseapp.com",
      projectId: "your-project-id",
      storageBucket: "your-project.appspot.com",
      messagingSenderId: "your-sender-id",
      appId: "your-app-id"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const appId = typeof __app_id !== 'undefined' ? __app_id : 'able-wealth-ops-assessment-v1';

const RATING_LABELS = ['Developing', 'Building', 'Competent', 'Strong', 'Mastery'];

const SECTIONS = [
  {
    id: 'section-1',
    title: 'System Architecture & SOP Rigor',
    icon: 'FileText',
    description: 'Evaluate the strength of your documentation, standard operating procedures, and process design. Strong ops architecture means any team member can execute critical tasks from your documentation alone.',
    questions: [
      { id: 'sop_integrity', label: 'Do your current SOPs enable a new hire to complete core tasks correctly using only your documentation?', type: 'textarea', hint: 'Be specific about which processes are fully documented vs. tribal knowledge.' },
      { id: 'critical_workflows', label: 'Identify 3-5 critical workflows where SOPs are currently "audit-ready."', type: 'textarea' },
      { id: 'incomplete_workflows', label: 'Identify 2-3 workflows where SOPs are incomplete or outdated.', type: 'textarea', hint: 'Acknowledging gaps is a sign of operational maturity.' },
      { id: 'vendor_integration', label: 'For each vendor added in the last 6 months, have you created access/login docs and use cases?', type: 'textarea' },
      { id: 'recent_vendors', label: 'List the last 3 vendors integrated and link to SOPs or configuration notes.', type: 'text' },
      { id: 'root_cause_process', label: 'What is your standard process for identifying root causes when something breaks?', type: 'textarea' },
      { id: 'permanent_fixes', label: 'In the last 90 days, list 3 issues where you implemented a permanent process change (not just a quick fix).', type: 'textarea' },
      { id: 'process_simplification', label: 'How do you identify "process debt"? What steps have you removed or automated in the last 90 days?', type: 'textarea' },
      { id: 'arch_rating', label: 'How would you rate your operational architecture overall?', type: 'rating' },
      { id: 'arch_evidence', label: 'Identify one process that was previously disorganized and is now fully systematized.', type: 'textarea', hint: 'Walk through the before/after to show your improvement approach.' },
      { id: 'arch_documentation', label: 'Link to your primary SOP repository (Notion, Wealthbox, etc.)', type: 'text' },
      { id: 'arch_gap', label: 'What part of your operations still relies on manual steps, and why hasn\'t it been automated yet?', type: 'textarea' },
    ]
  },
  {
    id: 'section-2',
    title: 'Time Governance & Prioritization',
    icon: 'Clock',
    description: 'Assess how effectively you manage your time and attention. Great operations leaders have explicit systems for deciding what gets done and when — not just reacting to whatever feels urgent.',
    questions: [
      { id: 'prioritization_framework', label: 'What explicit system do you use to determine your daily and weekly focus areas?', type: 'textarea', hint: 'E.g., Eisenhower matrix, time-blocking, a specific task management methodology.' },
      { id: 'urgent_vs_important', label: 'How do you distinguish between "urgent" fires and "important" strategic projects?', type: 'textarea' },
      { id: 'prioritization_layout', label: 'Describe or link your current prioritization dashboard or layout.', type: 'text' },
      { id: 'ops_heartbeat', label: 'Do you have a structured cadence (daily, weekly, monthly) for operational reviews?', type: 'textarea' },
      { id: 'recurring_checklists', label: 'List your recurring checklists and rituals (Monday Review, Billing Prep, etc.).', type: 'textarea' },
      { id: 'pm_discipline', label: 'Where is the master project/task list maintained?', type: 'text' },
      { id: 'project_scrub', label: 'Describe your weekly "project scrub" ritual — how do you review and reprioritize open work?', type: 'textarea' },
      { id: 'scrub_proof', label: 'Provide proof of your last 3 project scrub updates or notes.', type: 'textarea' },
    ]
  },
  {
    id: 'section-3',
    title: 'Compliance & Execution',
    icon: 'ShieldCheck',
    description: 'Measure your ability to translate decisions into consistent, trackable outcomes. This section focuses on meeting governance, accountability systems, and how reliably things get done.',
    questions: [
      { id: 'meeting_governance', label: 'Do you consistently capture decisions and next steps from every meeting?', type: 'textarea' },
      { id: 'meeting_summary_log', label: 'Link to a recent meeting summary log.', type: 'text' },
      { id: 'status_visibility', label: 'Can you produce a complete report of every open action item across the firm right now?', type: 'textarea', hint: 'If not, what\'s preventing single-source-of-truth visibility?' },
      { id: 'training_materials', label: 'What 3 training or reference assets have you created to reduce failure or risk?', type: 'textarea' },
      { id: 'staff_accountability', label: 'How do you track that compliance tasks are actually being completed by staff?', type: 'textarea' },
      { id: 'feedback_loops', label: 'How is feedback from the team captured and incorporated back into SOPs?', type: 'textarea' },
      { id: 'policy_audit', label: 'Describe one example where policy drifted from practice, and your plan to reconcile it.', type: 'textarea' },
    ]
  },
  {
    id: 'section-4',
    title: 'Risk & Financial Stewardship',
    icon: 'BarChart3',
    description: 'Evaluate your role as a guardian of the firm\'s financial processes. Billing accuracy, error controls, and professional development all fall under operational stewardship.',
    questions: [
      { id: 'billing_logic', label: 'Describe the end-to-end fee calculation and billing logic — how does a fee go from AUM to invoice?', type: 'textarea' },
      { id: 'billing_controls', label: 'What specific human-error checks and reconciliation steps are built into the billing cycle?', type: 'textarea' },
      { id: 'billing_error_example', label: 'Give an example of an error that was caught by your controls before it reached a client.', type: 'textarea', hint: 'This demonstrates your controls are working, not a failure.' },
      { id: 'series_65_schedule', label: 'Series 65 Progress: Provide your study schedule, target exam date, and completed milestones.', type: 'textarea' },
    ]
  },
  {
    id: 'section-5',
    title: 'Time Leaks & Automation',
    icon: 'Zap',
    description: 'Identify where your time is being consumed by repetitive work and assess your approach to eliminating waste. The best operations leaders actively hunt for tasks that shouldn\'t require a human.',
    questions: [
      { id: 'time_leak_reflection', label: 'What single recurring task consumed the most time in your last month? Estimate hours per week.', type: 'textarea' },
      { id: 'permanent_fix_plan', label: 'What system or process change would permanently reduce that time leak? What resources do you need?', type: 'textarea' },
      { id: 'automation_target', label: 'If you could remove one manual process this month, what would it be?', type: 'textarea' },
      { id: 'implementation_plan', label: 'Outline a high-level plan: tool selection, dependencies, and first 3 implementation steps.', type: 'textarea', hint: 'Show that you can move from identifying a problem to building a plan.' },
    ]
  },
  {
    id: 'section-6',
    title: 'Leadership & Autonomy',
    icon: 'Users',
    description: 'Reflect on your growth as an operational leader. This section measures your ability to act independently, make sound decisions without escalation, and think across departmental boundaries.',
    questions: [
      { id: 'proactive_problem', label: 'Describe a situation you identified and resolved before the Partners were even aware of it.', type: 'textarea' },
      { id: 'vendor_roi', label: 'Which vendor currently provides the weakest ROI, and what would you recommend?', type: 'textarea' },
      { id: 'independent_decisions', label: 'List 2-3 operational decisions you made autonomously in the last quarter.', type: 'textarea' },
      { id: 'partner_decisions', label: 'List 2-3 decisions that still require Partner approval. What would need to change for you to own those?', type: 'textarea' },
      { id: 'autonomy_assessment', label: 'In what areas do you have full authority? Where are you still seeking routine approval you shouldn\'t need?', type: 'textarea', hint: 'Honest self-assessment here helps identify growth areas.' },
      { id: 'systems_thinking', label: 'Describe one recurring pattern you identified and the systemic solution you implemented.', type: 'textarea' },
      { id: 'cross_functional', label: 'Identify an operational issue that originated in another department. How did you address it?', type: 'textarea' },
    ]
  },
  {
    id: 'section-7',
    title: 'Problem Solving',
    icon: 'Lightbulb',
    description: 'Assess the complexity and effectiveness of the problems you tackle. Strong operations leaders don\'t just fix symptoms — they analyze patterns, build frameworks, and prevent recurrence.',
    questions: [
      { id: 'ps_rating', label: 'How would you rate your problem-solving capability?', type: 'rating' },
      { id: 'ps_complexity_evidence', label: 'Describe 2-3 complex operational problems you addressed. For each: what was the problem, your analysis, and the outcome.', type: 'textarea', hint: 'Focus on problems that required investigation, not just execution.' },
      { id: 'ps_gaps', label: 'What is your biggest opportunity to improve your problem-solving approach in the next 90 days?', type: 'textarea' },
    ]
  },
  {
    id: 'section-8',
    title: 'Strategic Clarity',
    icon: 'Target',
    description: 'Evaluate how well you translate the firm\'s high-level goals into concrete operational work. Strategic clarity means you understand not just what to do, but why it matters to the business.',
    questions: [
      { id: 'sc_rating', label: 'How would you rate your strategic clarity — your ability to connect daily work to firm objectives?', type: 'rating' },
      { id: 'sc_evidence', label: 'Give 2-3 examples where you translated a firm-level objective into a specific operational initiative.', type: 'textarea' },
      { id: 'sc_gaps', label: 'Where are the firm\'s strategic priorities least clear to you? What additional context would help?', type: 'textarea', hint: 'This helps Partners understand where to communicate more effectively.' },
    ]
  }
];

const ICON_MAP = {
  FileText, Clock, ShieldCheck, BarChart3, Zap, Users, Lightbulb, Target
};

const RatingInput = ({ value, onChange }) => {
  return (
    <div className="mt-2">
      <div className="flex gap-1 sm:gap-2">
        {[1, 2, 3, 4, 5].map((num) => (
          <button
            key={num}
            onClick={() => onChange(num)}
            className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all border
              ${value === num
                ? 'bg-navy-800 border-navy-800 text-white shadow-sm'
                : 'bg-white border-navy-200 text-navy-400 hover:border-navy-400 hover:text-navy-600'}`}
          >
            {num}
          </button>
        ))}
      </div>
      <div className="flex justify-between mt-2 px-1">
        {RATING_LABELS.map((label, i) => (
          <span key={label} className={`text-[10px] font-medium ${value === i + 1 ? 'text-navy-800' : 'text-navy-300'}`}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState(0);
  const [responses, setResponses] = useState({});
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Authentication Error:", err);
        setIsLoaded(true);
      }
    };

    initAuth();

    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'submissions', 'main');

    const unsubscribe = onSnapshot(docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setResponses(docSnap.data().responses || {});
          setLastSaved(docSnap.data().updatedAt?.toDate() || null);
        }
        setIsLoaded(true);
      },
      (error) => {
        console.error("Firestore Listen Error:", error);
        setIsLoaded(true);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const saveProgress = async (newResponses = responses) => {
    if (!user) return;
    setSaving(true);
    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'submissions', 'main');
      await setDoc(docRef, {
        responses: newResponses,
        updatedAt: new Date(),
        userId: user.uid,
        status: 'in-progress'
      }, { merge: true });
      setLastSaved(new Date());
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const updateResponse = (id, value) => {
    const updated = { ...responses, [id]: value };
    setResponses(updated);
  };

  const sectionProgress = useMemo(() => {
    return SECTIONS.map(section => {
      const total = section.questions.length;
      const completed = section.questions.filter(q => !!responses[q.id]).length;
      return { total, completed, percent: Math.round((completed / total) * 100) };
    });
  }, [responses]);

  const globalProgress = useMemo(() => {
    const total = SECTIONS.reduce((acc, s) => acc + s.questions.length, 0);
    const completed = Object.values(responses).filter(v => !!v).length;
    return { total, completed, percent: Math.round((completed / total) * 100) };
  }, [responses]);

  if (!isLoaded) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-navy-50">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-navy-600" />
        <p className="text-sm font-medium text-navy-600">Loading your assessment...</p>
      </div>
    );
  }

  const currentSection = SECTIONS[activeSection];
  const SectionIcon = ICON_MAP[currentSection.icon];
  const progress = sectionProgress[activeSection];

  return (
    <div className="min-h-screen bg-navy-50 font-sans text-navy-900 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-72 lg:w-80 bg-navy-900 text-white flex flex-col h-auto md:h-screen md:sticky md:top-0 shrink-0">
        <div className="px-5 pt-6 pb-5 border-b border-navy-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-navy-700 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight">Able Wealth Management</h1>
              <p className="text-[11px] text-navy-400">Operations Self-Assessment</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {SECTIONS.map((section, idx) => {
            const isActive = activeSection === idx;
            const prog = sectionProgress[idx];
            const isDone = prog.percent === 100;
            const Icon = ICON_MAP[section.icon];
            return (
              <button
                key={section.id}
                onClick={() => { setActiveSection(idx); window.scrollTo(0, 0); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group mb-0.5
                  ${isActive
                    ? 'bg-navy-800 text-white'
                    : 'text-navy-300 hover:bg-navy-800/50 hover:text-white'
                  }`}
              >
                <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0
                  ${isActive ? 'bg-teal-500/20 text-teal-400' : isDone ? 'bg-emerald-500/15 text-emerald-400' : 'bg-navy-700/50 text-navy-400'}`}>
                  {isDone ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] truncate ${isActive ? 'font-semibold' : 'font-medium'}`}>
                    {section.title}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${isDone ? 'text-emerald-400' : 'text-navy-500'}`}>
                    {prog.completed} of {prog.total} complete
                  </p>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-navy-800">
          <div className="flex justify-between text-[11px] font-medium text-navy-400 mb-2">
            <span>Overall Progress</span>
            <span className="text-white">{globalProgress.completed} / {globalProgress.total}</span>
          </div>
          <div className="w-full bg-navy-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${globalProgress.percent}%` }}
            />
          </div>
          <p className="text-[10px] text-navy-500 mt-2">{globalProgress.percent}% complete</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-navy-50/95 backdrop-blur-sm border-b border-navy-200/60">
          <div className="max-w-3xl mx-auto px-5 md:px-10 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px] text-navy-500">
              <span className="font-medium">Section {activeSection + 1}</span>
              <span className="text-navy-300">/</span>
              <span>{SECTIONS.length}</span>
              <span className="mx-2 text-navy-200">|</span>
              <span className="text-navy-400">{progress.completed} of {progress.total} answered</span>
            </div>
            <div className="flex items-center gap-3">
              {lastSaved && (
                <span className="text-[11px] text-navy-400 hidden sm:block">
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={() => saveProgress()}
                disabled={saving}
                className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-md bg-white border border-navy-200 text-navy-700 hover:bg-navy-100 disabled:opacity-40 transition-colors shadow-sm"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Progress
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-5 md:px-10 py-8 md:py-12">
          {/* Section header */}
          <div className="mb-8">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-11 h-11 rounded-xl bg-navy-800 flex items-center justify-center shrink-0">
                <SectionIcon className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-navy-900 leading-tight">
                  {currentSection.title}
                </h2>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="w-16 bg-navy-200 h-1 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${progress.percent === 100 ? 'bg-emerald-500' : 'bg-teal-500'}`}
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-navy-400 font-medium">{progress.completed}/{progress.total}</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-navy-500 leading-relaxed bg-white border border-navy-100 rounded-lg px-4 py-3">
              {currentSection.description}
            </p>
          </div>

          {/* Questions */}
          <div className="space-y-5">
            {currentSection.questions.map((q, qIdx) => (
              <div key={q.id} className="bg-white rounded-xl border border-navy-100 shadow-sm overflow-hidden">
                <div className="px-5 pt-5 pb-4">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-[11px] font-bold text-navy-300 bg-navy-50 rounded px-1.5 py-0.5 shrink-0 tabular-nums mt-0.5">
                      {activeSection + 1}.{qIdx + 1}
                    </span>
                    <label className="block text-[15px] font-medium text-navy-800 leading-snug">
                      {q.label}
                    </label>
                  </div>

                  {q.hint && (
                    <p className="text-[12px] text-navy-400 italic ml-9 mb-3 leading-relaxed">
                      {q.hint}
                    </p>
                  )}

                  <div className="ml-0 sm:ml-9">
                    {q.type === 'textarea' && (
                      <textarea
                        value={responses[q.id] || ''}
                        onChange={(e) => updateResponse(q.id, e.target.value)}
                        rows={4}
                        placeholder="Type your response here..."
                        className="w-full p-3 border border-navy-200 rounded-lg text-sm leading-relaxed focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none resize-none bg-navy-50/30 placeholder:text-navy-300"
                      />
                    )}

                    {q.type === 'text' && (
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-navy-300">
                          <ArrowUpRight className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          value={responses[q.id] || ''}
                          onChange={(e) => updateResponse(q.id, e.target.value)}
                          placeholder="Paste a link or type a brief reference..."
                          className="w-full pl-10 pr-4 py-2.5 border border-navy-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none bg-navy-50/30 placeholder:text-navy-300"
                        />
                      </div>
                    )}

                    {q.type === 'rating' && (
                      <RatingInput
                        value={responses[q.id]}
                        onChange={(val) => updateResponse(q.id, val)}
                      />
                    )}
                  </div>
                </div>

                {/* Completion indicator bar */}
                {responses[q.id] && (
                  <div className="h-0.5 bg-teal-500" />
                )}
              </div>
            ))}
          </div>

          {/* Navigation */}
          <div className="mt-10 flex items-center justify-between pb-12">
            <button
              onClick={() => {
                setActiveSection(Math.max(0, activeSection - 1));
                window.scrollTo(0, 0);
              }}
              disabled={activeSection === 0}
              className="flex items-center gap-2 text-sm font-medium text-navy-400 hover:text-navy-700 disabled:opacity-0 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            {activeSection < SECTIONS.length - 1 ? (
              <button
                onClick={() => {
                  saveProgress();
                  setActiveSection(activeSection + 1);
                  window.scrollTo(0, 0);
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-navy-800 text-white hover:bg-navy-900 transition-colors shadow-sm"
              >
                Continue to Next Section
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => {
                  saveProgress();
                  alert("Assessment progress saved successfully for final review.");
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-sm"
              >
                <CheckCircle className="w-4 h-4" />
                Submit for Review
              </button>
            )}
          </div>
        </div>
      </main>

      {user && (
        <div className="fixed bottom-3 right-3 bg-navy-900 text-white text-[10px] px-3 py-1.5 rounded-md flex items-center gap-2 opacity-30 hover:opacity-100 transition-opacity">
          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
          <span className="text-navy-400">Synced</span>
        </div>
      )}
    </div>
  );
}
