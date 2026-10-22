(() => {
  "use strict";

  const api = globalThis.browser ?? globalThis.chrome;

  const DEFAULTS = { enabled: true, placeholder: true, hideGifButton: true };

  // One element per comment or reply (desktop, Shorts panel, mobile web).
  const COMMENT_ROOTS = [
    "ytd-comment-view-model",
    "ytd-comment-renderer",
    "ytm-comment-view-model",
    "ytm-comment-renderer",
  ].join(",");

  // Parts of a comment that legitimately show images: avatar, author line, badges, toolbar, reply box.
  const SAFE_AREAS = [
    "#author-thumbnail",
    "#author-thumbnail-button",
    "#header",
    "#header-author",
    "#toolbar",
    "#action-buttons",
    "#creator-heart",
    "#reply-dialog",
    "#paid-comment-chip",
    "#paid-comment-background",
    "ytd-commentbox",
    "ytd-author-comment-badge-renderer",
    "ytd-sponsor-comment-badge-renderer",
    "ytd-creator-heart-renderer",
    "ytd-comment-engagement-bar",
    "ytd-pinned-comment-badge-renderer",
    "ytm-profile-icon",
    "ytm-comment-action-buttons-renderer",
    ".comment-icon-container",
    ".comment-header",
    ".comment-title",
  ].join(",");

  // Comment text, where custom emojis are rendered as inline <img>.
  const TEXT_AREAS = "#content-text, yt-attributed-string, .yt-core-attributed-string, .comment-text";

  const MEDIA = "img, video, picture, canvas";
  const MEDIA_SOURCES = "img, video, source";
  const GIF_SRC = /\.gif(?:[?#]|$)|giphy\.|tenor\.(?:com|googleapis)/i;
  const GIF_NAME = /gif(?!t)/i; // "gif" but not "gift" (gifted memberships)
  const EMOJI_NAME = /emoji/i;
  const MAX_EMOJI_HEIGHT = 40;

  // Wrappers we never collapse a hidden GIF into.
  const STOP_IDS = new Set(["content", "content-text", "expander", "main", "body", "comment", "comment-content"]);

  const PH_ATTR = "data-ynog-ph";
  const placeholders = new WeakMap();
  let settings = { ...DEFAULTS };

  // ---- Settings -----------------------------------------------------------

  function applySettings(next) {
    settings = { ...DEFAULTS, ...next };
    const html = document.documentElement;
    html.toggleAttribute("data-ynog-on", settings.enabled);
    html.toggleAttribute("data-ynog-placeholder", settings.placeholder);
    html.toggleAttribute("data-ynog-hide-button", settings.hideGifButton);
  }

  applySettings(DEFAULTS);
  api.storage.sync.get(DEFAULTS).then(applySettings, () => {});
  api.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    const next = { ...settings };
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (key in DEFAULTS) next[key] = newValue ?? DEFAULTS[key];
    }
    applySettings(next);
  });

  // ---- Detection ----------------------------------------------------------

  function srcOf(el) {
    const src = el.getAttribute("src") || el.getAttribute("srcset") || "";
    return src.startsWith("data:") ? "" : src;
  }

  function nameOf(el) {
    return `${el.localName} ${el.id} ${el.getAttribute("class") ?? ""}`;
  }

  function isInside(el, selector, root) {
    const match = el.closest(selector);
    return match !== null && root.contains(match);
  }

  function looksLikeGif(el, root) {
    if (isInside(el, SAFE_AREAS, root)) return false;

    const isMedia = el.matches(MEDIA);
    if (!isMedia) return GIF_NAME.test(nameOf(el));

    if (GIF_NAME.test(nameOf(el))) return true;
    if (el.localName === "img" && GIF_SRC.test(srcOf(el))) return true;
    if (el.localName === "video") return true;

    // Inline images in the comment text are custom emojis unless they are rendered big.
    if (EMOJI_NAME.test(nameOf(el)) || EMOJI_NAME.test(el.parentElement ? nameOf(el.parentElement) : "")) return false;
    if (isInside(el, TEXT_AREAS, root)) {
      return el.getBoundingClientRect().height > MAX_EMOJI_HEIGHT;
    }

    // Any other picture in the comment body is an attachment.
    return true;
  }

  // Collapse single-child wrappers so no empty box is left behind.
  function hideTargetFor(el, root) {
    let target = el;
    for (;;) {
      const parent = target.parentElement;
      if (!parent || parent === root || STOP_IDS.has(parent.id) || parent.matches(TEXT_AREAS)) break;
      if (parent.childElementCount !== 1 || parent.textContent.trim() !== "") break;
      target = parent;
    }
    return target;
  }

  function signatureOf(target) {
    const sources = target.matches(MEDIA_SOURCES) ? [target] : [];
    sources.push(...target.querySelectorAll(MEDIA_SOURCES));
    return sources.map(srcOf).join("|");
  }

  // ---- Hiding -------------------------------------------------------------

  function setState(target, state) {
    target.setAttribute("data-ynog", state);
    const ph = placeholders.get(target);
    if (ph) {
      ph.querySelector("span").textContent = state === "hidden" ? "GIF hidden" : "GIF";
      ph.querySelector("button").textContent = state === "hidden" ? "Show" : "Hide";
    }
    for (const video of target.matches("video") ? [target] : target.querySelectorAll("video")) {
      if (state === "hidden") video.pause();
      else if (video.autoplay) video.play().catch(() => {});
    }
  }

  function makePlaceholder(target) {
    const ph = document.createElement("div");
    ph.className = "ynog-ph";
    ph.setAttribute(PH_ATTR, "");
    const label = document.createElement("span");
    const button = document.createElement("button");
    button.type = "button";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setState(target, target.getAttribute("data-ynog") === "hidden" ? "shown" : "hidden");
    });
    ph.append(label, button);
    return ph;
  }

  function hide(target) {
    target.setAttribute("data-ynog-sig", signatureOf(target));
    const ph = makePlaceholder(target);
    placeholders.set(target, ph);
    target.before(ph);
    setState(target, "hidden");
  }

  function unhide(target) {
    target.removeAttribute("data-ynog");
    target.removeAttribute("data-ynog-sig");
    placeholders.get(target)?.remove();
    placeholders.delete(target);
  }

  function scanComment(root) {
    // YouTube recycles comment elements, so drop marks whose media has since changed.
    for (const target of root.querySelectorAll("[data-ynog]")) {
      if (target.getAttribute("data-ynog-sig") !== signatureOf(target)) unhide(target);
    }
    // Placeholders whose target was removed or recycled away.
    for (const ph of root.querySelectorAll(`[${PH_ATTR}]`)) {
      const target = ph.nextElementSibling;
      if (!target || placeholders.get(target) !== ph) ph.remove();
    }

    for (const el of root.querySelectorAll("*")) {
      if (el.hasAttribute(PH_ATTR) || el.closest(`[data-ynog], [${PH_ATTR}]`)) continue;
      if (looksLikeGif(el, root)) hide(hideTargetFor(el, root));
    }
  }

  // ---- Observation --------------------------------------------------------

  const pending = new Set();
  let scheduled = false;

  function queue(root) {
    pending.add(root);
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      const roots = [...pending];
      pending.clear();
      for (const r of roots) if (r.isConnected) scanComment(r);
    });
  }

  function queueFrom(node) {
    const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    if (!el) return;
    const root = el.closest(COMMENT_ROOTS);
    if (root) queue(root);
    for (const inner of el.querySelectorAll(COMMENT_ROOTS)) queue(inner);
  }

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "attributes") {
        const root = record.target.closest(COMMENT_ROOTS);
        if (root) queue(root);
      } else {
        // Removed media may leave a stale placeholder behind.
        if (record.removedNodes.length > 0) {
          const root = record.target.closest?.(COMMENT_ROOTS);
          if (root) queue(root);
        }
        for (const node of record.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE && node.hasAttribute(PH_ATTR)) continue;
          queueFrom(node);
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", "srcset"],
  });

  // Emoji-vs-GIF sizing is only known once an inline image has loaded.
  document.addEventListener(
    "load",
    (event) => {
      if (event.target instanceof HTMLImageElement) queueFrom(event.target);
    },
    true,
  );

  queueFrom(document.documentElement);
})();
