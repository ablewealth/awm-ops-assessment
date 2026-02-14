import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
  getIdTokenResult
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
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "your-project-id",
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "your-sender-id",
      appId: import.meta.env.VITE_FIREBASE_APP_ID || "your-app-id"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const appId = typeof __app_id !== 'undefined'
  ? __app_id
  : (import.meta.env.VITE_APP_ID || 'able-wealth-ops-assessment-v1');

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
    description: "Demonstrating ownership, initiative, and director-level decision-making. Framing: Associates ask \"What should I do?\" Directors say \"Here is what I've done.\"",
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
          { id: 'sc_evidence', label: "Provide 2–3 examples where you: translated a firm-level objective (growth, client experience, risk reduction, margin) into a concrete operational initiative, or declined or de-prioritized work because it did not align with strategic priorities. For each, describe how your decision or project advanced the firm's strategy.", type: 'textarea' },
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
  const [isReviewer, setIsReviewer] = useState(false);
  const [claimsLoaded, setClaimsLoaded] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const [responses, setResponses] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewMode, setReviewMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('review') === '1';
  });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSubmissions, setReviewSubmissions] = useState([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState('');
  const [lastSaved, setLastSaved] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showOverview, setShowOverview] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem('assessmentOverviewDismissed') !== 'true';
  });

  const isAnswered = (value) => {
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }

    if (typeof value === 'number') {
      return value > 0;
    }

    return !!value;
  };

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
    const loadClaims = async () => {
      if (!user) {
        setIsReviewer(false);
        setClaimsLoaded(true);
        return;
      }

      try {
        const tokenResult = await getIdTokenResult(user);
        const claims = tokenResult?.claims || {};
        setIsReviewer(Boolean(claims.reviewer || claims.admin));
      } catch (error) {
        console.error('Reviewer claims load error:', error);
        setIsReviewer(false);
      } finally {
        setClaimsLoaded(true);
      }
    };

    loadClaims();
  }, [user]);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (reviewMode) {
      url.searchParams.set('review', '1');
    } else {
      url.searchParams.delete('review');
    }
    window.history.replaceState({}, '', url);
  }, [reviewMode]);

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
        return acc + sub.questions.filter((q) => isAnswered(responses[q.id])).length;
      }, 0);
      return { total, completed, percent: Math.round((completed / total) * 100) };
    });
  }, [responses]);

  const globalProgress = useMemo(() => {
    const total = SECTIONS.reduce((acc, s) => {
      return acc + s.subsections.reduce((subAcc, sub) => subAcc + sub.questions.length, 0);
    }, 0);
    const completed = Object.values(responses).filter((v) => isAnswered(v)).length;
    return { total, completed, percent: Math.round((completed / total) * 100) };
  }, [responses]);

  const questionMetaById = useMemo(() => {
    const map = {};
    SECTIONS.forEach((section) => {
      section.subsections.forEach((subsection) => {
        subsection.questions.forEach((question) => {
          map[question.id] = {
            sectionId: section.id,
            sectionTitle: section.title,
            subsectionId: subsection.id,
            subsectionTitle: subsection.title,
            questionId: question.id,
            questionLabel: question.label,
            questionType: question.type
          };
        });
      });
    });
    return map;
  }, []);

  const loadReviewSubmissions = async () => {
    if (!user || !isReviewer) return;

    setReviewLoading(true);
    setReviewError('');

    try {
      const completedCollectionRef = collection(db, 'artifacts', appId, 'completedAssessments');
      const submissionsQuery = query(completedCollectionRef, orderBy('submittedAt', 'desc'), limit(50));
      const snapshot = await getDocs(submissionsQuery);

      const items = snapshot.docs.map((submissionDoc) => {
        const data = submissionDoc.data();
        const submittedAtDate = data.submittedAt?.toDate
          ? data.submittedAt.toDate()
          : data.submittedAtClient?.toDate
            ? data.submittedAtClient.toDate()
            : data.submittedAtClient
              ? new Date(data.submittedAtClient)
              : null;

        return {
          ...data,
          docId: submissionDoc.id,
          submittedAtDate
        };
      });

      setReviewSubmissions(items);

      if (!selectedSubmissionId && items.length > 0) {
        setSelectedSubmissionId(items[0].docId);
      }

      if (selectedSubmissionId && items.every((item) => item.docId !== selectedSubmissionId)) {
        setSelectedSubmissionId(items[0]?.docId || '');
      }
    } catch (error) {
      console.error('Review load error:', error);
      setReviewError('Unable to load completed assessments.');
    } finally {
      setReviewLoading(false);
    }
  };

  useEffect(() => {
    if (!claimsLoaded) return;

    if (reviewMode && !isReviewer) {
      setReviewError('You do not have access to reviewed submissions.');
      return;
    }

    if (!user || !reviewMode || !isReviewer) return;
    loadReviewSubmissions();
  }, [user, reviewMode, isReviewer, claimsLoaded]);

  const selectedSubmission = useMemo(() => {
    return reviewSubmissions.find((submission) => submission.docId === selectedSubmissionId) || null;
  }, [reviewSubmissions, selectedSubmissionId]);

  const selectedSubmissionSections = useMemo(() => {
    if (!selectedSubmission?.responses) {
      return [];
    }

    return SECTIONS.map((section) => ({
      ...section,
      subsections: section.subsections.map((subsection) => ({
        ...subsection,
        questions: subsection.questions.map((question) => ({
          ...question,
          answer: selectedSubmission.responses[question.id]
        }))
      }))
    }));
  }, [selectedSubmission]);

  const submitAssessment = async () => {
    if (!user || submitting) return;

    if (globalProgress.completed < globalProgress.total) {
      alert('Please complete all assessment questions before submitting for review.');
      return;
    }

    setSubmitting(true);

    try {
      const submissionId = `${user.uid}_${Date.now()}`;
      const now = new Date();

      const completedCollectionRef = collection(db, 'artifacts', appId, 'completedAssessments');
      await addDoc(completedCollectionRef, {
        submissionId,
        userId: user.uid,
        appId,
        status: 'submitted',
        responses,
        totals: {
          questions: globalProgress.total,
          answered: globalProgress.completed,
          completionPercent: globalProgress.percent
        },
        sectionProgress: SECTIONS.map((section, idx) => ({
          sectionId: section.id,
          sectionTitle: section.title,
          completed: sectionProgress[idx]?.completed ?? 0,
          total: sectionProgress[idx]?.total ?? 0,
          percent: sectionProgress[idx]?.percent ?? 0
        })),
        submittedAt: serverTimestamp(),
        submittedAtClient: now,
        updatedAt: serverTimestamp()
      });

      const draftRef = doc(db, 'artifacts', appId, 'users', user.uid, 'submissions', 'main');
      await setDoc(draftRef, {
        responses,
        updatedAt: serverTimestamp(),
        userId: user.uid,
        status: 'submitted',
        submittedAt: serverTimestamp(),
        submittedAtClient: now,
        latestSubmissionId: submissionId
      }, { merge: true });

      setLastSaved(now);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('assessmentOverviewDismissed');
        window.scrollTo(0, 0);
      }
      setShowOverview(true);
      alert('Assessment submitted successfully for review and analysis.');
    } catch (err) {
      console.error('Submission error:', err);
      alert('Unable to submit assessment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const returnToAssessmentOverview = () => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('review');
      window.history.replaceState({}, '', url);
      window.localStorage.removeItem('assessmentOverviewDismissed');
      window.scrollTo(0, 0);
    }
    setReviewMode(false);
    setShowOverview(true);
  };

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

  if (showOverview && !reviewMode) {
    return (
      <div className="min-h-screen bg-navy-50 font-sans text-navy-900 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-3xl bg-white border border-navy-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-navy-200">
            <p className="text-[11px] uppercase tracking-wide text-navy-500">Operations Assessment</p>
            <h1 className="text-lg font-semibold text-navy-900 mt-1">6-Month Self-Assessment Overview</h1>
          </div>

          <div className="px-8 py-7">
            <p className="text-sm text-navy-700 leading-relaxed">
              This self-assessment is designed to define where operations are strong today and where systems need improvement over the next 90 days.
            </p>

            <p className="mt-4 text-sm text-navy-700 leading-relaxed">
              Focus on clear, direct responses. Link to supporting SOPs, workflows, dashboards, or documentation where relevant.
            </p>

            <ul className="mt-4 space-y-1.5 text-sm text-navy-700 leading-relaxed list-disc pl-5">
              <li>Answer each question concisely and specifically</li>
              <li>Use evidence and links where possible</li>
              <li>Save progress as you go</li>
              <li>Submit only when all sections are complete</li>
            </ul>

            <div className="mt-7 flex justify-end">
              <button
                onClick={() => {
                  window.localStorage.setItem('assessmentOverviewDismissed', 'true');
                  setShowOverview(false);
                  window.scrollTo(0, 0);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-medium bg-navy-900 text-white hover:bg-navy-800 transition-colors"
              >
                Begin Assessment
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (reviewMode) {
    if (!claimsLoaded) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-navy-50">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-navy-600" />
          <p className="text-sm font-medium text-navy-600">Checking reviewer access...</p>
        </div>
      );
    }

    if (!isReviewer) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-navy-50 px-4">
          <div className="max-w-md w-full bg-white border border-navy-200 rounded-xl shadow-sm p-6 text-center">
            <h2 className="text-base font-semibold text-navy-900">Access Restricted</h2>
            <p className="mt-2 text-sm text-navy-600">You do not have permission to view reviewed submissions.</p>
            <button
              onClick={returnToAssessmentOverview}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-navy-800 text-white text-sm font-medium hover:bg-navy-900 transition-colors"
            >
              Back to Assessment
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-navy-50 font-sans text-navy-900">
        <header className="sticky top-0 z-10 bg-navy-50/95 backdrop-blur-sm border-b border-navy-200/60">
          <div className="max-w-7xl mx-auto px-5 md:px-8 py-3 flex items-center justify-between">
            <div>
              <h1 className="text-sm md:text-base font-semibold text-navy-900">Assessment Reviewer</h1>
              <p className="text-[11px] text-navy-500">Completed submissions for review and analysis</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadReviewSubmissions}
                disabled={reviewLoading}
                className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-md bg-white border border-navy-200 text-navy-700 hover:bg-navy-100 disabled:opacity-40 transition-colors shadow-sm"
              >
                {reviewLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Refresh
              </button>
              <button
                onClick={returnToAssessmentOverview}
                className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-md bg-navy-800 border border-navy-800 text-white hover:bg-navy-900 transition-colors shadow-sm"
              >
                Back to Assessment
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-5 md:px-8 py-6 grid grid-cols-1 lg:grid-cols-[340px,1fr] gap-6">
          <aside className="bg-white border border-navy-100 rounded-xl shadow-sm overflow-hidden h-fit">
            <div className="px-4 py-3 border-b border-navy-100">
              <p className="text-xs font-semibold text-navy-800">Submissions</p>
              <p className="text-[11px] text-navy-400">Latest 50 records</p>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-2 space-y-2">
              {reviewError && (
                <div className="px-3 py-2 rounded-md bg-red-50 border border-red-200 text-[12px] text-red-700">
                  {reviewError}
                </div>
              )}

              {!reviewLoading && reviewSubmissions.length === 0 && !reviewError && (
                <div className="px-3 py-2 rounded-md bg-navy-50 border border-navy-100 text-[12px] text-navy-500">
                  No completed assessments found.
                </div>
              )}

              {reviewSubmissions.map((submission) => {
                const isActive = submission.docId === selectedSubmissionId;
                return (
                  <button
                    key={submission.docId}
                    onClick={() => setSelectedSubmissionId(submission.docId)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors
                      ${isActive
                        ? 'bg-navy-800 border-navy-800 text-white'
                        : 'bg-white border-navy-100 text-navy-800 hover:bg-navy-50'
                      }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[11px] font-medium truncate ${isActive ? 'text-navy-100' : 'text-navy-500'}`}>
                        {submission.userId || 'Unknown user'}
                      </span>
                      <span className={`text-[10px] font-semibold ${isActive ? 'text-teal-300' : 'text-teal-700'}`}>
                        {submission.totals?.completionPercent ?? 0}%
                      </span>
                    </div>
                    <p className={`mt-1 text-[11px] ${isActive ? 'text-navy-300' : 'text-navy-400'}`}>
                      {submission.submittedAtDate ? submission.submittedAtDate.toLocaleString() : 'No timestamp'}
                    </p>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="bg-white border border-navy-100 rounded-xl shadow-sm overflow-hidden">
            {!selectedSubmission ? (
              <div className="p-8 text-center text-navy-500 text-sm">
                Select a submission to review.
              </div>
            ) : (
              <div>
                <div className="px-6 py-4 border-b border-navy-100">
                  <h2 className="text-base font-semibold text-navy-900">Submission Details</h2>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-navy-50 border border-navy-100 rounded-lg px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-navy-400">User</p>
                      <p className="text-[12px] font-medium text-navy-800 break-all">{selectedSubmission.userId || 'Unknown'}</p>
                    </div>
                    <div className="bg-navy-50 border border-navy-100 rounded-lg px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-navy-400">Submitted</p>
                      <p className="text-[12px] font-medium text-navy-800">{selectedSubmission.submittedAtDate ? selectedSubmission.submittedAtDate.toLocaleString() : 'No timestamp'}</p>
                    </div>
                    <div className="bg-navy-50 border border-navy-100 rounded-lg px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-navy-400">Completion</p>
                      <p className="text-[12px] font-medium text-navy-800">{selectedSubmission.totals?.answered ?? 0} / {selectedSubmission.totals?.questions ?? 0}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                  {selectedSubmissionSections.map((section) => (
                    <section key={section.id} className="space-y-3">
                      <h3 className="text-sm font-semibold text-navy-900">{section.title}</h3>
                      {section.subsections.map((subsection) => (
                        <div key={subsection.id} className="border border-navy-100 rounded-lg overflow-hidden">
                          <div className="px-4 py-2.5 bg-navy-50 border-b border-navy-100">
                            <p className="text-[12px] font-medium text-navy-700">{subsection.title}</p>
                          </div>
                          <div className="divide-y divide-navy-100">
                            {subsection.questions.map((question) => {
                              const value = selectedSubmission.responses?.[question.id];
                              const hasValue = isAnswered(value);
                              const meta = questionMetaById[question.id];

                              return (
                                <div key={question.id} className="px-4 py-3">
                                  <p className="text-[12px] font-medium text-navy-800">{question.label}</p>
                                  <p className="mt-2 text-[12px] leading-relaxed text-navy-600 whitespace-pre-wrap">
                                    {hasValue ? String(value) : 'No response provided.'}
                                  </p>
                                  {meta && (
                                    <p className="mt-1 text-[10px] text-navy-400">{meta.sectionTitle} • {meta.subsectionTitle}</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </section>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    );
  }

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
              <button
                onClick={() => {
                  window.localStorage.removeItem('assessmentOverviewDismissed');
                  setShowOverview(true);
                  window.scrollTo(0, 0);
                }}
                className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-md bg-white border border-navy-200 text-navy-700 hover:bg-navy-100 transition-colors shadow-sm"
              >
                Overview
              </button>
              {isReviewer && (
                <button
                  onClick={() => setReviewMode(true)}
                  className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-md bg-white border border-navy-200 text-navy-700 hover:bg-navy-100 transition-colors shadow-sm"
                >
                  Review Submissions
                </button>
              )}
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
          <div className="space-y-8">
            {currentSection.subsections.map((subsection, subIdx) => {
              let questionCounter = 0;
              for (let i = 0; i < subIdx; i++) {
                questionCounter += currentSection.subsections[i].questions.length;
              }

              return (
                <div key={subsection.id} className="space-y-4">
                  {/* Subsection Header */}
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-bold text-navy-700 tabular-nums shrink-0 mt-0.5">
                      {subIdx + 1}.
                    </span>
                    <h3 className="text-base font-bold text-navy-900 leading-snug">
                      {subsection.title}
                    </h3>
                  </div>

                  {/* Questions in this subsection */}
                  <div className="space-y-4 ml-6">
                    {subsection.questions.map((q, qIdx) => {
                      const globalQIdx = questionCounter + qIdx;
                      return (
                        <div key={q.id} className="bg-white rounded-xl border border-navy-100 shadow-sm overflow-hidden">
                          <div className="px-5 pt-5 pb-4">
                            <div className="flex items-start gap-3 mb-3">
                              <label className="block text-[15px] font-medium text-navy-800 leading-snug">
                                {q.label}
                              </label>
                            </div>

                            <div className="ml-0">
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
                          {isAnswered(responses[q.id]) && (
                            <div className="h-0.5 bg-teal-500" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
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
                onClick={submitAssessment}
                disabled={submitting || saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 transition-colors shadow-sm"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {submitting ? 'Submitting...' : 'Submit for Review'}
              </button>
            )}
          </div>
        </div>
      </main>

      {user && (
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(user.uid)}
          title="Click to copy full UID"
          className="fixed bottom-3 right-3 bg-navy-900 text-white text-[10px] px-3 py-1.5 rounded-md flex items-center gap-2 opacity-40 hover:opacity-100 transition-opacity"
        >
          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
          <span className="text-navy-300 break-all max-w-[220px] text-left">{user.uid}</span>
          <span className="text-navy-500">•</span>
          <span className="text-navy-400">{isReviewer ? 'Reviewer' : 'Standard'}</span>
        </button>
      )}
    </div>
  );
}
