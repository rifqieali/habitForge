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
