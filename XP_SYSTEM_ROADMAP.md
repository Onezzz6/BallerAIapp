BallerAI XP & Level System — Architecture & Rollout (No Code)

Product goals
	1.	Fairness – Everyone starts at Level 1 on the day the feature launches. No XP from the past.
	2.	Clarity – Users earn XP only for things they actually do today (their local day).
	3.	Simplicity – Minimal moving parts in Firebase; a single user document holds the truth.
	4.	Safety – No double-awards, a daily XP cap, and predictable level pacing.

⸻

Core principles (what the system must do)
	•	No retroactive XP: Activities created before the feature’s start do not grant XP.
	•	Today-only XP: Only actions the user performs today (local time) can grant XP. If a user completes an older day later, it grants 0 XP.
	•	Award on create, not on edit: XP triggers only after the primary data write succeeds and only for first-time creation.
	•	Daily XP cap: 900 XP max per local day.
	•	Simple storage: XP lives on /users/{uid}. The app reads one doc and writes back to it.
	•	Consistent math: Level is a function of total XP. The UI caches level for speed, but total XP is the single source of truth.
	•	Timezone correctness: “Today” is determined using the user’s IANA timezone (e.g., Europe/Helsinki) so midnight boundaries are consistent.

⸻

How XP & levels should feel (pacing)
	•	XP sources:
– Meal logged: 50 XP
– Recovery completed: 300 XP
– Training finished: 300 XP
– Daily cap: 900 XP
	•	Level curve (intuitive description): Levels get progressively harder using a gentle, quadratic curve (constant 30). Early levels come quickly (a few actions), then slow to a steady cadence. At the daily cap, a committed user typically advances ~1–2 levels in the first couple of days, then ~every few days thereafter. This gives frequent early wins without letting users max out too fast.

(We’ll keep this curve stable across client and server so a given totalXp always maps to the same level.)

⸻

Data model (minimal)

In /users/{uid} store:
	•	totalXp – Cumulative XP (integer).
	•	xpToday – XP earned since the most recent midnight in the user’s timezone.
	•	lastXpReset – Timestamp of the last daily reset.
	•	level – Cached level derived from totalXp (for instant UI).
	•	timezone – IANA timezone string for the user (e.g., Europe/Helsinki).
	•	xpFeatureStart – Timestamp marking when XP became active for this user (first app launch after the update or a global launch moment).

Optional (keep for later if you want even more safety):
xpVersion (to support future tuning), lastAwardedEventIds (small rolling set to prevent duplicates), or per-pillar trackers if you plan per-pillar caps later.

⸻

What makes an action eligible for XP?

An action (meal/recovery/training) is eligible only if all are true:
	1.	The action’s creation timestamp is on or after xpFeatureStart.
	2.	The creation timestamp falls within “today” in the user’s stored timezone.
	3.	The primary data write succeeded (no XP on failed writes).
	4.	The user has not already hit the 900 XP daily cap.

Important: Use a server-generated creation timestamp for the action (e.g., “created at” set by the server), so users can’t gain “today” XP by backdating.

If a user fills in an older day: the UI date can be older, but eligibility takes the creation timestamp (now) and therefore does not grant XP.

⸻

Where logic runs (keep it simple first)
	•	Phase 1 (simple & shippable):
– Client does the “is this eligible?” checks (today window, cap, feature start).
– Client writes updated xpToday, totalXp, level, and lastXpReset to /users/{uid}.
– Firestore security rules only allow XP to increase and block xpToday beyond 900.
– This is enough for launch and honest users.
	•	Phase 2 (hardening, optional later):
– Introduce a single callable Cloud Function (awardXp) to perform the same checks server-side and make the write in a transaction.
– Client still handles UX, but server becomes the source of truth for awarding.

⸻

Daily reset (midnight local time)
	•	On app foreground and before awarding any XP:
	1.	Compare lastXpReset to “today” in the stored timezone.
	2.	If the dates differ, set xpToday to 0 and update lastXpReset to now (no change to totalXp).
	•	This keeps the client simple. If you later move to the server function, do the same check there.

⸻

UI/UX touchpoints (levels only)
	1.	Always-visible Level Badge
	•	Shows “Lv X”. Tapping opens the Rank Sheet.
	2.	Rank Sheet
	•	Shows current Level, Total XP, and a progress bar to next level.
	•	Clear note: “XP is awarded for actions done today only.”
	•	If the cap is reached, show a friendly lock state: “Daily XP cap reached. Great work—come back tomorrow!”
	3.	Level-Up moment
	•	Lightweight celebration (confetti + haptic), a single line explaining what unlocked (if anything), and a dismiss button.
	•	Optional: “Share” later; keep it minimal for first release.

⸻

Security & integrity (without over-engineering)
	•	Rules: Only allow writes where totalXp increases or stays the same; xpToday can increase but never exceed 900; allow xpToday to reset to 0 only when the date boundary changes; level must match the level implied by the new totalXp (client provides both; rules verify monotonic consistency in a basic way).
	•	Idempotency (lightweight): Since we award only on create, accidental double taps are rare. If you see duplicates in telemetry, add the optional lastAwardedEventIds or a per-event xpAwarded: true later.

⸻

Analytics (minimum)

Fire three events with consistent parameters:
	•	xp_awarded – reason (meal/recovery/training), amount, resulting xpToday, resulting totalXp, level, and whether capped.
	•	level_up – previous level, new level, totalXp.
	•	xp_today_cap_hit – when an award attempt hits the cap (include how much was requested vs. granted).

These help you validate pacing (are people hitting the cap too fast?) and integrity (unexpected double awards).

⸻

Migration & rollout plan
	1.	Ship the schema
	•	Add the fields to /users/{uid} with zeros for XP and now for lastXpReset.
	•	Store the user’s timezone (fallback to device time zone if unknown).
	2.	Choose the feature start strategy
	•	Per-user start: Set xpFeatureStart the first time they launch the app after updating (simplest across time zones).
	•	Or global start: One fixed timestamp. Per-user is usually cleaner for staggered updates.
	3.	Deploy the client logic
	•	Award only when primary write succeeds; check today window; enforce cap.
	•	Read/write a single user doc; keep the UI responsive with the cached level.
	4.	Comms & clarity
	•	Add a brief tooltip on the Rank Sheet: “XP starts from the day you updated to Levels. Logging older days won’t grant XP.”
	5.	Monitor analytics
	•	Verify distribution of xpToday and cap rate. Adjust copy or curve later if needed.
	6.	(Optional) Harden with a server function
	•	If abuse appears or you want stricter guarantees, move awarding into a single callable that performs the same checks server-side.

⸻

Branch / PR order (levels only)
	1.	feature/xp-schema – Fields + read/write wiring, security rules, store timezone and per-user xpFeatureStart.
	2.	feature/xp-engine – Local level math, daily reset check, cap enforcement, eligibility check (today + feature start).
	3.	feature/xp-hooks-nutrition – Award on successful meal creation only.
	4.	feature/xp-hooks-recovery – Award on recovery completion (creation moment).
	5.	feature/xp-hooks-training – Award on training completion (creation moment).
	6.	feature/level-badge – Always-visible badge and navigation to sheet.
	7.	feature/rank-sheet – Level, total XP, progress, today status/cap messaging.
	8.	feature/level-up-modal – Lightweight celebration.
	9.	feature/tests-telemetry – Unit tests for pacing, cap, and date boundaries; analytics wiring.

Each PR should include a tiny migration that initializes the new fields for existing users. No backfill of old actions is needed.

⸻

Edge cases to cover
	•	Offline creation: If a user completes something offline and it syncs later today, it’s eligible (creation timestamp = server time when synced). If it syncs tomorrow, it won’t grant XP (it’s no longer “today”). This is acceptable for simplicity and prevents backdating abuse.
	•	Time zone changes: If a user travels, store and respect the last known timezone. You can update it on next launch and apply resets based on that going forward.
	•	Multiple devices: Because all XP state lives in one user doc, simultaneous awards can race. If you see rare conflicts, add the server function later.

⸻

Definition of done
	•	Users see “Lv 1” at launch and earn XP only for same-day actions from then on.
	•	No XP is granted for older days, even if completed later.
	•	A daily cap prevents grinding.
	•	One user document remains the single source of truth.
	•	The system is predictable, easy to reason about, and ready to harden later without redesign.