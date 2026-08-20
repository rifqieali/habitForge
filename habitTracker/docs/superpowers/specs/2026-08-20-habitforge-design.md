# HabitForge — Personal Habit Tracker Design Spec

## Overview

HabitForge is a personal habit tracker built as a Google Apps Script web app. It uses Google Spreadsheet as its database and analytics dashboard, and writes completion events to Google Calendar as a visual log. The app is a single-page application optimized for mobile use, with a dark-mode-dominant design featuring gradient accents for a premium feel.

## Target User

Single user (the script owner). No authentication system needed — Apps Script's built-in execution-as-owner model handles access.

## Architecture

### Stack

- **Frontend**: HTML + vanilla CSS + vanilla JS, served via `HtmlService.createHtmlOutputFromFile()`
- **Backend**: Google Apps Script (`.gs` files)
- **Database**: Google Spreadsheet (bound or standalone)
- **External integration**: Google Calendar API (via `CalendarApp`)

### Communication Pattern

Frontend communicates with backend exclusively via `google.script.run.withSuccessHandler().withFailureHandler()`. All server calls are asynchronous. The frontend maintains local state and syncs optimistically where possible to mask Apps Script latency.

### File Structure

```
habitforge/
├── Code.gs              # Entry point, doGet(), routing
├── HabitService.gs      # CRUD operations for Habits
├── LogService.gs        # Check-in logging, completion logic
├── StreakService.gs      # Streak calculation, freeze logic
├── CalendarService.gs   # Google Calendar write integration
├── SheetService.gs      # Low-level Spreadsheet read/write
├── ConfigService.gs     # Settings management
├── Utils.gs             # Date helpers, ID generation
├── index.html           # Main SPA shell
├── css.html             # All styles (dark mode, gradients, animations)
├── js.html              # All client-side JavaScript
├── components.html      # Reusable HTML templates/components
└── appsscript.json      # Manifest
```

## Data Model

### Sheet: `Habits`

| Column | Type | Description |
|--------|------|-------------|
| id | string | Unique ID (UUID-like, generated via `Utilities.getUuid()`) |
| name | string | Display name of the Habit |
| type | enum | `boolean`, `quantitative`, `duration` |
| target | number | Target value. Boolean: 1, Quantitative: target number, Duration: target minutes |
| unit | string | Unit label. Boolean: "", Quantitative: e.g. "gelas", Duration: "menit" |
| frequency | enum | `daily`, `weekly_count`, `specific_days` |
| frequency_value | string | For `weekly_count`: number (e.g. "3"). For `specific_days`: comma-separated day indices ("1,3,5" = Mon,Wed,Fri). For `daily`: "" |
| color | string | Hex color for UI and Calendar events |
| icon | string | Emoji icon for the Habit |
| sort_order | number | Display order on dashboard |
| created_at | datetime | When the Habit was created |
| archived | boolean | Whether the Habit is archived (hidden from dashboard but data preserved) |

### Sheet: `Logs`

| Column | Type | Description |
|--------|------|-------------|
| id | string | Unique log entry ID |
| date | date | The date this Check-in is for (YYYY-MM-DD) |
| habit_id | string | FK to Habits.id |
| value | number | Recorded value. Boolean: 1 or 0. Quantitative: the number. Duration: minutes |
| completed | boolean | Whether the Target was met (value >= target) |
| timestamp | datetime | When the Check-in was recorded |
| calendar_event_id | string | ID of the created Calendar event (for potential future deletion) |

### Sheet: `Streaks`

| Column | Type | Description |
|--------|------|-------------|
| habit_id | string | FK to Habits.id |
| current_streak | number | Current consecutive Streak count |
| longest_streak | number | All-time best Streak |
| last_completed_date | date | Last date the Habit was completed |
| freeze_count | number | Streak Freezes used this month |
| freeze_month | string | Month-year of freeze_count (e.g. "2026-08") — resets when month changes |

### Sheet: `Config`

| Column | Type | Description |
|--------|------|-------------|
| key | string | Setting key |
| value | string | Setting value |

Default config entries:
- `calendar_id`: "primary"
- `freeze_per_month`: "2"
- `calendar_enabled`: "true"

### Sheet: `Dashboard`

Auto-calculated sheet with formulas for:
- Overall completion rate (this week / this month)
- Per-habit completion rate
- Streak leaderboard
- Charts (using Sheets' built-in charting)

## UI Design

### Visual System

- **Color palette**: Dark backgrounds (`#0a0a0f` base, `#12121a` cards), with vibrant gradient accents (purple-to-cyan `#8b5cf6 → #06b6d4`, or amber-to-rose `#f59e0b → #f43f5e` for streaks)
- **Typography**: Google Fonts — Inter for body text, Inter Bold/Black for numbers and headers
- **Border radius**: 16px for cards, 12px for buttons, 24px for pill badges
- **Shadows**: Subtle dark shadows + colored glow on active elements
- **Micro-animations**: Tap feedback (scale pulse), completion celebration (checkmark draw + shimmer), streak counter increment animation

### Navigation

Bottom tab bar, fixed at viewport bottom, 4 tabs:
1. 🏠 Dashboard (default active)
2. 📅 History
3. 📊 Stats
4. ⚙️ Settings

Tab bar has frosted-glass effect (backdrop-filter: blur) with gradient border-top.

### Tab 1: Dashboard

**Top section — Streak Banner:**
- Large streak number with gradient text and subtle glow animation
- "🔥 12 Day Streak" format
- Sub-text showing today's date and completion status

**Middle section — Today's Habits:**
- Scrollable list of Habit cards for today (filtered by Frequency)
- Each card shows: icon, name, progress indicator, tap area
- **Boolean habit card**: Tap toggles completion. Uncompleted = dim outline, completed = gradient fill + checkmark animation
- **Quantitative habit card**: Shows "current / target unit". Tap reveals inline number stepper below the card. Confirm auto-collapses the stepper.
- **Duration habit card**: Shows "current / target menit". Tap reveals inline time input (minutes). Confirm auto-collapses.
- Completed cards move to bottom of list with reduced opacity
- **Progress ring**: Circular SVG progress indicator showing "X/Y completed today"

**Bottom section — Quick Add:**
- Floating Action Button (FAB) — gradient circle with "+" icon
- Opens bottom sheet modal with form: name, type selector (3 pill buttons), target input, frequency selector, color picker (preset palette), icon picker (emoji grid)
- "Save" creates habit and it immediately appears in today's list

### Tab 2: History

- **Contribution graph**: 52-week grid (like GitHub), color intensity = completion percentage per day. Uses the app's gradient colors.
- **Month calendar**: Below the graph, a calendar month view. Days with completions are highlighted. Tap a day to see detail.
- **Day detail**: Bottom sheet showing list of habits and their status for that specific day.
- Month navigation via left/right arrows or swipe.

### Tab 3: Stats

- **Overall completion rate**: Large percentage with radial chart
- **Habit-specific cards**: Each habit shows its own stats:
  - Current streak vs longest streak
  - Completion rate (last 7 days, 30 days, all-time)
  - Trend indicator (↑ improving, → stable, ↓ declining)
- **Best day of week**: Bar chart showing which day you're most consistent
- All charts rendered with CSS/SVG (no external chart library to avoid HtmlService sandbox issues)

### Tab 4: Settings

- **Streak Freeze**: Shows "X/2 freezes remaining this month". Toggle for auto-use.
- **Google Calendar**: Text input for Calendar ID. "Test connection" button. Toggle to enable/disable Calendar writes.
- **Manage Habits**: List of all habits (including archived). Tap to edit. Swipe or long-press to archive/delete.
- **Spreadsheet Link**: Button that opens the spreadsheet in a new tab.
- **About**: Version info.

## Streak Logic

### Calculation Rules

1. **Daily habits**: Streak increments if completed every calendar day.
2. **Weekly count habits** (e.g. "3x/week"): Streak increments per week. At end of each week (Sunday), check if the count target was met. If yes, weekly streak +1.
3. **Specific days habits** (e.g. Mon/Wed/Fri): Streak increments if completed on every specified day. Non-specified days are ignored.

### Streak Freeze

- 2 freezes available per calendar month.
- Freeze is consumed automatically when a scheduled Check-in is missed and auto-freeze is enabled.
- When a freeze is used: streak is preserved, but the day counts as "frozen" (distinct visual in History).
- Freeze counter resets on the 1st of each month.
- If no freeze is available and a day is missed, streak resets to 0.

### Streak Update Timing

Streaks are recalculated:
- On each Check-in (immediate feedback)
- Via a daily time-driven trigger at midnight (to catch missed days and apply freezes)

## Google Calendar Integration

### Write Behavior

- When a Check-in is completed, an all-day event is created in the configured calendar.
- Event title format: "✅ {Habit Name}" for boolean, "✅ {Habit Name} — {value} {unit}" for quantitative/duration.
- Event color matches the Habit's configured color (using `CalendarApp.EventColor`).
- Events are created in a batch when the user completes their check-in session (not per-tap) to minimize API calls.
- The Calendar event ID is stored in the Log for potential future management.

### Error Handling

- If Calendar write fails (quota, permissions), the Check-in is NOT rolled back. Calendar is a nice-to-have, not critical path.
- Failed calendar writes are logged and can be retried from Settings.

## Performance Considerations

- **Optimistic UI updates**: Client updates immediately on tap, server sync happens in background.
- **Batch reads**: On app load, fetch all today's data in a single `google.script.run` call (habits + today's logs + streaks + config). Avoid multiple sequential calls.
- **Cache**: Use `CacheService` to cache frequently read data (habit list, config) for 5 minutes.
- **Spreadsheet operations**: Use `getRange().getValues()` for bulk reads, `setValues()` for bulk writes. Never read/write cell-by-cell.

## Constraints & Limitations

- **6-minute execution limit**: All server functions must complete well within this. No heavy computation in single calls.
- **HtmlService sandbox**: IFRAME mode. No external scripts via CDN — all code must be inline or in `.html` files via `<?!= include() ?>`.
- **No real-time sync**: User must refresh to see updates made from other sessions (e.g., if Spreadsheet was edited directly).
- **30 concurrent executions**: Not an issue for single-user use.

## Out of Scope (v1)

- Multi-user support
- Push notifications (not possible in Apps Script web apps)
- Offline mode
- Data export (use Spreadsheet directly)
- Social/sharing features
- Light mode toggle (can be added in v2)
