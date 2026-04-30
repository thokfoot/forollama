# Career Records Of India — Backend Architecture
### server.py · FastAPI · Flat-file JSON storage · **Rev 6 — 28 Apr 2026**

---

## 1. TECH STACK

| Layer | Technology |
|---|---|
| Framework | **FastAPI** (Python 3.10+) |
| ASGI Server | Uvicorn (production) |
| Auth | **bcrypt** password hashing + **PyJWT** (HS256, 24h TTL) |
| Storage | **Flat-file JSON** — no database, all data in `/backend/data/*.json` |
| CORS | `starlette.middleware.cors.CORSMiddleware` — configurable via `CORS_ORIGINS` env var |
| Config | `.env` file loaded via `python-dotenv` |
| File Safety | Atomic writes (write to `.tmp` → rename) + `threading.Lock()` |

---

## 2. DIRECTORY STRUCTURE

```
backend/
├── server.py              ← Single-file FastAPI app (~1200 lines)
├── .env                   ← JWT_SECRET, ADMIN_USER, ADMIN_PASS, CORS_ORIGINS
└── data/
    ├── admin.json                 ← Admin credentials (bcrypt hash)
    ├── interviews.json            ← Interview records + segments
    ├── nodes.json                 ← Career tree nodes + relatedNodeMap
    ├── layoutConfig.json          ← Visual layout positions per node
    ├── siteConfig.json            ← Flipper titles, brand text, footer links
    ├── journeySubmissions.json    ← 6-chapter scanner submissions
    ├── demands.json               ← Interview demand requests
    ├── notifications_queue.json   ← Scouting Mode email subscriptions (NEW)
    ├── contact.json               ← Contact form messages
    ├── newsletter.json            ← Newsletter subscriptions
    ├── videos.json                ← (Legacy/unused, empty)
    └── treeLayout.json            ← Alternative layout config
```

> **Frontend tree source:** `../frontend/src/data/careers.json` — served via `GET /api/careers/public`

---

## 3. DATA MODELS

### 3.1 `interviews.json` — Array of Interview objects

```json
{
  "id": "banker-a1",                          // Unique interview ID
  "title": "Retail Banker: Tier-2 to Branch Manager Track",
  "professionalId": "banker_a1",
  "professionalName": "Ravi",
  "nodeId": "p_fj_govt",                      // Primary career tree node
  "professionId": "p_fj_govt",
  "persona": "Public sector banker, 12 years experience",
  "dna": "BDDADB",                            // Pre-computed 6-char DNA string
  "_dna_legend": {                            // Human-readable decode (admin ref)
    "pos0_profession": "B=Govt/PSU",
    "pos1_stream": "D=Vocational/Other",
    "pos2_experience": "D=10+ yrs",
    "pos3_admission": "A=Merit",
    "pos4_marks": "D=Below 60%",
    "pos5_location": "B=Tier-2"
  },
  "background": {
    "marks": "below_60",                      // gold_medalist|above_80|60_80|below_60
    "entry": "merit",                         // merit|entrance|donation|lateral
    "stream": "",                             // pcm|commerce|arts|engineering|etc
    "experience_years": 12,
    "location": ""
  },
  "youtubeUrl": "https://www.youtube.com/watch?v=xxx",
  "videoId": "dQw4w9WgXcQ",                   // YouTube video ID
  "durationSec": 2860,
  "segments": [
    {
      "phase": "stream_choice",               // Segment identifier/label
      "nodeId": "s_after10th",               // Which career tree node this maps to
      "start": 36,                           // Start timestamp (seconds)
      "end": 212                             // End timestamp (seconds)
    }
  ]
}
```

**Standard phases:** `stream_choice`, `admission_reality`, `academic_record`, `college_mistakes`, `first_job_reality`, `career_reflection`

---

### 3.2 `nodes.json` — Career Tree Nodes

```json
{
  "version": 1,
  "nodes": [
    {
      "id": "p_fj_govt",           // Unique node ID (used everywhere as FK)
      "label": "Govt / PSU",       // Display label
      "stage": "student",          // "student" | "professional"
      "level": 0
    }
  ],
  "relatedNodeMap": {              // Adjacency map: parent → [children]
    "p_first_job": ["p_fj_corporate", "p_fj_startup", "p_fj_govt", "p_fj_family"]
  }
}
```

**Total nodes:** ~65 nodes covering Student path (s_*) and Professional path (p_*)

---

### 3.3 `demands.json` — Interview Demand Requests

```json
{
  "id": "dem_1777147906441_o8l0rt",       // dem_<timestamp>_<hex>
  "createdAt": "2026-04-25T20:11:46Z",   // ISO 8601 UTC
  "nodeId": "s_arts_upsc",               // Which node was requested
  "nodeLabel": "UPSC Civil Services Route",
  "visitorDna": "ACBDCB",                // 6-char encoded DNA (may be absent in old records)
  "source": "auto"                       // "auto" | "manual" | "scouting_overlay"
}
```

---

### 3.4 `notifications_queue.json` — Scouting Mode Email Hook (NEW)

```json
{
  "id": "ntf_1777372000000_abc123",
  "createdAt": "2026-04-28T10:00:00Z",
  "email": "user@example.com",
  "visitorDna": "ACBDCB",
  "nodeId": "s_arts_upsc",
  "nodeLabel": "UPSC Civil Services Route",
  "status": "queued",
  "unsubscribeToken": "Xt7kR3...",   // secrets.token_urlsafe(32) — for one-click unsubscribe link
  "humanReadable": {
    "profession": "Corporate/MNC",
    "stream": "Arts/Humanities",
    "experience": "3-5 yrs",
    "admission": "Donation/Quota",
    "marks": "60-80%",
    "location": "Tier-2"
  }
}
```

**Idempotent:** Same (email + dna) pair will NOT create a duplicate record.

---

### 3.5 `journeySubmissions.json` — Scanner Submissions

```json
{
  "id": "sub_<timestamp>_<hex>",
  "submittedAt": "2026-04-28T19:01:20Z",
  "status": "pending",
  "source": "public-form",
  "data": {
    "background": {
      "stream": "pcm",
      "location": "",
      "marks": "",
      "entry": "",
      "current_stage": "working",
      "uturn_intent": "pivot",
      "industry": "",            // Livelihood path only
      "experience_tier": "",    // Livelihood path only (0_2|3_5|5_10|10plus)
      "switch_intent": "",      // Livelihood path only
      "salary_range": ""        // Livelihood path only — DNA Pos 6 (<6L|6_to_15|15_to_40|>40L)
    },
    "timeline": [{ "year": "", "phase": "", "event": "", "type": "job" }],
    "salaries": [{ "phase": "", "range": "", "optional": true }],
    "failures": [""],
    "lessons": [""],
    "misunderstandings": { "at18": "", "at22": "", "at25": "" },
    "lens": "student",           // "student" | "livelihood" — controls DNA weight table
    "matchingBridge": {
      "stream": "pcm",
      "profession": "corporate",  // Derived from industry (livelihood) or timeline (student)
      "experience": 3,            // Derived from experience_tier or timeline years
      "marks": "",
      "entry": "",
      "lens": "student",
      "current_stage": "working",
      "switch_intent": ""
    }
  }
}
```

---

### 3.6 `admin.json` — Admin Credentials

```json
{
  "username": "admin",
  "password": "$2b$10$...",      // bcrypt hash (rounds=10)
  "email": "admin@example.com",  // Recovery email
  "firstLogin": false,
  "createdAt": "2026-04-01T00:00:00Z",
  "passwordUpdatedAt": "2026-04-28T10:00:00Z"
}
```

---

### 3.7 `contact.json` / `newsletter.json`

```json
// contact.json entry
{
  "id": "ct_<timestamp>_<hex>",
  "createdAt": "...",
  "name": "Ankur",
  "email": "ankur@example.com",
  "message": "...",
  "status": "new"
}

// newsletter.json entry
{
  "id": "ns_<timestamp>_<hex>",
  "createdAt": "...",
  "email": "user@example.com",
  "source": "footer"
}
```

---

## 4. THE 12-BIT DNA MATCHING SYSTEM

### 4.1 DNA String Format

```
Position:  0          1          2           3           4           5         6
Dimension: Profession Stream     Experience  Admission   Marks       Location  Salary
Wt-Pro:    30%        10%        25%         10%         5%          0%        20%
Wt-Stu:    20%        20%        20%         20%         20%         0%         0%
           A=Corp/MNC A=STEM     A=0-2yr     A=Merit     A=90%+      A=Metro   A=<6 LPA
           B=Govt/PSU B=Commerce B=3-5yr     B=Entrance  B=Above 80% B=Tier-2  B=6-15 LPA
           C=Startup  C=Arts     C=6-10yr    C=Donation  C=60-80%    C=SmTown  C=15-40 LPA
           D=Freelanc D=Vocat    D=10+yr     D=Other     D=Below 60% D=Rural   D=40 LPA+
```

Example: `"AAACDBA"` = Corporate + STEM + 0-2yr + Donation + Below 60% + Tier-2 + 6-15 LPA

> **Location (pos 5) weight = 0%** — captured for future use.
> **Salary (pos 6) weight = 0% for Student lens, 20% for Professional lens.**
> **Old 6-char DNA strings remain valid** — pos 6 defaults to `'A'` (<6 LPA) for backward compat.

---

### 4.2 Score Calculation

```python
# ── CATEGORICAL positions: exact-match only (no partial credit) ──
# Rationale: Corporate vs Startup is NOT a partial overlap — it is a fundamentally
# different life path. Ordinal distance scoring was semantically wrong.
_CATEGORICAL_POSITIONS = {0, 1}  # Profession + Stream

# ── Per-lens weight tables (NEW Rev 5) ──
# Student weights: all 5 active dims equal (20% each)
# Professional weights: Profession (40%) + Experience (30%) dominant
STUDENT_WEIGHTS      = [0.20, 0.20, 0.20, 0.20, 0.20, 0.00]
PROFESSIONAL_WEIGHTS = [0.40, 0.10, 0.30, 0.10, 0.10, 0.00]
DNA_WEIGHTS          = [0.40, 0.20, 0.20, 0.10, 0.10, 0.00]  # legacy default

_DIST_SCORE = {0: 1.00, 1: 0.50, 2: 0.20, 3: 0.00}  # ordinal positions only

# calculate_match_score(visitor_dna, professional_dna, weights=None)
# weights=None → uses DNA_WEIGHTS (legacy). Pass STUDENT_WEIGHTS or
# PROFESSIONAL_WEIGHTS based on the visitor's chosen lens.
for i, weight in enumerate(resolved_weights):
    if i in _CATEGORICAL_POSITIONS:
        score += weight if visitor_dna[i] == professional_dna[i] else 0.0
    else:
        dist = abs(ord(visitor_dna[i]) - ord(professional_dna[i]))
        score += _DIST_SCORE[dist] * weight
# Result: 0.0 to 1.0
```

**Scoring behaviour by position:**

| Pos | Dimension | Student Weight | Pro Weight | Mode | Rationale |
|---|---|---|---|---|---|
| 0 | Profession | 20% | **30%** | **Categorical** | Corporate ≠ Startup — different worlds |
| 1 | Stream | 20% | 10% | **Categorical** | Science ≠ Commerce — foundational split |
| 2 | Experience | 20% | **25%** | Ordinal | 0-2yr → 3-5yr is a partial overlap |
| 3 | Admission | 20% | 10% | Ordinal | Merit → Entrance is adjacent |
| 4 | Marks | 20% | 5% | Ordinal | Irrelevant for experienced professionals |
| 5 | Location | 0% | 0% | Ignored | Captured but not scored yet |
| **6** | **Salary** | **0%** | **20%** | **Ordinal** | **Economic Reality Mirror — NEW Rev 6** |

**Match grades:**

| Score | Grade |
|---|---|
| ≥ 0.85 | A+ |
| ≥ 0.70 | A |
| ≥ 0.55 | B |
| ≥ 0.35 | C |
| < 0.35 | D |

---

### 4.3 Tiered Matching (clips_matching_mirror)

```
Tier 1: matchScore ≥ 0.60  → isPartialMatch: false   (full match)
Tier 2: 0.50 ≤ score < 0.60 → isPartialMatch: true   (amber badge in UI)
No match: score < 0.50      → returns []              (Scouting Mode triggered)
```

If no visitor DNA is provided → returns all clips unscored (legacy browse mode).

---

### 4.4 Node Alias Resolution

Some old node IDs are aliased to new canonical IDs. This prevents "missing clips" bugs when segments reference a renamed node.

```python
NODE_MATCH_ALIASES = {
    "s_after10th":   ["s_10th_decision"],
    "s_12_drop":     ["s_drop_year"],
    "s_12_college":  ["s_12th_entrance"],
    "s_placement":   ["s_internships", "s_after_degree"],
    "p_firstjob":    ["p_first_job"],
    "p_10_lead":     ["p_5_10_senior"],
    "p_money_planning": ["p_money_reality"],
}
```

`reverse_aliases_for(node_id)` returns all equivalent IDs — used when looking up clips.

---

## 5. API ENDPOINTS — FULL REFERENCE

### Public Endpoints (no auth required)

| Method | Path | Description |
|---|---|---|
| GET | `/` | Health ping `{"name": "CRI", "ok": true}` |
| GET | `/api/health` | `{"ok": true, "ts": "<iso>"}` |
| GET | `/api/config` | Site config: flipper titles, brand, footer, mobile entry |
| GET | `/api/careers/public` | Full careers.json tree (frontend source of truth) |
| GET | `/api/nodes` | nodes.json — `{nodes: [], relatedNodeMap: {}}` |
| GET | `/api/layout-config` | layoutConfig.json |
| GET | `/api/tree-layout` | Alias for `/api/layout-config` |
| GET | `/api/videos/for-node/:node_id` | All clips for a node (unscored) |
| GET | `/api/clips?nodeId=` | Same as above (alias) |
| GET | `/api/video-counts` | `{nodeId: clipCount}` map for entire tree |
| GET | `/api/path-clips` | **Main matching endpoint** — see details below |
| GET | `/api/visitor-mirror-nodes` | Nodes where interviewees match `marks`+`entry` |
| GET | `/api/interview/:interview_id` | **NEW** — Single interview + all clips for deep-link |
| POST | `/api/submit-journey` | Save 6-chapter scanner submission |
| POST | `/api/demand` | Post interview demand (auto or manual) |
| POST | `/api/notify` | **NEW** — Scouting Mode email subscription |
| GET | `/api/unsubscribe/{token}` | **NEW** — One-click unsubscribe (public, no auth, safe for email footers) |
| POST | `/api/contact` | Contact form (name, email, message) |
| POST | `/api/newsletter` | Newsletter signup (email only) |
| POST | `/api/auth/login` | Admin login → returns JWT |
| POST | `/api/auth/forgot-password` | Initiate password reset (logs token) |
| POST | `/api/auth/reset-password` | Complete password reset with token |

### Admin Endpoints (Bearer JWT required)

| Method | Path | Description |
|---|---|---|
| GET | `/api/auth/me` | Returns `{admin: {username, email, firstLogin}}` |
| POST | `/api/auth/change-password` | Updates bcrypt hash + optionally sets recovery email |
| POST | `/api/auth/logout` | Stateless — client drops token; logged server-side |
| GET | `/api/demands/stats` | Aggregated demand analytics |
| GET | `/api/admin/notifications` | **NEW** — List notification queue (`?status=queued\|unsubscribed`) |

---

### `GET /api/path-clips` — Detailed

**Query params:**

| Param | Type | Description |
|---|---|---|
| `path` | string | Comma-separated node IDs (full path) |
| `currentNode` | string | The active node ID |
| `marks` | string | `gold_medalist\|above_80\|60_80\|below_60` |
| `entry` | string | `merit\|entrance\|donation\|lateral` |
| `stream` | string | `pcm\|commerce\|arts\|engineering\|etc` |
| `experience` | int | Years of experience |
| `location` | string | City or tier |
| `visitorDna` | string | Pre-encoded 6-char DNA (skips re-encoding) |
| `strict` | string | Any value = strict mode (currently unused) |
| `lens` | string | **NEW** `student\|livelihood` — selects weight table for scoring |

**Response:**
```json
{
  "currentClips": [...],   // Matched clips for currentNode
  "historyClips": [...],   // Matched clips for last 3 path nodes
  "visitorDna": "ACBDCB"  // Encoded DNA used for matching
}
```

Each clip object:
```json
{
  "id": "banker-a1__stream_choice",
  "youtubeId": "dQw4w9WgXcQ",
  "title": "Retail Banker...",
  "profession": "Public sector banker",
  "professionalName": "Ravi",
  "phase": "stream_choice",
  "nodeId": "s_after10th",
  "start": 36,  "end": 212,
  "startSec": 36, "endSec": 212,
  "verdict": "",
  "tags": [],
  "background": { "marks": "below_60", "entry": "merit", ... },
  "dna": "BDDADB",
  "matchScore": 0.72,        // Only when visitor DNA matched
  "matchGrade": "A",         // Only when matched
  "isPartialMatch": false    // true if Tier 2 (50-59%)
}
```

---

### `GET /api/demands/stats` — Response

```json
{
  "totalRequests": 42,
  "uniqueNodes": 8,
  "topNodes": [
    {
      "nodeId": "s_arts_upsc",
      "nodeLabel": "UPSC Civil Services Route",
      "requests": 12,
      "lastRequestedAt": "2026-04-28T..."
    }
  ],
  "topDnaProfiles": [
    {
      "dna": "ACBDCB",
      "requests": 7,
      "lastRequestedAt": "2026-04-28T...",
      "humanReadable": {
        "profession": "Corporate/MNC",
        "stream": "Arts/Humanities",
        "experience": "3-5 yrs",
        "admission": "Donation/Quota",
        "marks": "60-80%",
        "location": "Tier-2"
      }
    }
  ]
}
```

---

## 6. AUTH SYSTEM

### Flow
```
User submits (username + password)
  → bcrypt.checkpw(plain, stored_hash)
  → On success: jwt.encode({sub, role, iat, exp}, JWT_SECRET, HS256)
  → Token returned to frontend (stored in localStorage as cr_admin_token)
  → Protected endpoints: Bearer token in Authorization header
  → jwt.decode validates signature + expiry
```

### Brute-force Protection
- **5 failed attempts** per `{ip}:{username}` in **15 minutes** → **429 lockout**
- Tracked in-memory (`_LOGIN_ATTEMPTS` dict — resets on server restart)
- IP extracted from `X-Forwarded-For` header (proxy-aware)

### Password Reset
- `POST /api/auth/forgot-password` — generates a `secrets.token_urlsafe(24)` token, stores it in-memory with 15-min TTL, logs the reset URL (no email sending yet)
- `POST /api/auth/reset-password` — validates token, updates bcrypt hash, marks token as used
- Tokens expire after 15 minutes or after first use

### Admin Seeding
On startup, if `admin.json` is missing or empty, admin is auto-created from env vars:
```
ADMIN_USER=admin       (default: "admin")
ADMIN_PASS=admin123    (default: "admin123")
```
`firstLogin: true` flag is set — frontend prompts password change on first login.

---

## 7. FILE I/O SAFETY

```python
def write_json(path, data):
    with _FILE_LOCK:               # threading.Lock() — one write at a time
        tmp = path.with_suffix(".json.tmp")
        with tmp.open("w") as f:
            json.dump(data, f, indent=2)
        tmp.replace(path)          # Atomic rename — no partial writes
```

All reads use `read_json(path, default)` which returns `default` if file missing or corrupt — server never crashes on missing data files.

---

## 8. ENVIRONMENT VARIABLES

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | `dev-secret-change-me` | HS256 signing key — **change in production** |
| `ADMIN_USER` | `admin` | Initial admin username (seeding only) |
| `ADMIN_PASS` | `admin123` | Initial admin password (seeding only) |
| `CORS_ORIGINS` | `*` | Comma-separated allowed origins |

---

## 9. STARTUP SEQUENCE

```
@app.on_event("startup")
  1. _seed_admin_if_needed()  — creates admin.json if missing
  2. logger.info("API ready — data dir: /backend/data")
```

---

## 10. KEY CONSTANTS (easy to tune)

| Constant | Value | Location | Purpose |
|---|---|---|---|
| `_TIER1_THRESHOLD` | `0.60` | server.py | Strong match cutoff |
| `_TIER2_THRESHOLD` | `0.50` | server.py | Partial match cutoff |
| `_CATEGORICAL_POSITIONS` | `{0, 1}` | server.py | Profession + Stream use exact-match only |
| `DNA_WEIGHTS` | `[0.40, 0.20, 0.20, 0.10, 0.10, 0.00]` | server.py | Per-dimension score weights |
| `JWT_EXPIRY_HOURS` | `24` | server.py | Token lifetime |
| `RESET_TOKEN_TTL_MIN` | `15` | server.py | Password reset window |
| `_LOCKOUT_WINDOW_SEC` | `900` (15 min) | server.py | Brute-force tracking window |
| `_LOCKOUT_THRESHOLD` | `5` | server.py | Max failed attempts before 429 lockout |

---

## 11. ADDING A NEW INTERVIEW (Step-by-step)

1. Open `backend/data/interviews.json`
2. Add a new object with:
   - Unique `id` (e.g. `"teacher-c1"`)
   - `videoId` — YouTube video ID (11 chars after `?v=`)
   - `dna` — compute using the DNA table in Section 4.1
   - `background` — `marks`, `entry`, `stream`, `experience_years`, `location`
   - `segments` — each with `phase`, `nodeId` (must match a node in nodes.json), `start`, `end` (seconds)
3. No server restart needed — server reads the file on every request

> **Tip:** Use `_dna_legend` field (not read by server) to document your DNA reasoning for future maintainers.
