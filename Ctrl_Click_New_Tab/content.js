(() => {
  "use strict";

  function isCtrlLeftClick(event) {
    return event.button === 0 && event.ctrlKey && !event.altKey && !event.shiftKey;
  }

  function toAbsoluteUrl(raw) {
    if (!raw) return null;
    const trimmed = String(raw).trim();
    if (!trimmed || trimmed.startsWith("#")) return null;
    if (/^javascript:/i.test(trimmed)) return null;
    try {
      return new URL(trimmed, location.href).href;
    } catch {
      return null;
    }
  }

  function urlFromOnclickAttr(onclickText) {
    if (!onclickText) return null;

    const patterns = [
      /location\.href\s*=\s*['"]([^'"]+)['"]/i,
      /location\.assign\(\s*['"]([^'"]+)['"]\s*\)/i,
      /window\.open\(\s*['"]([^'"]+)['"]/i
    ];

    for (const re of patterns) {
      const match = onclickText.match(re);
      if (match?.[1]) return toAbsoluteUrl(match[1]);
    }
    return null;
  }

  function extractNavigationUrl(target) {
    if (!target || !(target instanceof Element)) return null;

    const anchor = target.closest("a[href]");
    if (anchor) return toAbsoluteUrl(anchor.getAttribute("href") || anchor.href);

    const btn = target.closest("button, [role='button'], [onclick], [data-href], [data-url], [href], [formaction]");
    if (!btn) return null;

    const fromData = toAbsoluteUrl(btn.getAttribute("data-href") || btn.getAttribute("data-url"));
    if (fromData) return fromData;

    const fromHref = toAbsoluteUrl(btn.getAttribute("href"));
    if (fromHref) return fromHref;

    const fromFormAction = toAbsoluteUrl(btn.getAttribute("formaction"));
    if (fromFormAction) return fromFormAction;

    return urlFromOnclickAttr(btn.getAttribute("onclick"));
  }

  function openInNewTab(url) {
    const popup = window.open(url, "_blank", "noopener,noreferrer");
    return Boolean(popup);
  }

  document.addEventListener(
    "click",
    (event) => {
      if (!isCtrlLeftClick(event)) return;

      const url = extractNavigationUrl(event.target);
      if (!url) return;

      const opened = openInNewTab(url);
      if (!opened) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();
    },
    true
  );
})();
