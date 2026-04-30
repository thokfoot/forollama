/**
 * Career → videos mapping for sidebar. Add your YouTube video IDs and tag by nodeId.
 * When user selects a node or filters, only videos for that node (or path) are shown.
 */
import careers from './careers.json';

// Flatten tree to collect all node ids
export function getAllCareerNodeIds() {
  const ids = [];
  function walk(n) {
    if (n?.id) ids.push(n.id);
    if (n?.children) n.children.forEach(walk);
  }
  walk(careers);
  return ids;
}

// Flatten to { id, label } for search/filter options
export function getCareerOptions() {
  const out = [];
  function walk(n) {
    if (n?.id) out.push({ id: n.id, label: n.label || n.id });
    if (n?.children) n.children.forEach(walk);
  }
  walk(careers);
  return out;
}

// Build { labelMap, idMap } — id → array of ancestor labels / ids (excluding root "start")
export function getCareerPathMap() {
  const labelMap = {};
  const idMap = {};
  function walk(n, crumbLabels, crumbIds) {
    if (n?.id) {
      labelMap[n.id] = crumbLabels.slice();
      idMap[n.id] = n.id === 'start' ? [] : crumbIds.concat(n.id);
    }
    if (n?.children) {
      const nextLabels = n?.id !== 'start' && n?.label ? crumbLabels.concat(n.label) : crumbLabels;
      const nextIds = n?.id !== 'start' ? crumbIds.concat(n.id) : crumbIds;
      n.children.forEach(c => walk(c, nextLabels, nextIds));
    }
  }
  walk(careers, [], []);
  return { labelMap, idMap };
}

// Placeholder YouTube IDs per node - replace with real uploaded video IDs
// Each node has DISTINCT IDs so sidebar thumbnails change as user navigates
const VIDEOS_BY_NODE = {
  start: [
    { youtubeId: "iG9CE55wbtY", title: "Career Paths in India - Overview" },
    { youtubeId: "qp0HIF3SfI4", title: "How to Live Your Dreams" },
    { youtubeId: "c0KYU2j0TM4", title: "Choosing Your Future" },
  ],
  student: [
    { youtubeId: "iG9CE55wbtY", title: "The Student Journey Explained" },
    { youtubeId: "8CrOL-ydFMI", title: "Study Smarter Not Harder" },
    { youtubeId: "c0KYU2j0TM4", title: "Roadmap from School to Career" },
  ],
  s_after10th: [
    { youtubeId: "iG9CE55wbtY", title: "After 10th - Your Options Explained" },
    { youtubeId: "v5FL9VTBZzQ", title: "Science vs Commerce vs Arts" },
    { youtubeId: "H14bBuluwB8", title: "Choosing the Right Stream" },
    { youtubeId: "8CrOL-ydFMI", title: "10th Results - Next Steps" },
  ],
  s_science: [
    { youtubeId: "v5FL9VTBZzQ", title: "Science Stream Reality Check" },
    { youtubeId: "wnHW6o8WMas", title: "JEE vs NEET - Which Path?" },
    { youtubeId: "H14bBuluwB8", title: "PCM vs PCB - Detailed Guide" },
    { youtubeId: "Lp7E973zozc", title: "Engineering vs Medical - Long Term" },
  ],
  s_commerce: [
    { youtubeId: "8S0FDjFBj8o", title: "Commerce Stream - CA, CS, MBA" },
    { youtubeId: "uhr0EkI4-b8", title: "B.Com vs BBA - Which is Better?" },
    { youtubeId: "Cpc-t-Uwv1I", title: "CA Journey - Time, Effort, Cost" },
    { youtubeId: "ACgpOLnQs_E", title: "Finance Careers Roadmap" },
  ],
  s_arts: [
    { youtubeId: "8MOzsTuqe2Q", title: "Arts and Humanities - The Truth" },
    { youtubeId: "RcGyVTAoXEU", title: "Careers in Humanities" },
    { youtubeId: "iG9CE55wbtY", title: "Law, UPSC, Design Paths" },
    { youtubeId: "c0KYU2j0TM4", title: "Creative Fields - Real Income Data" },
  ],
  s_diploma: [
    { youtubeId: "Cpc-t-Uwv1I", title: "Diploma / Polytechnic - Is It Worth It?" },
    { youtubeId: "H14bBuluwB8", title: "ITI Trades and Job Market" },
    { youtubeId: "Lp7E973zozc", title: "Skill Certification vs Degree" },
  ],
  s_cracked: [
    { youtubeId: "wnHW6o8WMas", title: "What Happens After Cracking JEE/NEET" },
    { youtubeId: "8MOzsTuqe2Q", title: "IIT / AIIMS First Year Reality" },
    { youtubeId: "v5FL9VTBZzQ", title: "Top College - Does It Guarantee Success?" },
  ],
  s_didnt_crack: [
    { youtubeId: "qp0HIF3SfI4", title: "Didn't Crack Top Exam - Now What?" },
    { youtubeId: "RcGyVTAoXEU", title: "State & Private College Success Stories" },
    { youtubeId: "c0KYU2j0TM4", title: "Plan B That Became Plan A" },
  ],
  s_drop_year: [
    { youtubeId: "qp0HIF3SfI4", title: "Drop Year - Should You Take It?" },
    { youtubeId: "RcGyVTAoXEU", title: "Managing Drop Year Mentally" },
    { youtubeId: "c0KYU2j0TM4", title: "Success After a Gap Year" },
  ],
  s_competitive: [
    { youtubeId: "wnHW6o8WMas", title: "UPSC / CAT / GATE - All Options" },
    { youtubeId: "8MOzsTuqe2Q", title: "Government Exams - Complete Guide" },
    { youtubeId: "RcGyVTAoXEU", title: "Which Exam Suits You?" },
    { youtubeId: "v5FL9VTBZzQ", title: "Competitive Exams After Graduation" },
  ],
  s_campus_life: [
    { youtubeId: "8CrOL-ydFMI", title: "Making the Most of College Years" },
    { youtubeId: "uhr0EkI4-b8", title: "Tier 1 vs Tier 2 vs Tier 3 College" },
    { youtubeId: "8S0FDjFBj8o", title: "CGPA Really Matters - Reality Check" },
  ],
  s_internships: [
    { youtubeId: "ACgpOLnQs_E", title: "Internships and Placements Guide" },
    { youtubeId: "8CrOL-ydFMI", title: "Building Skills Before Graduation" },
    { youtubeId: "uhr0EkI4-b8", title: "Real-World Exposure During College" },
  ],
  s_direct_job: [
    { youtubeId: "8CrOL-ydFMI", title: "Campus Placements - Inside Story" },
    { youtubeId: "uhr0EkI4-b8", title: "First Job After B.Tech / BBA / B.Com" },
    { youtubeId: "ACgpOLnQs_E", title: "Off-Campus Job Hunt Guide" },
    { youtubeId: "Lp7E973zozc", title: "Degree to Earning - What to Expect" },
  ],
  s_pg_studies: [
    { youtubeId: "Lp7E973zozc", title: "Masters in India vs Abroad" },
    { youtubeId: "uhr0EkI4-b8", title: "MS in USA - Cost, ROI, Visa" },
    { youtubeId: "ACgpOLnQs_E", title: "GRE / GMAT Prep Timeline" },
    { youtubeId: "Cpc-t-Uwv1I", title: "Scholarship for Higher Studies" },
  ],
  s_abroad: [
    { youtubeId: "Lp7E973zozc", title: "Going Abroad After Degree - Full Guide" },
    { youtubeId: "uhr0EkI4-b8", title: "MS / MBA Abroad - Real Costs" },
    { youtubeId: "Cpc-t-Uwv1I", title: "Visa, Settling Down, Coming Back" },
  ],
  professional: [
    { youtubeId: "dQw4w9WgXcQ", title: "Earning Livelihood - What No One Tells You" },
    { youtubeId: "kJQP7kiw5Fk", title: "Building a Career in Corporate India" },
    { youtubeId: "JGwWNGJdvx8", title: "Salary Negotiations That Work" },
    { youtubeId: "fJ9rUzIMcZQ", title: "Career Growth Strategies" },
  ],
  p_firstjob: [
    { youtubeId: "kJQP7kiw5Fk", title: "First Job Reality - Expectations vs Truth" },
    { youtubeId: "JGwWNGJdvx8", title: "Surviving Your First Week at Work" },
    { youtubeId: "fJ9rUzIMcZQ", title: "What Skills Matter in a First Job" },
    { youtubeId: "RgKAFK5djSk", title: "Salary in First Job - Negotiation Tips" },
  ],
  p_fj_corporate: [
    { youtubeId: "JGwWNGJdvx8", title: "MNC vs Indian Corporate - Real Differences" },
    { youtubeId: "kJQP7kiw5Fk", title: "Appraisals and Office Politics Decoded" },
    { youtubeId: "OPf0YbXqDm0", title: "Corporate Ladder - How Fast Can You Climb?" },
    { youtubeId: "fJ9rUzIMcZQ", title: "Work-Life Balance in Corporate" },
  ],
  p_fj_startup: [
    { youtubeId: "fJ9rUzIMcZQ", title: "Startup Job - Equity, Chaos and Learning" },
    { youtubeId: "RgKAFK5djSk", title: "Risk vs Reward in Startup Career" },
    { youtubeId: "kJQP7kiw5Fk", title: "Series A vs Series B Startup Salary" },
    { youtubeId: "OPf0YbXqDm0", title: "Joining a Startup - What to Check" },
  ],
  p_fj_govt: [
    { youtubeId: "RgKAFK5djSk", title: "Government Job Reality in 2025" },
    { youtubeId: "OPf0YbXqDm0", title: "PSU Life - Salary, Transfer and Perks" },
    { youtubeId: "Ct6BUPvE2sM", title: "SSC / Banking / Railways Paths" },
    { youtubeId: "fJ9rUzIMcZQ", title: "Sarkari Naukri - Stability or Stagnation?" },
  ],
  p_fj_family: [
    { youtubeId: "OPf0YbXqDm0", title: "Joining Family Business - Smart Decisions" },
    { youtubeId: "Ct6BUPvE2sM", title: "Family Business vs Own Startup" },
    { youtubeId: "kJQP7kiw5Fk", title: "Managing Transition into Family Firm" },
  ],
  p_1_5yr: [
    { youtubeId: "9bZkp7q19f0", title: "1-5 Years - Early Career Crossroads" },
    { youtubeId: "dQw4w9WgXcQ", title: "Should You Switch Jobs Now?" },
    { youtubeId: "kJQP7kiw5Fk", title: "Getting a Promotion in 3 Years" },
    { youtubeId: "JGwWNGJdvx8", title: "Skill-Building in Early Career" },
  ],
  p_1_5_same: [
    { youtubeId: "dQw4w9WgXcQ", title: "Staying in Your Field - Going Deep" },
    { youtubeId: "9bZkp7q19f0", title: "Domain Expertise vs Generalist" },
    { youtubeId: "JGwWNGJdvx8", title: "Specialist Career Track - Long Game" },
  ],
  p_1_5_switch: [
    { youtubeId: "9bZkp7q19f0", title: "Career Switch - When and How to Do It" },
    { youtubeId: "dQw4w9WgXcQ", title: "IT to Marketing, Finance to HR" },
    { youtubeId: "kJQP7kiw5Fk", title: "Pivoting Careers Without Starting Over" },
  ],
  p_1_5_studies: [
    { youtubeId: "JGwWNGJdvx8", title: "MBA After Work Experience" },
    { youtubeId: "dQw4w9WgXcQ", title: "Executive Programs - Worth the Cost?" },
    { youtubeId: "9bZkp7q19f0", title: "Working While Studying - Is It Possible?" },
  ],
  p_5_10yr: [
    { youtubeId: "Ct6BUPvE2sM", title: "5-10 Years - The Most Important Decade" },
    { youtubeId: "OPf0YbXqDm0", title: "Mid-Career Decisions That Define Your Future" },
    { youtubeId: "RgKAFK5djSk", title: "Manager vs Individual Contributor Path" },
    { youtubeId: "fJ9rUzIMcZQ", title: "Salary at 10 Years Experience" },
  ],
  p_5_10_senior: [
    { youtubeId: "OPf0YbXqDm0", title: "Climbing to Manager / Director" },
    { youtubeId: "Ct6BUPvE2sM", title: "Leadership Skills That Get You Promoted" },
    { youtubeId: "RgKAFK5djSk", title: "Building a Team and Leading It" },
  ],
  p_5_10_venture: [
    { youtubeId: "RgKAFK5djSk", title: "Starting Up After 5 Years Corporate" },
    { youtubeId: "fJ9rUzIMcZQ", title: "Bootstrapped vs VC-Funded Startup" },
    { youtubeId: "OPf0YbXqDm0", title: "Building a Product with Domain Expertise" },
  ],
  p_5_10_abroad: [
    { youtubeId: "fJ9rUzIMcZQ", title: "Moving Abroad for Work - Real Costs" },
    { youtubeId: "RgKAFK5djSk", title: "Canada / UK / USA - Which Is Right?" },
    { youtubeId: "Ct6BUPvE2sM", title: "Getting a Work Visa with Experience" },
  ],
  p_salary_journey: [
    { youtubeId: "Ct6BUPvE2sM", title: "Salary Growth Over 10 Years - Real Numbers" },
    { youtubeId: "OPf0YbXqDm0", title: "From First CTC to Current Package" },
    { youtubeId: "kffacxfA7G4", title: "Salary Negotiations That Work" },
  ],
  p_investments: [
    { youtubeId: "OPf0YbXqDm0", title: "Savings & Investments for Earning Livelihood" },
    { youtubeId: "fJ9rUzIMcZQ", title: "Financial Planning for Early Career" },
    { youtubeId: "3AtDnEC4zak", title: "What Worked and What Didn't - Honest Advice" },
  ],
  p_work_life: [
    { youtubeId: "fJ9rUzIMcZQ", title: "Work-Life Balance - Reality Check" },
    { youtubeId: "hT_nvWreIhg", title: "Burnout, Family and Health" },
    { youtubeId: "YqeW9_5kURI", title: "How Much Is Your Time Worth?" },
  ],
};

// Default list when no node match (general)
const GENERAL_VIDEOS = [
  { youtubeId: 'iG9CE55wbtY', title: 'Career Paths in India' },
  { youtubeId: 'jNQXAC9IVRw', title: 'Success Stories' },
  { youtubeId: 'qp0HIF3SfI4', title: 'Finding Your Path' },
  { youtubeId: 'kJQP7kiw5Fk', title: 'Career Growth Strategies' },
  { youtubeId: 'kffacxfA7G4', title: 'Reinventing Your Career' },
];

/**
 * Returns videos for a category (node id or 'general'). Include path so we can show related branch videos.
 */
export function getVideosForCategory(category, path = []) {
  if (!category || category === 'general') return GENERAL_VIDEOS;
  const exact = VIDEOS_BY_NODE[category];
  if (exact?.length) return exact;
  // Try last segment of path
  const fromPath = path.length ? VIDEOS_BY_NODE[path[path.length - 1]] : null;
  if (fromPath?.length) return fromPath;
  // Partial key match
  const key = Object.keys(VIDEOS_BY_NODE).find((k) => category.includes(k) || k.includes(category));
  return (key && VIDEOS_BY_NODE[key]) || GENERAL_VIDEOS;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

function normalizeClip(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const youtubeId = String(raw.youtubeId || raw.videoId || '').trim();
  const title = String(raw.title || raw.label || raw.summary || 'Career clip').trim();
  const start = Number.isFinite(Number(raw.start))
    ? Number(raw.start)
    : Number.isFinite(Number(raw.startSec))
      ? Number(raw.startSec)
      : 0;
  const end = Number.isFinite(Number(raw.end))
    ? Number(raw.end)
    : Number.isFinite(Number(raw.endSec))
      ? Number(raw.endSec)
      : 0;
  return {
    ...raw,
    youtubeId,
    title,
    start,
    end,
  };
}

/**
 * Fetch section clips for a career-stage node from the backend.
 * Falls back to local static data if backend is unreachable.
 * @param {string} sectionId - the canonical sectionId (from careers.json)
 * @returns {Promise<Array<{youtubeId, title, profession, start, end}>>}
 */
export async function fetchVideosForNode(sectionId, options = {}) {
  if (!sectionId) return GENERAL_VIDEOS;
  try {
    const params = new URLSearchParams();
    if (options.includeBridge) params.set('includeBridge', '1');
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/api/videos/for-node/${encodeURIComponent(sectionId)}${qs}`);
    if (res.ok) {
      const clips = await res.json();
      if (Array.isArray(clips) && clips.length > 0) {
        const normalized = clips
          .map((clip) => normalizeClip(clip))
          .filter((clip) => clip && clip.youtubeId);
        if (normalized.length > 0) return normalized;
      }
    }
  } catch {
    // Backend not running — fall back to static data below
  }
  return getVideosForCategory(sectionId);
}
