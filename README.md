# habit-intelligence
Offline-first habit analytics dashboard with time-tracking, streak intelligence, encryption, and GitHub-style heatmaps. Built using Vanilla JS + IndexedDB. No backend. Fully client-side.

# Habit Intelligence  
An Offline-First Habit Analytics Dashboard

Habit Intelligence is a fully client-side, offline-capable habit tracking and analytics system designed for serious introspection.

This project was built as a personal discipline engine — not a gamified streak app. It tracks consistency, adherence, and behavioral momentum using measurable metrics rather than superficial completion counts.

It is open-source and built for contributors who value clarity, architecture, and long-term maintainability.

---

## Core Philosophy

Most habit trackers reduce progress to binary streak counters.

This system treats growth as:

- Consistency over time
- Target adherence
- Streak dominance
- Weighted productivity modeling
- Category-level introspection
- Quantified behavior patterns

No backend.  
No cloud dependency.  
No user tracking.  
Your data stays in your browser.

---

## Features

### Activity Types
- Binary completion habits (Done / Not Done)
- Time-tracked habits (manual entry, multiple sessions per day)
- Daily and weekly targets
- 24-hour cap enforcement (1440 minutes max per activity per day)

### Analytics
- Consistency Score
- Target Adherence %
- Streak Tracking
- Longest Streak
- Streak Dominance Ratio
- Weighted Productivity Score

### Visualization
- Daily bar chart
- Weekly aggregation chart
- Category breakdown chart
- GitHub-style monthly heatmap (blue gradient)
- Streak milestone badges

### Data Control
- IndexedDB persistent storage
- Global edit lock toggle (prevent accidental past edits)
- AES-GCM encryption (Web Crypto API)
- Password-based key derivation (PBKDF2)
- CSV export

### Interface
- Dark / Light mode toggle
- Data-dense desktop dashboard
- Modular ES6 architecture
- GitHub Pages compatible
- Fully offline after initial load

---

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript (ES6 Modules)
- IndexedDB
- Chart.js
- Web Crypto API (AES-GCM + PBKDF2)

---

## Why This Exists

This project began as a personal system to measure real behavioral growth instead of chasing surface-level streak numbers.

It is built to answer:

- Am I actually consistent?
- Am I hitting defined targets?
- Is my momentum increasing?
- Which categories dominate my effort?
- Is my streak meaningful or accidental?

## Contribution Guidelines

Contributions are welcome, especially in:

- Performance optimization
- UI/UX refinement
- Metric modeling improvements
- Heatmap aggregation accuracy
- IndexedDB query optimization
- Accessibility improvements
- Modular refactoring
- Documentation clarity
