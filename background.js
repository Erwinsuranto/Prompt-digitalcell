chrome.action.onClicked.addListener((tab) => {
  if (!tab.id || !tab.url || !tab.url.startsWith("https://chatgpt.com/")) {
    return;
  }
  chrome.tabs.sendMessage(tab.id, { type: "BT_TOGGLE_PANEL" }, () => {
    void chrome.runtime.lastError;
  });
});