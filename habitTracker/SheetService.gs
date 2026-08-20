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
