import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot
} from 'firebase/firestore';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged
} from 'firebase/auth';
import {
  Save,
  Download,
  Upload,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Link2
} from 'lucide-react';
import awmLogo from '/awm-logo.png';

// --- Firebase setup ---

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
const LOCAL_DRAFT_KEY = `ops-assessment-draft-${appId}`;

const readLocalDraft = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Local draft read error:', err);
    return null;
  }
};

const writeLocalDraft = (responses, savedAt = new Date().toISOString()) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify({ responses, savedAt }));
  } catch (err) {
    console.error('Local draft write error:', err);
  }
};

// --- Data ---

const RATING_LABELS = ['Developing', 'Building', 'Competent', 'Strong', 'Mastery'];

const SECTIONS = [
  {
    id: 'section-1',
    title: 'System Architecture & SOP Rigor',
    description: 'Designing an operational factory that is accurate, scalable, and low-friction.',
    subsections: [
      {
        id: 'sop-integrity',
        title: 'SOP Integrity & Repeatability',
        definition: 'A new hire can complete a core operational task correctly using only your written SOP — no Slack messages, verbal walkthroughs, or tribal knowledge required.',
        evidence: 'Link to 3 SOPs. Each must include: step-by-step instructions, required system fields or inputs, expected outputs, and an embedded QC checkpoint.',
        questions: [
          { id: 'sop_integrity', label: 'Do your current SOPs enable a new hire to complete core tasks correctly using only your documentation (no verbal support)?', type: 'textarea' },
          { id: 'critical_workflows', label: 'Identify 3–5 critical workflows (e.g., client onboarding, money movement, billing exceptions) where SOPs are currently "audit-ready."', type: 'textarea' },
          { id: 'incomplete_workflows', label: 'Identify 2–3 workflows where SOPs are incomplete, outdated, or overly dependent on your tribal knowledge.', type: 'textarea' },
        ]
      },
      {
        id: 'vendor-integration',
        title: 'New Vendor Integration',
        definition: 'Every vendor added in the last 6 months has a complete internal page that includes: login/access instructions, firm-specific use case, troubleshooting steps, and an identified internal owner.',
        evidence: 'Link to vendor internal pages for the last 3 tools/vendors onboarded. Each page must contain all four elements listed above.',
        questions: [
          { id: 'vendor_integration', label: 'For each vendor added in the last 6 months, have you created: access/login documentation, troubleshooting steps, and defined firm-use cases?', type: 'textarea' },
          { id: 'recent_vendors', label: 'List the last 3 vendors or major tools integrated and link to their internal SOPs or configuration notes.', type: 'textarea' },
        ]
      },
      {
        id: 'root-cause',
        title: 'Root-Cause System Design',
        definition: 'When an error occurs, you can identify the system condition that allowed it — not just the person who made it — and implement a process-level or system-level fix.',
        evidence: 'Provide 3 examples from the last 90 days using a 5-part structure: (1) Error description, (2) Immediate fix, (3) Root cause identified, (4) Permanent system change implemented, (5) How you verified the fix is holding.',
        questions: [
          { id: 'root_cause_process', label: 'When an error occurs (e.g., NIGO, billing exception), what is your standard process for identifying root cause and implementing a system-level fix?', type: 'textarea' },
          { id: 'permanent_fixes', label: 'In the last 90 days, list at least 3 issues where you implemented a permanent process change (not just a one-time fix) and describe the change.', type: 'textarea' },
        ]
      },
      {
        id: 'process-simplification',
        title: 'Process Simplification & Technical Debt',
        definition: 'You have removed steps, handoffs, or manual checks from a workflow while maintaining control quality — making it faster without making it riskier.',
        evidence: 'Provide before/after summaries for 2 workflows simplified in the last 90 days. Include: steps removed, time saved per cycle, and confirmation that output quality was maintained.',
        questions: [
          { id: 'process_debt_id', label: 'How do you identify "process debt" (legacy steps, duplicate checks, unnecessary handoffs)?', type: 'textarea' },
          { id: 'process_simplification_count', label: 'In the last 90 days, how many steps have you removed, consolidated, or automated in core workflows?', type: 'textarea' },
          { id: 'simplified_workflows', label: 'Provide a short list of simplified workflows (before vs. after description or links to updated SOPs).', type: 'textarea' },
        ]
      },
      {
        id: 'operational-architecture',
        title: 'Operational Architecture',
        definition: 'You have built or redesigned a system so it runs consistently — with defined owners, inputs, outputs, and quality checks — rather than depending on memory or ad hoc effort.',
        evidence: 'Provide a process map or narrative for 1 system you built or materially improved. Must include: trigger event, step sequence, responsible party, QC checkpoint, and where the output is stored/delivered.',
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
    description: "Managing your time and the firm's capacity through systems, not memory.",
    subsections: [
      {
        id: 'prioritization-framework',
        title: 'Prioritization Framework',
        definition: 'You use a repeatable method — not instinct — to choose what to work on. The method includes explicit rules for sequencing, deferring, or declining work.',
        evidence: 'Screenshot or link to your current prioritization view (Notion, task board, etc.). Include one example of a task you deprioritized or declined in the last 30 days and the rationale.',
        questions: [
          { id: 'prioritization_framework', label: 'What explicit system do you use to select your daily and weekly focus (e.g., Notion view, task board, SLA-based rules)?', type: 'textarea' },
          { id: 'urgent_vs_important', label: 'How do you distinguish between "urgent" operational fires and "important" strategic projects when they conflict?', type: 'textarea' },
          { id: 'prioritization_layout', label: 'Attach or describe your current prioritization dashboard/layout.', type: 'textarea' },
        ]
      },
      {
        id: 'operational-rhythm',
        title: 'Operational Rhythm ("Heartbeat")',
        definition: 'You have named, recurring operational reviews (daily/weekly/monthly/quarterly) with fixed agendas, outputs, and follow-through — not just calendar holds.',
        evidence: 'Provide 4 consecutive weeks of artifacts (agendas, checklists, or notes) from at least 2 recurring reviews. Each must show: what was reviewed, decisions made, and follow-up items with owners.',
        questions: [
          { id: 'ops_heartbeat', label: 'Do you have a structured cadence for weekly, monthly, quarterly, and annual operational tasks and reviews?', type: 'textarea' },
          { id: 'recurring_checklists', label: 'List your recurring checklists or views (e.g., "Monday Ops Review," "Quarterly Billing Prep," "Annual Vendor Review") and where they live.', type: 'textarea' },
          { id: 'deadline_convergence', label: 'How do you ensure nothing falls through the cracks when multiple deadlines converge?', type: 'textarea' },
        ]
      },
      {
        id: 'project-management',
        title: 'Project Management Discipline',
        definition: 'You maintain a structured, recurring ritual (weekly scrub) where every project and task is reviewed, status is updated, stale items are closed, and priorities are re-sequenced. Changes are recorded, not just discussed.',
        evidence: 'Link to or attach the last 3 weekly scrub artifacts. Each must include: date, number of items reviewed, items closed, items re-prioritized, and any new items added with assigned owners.',
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
    title: 'Compliance, Staff Dev & Execution',
    description: 'Ensuring people, processes, and policies are aligned and consistently executed.',
    subsections: [
      {
        id: 'meeting-governance',
        title: 'Meeting Governance & Action Execution',
        definition: 'Meetings you lead or attend produce: (1) decisions with rationale, (2) action items with owners and dates, and (3) documented follow-through within one business day.',
        evidence: 'Link to 3 recent meeting notes. Each must include: attendees, key decisions, action items with owners/dates, and evidence that at least 80% of action items were closed by the stated deadline.',
        questions: [
          { id: 'meeting_governance', label: 'After internal and vendor meetings, do you consistently capture key decisions, owners, due dates, and next steps?', type: 'textarea' },
          { id: 'action_tracking', label: 'Where are these action items tracked, and how do you monitor completion?', type: 'textarea' },
          { id: 'meeting_summary_log', label: 'Attach or link to a recent meeting summary log.', type: 'text' },
        ]
      },
      {
        id: 'status-visibility',
        title: 'Status Visibility ("Single Source of Truth")',
        definition: 'At any moment, you can produce a complete list of every open operational item — with owner, status, and next step — in under 2 minutes, without building it from scratch.',
        evidence: 'Link to or screenshot the live view/report. It must include: task name, owner, status, due date, and next action. Confirm it is updated at least weekly.',
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
        definition: 'Staff tasks have explicit assignments, visible deadlines, and an automatic follow-up mechanism — not verbal reminders or memory-based tracking.',
        evidence: 'Show one example of a missed or at-risk staff deadline from the last 60 days. Include: the task, the assigned owner, the original deadline, how the system surfaced the miss, and the follow-up path taken.',
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
        definition: 'You can identify where day-to-day practice has drifted from written policy — and choose whether to update the policy or change the behavior, with a clear remediation plan.',
        evidence: 'Provide 1 example: (1) link to the policy, (2) description of the drift, (3) impact or risk of the drift, and (4) your remediation decision (update policy or enforce behavior) with timeline and owner.',
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
    title: 'Time Leaks, Automation & Future Focus',
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
    description: 'Demonstrating ownership, initiative, and director-level decision-making.',
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
        definition: 'You use documented thresholds (dollar amount, risk level, client impact) to decide what you handle independently vs. escalate — and you escalate at the defined threshold, not based on comfort.',
        evidence: 'Provide 2 decision memos or summaries from the last 90 days: one where you acted independently and one where you escalated. Each must include: the decision, the threshold or principle that guided it, and the outcome.',
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
    description: 'Evaluating your ability to diagnose issues, weigh options, and implement durable solutions.',
    subsections: [
      {
        id: 'problem-solving-rating',
        title: 'Self-Rating: Problem Solving (1–5)',
        questions: [
          { id: 'ps_rating', label: 'On a scale of 1–5 (1 = needs significant improvement, 5 = outstanding), how would you rate your problem-solving over the last 6 months?', type: 'rating' },
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
    description: "Connecting daily operations to the firm's long-term strategy and priorities.",
    subsections: [
      {
        id: 'strategic-rating',
        title: 'Self-Rating: Strategic Clarity (1–5)',
        questions: [
          { id: 'sc_rating', label: "On a scale of 1–5, how clearly do you understand and operate in alignment with the firm's strategic goals?", type: 'rating' },
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

// --- Components ---

const RatingInput = ({ value, onChange }) => (
  <div className="mt-1">
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((num) => (
        <button
          key={num}
          onClick={() => onChange(num)}
          className={`flex-1 py-2 rounded text-xs font-medium transition-all border
            ${value === num
              ? 'bg-stone-800 border-stone-800 text-white'
              : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700'}`}
        >
          {num}
        </button>
      ))}
    </div>
    <div className="flex justify-between mt-1.5 px-0.5">
      {RATING_LABELS.map((label, i) => (
        <span key={label} className={`text-2xs ${value === i + 1 ? 'text-stone-800 font-medium' : 'text-stone-500'}`}>
          {label}
        </span>
      ))}
    </div>
  </div>
);

const QuestionField = ({ question, value, onChange, onBlur, questionNum }) => {
  const isFilled = !!value;

  return (
    <div className="question-row px-5 py-3.5 border-b border-stone-100">
      {/* Label row */}
      <div className="flex items-start gap-2 mb-1.5">
        <span className={`text-2xs font-medium mt-px shrink-0 ${isFilled ? 'text-sage-600' : 'text-stone-500'}`}>
          {questionNum}.
        </span>
        <label className="block text-xs text-stone-700 leading-relaxed">
          {question.label}
        </label>
      </div>

      {/* Input */}
      <div className="pl-5">
        {question.type === 'textarea' && (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(question.id, e.target.value)}
            onBlur={onBlur}
            rows={3}
            placeholder="Type your response..."
            className="w-full px-2.5 py-2 border border-stone-200 rounded text-xs leading-relaxed focus:border-stone-400 transition-all outline-none placeholder:text-stone-300"
          />
        )}

        {question.type === 'text' && (
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-stone-400">
              <Link2 className="w-3 h-3" />
            </div>
            <input
              type="text"
              value={value || ''}
              onChange={(e) => onChange(question.id, e.target.value)}
              onBlur={onBlur}
              placeholder="Paste link or reference..."
              className="w-full pl-7 pr-3 py-2 border border-stone-200 rounded text-xs focus:border-stone-400 transition-all outline-none placeholder:text-stone-300"
            />
          </div>
        )}

        {question.type === 'rating' && (
          <RatingInput value={value} onChange={(val) => { onChange(question.id, val); onBlur(); }} />
        )}
      </div>
    </div>
  );
};

// --- App ---

export default function App() {
  const initialDraft = readLocalDraft();
  const importFileRef = useRef(null);
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState(0);
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem('assessmentIntroDismissed') !== 'true';
  });
  const [responses, setResponses] = useState(initialDraft?.responses || {});
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(initialDraft?.savedAt ? new Date(initialDraft.savedAt) : null);
  const [isLoaded, setIsLoaded] = useState(true);
  const [saveStatus, setSaveStatus] = useState(initialDraft?.savedAt ? 'local' : null);

  // Auth
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

  // Firestore sync
  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'submissions', 'main');
    const unsubscribe = onSnapshot(docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const remoteResponses = docSnap.data().responses || {};
          const remoteSavedAt = docSnap.data().updatedAt?.toDate() || null;
          setResponses(remoteResponses);
          setLastSaved(remoteSavedAt);
          setSaveStatus('cloud');
          writeLocalDraft(remoteResponses, remoteSavedAt ? remoteSavedAt.toISOString() : new Date().toISOString());
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

  // Save
  const saveProgress = useCallback(async (newResponses) => {
    const data = newResponses || responses;
    const now = new Date();
    writeLocalDraft(data, now.toISOString());
    setLastSaved(now);
    setSaveStatus('local');

    if (!user) return;

    setSaving(true);
    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'submissions', 'main');
      await setDoc(docRef, {
        responses: data,
        updatedAt: new Date(),
        userId: user.uid,
        status: 'in-progress'
      }, { merge: true });
      setSaveStatus('cloud');
    } catch (err) {
      console.error("Save error:", err);
      setSaveStatus('local');
    } finally {
      setSaving(false);
    }
  }, [user, responses]);

  const exportProgressAsJson = () => {
    try {
      const payload = {
        version: 1,
        appId,
        exportedAt: new Date().toISOString(),
        lastSaved: lastSaved ? lastSaved.toISOString() : null,
        responses,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      anchor.href = url;
      anchor.download = `ops-assessment-progress-${stamp}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export JSON error:', err);
      alert('Could not export progress. Please try again.');
    }
  };

  const importProgressFromJson = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      const importedResponses = parsed?.responses;

      if (!importedResponses || typeof importedResponses !== 'object' || Array.isArray(importedResponses)) {
        throw new Error('Invalid progress file format');
      }

      const parsedLastSaved = parsed?.lastSaved ? new Date(parsed.lastSaved) : new Date();
      const safeLastSaved = Number.isNaN(parsedLastSaved.getTime()) ? new Date() : parsedLastSaved;

      setResponses(importedResponses);
      setLastSaved(safeLastSaved);
      writeLocalDraft(importedResponses, safeLastSaved.toISOString());
      setSaveStatus('local');

      await saveProgress(importedResponses);
      alert('Progress loaded successfully.');
    } catch (err) {
      console.error('Import JSON error:', err);
      alert('Could not load this file. Please use a valid exported progress JSON file.');
    } finally {
      event.target.value = '';
    }
  };

  const updateResponse = (id, value) => {
    setResponses(prev => {
      const next = { ...prev, [id]: value };
      writeLocalDraft(next);
      return next;
    });
  };

  const handleBlur = () => {
    saveProgress();
  };

  // Progress calculations
  const sectionProgress = useMemo(() => {
    return SECTIONS.map(section => {
      const total = section.subsections.reduce((acc, sub) => acc + sub.questions.length, 0);
      const completed = section.subsections.reduce((acc, sub) => {
        return acc + sub.questions.filter(q => !!responses[q.id]).length;
      }, 0);
      return { total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
    });
  }, [responses]);

  const subsectionProgress = useCallback((subsection) => {
    const total = subsection.questions.length;
    const completed = subsection.questions.filter(q => !!responses[q.id]).length;
    return { total, completed };
  }, [responses]);

  const globalProgress = useMemo(() => {
    const total = SECTIONS.reduce((acc, s) => {
      return acc + s.subsections.reduce((subAcc, sub) => subAcc + sub.questions.length, 0);
    }, 0);
    const completed = Object.values(responses).filter(v => !!v).length;
    return { total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [responses]);

  // Loading state
  if (!isLoaded) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white">
        <Loader2 className="w-5 h-5 animate-spin mb-3 text-stone-400" />
        <p className="text-xs text-stone-400">Loading assessment...</p>
      </div>
    );
  }

  const currentSection = SECTIONS[activeSection];
  const progress = sectionProgress[activeSection];

  if (showIntro) {
    return (
      <div className="min-h-screen bg-stone-50 font-sans text-stone-900 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-3xl bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-stone-200 flex items-center gap-3">
            <img src={awmLogo} alt="Able Wealth Management" className="h-7 w-auto object-contain" />
            <div>
              <p className="text-2xs uppercase tracking-wide text-stone-500">Operations Assessment</p>
              <h1 className="text-lg font-semibold text-stone-900">6-Month Self-Assessment Overview</h1>
            </div>
          </div>

          <div className="px-8 py-7">
            <p className="text-sm text-stone-700 leading-relaxed">
              This self-assessment is designed to clarify what the Director of Operations role means at our firm and to define the next 90 days in a concrete, measurable way.
            </p>

            <p className="mt-4 text-sm text-stone-700 leading-relaxed">
              The focus is not on writing a narrative or listing completed tasks. Instead, this review is about demonstrating progress toward building and running a true operating system — one with:
            </p>

            <ul className="mt-3 space-y-1.5 text-sm text-stone-700 leading-relaxed list-disc pl-5">
              <li>Clear, documented priorities</li>
              <li>Defined and repeatable workflows</li>
              <li>Embedded controls and checkpoints</li>
              <li>Visible dashboards and reporting</li>
              <li>Clear decision thresholds</li>
              <li>Reduced errors and reduced routine Partner involvement</li>
            </ul>

            <p className="mt-4 text-sm text-stone-700 leading-relaxed">
              Please respond directly and concisely. Where possible, link to supporting documentation, dashboards, workflows, reports, or other evidence.
            </p>

            <p className="mt-4 text-sm text-stone-700 leading-relaxed">
              If something is not yet built, state that clearly and outline:
            </p>

            <ul className="mt-3 space-y-1.5 text-sm text-stone-700 leading-relaxed list-disc pl-5">
              <li>The specific plan to complete it</li>
              <li>The responsible owner</li>
              <li>The target completion date</li>
              <li>The first action step you will complete within the next 7 days</li>
            </ul>

            <p className="mt-4 text-sm text-stone-700 leading-relaxed">
              Note: Saved progress is stored locally on the same device and browser profile. Your work will remain available across days if you use the same browser profile and do not clear site data. Progress may be lost if you clear your browser cache or site data, use private/incognito mode, or switch browsers or devices. To prevent loss, we recommend backing up your work by clicking Export JSON and saving the file. You can later restore your progress by selecting Import JSON and uploading that file.
            </p>

            <div className="mt-7 flex flex-wrap gap-2 justify-end">
              <button
                onClick={exportProgressAsJson}
                className="flex items-center gap-1 text-2xs font-medium px-3 py-2 rounded border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
              >
                <Download className="w-3 h-3" />
                Export JSON
              </button>
              <button
                onClick={() => importFileRef.current?.click()}
                className="flex items-center gap-1 text-2xs font-medium px-3 py-2 rounded border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
              >
                <Upload className="w-3 h-3" />
                Import JSON
              </button>
              <button
                onClick={() => {
                  window.localStorage.setItem('assessmentIntroDismissed', 'true');
                  setShowIntro(false);
                  window.scrollTo(0, 0);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-medium bg-stone-900 text-white hover:bg-stone-800 transition-colors"
              >
                Begin Assessment
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <input
                ref={importFileRef}
                type="file"
                accept="application/json,.json"
                onChange={importProgressFromJson}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Running question counter across subsections
  let questionCounter = 0;

  return (
    <div className="min-h-screen bg-white font-sans text-stone-900 flex flex-col md:flex-row">

      {/* ── Sidebar ── */}
      <aside className="w-full md:w-52 lg:w-56 bg-white border-r border-stone-200 flex flex-col h-auto md:h-screen md:sticky md:top-0 shrink-0">

        {/* Logo */}
        <div className="h-12 flex items-center px-4 border-b border-stone-200 shrink-0">
          <img src={awmLogo} alt="Able Wealth Management" className="h-6 w-auto object-contain" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3">
          {SECTIONS.map((section, idx) => {
            const isActive = activeSection === idx;
            const prog = sectionProgress[idx];
            const isDone = prog.percent === 100;
            return (
              <button
                key={section.id}
                onClick={() => { setActiveSection(idx); window.scrollTo(0, 0); }}
                className={`nav-item w-full text-left block px-5 py-[7px] text-[13px]
                  ${isActive
                    ? 'nav-item-active text-stone-900 font-semibold'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                  }`}
              >
                <span className="text-2xs text-stone-500 mr-1.5">{idx + 1}.</span>
                {section.title}
                {isDone && <CheckCircle className="inline-block w-3 h-3 text-sage-500 ml-1 -mt-0.5" />}
              </button>
            );
          })}
        </nav>

        {/* Progress bar */}
        <div className="px-4 py-3 border-t border-stone-200 shrink-0">
          <div className="flex justify-between text-2xs text-stone-500 mb-1">
            <span>{globalProgress.completed} of {globalProgress.total}</span>
            <span className="font-medium text-stone-600">{globalProgress.percent}%</span>
          </div>
          <div className="w-full bg-stone-100 h-1 rounded-full overflow-hidden">
            <div className="h-full bg-stone-800 rounded-full transition-all duration-500" style={{ width: `${globalProgress.percent}%` }} />
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col min-h-screen">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-stone-200 shrink-0">
          <div className="px-8 py-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-2xs text-stone-500">
              <span>Assessment</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-stone-700">{currentSection.title}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  window.localStorage.removeItem('assessmentIntroDismissed');
                  setShowIntro(true);
                  window.scrollTo(0, 0);
                }}
                className="text-2xs font-medium px-2.5 py-1.5 rounded border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
              >
                Overview
              </button>
              {lastSaved && (
                <span className="text-2xs text-stone-500 hidden sm:block mr-1">
                  Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {saveStatus && (
                <span className="text-2xs text-stone-500 hidden sm:block mr-1">
                  {saveStatus === 'cloud' ? 'Synced to cloud' : 'Saved locally'}
                </span>
              )}
              <button
                onClick={() => { if (activeSection > 0) { setActiveSection(activeSection - 1); window.scrollTo(0, 0); } }}
                disabled={activeSection === 0}
                className="flex items-center gap-0.5 text-2xs font-medium px-2.5 py-1.5 rounded border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-25 transition-colors"
              >
                <ChevronLeft className="w-3 h-3" /> Prev
              </button>
              <button
                onClick={() => { saveProgress(); if (activeSection < SECTIONS.length - 1) { setActiveSection(activeSection + 1); window.scrollTo(0, 0); } }}
                disabled={activeSection === SECTIONS.length - 1}
                className="flex items-center gap-0.5 text-2xs font-medium px-2.5 py-1.5 rounded border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-25 transition-colors"
              >
                Next <ChevronRight className="w-3 h-3" />
              </button>
              <button
                onClick={() => saveProgress()}
                disabled={saving}
                className="flex items-center gap-1 text-2xs font-medium px-2.5 py-1.5 rounded bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-40 transition-colors"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Save
              </button>
              <button
                onClick={exportProgressAsJson}
                className="flex items-center gap-1 text-2xs font-medium px-2.5 py-1.5 rounded border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
              >
                <Download className="w-3 h-3" />
                Export JSON
              </button>
              <button
                onClick={() => importFileRef.current?.click()}
                className="flex items-center gap-1 text-2xs font-medium px-2.5 py-1.5 rounded border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
              >
                <Upload className="w-3 h-3" />
                Import JSON
              </button>
              <input
                ref={importFileRef}
                type="file"
                accept="application/json,.json"
                onChange={importProgressFromJson}
                className="hidden"
              />
            </div>
          </div>
          <div className="px-8 pb-2.5 flex items-baseline justify-between">
            <h1 className="text-base font-semibold text-stone-900">{currentSection.title}</h1>
            <span className="text-2xs text-stone-500">{progress.completed}/{progress.total} answered</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-stone-50">
          <div className="max-w-4xl px-8 py-5">
            <p className="text-xs text-stone-600 mb-5 leading-relaxed">{currentSection.description}</p>

            {/* Subsection cards */}
            <div className="space-y-4">
              {currentSection.subsections.map((subsection) => {
                const subProg = subsectionProgress(subsection);
                return (
                  <div key={subsection.id} className="bg-white rounded-lg border border-stone-200 overflow-hidden">

                    {/* Subsection header */}
                    <div className="px-5 py-2.5 border-b border-stone-100">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold text-stone-800">
                          {subsection.title}
                          <span className="text-stone-500 font-normal ml-1.5">({subsection.questions.length})</span>
                        </h3>
                        {subProg.completed > 0 && (
                          <span className={`text-2xs font-medium ${subProg.completed === subProg.total ? 'text-sage-600' : 'text-stone-500'}`}>
                            {subProg.completed === subProg.total ? 'Complete' : `${subProg.completed}/${subProg.total}`}
                          </span>
                        )}
                      </div>
                      {(subsection.definition || subsection.evidence) && (
                        <div className="mt-2 space-y-1.5">
                          {subsection.definition && (
                            <p className="text-2xs text-stone-600 leading-relaxed">
                              <span className="font-semibold text-stone-700">Definition:</span> {subsection.definition}
                            </p>
                          )}
                          {subsection.evidence && (
                            <p className="text-2xs text-stone-600 leading-relaxed">
                              <span className="font-semibold text-stone-700">Evidence:</span> {subsection.evidence}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Questions */}
                    {subsection.questions.map((q) => {
                      questionCounter++;
                      return (
                        <QuestionField
                          key={q.id}
                          question={q}
                          value={responses[q.id]}
                          onChange={updateResponse}
                          onBlur={handleBlur}
                          questionNum={questionCounter}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Bottom action */}
            <div className="mt-6 flex items-center justify-end pb-6">
              {activeSection < SECTIONS.length - 1 ? (
                <button
                  onClick={() => { saveProgress(); setActiveSection(activeSection + 1); window.scrollTo(0, 0); }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-medium bg-stone-900 text-white hover:bg-stone-800 transition-colors"
                >
                  Continue to Next Section
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => { saveProgress(); alert("Assessment saved for final review."); }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-medium bg-sage-600 text-white hover:bg-sage-700 transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Submit for Review
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
