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
  Target
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
    description: 'Designing an operational factory that is accurate, scalable, and low-friction',
    subsections: [
      {
        id: 'sop-integrity',
        title: 'SOP Integrity & Repeatability',
        questions: [
          { id: 'sop_integrity', label: 'Do your current SOPs enable a new hire to complete core tasks correctly using only your documentation (no verbal support)?', type: 'textarea' },
          { id: 'critical_workflows', label: 'Identify 3–5 critical workflows (e.g., client onboarding, money movement, billing exceptions) where SOPs are currently "audit-ready."', type: 'textarea' },
          { id: 'incomplete_workflows', label: 'Identify 2–3 workflows where SOPs are incomplete, outdated, or overly dependent on your tribal knowledge.', type: 'textarea' },
        ]
      },
      {
        id: 'vendor-integration',
        title: 'New Vendor Integration',
        questions: [
          { id: 'vendor_integration', label: 'For each vendor added in the last 6 months, have you created: access/login documentation, troubleshooting steps, and defined firm-use cases?', type: 'textarea' },
          { id: 'recent_vendors', label: 'List the last 3 vendors or major tools integrated and link to their internal SOPs or configuration notes.', type: 'textarea' },
        ]
      },
      {
        id: 'root-cause',
        title: 'Root-Cause System Design',
        questions: [
          { id: 'root_cause_process', label: 'When an error occurs (e.g., NIGO, billing exception), what is your standard process for identifying root cause and implementing a system-level fix?', type: 'textarea' },
          { id: 'permanent_fixes', label: 'In the last 90 days, list at least 3 issues where you implemented a permanent process change (not just a one-time fix) and describe the change.', type: 'textarea' },
        ]
      },
      {
        id: 'process-simplification',
        title: 'Process Simplification & Technical Debt',
        questions: [
          { id: 'process_debt_id', label: 'How do you identify "process debt" (legacy steps, duplicate checks, unnecessary handoffs)?', type: 'textarea' },
          { id: 'process_simplification_count', label: 'In the last 90 days, how many steps have you removed, consolidated, or automated in core workflows?', type: 'textarea' },
          { id: 'simplified_workflows', label: 'Provide a short list of simplified workflows (before vs. after description or links to updated SOPs).', type: 'textarea' },
        ]
      },
      {
        id: 'operational-architecture',
        title: 'Operational Architecture',
        questions: [
          { id: 'arch_improvement', label: 'Have you made the firm faster, more efficient, or less error-prone in any specific operational domain?', type: 'textarea' },
          { id: 'arch_rating', label: 'Self-Rating (1–5):', type: 'rating' },
          { id: 'arch_evidence', label: 'Evidence Required: Identify one process that was disorganized at your start date and is now systematized.', type: 'textarea' },
          { id: 'arch_documentation', label: 'Documentation: [Link to the specific Notion SOP or Wealthbox workflow you created]', type: 'text' },
          { id: 'arch_gap', label: "Gap Analysis: What part of this process remains manual and problematic, and why hasn't it been automated yet?", type: 'textarea' },
        ]
      },
    ]
  },
  {
    id: 'section-2',
    title: 'Time Governance & Prioritization',
    icon: 'Clock',
    description: "Managing your time and the firm's capacity through systems, not memory.",
    subsections: [
      {
        id: 'prioritization-framework',
        title: 'Prioritization Framework',
        questions: [
          { id: 'prioritization_framework', label: 'What explicit system do you use to select your daily and weekly focus (e.g., Notion view, task board, SLA-based rules)?', type: 'textarea' },
          { id: 'urgent_vs_important', label: 'How do you distinguish between "urgent" operational fires and "important" strategic projects when they conflict?', type: 'textarea' },
          { id: 'prioritization_layout', label: 'Attach or describe your current prioritization dashboard/layout.', type: 'textarea' },
        ]
      },
      {
        id: 'operational-rhythm',
        title: 'Operational Rhythm ("Heartbeat")',
        questions: [
          { id: 'ops_heartbeat', label: 'Do you have a structured cadence for weekly, monthly, quarterly, and annual operational tasks and reviews?', type: 'textarea' },
          { id: 'recurring_checklists', label: 'List your recurring checklists or views (e.g., "Monday Ops Review," "Quarterly Billing Prep," "Annual Vendor Review") and where they live.', type: 'textarea' },
          { id: 'deadline_convergence', label: 'How do you ensure nothing falls through the cracks when multiple deadlines converge?', type: 'textarea' },
        ]
      },
      {
        id: 'project-management',
        title: 'Project Management Discipline',
        questions: [
          { id: 'pm_discipline', label: 'Where is the master Operations Projects & Tasks list maintained (tool, board, or database)?', type: 'textarea' },
          { id: 'project_scrub', label: 'Do you conduct a weekly "project scrub" to update statuses, close items, and re-prioritize? If yes, describe the ritual (day/time, steps, participants).', type: 'textarea' },
          { id: 'scrub_proof', label: 'Provide proof of the last 3 "project scrub" updates or notes.', type: 'textarea' },
        ]
      },
    ]
  },
  {
    id: 'section-3',
    title: 'Compliance Oversight, Staff Development, & Execution',
    icon: 'ShieldCheck',
    description: 'Ensuring people, processes, and policies are aligned and consistently executed.',
    subsections: [
      {
        id: 'meeting-governance',
        title: 'Meeting Governance & Action Execution',
        questions: [
          { id: 'meeting_governance', label: 'After internal and vendor meetings, do you consistently capture key decisions, owners, due dates, and next steps?', type: 'textarea' },
          { id: 'action_tracking', label: 'Where are these action items tracked, and how do you monitor completion?', type: 'textarea' },
          { id: 'meeting_summary_log', label: 'Attach or link to a recent meeting summary log.', type: 'text' },
        ]
      },
      {
        id: 'status-visibility',
        title: 'Status Visibility ("Single Source of Truth")',
        questions: [
          { id: 'status_visibility', label: 'If asked right now, can you produce a view or report showing every open operational action item, its owner, current status, and next step?', type: 'textarea' },
          { id: 'status_system', label: 'Describe the system or view you rely on for this, and note any current gaps.', type: 'textarea' },
        ]
      },
      {
        id: 'training-materials',
        title: 'Training Materials & Knowledge Transfer',
        questions: [
          { id: 'training_assets', label: 'What training assets have you created in the last 6 months (Loom videos, process walkthroughs, written guides, checklists) to support staff on operational and compliance standards?', type: 'textarea' },
          { id: 'training_materials', label: 'List the 3 most important training artifacts and what risk or failure they are designed to reduce.', type: 'textarea' },
        ]
      },
      {
        id: 'staff-accountability',
        title: 'Staff Accountability & Monitoring',
        questions: [
          { id: 'staff_accountability', label: 'How do you track completion of staff-level compliance and operational tasks (e.g., attestations, reviews, checklists)?', type: 'textarea' },
          { id: 'missed_deadlines', label: 'Describe your process for following up on missed deadlines or incomplete tasks.', type: 'textarea' },
        ]
      },
      {
        id: 'feedback-loops',
        title: 'Feedback Loops & Communication',
        questions: [
          { id: 'process_communication', label: 'When a new process, service, or policy change is introduced, how do you communicate it to staff?', type: 'textarea' },
          { id: 'feedback_capture', label: 'How is feedback captured, and how do you incorporate suggestions or field-level realities into updated SOPs?', type: 'textarea' },
        ]
      },
      {
        id: 'policy-practice',
        title: 'Policy-to-Practice Audits',
        questions: [
          { id: 'policy_drift', label: 'In the last 6 months, have you identified any area where day-to-day practice has drifted from written policy?', type: 'textarea' },
          { id: 'policy_reconciliation', label: 'Describe one example and outline your proposed reconciliation plan (policy change vs. behavior change, timeline, and owner).', type: 'textarea' },
        ]
      },
    ]
  },
  {
    id: 'section-4',
    title: 'Risk & Financial Stewardship',
    icon: 'BarChart3',
    description: "Protecting the firm's economics and fiduciary posture.",
    subsections: [
      {
        id: 'revenue-integrity',
        title: 'Revenue Integrity & Billing Controls',
        questions: [
          { id: 'billing_logic', label: 'Describe the end-to-end fee calculation logic for the firm (from data source to invoice).', type: 'textarea' },
          { id: 'billing_controls', label: 'What specific human-error checks and reconciliations have you built into the billing cycle to reduce risk (e.g., sampling, threshold alerts, variance checks)?', type: 'textarea' },
          { id: 'billing_error_example', label: 'Provide an example of an error that was prevented or caught by these controls.', type: 'textarea' },
        ]
      },
      {
        id: 'series-65',
        title: 'Series 65 Progress (Per Article 1.6)',
        questions: [
          { id: 'series_65_schedule', label: 'Provide your specific study and testing schedule, including: weekly time blocks dedicated to study, target exam date, milestones or practice exam dates between now and completion within the 12–month window.', type: 'textarea' },
        ]
      },
    ]
  },
  {
    id: 'section-5',
    title: 'Time Leaks, Automation, and Future Focus',
    icon: 'Zap',
    description: 'Reclaiming your time for high-leverage work.',
    subsections: [
      {
        id: 'time-leak',
        title: 'The "Time Leak" Reflection',
        questions: [
          { id: 'time_leak_task', label: 'What single recurring task consumed the most time over the last 6 months?', type: 'textarea' },
          { id: 'time_leak_impact', label: 'Quantify its impact (approximate hours per week/month) and explain why it remains on your plate today.', type: 'textarea' },
        ]
      },
      {
        id: 'permanent-fix',
        title: 'The Permanent Fix',
        questions: [
          { id: 'permanent_fix_plan', label: 'What system, automation, or SOP have you already put in place—or will put in place—to reduce or eliminate the time spent on this task over the next 6 months?', type: 'textarea' },
          { id: 'fix_resources', label: 'What support or resources (budget, tools, staff) do you need to fully implement this fix?', type: 'textarea' },
        ]
      },
      {
        id: 'automation-target',
        title: 'The Automation Target',
        questions: [
          { id: 'automation_target', label: 'If you could remove one manual process from your work by the end of this month using new systems, software, or redesign, what would it be?', type: 'textarea' },
          { id: 'implementation_plan', label: 'Outline a high-level implementation plan (tool candidate, dependencies, and first three steps) to make that change real.', type: 'textarea' },
        ]
      },
    ]
  },
  {
    id: 'section-6',
    title: 'Director-Level Leadership & Autonomy',
    icon: 'Users',
    description: 'Demonstrating ownership, initiative, and director-level decision-making. Framing: Associates ask "What should I do?" Directors say "Here is what I\'ve done."',
    subsections: [
      {
        id: 'proactive-resolution',
        title: 'Proactive Problem Resolution',
        questions: [
          { id: 'proactive_problem', label: 'Describe a situation where you identified and resolved a problem before the Partners became aware of it.', type: 'textarea' },
          { id: 'proactive_actions', label: 'What was the issue, what actions did you take, and what was the outcome? If you cannot identify an example, leave this section blank.', type: 'textarea' },
        ]
      },
      {
        id: 'vendor-management',
        title: 'Vendor Management & Strategic ROI',
        questions: [
          { id: 'vendor_inventory_exists', label: 'Your contract requires maintenance of a centralized, current vendor inventory. Does this documentation exist and is it accurate?', type: 'textarea' },
          { id: 'vendor_inventory_link', label: 'Documentation: [Link to master vendor list]', type: 'text' },
          { id: 'vendor_roi', label: 'Strategic Analysis: Reviewing the current vendor roster, which vendor provides the weakest ROI (time, cost, or risk reduction)? Why has this relationship continued, and what is your recommended path forward (optimize, replace, or sunset)?', type: 'textarea' },
        ]
      },
      {
        id: 'decision-making',
        title: 'Decision-Making & Autonomy',
        questions: [
          { id: 'independent_decisions', label: 'Independent Decisions: List 2–3 important operational decisions you made autonomously in the past 6 months. For each: What was the decision, what was the impact, and why did it not require escalation?', type: 'textarea' },
          { id: 'partner_decisions', label: 'Partner-Approval Decisions: List 2–3 decisions that required partner approval. For each: What was the decision, why did it require escalation, and what would need to change (policies, thresholds, trust, data) for you to make that type of decision independently in the future?', type: 'textarea' },
          { id: 'autonomy_areas', label: 'Autonomy Assessment: In what operational areas do you currently have full decision-making authority?', type: 'textarea' },
          { id: 'autonomy_gaps', label: 'In what areas are you still seeking approval for routine decisions that should reasonably be autonomous at the Director level?', type: 'textarea' },
        ]
      },
      {
        id: 'systems-thinking',
        title: 'Systems Thinking & Pattern Recognition',
        questions: [
          { id: 'recurring_problem', label: 'Recurring Problem Identified: Describe one recurring problem or pattern you identified over the past 6 months that was not obvious on the surface. What was the pattern, how did you discover it, and what was the underlying root cause?', type: 'textarea' },
          { id: 'systemic_solution', label: 'Systemic Solution: What systemic change did you implement or propose (process redesign, system change, training, policy update) to prevent this problem from recurring?', type: 'textarea' },
          { id: 'solution_result', label: 'If implemented: What has been the result so far? If proposed but not implemented: What is blocking implementation (capacity, budget, prioritization, technical limitation)?', type: 'textarea' },
          { id: 'cross_functional', label: 'Cross-Functional Patterns: Have you identified any operational issues that actually stem from problems in other departments or systems (e.g., billing errors from advisor data entry, trade errors from model construction, compliance gaps from unclear advisor workflows)? Provide at least one example and the cross-functional solution you proposed or implemented.', type: 'textarea' },
        ]
      },
    ]
  },
  {
    id: 'section-7',
    title: 'Problem Solving Rating',
    icon: 'Lightbulb',
    description: 'Evaluating your ability to diagnose issues, weigh options, and implement durable solutions.',
    subsections: [
      {
        id: 'problem-solving-rating',
        title: 'Self-Rating: Problem Solving (1–5)',
        questions: [
          { id: 'ps_rating', label: 'On a scale of 1–5 (1 = needs significant improvement, 5 = outstanding), how would you rate your problem-solving over the last 6 months? Score:', type: 'rating' },
        ]
      },
      {
        id: 'problem-solving-evidence',
        title: 'Evidence of Problem-Solving Quality',
        questions: [
          { id: 'ps_complexity_evidence', label: 'Identify 2–3 complex operational problems you addressed in the last 6 months. For each, describe: the problem and its impact, how you analyzed root cause and evaluated alternative solutions, the solution you implemented and the measured outcome (error rate, time saved, fewer escalations).', type: 'textarea' },
        ]
      },
      {
        id: 'problem-solving-gaps',
        title: 'Problem-Solving Gaps',
        questions: [
          { id: 'ps_opportunity', label: 'Where do you see the biggest opportunity to improve your problem-solving (speed, data use, stakeholder alignment, creativity of solutions)?', type: 'textarea' },
          { id: 'ps_changes', label: 'What specific changes will you make over the next 90 days to improve in this area?', type: 'textarea' },
        ]
      },
    ]
  },
  {
    id: 'section-8',
    title: 'Strategic Clarity Rating',
    icon: 'Target',
    description: "Connecting daily operations to the firm's long-term strategy and priorities.",
    subsections: [
      {
        id: 'strategic-rating',
        title: 'Self-Rating: Strategic Clarity (1–5)',
        questions: [
          { id: 'sc_rating', label: "On a scale of 1–5, how clearly do you understand and operate in alignment with the firm's strategic goals? Score:", type: 'rating' },
        ]
      },
      {
        id: 'strategic-evidence',
        title: 'Evidence of Strategic Clarity',
        questions: [
          { id: 'sc_evidence', label: "Provide 2–3 examples where you translated a firm-level objective into a concrete operational initiative, or declined work because it did not align with strategic priorities. For each, describe how the project advanced strategy.", type: 'textarea' },
        ]
      },
      {
        id: 'strategic-gaps',
        title: 'Strategic Gaps & Focus',
        questions: [
          { id: 'sc_priority_gaps', label: 'In what areas of the business are the strategic priorities least clear to you today (products, client segments, technology roadmap, hiring)?', type: 'textarea' },
          { id: 'sc_context_needed', label: 'What information, context, or alignment from the Partners would help you make more strategically aligned operational decisions?', type: 'textarea' },
        ]
      },
    ]
  }
];

const ICON_MAP = {
  FileText, Clock, ShieldCheck, BarChart3, Zap, Users, Lightbulb, Target
};

const RatingInput = ({ value, onChange }) => {
  return (
    <div className="mt-2">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((num) => (
          <button
            key={num}
            onClick={() => onChange(num)}
            className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all border
              ${value === num
                ? 'bg-stone-800 border-stone-800 text-white'
                : 'bg-white border-stone-200 text-stone-400 hover:border-stone-400 hover:text-stone-600'}`}
          >
            {num}
          </button>
        ))}
      </div>
      <div className="flex justify-between mt-2.5 px-1">
        {RATING_LABELS.map((label, i) => (
          <span key={label} className={`text-xs ${value === i + 1 ? 'text-stone-800 font-medium' : 'text-stone-400'}`}>
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
      const total = section.subsections.reduce((acc, sub) => acc + sub.questions.length, 0);
      const completed = section.subsections.reduce((acc, sub) => {
        return acc + sub.questions.filter(q => !!responses[q.id]).length;
      }, 0);
      return { total, completed, percent: Math.round((completed / total) * 100) };
    });
  }, [responses]);

  const globalProgress = useMemo(() => {
    const total = SECTIONS.reduce((acc, s) => {
      return acc + s.subsections.reduce((subAcc, sub) => subAcc + sub.questions.length, 0);
    }, 0);
    const completed = Object.values(responses).filter(v => !!v).length;
    return { total, completed, percent: Math.round((completed / total) * 100) };
  }, [responses]);

  if (!isLoaded) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-stone-50">
        <Loader2 className="w-7 h-7 animate-spin mb-4 text-stone-400" />
        <p className="text-sm text-stone-500">Loading your assessment...</p>
      </div>
    );
  }

  const currentSection = SECTIONS[activeSection];
  const progress = sectionProgress[activeSection];

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-72 lg:w-80 bg-white border-r border-stone-200 flex flex-col h-auto md:h-screen md:sticky md:top-0 shrink-0">
        <div className="px-6 pt-8 pb-6 border-b border-stone-200">
          <h1 className="font-serif text-lg font-bold text-stone-900 tracking-tight">
            Able Wealth Management
          </h1>
          <p className="text-sm text-stone-400 mt-1">Operations Self-Assessment</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {SECTIONS.map((section, idx) => {
            const isActive = activeSection === idx;
            const prog = sectionProgress[idx];
            const isDone = prog.percent === 100;
            const Icon = ICON_MAP[section.icon];
            return (
              <button
                key={section.id}
                onClick={() => { setActiveSection(idx); window.scrollTo(0, 0); }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all mb-0.5
                  ${isActive
                    ? 'bg-stone-100 text-stone-900'
                    : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'
                  }`}
              >
                <span className={`shrink-0 ${isDone ? 'text-sage-500' : isActive ? 'text-stone-700' : 'text-stone-400'}`}>
                  {isDone ? <CheckCircle className="w-[18px] h-[18px]" /> : <Icon className="w-[18px] h-[18px]" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${isActive ? 'font-semibold' : 'font-medium'}`}>
                    {section.title}
                  </p>
                  <p className={`text-xs mt-0.5 ${isDone ? 'text-sage-600' : 'text-stone-400'}`}>
                    {prog.completed} of {prog.total} complete
                  </p>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="px-5 py-5 border-t border-stone-200">
          <div className="flex justify-between text-xs text-stone-500 mb-2.5">
            <span>Overall Progress</span>
            <span className="font-medium text-stone-700">{globalProgress.completed} / {globalProgress.total}</span>
          </div>
          <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-sage-500 rounded-full transition-all duration-500"
              style={{ width: `${globalProgress.percent}%` }}
            />
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-stone-200">
          <div className="max-w-3xl mx-auto px-6 md:px-10 py-3.5 flex items-center justify-between">
            <p className="text-sm text-stone-400">
              Section {activeSection + 1} of {SECTIONS.length}
            </p>
            <div className="flex items-center gap-3">
              {lastSaved && (
                <span className="text-xs text-stone-400 hidden sm:block">
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={() => saveProgress()}
                disabled={saving}
                className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-6 md:px-10 py-10 md:py-14">
          {/* Section header */}
          <div className="mb-10">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-stone-900 leading-tight">
              {currentSection.title}
            </h2>
            <p className="text-base text-stone-500 mt-3 leading-relaxed">
              {currentSection.description}
            </p>
            <div className="flex items-center gap-3 mt-5">
              <div className="w-20 bg-stone-200 h-1 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${progress.percent === 100 ? 'bg-sage-500' : 'bg-sage-400'}`}
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <span className="text-sm text-stone-400">{progress.completed} of {progress.total} answered</span>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-10">
            {currentSection.subsections.map((subsection) => (
              <div key={subsection.id} className="space-y-5">
                <h3 className="font-serif text-lg font-semibold text-stone-800">
                  {subsection.title}
                </h3>

                <div className="space-y-4">
                  {subsection.questions.map((q) => (
                    <div key={q.id} className="bg-white rounded-xl border border-stone-200/80 overflow-hidden">
                      <div className="px-6 pt-5 pb-5">
                        <label className="block text-[15px] text-stone-700 leading-relaxed mb-3">
                          {q.label}
                        </label>

                        {q.type === 'textarea' && (
                          <textarea
                            value={responses[q.id] || ''}
                            onChange={(e) => updateResponse(q.id, e.target.value)}
                            rows={4}
                            placeholder="Type your response here..."
                            className="w-full p-3.5 border border-stone-200 rounded-lg text-sm leading-relaxed focus:ring-2 focus:ring-sage-200 focus:border-sage-400 transition-all outline-none resize-none bg-stone-50/50 placeholder:text-stone-300"
                          />
                        )}

                        {q.type === 'text' && (
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                              <ArrowUpRight className="w-4 h-4" />
                            </div>
                            <input
                              type="text"
                              value={responses[q.id] || ''}
                              onChange={(e) => updateResponse(q.id, e.target.value)}
                              placeholder="Paste a link or type a brief reference..."
                              className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-200 focus:border-sage-400 transition-all outline-none bg-stone-50/50 placeholder:text-stone-300"
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

                      {responses[q.id] && (
                        <div className="h-0.5 bg-sage-400" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Navigation */}
          <div className="mt-12 flex items-center justify-between pb-14">
            <button
              onClick={() => {
                setActiveSection(Math.max(0, activeSection - 1));
                window.scrollTo(0, 0);
              }}
              disabled={activeSection === 0}
              className="flex items-center gap-2 text-sm font-medium text-stone-400 hover:text-stone-700 disabled:opacity-0 transition-colors"
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
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-stone-800 text-white hover:bg-stone-900 transition-colors"
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
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-sage-600 text-white hover:bg-sage-700 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Submit for Review
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
