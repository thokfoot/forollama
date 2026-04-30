"""
Career Records of India — FastAPI backend
Read-mostly server that serves career tree data, interview clips, layout config,
and accepts journey submissions. Data lives in /app/backend/data/*.json.
"""
from fastapi import FastAPI, APIRouter, HTTPException, Body, Depends, Request
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
from typing import Any, Dict, List, Optional
import bcrypt
import jwt
from collections import defaultdict
from pathlib import Path
from datetime import datetime, timezone, timedelta
import json
import os
import uuid
import logging
import secrets
import threading

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

DATA_DIR = ROOT_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

NODES_PATH = DATA_DIR / "nodes.json"
INTERVIEWS_PATH = DATA_DIR / "interviews.json"
LAYOUT_PATH = DATA_DIR / "layoutConfig.json"
CONFIG_PATH = DATA_DIR / "siteConfig.json"
SUBMISSIONS_PATH = DATA_DIR / "journeySubmissions.json"
DEMANDS_PATH = DATA_DIR / "demands.json"
CONTACT_PATH = DATA_DIR / "contact.json"
NEWSLETTER_PATH = DATA_DIR / "newsletter.json"
PUBLIC_TREE_PATH = ROOT_DIR.parent / "frontend" / "src" / "data" / "careers.json"

# ─────────────────────────────────────────────
#  LOGGING
# ─────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("careers")

_FILE_LOCK = threading.Lock()


def read_json(path: Path, default: Any = None) -> Any:
    """Safely read a JSON file."""
    if not path.exists():
        return default
    try:
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as exc:
        logger.warning("read_json failed for %s: %s", path, exc)
        return default


def write_json(path: Path, data: Any) -> None:
    """Atomic write helper."""
    with _FILE_LOCK:
        tmp = path.with_suffix(path.suffix + ".tmp")
        with tmp.open("w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        tmp.replace(path)


# ─────────────────────────────────────────────
#  NODE LABEL UTILS  (legacy alias resolution)
# ─────────────────────────────────────────────
NODE_MATCH_ALIASES: Dict[str, List[str]] = {
    # Legacy segment IDs → current careers.json node IDs
    "s_after10th":      ["s_10th_decision"],
    "s_12_drop":        ["s_drop_year"],
    "s_12_college":     ["s_12th_entrance"],
    "s_placement":      ["s_internships", "s_after_degree"],
    "p_firstjob":       ["p_first_job"],
    "p_10_lead":        ["p_5_10_senior", "p_money_reality"],
    "p_money_planning": ["p_money_reality"],
    # Group aliases: parent node → all children clips appear in sidebar
    "professional":     ["p_first_job", "p_1_5yr", "p_5_10yr", "p_money_reality"],
    "student":          ["s_10th_decision", "s_12th_entrance", "s_college", "s_after_degree"],
}


def aliases_for(node_id: str) -> List[str]:
    return [node_id] + NODE_MATCH_ALIASES.get(node_id, [])


def reverse_aliases_for(node_id: str) -> List[str]:
    """All known IDs that should be considered equivalent to node_id."""
    eq = {node_id}
    eq.update(NODE_MATCH_ALIASES.get(node_id, []))
    for canonical, legacy_list in NODE_MATCH_ALIASES.items():
        if node_id in legacy_list or node_id == canonical:
            eq.add(canonical)
            eq.update(legacy_list)
    return list(eq)


def all_nodes() -> List[Dict[str, Any]]:
    return read_json(NODES_PATH, {"nodes": []}).get("nodes", []) or []


def all_interviews() -> List[Dict[str, Any]]:
    return read_json(INTERVIEWS_PATH, []) or []


# ─────────────────────────────────────────────
#  14-BIT DNA MATCHING SYSTEM  (Rev 6)
#
#  DNA string: 7 chars, each A/B/C/D (2 bits × 7 = 14 bits)
#  Pos  Dimension         Wt-Pro  Wt-Stu   A             B              C               D
#  0    Profession        30 %    20 %     Corporate/MNC Govt/PSU       Startup/SME     Freelance/Own
#  1    Stream            10 %    20 %     STEM/Science  Commerce/Fin   Arts/Humanities Vocational
#  2    Experience        25 %    20 %     0-2 yrs       3-5 yrs        6-10 yrs        10+ yrs
#  3    Admission Mode    10 %    20 %     Merit         Entrance Exam  Donation/Quota  Other
#  4    Academic Record    5 %    20 %     90%+/Gold     Above 80 %     60-80 %         Below 60 %
#  5    Location Tier      0 %     0 %     Metro         Tier-2         Small Town      Rural
#  6    Salary Range      20 %     0 %     <6 LPA        6-15 LPA       15-40 LPA       40 LPA+
# ─────────────────────────────────────────────
#  Categorical (exact-match only): Pos 0 (Profession) + Pos 1 (Stream)
#  Ordinal (distance-based):       Pos 2, 3, 4, 6
# ─────────────────────────────────────────────

DNA_WEIGHTS: List[float] = [0.40, 0.20, 0.20, 0.10, 0.10, 0.00, 0.00]  # legacy (6-char compat)

# Distance → per-dimension score
_DIST_SCORE: Dict[int, float] = {0: 1.00, 1: 0.50, 2: 0.20, 3: 0.00}

# Profession encoding
_PROFESSION_KEYS: Dict[str, str] = {
    "corporate": "A", "mnc": "A", "p_fj_corporate": "A", "p_job_track": "A", "p_1_5_same": "A",
    "govt": "B", "psu": "B", "p_fj_govt": "B", "p_5_10_senior": "B", "defense": "B",
    "startup": "C", "sme": "C", "p_fj_startup": "C", "p_1_5_switch": "C", "p_5_10_venture": "C",
    "freelance": "D", "business": "D", "p_fj_family": "D",
    "p_freelance_track": "D", "p_business_track": "D", "p_creator_track": "D",
}
_STREAM_KEYS: Dict[str, str] = {
    "pcm": "A", "pcb": "A", "science": "A", "stem": "A", "engineering": "A",
    "medical": "A", "jee": "A", "neet": "A", "btech": "A", "bsc": "A",
    "commerce": "B", "ca": "B", "cs": "B", "cma": "B", "finance": "B", "mba": "B",
    "arts": "C", "humanities": "C", "upsc": "C", "law": "C", "media": "C",
    "vocational": "D", "diploma": "D", "iti": "D", "polytechnic": "D", "nursing": "D",
}
_ADMISSION_MAP: Dict[str, str] = {
    "merit": "A",
    "entrance": "B",
    "donation": "C", "donation_management": "C", "quota": "C", "management": "C",
    "lateral": "D", "other": "D", "": "D",
}
_MARKS_MAP: Dict[str, str] = {
    "gold_medalist": "A", "gold": "A",
    "above_80": "B",
    "60_80": "C",
    "below_60": "D",
}
_METRO_KEYS = {"mumbai", "delhi", "bangalore", "bengaluru", "hyderabad",
               "chennai", "pune", "kolkata", "metro"}
# Salary range encoding (Pos 6) — Indian LPA brackets
_SALARY_MAP: Dict[str, str] = {
    "below_6":  "A",  # < 6 LPA
    "6_to_15":  "B",  # 6–15 LPA
    "15_to_40": "C",  # 15–40 LPA
    "above_40": "D",  # 40 LPA+
    # aliases for frontend flexibility
    "below6":   "A", "under6": "A",
    "6_15":     "B", "mid":    "B",
    "15_40":    "C", "senior": "C",
    "above40":  "D", "top":    "D",
}


def _enc_profession(persona: str, node_id: str = "") -> str:
    k = (str(persona or "") + " " + str(node_id or "")).lower()
    for key, grade in _PROFESSION_KEYS.items():
        if key in k:
            return grade
    return "A"


def _enc_stream(stream: str) -> str:
    s = str(stream or "").lower()
    for key, grade in _STREAM_KEYS.items():
        if key in s:
            return grade
    return "D"


def _enc_experience(yrs) -> str:
    try:
        y = float(yrs or 0)
    except (ValueError, TypeError):
        y = 0
    if y <= 2:  return "A"
    if y <= 5:  return "B"
    if y <= 10: return "C"
    return "D"


def _enc_admission(mode: str) -> str:
    k = str(mode or "").lower().strip().replace(" ", "_")
    return _ADMISSION_MAP.get(k, _ADMISSION_MAP.get(k.split("_")[0], "D"))


def _enc_marks(marks: str) -> str:
    return _MARKS_MAP.get(str(marks or "").lower().strip(), "D")


def _enc_location(location: str) -> str:
    loc = str(location or "").lower()
    if any(k in loc for k in _METRO_KEYS): return "A"
    if "tier" in loc and "2" in loc:       return "B"
    if "small" in loc or "tier" in loc:    return "C"
    return "B"   # safe default: Tier-2


def _enc_salary(salary: str) -> str:
    """Encode salary range to A/B/C/D.
    Accepts string key (below_6|6_to_15|15_to_40|above_40) or
    raw numeric LPA value as string (e.g. '12' for 12 LPA).
    """
    s = str(salary or "").lower().strip().replace("-", "_").replace(" ", "_")
    if s in _SALARY_MAP:
        return _SALARY_MAP[s]
    # Try numeric fallback: parse LPA value
    try:
        lpa = float(s)
        if lpa < 6:   return "A"
        if lpa <= 15: return "B"
        if lpa <= 40: return "C"
        return "D"
    except ValueError:
        pass
    return "A"  # unknown → safe default (lowest bracket)


def encode_dna(
    profession: str = "", stream: str = "", experience=0,
    admission: str = "", marks: str = "", location: str = "",
    node_id: str = "", salary: str = "",
) -> str:
    """Encode a 7-character 14-bit DNA string.
    Pos 6 (Salary) is 'A' (default) when salary is not provided
    — matches old 6-char records without breaking them.
    """
    return (
        _enc_profession(profession, node_id)
        + _enc_stream(stream)
        + _enc_experience(experience)
        + _enc_admission(admission)
        + _enc_marks(marks)
        + _enc_location(location)
        + _enc_salary(salary)     # Pos 6 — NEW
    )


def encode_visitor_dna(
    marks: str = "", entry: str = "", stream: str = "",
    experience=0, location: str = "", profession: str = "",
    salary: str = "",
) -> str:
    """Build a visitor DNA from JourneyMapper bridge fields."""
    return encode_dna(
        profession=profession,    # now wired (livelihood path provides this)
        stream=stream,
        experience=experience,
        admission=entry,
        marks=marks,
        location=location,
        salary=salary,            # NEW — Pos 6
    )


def encode_interview_dna(interview: Dict[str, Any]) -> str:
    """Derive 7-char DNA string from an interview record."""
    bg = interview.get("background") or {}
    return encode_dna(
        profession=str(interview.get("persona") or ""),
        stream=str(bg.get("stream") or ""),
        experience=bg.get("experience_years", 0),
        admission=str(bg.get("entry") or ""),
        marks=str(bg.get("marks") or ""),
        location=str(bg.get("location") or ""),
        node_id=str(interview.get("nodeId") or ""),
        salary=str(bg.get("salary_range") or ""),   # NEW — Pos 6
    )


# Positions that use CATEGORICAL scoring (exact = 1.0, any mismatch = 0.0)
# Rationale: Corporate vs Startup is NOT a partial match — it is a different life
# path. Ordinal distance (A→B = 0.5) was semantically wrong for these dimensions.
_CATEGORICAL_POSITIONS = {0, 1}  # Profession + Stream (exact-match only)

# ─── Per-lens DNA weight tables (7 positions) ─────────────────────────────────
# Pos  Dimension        Student   Professional   Rationale
#  0   Profession        0.20      0.30 (Cat)   Sector identity — most important for pros
#  1   Stream            0.20      0.10 (Cat)   Less relevant once you're in a career
#  2   Experience        0.20      0.25 (Ord)   Seniority stage matters a lot
#  3   Admission Mode    0.20      0.10 (Ord)   Background signal
#  4   Academic Marks    0.20      0.05 (Ord)   Least relevant for experienced
#  5   Location           0.00      0.00         Not scored yet
#  6   Salary Range       0.00      0.20 (Ord)  Economic reality mirror — NEW
# Total:                 1.00      1.00
# ──────────────────────────────────────────────────────────────────────────────
STUDENT_WEIGHTS:      List[float] = [0.20, 0.20, 0.20, 0.20, 0.20, 0.00, 0.00]
PROFESSIONAL_WEIGHTS: List[float] = [0.30, 0.10, 0.25, 0.10, 0.05, 0.00, 0.20]


def calculate_match_score(
    visitor_dna: str,
    professional_dna: str,
    weights: Optional[List[float]] = None,
) -> float:
    """
    Weighted 12-bit DNA match score in [0.0, 1.0].

    Pos 0 (Profession) — CATEGORICAL: exact = 1.0, mismatch = 0.0
    Pos 1 (Stream)     — CATEGORICAL: exact = 1.0, mismatch = 0.0
    Pos 2 (Experience) — ORDINAL: distance-based (A→B=0.5, A→C=0.2, A→D=0)
    Pos 3 (Admission)  — ORDINAL
    Pos 4 (Marks)      — ORDINAL
    Pos 5 (Location)    — ignored (weight=0)

    Weights are lens-dependent:
      Student:      [0.20, 0.20, 0.20, 0.20, 0.20, 0.00]  (equal across all dims)
      Professional: [0.40, 0.10, 0.30, 0.10, 0.10, 0.00]  (profession + exp dominant)
    Default (no lens): legacy DNA_WEIGHTS = [0.40, 0.20, 0.20, 0.10, 0.10, 0.00]
    """
    if not visitor_dna or not professional_dna:
        return 0.0
    w = weights if weights is not None else DNA_WEIGHTS
    score = 0.0
    for i, weight in enumerate(w):
        if weight == 0.0:
            continue
        v = visitor_dna[i].upper()      if i < len(visitor_dna)      else "A"
        p = professional_dna[i].upper() if i < len(professional_dna) else "A"
        if i in _CATEGORICAL_POSITIONS:
            score += weight if v == p else 0.0
        else:
            dist = abs(ord(v) - ord(p))
            score += _DIST_SCORE.get(dist, 0.0) * weight
    return round(score, 4)


def match_grade(score: float) -> str:
    if score >= 0.85: return "A+"
    if score >= 0.70: return "A"
    if score >= 0.55: return "B"
    if score >= 0.35: return "C"
    return "D"


# ─────────────────────────────────────────────
#  APP + ROUTER
# ─────────────────────────────────────────────
app = FastAPI(title="Career Records of India API", version="2.1.0")
api = APIRouter(prefix="/api")


@app.get("/")
async def root_redirect():
    return {"name": "Career Records of India", "ok": True}


@api.get("/health")
async def health():
    return {"ok": True, "ts": datetime.now(timezone.utc).isoformat()}


# ─────────────────────────────────────────────
#  SITE CONFIG
# ─────────────────────────────────────────────
DEFAULT_SITE_CONFIG: Dict[str, Any] = {
    "flipper": {
        "titles": ["DOCTOR", "ENGINEER", "SCIENTIST", "ARTIST", "ENTREPRENEUR", "DESIGNER", "TEACHER", "OFFICER"],
        "tagline": "Records of achievements and mistakes",
        "buttonText": "Begin the journey",
        "flipDuration": 1900,
        "flipSpeed": 220,
    },
    "site": {
        "brandName": "Career Records Of India",
        "description": "Real career journeys, real numbers, no fluff.",
        "disclaimer": "Career Records does not provide career advice. We document experiences, not recommendations.",
    },
    "social": {"twitter": "", "linkedin": "", "instagram": "", "youtube": "", "github": ""},
    "footer": {
        "copyright": "2026 Career Records Of India. All rights reserved.",
        "links": [
            {"label": "Privacy Policy", "href": "/privacy"},
            {"label": "Terms of Service", "href": "/terms"},
        ],
    },
    "mobileEntry": {
        "eyebrowText": "Entry Mode",
        "titleText": "Pick your path lens",
        "selectLabel": "Select",
        "browseLabel": "Browse all careers",
        "studentLabel": "For Students",
        "studentEyebrow": "School to first decisions",
        "studentSubtitle": "Streams, college choices, and early career direction.",
        "livelihoodLabel": "For Earning Livelihood",
        "livelihoodEyebrow": "Job-holders, freelancers, and business owners",
        "livelihoodSubtitle": "Livelihood can start right after 10th through jobs, freelance work, or small business.",
    },
}


@api.get("/config")
async def get_site_config():
    cfg = read_json(CONFIG_PATH, DEFAULT_SITE_CONFIG)
    return cfg


# ─────────────────────────────────────────────
#  PUBLIC TREE
# ─────────────────────────────────────────────
@api.get("/careers/public")
async def get_public_tree():
    tree = read_json(PUBLIC_TREE_PATH, {"id": "start", "label": "Career Records of India", "children": []})
    return tree


@api.get("/nodes")
async def get_nodes():
    return read_json(NODES_PATH, {"nodes": [], "relatedNodeMap": {}})


# ─────────────────────────────────────────────
#  LAYOUT CONFIG
# ─────────────────────────────────────────────
@api.get("/layout-config")
async def get_layout_config():
    return read_json(LAYOUT_PATH, {"version": 1, "global": {}, "nodes": {}})


@api.get("/tree-layout")
async def get_tree_layout_alias():
    return read_json(LAYOUT_PATH, {"version": 1, "global": {}, "nodes": {}})


# ─────────────────────────────────────────────
#  VIDEOS / CLIPS
# ─────────────────────────────────────────────
def segment_to_clip(interview: Dict[str, Any], segment: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise a (interview, segment) into a clip the frontend understands."""
    # Prefer stored DNA; fall back to runtime derivation so old records still work
    dna = interview.get("dna") or encode_interview_dna(interview)
    return {
        "id": f"{interview.get('id', 'interview')}__{segment.get('phase', 'seg')}",
        "youtubeId": interview.get("videoId") or interview.get("youtubeId"),
        "title": interview.get("title") or segment.get("phase", "Career segment"),
        "profession": interview.get("persona") or interview.get("professionalName"),
        "professionalName": interview.get("professionalName"),
        "phase": segment.get("phase"),
        "nodeId": segment.get("nodeId"),
        "start": int(segment.get("start", 0)),
        "end": int(segment.get("end", 0)),
        "startSec": int(segment.get("start", 0)),
        "endSec": int(segment.get("end", 0)),
        "verdict": segment.get("verdict") or "",
        "tags": segment.get("tags") or [],
        "background": interview.get("background") or {},
        "dna": dna,
    }


def clips_for_node(node_id: str) -> List[Dict[str, Any]]:
    aliases = set(reverse_aliases_for(node_id))
    out: List[Dict[str, Any]] = []
    for iv in all_interviews():
        for seg in iv.get("segments", []) or []:
            seg_node = seg.get("nodeId")
            if not seg_node:
                continue
            if seg_node in aliases or any(a == seg_node for a in aliases):
                out.append(segment_to_clip(iv, seg))
    return out


# Tiered match thresholds — keep in sync with frontend PARTIAL_THRESHOLD constant
_TIER1_THRESHOLD = 0.60   # strong match
_TIER2_THRESHOLD = 0.50   # partial match (isPartialMatch=True appended)


def clips_matching_mirror(
    node_id: str,
    marks: str = "",
    entry: str = "",
    strict: bool = False,
    visitor_dna: str = "",
    stream: str = "",
    experience=0,
    location: str = "",
    lens: str = "",          # "student" | "livelihood" | "" (legacy)
) -> List[Dict[str, Any]]:
    """
    Return clips for node_id sorted by 12-bit DNA match score (descending).

    Tiered matching strategy:
      1.  First try Tier-1: clips with matchScore >= 0.60
      2.  If empty, fall back to Tier-2: clips with matchScore >= 0.50
          → these get isPartialMatch=True appended
      3.  If still empty, return [] so the caller can trigger Scouting Mode.

    When no visitor profile is present, return all clips unscored (legacy behaviour).
    """
    base = clips_for_node(node_id)
    if not base:
        return base

    # Build visitor DNA if not pre-encoded
    if not visitor_dna and (marks or entry or stream):
        visitor_dna = encode_visitor_dna(
            marks=marks, entry=entry, stream=stream,
            experience=experience, location=location,
        )

    if not visitor_dna:
        return base   # no profile → return unscored clips as-is

    def _pro_dna(clip: Dict[str, Any]) -> str:
        dna = clip.get("dna") or ""
        if dna:
            return dna
        bg = clip.get("background") or {}
        return encode_dna(
            profession=str(clip.get("profession") or ""),
            stream=str(bg.get("stream") or ""),
            experience=bg.get("experience_years", 0),
            admission=str(bg.get("entry") or ""),
            marks=str(bg.get("marks") or ""),
            location=str(bg.get("location") or ""),
            node_id=str(clip.get("nodeId") or ""),
        )

    # Resolve weight table based on lens
    if lens == "livelihood":
        _weights = PROFESSIONAL_WEIGHTS
    elif lens == "student":
        _weights = STUDENT_WEIGHTS
    else:
        _weights = DNA_WEIGHTS  # legacy default

    scored: List[tuple] = [
        (clip, calculate_match_score(visitor_dna, _pro_dna(clip), weights=_weights))
        for clip in base
    ]
    scored.sort(key=lambda x: x[1], reverse=True)

    # ── Tier 1: strong matches ──
    tier1 = [(c, s) for c, s in scored if s >= _TIER1_THRESHOLD]
    if tier1:
        return [
            {**dict(c), "matchScore": s, "matchGrade": match_grade(s), "isPartialMatch": False}
            for c, s in tier1
        ]

    # ── Tier 2: partial matches ──
    tier2 = [(c, s) for c, s in scored if _TIER2_THRESHOLD <= s < _TIER1_THRESHOLD]
    if tier2:
        return [
            {**dict(c), "matchScore": s, "matchGrade": match_grade(s), "isPartialMatch": True}
            for c, s in tier2
        ]

    # ── No match (score < 0.50) → caller triggers Scouting Mode + auto-demand ──
    return []


@api.get("/videos/for-node/{node_id}")
async def get_videos_for_node(node_id: str):
    return clips_for_node(node_id)


@api.get("/clips")
async def get_clips(nodeId: Optional[str] = None):
    if not nodeId:
        return []
    return clips_for_node(nodeId)


@api.get("/path-clips")
async def get_path_clips(
    path: Optional[str] = None,
    currentNode: Optional[str] = None,
    marks: Optional[str] = "",
    entry: Optional[str] = "",
    stream: Optional[str] = "",
    experience: Optional[int] = 0,
    location: Optional[str] = "",
    visitorDna: Optional[str] = "",
    strict: Optional[str] = None,
    lens: Optional[str] = "",   # NEW: "student" | "livelihood"
):
    is_strict = bool(strict)
    current = currentNode or ""
    path_ids = [x.strip() for x in (path or current).split(",") if x.strip()]
    history_ids = [pid for pid in path_ids if pid != current][-3:]

    # Build visitor DNA once; reuse across all node lookups
    v_dna = visitorDna or encode_visitor_dna(
        marks=marks or "", entry=entry or "",
        stream=stream or "", experience=experience or 0,
        location=location or "",
    )

    def _match(node_id: str) -> List[Dict[str, Any]]:
        return clips_matching_mirror(
            node_id,
            marks=marks or "", entry=entry or "",
            strict=is_strict, visitor_dna=v_dna,
            stream=stream or "", experience=experience or 0,
            location=location or "",
            lens=lens or "",
        )

    current_clips = _match(current) if current else []
    history_clips: List[Dict[str, Any]] = []
    for hid in history_ids:
        history_clips.extend(_match(hid))

    # de-duplicate by id
    seen: set = set()
    def dedup(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        out = []
        for it in items:
            key = it.get("id") or (it.get("youtubeId"), it.get("start"), it.get("end"))
            if key in seen:
                continue
            seen.add(key)
            out.append(it)
        return out

    current_clips = dedup(current_clips)
    history_clips = dedup(history_clips)
    return {
        "currentClips": current_clips,
        "historyClips": history_clips,
        "visitorDna": v_dna,
    }


@api.get("/video-counts")
async def get_video_counts():
    counts: Dict[str, int] = {}
    for iv in all_interviews():
        for seg in iv.get("segments", []) or []:
            nid = seg.get("nodeId")
            if not nid:
                continue
            for canon in reverse_aliases_for(nid):
                counts[canon] = counts.get(canon, 0) + 1
    return counts


@api.get("/visitor-mirror-nodes")
async def visitor_mirror_nodes(marks: Optional[str] = "", entry: Optional[str] = ""):
    """Return ordered node IDs of interviewees that share marks/entry profile."""
    if not (marks or entry):
        return {"nodeIds": []}
    found: List[str] = []
    for iv in all_interviews():
        bg = iv.get("background") or {}
        ok_m = (not marks) or (str(bg.get("marks", "")).lower() == marks.lower())
        ok_e = (not entry) or (str(bg.get("entry", "")).lower() == entry.lower())
        if not (ok_m and ok_e):
            continue
        for seg in iv.get("segments", []) or []:
            nid = seg.get("nodeId")
            if nid and nid not in found:
                found.append(nid)
    return {"nodeIds": found}


# ─────────────────────────────────────────────
#  JOURNEY SUBMISSIONS  (public form)
# ─────────────────────────────────────────────
@api.post("/submit-journey")
async def submit_journey(payload: Dict[str, Any] = Body(...)):
    sid = f"sub_{int(datetime.now(timezone.utc).timestamp() * 1000)}_{secrets.token_hex(3)}"
    record = {
        "id": sid,
        "submittedAt": datetime.now(timezone.utc).isoformat(),
        "status": "pending",
        "source": "public-form",
        "data": payload or {},
    }
    rows = read_json(SUBMISSIONS_PATH, []) or []
    rows.append(record)
    write_json(SUBMISSIONS_PATH, rows)
    return {"ok": True, "id": sid}


@api.post("/demand")
async def submit_demand(payload: Dict[str, Any] = Body(...)):
    """
    Accept a demand request from the frontend.
    Always persists:
      - nodeId / nodeLabel (which career node the visitor was on)
      - visitorDna        (full 6-char 12-bit DNA string)
      - source            ('auto' = triggered by <50% no-match, 'manual' = button click)
    """
    rows = read_json(DEMANDS_PATH, []) or []
    body = payload or {}

    # If the caller sent individual profile fields but no pre-encoded DNA, encode it now
    if not body.get("visitorDna"):
        visitor_dna = encode_visitor_dna(
            marks=str(body.get("marks") or ""),
            entry=str(body.get("entry") or ""),
            stream=str(body.get("stream") or ""),
            experience=body.get("experience", 0),
            location=str(body.get("location") or ""),
        )
        body = {**body, "visitorDna": visitor_dna}

    rec = {
        "id": f"dem_{int(datetime.now(timezone.utc).timestamp() * 1000)}_{secrets.token_hex(3)}",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        **body,
    }
    rows.append(rec)
    write_json(DEMANDS_PATH, rows)
    return {"ok": True, "id": rec["id"]}


# ─────────────────────────────────────────────
#  ADMIN AUTH  (early definition — required before /demands/stats)
# ─────────────────────────────────────────────
ADMIN_PATH = DATA_DIR / "admin.json"
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24
RESET_TOKEN_TTL_MIN = 15
_LOGIN_ATTEMPTS: Dict[str, List[float]] = defaultdict(list)
_LOCKOUT_WINDOW_SEC = 15 * 60
_LOCKOUT_THRESHOLD = 5
_PASSWORD_RESET_TOKENS: Dict[str, Dict[str, Any]] = {}
bearer_scheme = HTTPBearer(auto_error=False)

def _jwt_secret() -> str:
    return os.environ.get("JWT_SECRET") or "dev-secret-change-me"
def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt(rounds=10)).decode("utf-8")
def _verify_password(plain: str, hashed: str) -> bool:
    if not hashed: return False
    try: return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except: return False
def _create_access_token(username: str) -> str:
    payload = {"sub": username, "role": "admin",
               "iat": int(datetime.now(timezone.utc).timestamp()),
               "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS)}
    return jwt.encode(payload, _jwt_secret(), algorithm=JWT_ALGORITHM)
def _decode_token(token: str) -> Dict[str, Any]:
    return jwt.decode(token, _jwt_secret(), algorithms=[JWT_ALGORITHM])
def _read_admin() -> Dict[str, Any]:
    return read_json(ADMIN_PATH, {}) or {}
def _write_admin(data: Dict[str, Any]) -> None:
    write_json(ADMIN_PATH, data)
async def get_current_admin(
    request: Request,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Dict[str, Any]:
    token = creds.credentials if creds and creds.credentials else None
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "): token = auth_header[7:]
    if not token: raise HTTPException(status_code=401, detail="Not authenticated")
    try: payload = _decode_token(token)
    except jwt.ExpiredSignatureError: raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError: raise HTTPException(status_code=401, detail="Invalid token")
    admin = _read_admin()
    if not admin or payload.get("sub") != admin.get("username"):
        raise HTTPException(status_code=401, detail="Admin not found")
    return {"username": admin["username"], "email": admin.get("email", ""), "firstLogin": bool(admin.get("firstLogin"))}

@api.get("/demands/stats")
async def get_demand_stats(_: Dict[str, Any] = Depends(get_current_admin)):
    """
    Aggregate demand.json into:
      - per-node request counts  (topNodes)
      - Most Requested Unmatched Profiles aggregated by DNA string  (topDnaProfiles)
    Requires admin JWT.
    """
    rows = read_json(DEMANDS_PATH, []) or []

    # ── Per-node aggregation (existing) ──
    counts: Dict[str, Dict[str, Any]] = {}
    dna_counts: Dict[str, Dict[str, Any]] = {}

    for row in rows:
        # Node aggregation
        nid = str(row.get("nodeId") or row.get("node_id") or "").strip()
        if nid:
            if nid not in counts:
                counts[nid] = {
                    "nodeId": nid,
                    "nodeLabel": str(row.get("nodeLabel") or row.get("label") or nid),
                    "requests": 0,
                    "lastRequestedAt": "",
                }
            counts[nid]["requests"] += 1
            ts = str(row.get("createdAt") or "")
            if ts > counts[nid]["lastRequestedAt"]:
                counts[nid]["lastRequestedAt"] = ts

        # DNA profile aggregation — now supports 6-char (legacy) and 7-char (Rev 6)
        dna = str(row.get("visitorDna") or "").strip().upper()
        if dna and len(dna) in (6, 7):
            if dna not in dna_counts:
                dna_counts[dna] = {
                    "dna": dna,
                    "requests": 0,
                    "lastRequestedAt": "",
                    "humanReadable": {
                        "profession": {"A": "Corporate/MNC", "B": "Govt/PSU", "C": "Startup/SME", "D": "Freelance/Own"}.get(dna[0], "?"),
                        "stream":     {"A": "STEM/Science", "B": "Commerce", "C": "Arts/Humanities", "D": "Vocational"}.get(dna[1], "?"),
                        "experience": {"A": "0-2 yrs", "B": "3-5 yrs", "C": "6-10 yrs", "D": "10+ yrs"}.get(dna[2], "?"),
                        "admission":  {"A": "Merit", "B": "Entrance Exam", "C": "Donation/Quota", "D": "Other"}.get(dna[3], "?"),
                        "marks":      {"A": "90%+", "B": "Above 80%", "C": "60-80%", "D": "Below 60%"}.get(dna[4], "?"),
                        "location":   {"A": "Metro", "B": "Tier-2", "C": "Small Town", "D": "Rural"}.get(dna[5] if len(dna) > 5 else "?", "?"),
                        "salary":     {"A": "< ₹6 LPA", "B": "₹6-15 LPA", "C": "₹15-40 LPA", "D": "₹40 LPA+"}.get(dna[6] if len(dna) > 6 else "A", "Not captured"),
                    },
                }
            dna_counts[dna]["requests"] += 1
            ts = str(row.get("createdAt") or "")
            if ts > dna_counts[dna]["lastRequestedAt"]:
                dna_counts[dna]["lastRequestedAt"] = ts

    top_nodes = sorted(counts.values(), key=lambda x: x["requests"], reverse=True)[:20]
    top_dna   = sorted(dna_counts.values(), key=lambda x: x["requests"], reverse=True)[:20]

    return {
        "totalRequests": len(rows),
        "uniqueNodes": len(counts),
        "topNodes": top_nodes,
        "topDnaProfiles": top_dna,   # ← NEW: Most Requested Unmatched Profiles
    }


# ─────────────────────────────────────────────
#  CONTACT + NEWSLETTER  (public forms)
# ─────────────────────────────────────────────
import re

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class ContactIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=254)
    message: str = Field(min_length=1, max_length=4000)


class NewsletterIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    email: str = Field(min_length=3, max_length=254)


@api.post("/contact")
async def submit_contact(payload: ContactIn):
    if not EMAIL_RE.match(payload.email.strip()):
        raise HTTPException(status_code=422, detail="Enter a valid email")
    rows = read_json(CONTACT_PATH, []) or []
    rec = {
        "id": f"ct_{int(datetime.now(timezone.utc).timestamp() * 1000)}_{secrets.token_hex(3)}",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "name": payload.name.strip()[:120],
        "email": payload.email.strip().lower()[:254],
        "message": payload.message.strip()[:4000],
        "status": "new",
    }
    rows.append(rec)
    write_json(CONTACT_PATH, rows)
    return {"ok": True, "id": rec["id"]}


@api.post("/newsletter")
async def submit_newsletter(payload: NewsletterIn):
    email = payload.email.strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(status_code=422, detail="Enter a valid email")
    rows = read_json(NEWSLETTER_PATH, []) or []
    # Idempotent — no duplicate emails
    if any(r.get("email") == email for r in rows):
        return {"ok": True, "alreadySubscribed": True}
    rec = {
        "id": f"ns_{int(datetime.now(timezone.utc).timestamp() * 1000)}_{secrets.token_hex(3)}",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "email": email[:254],
        "source": "footer",
    }
    rows.append(rec)
    write_json(NEWSLETTER_PATH, rows)
    return {"ok": True, "id": rec["id"]}


# ─────────────────────────────────────────────
#  ADMIN AUTH  (routes, password mgmt, brute-force protection)
# ─────────────────────────────────────────────

def _seed_admin_if_needed() -> None:
    """Idempotent: create admin.json if missing; do NOT overwrite existing credentials."""
    admin = _read_admin()
    env_user = (os.environ.get("ADMIN_USER") or "admin").strip()
    env_pass = os.environ.get("ADMIN_PASS") or "admin123"
    if not admin or not admin.get("username") or not admin.get("password"):
        _write_admin({
            "username": env_user,
            "password": _hash_password(env_pass),
            "email": admin.get("email") if admin else "",
            "firstLogin": True,
            "createdAt": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Admin seeded from env (username=%s, firstLogin=True).", env_user)


def _record_failed_attempt(identifier: str) -> None:
    now = datetime.now(timezone.utc).timestamp()
    bucket = _LOGIN_ATTEMPTS[identifier]
    bucket.append(now)
    cutoff = now - _LOCKOUT_WINDOW_SEC
    _LOGIN_ATTEMPTS[identifier] = [t for t in bucket if t >= cutoff]


def _clear_failed_attempts(identifier: str) -> None:
    _LOGIN_ATTEMPTS.pop(identifier, None)


def _is_locked_out(identifier: str) -> bool:
    now = datetime.now(timezone.utc).timestamp()
    cutoff = now - _LOCKOUT_WINDOW_SEC
    recent = [t for t in _LOGIN_ATTEMPTS.get(identifier, []) if t >= cutoff]
    _LOGIN_ATTEMPTS[identifier] = recent
    return len(recent) >= _LOCKOUT_THRESHOLD


class LoginIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=200)


class ChangePasswordIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    newPassword: str = Field(min_length=6, max_length=200)
    email: Optional[str] = Field(default=None, max_length=254)


class ForgotPasswordIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    email: str = Field(min_length=3, max_length=254)


class ResetPasswordIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    token: str = Field(min_length=10, max_length=120)
    newPassword: str = Field(min_length=6, max_length=200)


@api.post("/auth/login")
async def auth_login(payload: LoginIn, request: Request):
    username = payload.username.strip()
    # Respect proxies — prefer X-Forwarded-For (first hop), else remote client.
    fwd = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    ip = fwd or (request.client.host if request.client else "unknown") or "unknown"
    ident = f"{ip}:{username.lower()}"
    if _is_locked_out(ident):
        raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 15 minutes.")
    admin = _read_admin()
    if not admin or username != admin.get("username") or not _verify_password(payload.password, admin.get("password", "")):
        _record_failed_attempt(ident)
        logger.info("[auth] failed login from %s for user=%s (attempts=%d)", ip, username, len(_LOGIN_ATTEMPTS.get(ident, [])))
        raise HTTPException(status_code=401, detail="Invalid username or password")
    _clear_failed_attempts(ident)
    token = _create_access_token(admin["username"])
    return {
        "ok": True,
        "token": token,
        "firstLogin": bool(admin.get("firstLogin", False)),
    }


@api.get("/auth/me")
async def auth_me(current: Dict[str, Any] = Depends(get_current_admin)):
    return {"ok": True, "admin": current}


@api.post("/auth/change-password")
async def auth_change_password(
    payload: ChangePasswordIn,
    current: Dict[str, Any] = Depends(get_current_admin),
):
    admin = _read_admin()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin record not found")
    admin["password"] = _hash_password(payload.newPassword)
    admin["firstLogin"] = False
    if payload.email is not None:
        email = payload.email.strip().lower()
        if email:
            if not EMAIL_RE.match(email):
                raise HTTPException(status_code=422, detail="Enter a valid recovery email")
            admin["email"] = email
    admin["passwordUpdatedAt"] = datetime.now(timezone.utc).isoformat()
    _write_admin(admin)
    token = _create_access_token(admin["username"])
    return {"ok": True, "token": token}


@api.post("/auth/forgot-password")
async def auth_forgot_password(payload: ForgotPasswordIn):
    email = payload.email.strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(status_code=422, detail="Enter a valid email")
    admin = _read_admin()
    # Always return ok (don't leak which emails are registered), but only log the reset link when match
    if admin and email == (admin.get("email") or "").lower():
        reset_token = secrets.token_urlsafe(24)
        _PASSWORD_RESET_TOKENS[reset_token] = {
            "username": admin["username"],
            "expiresAt": datetime.now(timezone.utc).timestamp() + RESET_TOKEN_TTL_MIN * 60,
            "used": False,
        }
        logger.info("[password-reset] Link for %s: /admin/reset?token=%s (expires in %d min)", email, reset_token, RESET_TOKEN_TTL_MIN)
    return {"ok": True}


@api.post("/auth/reset-password")
async def auth_reset_password(payload: ResetPasswordIn):
    entry = _PASSWORD_RESET_TOKENS.get(payload.token)
    if not entry or entry.get("used"):
        raise HTTPException(status_code=400, detail="Invalid or used reset link")
    if datetime.now(timezone.utc).timestamp() > entry["expiresAt"]:
        _PASSWORD_RESET_TOKENS.pop(payload.token, None)
        raise HTTPException(status_code=400, detail="Reset link has expired")
    admin = _read_admin()
    if not admin or admin.get("username") != entry["username"]:
        raise HTTPException(status_code=404, detail="Admin record not found")
    admin["password"] = _hash_password(payload.newPassword)
    admin["firstLogin"] = False
    admin["passwordUpdatedAt"] = datetime.now(timezone.utc).isoformat()
    _write_admin(admin)
    entry["used"] = True
    return {"ok": True}


@api.post("/auth/logout")
async def auth_logout(_current: Dict[str, Any] = Depends(get_current_admin)):
    # Stateless JWT — client is expected to drop the token. This endpoint exists
    # so the frontend can call it consistently and we can log out server-side later if needed.
    return {"ok": True}


# ─────────────────────────────────────────────
#  MIRROR NOTIFY  — Scouting Mode email hook
# ─────────────────────────────────────────────
NOTIFY_PATH = DATA_DIR / "notifications_queue.json"


class NotifyIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    email: str = Field(min_length=3, max_length=254)
    visitorDna: str = Field(default="", max_length=12)
    nodeId: str = Field(default="", max_length=120)
    nodeLabel: str = Field(default="", max_length=200)


@api.post("/notify")
async def submit_notify(payload: NotifyIn):
    """
    Scouting Mode email hook.
    Saves email + 12-bit DNA + nodeId to notifications_queue.json.
    Idempotent per (email, dna) pair — no duplicate entries.
    """
    email = payload.email.strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(status_code=422, detail="Enter a valid email address")

    dna = (payload.visitorDna or "").strip().upper()[:7]  # Accept 6 or 7 chars
    rows = read_json(NOTIFY_PATH, []) or []

    # Idempotent — same (email, dna) combo won't be double-stored
    if any(r.get("email") == email and r.get("visitorDna") == dna for r in rows):
        return {"ok": True, "alreadyQueued": True}

    rec = {
        "id": f"ntf_{int(datetime.now(timezone.utc).timestamp() * 1000)}_{secrets.token_hex(3)}",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "email": email[:254],
        "visitorDna": dna,
        "nodeId": payload.nodeId.strip()[:120],
        "nodeLabel": payload.nodeLabel.strip()[:200],
        "status": "queued",
        "unsubscribeToken": secrets.token_urlsafe(32),
        "humanReadable": {
            "profession": {"A": "Corporate/MNC", "B": "Govt/PSU", "C": "Startup/SME", "D": "Freelance/Own"}.get(dna[0] if dna else "?", "?"),
            "stream":     {"A": "STEM/Science", "B": "Commerce", "C": "Arts/Humanities", "D": "Vocational"}.get(dna[1] if len(dna) > 1 else "?", "?"),
            "experience": {"A": "0-2 yrs", "B": "3-5 yrs", "C": "6-10 yrs", "D": "10+ yrs"}.get(dna[2] if len(dna) > 2 else "?", "?"),
            "admission":  {"A": "Merit", "B": "Entrance Exam", "C": "Donation/Quota", "D": "Other"}.get(dna[3] if len(dna) > 3 else "?", "?"),
            "marks":      {"A": "90%+", "B": "Above 80%", "C": "60-80%", "D": "Below 60%"}.get(dna[4] if len(dna) > 4 else "?", "?"),
            "location":   {"A": "Metro", "B": "Tier-2", "C": "Small Town", "D": "Rural"}.get(dna[5] if len(dna) > 5 else "?", "?"),
            "salary":     {"A": "< ₹6 LPA", "B": "₹6-15 LPA", "C": "₹15-40 LPA", "D": "₹40 LPA+"}.get(dna[6] if len(dna) > 6 else "A", "Not captured"),
        } if dna else {},
    }
    rows.append(rec)
    write_json(NOTIFY_PATH, rows)
    logger.info("[notify] %s queued for DNA=%s node=%s", email, dna, payload.nodeId)
    return {"ok": True, "id": rec["id"]}


# ─────────────────────────────────────────────
#  UNSUBSCRIBE — one-click via token in email
# ─────────────────────────────────────────────
@api.get("/unsubscribe/{token}")
async def unsubscribe(token: str):
    """
    Public endpoint — no auth required.
    Used in notification email footers:
      GET /api/unsubscribe/<unsubscribeToken>
    Marks the record status = "unsubscribed". Future campaigns skip these.
    Always returns success to prevent token enumeration.
    """
    if not token or len(token) < 16:
        raise HTTPException(status_code=400, detail="Invalid unsubscribe token")

    rows: list = read_json(NOTIFY_PATH, [])
    matched = False
    for row in rows:
        if row.get("unsubscribeToken") == token and row.get("status") != "unsubscribed":
            row["status"] = "unsubscribed"
            row["unsubscribedAt"] = datetime.now(timezone.utc).isoformat()
            matched = True
            break

    if matched:
        write_json(NOTIFY_PATH, rows)
        logger.info("[unsubscribe] token=%s… marked unsubscribed", token[:8])

    # Always return success — don't leak whether token exists
    return {"ok": True, "message": "You have been unsubscribed from Career Records notifications."}


# ─────────────────────────────────────────────
#  ADMIN — notification queue viewer
# ─────────────────────────────────────────────
@api.get("/admin/notifications")
async def get_notifications(
    status: str = "",
    limit: int = 100,
    _admin=Depends(get_current_admin),
):
    """
    Admin-only: list all entries in notifications_queue.json.
    ?status=queued|unsubscribed|sent  (empty = all)
    Returns counts + sorted results (newest first).
    """
    rows: list = read_json(NOTIFY_PATH, [])
    if status:
        rows = [r for r in rows if r.get("status") == status]
    rows_sorted = sorted(rows, key=lambda r: r.get("createdAt", ""), reverse=True)
    return {
        "total":        len(rows_sorted),
        "queued":       sum(1 for r in rows_sorted if r.get("status") == "queued"),
        "unsubscribed": sum(1 for r in rows_sorted if r.get("status") == "unsubscribed"),
        "results":      rows_sorted[:max(1, min(limit, 500))],
    }



# ─────────────────────────────────────────────
#  MIRROR DEEP-LINK — fetch interview by ID
# ─────────────────────────────────────────────
@api.get("/interview/{interview_id}")
async def get_interview_by_id(interview_id: str):
    """
    Used by VideoPlayerPage deep-link: /mirror/:interviewId?seg=...&dna=...
    Returns full interview record + all its segments.
    """
    for iv in all_interviews():
        if str(iv.get("id") or "") == interview_id:
            # Attach DNA to every segment for the player
            dna = iv.get("dna") or encode_interview_dna(iv)
            segments_with_dna = [
                segment_to_clip(iv, seg)
                for seg in (iv.get("segments") or [])
            ]
            return {**iv, "dna": dna, "clips": segments_with_dna}
    raise HTTPException(status_code=404, detail=f"Interview '{interview_id}' not found")


# ─────────────────────────────────────────────
#  REGISTER + CORS
# ─────────────────────────────────────────────
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_log():
    _seed_admin_if_needed()
    logger.info("Career Records API ready — data dir: %s", DATA_DIR)
