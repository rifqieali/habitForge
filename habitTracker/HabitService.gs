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
    sort_order: new Date().getTime(),
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
