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
  FileText,
  BarChart,
  ShieldCheck,
  Clock,
  Zap,
  UserCheck,
  Target,
  AlertCircle,
  Link as LinkIcon,
  Loader2
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
    title: 'I: System Architecture & SOP Rigor',
    icon: <FileText className="w-5 h-5" />,
    questions: [
      { id: 'sop_integrity', label: 'SOP Integrity & Repeatability: Do your current SOPs enable a new hire to complete core tasks correctly using only your documentation?', type: 'textarea' },
      { id: 'critical_workflows', label: 'Identify 3–5 critical workflows where SOPs are currently "audit-ready."', type: 'textarea' },
      { id: 'incomplete_workflows', label: 'Identify 2–3 workflows where SOPs are incomplete or outdated.', type: 'textarea' },
      { id: 'vendor_integration', label: 'New Vendor Integration: For each vendor added in the last 6 months, have you created access/login docs and use cases?', type: 'textarea' },
      { id: 'recent_vendors', label: 'List the last 3 vendors integrated and link to SOPs/Configuration notes.', type: 'textarea' },
      { id: 'root_cause_process', label: 'Root-Cause System Design: What is your standard process for identifying root causes?', type: 'textarea' },
      { id: 'permanent_fixes', label: 'Last 90 days: List 3 issues where you implemented a permanent process change.', type: 'textarea' },
      { id: 'process_simplification', label: 'Process Simplification: How do you identify "process debt"? Steps removed/automated in last 90 days?', type: 'textarea' },
      { id: 'arch_rating', label: 'Operational Architecture Self-Rating (1-5)', type: 'rating' },
      { id: 'arch_evidence', label: 'Evidence Required: Identify one process that was disorganized and is now systematized.', type: 'textarea' },
      { id: 'arch_documentation', label: 'Documentation: [Link to Notion SOP or Wealthbox workflow]', type: 'text' },
      { id: 'arch_gap', label: 'Gap Analysis: What part remains manual and why?', type: 'textarea' },
    ]
  },
  {
    id: 'section-2',
    title: 'II: Time Governance & Prioritization',
    icon: <Clock className="w-5 h-5" />,
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
    title: 'III: Compliance & Execution',
    icon: <ShieldCheck className="w-5 h-5" />,
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
    title: 'IV: Risk & Financial Stewardship',
    icon: <BarChart className="w-5 h-5" />,
    questions: [
      { id: 'billing_logic', label: 'Revenue Integrity: Describe the end-to-end fee calculation logic.', type: 'textarea' },
      { id: 'billing_controls', label: 'What specific human-error checks/reconciliations are built into the cycle?', type: 'textarea' },
      { id: 'billing_error_example', label: 'Example of an error caught by these controls.', type: 'textarea' },
      { id: 'series_65_schedule', label: 'Series 65 Progress: Provide study schedule, target exam date, and milestones.', type: 'textarea' },
    ]
  },
  {
    id: 'section-5',
    title: 'V: Time Leaks & Automation',
    icon: <Zap className="w-5 h-5" />,
    questions: [
      { id: 'time_leak_reflection', label: 'Time Leak: What single recurring task consumed the most time? Quantify hours.', type: 'textarea' },
      { id: 'permanent_fix_plan', label: 'The Permanent Fix: What system will reduce this leak? What resources are needed?', type: 'textarea' },
      { id: 'automation_target', label: 'The Automation Target: What manual process would you remove this month?', type: 'textarea' },
      { id: 'implementation_plan', label: 'High-level implementation plan (Tool, dependencies, first 3 steps).', type: 'textarea' },
    ]
  },
  {
    id: 'section-6',
    title: 'VI: Leadership & Autonomy',
    icon: <UserCheck className="w-5 h-5" />,
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
    title: 'VII: Problem Solving Rating',
    icon: <AlertCircle className="w-5 h-5" />,
    questions: [
      { id: 'ps_rating', label: 'Self-Rating: Problem Solving (1-5)', type: 'rating' },
      { id: 'ps_complexity_evidence', label: 'Identify 2–3 complex operational problems addressed. (Problem, Analysis, Outcome).', type: 'textarea' },
      { id: 'ps_gaps', label: 'Biggest opportunity to improve problem solving in the next 90 days?', type: 'textarea' },
    ]
  },
  {
    id: 'section-8',
    title: 'VIII: Strategic Clarity Rating',
    icon: <Target className="w-5 h-5" />,
    questions: [
      { id: 'sc_rating', label: 'Self-Rating: Strategic Clarity (1-5)', type: 'rating' },
      { id: 'sc_evidence', label: '2–3 examples of translating firm-level objectives into operational initiatives.', type: 'textarea' },
      { id: 'sc_gaps', label: 'Where are strategic priorities least clear? What context is needed from Partners?', type: 'textarea' },
    ]
  }
];

const RatingInput = ({ value, onChange }) => {
  return (
    <div className="flex gap-4 mt-2">
      {[1, 2, 3, 4, 5].map((num) => (
        <button
          key={num}
          onClick={() => onChange(num)}
          className={`w-12 h-12 rounded-lg font-bold text-lg transition-all border-2
            ${value === num
              ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-110'
              : 'bg-white border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-50'}`}
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

  // 1. Authentication Lifecycle
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
        setIsLoaded(true); // Don't hang if auth fails
      }
    };

    initAuth();

    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. Data Fetching Lifecycle
  useEffect(() => {
    if (!user) return;

    // RULE 1 Path structure: /artifacts/{appId}/users/{userId}/{collectionName}
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
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-slate-600">
        <Loader2 className="w-12 h-12 animate-spin mb-4 text-blue-600" />
        <p className="text-lg font-medium">Loading Assessment Environment...</p>
      </div>
    );
  }

  const currentSection = SECTIONS[activeSection];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      <aside className="w-full md:w-80 bg-white border-r border-slate-200 flex flex-col h-auto md:h-screen sticky top-0">
        <div className="p-6 border-b border-slate-100 bg-slate-900 text-white">
          <h1 className="font-bold text-xl tracking-tight uppercase">Able Wealth</h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Director of Operations</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {SECTIONS.map((section, idx) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(idx)}
              className={`w-full flex items-start p-3 rounded-xl transition-all text-left group
                ${activeSection === idx
                  ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200 shadow-sm'
                  : 'hover:bg-slate-50 text-slate-600'}`}
            >
              <div className={`mt-0.5 p-2 rounded-lg mr-3 ${activeSection === idx ? 'bg-blue-600 text-white' : 'bg-slate-100 group-hover:bg-slate-200'}`}>
                {section.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${activeSection === idx ? 'text-blue-900' : 'text-slate-800'}`}>
                  {section.title}
                </p>
                <div className="mt-2 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${sectionProgress[idx].percent === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${sectionProgress[idx].percent}%` }}
                  />
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <div className="flex justify-between text-xs font-bold text-slate-500 uppercase mb-2">
            <span>Overall Completion</span>
            <span>{globalProgress}%</span>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-700"
              style={{ width: `${globalProgress}%` }}
            />
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-10 flex justify-center">
        <div className="max-w-4xl w-full space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {currentSection.title}
              </h2>
              <p className="text-slate-500 mt-2">
                Operations Readiness Assessment (6-Month Self-Assessment)
              </p>
            </div>
            <div className="flex items-center gap-3">
              {lastSaved && (
                <span className="text-xs text-slate-400 font-medium">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={() => saveProgress()}
                disabled={saving}
                className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Progress
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-10">
            {currentSection.questions.map((q) => (
              <div key={q.id} className="space-y-4">
                <label className="block text-base font-bold text-slate-800 leading-snug">
                  {q.label}
                </label>

                {q.type === 'textarea' && (
                  <textarea
                    value={responses[q.id] || ''}
                    onChange={(e) => updateResponse(q.id, e.target.value)}
                    rows={4}
                    placeholder="Enter your detailed response here..."
                    className="w-full p-4 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all outline-none resize-none bg-slate-50/30"
                  />
                )}

                {q.type === 'text' && (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <LinkIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={responses[q.id] || ''}
                      onChange={(e) => updateResponse(q.id, e.target.value)}
                      placeholder="Link or brief reference..."
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all outline-none bg-slate-50/30"
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
            ))}
          </div>

          <div className="flex items-center justify-between pb-12">
            <button
              onClick={() => setActiveSection(Math.max(0, activeSection - 1))}
              disabled={activeSection === 0}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-0 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
              Previous Section
            </button>

            {activeSection < SECTIONS.length - 1 ? (
              <button
                onClick={() => {
                  saveProgress();
                  setActiveSection(activeSection + 1);
                  window.scrollTo(0, 0);
                }}
                className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200 transition-all transform hover:-translate-y-0.5"
              >
                Next Section
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => {
                  saveProgress();
                  alert("Assessment progress saved successfully for final review.");
                }}
                className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-md shadow-green-200 transition-all transform hover:-translate-y-0.5"
              >
                <CheckCircle className="w-5 h-5" />
                Final Save & Review
              </button>
            )}
          </div>
        </div>
      </main>

      {user && (
        <div className="fixed bottom-4 right-4 bg-slate-900 text-white text-[10px] md:text-xs px-3 py-1.5 rounded-full shadow-2xl flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          User: {user.uid} (Cloud Sync Active)
        </div>
      )}
    </div>
  );
}
