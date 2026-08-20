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
