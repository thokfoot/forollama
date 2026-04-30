import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, MapPin, Compass, CheckCircle, X, ArrowRight, ArrowLeft } from 'lucide-react';
import Magnetic from '../Utils/Magnetic';
import EditorialSelect from '../UI/EditorialSelect';
import ABCDCard from '../UI/ABCDCard';

/* 6 cinematic chapters — 12-bit DNA identity scan */
const STUDENT_CHAPTERS = [
    { id: 1, question: 'Which stream after 10th?',           key: 'stream',               label: 'Identity' },
    { id: 2, question: 'How did you get into college?',      key: 'admission_mode',       label: 'Entry' },
    { id: 3, question: 'What were your marks like?',         key: 'academic_performance', label: 'Marks' },
    { id: 4, question: 'Where are you right now?',           key: 'current_stage',        label: 'Stage' },
    { id: 5, question: 'Are you looking to change path?',    key: 'uturn_intent',         label: 'Direction' },
    { id: 6, question: 'Ready to see your matches?',         key: null,                   label: 'Unlock' },
];

const LIVELIHOOD_CHAPTERS = [
    { id: 1, question: 'Which sector do you work in?',       key: 'industry',        label: 'Industry' },
    { id: 2, question: 'How long have you been working?',    key: 'experience_tier', label: 'Experience' },
    { id: 3, question: 'Your academic background?',          key: 'stream',          label: 'Foundation' },
    { id: 4, question: 'How did you enter college?',         key: 'admission_mode',  label: 'Entry' },
    { id: 5, question: 'Your current annual earnings?',      key: 'salary_range',    label: 'Earnings' },   // ← NEW: DNA Pos 6
    { id: 6, question: 'Ready to see your matches?',         key: null,              label: 'Unlock' },
];

const DRAFT_KEY   = 'cr_submit_draft';
const PROFILE_KEY = 'cr_saved_profile';
const LENS_KEY    = 'cr_scanner_lens';   // 'student' | 'livelihood'

/* Human-readable summary labels */
const STREAM_LABELS = { pcm: 'Science / PCM', commerce: 'Commerce & Finance', arts: 'Arts / Humanities', other: 'Vocational / Diploma' };
const STAGE_LABELS  = { student: 'Still studying', fresher: 'Fresh graduate', working: 'Working', gap: 'Career gap' };
const MARKS_LABELS  = { gold_medalist: '90%+', above_80: 'Above 80%', '60_80': '60–80%', below_60: 'Below 60%' };
const UTURN_LABELS  = { full_uturn: 'Full field change', pivot: 'Same field, new role', exploring: 'Exploring', happy: 'Going deeper' };
const INDUSTRY_LABELS = { corporate: 'Corporate / MNC', govt: 'Govt / PSU', startup: 'Startup / SME', freelance: 'Freelance / Own' };
const EXP_LABELS      = { '0_2': '0–2 years', '3_5': '3–5 years', '5_10': '5–10 years', '10plus': '10+ years' };
const SWITCH_LABELS   = { full_change: 'Full Career Change', pivot: 'New Role (same field)', exploring: 'Just Exploring', deep_dive: 'Going Deeper' };
const SALARY_LABELS   = { below_6: '< ₹6 LPA', '6_to_15': '₹6–15 LPA', '15_to_40': '₹15–40 LPA', above_40: '₹40 LPA+' };

const getRelativeTime = (timestamp) => {
    if (!timestamp) return 'recently';
    const diffMs = Date.now() - timestamp;
    const mins = Math.max(1, Math.round(diffMs / 60000));
    if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.round(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
};

const defaultFormData = {
    background: {
        education: '', stream: '', location: '', constraints: '',
        academic_performance: '', admission_mode: '', degree_status: '',
        current_stage: '', uturn_intent: '',
        // Livelihood-path specific fields
        industry: '', experience_tier: '', switch_intent: '',
        salary_range: '',   // DNA Pos 6 — ₹ bracket
    },
    timeline: [{ year: '', phase: '', event: '', type: 'job' }],
    salaries: [{ phase: '', range: '', optional: true }],
    failures: [''],
    lessons: [''],
    misunderstandings: { at18: '', at22: '', at25: '' },
};

const toNum = (value) => { const n = Number(value); return Number.isFinite(n) ? n : null; };

const deriveExperienceYears = (timeline = []) => {
    let totalYears = 0;
    timeline.forEach((entry) => {
        const yearText = String(entry?.year || '').trim();
        if (!yearText) return;
        const matches = yearText.match(/\d{4}/g);
        if (matches && matches.length >= 2) {
            const start = toNum(matches[0]);
            const end = toNum(matches[matches.length - 1]);
            if (start && end && end >= start) { totalYears += Math.max(0, end - start); return; }
        }
        if (matches && matches.length === 1) totalYears += 1;
    });
    return Math.max(0, Math.round(totalYears));
};
const deriveProfession = (timeline = [], fallback = '') => {
    const latestJob = [...timeline].reverse().find((e) => String(e?.type || '').toLowerCase() === 'job' && String(e?.phase || '').trim());
    if (latestJob) return String(latestJob.phase).trim();
    const latestPhase = [...timeline].reverse().find((e) => String(e?.phase || '').trim());
    if (latestPhase) return String(latestPhase.phase).trim();
    return String(fallback || '').trim();
};

export default function JourneyMapper({ onCompleteJourney = null, initialLens = null }) {
    // ── Lens (Student / Livelihood) ──────────────────────────────────────────
    const [lens, setLens] = useState(() => {
        // If parent passes a lens, use it directly and bypass stored lens
        if (initialLens) return initialLens;
        try { return localStorage.getItem(LENS_KEY) || null; } catch (_) { return null; }
    });

    const chooseLens = (chosen) => {
        setLens(chosen);
        setCurrentStep(1);
        try { localStorage.setItem(LENS_KEY, chosen); } catch (_) {}
    };

    // When initialLens prop changes (parent re-mounts with different lens), sync it
    useEffect(() => {
        if (!initialLens) return;
        if (initialLens !== lens) {
            setLens(initialLens);
            setCurrentStep(1);
            try { localStorage.setItem(LENS_KEY, initialLens); } catch (_) {}
        }
    }, [initialLens]); // eslint-disable-line react-hooks/exhaustive-deps

    // CHAPTERS depends on chosen lens
    const CHAPTERS = lens === 'livelihood' ? LIVELIHOOD_CHAPTERS : STUDENT_CHAPTERS;

    // ── Chapter options ─────────────────────────────────────────────────────
    const CHAPTER_OPTIONS = {
        // Student path
        stream: [
            { value: 'pcm',      label: 'Science',    icon: '⚗️', grade: 'A' },
            { value: 'commerce', label: 'Commerce',   icon: '📊', grade: 'B' },
            { value: 'arts',     label: 'Arts',       icon: '🎨', grade: 'C' },
            { value: 'other',    label: 'Vocational', icon: '⚙️', grade: 'D' },
        ],
        admission_mode: [
            { value: 'merit',               label: 'By Merit',       icon: '🥇', grade: 'A' },
            { value: 'entrance',            label: 'Entrance Exam',  icon: '📝', grade: 'B' },
            { value: 'donation_management', label: 'Mgmt Quota',     icon: '💳', grade: 'C' },
            { value: 'lateral',             label: 'Lateral / None', icon: '↪️', grade: 'D' },
        ],
        academic_performance: [
            { value: 'gold_medalist', label: 'Top Scorer',  icon: '⭐', grade: 'A' },
            { value: 'above_80',      label: 'Above 80%',   icon: '📈', grade: 'B' },
            { value: '60_80',         label: 'Average',     icon: '📉', grade: 'C' },
            { value: 'below_60',      label: 'Raw Reality', icon: '💡', grade: 'D' },
        ],
        current_stage: [
            { value: 'student', label: 'Studying',    icon: '🎓', grade: 'A' },
            { value: 'fresher', label: 'Fresh Grad',  icon: '🚀', grade: 'B' },
            { value: 'working', label: 'Have a Job',  icon: '💼', grade: 'C' },
            { value: 'gap',     label: 'Gap / Break', icon: '🔎', grade: 'D' },
        ],
        uturn_intent: [
            { value: 'full_uturn', label: 'Full Change',  icon: '🔁', grade: 'A' },
            { value: 'pivot',      label: 'New Role',     icon: '⤴️', grade: 'B' },
            { value: 'exploring',  label: 'Exploring',    icon: '🧭', grade: 'C' },
            { value: 'happy',      label: 'Going Deeper', icon: '✅', grade: 'D' },
        ],
        // Livelihood path
        industry: [
            { value: 'corporate', label: 'Corporate / MNC',  icon: '🏢', grade: 'A' },
            { value: 'govt',      label: 'Govt / PSU',       icon: '🏛️', grade: 'B' },
            { value: 'startup',   label: 'Startup / SME',    icon: '🚀', grade: 'C' },
            { value: 'freelance', label: 'Freelance / Own',  icon: '🧑‍💻', grade: 'D' },
        ],
        experience_tier: [
            { value: '0_2',    label: '0–2 years',   icon: '🌱', grade: 'A' },
            { value: '3_5',    label: '3–5 years',   icon: '📗', grade: 'B' },
            { value: '5_10',   label: '5–10 years',  icon: '📘', grade: 'C' },
            { value: '10_plus', label: '10+ years',   icon: '🏆', grade: 'D' },
        ],
        switch_intent: [
            { value: 'full_change', label: 'Full Career Change', icon: '🔄', grade: 'A' },
            { value: 'pivot',       label: 'New Role',           icon: '⤴️', grade: 'B' },
            { value: 'exploring',   label: 'Just Exploring',     icon: '🧭', grade: 'C' },
            { value: 'deep_dive',   label: 'Going Deeper',       icon: '🎯', grade: 'D' },
        ],
        // Salary range tiles — DNA Pos 6 (Livelihood only, ordinal scoring)
        salary_range: [
            { value: 'below_6',  label: '< ₹6 LPA',     icon: '🌱', sublabel: 'Just getting started',  grade: 'A' },
            { value: '6_to_15',  label: '₹6–15 LPA',   icon: '💼', sublabel: 'Mid-range earnings',    grade: 'B' },
            { value: '15_to_40', label: '₹15–40 LPA',  icon: '📈', sublabel: 'Senior / specialist',   grade: 'C' },
            { value: 'above_40', label: '₹40 LPA+',    icon: '🏆', sublabel: 'Leadership / rare band', grade: 'D' },
        ],
    };

    const [currentStep, setCurrentStep] = useState(1);
    const [submitted, setSubmitted]   = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [submittedBridge, setSubmittedBridge] = useState(null);
    const [draftRestored, setDraftRestored] = useState(false);
    const [draftSavedAt, setDraftSavedAt]   = useState(null);
    /* Electric Pulse state */
    const [pulseKey,  setPulseKey]  = useState(0);
    const [showPulse, setShowPulse] = useState(false);
    const [progFlash, setProgFlash] = useState(false);

    /*  " "  Saved profile (persists between visits)  " "  */
    const [savedProfile, setSavedProfile] = useState(() => {
        try { const p = localStorage.getItem(PROFILE_KEY); return p ? JSON.parse(p) : null; } catch { return null; }
    });
    const [showingWelcomeBack, setShowingWelcomeBack] = useState(() => {
        try {
            const raw = localStorage.getItem(PROFILE_KEY);
            if (!raw) return false;
            // If parent requested a specific lens, only show WelcomeBack if saved profile matches
            if (initialLens) {
                const saved = JSON.parse(raw);
                const savedLens = saved?.bridge?.lens || null;
                if (savedLens && savedLens !== initialLens) {
                    // Lens mismatch — silently drop old profile, start fresh
                    localStorage.removeItem(PROFILE_KEY);
                    localStorage.removeItem(DRAFT_KEY);
                    return false;
                }
            }
            return true;
        } catch { return false; }
    });

    const resetProfile = () => {
        localStorage.removeItem(PROFILE_KEY);
        localStorage.removeItem(DRAFT_KEY);
        localStorage.removeItem(LENS_KEY);   // return to Chapter Zero lens fork
        setSavedProfile(null);
        setShowingWelcomeBack(false);
        setSubmitted(false);
        setSubmittedBridge(null);
        setFormData(defaultFormData);
        setLens(null);
        setCurrentStep(1);
    };
    const [formData, setFormData] = useState(() => {
        try {
            const saved = localStorage.getItem(DRAFT_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed?.data) return parsed.data;
                return parsed;
            }
        } catch (e) { console.debug("[non-fatal]", e?.message); }
        return defaultFormData;
    });

    const saveTimer    = useRef(null);
    /* Swipe gesture refs */
    const touchStartX = useRef(null);
    const touchStartY = useRef(null);
    useEffect(() => {
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
            const { background, timeline, failures, lessons, misunderstandings } = formData;
            const hasContent =
                Object.values(background).some(v => v.trim?.() !== '') ||
                timeline.some(t => t.year || t.phase || t.event) ||
                failures.some(f => f.trim?.() !== '') ||
                lessons.some(l => l.trim?.() !== '') ||
                Object.values(misunderstandings).some(v => v.trim?.() !== '');
            if (hasContent) {
                const savedAt = Date.now();
                localStorage.setItem(DRAFT_KEY, JSON.stringify({ data: formData, savedAt }));
                setDraftSavedAt(savedAt);
            }
        }, 600);
        return () => clearTimeout(saveTimer.current);
    }, [formData]);

    /* Live "saved x ago" footer  " re-renders every 30s */
    const [, forceTick] = useState(0);
    useEffect(() => {
        const t = setInterval(() => forceTick(n => n + 1), 30000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(DRAFT_KEY);
            if (!saved) return;
            const parsed = JSON.parse(saved);
            setDraftSavedAt(parsed?.savedAt || null);
            setDraftRestored(true);
        } catch (e) { console.debug("[non-fatal]", e?.message); }
        const t = setTimeout(() => setDraftRestored(false), 3000);
        return () => clearTimeout(t);
    }, []);

    const updateBackground = (field, value) => {
        setFormData(prev => ({ ...prev, background: { ...prev.background, [field]: value } }));
    };
    const addTimelineEntry = () => {
        setFormData(prev => ({ ...prev, timeline: [...prev.timeline, { year: '', phase: '', event: '', type: 'job' }] }));
    };
    const deleteTimelineEntry = (index) => {
        setFormData(prev => ({ ...prev, timeline: prev.timeline.filter((_, i) => i !== index) }));
    };
    const updateTimeline = (index, field, value) => {
        setFormData(prev => ({ ...prev, timeline: prev.timeline.map((item, i) => i === index ? { ...item, [field]: value } : item) }));
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        setSubmitError('');
        try {
            // ── DNA Gap Fix: scanner collects current_stage + uturn_intent (Ch4/Ch5)
            // When timeline is empty (scanner path), derive Profession & Experience from those.
            const stage       = String(formData?.background?.current_stage || '').trim();
            const uturn       = String(formData?.background?.uturn_intent  || '').trim();
            const timelineFed = (formData?.timeline || []).some(t => t.year || t.phase || t.event);

            // Profession: infer from stage + uturn when no timeline
            const derivedProfession = timelineFed
                ? deriveProfession(formData.timeline, formData?.background?.education || '')
                : (() => {
                    if (stage === 'student')                           return 'student';  // backend maps → A default, fine
                    if (stage === 'fresher')                           return 'fresher';
                    if (stage === 'working' && uturn === 'full_uturn') return 'startup';   // career changer → C
                    if (stage === 'working' && uturn === 'pivot')      return 'startup';   // role pivot → C
                    if (stage === 'working')                           return 'corporate'; // employed → A
                    if (stage === 'gap')                               return 'freelance'; // break/gap → D
                    return '';
                })();

            // Experience: infer from stage when no timeline
            const derivedExperience = timelineFed
                ? deriveExperienceYears(formData.timeline)
                : (() => {
                    if (stage === 'student')  return 0;
                    if (stage === 'fresher')  return 0;
                    if (stage === 'working')  return 3;  // conservative: maps to B (3-5 yrs)
                    if (stage === 'gap')      return 1;  // gap year: maps to A (0-2 yrs)
                    return 0;
                })();

            // ── Livelihood path: map industry/experience_tier directly to DNA dimensions
            let finalProfession = derivedProfession;
            let finalExperience = derivedExperience;
            if (lens === 'livelihood') {
                const industry = String(formData?.background?.industry || '').trim();
                const expTier  = String(formData?.background?.experience_tier || '').trim();
                finalProfession = industry || derivedProfession;  // 'corporate'|'govt'|'startup'|'freelance'
                finalExperience = { '0_2': 0, '3_5': 3, '5_10': 7, '10plus': 12 }[expTier] ?? derivedExperience;
            }

            const normalizedBridge = {
                stream:               String(formData?.background?.stream || '').trim(),
                profession:           finalProfession,
                industry:             String(formData?.background?.industry || '').trim(),      // Raw industry key
                experience_tier:      String(formData?.background?.experience_tier || '').trim(), // Raw exp tier key
                experience:           finalExperience,
                academic_performance: String(formData?.background?.academic_performance || '').trim(),
                admission_mode:       String(formData?.background?.admission_mode || '').trim(),
                degree_status:        String(formData?.background?.degree_status || '').trim(),
                marks:                String(formData?.background?.academic_performance || '').trim(),
                entry:                String(formData?.background?.admission_mode || '').trim(),
                current_stage:        stage,
                uturn_intent:         uturn,
                switch_intent:        String(formData?.background?.switch_intent || '').trim(),
                salary_range:         String(formData?.background?.salary_range || '').trim(),  // DNA Pos 6
                lens:                 lens || 'student',
            };
            const payload = {
                ...formData,
                stream:               normalizedBridge.stream,
                profession:           normalizedBridge.profession,
                experience:           normalizedBridge.experience,
                lens:                 normalizedBridge.lens,
                salary_range:         normalizedBridge.salary_range,   // DNA Pos 6
                matchingBridge:       normalizedBridge,
                academic_performance: normalizedBridge.academic_performance,
                admission_mode:       normalizedBridge.admission_mode,
                degree_status:        normalizedBridge.degree_status,
                marks:                normalizedBridge.marks,
                entry:                normalizedBridge.entry,
            };
            const res = await fetch('/api/submit-journey', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                let message = 'Submit failed. Please try again.';
                try { const data = await res.json(); if (data?.error) message = data.error; } catch (e) { console.debug("[non-fatal]", e?.message); }
                throw new Error(message);
            }
            localStorage.removeItem(DRAFT_KEY);
            /*  " "  Persist profile so user doesn't re-fill on next visit  " "  */
            try {
                localStorage.setItem(PROFILE_KEY, JSON.stringify({
                    formData,
                    bridge: normalizedBridge,
                    savedAt: Date.now(),
                }));
                setSavedProfile({ formData, bridge: normalizedBridge, savedAt: Date.now() });
            } catch (e) { console.debug('[non-fatal]', e?.message); }
            setSubmittedBridge(normalizedBridge);
            setSubmitted(true);
        } catch (err) {
            setSubmitError(err?.message || 'Unable to submit right now. Please retry.');
        } finally {
            setSubmitting(false);
        }
    };

    const hasFormContent = useCallback(() => {
        const { background, timeline, failures, lessons } = formData;
        return Object.values(background).some(v => v?.trim?.() !== '') ||
            timeline.some(t => t.year || t.event) ||
            failures.some(f => f?.trim?.() !== '') ||
            lessons.some(l => l?.trim?.() !== '');
    }, [formData]);

    useEffect(() => {
        const handler = (e) => {
            if (!hasFormContent() || submitted) return;
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [hasFormContent, submitted]);

    const canSkipAhead = currentStep >= 2 && currentStep < CHAPTERS.length;
    const stream = formData.background.stream?.trim();
    const canContinueFromIdentity = !!stream;

    const SCAN_PHASES = [
        'Parsing 12-bit identity...',
        'Checking admission pathway...',
        'Mapping career stage...',
        'Building your Mirror Path...',
    ];
    const [isScanning, setIsScanning] = useState(false);
    const [scanPhase, setScanPhase] = useState(0);
    const autoAdvanceTo = (step) => setCurrentStep(step);
    const triggerLaserAndSubmit = async () => {
        setScanPhase(0);
        setIsScanning(true);
        /* Fire Electric Teal Pulse once — reward signal for the final commit */
        const pk = Date.now();
        setPulseKey(pk);
        setShowPulse(true);
        setTimeout(() => { setProgFlash(true);  }, 200);
        setTimeout(() => { setProgFlash(false); }, 480);
        setTimeout(() => { setShowPulse(false); }, 500);
        /* Cycle meaningful labels — 250 / 450 / 680 ms */
        const phaseTimers = [250, 450, 680].map((delay, i) =>
            setTimeout(() => setScanPhase(i + 1), delay)
        );
        /* Run API + min display time in parallel — no fake waiting */
        await Promise.all([
            new Promise(r => setTimeout(r, 820)),
            handleSubmit(),
        ]);
        phaseTimers.forEach(clearTimeout);
        setIsScanning(false);
    };

    // DNA Progress Bar Ã¢â¬" color shifts Red Ã¢â ' Orange Ã¢â ' Gold Ã¢â ' Blue as chapters progress
    const dnaBarProgress = ((currentStep - 1) / (CHAPTERS.length - 1)) * 100;
    const dnaBarColor = (() => {
        const t = (currentStep - 1) / (CHAPTERS.length - 1);
        if (t < 0.33) return `hsl(${0 + t * 30 / 0.33}, 80%, 58%)`;
        if (t < 0.66) return `hsl(${30 + (t - 0.33) * 30 / 0.33}, 78%, 55%)`;
        return `hsl(${60 + (t - 0.66) * 180 / 0.34}, 72%, 58%)`;
    })();
    const dnaLabel = `${currentStep * 2 - 1}-${currentStep * 2} / 12 bits`;

    /* \u2500\u2500\u2500 WELCOME BACK SCREEN \u2500\u2500\u2500 */
    if (showingWelcomeBack && savedProfile) {
        const bg   = savedProfile?.formData?.background || {};
        const chips = [
            { label: STREAM_LABELS[bg.stream]               || bg.stream,               icon: 'Ã°Å¸Å½"', show: !!bg.stream },
            { label: STAGE_LABELS[bg.current_stage]         || bg.current_stage,         icon: 'Ã°Å¸"Â', show: !!bg.current_stage },
            { label: MARKS_LABELS[bg.academic_performance]  || bg.academic_performance,  icon: 'Ã°Å¸"Å ', show: !!bg.academic_performance },
            { label: UTURN_LABELS[bg.uturn_intent]          || bg.uturn_intent,           icon: 'Ã°Å¸"â', show: !!bg.uturn_intent },
        ].filter(c => c.show);
        const savedDate = savedProfile?.savedAt
            ? new Date(savedProfile.savedAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })
            : null;

        return (
            <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto pw-page-bg">
                <div className="mx-auto flex w-full min-h-0 min-w-0 max-w-lg flex-1 flex-col items-center justify-center"
                    style={{ paddingLeft: 'var(--space-x-page)', paddingRight: 'var(--space-x-page)', paddingTop: 'var(--space-y-section)', paddingBottom: 'var(--space-y-section)' }}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                            width: '100%',
                            background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                            border: '1px solid rgba(255,255,255,0.10)',
                            borderRadius: 22,
                            backdropFilter: 'blur(20px)',
                            padding: 'clamp(1.4rem,4dvh,2.4rem) clamp(1.2rem,3vw,2rem)',
                            boxShadow: '0 30px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)',
                        }}
                    >
                        {/* Header */}
                        <div style={{ textAlign: 'center', marginBottom: 28 }}>
                            <motion.div
                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 22, delay: 0.15 }}
                                style={{
                                    width: 52, height: 52, borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #134e4a, #0d9488)',
                                    border: '2px solid #2DD4BF',
                                    boxShadow: '0 0 28px rgba(45,212,191,0.45)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto 16px',
                                }}
                            >
                                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                                    <polyline points="4,11 9,16 18,6" stroke="#2DD4BF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </motion.div>
                            <p style={{ fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#2DD4BF', fontWeight: 700, marginBottom: 8 }}>
                                Identity saved on this device
                            </p>
                            <h2 className="font-display text-white font-semibold"
                                style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                                Welcome back Ã°Å¸ââ¹
                            </h2>
                            {savedDate && (
                                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>
                                    Profile set on {savedDate}
                                </p>
                            )}
                        </div>

                        {/* Choices chips */}
                        {chips.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 28 }}>
                                {chips.map((c, i) => (
                                    <motion.span key={i}
                                        initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.2 + i * 0.07, type: 'spring', stiffness: 380, damping: 24 }}
                                        style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 6,
                                            padding: '6px 12px', borderRadius: 99,
                                            background: 'rgba(45,212,191,0.08)',
                                            border: '1px solid rgba(45,212,191,0.20)',
                                            fontSize: 12, color: '#99F6E4', fontWeight: 500,
                                        }}>
                                        <span>{c.icon}</span> {c.label}
                                    </motion.span>
                                ))}
                            </div>
                        )}

                        {/* CTA */}
                        <Magnetic className="block w-full">
                            <button
                                type="button"
                                onClick={() => {
                                    if (savedProfile?.bridge && typeof onCompleteJourney === 'function') {
                                        onCompleteJourney(savedProfile.bridge);
                                    } else {
                                        setSubmittedBridge(savedProfile?.bridge || null);
                                        setSubmitted(true);
                                    }
                                }}
                                style={{
                                    width: '100%', padding: '14px 20px', borderRadius: 14,
                                    background: 'linear-gradient(135deg, #0d9488, #134e4a)',
                                    border: '1.5px solid #2DD4BF',
                                    color: '#fff', fontWeight: 700,
                                    fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase',
                                    cursor: 'pointer',
                                    boxShadow: '0 0 24px rgba(45,212,191,0.35)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    marginBottom: 14,
                                }}
                            >
                                See my future possibilities <ArrowRight size={15} />
                            </button>
                        </Magnetic>

                        {/* Re-scan option */}
                        <button
                            type="button"
                            onClick={() => setShowingWelcomeBack(false)}
                            style={{
                                width: '100%', padding: '10px 20px', borderRadius: 12,
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                color: 'rgba(255,255,255,0.45)', fontSize: 12,
                                cursor: 'pointer', letterSpacing: '0.05em',
                                marginBottom: 24,
                            }}
                        >
                            Update my answers
                        </button>

                        {/* Reset link */}
                        <div style={{ textAlign: 'center' }}>
                            <button
                                type="button"
                                onClick={resetProfile}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    fontSize: 11, color: 'rgba(255,255,255,0.25)',
                                    letterSpacing: '0.08em', textDecoration: 'underline',
                                    textUnderlineOffset: 3,
                                }}
                            >
                                Reset &amp; start fresh
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>
        );
    }

    if (submitted) {

        return (
            <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto pw-page-bg">
                <div className="mx-auto flex w-full min-h-0 min-w-0 max-w-3xl flex-1 flex-col items-center justify-center" style={{ paddingLeft: 'var(--space-x-page)', paddingRight: 'var(--space-x-page)', paddingTop: 'var(--space-y-section)', paddingBottom: 'var(--space-y-section)' }}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.94, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="w-full max-w-md text-center pw-panel-archival"
                        style={{ padding: 'var(--pad-card-y) var(--pad-card-x)' }}
                    >
                        <div className="mx-auto flex items-center justify-center rounded-full border border-[#A89060]/35 bg-[#A89060]/10 shadow-glow-gold" style={{ width: 'clamp(48px, 8dvh, 64px)', height: 'clamp(48px, 8dvh, 64px)', marginBottom: 'var(--space-y-block)' }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#CDB88A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        </div>
                        <span className="pw-eyebrow text-[#CDB88A]" style={{ fontSize: 'clamp(9.5px, 0.9vw, 10.5px)', letterSpacing: '0.32em' }}>Identity scan complete</span>
                        <h2 className="font-display font-semibold text-white tracking-tightest" style={{ fontSize: 'clamp(1.15rem, min(2.4vw, 3.2dvh), 1.85rem)', lineHeight: 1.1, marginTop: 'var(--space-y-tight)', marginBottom: 'var(--space-y-tight)' }}>
                            Your mirror map is ready
                        </h2>
                        <p className="text-white/65" style={{ fontSize: 'clamp(0.78rem, min(1vw, 1.4dvh), 0.95rem)', lineHeight: 1.5, marginBottom: 'var(--space-y-section)' }}>
                            We matched your background to real career journeys.<br />
                            <span className="text-white/40">Open your future map next.</span>
                        </p>
                        {typeof onCompleteJourney === 'function' ? (
                            <Magnetic className="inline-block">
                                <button
                                    type="button"
                                    onClick={() => onCompleteJourney(submittedBridge)}
                                    className="pw-btn-primary inline-flex items-center justify-center gap-2 uppercase tracking-[0.18em]"
                                    style={{ padding: 'clamp(0.7rem, 1.6dvh, 1rem) clamp(1.4rem, 3vw, 2rem)', fontSize: 'clamp(11px, 1vw, 12.5px)' }}
                                >
                                    See my future possibilities <ArrowRight size={14} />
                                </button>
                            </Magnetic>
                        ) : (
                            <Magnetic className="inline-block">
                                <Link
                                    to="/"
                                    className="pw-btn-primary inline-flex items-center justify-center gap-2 uppercase tracking-[0.18em]"
                                    style={{ padding: 'clamp(0.7rem, 1.6dvh, 1rem) clamp(1.4rem, 3vw, 2rem)', fontSize: 'clamp(11px, 1vw, 12.5px)' }}
                                >
                                    Open career map <ArrowRight size={14} />
                                </Link>
                            </Magnetic>
                        )}
                    </motion.div>
                </div>
            </div>
        );
    }

    // ── Lens Selection Screen (Chapter Zero) ────────────────────────────────
    if (!lens) {
        return (
            <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto pw-page-bg" style={{ alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
                <motion.div
                    initial={{ opacity: 0, y: 28 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                    style={{ width: '100%', maxWidth: 480, padding: 'clamp(24px,5dvh,48px) clamp(20px,5vw,40px)' }}
                >
                    <p style={{ fontSize: 10, letterSpacing: '0.32em', textTransform: 'uppercase', color: '#2DD4BF', fontWeight: 700, textAlign: 'center', marginBottom: 12 }}>Pick Your Lens</p>
                    <h2 style={{ fontSize: 'clamp(1.5rem,4vw,2.5rem)', fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', textAlign: 'center', marginBottom: 8, lineHeight: 1.1 }}>
                        Who are you today?
                    </h2>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginBottom: 36, lineHeight: 1.55 }}>
                        We’ll personalise your 6-question scan accordingly.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {/* Student Card */}
                        <motion.button
                            whileHover={{ y: -3, boxShadow: '0 0 30px rgba(45,212,191,0.35)' }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => chooseLens('student')}
                            style={{
                                width: '100%', padding: '20px 24px', borderRadius: 18, cursor: 'pointer', textAlign: 'left',
                                background: 'linear-gradient(135deg, rgba(45,212,191,0.10) 0%, rgba(45,212,191,0.04) 100%)',
                                border: '1.5px solid rgba(45,212,191,0.30)',
                                transition: 'all 0.22s ease',
                            }}
                        >
                            <p style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#2DD4BF', fontWeight: 700, marginBottom: 6 }}>School to first decisions</p>
                            <p style={{ fontSize: 'clamp(1.1rem,2.5vw,1.4rem)', fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>Student / Fresh Graduate</p>
                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0 }}>Streams, college choices, marks &amp; early direction.</p>
                        </motion.button>
                        {/* Livelihood Card */}
                        <motion.button
                            whileHover={{ y: -3, boxShadow: '0 0 30px rgba(205,184,138,0.30)' }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => chooseLens('livelihood')}
                            style={{
                                width: '100%', padding: '20px 24px', borderRadius: 18, cursor: 'pointer', textAlign: 'left',
                                background: 'linear-gradient(135deg, rgba(205,184,138,0.10) 0%, rgba(205,184,138,0.04) 100%)',
                                border: '1.5px solid rgba(205,184,138,0.30)',
                                transition: 'all 0.22s ease',
                            }}
                        >
                            <p style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#CDB88A', fontWeight: 700, marginBottom: 6 }}>Job-holders, freelancers &amp; business owners</p>
                            <p style={{ fontSize: 'clamp(1.1rem,2.5vw,1.4rem)', fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>Earning a Livelihood</p>
                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0 }}>Your industry, experience level &amp; switch intent matter most.</p>
                        </motion.button>
                    </div>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 24, letterSpacing: '0.06em' }}>
                        You can always re-scan to change your lens.
                    </p>
                </motion.div>
            </div>
        );
    }



    const totalSteps = CHAPTERS.length;
    const currentChapter = CHAPTERS[currentStep - 1] || CHAPTERS[0];
    const currentOptions = currentChapter.key ? CHAPTER_OPTIONS[currentChapter.key] : null;
    const currentVal = currentChapter.key ? formData.background[currentChapter.key] : null;
    const isUnlock = currentStep === totalSteps;
    const isLastData = currentStep === totalSteps - 1;

    const handleIconChange = (val) => {
        if (!currentChapter.key) return;
        updateBackground(currentChapter.key, val);
        /* Pulse removed from tile selection — fires only on Ch6 submit */
    };

    const handleIconAutoAdvance = () => {
        if (currentStep < totalSteps) setCurrentStep(prev => prev + 1);
    };

    /* Mobile swipe: right=back, left=next (guard: no accidental submit on last step) */
    const handleTouchStart = (e) => {
        if (!e.touches[0]) return;
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    };
    const handleTouchEnd = (e) => {
        if (touchStartX.current === null || !e.changedTouches[0]) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        const dy = e.changedTouches[0].clientY - touchStartY.current;
        touchStartX.current = null;
        touchStartY.current = null;
        if (Math.abs(dx) < 55 || Math.abs(dx) <= Math.abs(dy)) return; // ignore vertical
        if (dx > 0) {
            /* Right swipe → Back */
            if (currentStep > 1) setCurrentStep(s => s - 1);
        } else {
            /* Left swipe → Next (block accidental swipe-to-submit on unlock chapter) */
            if (currentStep < totalSteps - 1) setCurrentStep(s => s + 1);
        }
    };

    const progressPct = ((currentStep - 1) / (totalSteps - 1)) * 100;

    return (
        <div
            className="scanner-shell pw-page-bg"
            style={{ position: 'relative' }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >

            {/* Draft saved pill */}
            <div className="fixed bottom-3 left-1/2 z-40 -translate-x-1/2 px-3 py-1 rounded-full bg-black/45 backdrop-blur text-[10.5px] text-white/40 tracking-[0.06em] pointer-events-none" data-collapse-on-short="true" data-mute="true">
                Draft saved {draftSavedAt ? ('/' + getRelativeTime(draftSavedAt)) : ''}
            </div>

            {/* ── Electric Teal Pulse Beam ── fires when tile selected ── */}
            <AnimatePresence>
                {showPulse && (
                    <motion.div
                        key={pulseKey}
                        aria-hidden
                        initial={{ scaleY: 0, opacity: 0 }}
                        animate={{ scaleY: 1, opacity: [0, 1, 0.88, 0] }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.44, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                            position: 'absolute',
                            left: '50%',
                            bottom: '30%',
                            height: '54%',
                            width: 3,
                            transformOrigin: 'bottom center',
                            transform: 'translateX(-50%)',
                            background: 'linear-gradient(to top, rgba(45,212,191,0) 0%, rgba(45,212,191,0.85) 22%, rgba(180,255,250,0.98) 60%, rgba(45,212,191,0) 100%)',
                            borderRadius: 99,
                            boxShadow: '0 0 12px 4px rgba(45,212,191,0.65), 0 0 28px 8px rgba(45,212,191,0.25)',
                            pointerEvents: 'none',
                            zIndex: 50,
                        }}
                    />
                )}
            </AnimatePresence>

            {/* TOP: Minimal Progress Strip */}
            <div style={{
                flexShrink: 0,
                padding: 'clamp(10px, 1.8dvh, 18px) clamp(16px, 4vw, 40px) 0',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
            }}>
                {/* Chapter label */}
                <span style={{
                    fontSize: 11, letterSpacing: '0.20em', textTransform: 'uppercase',
                    color: '#2DD4BF', fontWeight: 700, whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: 6,
                }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2DD4BF', boxShadow: '0 0 10px #2DD4BF', display: 'inline-block', flexShrink: 0 }} />
                    {currentChapter.label}
                </span>

                {/* Thin progress bar */}
                <div style={{ flex: 1, height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.09)', overflow: 'hidden', position: 'relative' }}>
                    <motion.div
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                            height: '100%', borderRadius: 99,
                            background: 'linear-gradient(90deg, #2DD4BF, #818CF8)',
                            boxShadow: progFlash
                                ? '0 0 28px rgba(45,212,191,0.98), 0 0 60px rgba(45,212,191,0.45)'
                                : '0 0 12px rgba(45,212,191,0.5)',
                            transition: 'box-shadow 0.22s ease',
                            position: 'relative',
                        }}
                    >
                        <motion.span
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ duration: 1.8, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
                            style={{ position: 'absolute', top: 0, bottom: 0, width: '40%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)', borderRadius: 99 }}
                        />
                    </motion.div>
                </div>

                {/* step counter */}
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 700, whiteSpace: 'nowrap', letterSpacing: '0.05em' }}>
                    {currentStep} / {totalSteps}
                </span>
            </div>

            {/*  " "  MAIN: Cinematic Question + Icon Tiles  " "  */}
            <div style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'clamp(6px, 1dvh, 16px) clamp(16px, 5vw, 48px)',
                gap: 'clamp(8px, 1.6dvh, 20px)',
            }}>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, y: 22, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -18, scale: 0.98 }}
                        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                        style={{ width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(10px, 2dvh, 24px)' }}
                    >
                        {/*  " "  CINEMATIC QUESTION  " "  */}
                        <h2
                            style={{
                                fontSize: 'clamp(1.45rem, min(4.8vw, 6dvh), 3rem)',
                                fontWeight: 800,
                                lineHeight: 1.08,
                                letterSpacing: '-0.03em',
                                textAlign: 'center',
                                color: '#fff',
                                textShadow: '0 0 60px rgba(45,212,191,0.15)',
                                margin: 0,
                            }}
                        >
                            {currentChapter.question}
                        </h2>

                        {/*  " "  ICON TILES or UNLOCK PANEL  " "  */}
                        {!isUnlock && currentOptions ? (
                            <div style={{ width: '100%' }}>
                                <ABCDCard
                                    value={currentVal || ''}
                                    onChange={handleIconChange}
                                    onAutoAdvance={handleIconAutoAdvance}
                                    options={currentOptions}
                                />
                                {/* Hint if nothing selected */}
                                {!currentVal && (
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.8 }}
                                        style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}
                                    >
                                        Tap to select / auto-continues
                                    </motion.p>
                                )}
                            </div>
                        ) : isUnlock ? (
                            /* UNLOCK PANEL */
                            <motion.div
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.45 }}
                                style={{
                                    width: '100%',
                                    background: 'linear-gradient(165deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    borderTop: '1px solid rgba(205,184,138,0.28)',
                                    borderRadius: 20,
                                    padding: 'clamp(16px, 3dvh, 28px) clamp(16px, 3vw, 28px)',
                                    backdropFilter: 'blur(20px)',
                                }}
                            >
                                {submitError && (
                                    <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(208,122,122,0.3)', background: 'rgba(208,122,122,0.08)' }} role="alert">
                                        <p style={{ fontSize: 13, color: '#D07A7A' }}>{submitError}</p>
                                    </div>
                                )}
                                <p style={{ fontSize: 'clamp(0.8rem, 1vw, 0.9rem)', color: 'rgba(255,255,255,0.65)', lineHeight: 1.55, marginBottom: 14 }}>After scanning you will get:</p>
                                <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                                    {[
                                        'Video clips from professionals with a similar background',
                                        'Your "mirror path" lit up on the career tree',
                                        'Anonymous match to improve public data for everyone',
                                    ].map((item, i) => (
                                        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 'clamp(0.78rem, 1vw, 0.88rem)', color: 'rgba(255,255,255,0.78)' }}>
                                            <span style={{ color: '#CDB88A', marginTop: 2, flexShrink: 0 }}>{'>'}</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                                <p style={{ fontSize: 'clamp(0.72rem, 0.9vw, 0.82rem)', color: 'rgba(205,184,138,0.75)', lineHeight: 1.5 }}>
                                    This exists so <strong style={{ color: '#E07A5F' }}>you</strong> see your possibilities - not so others can extract your story.
                                </p>
                            </motion.div>
                        ) : null}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/*  " "  BOTTOM: Minimal Nav  " "  */}
            <div style={{
                flexShrink: 0,
                padding: 'clamp(10px, 1.6dvh, 18px) clamp(16px, 4vw, 40px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid rgba(255,255,255,0.06)',
            }}>
                {/* Back */}
                <button
                    onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                    disabled={currentStep === 1}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: 'clamp(7px, 1.2dvh, 11px) clamp(10px, 1.5vw, 16px)',
                        borderRadius: 12,
                        border: '1px solid rgba(255,255,255,0.10)',
                        background: 'rgba(255,255,255,0.04)',
                        color: 'rgba(255,255,255,0.50)',
                        fontSize: 'clamp(10.5px, 0.9vw, 12.5px)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        opacity: currentStep === 1 ? 0.3 : 1,
                        transition: 'opacity 0.2s, color 0.2s',
                    }}
                >
                    <ArrowLeft size={13} /> Back
                </button>

                {/* Skip / Continue / Scan */}
                {isUnlock ? (
                    <Magnetic className="inline-block">
                        <button
                            onClick={triggerLaserAndSubmit}
                            disabled={submitting || isScanning}
                            data-testid="journey-mapper-submit-button"
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                padding: 'clamp(8px, 1.4dvh, 13px) clamp(16px, 3vw, 28px)',
                                borderRadius: 14,
                                border: '1.5px solid rgba(45,212,191,0.5)',
                                background: isScanning
                                    ? 'linear-gradient(135deg,#0d9488,#0f766e)'
                                    : 'linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #134e4a 100%)',
                                color: '#fff',
                                fontSize: 'clamp(10.5px, 0.95vw, 12.5px)',
                                fontWeight: 700,
                                letterSpacing: '0.14em',
                                textTransform: 'uppercase',
                                boxShadow: '0 0 24px rgba(45,212,191,0.3), inset 0 1px 0 rgba(255,255,255,0.12)',
                                cursor: submitting || isScanning ? 'not-allowed' : 'pointer',
                                opacity: submitting || isScanning ? 0.7 : 1,
                            }}
                        >
                            {(submitting || isScanning) && (
                                <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#fff', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                            )}
                            {isScanning ? 'Scanning DNA...' : submitting ? 'Processing...' : 'See my future possibilities'}
                            {!submitting && !isScanning && <ArrowRight size={13} />}
                        </button>
                    </Magnetic>
                ) : (
                    <motion.button
                        type="button"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setCurrentStep(prev => Math.min(totalSteps, prev + 1))}
                        disabled={currentStep === 1 && !formData.background.stream}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 7,
                            padding: 'clamp(7px, 1.2dvh, 11px) clamp(14px, 2.5vw, 22px)',
                            borderRadius: 12,
                            border: '1.5px solid rgba(45,212,191,0.40)',
                            background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 55%, #134e4a 100%)',
                            color: '#fff',
                            fontSize: 'clamp(10.5px, 0.95vw, 12px)',
                            fontWeight: 700,
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            boxShadow: '0 0 18px rgba(45,212,191,0.22), inset 0 1px 0 rgba(255,255,255,0.10)',
                            cursor: 'pointer',
                            opacity: currentStep === 1 && !formData.background.stream ? 0.4 : 1,
                        }}
                    >
                        Continue <ArrowRight size={12} />
                    </motion.button>
                )}
            </div>

            {/*  " "  LASER SCAN OVERLAY  " "  */}
            <AnimatePresence>
                {isScanning && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(2,6,10,0.93)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <motion.div
                            initial={{ top: 0 }} animate={{ top: '100%' }}
                            transition={{ duration: 1.5, ease: 'linear' }}
                            style={{ position: 'absolute', left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #22c55e, #4ade80, #22c55e, transparent)', boxShadow: '0 0 20px 5px rgba(74,222,128,0.7)' }}
                        />
                        <div style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
                            <motion.p
                                animate={{ opacity: [0.55, 1, 0.55] }}
                                transition={{ duration: 1, repeat: Infinity }}
                                style={{ fontSize: 10, letterSpacing: '0.38em', color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', marginBottom: 14 }}
                            >
                                DNA MATCH IN PROGRESS
                            </motion.p>
                            <AnimatePresence mode="wait">
                                <motion.p
                                    key={scanPhase}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={{ duration: 0.28 }}
                                    style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}
                                >
                                    {SCAN_PHASES[Math.min(scanPhase, SCAN_PHASES.length - 1)]}
                                </motion.p>
                            </AnimatePresence>
                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginTop: 10, letterSpacing: '0.04em' }}>
                                Weighted 12-bit &middot; Profession 40% &middot; Stream 20% &middot; Admission 20%
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
