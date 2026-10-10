(() => {
  "use strict";

  const ORIGINAL_TITLE = document.title;
  const DISPLAY_ID = "waitlist-display-extension";
  const WAIT_REGEX = /Est\.\s*wait:\s*(\d+)\s*(?:person|people)/i;
  let updateTimeout = null;

  // --- UI & Styling ---

  function createDisplayElement() {
    const display = document.createElement("div");
    display.id = DISPLAY_ID;
    display.style.display = "none"; // Initially hidden

    const emoji = document.createElement("span");
    emoji.className = "emoji";
    emoji.textContent = "⏳";
    display.appendChild(emoji);
    display.appendChild(document.createTextNode(" Est. Wait: "));

    const waitNumber = document.createElement("strong");
    display.appendChild(waitNumber);

    document.body.appendChild(display);

    const style = document.createElement("style");
    style.textContent = `
      #${DISPLAY_ID} {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        background-color: #ffffff;
        color: #333;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 16px;
        font-weight: 500;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 99999;
        display: flex;
        align-items: center;
        gap: 10px;
        transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
        opacity: 0;
        transform: translateY(10px);
      }
      #${DISPLAY_ID}.visible {
        opacity: 1;
        transform: translateY(0);
      }
      #${DISPLAY_ID} .emoji {
        font-size: 20px;
      }
    `;
    document.head.appendChild(style);

    return { display, waitNumber };
  }

  const { display: displayElement, waitNumber: waitNumberElement } = createDisplayElement();

  // --- Logic ---

  function formatTitle(n) {
    return `⏳ ${n}`;
  }

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

  function debouncedUpdate() {
    if (updateTimeout) clearTimeout(updateTimeout);
    updateTimeout = setTimeout(updateDisplay, 250);
  }

  let lastTitle = document.title;
  let isDisplayVisible = false;
  let lastRenderedN = null;

  function updateDisplay() {
    const n = extractWaitNumber();

    if (n) {
      // Update Tab Title
      const newTitle = formatTitle(n);
      if (document.title !== newTitle) {
        document.title = newTitle;
        lastTitle = newTitle;
      }

      // Update and show the on-page display
      if (n !== lastRenderedN) {
        waitNumberElement.textContent = n;
        lastRenderedN = n;
      }
      if (!isDisplayVisible) {
        displayElement.style.display = "flex";
        // Force reflow before adding class to trigger transition
        void displayElement.offsetWidth;
        displayElement.classList.add("visible");
        isDisplayVisible = true;
      }
    } else {
      // Restore original title if queue is gone
      if (document.title !== ORIGINAL_TITLE && document.title === lastTitle) {
        document.title = ORIGINAL_TITLE;
      }

      // Hide the on-page display
      if (isDisplayVisible) {
        displayElement.classList.remove("visible");
        isDisplayVisible = false;
        // Optional: hide element after transition
        // setTimeout(() => {
        //   if (!isDisplayVisible) displayElement.style.display = 'none';
        // }, 300);
      }
    }
  }

  // --- Initialization ---

  // Initial update
  updateDisplay();

  // Watch for dynamic updates
  const observer = new MutationObserver(() => debouncedUpdate());
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  // Fallback polling for reliability
  setInterval(updateDisplay, 1500);
})();
