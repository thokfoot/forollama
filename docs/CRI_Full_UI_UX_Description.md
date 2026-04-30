# Career Records Of India — Complete UI/UX in Words
### Every page. Every element. Every interaction.
### ✅ RESOLVED — Updated to match actual implementation (**Rev 6 — 28 Apr 2026 — Salary DNA Pos 6 + Economic Reality Mirror**)

---

## GLOBAL ELEMENTS (Present on all pages)

### Navbar (Top Bar)
The navbar is a thin horizontal bar fixed to the top of every page. It never moves as you scroll. It has a dark, semi-transparent background with a slight blur effect so the page content shows faintly through it.

**Left side of navbar:**
- A small square icon (the logo) — dark background with a glowing golden border. Inside it is a tiny geometric mark representing the brand.
- Next to the icon, in bold serif font: **"Career Records Of India"**
- Directly below the brand name, in tiny spaced-out uppercase letters: **"REAL CAREERS · REAL JOURNEYS"**

**Right side of navbar:**
- A single square button showing three horizontal lines (the hamburger icon). Clicking it opens a dropdown menu panel.

**Bottom edge of navbar:**
- A very thin teal/cyan glowing line runs across the full width — this is the progress indicator (only visible on certain pages).

---

### Custom Cursor (Desktop only)
On desktop, the default browser cursor is replaced by a custom one:
- A tiny filled dot (7px circle) — teal colored by default
- A larger hollow ring (30px circle) around it, following with a slight delay
- When hovering over a clickable button or tile: the dot and ring turn **gold (`#CDB88A`)** and the ring grows to 44px — consistent with the Archival Documentary theme
- When clicking: the dot briefly shrinks

> **Rev 2 change:** Hover color changed from pink/magenta (`#F472B6`) to site-gold (`#CDB88A`). Pink felt tonally inconsistent ("Vaporwave") with the archival aesthetic.

---

### Hamburger Menu Panel
Clicking the three-line button in the top-right of the navbar opens a floating panel on the right side of the screen. It slides in from above.

**Contents of the menu panel:**
- **Brand block** at top: Shows "CR" initials in a gold square, then "Career Records Of India" in bold, then: "Real journeys, real numbers, no fluff."
- **Navigation links:**
  - "Home" — goes to the landing page
  - "Map your path" — goes to the scanner entry
  - "Contact us" — goes to the contact page
- **Disclaimer text:** "This platform documents experiences, not recommendations. Your path will be different."
- **Footer row:** "© 2026 Career Records Of India" on the left, "Admin" link on the right (restricted access)
- **Each link** has a small gold arrow that appears on hover, pointing right

---

## PAGE 1: LANDING / HOME PAGE (`/`)

### What it is:
The first page anyone sees. It is dark, cinematic, and minimal. The background is a deep near-black (`#07060c`) with an atmospheric aurora backdrop — a faint dot grid, radial gold/indigo/ember bloom layers, animated constellation glow dots, a central golden bloom focal pool, a vignette, and a subtle film grain overlay.

### Layout (top to bottom):

**Phase 1 — Identity Flipper (Cinematic Title Sequence):**
- Center of the screen
- Small uppercase text: **"— Career Records Of India —"**
- Italic text: "a record of every"
- A large bold title word (gold gradient text) that cycles through exactly **6 titles**: DOCTOR, ENGINEER, SCIENTIST, ARTIST, ENTREPRENEUR, OFFICER — each word flipping in/out every **320ms** for **~1.95 seconds** total (6 × 320ms = 1920ms + 30ms breathing room)

> **Rev 2 change:** Title list trimmed from 8 → 6 (removed DESIGNER and TEACHER). At 320ms/word, 8 titles = 2.56s which exceeded the 1.7s intro window — the last 2 titles were never seen. 6 titles fit precisely in the 1.7–2.0s sweet spot. `flipDuration` updated from 1700ms → 1950ms to match.
- **Session guard:** The flip sequence plays **once per browser session** only (`sessionStorage` key `cri_intro_played`). On return visits within the same session, the user lands directly on the CTA phase — no repeat animation.
- Italic text below: "that ever lived in India."
- A thin gold progress hairline animates left-to-right below the title block during the flip
- **Skip button** at the bottom: "Skip intro" — tapping it or pressing Space/Enter jumps straight to the CTA phase

> **Desktop:** Users can click anywhere or press Space/Enter to skip.
> **Mobile:** Users see "tap anywhere to skip" hint text.

**Phase 2 — CTA Phase (after flip completes or is skipped):**
- Small uppercase eyebrow: **"— An interactive documentary —"**
- Large bold headline (gold gradient): **"Every path is someone's real story."**
  - On mobile, body description becomes: "Anonymous stories from people who've actually been there."
- A thin decorative gold horizontal rule
- Body text: "Real journeys from Indians who've actually walked the path — hostels, exam halls, first jobs, regrets, pivots. Anonymous, honest, unfiltered."
- A big golden pill-shaped button: **"Begin the journey →"** — clicking this starts the career identity scanner
  - On hover (desktop): button rises slightly (`y: -3`)
  - A shine sweep animation plays once on load
- If a previous chapter position is saved in localStorage, a **secondary "Resume last chapter"** glass card appears below the primary CTA

**Desktop: Corner Archival Testimonial Slips**
- After the flip phase, four archival quote panels appear in the four corners of the screen (hidden on mobile)
- Each panel shows a real quote, person's name, role, and a colored dot (red for regret, green for no regret)
- The quotes cycle automatically, each corner on its own timer (4.7s, 6.3s, 5.5s, 7.1s)
- The panels fade in/out with a subtle rotate effect

**Mobile: Cycling Testimonial Strip**
- A single testimonial strip at the bottom cycles through the same quotes every 4.5 seconds

**Behavior:**
- All elements animate in with staggered delays
- Corner bracket decorations appear in all four corners (desktop only, hidden on short screens)
- `data-testid="hero-primary-cta"` on the primary CTA button

---

## PAGE 2: QUICK ENTRY SCREEN ("Chapter Zero")

### What it is:
After clicking "Begin the Journey," you land on this selection screen. It sits inside the same dark layout with the navbar at top.

### Layout:
- **Top center:** Small uppercase text: **"CHAPTER ZERO"**
- **Below that, large bold question:** **"Where do you find yourself right now?"**
- **Below the question:** A small instruction: "Pick the lens that fits your life today. You can change it later."

**Two large cards side by side:**

**Left card — "For Students":**
- A full-bleed photo background showing a desk/study setup
- Red dot label in top-left corner: **"SCHOOL TO FIRST DECISIONS"** and "01"
- Bold text at bottom: **"For Students"**
- Description: "Streams, college choices, internships and the first major fork in the road — told by people who've walked it."
- A circular arrow button at bottom-right: **"TAP TO ENTER"**

**Right card — "For Earning Livelihood":**
- A full-bleed photo background showing a professional setting
- Red dot label in top-left corner: **"JOB HOLDERS, FREELANCERS, BUSINESS OWNERS"** and "02"
- Bold text at bottom: **"For Earning Livelihood"**
- Description: "Real career switches, salary truths, side hustles and the regrets nobody puts on LinkedIn."
- A circular arrow button at bottom-right: **"TAP TO ENTER"**

**Below both cards:**
- A small centered search-style button: **"Browse all careers"** — this takes you directly to the career tree without going through the scanner

**Behavior:**
- Clicking either card immediately loads the scanner with the relevant question set
- Each card has a subtle glow/brightness animation on hover

---

## PAGE 3: THE SCANNER — JOURNEY MAPPER (`/submit`)

### What it is:
This is the core identity-capture experience. It is a 6-step questionnaire designed to fit on one screen with NO scrolling. It feels like a film projector — one question at a time, centered on the screen.

### Layout (permanent structure, present on all 6 chapters):

**TOP STRIP (progress bar area):**
- Far left: A small glowing teal dot (●) followed by the chapter theme in uppercase — e.g., **"● IDENTITY"**, **"● ENTRY"**, **"● MARKS"**, **"● STAGE"**, **"● DIRECTION"**, **"● UNLOCK"**
- Center: A thin horizontal bar (5px tall, teal-to-purple gradient, with a sweeping shimmer animation) — this is the progress bar. It starts at 0% on Chapter 1 and grows to 100% on Chapter 6.
  - **On tile selection:** The progress bar briefly super-flashes (bright teal glow pulse lasting ~280ms) as part of the "Electric Teal Pulse" feedback
- Far right: Step counter — e.g., **"1 / 6"**, **"2 / 6"**, up to **"6 / 6"**

**Electric Teal Pulse Beam (fires on Chapter 6 final submit ONLY):**
- A thin vertical beam (3px wide, gradient from transparent at bottom → bright white-teal at top → transparent) shoots upward from the center of the screen
- It animates from `scaleY: 0` to `scaleY: 1` with a strong teal box-shadow glow, then fades out — total duration ~500ms
- 200ms after the beam fires, the progress bar top strip also flashes (bright glow), then returns to normal at 480ms
- **This fires ONLY once — when the user presses "See my future possibilities" on Chapter 6.** It does NOT fire on tile selections in Chapters 1–5 (removed to prevent visual fatigue)

**MAIN CONTENT AREA (center):**
- A large bold question in white, centered on screen (font size fluid from 1.45rem to 3rem)
- Below the question: A 2×2 grid of four tiles (two columns, two rows) — the **ABCDCard** component

**EACH TILE (ABCDCard):**
- Dark glass background (dark rounded rectangle)
- A large emoji/icon in the center — e.g., ⚗️ for Science, 📊 for Commerce, 🎨 for Arts, ⚙️ for Vocational
- A short text label below the icon
- Grade badge: A, B, C, D for the respective tiles
- On hover: The tile rises slightly
- When selected: The tile glows brightly (teal/green/gold/pink depending on position), the border lights up, an ambient glow spreads behind the icon, and the icon scales up slightly. A colored bar appears at the bottom of the tile
- The tiles animate in one by one with a staggered pop effect when the chapter loads

**HINT TEXT (below the tiles, only when nothing is selected):**
- Very faint small text: **"Tap to select / auto-continues"** (fades in after 0.8s)

**BOTTOM NAVIGATION BAR:**
- Left side: **"← Back"** button — grey pill button, goes to previous chapter. Disabled (faded to 30% opacity) on Chapter 1
- Right side: **"CONTINUE →"** button — teal/dark-green pill button, advances to next chapter manually

**Auto-advance behavior:**
- When you tap a tile, it highlights immediately, and then after **0.8 seconds**, the screen automatically slides to the next chapter. You do NOT need to press Continue.
- **Exception:** On Chapter 5 (Direction), auto-advance goes to Chapter 6 (Unlock). The final submit is always a deliberate button press.

**Misclick-back affordance ("Undo" button):**
- Immediately after tapping a tile, a small pill button `← Undo` fades in below the tile grid
- It remains visible for **1.5 seconds** — the "control not panic" sweet spot
- If tapped, it cancels the pending auto-advance, clears the selection, and lets the user re-choose
- After 1.5s it fades out automatically whether clicked or not

> **Rev 2:** Extended from 1s → 1.8s.
> **Final Directive:** Tuned to **1.5s** — 1s is too tight (mobile thumb covers screen), 2s feels slow. 1.5s is the precise sweet spot confirmed through audit.

**Mobile Swipe Navigation (implemented):**
- **Right swipe** (dx > 55px, horizontal dominant) → **Back** (goes to previous chapter)
- **Left swipe** (dx < -55px, horizontal dominant) → **Next** (goes to next chapter, blocked on the Unlock chapter to prevent accidental swipe-to-submit)
- Vertical swipes are ignored

**Chapter transition animation:**
- When chapters change, the current content fades/slides out upward (`y: -18, opacity: 0, scale: 0.98`) and the new chapter slides in from below (`y: 22, opacity: 0, scale: 0.97`). Duration: 0.38s.

**Draft auto-save:**
- Every 600ms, if any content is present, the form state is saved to `localStorage` under `cr_submit_draft`
- A faint "Draft saved / X minutes ago" pill appears at the bottom of the screen (updates every 30s)
- On revisit, if a draft is found, a "Draft restored" toast briefly appears (disappears after 3s)

---

## CHAPTER DETAILS — LIVELIHOOD PATH (Rev 5 NEW)

> **Note:** Livelihood chapters collect data that directly feeds the highest-weighted DNA dimensions (Profession 40% and Experience 30% in Professional weight table).

### Chapter 1 — INDUSTRY
**Question:** "Which sector do you work in?"
**Four tiles:**
- Top-left (Grade A): 🏢 — **"Corporate / MNC"** (value: `corporate`) → DNA Pos 0 = A
- Top-right (Grade B): 🏛️ — **"Govt / PSU"** (value: `govt`) → DNA Pos 0 = B
- Bottom-left (Grade C): 🚀 — **"Startup / SME"** (value: `startup`) → DNA Pos 0 = C
- Bottom-right (Grade D): 🧑‍💻 — **"Freelance / Own"** (value: `freelance`) → DNA Pos 0 = D

> Categorical scoring: A Corporate banker vs a Startup founder = 0 match on Pos 0. No partial credit.

### Chapter 2 — EXPERIENCE
**Question:** "How long have you been working?"
**Four tiles:**
- Top-left (Grade A): 🌱 — **"0–2 years"** (value: `0_2`) → experience = 0 → DNA Pos 2 = A
- Top-right (Grade B): 📗 — **"3–5 years"** (value: `3_5`) → experience = 3 → DNA Pos 2 = B
- Bottom-left (Grade C): 📘 — **"5–10 years"** (value: `5_10`) → experience = 7 → DNA Pos 2 = C
- Bottom-right (Grade D): 🏆 — **"10+ years"** (value: `10plus`) → experience = 12 → DNA Pos 2 = D

### Chapter 3 — FOUNDATION
**Question:** "Your academic background?"
**Same four tiles as Student Chapter 1 (Stream):** Science / Commerce / Arts / Vocational → DNA Pos 1

### Chapter 4 — ENTRY
**Question:** "How did you enter college?"
**Same four tiles as Student Chapter 2:** Merit / Entrance / Mgmt Quota / Lateral → DNA Pos 3

### Chapter 5 — EARNINGS *(DNA Pos 6 — Ordinal, 20% weight for Professional lens)* **NEW Rev 6**
**Question:** "Your current annual earnings?"
**Four tiles (₹ — Indian LPA brackets):**
- Top-left (Grade A): 🌱 — **"< ₹6 LPA"** (value: `below_6`) → DNA Pos 6 = A · *Just getting started*
- Top-right (Grade B): 💼 — **"₹6–15 LPA"** (value: `6_to_15`) → DNA Pos 6 = B · *Mid-range earnings*
- Bottom-left (Grade C): 📈 — **"₹15–40 LPA"** (value: `15_to_40`) → DNA Pos 6 = C · *Senior / specialist*
- Bottom-right (Grade D): 🏆 — **"₹40 LPA+"** (value: `above_40`) → DNA Pos 6 = D · *Leadership / rare band*

> Ordinal scoring: ₹12 LPA (B) vs ₹8 LPA (B) = full match. ₹8 LPA (B) vs ₹50 LPA (D) = 0.20 partial. A banker's salary range matters more than a student's marks.

### Chapter 6 — UNLOCK *(identical to Student path)*

---

## CHAPTER DETAILS (Student Path)

### Chapter 1 — IDENTITY
**Question:** "Which stream after 10th?"
**Four tiles:**
- Top-left (Grade A): Emoji ⚗️ — **"Science"** (value: `pcm`)
- Top-right (Grade B): 📊 — **"Commerce"** (value: `commerce`)
- Bottom-left (Grade C): 🎨 — **"Arts"** (value: `arts`)
- Bottom-right (Grade D): ⚙️ — **"Vocational"** (value: `other`)

### Chapter 2 — ENTRY
**Question:** "How did you get into college?"
**Four tiles:**
- Top-left (Grade A): 🥇 — **"By Merit"** (value: `merit`)
- Top-right (Grade B): 📝 — **"Entrance Exam"** (value: `entrance`)
- Bottom-left (Grade C): 💳 — **"Mgmt Quota"** (value: `donation_management`)
- Bottom-right (Grade D): ↪️ — **"Lateral / None"** (value: `lateral`)

### Chapter 3 — MARKS
**Question:** "What were your marks like?"
**Four tiles:**
- Top-left (Grade A): ⭐ — **"Top Scorer"** (value: `gold_medalist`)
- Top-right (Grade B): 📈 — **"Above 80%"** (value: `above_80`)
- Bottom-left (Grade C): 📉 — **"Average"** (value: `60_80`)
- Bottom-right (Grade D): 💡 — **"Raw Reality"** (value: `below_60`)

### Chapter 4 — STAGE
**Question:** "Where are you right now?"
**Four tiles:**
- Top-left (Grade A): 🎓 — **"Studying"** (value: `student`)
- Top-right (Grade B): 🚀 — **"Fresh Grad"** (value: `fresher`)
- Bottom-left (Grade C): 💼 — **"Have a Job"** (value: `working`)
- Bottom-right (Grade D): 🔎 — **"Gap / Break"** (value: `gap`)

### Chapter 5 — DIRECTION
**Question:** "Are you looking to change path?"
**Four tiles:**
- Top-left (Grade A): 🔁 — **"Full Change"** (value: `full_uturn`)
- Top-right (Grade B): ⬆️ — **"New Role"** (value: `pivot`)
- Bottom-left (Grade C): 🤭 — **"Exploring"** (value: `exploring`)
- Bottom-right (Grade D): ✅ — **"Going Deeper"** (value: `happy`)

### Chapter 6 — UNLOCK
**Question:** "Ready to see your matches?"

**No tiles here.** Instead, there is a glassmorphic panel (dark frosted-glass box) with:
- **Heading inside panel:** "After scanning you will get:"
- **Three bullet points (gold `>` prefix):**
  - "> Video clips from professionals with a similar background"
  - "> Your 'mirror path' lit up on the career tree"
  - "> Anonymous match to improve public data for everyone"
- **Fine print:** "This exists so **you** see your possibilities - not so others can extract your story." (gold tint)
- **If there was a submission error**, a red alert box appears above the panel

**Bottom navigation on Chapter 6:**
- Left: "← Back" button (same as other chapters)
- Right: **"SEE MY FUTURE POSSIBILITIES →"** — this is the submit button (`data-testid="journey-mapper-submit-button"`). It triggers the DNA Scan overlay and API submission in parallel.

---

## PAGE 4: DNA SCAN OVERLAY (Submission Animation)

### What it is:
When you click "See my future possibilities," the entire screen is taken over by a fullscreen animation.

### What it looks like:
- The background goes almost completely black (93% opacity overlay)
- A glowing green horizontal line slowly sweeps from the TOP of the screen to the BOTTOM — like a scanner laser
- In the center of the screen, centered text pulses through 4 phases:
  - Phase 0: **"Parsing 12-bit identity..."**
  - Phase 1 (250ms): **"Checking admission pathway..."**
  - Phase 2 (450ms): **"Mapping career stage..."**
  - Phase 3 (680ms): **"Building your Mirror Path..."**
- The scan animation runs for at least 820ms (in parallel with the real API call — no fake waiting)
- After the API call completes and the 820ms minimum elapses, the overlay disappears and the success screen appears

---

## PAGE 5: WELCOME BACK SCREEN

### What it is:
If you have previously completed the scanner, the next time you visit `/submit`, this screen appears INSTEAD of Chapter 1. The app remembers your answers using `localStorage` key `cr_saved_profile`.

### What it shows:
- A dark frosted-glass card centered on screen (with backdrop blur and gradient border)
- At the top center: A teal circle with a checkmark icon (animated spring scale-in)
- Small text: **"Identity saved on this device"** (teal, uppercase)
- Bold heading: **"Welcome back 👋"**
- Small text showing the date you first filled: e.g., "Profile set on 28 Apr 2026"
- **Choice chips:** Small pill-shaped tags (teal tint) showing your previous answers with emoji icons:
  - Stream (e.g., "🎓 Science / PCM")
  - Stage (e.g., "📍 Still studying")
  - Marks (e.g., "🏫 90%+")
  - U-turn intent (e.g., "🔄 Full field change")
  - (Only chips with actual saved values are shown)
- **Primary button:** **"See my future possibilities →"** — calls `onCompleteJourney(savedProfile.bridge)` directly, skipping the scanner entirely
- **Secondary button:** **"Update my answers"** — dismisses the Welcome Back screen and shows the lens fork (Chapter Zero) first
- **Text link at very bottom:** **"Reset & start fresh"** — clears `cr_saved_profile`, `cr_submit_draft`, AND `cr_scanner_lens` from localStorage, resets all state, returns to Chapter Zero lens fork

---

## PAGE 6: SUCCESS / SCAN COMPLETE SCREEN

### What it is:
After the DNA scan animation completes and data is submitted successfully, this screen appears.

### What it shows:
- A small centered card (`pw-panel-archival` class) on dark background
- At top: A circular gold/amber icon with a checkmark (`#CDB88A` stroke)
- Small uppercase text in gold: **"Identity scan complete"**
- Large bold heading: **"Your mirror map is ready"**
- Body text: "We matched your background to real career journeys."
- Smaller text in grey: "Open your future map next."
- **If `onCompleteJourney` prop is provided:** A button **"See my future possibilities →"** that calls `onCompleteJourney(submittedBridge)`
- **If no prop:** A `<Link to="/">` button **"Open career map →"** that goes to the home page

---

## PAGE 7: CAREER TREE / INTERACTIVE TIMELINE

### What it is:
The results page. A large, explorable network/tree of career paths that gets "lit up" based on your profile match. This is the most complex page.

### Navbar on this page (different from default):
- Left side: Same brand logo
- Center: A **search bar** appears — placeholder text: "Search career paths…" with a keyboard shortcut hint on the right
- Right side: Share button, Bookmark button, Bookmarks count, menu button

### Main content:
- The entire screen is an interactive map of interconnected circles (nodes) — each circle represents a career stage or decision point
- Nodes are connected by lines showing the path progression
- Some nodes glow more brightly if they match your profile ("Mirror Path" focus mode)
- Clicking any node opens a detail panel ("Fruit Popup" — slides in with node data)

### Career node detail panel ("Fruit Popup"):
- **Desktop:** Floats above the hovered node as a tooltip card (Prize / Price / Voice rows, clip count footer, `pointerEvents: none`)
- **Mobile: Bottom Sheet** — slides up from the bottom of the screen (spring animation, `stiffness: 340, damping: 30`)
  - Full-width panel with `borderRadius: 20px 20px 0 0`
  - **Drag handle pill** at top
  - **× dismiss button** in the header top-right — one-thumb reachable
  - **Scrim behind the sheet** — tapping outside dismisses instantly
  - Larger text (12px body vs 8.5px in tooltip)
  - Action bar says "double-tap to watch" (correct mobile affordance)
  - Respects `env(safe-area-inset-bottom)` for iPhone home indicator

> **Final Directive (Rev 4):** Mobile floating tooltip obscured the tree and was unreachable with one thumb. Replaced with standard bottom sheet pattern (Maps, Zomato, etc.).

### Mirror Video Sidebar (30% panel — right side of MirrorVideoPlayer):
- Lists all matched clips ranked by DNA score
- Each clip row shows: grade badge, optional **"Partial Mirror ⓘ"** amber badge (for clips with `isPartialMatch: true`, i.e. score 50–59%), timestamp, match score bar, demand count
  - The **ⓘ** is a tiny circled-`i` inline in the badge (`cursor: help`). Hovering shows a native tooltip: *"Partial match: this interview shares X of your core traits but not all. Still relevant to your journey."* Uses `seg.matchedTraits` count if provided by backend, otherwise shows "some".
- At the bottom of every segment list (even with matches): a subtle gold ghost button — **"Don't see your exact mirror? Request a specific interview."** — fires a `POST /api/demand` once per session

> **Rev 2 change:** Added inline ⓘ info icon to the amber badge to reduce confusion — users previously saw "Partial Mirror" with no explanation of what partial means.

### Tiered DNA Matching:
- **Tier 1 (strong):** `matchScore ≥ 0.60` → returned normally, `isPartialMatch: false`
- **Tier 2 (partial fallback):** `0.50 ≤ score < 0.60` → returned with `isPartialMatch: true`, amber "Partial Mirror" badge shown in sidebar
- **No match (`score < 0.50`):** Backend returns `[]` → frontend shows **Scouting Mode** instead of blank screen

**DNA Scoring Mode per dimension:**
| Position | Dimension | Weight | Mode |
|---|---|---|---|
| 0 | Profession | 40% | **Categorical** — Corporate ≠ Startup (0 credit on mismatch) |
| 1 | Stream | 20% | **Categorical** — Science ≠ Commerce (0 credit on mismatch) |
| 2 | Experience | 20% | **Ordinal** — adjacent years get partial credit |
| 3 | Admission | 10% | **Ordinal** — Merit → Entrance is adjacent |
| 4 | Marks | 10% | **Ordinal** — 80% → 60-80% is adjacent |
| 5 | Location | 0% | Captured, not yet scored |

> **Final Directive (Rev 4):** Profession and Stream switched from ordinal to categorical scoring. A Corporate/MNC professional's interview has ZERO relevance to a Govt/PSU aspirant — there is no meaningful midpoint. Ordinal distance was logically wrong for these two dimensions.

### Scouting Mode Overlay (shown when no match found):
- Replaces the empty segment list in the sidebar
- A pulsing gold/teal animated `<Radar>` icon (scale 1→1.12→1, 2.2s loop)
- Label: **"SCOUTING MODE"** (uppercase gold)
- Text: **"Your unique path is being recorded. Interview demand raised for this specific journey."**
- Social proof counter: **"X other visitors are also looking for a mirror on this path"** — session-locked base (12–40) + real demand count
- CTA button: **"Raise Interview Demand"** → `POST /api/demand`; changes to **"✓ Demand Recorded"** after click
- **Email notify hook** (below CTA):
  - Hint: *"Notify me when a professional with this exact DNA joins."*
  - Email input + **"Notify"** button (Enter key also submits)
  - On success: `POST /api/notify` + **Thank You toast** (*"✓ You'll be notified when a matching professional joins."*, 3s auto-dismiss)
  - Session guard: `cri_notify_sent_<nodeId>` prevents double-submission
  - Inline red error for invalid email format
  - Backend stores an `unsubscribeToken` (`secrets.token_urlsafe(32)`) per entry — enables one-click unsubscribe links in future email campaigns without exposing the email address in the URL

> **Final Directive (Rev 4):** Email hook converts a "zero result" frustration into a retained user. Optional, positioned below demand CTA so it doesn't block primary action.

### Auto-Demand Trigger (silent, no UI):
- When `nodeVideos` is `null` or `[]` after 900ms and the visitor has a profile (`marks`/`entry`/`stream`), `HomePage` automatically fires `POST /api/demand` with `source: 'auto'`
- Session guard: `sessionStorage` key `cri_auto_demand_sent` — fires only once per browser session
- Payload includes full 6-char `visitorDna` string

### "No Data" Node Demand System:
- Nodes with insufficient data are marked distinctly
- Users can "demand" data for empty nodes to signal interest
- This feeds back into the admin panel for content prioritization

### Bottom of the career tree (if you scroll):
- Shows various career categories
- Has filters/sections for different industries

---

## PAGE 8: MIRROR PLAYER — DEEP-LINK HANDLER (`/mirror/:interviewId`)

### What it is:
A standalone interview player. Accessed via shareable URL that encodes interview ID, target segment, and visitor DNA. Allows WhatsApp/SMS shares to land the recipient directly on the relevant clip with their identity pre-loaded.

### URL Structure:
```
/mirror/:interviewId?seg=<segmentId>&dna=<visitorDna>
```
- `:interviewId` — interview record ID (e.g. `iv_001`)
- `seg` — optional segment/phase ID (e.g. `iv_001__struggle`)
- `dna` — 6-char DNA; accepted as **Base64-url** (e.g. `QURBQ0RC`) **or raw** (e.g. `ADACDB`)

### Handshake on page load:
1. **Decode DNA** — `safeDecodeDna()` handles both formats; graceful fallback if malformed
2. **Inject into localStorage** — `cr_saved_profile.bridge = dna` → career tree lights up on next `/` visit
3. **Fetch interview** — `GET /api/interview/:id` returns record + all clips
4. **Find segment** — match by `clip.id` or `clip.phase`; fallback to first clip
5. **Auto-seek** — `clip.startSec` passed to YouTube embed `?start=` param
6. **Context toast** — *"Mirror Identity Recovered. Playing your segment."* (4s auto-dismiss)

### Layout:
- **Fixed top navbar** (52px): CR logo + brand name; decoded DNA badge on right
- **Two-column grid** (collapses to 1 col on mobile ≤ 680px):
  - **Left:** title + YouTube embed + active segment card (phase, verdict, timestamps)
  - **Right:** scrollable segment list (click to switch clip) + "Back to Career Tree" link
- **States:** Loading spinner | Error message | Full player

> **Final Directive (Rev 4):** Solves the "cold share" problem — zero friction from link to content.

---

## PAGE 9: CONTACT PAGE (`/contact`)

### What it is:
A simple page to send a message to the platform team.

### Layout:
- Dark background with the navbar at top
- A centered card/form area
- **Heading:** "Contact Us" or "Get in touch"
- **Form fields:**
  - Name field (single line text input)
  - Email field (single line text input)
  - Message field (multi-line textarea)
- **Submit button:** "Send Message"
- After submitting: A success notification appears (toast notification — a small pill at top or bottom of screen)

---

## PAGE 10: ADMIN PAGE (`/admin`)

### What it is:
A restricted management panel. Only accessible with an admin password.

### Admin Login screen:
- If not logged in, shows a login form:
  - A password field
  - A "Login" button
  - Wrong password shows an error message

### After login — Admin Dashboard:
- Lists submitted journey entries from users
- Has **8 tabs** in the header tab bar:
  1. **Dashboard** — Summary stats
  2. **Career Tree** — Node CRUD editor
  3. **Node Shapes** — Visual style per node
  4. **Videos** — Video management
  5. **Video Mapper** — Map video segments to nodes
  6. **Demand Analytics** — Interview demand signals
  7. **Notifications** — *(NEW Rev 5)* Scouting Mode email queue viewer
  8. **Site Settings** — Flipper titles, footer, brand text

### Demand Analytics Tab (`GET /api/demands/stats`):
- **Top Nodes by Request Count:** `nodeId`, `nodeLabel`, `requests`, `lastRequestedAt`
- **Most Requested Unmatched Profiles (`topDnaProfiles`):** aggregated by 6-char `visitorDna` — decoded `humanReadable` labels for admin prioritization

### Notifications Tab (`GET /api/admin/notifications`) *(NEW Rev 5)*:
- **Stat cards:** Total Signups · Queued (active) · Unsubscribed
- **Filter pills:** All · Queued · Unsubscribed (refetches on click)
- **Table columns:** Email (teal mono) · DNA (amber mono badge) · Node · Date · Status
- **Status badges:** 🔔 Queued (teal) · 📭 Unsubscribed (gray)
- **Teal badge** on the Notifications tab button shows live `queued` count at a glance

### Backend API — Complete Endpoint Reference:
| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/config` | GET | Public | Site config (flipper, brand, mobileEntry with Student/Livelihood labels) |
| `/api/careers/public` | GET | Public | Full career tree JSON |
| `/api/path-clips?lens=` | GET | Public | **DNA-matched clips — lens param selects weight table** |
| `/api/video-counts` | GET | Public | Clip counts per node |
| `/api/visitor-mirror-nodes` | GET | Public | Mirror nodes for visitor profile |
| `/api/submit-journey` | POST | Public | Scanner submission (includes `lens` + livelihood fields) |
| `/api/demand` | POST | Public | Post interview demand (auto/manual) |
| `/api/demands/stats` | GET | Admin | Demand analytics + DNA clusters |
| **`/api/notify`** | POST | Public | Scouting Mode email queue |
| **`/api/unsubscribe/{token}`** | GET | Public | **NEW** — One-click email unsubscribe |
| **`/api/interview/:id`** | GET | Public | Single interview + clips for deep-link player |
| `/api/contact` | POST | Public | Contact form |
| `/api/newsletter` | POST | Public | Newsletter subscription |
| `/api/auth/login` | POST | Public | Admin login (bcrypt + JWT, rate-limited 5/15min) |
| `/api/auth/me` | GET | Admin | Verify JWT |
| `/api/auth/change-password` | POST | Admin | Change password |
| `/api/auth/forgot-password` | POST | Public | Initiate reset |
| `/api/auth/reset-password` | POST | Public | Complete reset |
| **`/api/admin/notifications`** | GET | Admin | **NEW** — Notification queue viewer (`?status=queued\|unsubscribed`) |

### Notification Queue (`notifications_queue.json`):
- Each record: `id`, `createdAt`, `email`, `visitorDna`, `nodeId`, `nodeLabel`, `status: "queued"`, `humanReadable` (decoded DNA labels)
- Idempotent per (email, dna) pair
- Admin reads this to run email campaigns when matching interviews go live

---

## NOTIFICATIONS — TOAST SYSTEM

Small notifications appear briefly (then disappear) at the top or bottom center of the screen in specific situations. They are pill-shaped:
- **Success toast (green):** "Draft saved", "Shared successfully", "Link copied to clipboard"
- **Info toast (blue):** "Bookmark removed"
- **Error toast (red):** "Could not copy link", "Submit failed. Please retry"

---

## OFFLINE STATE

If you lose internet connection, a small bar appears at the top of the screen (below navbar) saying you are offline. It disappears when connection is restored.

---

## INTERACTIONS SUMMARY

| Action | What happens |
|---|---|
| Flip phase plays on load | 6 career titles cycle at 320ms/word for ~1.95s, then CTA appears |
| Return visit (same session) | Flip skipped — lands directly on CTA (sessionStorage guard) |
| Tap anywhere / press Space during flip | Skips to CTA phase immediately |
| Click "Begin the Journey" | Goes to QuickEntry / scanner |
| Tap a tile in scanner | Tile glows, `← Undo` pill appears for **1.5s**, auto-advances after 0.8s |
| Tap `← Undo` within 1.5s | Cancels auto-advance, clears selection, lets user re-choose |
| Press Continue | Manually advances to next chapter |
| Press Back | Goes to previous chapter |
| Right-swipe (mobile) | Goes to previous chapter |
| Left-swipe (mobile) | Goes to next chapter (blocked on Unlock chapter) |
| Press "See my future possibilities" | Electric Teal Pulse fires, DNA scan plays (4 phases, min 820ms), submits |
| Visit `/submit` again (already filled) | Welcome Back screen with your saved choices chips |
| Press "Update my answers" | Dismisses Welcome Back, shows scanner from Chapter 1 |
| Press "Reset & start fresh" | Clears all saved data, shows fresh scanner |
| Search in career tree | Filters nodes by career name as you type |
| Bookmark a career | Saved locally, accessible from bookmarks button in navbar |
| Click hamburger menu | Navigation panel slides in from top-right |
| Click a career node (desktop) | Fruit Popup tooltip floats above the node |
| Tap a career node (mobile) | **Bottom sheet** slides up; scrim to dismiss; × button in header |
| Scouting Mode — enter email | `POST /api/notify` saves email + DNA; Thank You toast shows 3s |
| Visit `/mirror/:id?seg=...&dna=...` | DNA decoded + injected; tree lights up; player seeks to segment; context toast |
| Video sidebar has partial matches | Amber **"Partial Mirror ⓘ"** badge; hover ⓘ for trait breakdown |
| No DNA match found (score < 50%) | Scouting Mode overlay; email hook; auto-demand POSTed once/session |
| Click "Request a specific interview" | Manual demand POSTed (once per session per node) |

---

## VISUAL LANGUAGE SUMMARY

- **Color scheme:** Almost-black background everywhere. Teal (`#2DD4BF`) for primary actions, progress, and selections. Gold/amber (`#CDB88A`) for editorial text, warnings, and premium elements. Purple (`#818CF8`) for Grade B tiles. Pink (`#FB7185`) for Grade D tiles. Bright green for the DNA scan laser.
- **Typography:** Large, bold display font for big headlines. Clean sans-serif for body text and labels.
- **Motion:** Everything animates — chapters slide in/out, tiles pop in one by one, selections glow and pulse, cursor follows with a lag, buttons rise on hover, Electric Teal Pulse beam fires on selection, corner testimonials cycle automatically.
- **No typing required:** The entire scanner (the main flow) requires zero typing. Everything is a tap/click.
- **No scrolling in scanner:** All 6 chapters fit on one screen height. The only pages that scroll are the career tree results and the contact page.

---

## IMPLEMENTATION STATUS

| Feature | Status |
|---|---|
| Identity Flipper (title cycling) | ✅ Implemented (IdentityFlipper.jsx) |
| Corner archival testimonial slips (desktop) | ✅ Implemented (IdentityFlipper.jsx) |
| Mobile cycling testimonial strip | ✅ Implemented (IdentityFlipper.jsx) |
| Skip intro (click / Space / Enter) | ✅ Implemented |
| Resume last chapter CTA | ✅ Implemented (continueData prop) |
| 6-chapter scanner with ABCD tiles | ✅ Implemented (JourneyMapper.jsx + ABCDCard) |
| Electric Teal Pulse beam — Ch6 submit only | ✅ Updated (removed from tile selections Ch1–5) |
| Progress bar flash on Ch6 submit | ✅ Implemented |
| Auto-advance after 0.8s (was 0.36s) | ✅ Updated (ABCDCard onAutoAdvance) |
| Misclick-back Undo button (**1.5s** — "control not panic" sweet spot) | ✅ **Final Directive** (was 1s → 1.8s → **1.5s**) |
| Chapter slide transition animation | ✅ Implemented (AnimatePresence) |
| Mobile swipe navigation (Right=Back, Left=Next) | ✅ Implemented |
| Swipe-to-submit block on Unlock chapter | ✅ Implemented |
| Draft auto-save to localStorage | ✅ Implemented |
| Welcome Back screen | ✅ Implemented |
| Choice chips on Welcome Back | ✅ Implemented |
| DNA scan overlay (4 phases) | ✅ Implemented |
| API + min display time in parallel | ✅ Implemented (Promise.all) |
| Persist profile after submit | ✅ Implemented (cr_saved_profile) |
| Success screen with mirror map | ✅ Implemented |
| Career tree / Mirror Path highlight | ✅ Implemented |
| Node Fruit Popup — desktop floating tooltip | ✅ Implemented |
| Node Fruit Popup — **mobile bottom sheet** | ✅ **Final Directive Added** (InteractiveTimeline.jsx — spring slide-up, scrim, drag handle, × button) |
| Tiered DNA matching (0.60 / 0.50 thresholds) | ✅ Implemented (server.py clips_matching_mirror) |
| isPartialMatch flag on 50–59% clips | ✅ Implemented (backend + MirrorVideoPlayer badge) |
| Partial Mirror ⓘ info icon with tooltip | ✅ **Rev 2 Added** (MirrorVideoPlayer) |
| Scouting Mode overlay (no-match state) | ✅ Implemented (MirrorVideoPlayer ScoutingMode) |
| Social proof counter — session-locked base | ✅ **Rev 2 Added** (`cri_scout_base_<nodeId>`) |
| **Scouting Mode email hook** | ✅ **Final Directive Added** (MirrorVideoPlayer — POST /api/notify + Thank You toast + session guard) |
| Auto-demand POST on no-match (once/session) | ✅ Implemented (HomePage + sessionStorage guard) |
| Manual "Request interview" demand button | ✅ Implemented (MirrorVideoPlayer) |
| visitorDna logged in every demand record | ✅ Implemented (/api/demand) |
| Admin Demand Analytics — topDnaProfiles | ✅ Implemented (/api/demands/stats) |
| **`POST /api/notify` — notification queue backend** | ✅ **Final Directive Added** (server.py → notifications_queue.json, idempotent per email+dna) |
| **`GET /api/interview/:id` — deep-link backend** | ✅ **Final Directive Added** (server.py → full interview + clips) |
| **`VideoPlayerPage.jsx` — `/mirror/:id`** | ✅ **Final Directive Added** (Base64 decode, localStorage inject, auto-seek, context toast) |
| **Deep-link route in App.jsx** | ✅ **Final Directive Added** (`/mirror/:interviewId` lazy route) |
| IdentityFlipper word speed 320ms | ✅ Implemented |
| IdentityFlipper title count **6** (was 8) | ✅ **Rev 2 Updated** |
| IdentityFlipper flipDuration **1950ms** | ✅ **Rev 2 Updated** |
| IdentityFlipper once-per-session guard | ✅ Implemented (sessionStorage cri_intro_played) |
| Custom cursor hover: **gold `#CDB88A`** (was pink) | ✅ **Rev 2 Updated** (GlowCursor.jsx) |
| No Data Node Demand System | ✅ Implemented |
| Admin panel | ✅ Implemented |
| Toast notification system | ✅ Implemented |
| **DNA Categorical scoring — Profession + Stream** | ✅ **Final Directive Added** (server.py `_CATEGORICAL_POSITIONS` — exact-match only for pos 0+1) |
| **`unsubscribeToken` in notifications_queue** | ✅ **Final Directive Added** (server.py — `secrets.token_urlsafe(32)` per notify record) |
| Offline state bar | ✅ Implemented |
