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
