// ==================== Configuration ====================

// Relative paths work both locally and on any hosted domain (Render, etc.)
window.API_BASE  = "/api";
window.LINKS_API = "/api/links";

// ==================== Owner Colors ====================

window.DEFAULT_OWNER_COLOR_LIGHT = "#E5E7EB";
window.DEFAULT_OWNER_COLOR_DARK  = "#334155";
window.DEFAULT_OWNER_COLOR = window.DEFAULT_OWNER_COLOR_LIGHT;

function getOwnerColor(owner) {
  const dark = document.documentElement.classList.contains("dark");
  const def  = dark ? window.DEFAULT_OWNER_COLOR_DARK : window.DEFAULT_OWNER_COLOR_LIGHT;
  if (!owner) return def;
  const owners = (window.appState.config && window.appState.config.owners) || [];
  const entry  = owners.find((o) => o.name === owner);
  return entry ? (dark ? entry.dark : entry.light) : def;
}

window.clearOwnerColorCache = function () {};
window.getOwnerColor = getOwnerColor;

// ==================== Global State ====================
window.appState = {
  config: null,
  sectors: [],
  sites: [],
  radios: [],
  links: [],
  plannedMissions: [],
  archivedMissions: [],
  hierarchy: [],
  sortColumn: "frequency_band",
  sortDirection: "asc",
  expandedSectors: {},
  expandedSites: {},
  allExpanded: true,
};

window.overviewFreqMode = "frequency"; // "frequency" | "link"
