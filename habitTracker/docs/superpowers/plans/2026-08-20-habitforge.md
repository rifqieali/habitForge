# HabitForge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal habit tracker as a Google Apps Script web app with Spreadsheet database, Calendar integration, streaks with freeze, and a premium dark-mode mobile-first UI.

**Architecture:** Single-page app served via Apps Script `HtmlService`. Backend `.gs` files handle Spreadsheet CRUD, streak calculation, and Calendar writes. Frontend is vanilla HTML/CSS/JS with optimistic UI updates via `google.script.run`. Data lives in a multi-sheet Spreadsheet.

**Tech Stack:** Google Apps Script, HtmlService (IFRAME sandbox), SpreadsheetApp, CalendarApp, CacheService, vanilla HTML/CSS/JS, SVG charts

## Global Constraints

- All code must be inline or included via `<?!= include() ?>` — no CDN imports (HtmlService IFRAME sandbox)
- Every server function must complete well within 6-minute execution limit
- Use `getRange().getValues()` / `setValues()` for bulk Spreadsheet operations — never cell-by-cell
- Typography: Google Fonts Inter (loaded via `@import` in CSS, which IS allowed in IFRAME sandbox)
- Color system: dark base `#0a0a0f`, card `#12121a`, gradient accents purple-cyan `#8b5cf6→#06b6d4`, streak amber-rose `#f59e0b→#f43f5e`
- All IDs generated via `Utilities.getUuid()`
- Date format: `YYYY-MM-DD` strings for all Spreadsheet storage
- Design spec: [2026-08-20-habitforge-design.md](file:///mnt/sda3/grindingCarrier/VIbeCoding/docs/superpowers/specs/2026-08-20-habitforge-design.md)
- Domain glossary: [CONTEXT.md](file:///mnt/sda3/grindingCarrier/VIbeCoding/CONTEXT.md)

---

### Task 1: Project Scaffold & Spreadsheet Initialization

**Files:**
- Create: `habitforge/appsscript.json`
- Create: `habitforge/Code.gs`
- Create: `habitforge/SheetService.gs`
- Create: `habitforge/Utils.gs`

**Interfaces:**
- Consumes: nothing (foundation task)
- Produces:
  - `doGet()` → returns `HtmlOutput` (SPA shell)
  - `include(filename)` → returns HTML string for template inclusion
  - `SheetService.getOrCreateSpreadsheet()` → returns `Spreadsheet` object, creates if not exists
  - `SheetService.initializeSheets(ss)` → creates all 5 sheets with headers if missing
  - `SheetService.getSheet(sheetName)` → returns `Sheet` object
  - `SheetService.readAll(sheetName)` → returns `Object[]` (array of row objects with column-name keys)
  - `SheetService.appendRow(sheetName, rowObject)` → appends one row
  - `SheetService.updateRow(sheetName, matchColumn, matchValue, updateObject)` → updates matching row
  - `SheetService.deleteRow(sheetName, matchColumn, matchValue)` → deletes matching row
  - `Utils.generateId()` → returns UUID string
  - `Utils.today()` → returns `YYYY-MM-DD` string
  - `Utils.currentMonth()` → returns `YYYY-MM` string
  - `Utils.formatDate(date)` → returns `YYYY-MM-DD` string
  - `Utils.parseDate(dateString)` → returns `Date` object
  - `Utils.getDayOfWeek(dateString)` → returns 0-6 (Sun-Sat)

- [ ] **Step 1: Create `appsscript.json` manifest**

```json
{
  "timeZone": "Asia/Jakarta",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "access": "MYSELF",
    "executeAs": "USER_DEPLOYING"
  },
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/script.container.ui"
  ]
}
```

- [ ] **Step 2: Create `Utils.gs`**

```javascript
function generateId() {
  return Utilities.getUuid();
}

function today() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function currentMonth() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM');
}

function formatDate(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function parseDate(dateString) {
  return new Date(dateString + 'T00:00:00');
}

function getDayOfWeek(dateString) {
  return parseDate(dateString).getDay();
}
```

- [ ] **Step 3: Create `SheetService.gs`**

Implement `getOrCreateSpreadsheet()` using `PropertiesService` to store spreadsheet ID. On first run, creates a new spreadsheet titled "HabitForge Data".

Implement `initializeSheets(ss)` that creates 5 sheets (`Habits`, `Logs`, `Streaks`, `Config`, `Dashboard`) with the correct header rows if they don't already exist.

Implement CRUD helpers: `readAll(sheetName)`, `appendRow(sheetName, rowObject)`, `updateRow(sheetName, matchColumn, matchValue, updateObject)`, `deleteRow(sheetName, matchColumn, matchValue)`.

Column definitions per sheet:

**Habits**: `['id','name','type','target','unit','frequency','frequency_value','color','icon','sort_order','created_at','archived']`

**Logs**: `['id','date','habit_id','value','completed','timestamp','calendar_event_id']`

**Streaks**: `['habit_id','current_streak','longest_streak','last_completed_date','freeze_count','freeze_month']`

**Config**: `['key','value']`

```javascript
var SPREADSHEET_KEY = 'HABITFORGE_SS_ID';

var SHEET_COLUMNS = {
  Habits: ['id','name','type','target','unit','frequency','frequency_value','color','icon','sort_order','created_at','archived'],
  Logs: ['id','date','habit_id','value','completed','timestamp','calendar_event_id'],
  Streaks: ['habit_id','current_streak','longest_streak','last_completed_date','freeze_count','freeze_month'],
  Config: ['key','value']
};

var DEFAULT_CONFIG = [
  { key: 'calendar_id', value: 'primary' },
  { key: 'freeze_per_month', value: '2' },
  { key: 'calendar_enabled', value: 'true' },
  { key: 'auto_freeze', value: 'true' }
];

function getOrCreateSpreadsheet() {
  var props = PropertiesService.getScriptProperties();
  var ssId = props.getProperty(SPREADSHEET_KEY);
  if (ssId) {
    try { return SpreadsheetApp.openById(ssId); } catch(e) { /* deleted, recreate */ }
  }
  var ss = SpreadsheetApp.create('HabitForge Data');
  props.setProperty(SPREADSHEET_KEY, ss.getId());
  initializeSheets(ss);
  return ss;
}

function initializeSheets(ss) {
  Object.keys(SHEET_COLUMNS).forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.getRange(1, 1, 1, SHEET_COLUMNS[name].length).setValues([SHEET_COLUMNS[name]]);
    }
  });
  // Seed default config
  var configSheet = ss.getSheetByName('Config');
  if (configSheet.getLastRow() <= 1) {
    DEFAULT_CONFIG.forEach(function(c) {
      configSheet.appendRow([c.key, c.value]);
    });
  }
  // Remove default "Sheet1" if exists
  var defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }
}

function getSheet(sheetName) {
  return getOrCreateSpreadsheet().getSheetByName(sheetName);
}

function readAll(sheetName) {
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data[0];
  return data.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  });
}

function appendRow(sheetName, rowObject) {
  var columns = SHEET_COLUMNS[sheetName];
  var row = columns.map(function(col) { return rowObject[col] !== undefined ? rowObject[col] : ''; });
  getSheet(sheetName).appendRow(row);
}

function updateRow(sheetName, matchColumn, matchValue, updateObject) {
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var colIndex = headers.indexOf(matchColumn);
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][colIndex]) === String(matchValue)) {
      Object.keys(updateObject).forEach(function(key) {
        var ki = headers.indexOf(key);
        if (ki >= 0) sheet.getRange(i + 1, ki + 1).setValue(updateObject[key]);
      });
      return true;
    }
  }
  return false;
}

function deleteRow(sheetName, matchColumn, matchValue) {
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var colIndex = headers.indexOf(matchColumn);
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][colIndex]) === String(matchValue)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}
```

- [ ] **Step 4: Create `Code.gs` with doGet and include**

```javascript
function doGet() {
  getOrCreateSpreadsheet(); // ensure sheets exist on first load
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('HabitForge')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
```

- [ ] **Step 5: Create minimal `index.html` to verify deployment**

```html
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <?!= include('css') ?>
</head>
<body>
  <div id="app">
    <h1>HabitForge</h1>
    <p>Loading...</p>
  </div>
  <?!= include('js') ?>
</body>
</html>
```

Create minimal `css.html` with just the dark background, and minimal `js.html` with a console.log.

- [ ] **Step 6: Verify — test deployment**

Deploy as web app (Execute as: Me, Who has access: Only myself). Open the URL and verify the dark page loads with "HabitForge" and "Loading..." text. Verify the spreadsheet "HabitForge Data" was created with all 5 sheets and correct headers.

- [ ] **Step 7: Commit**

```bash
git add habitforge/
git commit -m "feat: project scaffold with spreadsheet initialization and utility functions"
```

---

### Task 2: Habit Service & Config Service

**Files:**
- Create: `habitforge/HabitService.gs`
- Create: `habitforge/ConfigService.gs`

**Interfaces:**
- Consumes:
  - `SheetService.readAll(sheetName)` → `Object[]`
  - `SheetService.appendRow(sheetName, rowObject)`
  - `SheetService.updateRow(sheetName, matchColumn, matchValue, updateObject)`
  - `SheetService.deleteRow(sheetName, matchColumn, matchValue)`
  - `Utils.generateId()`, `Utils.today()`
- Produces:
  - `getHabits()` → returns `Object[]` of active (non-archived) habits, sorted by `sort_order`
  - `getAllHabits()` → returns `Object[]` including archived
  - `createHabit(habitData)` → creates habit, returns the created habit object
  - `updateHabit(id, updates)` → updates habit fields
  - `archiveHabit(id)` → sets `archived = true`
  - `deleteHabit(id)` → permanently deletes habit and its logs/streaks
  - `getTodayHabits()` → returns habits due today based on Frequency
  - `getConfig()` → returns `Object` (key-value map of all config)
  - `setConfig(key, value)` → updates or creates config entry

- [ ] **Step 1: Create `HabitService.gs`**

```javascript
function getHabits() {
  return readAll('Habits')
    .filter(function(h) { return h.archived !== true && h.archived !== 'true'; })
    .sort(function(a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
}

function getAllHabits() {
  return readAll('Habits')
    .sort(function(a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
}

function createHabit(habitData) {
  var habits = readAll('Habits');
  var maxOrder = habits.reduce(function(max, h) { return Math.max(max, h.sort_order || 0); }, 0);
  
  var habit = {
    id: generateId(),
    name: habitData.name,
    type: habitData.type,
    target: habitData.target || 1,
    unit: habitData.unit || '',
    frequency: habitData.frequency,
    frequency_value: habitData.frequency_value || '',
    color: habitData.color || '#8b5cf6',
    icon: habitData.icon || '⭐',
    sort_order: maxOrder + 1,
    created_at: new Date(),
    archived: false
  };
  
  appendRow('Habits', habit);
  
  appendRow('Streaks', {
    habit_id: habit.id,
    current_streak: 0,
    longest_streak: 0,
    last_completed_date: '',
    freeze_count: 0,
    freeze_month: currentMonth()
  });
  
  return habit;
}

function updateHabit(id, updates) {
  return updateRow('Habits', 'id', id, updates);
}

function archiveHabit(id) {
  return updateRow('Habits', 'id', id, { archived: true });
}

function deleteHabit(id) {
  deleteRow('Habits', 'id', id);
  deleteRow('Streaks', 'habit_id', id);
  var sheet = getSheet('Logs');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var habitIdCol = headers.indexOf('habit_id');
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][habitIdCol]) === String(id)) {
      sheet.deleteRow(i + 1);
    }
  }
}

function getTodayHabits() {
  var habits = getHabits();
  var todayStr = today();
  var dayOfWeek = getDayOfWeek(todayStr);
  
  return habits.filter(function(h) {
    if (h.frequency === 'daily') return true;
    if (h.frequency === 'weekly_count') return true;
    if (h.frequency === 'specific_days') {
      var days = String(h.frequency_value).split(',').map(Number);
      return days.indexOf(dayOfWeek) >= 0;
    }
    return true;
  });
}
```

- [ ] **Step 2: Create `ConfigService.gs`**

```javascript
function getConfig() {
  var rows = readAll('Config');
  var config = {};
  rows.forEach(function(r) { config[r.key] = r.value; });
  return config;
}

function setConfig(key, value) {
  var updated = updateRow('Config', 'key', key, { value: value });
  if (!updated) {
    appendRow('Config', { key: key, value: value });
  }
}
```

- [ ] **Step 3: Verify — test via Apps Script editor**

```javascript
function testHabitService() {
  var h = createHabit({ name: 'Test Habit', type: 'boolean', target: 1, frequency: 'daily' });
  Logger.log('Created: ' + JSON.stringify(h));
  Logger.log('Today habits: ' + JSON.stringify(getTodayHabits()));
  Logger.log('Config: ' + JSON.stringify(getConfig()));
  deleteHabit(h.id);
  Logger.log('After delete: ' + JSON.stringify(getHabits()));
}
```

- [ ] **Step 4: Commit**

```bash
git add habitforge/HabitService.gs habitforge/ConfigService.gs
git commit -m "feat: habit CRUD service and config service"
```

---

### Task 3: Log Service & Streak Service

**Files:**
- Create: `habitforge/LogService.gs`
- Create: `habitforge/StreakService.gs`

**Interfaces:**
- Consumes:
  - `SheetService.*` (all CRUD helpers)
  - `Utils.*` (date helpers)
  - `getConfig()` → config map
  - `getHabits()` → active habits
- Produces:
  - `checkIn(habitId, value)` → records Check-in, updates streak, returns `{ log, streak, completed }`
  - `uncheckIn(habitId, date)` → removes Check-in for a date, recalculates streak
  - `getTodayLogs()` → returns today's log entries
  - `getLogsByDateRange(startDate, endDate)` → returns logs in range
  - `getStreaks()` → returns all streak records
  - `getStreak(habitId)` → returns streak for one habit
  - `recalculateStreak(habitId)` → full recalculation from log history
  - `processMidnightStreaks()` → daily trigger function: check missed days, apply freezes, reset streaks

- [ ] **Step 1: Create `LogService.gs`**

```javascript
function checkIn(habitId, value) {
  var todayStr = today();
  var habits = readAll('Habits');
  var habit = habits.filter(function(h) { return h.id === habitId; })[0];
  if (!habit) throw new Error('Habit not found: ' + habitId);
  
  var target = Number(habit.target) || 1;
  var completed = Number(value) >= target;
  
  var existingLogs = readAll('Logs').filter(function(l) {
    return l.habit_id === habitId && formatDate(new Date(l.date)) === todayStr;
  });
  
  if (existingLogs.length > 0) {
    updateRow('Logs', 'id', existingLogs[0].id, {
      value: value,
      completed: completed,
      timestamp: new Date()
    });
  } else {
    appendRow('Logs', {
      id: generateId(),
      date: todayStr,
      habit_id: habitId,
      value: value,
      completed: completed,
      timestamp: new Date(),
      calendar_event_id: ''
    });
  }
  
  var streak = updateStreakOnCheckIn(habitId, todayStr, completed);
  return { completed: completed, streak: streak };
}

function uncheckIn(habitId, date) {
  var logs = readAll('Logs');
  var log = logs.filter(function(l) {
    return l.habit_id === habitId && formatDate(new Date(l.date)) === date;
  })[0];
  
  if (log) {
    deleteRow('Logs', 'id', log.id);
    recalculateStreak(habitId);
  }
}

function getTodayLogs() {
  var todayStr = today();
  return readAll('Logs').filter(function(l) {
    return formatDate(new Date(l.date)) === todayStr;
  });
}

function getLogsByDateRange(startDate, endDate) {
  return readAll('Logs').filter(function(l) {
    var d = formatDate(new Date(l.date));
    return d >= startDate && d <= endDate;
  });
}
```

- [ ] **Step 2: Create `StreakService.gs`**

```javascript
function getStreaks() {
  return readAll('Streaks');
}

function getStreak(habitId) {
  var streaks = readAll('Streaks');
  return streaks.filter(function(s) { return s.habit_id === habitId; })[0] || {
    habit_id: habitId, current_streak: 0, longest_streak: 0,
    last_completed_date: '', freeze_count: 0, freeze_month: currentMonth()
  };
}

function updateStreakOnCheckIn(habitId, dateStr, completed) {
  var streak = getStreak(habitId);
  var cm = currentMonth();
  
  if (streak.freeze_month !== cm) {
    streak.freeze_count = 0;
    streak.freeze_month = cm;
  }
  
  if (completed) {
    var lastDate = streak.last_completed_date ? formatDate(new Date(streak.last_completed_date)) : '';
    var habit = readAll('Habits').filter(function(h) { return h.id === habitId; })[0];
    var isConsecutive = checkConsecutive(habit, lastDate, dateStr);
    
    if (isConsecutive || streak.current_streak === 0) {
      streak.current_streak = (streak.current_streak || 0) + 1;
    } else {
      streak.current_streak = 1;
    }
    
    streak.longest_streak = Math.max(streak.longest_streak || 0, streak.current_streak);
    streak.last_completed_date = dateStr;
  }
  
  updateRow('Streaks', 'habit_id', habitId, streak);
  return streak;
}

function checkConsecutive(habit, lastDateStr, currentDateStr) {
  if (!lastDateStr) return true;
  
  var lastDate = parseDate(lastDateStr);
  var currentDate = parseDate(currentDateStr);
  var diffDays = Math.round((currentDate - lastDate) / (1000 * 60 * 60 * 24));
  
  if (habit.frequency === 'daily') {
    return diffDays === 1;
  }
  
  if (habit.frequency === 'specific_days') {
    var days = String(habit.frequency_value).split(',').map(Number);
    var checkDate = new Date(lastDate.getTime() + 86400000);
    while (formatDate(checkDate) < currentDateStr) {
      if (days.indexOf(checkDate.getDay()) >= 0) {
        return false;
      }
      checkDate = new Date(checkDate.getTime() + 86400000);
    }
    return true;
  }
  
  if (habit.frequency === 'weekly_count') {
    return diffDays <= 7;
  }
  
  return diffDays === 1;
}

function recalculateStreak(habitId) {
  var habit = readAll('Habits').filter(function(h) { return h.id === habitId; })[0];
  if (!habit) return;
  
  var logs = readAll('Logs')
    .filter(function(l) { return l.habit_id === habitId && (l.completed === true || l.completed === 'true'); })
    .sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
  
  var currentStreak = 0;
  var longestStreak = 0;
  var lastDate = '';
  
  logs.forEach(function(log) {
    var logDate = formatDate(new Date(log.date));
    if (currentStreak === 0 || checkConsecutive(habit, lastDate, logDate)) {
      currentStreak++;
    } else {
      currentStreak = 1;
    }
    longestStreak = Math.max(longestStreak, currentStreak);
    lastDate = logDate;
  });
  
  if (lastDate) {
    var todayStr = today();
    if (!checkConsecutive(habit, lastDate, todayStr) && lastDate !== todayStr) {
      currentStreak = 0;
    }
  }
  
  updateRow('Streaks', 'habit_id', habitId, {
    current_streak: currentStreak,
    longest_streak: longestStreak,
    last_completed_date: lastDate
  });
}

function processMidnightStreaks() {
  var habits = getHabits();
  var config = getConfig();
  var freezePerMonth = Number(config.freeze_per_month) || 2;
  var autoFreeze = config.auto_freeze === 'true';
  var yesterdayStr = formatDate(new Date(new Date().getTime() - 86400000));
  var cm = currentMonth();
  
  habits.forEach(function(habit) {
    var streak = getStreak(habit.id);
    
    if (streak.freeze_month !== cm) {
      streak.freeze_count = 0;
      streak.freeze_month = cm;
    }
    
    var wasDueYesterday = isDueOnDate(habit, yesterdayStr);
    if (!wasDueYesterday) return;
    
    var yesterdayLog = readAll('Logs').filter(function(l) {
      return l.habit_id === habit.id && formatDate(new Date(l.date)) === yesterdayStr && (l.completed === true || l.completed === 'true');
    });
    
    if (yesterdayLog.length === 0 && streak.current_streak > 0) {
      if (autoFreeze && streak.freeze_count < freezePerMonth) {
        streak.freeze_count++;
        appendRow('Logs', {
          id: generateId(),
          date: yesterdayStr,
          habit_id: habit.id,
          value: -1,
          completed: false,
          timestamp: new Date(),
          calendar_event_id: ''
        });
      } else {
        streak.current_streak = 0;
      }
      updateRow('Streaks', 'habit_id', habit.id, streak);
    }
  });
}

function isDueOnDate(habit, dateStr) {
  if (habit.frequency === 'daily') return true;
  if (habit.frequency === 'specific_days') {
    var days = String(habit.frequency_value).split(',').map(Number);
    return days.indexOf(getDayOfWeek(dateStr)) >= 0;
  }
  if (habit.frequency === 'weekly_count') return true;
  return true;
}
```

- [ ] **Step 3: Verify — test streak logic**

```javascript
function testStreakService() {
  var h = createHabit({ name: 'Streak Test', type: 'boolean', target: 1, frequency: 'daily' });
  var result = checkIn(h.id, 1);
  Logger.log('Check-in result: ' + JSON.stringify(result));
  Logger.log('Streak: ' + JSON.stringify(getStreak(h.id)));
  deleteHabit(h.id);
}
```

- [ ] **Step 4: Commit**

```bash
git add habitforge/LogService.gs habitforge/StreakService.gs
git commit -m "feat: check-in logging and streak calculation with freeze support"
```

---

### Task 4: Calendar Service

**Files:**
- Create: `habitforge/CalendarService.gs`

**Interfaces:**
- Consumes:
  - `getConfig()` → config map (for `calendar_id`, `calendar_enabled`)
  - `SheetService.updateRow()` → store event ID in log
- Produces:
  - `writeToCalendar(habitName, value, unit, color, date)` → creates Calendar event, returns event ID string
  - `batchWriteToCalendar(completions)` → writes multiple completions, returns `{ success: number, failed: number }`
  - `testCalendarConnection()` → returns `{ success: boolean, calendarName: string }`

- [ ] **Step 1: Create `CalendarService.gs`**

```javascript
var COLOR_MAP = {
  '#8b5cf6': CalendarApp.EventColor.GRAPE,
  '#06b6d4': CalendarApp.EventColor.CYAN,
  '#f59e0b': CalendarApp.EventColor.BANANA,
  '#f43f5e': CalendarApp.EventColor.TOMATO,
  '#10b981': CalendarApp.EventColor.SAGE,
  '#3b82f6': CalendarApp.EventColor.BLUEBERRY,
  '#ec4899': CalendarApp.EventColor.FLAMINGO,
  '#6366f1': CalendarApp.EventColor.LAVENDER
};

function getCalendarColor(hexColor) {
  return COLOR_MAP[hexColor] || CalendarApp.EventColor.GRAPE;
}

function writeToCalendar(habitName, value, unit, color, date) {
  var config = getConfig();
  if (config.calendar_enabled !== 'true') return '';
  
  try {
    var calendarId = config.calendar_id || 'primary';
    var calendar;
    if (calendarId === 'primary') {
      calendar = CalendarApp.getDefaultCalendar();
    } else {
      calendar = CalendarApp.getCalendarById(calendarId);
    }
    if (!calendar) return '';
    
    var title = '✅ ' + habitName;
    if (unit && value > 1) {
      title += ' — ' + value + ' ' + unit;
    }
    
    var eventDate = parseDate(date);
    var event = calendar.createAllDayEvent(title, eventDate);
    event.setColor(getCalendarColor(color));
    
    return event.getId();
  } catch (e) {
    Logger.log('Calendar write failed: ' + e.message);
    return '';
  }
}

function batchWriteToCalendar(completions) {
  var success = 0;
  var failed = 0;
  
  completions.forEach(function(c) {
    var eventId = writeToCalendar(c.habitName, c.value, c.unit, c.color, c.date);
    if (eventId) {
      success++;
      if (c.logId) {
        updateRow('Logs', 'id', c.logId, { calendar_event_id: eventId });
      }
    } else {
      failed++;
    }
  });
  
  return { success: success, failed: failed };
}

function testCalendarConnection() {
  try {
    var config = getConfig();
    var calendarId = config.calendar_id || 'primary';
    var calendar;
    if (calendarId === 'primary') {
      calendar = CalendarApp.getDefaultCalendar();
    } else {
      calendar = CalendarApp.getCalendarById(calendarId);
    }
    
    if (calendar) {
      return { success: true, calendarName: calendar.getName() };
    }
    return { success: false, calendarName: '' };
  } catch (e) {
    return { success: false, calendarName: e.message };
  }
}
```

- [ ] **Step 2: Verify — test calendar write**

```javascript
function testCalendarService() {
  var result = testCalendarConnection();
  Logger.log('Calendar test: ' + JSON.stringify(result));
  var eventId = writeToCalendar('Test Habit', 1, '', '#8b5cf6', today());
  Logger.log('Event ID: ' + eventId);
}
```

- [ ] **Step 3: Commit**

```bash
git add habitforge/CalendarService.gs
git commit -m "feat: Google Calendar one-way write integration"
```

---

### Task 5: API Layer — Server-to-Client Bridge

**Files:**
- Modify: `habitforge/Code.gs`

**Interfaces:**
- Consumes: all services from Tasks 1–4
- Produces: Public functions callable via `google.script.run`:
  - `api_getDashboardData()` → returns `{ habits, todayLogs, streaks, config, todayStr }`
  - `api_checkIn(habitId, value)` → returns `{ completed, streak }`
  - `api_uncheckIn(habitId)` → returns `{ success }`
  - `api_createHabit(habitData)` → returns created habit
  - `api_updateHabit(id, updates)` → returns `{ success }`
  - `api_archiveHabit(id)` → returns `{ success }`
  - `api_deleteHabit(id)` → returns `{ success }`
  - `api_syncToCalendar(completions)` → returns batch write result
  - `api_getHistoryData(startDate, endDate)` → returns `{ logs, habits }`
  - `api_getStatsData()` → returns `{ habits, streaks, logs, config }`
  - `api_getConfig()` → returns config map
  - `api_setConfig(key, value)` → returns `{ success }`
  - `api_testCalendar()` → returns connection test result
  - `api_getAllHabits()` → returns all habits including archived

- [ ] **Step 1: Add API functions to `Code.gs`**

```javascript
function api_getDashboardData() {
  var habits = getTodayHabits();
  var todayLogs = getTodayLogs();
  var streaks = getStreaks();
  var config = getConfig();
  
  return {
    habits: habits,
    todayLogs: todayLogs,
    streaks: streaks,
    config: config,
    todayStr: today()
  };
}

function api_checkIn(habitId, value) {
  return checkIn(habitId, value);
}

function api_uncheckIn(habitId) {
  uncheckIn(habitId, today());
  return { success: true };
}

function api_createHabit(habitData) {
  return createHabit(habitData);
}

function api_updateHabit(id, updates) {
  updateHabit(id, updates);
  return { success: true };
}

function api_archiveHabit(id) {
  archiveHabit(id);
  return { success: true };
}

function api_deleteHabit(id) {
  deleteHabit(id);
  return { success: true };
}

function api_syncToCalendar(completions) {
  return batchWriteToCalendar(completions);
}

function api_getHistoryData(startDate, endDate) {
  return {
    logs: getLogsByDateRange(startDate, endDate),
    habits: getHabits()
  };
}

function api_getStatsData() {
  return {
    habits: getHabits(),
    streaks: getStreaks(),
    logs: readAll('Logs'),
    config: getConfig()
  };
}

function api_getConfig() {
  return getConfig();
}

function api_setConfig(key, value) {
  setConfig(key, value);
  return { success: true };
}

function api_testCalendar() {
  return testCalendarConnection();
}

function api_getAllHabits() {
  return getAllHabits();
}

function api_getSpreadsheetUrl() {
  return getOrCreateSpreadsheet().getUrl();
}
```

- [ ] **Step 2: Set up midnight trigger installer**

```javascript
function installMidnightTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t) {
    if (t.getHandlerFunction() === 'processMidnightStreaks') {
      ScriptApp.deleteTrigger(t);
    }
  });
  
  ScriptApp.newTrigger('processMidnightStreaks')
    .timeBased()
    .everyDays(1)
    .atHour(0)
    .nearMinute(5)
    .create();
}
```

- [ ] **Step 3: Verify — call API from editor**

```javascript
function testAPI() {
  var dashboard = api_getDashboardData();
  Logger.log('Dashboard: ' + JSON.stringify(dashboard));
}
```

- [ ] **Step 4: Commit**

```bash
git add habitforge/Code.gs
git commit -m "feat: API layer bridging server services to client-side calls"
```

---

### Task 6: CSS Design System — Dark Mode Premium UI

**Files:**
- Rewrite: `habitforge/css.html`

**Interfaces:**
- Consumes: nothing (pure CSS)
- Produces: Complete CSS design system with all tokens, components, animations, and responsive layout

- [ ] **Step 1: Build the complete CSS design system in `css.html`**

All design tokens (colors, spacing, radius, shadows, typography, z-index, transitions) as CSS custom properties. Full styles for:

- Reset and base body/app layout
- Loading screen (centered logo, spinner)
- Tab bar (fixed bottom, frosted glass `backdrop-filter: blur(20px)`, gradient border-top)
- Tab panels (full height, scroll, padding for bottom bar)
- Streak banner (gradient text via `background-clip: text`, glow shadow animation)
- Habit cards (3 types: boolean, quantitative, duration — each with distinct states)
- Progress ring (SVG circle with `stroke-dasharray` animation)
- FAB (gradient circle, positioned above tab bar, scale-on-hover)
- Bottom sheet (slide-up animation, rounded top corners, dark overlay)
- Form elements (dark inputs, gradient buttons, pill selectors, color picker, emoji grid)
- Contribution graph (CSS grid, colored cells with opacity levels)
- Calendar view (7-column grid, day cells, month navigation)
- Stat cards (gradient accents, bar charts, radial charts)
- Settings list (section headers, toggle switches, destructive buttons)
- Toast notifications (slide-in from top)
- Skeleton loading states (shimmer animation)
- Empty states (centered, muted text)

Key animation keyframes:
- `@keyframes pulse-glow` — streak banner pulsing
- `@keyframes check-draw` — SVG checkmark stroke animation
- `@keyframes shimmer` — completion shimmer sweep
- `@keyframes slide-up` — bottom sheet entry
- `@keyframes fade-in` — tab transitions
- `@keyframes scale-tap` — button press feedback
- `@keyframes skeleton` — loading skeleton shimmer

Responsive: all touch targets ≥ 44px, no horizontal scroll at 360px–414px widths.

- [ ] **Step 2: Verify — reload web app and confirm dark theme renders**

Open the deployed web app URL. Verify dark background, Inter font loads, no broken layouts at mobile viewport.

- [ ] **Step 3: Commit**

```bash
git add habitforge/css.html
git commit -m "feat: complete dark-mode design system with premium gradients and animations"
```

---

### Task 7: Frontend — SPA Shell & Tab Navigation

**Files:**
- Rewrite: `habitforge/index.html`
- Create: `habitforge/components.html`
- Begin: `habitforge/js.html` (SPA router + state management)

**Interfaces:**
- Consumes: CSS design system from Task 6
- Produces:
  - SPA shell with 4 tab panels
  - Tab switching (client-side, no server roundtrip)
  - State manager: `App.state`, `App.setState()`, `App.render()`
  - Tab renderers: `renderDashboard()`, `renderHistory()`, `renderStats()`, `renderSettings()`
  - Loading state and error handling UI

- [ ] **Step 1: Build `index.html` SPA shell**

```html
<!DOCTYPE html>
<html lang="id">
<head>
  <base target="_top">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>HabitForge</title>
  <?!= include('css') ?>
</head>
<body>
  <div id="app">
    <div id="loading-screen" class="loading-screen">
      <div class="loading-logo">🔥</div>
      <div class="loading-text">HabitForge</div>
      <div class="loading-spinner"></div>
    </div>
    
    <main id="main-content" class="main-content" style="display:none;">
      <div id="tab-dashboard" class="tab-panel active"></div>
      <div id="tab-history" class="tab-panel"></div>
      <div id="tab-stats" class="tab-panel"></div>
      <div id="tab-settings" class="tab-panel"></div>
    </main>
    
    <nav id="tab-bar" class="tab-bar" style="display:none;">
      <button class="tab-btn active" data-tab="dashboard">
        <span class="tab-icon">🏠</span>
        <span class="tab-label">Dashboard</span>
      </button>
      <button class="tab-btn" data-tab="history">
        <span class="tab-icon">📅</span>
        <span class="tab-label">History</span>
      </button>
      <button class="tab-btn" data-tab="stats">
        <span class="tab-icon">📊</span>
        <span class="tab-label">Stats</span>
      </button>
      <button class="tab-btn" data-tab="settings">
        <span class="tab-icon">⚙️</span>
        <span class="tab-label">Settings</span>
      </button>
    </nav>
    
    <div id="modal-overlay" class="modal-overlay"></div>
    <div id="bottom-sheet" class="bottom-sheet"></div>
    
    <button id="fab" class="fab" style="display:none;">
      <span>+</span>
    </button>
  </div>
  
  <?!= include('components') ?>
  <?!= include('js') ?>
</body>
</html>
```

- [ ] **Step 2: Build `components.html` with HTML templates**

Template functions returning HTML strings for: habit card, add-habit form, day detail sheet, stat card, settings sections. Implemented as JavaScript functions inside a `<script>` tag.

- [ ] **Step 3: Build `js.html` — SPA core (state + router + init)**

```javascript
var App = {
  state: {
    activeTab: 'dashboard',
    habits: [],
    todayLogs: [],
    streaks: [],
    config: {},
    todayStr: '',
    loading: true,
    modalOpen: false
  },
  
  init: function() {
    App.bindTabNavigation();
    App.bindFAB();
    App.loadDashboardData();
  },
  
  setState: function(updates) {
    Object.keys(updates).forEach(function(k) { App.state[k] = updates[k]; });
    App.render();
  },
  
  render: function() {
    switch (App.state.activeTab) {
      case 'dashboard': renderDashboard(); break;
      case 'history': renderHistory(); break;
      case 'stats': renderStats(); break;
      case 'settings': renderSettings(); break;
    }
  },
  
  switchTab: function(tabName) {
    App.state.activeTab = tabName;
    document.querySelectorAll('.tab-panel').forEach(function(p) {
      p.classList.remove('active');
    });
    document.getElementById('tab-' + tabName).classList.add('active');
    document.querySelectorAll('.tab-btn').forEach(function(b) {
      b.classList.toggle('active', b.dataset.tab === tabName);
    });
    // Show FAB only on dashboard
    document.getElementById('fab').style.display = tabName === 'dashboard' ? 'flex' : 'none';
    App.render();
  },
  
  bindTabNavigation: function() {
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        App.switchTab(this.dataset.tab);
      });
    });
  },
  
  bindFAB: function() {
    document.getElementById('fab').addEventListener('click', function() {
      showAddHabitSheet();
    });
  },
  
  loadDashboardData: function() {
    google.script.run
      .withSuccessHandler(function(data) {
        App.setState({
          habits: data.habits,
          todayLogs: data.todayLogs,
          streaks: data.streaks,
          config: data.config,
          todayStr: data.todayStr,
          loading: false
        });
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        document.getElementById('tab-bar').style.display = 'flex';
        document.getElementById('fab').style.display = 'flex';
      })
      .withFailureHandler(function(err) {
        document.getElementById('loading-screen').innerHTML =
          '<div class="error-state">⚠️ Failed to load: ' + err.message + '</div>';
      })
      .api_getDashboardData();
  },
  
  showToast: function(message, type) {
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + (type || 'info');
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function() { toast.classList.add('show'); }, 10);
    setTimeout(function() {
      toast.classList.remove('show');
      setTimeout(function() { toast.remove(); }, 300);
    }, 3000);
  }
};

document.addEventListener('DOMContentLoaded', App.init);
```

- [ ] **Step 4: Verify — tab switching works**

Reload web app. Verify loading screen transitions, tabs switch with animation, FAB visibility toggles.

- [ ] **Step 5: Commit**

```bash
git add habitforge/index.html habitforge/components.html habitforge/js.html
git commit -m "feat: SPA shell with tab navigation, state management, and loading screen"
```

---

### Task 8: Frontend — Dashboard Tab (Check-in + Streak + Add Habit)

**Files:**
- Modify: `habitforge/js.html` (add `renderDashboard()` and related functions)
- Modify: `habitforge/components.html` (add dashboard component templates)

**Interfaces:**
- Consumes: `App.state`, `api_checkIn`, `api_uncheckIn`, `api_createHabit`
- Produces: Full dashboard UI with check-in, streak display, add-habit bottom sheet

- [ ] **Step 1: Implement `renderDashboard()`**

Renders three sections:
1. **Streak banner** — finds max current streak, renders gradient text `🔥 {N} Day Streak` with glow
2. **Progress ring** — SVG `<circle>` with animated `stroke-dashoffset`, showing `X/Y completed`
3. **Habit card list** — each habit card with icon, name, progress, tap handler. Completed cards sorted to bottom with `completed` class.

- [ ] **Step 2: Implement check-in interactions**

- `handleBooleanCheckIn(habitId)` — toggle: if uncompleted, call `api_checkIn(id, 1)`; if completed, call `api_uncheckIn(id)`. Optimistic UI: immediately toggle card state, revert on error.
- `handleQuantitativeCheckIn(habitId)` — expand inline stepper below card with -/+ buttons and number display. On confirm, call `api_checkIn(id, value)`.
- `handleDurationCheckIn(habitId)` — expand inline minute input. On confirm, call `api_checkIn(id, minutes)`.
- All: on completion, add `.completed` class to card (triggers CSS animation — shimmer + checkmark draw).

- [ ] **Step 3: Implement add-habit bottom sheet**

`showAddHabitSheet()` function:
- Renders form HTML into `#bottom-sheet`
- Shows overlay + slides sheet up
- Form fields: name input, type pills (boolean/quantitative/duration), target input (conditional), unit input (conditional), frequency pills (daily/weekly/specific), frequency value input (conditional), color picker (8 preset circles), icon picker (emoji grid of 16 common icons)
- `saveNewHabit()`: validates form, calls `api_createHabit()`, closes sheet, refreshes dashboard

- [ ] **Step 4: Implement Calendar sync**

After check-in completion, queue completions. When switching away from dashboard tab or after 5 seconds idle, call `api_syncToCalendar()` with queued items.

- [ ] **Step 5: Verify — full dashboard flow**

1. Add a boolean habit → appears in list
2. Tap to complete → animation plays, streak updates
3. Tap again → reverts
4. Add quantitative/duration habits → inline inputs work
5. Progress ring updates
6. Streak banner correct

- [ ] **Step 6: Commit**

```bash
git add habitforge/js.html habitforge/components.html
git commit -m "feat: dashboard tab with check-in, streak banner, progress ring, and add habit"
```

---

### Task 9: Frontend — History Tab

**Files:**
- Modify: `habitforge/js.html` (add `renderHistory()`)

**Interfaces:**
- Consumes: `api_getHistoryData(startDate, endDate)`
- Produces: Contribution graph, month calendar, day detail sheet

- [ ] **Step 1: Implement contribution graph**

`renderContributionGraph()`:
- Calculate start date (52 weeks ago)
- Call `api_getHistoryData()` for that range
- Build 52×7 CSS grid of `<div>` cells
- Each cell colored by completion % (0%=`--bg-card`, 100%=gradient accent)
- Day-of-week labels on left, month labels on top
- Responsive: cells scale to fit viewport width

- [ ] **Step 2: Implement month calendar view**

`renderCalendarMonth(year, month)`:
- 7-column CSS grid (Sun header row + day cells)
- Days with completions get colored dot indicator
- Today highlighted with accent border
- Tap day → calls `showDayDetail(dateStr)`
- Navigation: `<` prev month, `>` next month buttons

- [ ] **Step 3: Implement day detail bottom sheet**

`showDayDetail(dateStr)`:
- Bottom sheet with date header
- List of habits scheduled for that day
- Each shows: icon, name, completed/missed/frozen status
- Frozen days (value === -1) show ❄️ badge

- [ ] **Step 4: Verify**

- Contribution graph renders, responsive on mobile
- Calendar navigation works
- Day detail shows correct data
- Empty states handled

- [ ] **Step 5: Commit**

```bash
git add habitforge/js.html
git commit -m "feat: history tab with contribution graph, calendar view, and day detail"
```

---

### Task 10: Frontend — Stats Tab

**Files:**
- Modify: `habitforge/js.html` (add `renderStats()`)

**Interfaces:**
- Consumes: `api_getStatsData()`
- Produces: Analytics dashboard

- [ ] **Step 1: Implement overall stats**

`renderOverallStats()`:
- Large completion rate % with SVG radial chart
- Toggle pills: "7 Days" / "30 Days" / "All Time"
- Calculated from log data

- [ ] **Step 2: Implement per-habit stat cards**

For each habit:
- Card with icon, name, accent color bar
- Current streak 🔥 and longest streak 🏆 side by side
- Completion rate bar (gradient fill proportional to %)
- Trend: compare last 7d vs previous 7d → ↑ / → / ↓ arrow with color

- [ ] **Step 3: Implement day-of-week chart**

CSS-only horizontal bar chart:
- 7 rows (Mon-Sun)
- Bar width = % of total completions on that day
- Gradient fill bars
- Counts labeled

- [ ] **Step 4: Verify**

- Stats calculate correctly
- Charts render cleanly on mobile
- Empty state shown when no data

- [ ] **Step 5: Commit**

```bash
git add habitforge/js.html
git commit -m "feat: stats tab with completion rates, streak comparisons, and trend charts"
```

---

### Task 11: Frontend — Settings Tab

**Files:**
- Modify: `habitforge/js.html` (add `renderSettings()`)

**Interfaces:**
- Consumes: `api_getConfig`, `api_setConfig`, `api_testCalendar`, `api_getAllHabits`, `api_updateHabit`, `api_archiveHabit`, `api_deleteHabit`, `api_getSpreadsheetUrl`
- Produces: Settings UI

- [ ] **Step 1: Implement settings sections**

`renderSettings()`:
1. **Streak Freeze**: "❄️ X/2 remaining". CSS toggle switch for auto-freeze → calls `api_setConfig('auto_freeze', value)`.
2. **Google Calendar**: Input for Calendar ID, "Test" button → calls `api_testCalendar()`, shows result. Toggle enable/disable → calls `api_setConfig()`.
3. **Manage Habits**: List from `api_getAllHabits()`. Each item: icon, name, archived badge. Tap → `showEditHabitSheet(habit)`.
4. **Open Spreadsheet**: Button → calls `api_getSpreadsheetUrl()`, opens via `window.open()`.
5. **Install Trigger**: Button → calls `google.script.run.installMidnightTrigger()`.

- [ ] **Step 2: Implement edit habit flow**

`showEditHabitSheet(habit)`:
- Reuse add-habit bottom sheet form, pre-filled
- Save → `api_updateHabit(id, updates)`
- Archive button → `api_archiveHabit(id)` with confirm dialog
- Delete button → `api_deleteHabit(id)` with confirm dialog (destructive red)

- [ ] **Step 3: Verify — end-to-end settings**

- Auto-freeze toggle persists
- Calendar test returns name
- Edit/archive/delete habits work
- Spreadsheet link opens

- [ ] **Step 4: Commit**

```bash
git add habitforge/js.html
git commit -m "feat: settings tab with freeze config, calendar setup, and habit management"
```

---

### Task 12: Polish & Final Integration

**Files:**
- Modify: `habitforge/css.html` (animation polish, responsive fixes)
- Modify: `habitforge/js.html` (edge cases, empty states, error handling)

**Interfaces:**
- Consumes: all previous tasks
- Produces: Production-ready app

- [ ] **Step 1: Add empty states**

For each tab when no data:
- Dashboard: "No habits yet. Tap + to get started! 🚀" (centered, gradient text)
- History: "Start tracking to see your history 📅"
- Stats: "Complete some habits to see stats 📊"

- [ ] **Step 2: Add toast notification system**

`App.showToast(message, type)` with CSS slide-in animation. Types: `success` (green), `error` (red), `info` (blue).

- [ ] **Step 3: Add loading/disabled states**

- Skeleton loading cards (shimmer animation) while fetching
- Disable habit cards while server call in-flight (prevent double-tap)
- Spinner overlay on form submission

- [ ] **Step 4: Responsive polish**

Test at 360px, 375px, 390px, 414px widths:
- Touch targets ≥ 44px
- No horizontal scroll
- Bottom sheet doesn't overflow
- Contribution graph cells scale properly
- Tab bar labels truncate gracefully

- [ ] **Step 5: Final walkthrough**

Complete user journey:
1. First load → empty dashboard
2. Add 3 habits (boolean, quantitative, duration)
3. Complete all → streak shows, calendar events created
4. History → today has entries
5. Stats → correct rates
6. Settings → edit habit, test calendar, check freeze
7. Reload → data persists

- [ ] **Step 6: Commit**

```bash
git add habitforge/
git commit -m "feat: polish — empty states, error handling, loading states, responsive fixes"
```

---

### Task 13: Spreadsheet Dashboard Sheet

**Files:**
- Modify: `habitforge/SheetService.gs`

**Interfaces:**
- Consumes: `initializeSheets()`
- Produces: Auto-calculated Dashboard sheet with summary formulas

- [ ] **Step 1: Add Dashboard sheet formulas**

Add `setupDashboardSheet(ss)` function called from `initializeSheets()`:

```javascript
function setupDashboardSheet(ss) {
  var sheet = ss.getSheetByName('Dashboard');
  if (sheet.getLastRow() > 1) return; // already set up
  
  var headers = [
    ['HabitForge Dashboard', '', ''],
    ['', '', ''],
    ['Metric', 'Value', 'Formula'],
    ['Total Active Habits', '=COUNTA(Habits!A2:A)-COUNTIF(Habits!L2:L,TRUE)', ''],
    ['Total Completions', '=COUNTIF(Logs!E2:E,TRUE)', ''],
    ['Best Current Streak', '=MAX(Streaks!B2:B)', ''],
    ['All-Time Longest Streak', '=MAX(Streaks!C2:C)', ''],
    ['This Week Completions', '=COUNTIFS(Logs!E2:E,TRUE,Logs!B2:B,">="&TODAY()-WEEKDAY(TODAY(),2)+1)', ''],
    ['This Month Completions', '=COUNTIFS(Logs!E2:E,TRUE,Logs!B2:B,">="&EOMONTH(TODAY(),-1)+1)', '']
  ];
  
  sheet.getRange(1, 1, headers.length, 3).setValues(headers);
  
  // Formatting
  sheet.getRange(1, 1).setFontSize(16).setFontWeight('bold');
  sheet.getRange(3, 1, 1, 3).setFontWeight('bold').setBackground('#e8eaf6');
  sheet.setColumnWidth(1, 250);
  sheet.setColumnWidth(2, 150);
}
```

- [ ] **Step 2: Verify — open spreadsheet, confirm Dashboard calculates**

- [ ] **Step 3: Commit**

```bash
git add habitforge/SheetService.gs
git commit -m "feat: auto-calculated Dashboard sheet with summary formulas"
```
