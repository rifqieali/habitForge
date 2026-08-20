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
