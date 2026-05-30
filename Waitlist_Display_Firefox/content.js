(() => {
  "use strict";

  const ORIGINAL_TITLE = document.title;
  const WAIT_REGEX = /Est\.\s*wait:\s*(\d+)\s*(?:person|people)/i;
  let updateTimeout = null;

  function extractWaitNumber() {
    // Quick check before expensive DOM traversal
    if (!document.body.innerText.toLowerCase().includes("wait:")) return null;

    // Focused query to find elements likely to contain the text
    const elements = document.querySelectorAll("span, div, p, li");

    for (const el of elements) {
      // Optimization: elements with many children are likely containers, skip them to find the leaf node
      if (el.children.length > 3) continue;

      const text = (el.textContent || "").trim();
      if (!text || text.length > 100) continue;

      const m = text.match(WAIT_REGEX);
      if (m) return m[1];
    }

    return null;
  }

  function updateTitle() {
    const n = extractWaitNumber();
    const newTitle = n || ORIGINAL_TITLE;
    if (document.title !== newTitle) {
      document.title = newTitle;
    }
  }

  function debouncedUpdate() {
    if (updateTimeout) clearTimeout(updateTimeout);
    updateTimeout = setTimeout(updateTitle, 250);
  }

  // Initial call
  updateTitle();

  // Use MutationObserver for reactive updates
  const observer = new MutationObserver((mutations) => {
    const hasRelevantChange = mutations.some(m => 
      m.type === 'characterData' || m.addedNodes.length > 0 || m.removedNodes.length > 0
    );
    if (hasRelevantChange) debouncedUpdate();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  // Less frequent safety interval
  setInterval(updateTitle, 5000);
})();
