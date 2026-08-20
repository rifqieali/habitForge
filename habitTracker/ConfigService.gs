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
