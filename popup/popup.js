const api = globalThis.browser ?? globalThis.chrome;

const DEFAULTS = { enabled: true, placeholder: true, hideGifButton: true };

const inputs = [...document.querySelectorAll("input[data-key]")];

function render(settings) {
  for (const input of inputs) {
    input.checked = settings[input.dataset.key];
    // Every other option only applies while the main switch is on.
    input.disabled = input.dataset.key !== "enabled" && !settings.enabled;
  }
}

api.storage.sync.get(DEFAULTS).then(render);

for (const input of inputs) {
  input.addEventListener("change", async () => {
    await api.storage.sync.set({ [input.dataset.key]: input.checked });
    render(await api.storage.sync.get(DEFAULTS));
  });
}

// ---- Bug report link ----------------------------------------------------

const ISSUES_URL = "https://github.com/Cola1000/youtube_no_gif/issues/new";

function describeBrowser() {
  const ua = navigator.userAgent;
  const browser =
    ua.match(/(Firefox)\/(\d+)/) ??
    ua.match(/(Edg)\/(\d+)/) ??
    ua.match(/(OPR)\/(\d+)/) ??
    ua.match(/(Chrome)\/(\d+)/) ?? [null, "Unknown", ""];
  const name = { Edg: "Edge", OPR: "Opera" }[browser[1]] ?? browser[1];
  const os =
    /Android/.test(ua) ? "Android" :
    /Windows/.test(ua) ? "Windows" :
    /Mac OS X/.test(ua) ? "macOS" :
    /CrOS/.test(ua) ? "ChromeOS" :
    /Linux/.test(ua) ? "Linux" : "unknown OS";
  return `${name} ${browser[2]} (${os})`.replace(/\s+\(/, " (");
}

const version = api.runtime.getManifest().version;
document.getElementById("version").textContent = `v${version}`;
document.getElementById("report").href =
  `${ISSUES_URL}?${new URLSearchParams({ template: "bug_report.yml", browser: describeBrowser(), version })}`;
