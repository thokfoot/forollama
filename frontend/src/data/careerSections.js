/**
 * CAREER_SECTIONS — canonical list of life-stage sections used for video tagging.
 *
 * Every video in the database is tagged with timestamps (start/end in seconds)
 * for each of these sections. When a user clicks a node in the career tree, the
 * sidebar shows only the clips from that section across all relevant videos.
 *
 * The `sectionId` field on each careers.json node maps to the `id` here.
 * India-specific career tree (Class 10 → Career).
 */

// ─── Student path: After 10th ──────────────────────────────────────────────
const AFTER_10TH_SECTIONS = [
  { id: 's_science',    label: 'Science (PCM/PCB)',                 short: 'Science',      group: 'Student' },
  { id: 's_commerce',   label: 'Commerce',                         short: 'Commerce',     group: 'Student' },
  { id: 's_arts',       label: 'Humanities / Arts',                 short: 'Humanities',   group: 'Student' },
  { id: 's_diploma',    label: 'Diploma / ITI',                     short: 'Diploma/ITI',  group: 'Student' },
];

// ─── Student path: 12th & entrance exams ──────────────────────────────────
const ENTRANCE_SECTIONS = [
  { id: 's_cracked',      label: 'Cracked a Top Exam',              short: 'Cracked',      group: 'Student' },
  { id: 's_didnt_crack',  label: "Didn't Crack — Now What?",        short: "Didn't Crack", group: 'Student' },
  { id: 's_drop_year',    label: 'Drop Year',                       short: 'Drop Year',    group: 'Student' },
];

// ─── Student path: College & degree life ──────────────────────────────────
const COLLEGE_SECTIONS = [
  { id: 's_competitive',  label: 'Competitive Exams (UPSC/CAT/GATE)', short: 'Comp. Exams', group: 'Student' },
  { id: 's_campus_life',  label: 'Campus Reality',                  short: 'Campus',       group: 'Student' },
  { id: 's_internships',  label: 'Internships & Skills',            short: 'Internships',  group: 'Student' },
];

// ─── Student path: After degree ────────────────────────────────────────────
const AFTER_DEGREE_SECTIONS = [
  { id: 's_direct_job',   label: 'Went for Job',                    short: 'Job Route',    group: 'Student' },
  { id: 's_pg_studies',   label: 'Went for PG / MBA',               short: 'PG/MBA',       group: 'Student' },
  { id: 's_abroad',       label: 'Went Abroad',                     short: 'Abroad',       group: 'Student' },
];

// ─── Earning livelihood path: First job ───────────────────────────────────
const FIRST_JOB_SECTIONS = [
  { id: 'p_fj_corporate', label: 'First Job — Corporate / MNC',    short: 'Corporate',    group: 'Earning Livelihood' },
  { id: 'p_fj_startup',   label: 'First Job — Startup',            short: 'Startup',      group: 'Earning Livelihood' },
  { id: 'p_fj_govt',      label: 'First Job — Govt / PSU (Sarkari)',short: 'Govt/PSU',    group: 'Earning Livelihood' },
  { id: 'p_fj_family',    label: 'First Job — Family Business',    short: 'Family Biz',   group: 'Earning Livelihood' },
];

// ─── Earning livelihood path: 1–5 years ───────────────────────────────────
const EARLY_CAREER_SECTIONS = [
  { id: 'p_1_5_same',    label: '1–5 Yrs: Stayed Same Field',      short: 'Same Field',   group: 'Earning Livelihood' },
  { id: 'p_1_5_switch',  label: '1–5 Yrs: Switched Fields',        short: 'Switched',     group: 'Earning Livelihood' },
  { id: 'p_1_5_studies', label: '1–5 Yrs: Went Back to Study',     short: 'Back to Study',group: 'Earning Livelihood' },
];

// ─── Earning livelihood path: 5–10 years ──────────────────────────────────
const MID_CAREER_SECTIONS = [
  { id: 'p_5_10_senior',  label: '5–10 Yrs: Climbed the Ladder',   short: 'Ladder',       group: 'Earning Livelihood' },
  { id: 'p_5_10_venture', label: '5–10 Yrs: Started Own Venture',  short: 'Venture',      group: 'Earning Livelihood' },
  { id: 'p_5_10_abroad',  label: '5–10 Yrs: Moved Abroad',         short: 'Abroad',       group: 'Earning Livelihood' },
];

// ─── Earning livelihood path: Money & stability ────────────────────────────
const MONEY_SECTIONS = [
  { id: 'p_salary_journey', label: 'Salary Journey',                short: 'Salary',       group: 'Earning Livelihood' },
  { id: 'p_investments',    label: 'Savings & Investments',         short: 'Investments',  group: 'Earning Livelihood' },
  { id: 'p_work_life',      label: 'Work-Life Balance',             short: 'Work-Life',    group: 'Earning Livelihood' },
];

const STUDENT_SECTIONS = [
  ...AFTER_10TH_SECTIONS,
  ...ENTRANCE_SECTIONS,
  ...COLLEGE_SECTIONS,
  ...AFTER_DEGREE_SECTIONS,
];

const PROFESSIONAL_SECTIONS = [
  ...FIRST_JOB_SECTIONS,
  ...EARLY_CAREER_SECTIONS,
  ...MID_CAREER_SECTIONS,
  ...MONEY_SECTIONS,
];

export const CAREER_SECTIONS = [
  ...STUDENT_SECTIONS,
  ...PROFESSIONAL_SECTIONS,
];

/** Quick lookup: sectionId → section meta */
export const SECTION_MAP = Object.fromEntries(CAREER_SECTIONS.map(s => [s.id, s]));

/** Sections grouped by perspective for rendering group headers */
export const CAREER_SECTIONS_GROUPED = [
  { group: 'Student',      color: '#4FC3F7', sections: STUDENT_SECTIONS      },
  { group: 'Earning Livelihood', color: '#86efac', sections: PROFESSIONAL_SECTIONS },
];
