chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.url) return;
    try {
        const url = new URL(tab.url);
        if (!url.hostname.endsWith("youtube.com")) return;
    } catch (e) {
        return;
    }
    try {
        await chrome.tabs.sendMessage(tab.id, { action: "toggle_ui" });
    } catch (err) {
        console.log("Connection failed. Injecting content script manually...");
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["content.js"]
            });
            setTimeout(() => {
                chrome.tabs.sendMessage(tab.id, { action: "toggle_ui" });
            }, 100);
        } catch (injectionErr) {
            console.error("Failed to inject script:", injectionErr);
        }
    }
});