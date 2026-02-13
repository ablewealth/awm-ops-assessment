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
  ArrowUpRight
} from 'lucide-react';

/**
 * --- FIREBASE CONFIGURATION ---
 * This block handles both the internal preview environment and your external local project.
 */
const firebaseConfig = typeof __firebase_config !== 'undefined'
  ? JSON.parse(__firebase_config)
  : {
      apiKey: "YOUR_API_KEY", // Replace with your key for local/GitHub use
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

// --- Assessment Schema ---
const SECTIONS = [
  {
    id: 'section-1',
    title: 'System Architecture & SOP Rigor',
    number: 'I',
    questions: [
      { id: 'sop_integrity', label: 'SOP Integrity & Repeatability: Do your current SOPs enable a new hire to complete core tasks correctly using only your documentation?', type: 'textarea' },
      { id: 'critical_workflows', label: 'Identify 3–5 critical workflows where SOPs are currently "audit-ready."', type: 'textarea' },
      { id: 'incomplete_workflows', label: 'Identify 2–3 workflows where SOPs are incomplete or outdated.', type: 'textarea' },
      { id: 'vendor_integration', label: 'New Vendor Integration: For each vendor added in the last 6 months, have you created access/login docs and use cases?', type: 'textarea' },
      { id: 'recent_vendors', label: 'List the last 3 vendors integrated and link to SOPs/Configuration notes.', type: 'textarea' },
      { id: 'root_cause_process', label: 'Root-Cause System Design: What is your standard process for identifying root causes?', type: 'textarea' },
      { id: 'permanent_fixes', label: 'Last 90 days: List 3 issues where you implemented a permanent process change.', type: 'textarea' },
      { id: 'process_simplification', label: 'Process Simplification: How do you identify "process debt"? Steps removed/automated in last 90 days?', type: 'textarea' },
      { id: 'arch_rating', label: 'Operational Architecture Self-Rating (1–5)', type: 'rating' },
      { id: 'arch_evidence', label: 'Evidence Required: Identify one process that was disorganized and is now systematized.', type: 'textarea' },
      { id: 'arch_documentation', label: 'Documentation: [Link to Notion SOP or Wealthbox workflow]', type: 'text' },
      { id: 'arch_gap', label: 'Gap Analysis: What part remains manual and why?', type: 'textarea' },
    ]
  },
  {
    id: 'section-2',
    title: 'Time Governance & Prioritization',
    number: 'II',
    questions: [
      { id: 'prioritization_framework', label: 'Prioritization Framework: What explicit system do you use for daily/weekly focus?', type: 'textarea' },
      { id: 'urgent_vs_important', label: 'How do you distinguish between "urgent" fires and "important" strategic projects?', type: 'textarea' },
      { id: 'prioritization_layout', label: 'Describe or link your current prioritization dashboard/layout.', type: 'text' },
      { id: 'ops_heartbeat', label: 'Operational Rhythm: Do you have a structured cadence for reviews?', type: 'textarea' },
      { id: 'recurring_checklists', label: 'List your recurring checklists (Monday Review, Billing Prep, etc.).', type: 'textarea' },
      { id: 'pm_discipline', label: 'Project Management Discipline: Where is the master list maintained?', type: 'text' },
      { id: 'project_scrub', label: 'Describe your weekly "project scrub" ritual.', type: 'textarea' },
      { id: 'scrub_proof', label: 'Provide proof of last 3 project scrub updates/notes.', type: 'textarea' },
    ]
  },
  {
    id: 'section-3',
    title: 'Compliance & Execution',
    number: 'III',
    questions: [
      { id: 'meeting_governance', label: 'Meeting Governance: Do you consistently capture decisions and next steps?', type: 'textarea' },
      { id: 'meeting_summary_log', label: 'Link to a recent meeting summary log.', type: 'text' },
      { id: 'status_visibility', label: 'Single Source of Truth: Can you produce a report of every open action item?', type: 'textarea' },
      { id: 'training_materials', label: 'Training Materials: What 3 assets have you created to reduce failure/risk?', type: 'textarea' },
      { id: 'staff_accountability', label: 'Staff Accountability: How do you track completion of compliance tasks?', type: 'textarea' },
      { id: 'feedback_loops', label: 'Feedback Loops: How is feedback captured and incorporated into SOPs?', type: 'textarea' },
      { id: 'policy_audit', label: 'Policy-to-Practice Audits: Describe one example of drift and your reconciliation plan.', type: 'textarea' },
    ]
  },
  {
    id: 'section-4',
    title: 'Risk & Financial Stewardship',
    number: 'IV',
    questions: [
      { id: 'billing_logic', label: 'Revenue Integrity: Describe the end-to-end fee calculation logic.', type: 'textarea' },
      { id: 'billing_controls', label: 'What specific human-error checks/reconciliations are built into the cycle?', type: 'textarea' },
      { id: 'billing_error_example', label: 'Example of an error caught by these controls.', type: 'textarea' },
      { id: 'series_65_schedule', label: 'Series 65 Progress: Provide study schedule, target exam date, and milestones.', type: 'textarea' },
    ]
  },
  {
    id: 'section-5',
    title: 'Time Leaks & Automation',
    number: 'V',
    questions: [
      { id: 'time_leak_reflection', label: 'Time Leak: What single recurring task consumed the most time? Quantify hours.', type: 'textarea' },
      { id: 'permanent_fix_plan', label: 'The Permanent Fix: What system will reduce this leak? What resources are needed?', type: 'textarea' },
      { id: 'automation_target', label: 'The Automation Target: What manual process would you remove this month?', type: 'textarea' },
      { id: 'implementation_plan', label: 'High-level implementation plan (Tool, dependencies, first 3 steps).', type: 'textarea' },
    ]
  },
  {
    id: 'section-6',
    title: 'Leadership & Autonomy',
    number: 'VI',
    questions: [
      { id: 'proactive_problem', label: 'Proactive Problem Resolution: Describe a situation you resolved before Partners knew.', type: 'textarea' },
      { id: 'vendor_roi', label: 'Vendor Strategic ROI: Which vendor provides the weakest ROI and why?', type: 'textarea' },
      { id: 'independent_decisions', label: 'List 2–3 operational decisions made autonomously.', type: 'textarea' },
      { id: 'partner_decisions', label: 'List 2–3 decisions requiring partner approval. What needs to change for future autonomy?', type: 'textarea' },
      { id: 'autonomy_assessment', label: 'In what areas do you have full authority? Where are you still seeking routine approval?', type: 'textarea' },
      { id: 'systems_thinking', label: 'Describe one recurring pattern identified and the systemic solution implemented.', type: 'textarea' },
      { id: 'cross_functional', label: 'Identify an operational issue stemming from another department.', type: 'textarea' },
    ]
  },
  {
    id: 'section-7',
    title: 'Problem Solving Rating',
    number: 'VII',
    questions: [
      { id: 'ps_rating', label: 'Self-Rating: Problem Solving (1–5)', type: 'rating' },
      { id: 'ps_complexity_evidence', label: 'Identify 2–3 complex operational problems addressed. (Problem, Analysis, Outcome).', type: 'textarea' },
      { id: 'ps_gaps', label: 'Biggest opportunity to improve problem solving in the next 90 days?', type: 'textarea' },
    ]
  },
  {
    id: 'section-8',
    title: 'Strategic Clarity Rating',
    number: 'VIII',
    questions: [
      { id: 'sc_rating', label: 'Self-Rating: Strategic Clarity (1–5)', type: 'rating' },
      { id: 'sc_evidence', label: '2–3 examples of translating firm-level objectives into operational initiatives.', type: 'textarea' },
      { id: 'sc_gaps', label: 'Where are strategic priorities least clear? What context is needed from Partners?', type: 'textarea' },
    ]
  }
];

const RatingInput = ({ value, onChange }) => {
  return (
    <div className="flex gap-2 mt-3">
      {[1, 2, 3, 4, 5].map((num) => (
        <button
          key={num}
          onClick={() => onChange(num)}
          className={`w-12 h-12 font-semibold text-sm tracking-wide transition-all border
            ${value === num
              ? 'bg-black border-black text-white'
              : 'bg-white border-neutral-300 text-neutral-400 hover:border-black hover:text-black'}`}
        >
          {num}
        </button>
      ))}
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
    return Math.round((completed / total) * 100);
  }, [responses]);

  if (!isLoaded) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white text-neutral-900">
        <Loader2 className="w-8 h-8 animate-spin mb-6 text-black" />
        <p className="text-sm font-medium tracking-wide uppercase">Loading Assessment</p>
      </div>
    );
  }

  const currentSection = SECTIONS[activeSection];

  return (
    <div className="min-h-screen bg-white font-sans text-neutral-900 flex flex-col md:flex-row">
      {/* ── Sidebar ── */}
      <aside className="w-full md:w-72 lg:w-80 bg-neutral-950 text-white flex flex-col h-auto md:h-screen md:sticky md:top-0 shrink-0">
        {/* Header */}
        <div className="px-6 pt-8 pb-6">
          <p className="text-[10px] font-medium tracking-[0.3em] uppercase text-neutral-500 mb-1">Assessment</p>
          <h1 className="text-lg font-bold tracking-tight uppercase">Able Wealth</h1>
          <div className="w-8 h-0.5 bg-red-500 mt-3" />
          <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-500 mt-3">Director of Operations</p>
        </div>

        {/* Section Nav */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {SECTIONS.map((section, idx) => {
            const isActive = activeSection === idx;
            const isDone = sectionProgress[idx].percent === 100;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(idx)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all group border-l-2
                  ${isActive
                    ? 'border-red-500 bg-white/5'
                    : isDone
                      ? 'border-transparent hover:bg-white/5'
                      : 'border-transparent hover:bg-white/5'
                  }`}
              >
                <span className={`text-xs font-semibold tabular-nums w-8 shrink-0
                  ${isActive ? 'text-red-400' : 'text-neutral-600'}`}>
                  {section.number}
                </span>
                <span className={`text-xs tracking-wide truncate
                  ${isActive ? 'text-white font-medium' : 'text-neutral-400 group-hover:text-neutral-300'}`}>
                  {section.title}
                </span>
                {isDone && (
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0 ml-auto" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Progress Footer */}
        <div className="px-6 py-5 border-t border-neutral-800">
          <div className="flex justify-between text-[10px] font-medium tracking-[0.2em] uppercase text-neutral-500 mb-3">
            <span>Completion</span>
            <span className="text-white tabular-nums">{globalProgress}%</span>
          </div>
          <div className="w-full bg-neutral-800 h-px">
            <div
              className="h-px bg-red-500 transition-all duration-700"
              style={{ width: `${globalProgress}%` }}
            />
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-neutral-200">
          <div className="max-w-3xl mx-auto px-6 md:px-12 py-3 flex items-center justify-between">
            <span className="text-[10px] font-medium tracking-[0.2em] uppercase text-neutral-400">
              Section {activeSection + 1} of {SECTIONS.length}
            </span>
            <div className="flex items-center gap-4">
              {lastSaved && (
                <span className="text-[10px] tracking-wide text-neutral-400 hidden sm:block">
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={() => saveProgress()}
                disabled={saving}
                className="flex items-center gap-1.5 text-[10px] font-medium tracking-[0.15em] uppercase px-3 py-1.5 border border-neutral-200 hover:border-neutral-400 disabled:opacity-40 transition-colors"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Save
              </button>
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="max-w-3xl mx-auto px-6 md:px-12 py-12 md:py-16">
          {/* Section header */}
          <div className="mb-12 md:mb-16">
            <span className="block text-[80px] md:text-[120px] font-black leading-none tracking-tighter text-neutral-100 select-none">
              {currentSection.number}
            </span>
            <div className="-mt-6 md:-mt-10">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900">
                {currentSection.title}
              </h2>
              <div className="w-12 h-0.5 bg-red-500 mt-4" />
              <p className="text-xs tracking-wide text-neutral-400 mt-4 uppercase">
                Operations Readiness — 6-Month Self-Assessment
              </p>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-0">
            {currentSection.questions.map((q, qIdx) => (
              <div key={q.id} className="grid grid-cols-[auto_1fr] gap-x-6 md:gap-x-10 py-8 border-t border-neutral-200 first:border-t-0 first:pt-0">
                {/* Question number column */}
                <div className="pt-0.5">
                  <span className="text-[10px] font-semibold tracking-[0.15em] text-neutral-300 tabular-nums">
                    {String(qIdx + 1).padStart(2, '0')}
                  </span>
                </div>

                {/* Question content column */}
                <div>
                  <label className="block text-sm font-medium text-neutral-800 leading-relaxed mb-4">
                    {q.label}
                  </label>

                  {q.type === 'textarea' && (
                    <textarea
                      value={responses[q.id] || ''}
                      onChange={(e) => updateResponse(q.id, e.target.value)}
                      rows={4}
                      placeholder="Enter your response..."
                      className="w-full p-4 border border-neutral-200 text-sm leading-relaxed focus:ring-0 focus:border-neutral-900 transition-colors outline-none resize-none bg-neutral-50/50 placeholder:text-neutral-300"
                    />
                  )}

                  {q.type === 'text' && (
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-300">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="text"
                        value={responses[q.id] || ''}
                        onChange={(e) => updateResponse(q.id, e.target.value)}
                        placeholder="Link or reference..."
                        className="w-full pl-9 pr-4 py-3 border border-neutral-200 text-sm focus:ring-0 focus:border-neutral-900 transition-colors outline-none bg-neutral-50/50 placeholder:text-neutral-300"
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
            ))}
          </div>

          {/* Navigation */}
          <div className="mt-12 pt-8 border-t border-neutral-200 flex items-center justify-between pb-16">
            <button
              onClick={() => {
                setActiveSection(Math.max(0, activeSection - 1));
                window.scrollTo(0, 0);
              }}
              disabled={activeSection === 0}
              className="flex items-center gap-2 text-xs font-medium tracking-wide uppercase text-neutral-400 hover:text-neutral-900 disabled:opacity-0 transition-colors"
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
                className="flex items-center gap-2 px-6 py-3 text-xs font-semibold tracking-wide uppercase bg-neutral-900 text-white hover:bg-black transition-colors"
              >
                Next Section
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => {
                  saveProgress();
                  alert("Assessment progress saved successfully for final review.");
                }}
                className="flex items-center gap-2 px-6 py-3 text-xs font-semibold tracking-wide uppercase bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Final Save & Review
              </button>
            )}
          </div>
        </div>
      </main>

      {/* User badge */}
      {user && (
        <div className="fixed bottom-4 right-4 bg-neutral-900 text-white text-[10px] px-3 py-1.5 flex items-center gap-2 opacity-30 hover:opacity-100 transition-opacity tracking-wide">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
          {user.uid}
        </div>
      )}
    </div>
  );
}
