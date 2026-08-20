# HabitForge

Personal habit tracker built on Google Apps Script, using Spreadsheet as database and Calendar as visual log.

## Language

**Habit**:
A recurring personal activity that the user wants to track consistently over time.
_Avoid_: Task, todo, goal

**Habit Type**:
The measurement method for a Habit: boolean (yes/no), quantitative (numeric value), or duration (time spent).
_Avoid_: Category, kind

**Check-in**:
A single recorded completion (or partial completion) of a Habit for a specific date.
_Avoid_: Log entry, record, submission

**Streak**:
The count of consecutive scheduled periods where a Habit's target was met without interruption.
_Avoid_: Chain, run, combo

**Streak Freeze**:
A limited-use allowance (2 per month) that preserves a Streak when the user misses a scheduled Check-in.
_Avoid_: Skip, pass, shield

**Frequency**:
The schedule defining when a Habit is due: daily, X times per week, or specific days of the week.
_Avoid_: Schedule, recurrence, cadence

**Target**:
The threshold value a Check-in must meet for the Habit to count as completed. For boolean Habits, the target is implicit (done = true). For quantitative, a number. For duration, a time amount.
_Avoid_: Goal, quota, minimum

**Completion**:
The state when a Check-in meets or exceeds the Habit's Target for that day.
_Avoid_: Done, finished, achieved

**Contribution Graph**:
A GitHub-style grid visualization showing Check-in density over time, with color intensity representing completion levels.
_Avoid_: Heatmap, activity grid
