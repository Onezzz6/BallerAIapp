# XP System Implementation Roadmap

## Overview
This document outlines the complete roadmap for implementing an XP (Experience Points) system in the BallerAI app.

---

## Sprint 0 – Back-end & Schema Preparation
- **User document** – Add the following fields to every `/users/{uid}` document:
  - `totalXp` (initially 0)
  - `xpToday` (initially 0)
  - `lastXpReset` (timestamp of the most recent daily reset)
  - `level` (redundant cache of the user's current level)
- **Security rules** – Permit updates only when XP increases and `xpToday` does not exceed 900.
- **Optional Cloud Function** – Create a single entry-point named `awardXp` that accepts a `uid` and an `amount`, allowing you to move all XP calculations server-side later.

---

## Sprint 1 – Core XP Engine
- **Utility module** – Centralise all constants (50 XP per meal, 300 XP per recovery, 300 XP per training, 900 XP daily cap, and the level-curve constant 30). Provide helper functions to compute current level and XP required for the next level.
- **Global context provider** – Build an `XpContext` that:
  - Subscribes to the user document and maintains `totalXp`, `xpToday`, and `level` in local state.
  - Offers an `awardXp(amount)` method that resets `xpToday` at midnight, enforces the 900 XP daily cap, writes the updates to Firestore, and detects level-ups.
- **Integration** – Wrap the root navigator (e.g., in App.tsx) with the new provider so every screen can access XP data.

---

## Sprint 2 – Hooking XP into App Events

| Screen file | Event to intercept | XP to grant |
|-------------|-------------------|-------------|
| nutrition.tsx | When a meal is successfully logged | 50 XP |
| recovery.tsx | When a recovery plan is marked complete | 300 XP |
| training.tsx | When a training session is finished | 300 XP |

Ensure each call to `awardXp` only fires after the primary data write succeeds so users cannot earn XP for failed actions.

---

## Sprint 3 – Always-Visible Level Badge
- Create a lightweight `LevelBadge` component that shows "Lv X" and acts as a button.
- Place the badge in the header of every main screen so it is always visible.
- The badge should navigate to a dedicated Rank view when tapped.

---

## Sprint 4 – Rank Sheet & Level-Up Modal
- **Rank Sheet** – A full-screen or bottom-sheet view that displays:
  - Current level
  - Total XP and progress toward the next level
  - Today's XP per pillar and their caps
- **Level-Up Modal** – Triggered whenever level increases.
  - Full-screen animation (e.g., confetti)
  - Haptic feedback on supported devices
  - Optional "Share" button for social proof

---

## Sprint 5 – Daily Reset Job
- Whenever the app returns to the foreground, compare `lastXpReset` with today's date.
- If the dates differ, set `xpToday` to 0 and update `lastXpReset` to the current timestamp.

---

## Sprint 6 – Unit Tests & Telemetry
- **Tests** – Cover level math, daily-cap enforcement, and potential race conditions (e.g., two actions completed within the same second).
- **Analytics events** – Fire at least three events: `xp_awarded`, `level_up`, and `xp_today_cap_hit`.

---

## Sprint 7 – Design Polish & Animations
- Change the badge background colour every 25 levels to give visual progression cues.
- Add a subtle confetti animation and haptic feedback in the Level-Up Modal to celebrate user achievements.

---

## Recommended Branch / Pull-Request Order
1. `feature/xp-schema`
2. `feature/xp-engine`
3. `feature/xp-hooks-nutrition`
4. `feature/xp-hooks-recovery`
5. `feature/xp-hooks-training`
6. `feature/level-badge`
7. `feature/rank-sheet`
8. `feature/level-up-modal`
9. `feature/tests-telemetry`

Each PR should include a migration routine that inserts the new XP fields into existing user records.

---

## XP Constants Reference
- **Meal logged**: 50 XP
- **Recovery plan completed**: 300 XP
- **Training session finished**: 300 XP
- **Daily XP cap**: 900 XP
- **Level curve constant**: 30
- **Badge color change interval**: Every 25 levels

## Technical Notes
- XP should only be awarded after successful data writes to prevent exploits
- Daily reset should happen at midnight local time
- Level calculations should be consistent across client and server
- Consider rate limiting and validation on server side
- Implement proper error handling for XP operations 