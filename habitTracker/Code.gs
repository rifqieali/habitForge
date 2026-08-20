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
