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
