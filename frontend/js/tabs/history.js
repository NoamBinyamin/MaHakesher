// ==================== History Tab ====================

let _historyEntries = [];
let _historyFilter = "all";

async function loadHistory() {
  try {
    _historyEntries = await apiCall("/audit?limit=200");
  } catch (e) {
    _historyEntries = [];
  }
}

async function refreshHistory() {
  await loadHistory();
  renderHistoryTab();
}

function setHistoryFilter(filter) {
  _historyFilter = filter;
  ["all", "radio", "mission", "sector", "site", "link", "preferences"].forEach(
    (f) => {
      const btn = document.getElementById(`hf-${f}`);
      if (btn)
        btn.className = `btn btn-sm ${f === filter ? "btn-primary" : "btn-secondary"}`;
    },
  );
  renderHistoryTab();
}

// ---- Time formatting ----

function formatTimestamp(iso) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const timeStr = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (diffMins < 1) return t("history.justNow");
  if (diffMins < 60) return t("history.minsAgo", { n: diffMins });
  if (diffHours < 24) return t("history.hoursAgo", { n: diffHours });
  if (diffDays === 1) return t("history.yesterday", { time: timeStr });
  if (diffDays < 7) return t("history.daysAgo", { n: diffDays, time: timeStr });
  return `${date.toLocaleDateString()} ${timeStr}`;
}

// ---- Action & badge metadata ----

function getActionMeta(action) {
  const map = {
    create: { icon: "fa-plus-circle", color: "#10b981" },
    update: { icon: "fa-pen-to-square", color: "#2563eb" },
    delete: { icon: "fa-trash", color: "#ef4444" },
    start_mission: { icon: "fa-play-circle", color: "#10b981" },
    end_mission: { icon: "fa-stop-circle", color: "#6b7280" },
    archive: { icon: "fa-box-archive", color: "#d97706" },
    restore: { icon: "fa-rotate-left", color: "#2563eb" },
    batch_clear: { icon: "fa-broom", color: "#f59e0b" },
    import: { icon: "fa-file-import", color: "#8b5cf6" },
  };
  return map[action] || { icon: "fa-circle-info", color: "#6b7280" };
}

const BADGE_COLORS = {
  radio: "#2563eb",
  mission: "#7c3aed",
  sector: "#d97706",
  site: "#0891b2",
  link: "#059669",
  archived_mission: "#6b7280",
  full_backup: "#8b5cf6",
  owner: "#db2777",
  device: "#0d9488",
  user: "#6366f1",
};

function getBadgeLabel(entity_type) {
  const map = {
    radio: t("history.radio"),
    mission: t("history.mission"),
    sector: t("history.sector"),
    site: t("history.site"),
    link: t("history.link"),
    archived_mission: t("history.badge.archivedMission"),
    full_backup: t("history.badge.fullBackup"),
    owner: t("history.badge.owner"),
    device: t("history.badge.device"),
    user: t("history.badge.user"),
  };
  return map[entity_type] || entity_type.replace(/_/g, " ");
}

// Mapping from raw field names to i18n keys.
// Kept as a static key→key map (not key→translated-string) so that t() is
// called at render time — not at module load — which makes language switching work.
const _FIELD_KEY_MAP = {
  frequency: "history.field.frequency",
  owner: "history.field.owner",
  mission_name: "history.field.mission",
  role: "history.field.role",
  status: "history.field.status",
  standby_frequency: "history.field.standbyFreq",
  standby_owner: "history.field.standbyOwner",
  standby_mission: "history.field.standbyMission",
  standby_role: "history.field.standbyRole",
  name: "history.field.name",
  coordinates_utm: "history.field.coordinates",
  site_type: "history.field.siteType",
  link_name: "history.field.linkName",
  frequency_band: "history.field.band",
  generic_role: "history.field.genericRole",
};

function _getFieldLabel(field) {
  return _FIELD_KEY_MAP[field]
    ? t(_FIELD_KEY_MAP[field])
    : field.replace(/_/g, " ");
}

// ---- Entity lookup helpers ----

function lookupRadioInfo(entityId) {
  const radio = (window.appState.radios || []).find((r) => r.id === entityId);
  if (!radio) return { label: entityId, siteName: null };
  const site = (window.appState.sites || []).find(
    (s) => s.id === radio.site_id,
  );
  return { label: radio.device_type, siteName: site ? site.name : null };
}

function lookupSiteName(entityId) {
  const site = (window.appState.sites || []).find((s) => s.id === entityId);
  return site ? site.name : entityId;
}

function lookupMissionName(entityId) {
  const all = [
    ...(window.appState.plannedMissions || []),
    ...(window.appState.archivedMissions || []),
  ];
  const mission = all.find((m) => m.id === entityId);
  return mission ? mission.name : null;
}

// ---- Parse diff from entry details ----
// Returns [{field, before, after}, ...] — only fields that actually changed.
// Handles both new {before, after} format and legacy flat format.

function parseDiff(entry) {
  const { action, entity_type, details = {} } = entry;
  if (action !== "update") return [];

  // New format: details has 'before' and 'after' sub-objects
  if (details.before !== undefined || details.after !== undefined) {
    const before = details.before || {};
    const after = details.after || {};
    const fields = new Set([...Object.keys(before), ...Object.keys(after)]);
    return [...fields].map((f) => ({
      rawField: f,
      field: _getFieldLabel(f),
      before: before[f] ?? null,
      after: after[f] ?? null,
    }));
  }

  // Legacy flat format: details contains the new values only
  // Show as plain subtitle text instead of a diff
  return [];
}

// ---- Human-readable title ----

function describeTitle(entry) {
  const { action, entity_type, entity_id, details = {} } = entry;

  switch (action) {
    case "create":
      if (entity_type === "radio")
        return t("history.create.radio", {
          device: details.device_type,
          site: details.site_name || lookupSiteName(details.site_id || ""),
        });
      if (entity_type === "sector")
        return t("history.create.sector", { name: details.name });
      if (entity_type === "site")
        return t("history.create.site", { name: details.name });
      if (entity_type === "mission")
        return (
          t("history.create.mission", { name: details.name }) +
          (details.owner ? ` (${details.owner})` : "")
        );
      if (entity_type === "link")
        return t("history.create.link", { name: details.link_name });
      if (entity_type === "owner")
        return t("history.create.owner", { name: details.name });
      if (entity_type === "device")
        return t("history.create.device", {
          name: details.name,
          band: details.band,
        });
      return t("history.create.other", { type: entity_type });

    case "update": {
      if (entity_type === "radio") {
        const { label, siteName } = lookupRadioInfo(entity_id);
        return siteName
          ? t("history.update.radio", { label, site: siteName })
          : t("history.update.radioNoSite", { label });
      }
      if (entity_type === "sector") return t("history.update.sector");
      if (entity_type === "site") return t("history.update.site");
      if (entity_type === "mission") {
        const name =
          (details.after || {}).name ||
          (details.before || {}).name ||
          details.name ||
          lookupMissionName(entity_id) ||
          entity_id;
        return t("history.update.mission", { name });
      }
      if (entity_type === "link") return t("history.update.link");
      if (entity_type === "owner")
        return t("history.update.owner", {
          name: details.new_name || details.old_name || entity_id,
        });
      if (entity_type === "device")
        return t("history.update.device", {
          name: details.new_name || details.old_name || entity_id,
        });
      if (entity_type === "user") {
        const name = details.username || entity_id;
        if (details.action === "password_reset")
          return t("history.update.userPwdReset", { name });
        return t("history.update.userRole", { name });
      }
      return t("history.update.other", { type: entity_type });
    }

    case "delete":
      if (entity_type === "radio") return t("history.delete.radio");
      if (entity_type === "sector")
        return details.cascaded_sites?.length
          ? t("history.delete.sectorWithSites", {
              count: details.cascaded_sites.length,
            })
          : t("history.delete.sector");
      if (entity_type === "site")
        return t("history.delete.site", { name: details.name || entity_id });
      if (entity_type === "mission")
        return t("history.delete.mission", { name: details.name });
      if (entity_type === "archived_mission")
        return t("history.delete.archivedMission", { name: details.name });
      if (entity_type === "link") return t("history.delete.link");
      if (entity_type === "owner")
        return t("history.delete.owner", { name: details.name });
      if (entity_type === "device")
        return t("history.delete.device", { name: details.name });
      return t("history.delete.other", { type: entity_type });

    case "start_mission":
      return t("history.startMission", { name: details.name });
    case "end_mission":
      return t("history.endMission", { name: details.name });
    case "activate":
      return t("history.activate", { name: details.name });
    case "deactivate":
      return t("history.deactivate", { name: details.name });
    case "archive":
      return t("history.archive", { name: details.name });
    case "restore":
      return t("history.restore", { name: details.name });
    case "batch_clear":
      return t("history.batchClear", {
        count: details.devices_cleared ?? "all",
        site: lookupSiteName(entity_id),
      });
    case "import":
      return t("history.import", {
        sectors: details.sectors,
        sites: details.sites,
        radios: details.radios,
      });
    default:
      return `${action} ${entity_type}`;
  }
}

// ---- Translate known enum values stored as English strings ----

const VALUE_LABELS = {
  Fixed: () => t("site.typeFixed"),
  Mobile: () => t("site.typeMobile"),
  Usable: () => t("search.statusUsable"),
  Unusable: () => t("search.statusUnusable"),
};

function translateValue(v) {
  if (v == null) return null;
  const s = String(v);
  return VALUE_LABELS[s] ? VALUE_LABELS[s]() : s;
}

// ---- Render one diff row ----

function renderDiffRow(fieldLabel, beforeVal, afterVal, rawField, entityId) {
  const FREQ_FIELDS = new Set(["frequency", "standby_frequency"]);
  const isFreq = FREQ_FIELDS.has(rawField);

  let band = null;
  if (isFreq && entityId) {
    const radio = (window.appState.radios || []).find((r) => r.id === entityId);
    band = radio?.frequency_band || null;
  }

  const fmt = (v) => {
    if (v == null) return '<span style="color:var(--gray-400);">—</span>';
    if (isFreq && v != null && !isNaN(Number(v))) {
      return `<span>${escapeHTML(formatFrequency(v, band))}</span>`;
    }
    return `<span>${escapeHTML(translateValue(v))}</span>`;
  };

  return `
    <div style="display:flex; align-items:center; gap:0.5rem; font-size:0.78rem; padding: 1px 0;">
      <span style="color:var(--gray-400); min-width:6rem; flex-shrink:0;">${escapeHTML(fieldLabel)}</span>
      <span style="color:#ef4444;">${fmt(beforeVal)}</span>
      <i class="fa-solid fa-arrow-left" style="color:var(--gray-300); font-size:0.65rem; flex-shrink:0;"></i>
      <span style="color:#10b981; font-weight:600;">${fmt(afterVal)}</span>
    </div>`;
}

// ---- Render full tab ----

function renderHistoryTab() {
  const container = document.getElementById("historyList");
  if (!container) return;

  // Always exclude raw login events from the history view
  let entries = _historyEntries.filter(
    (e) => !(e.entity_type === "user" && e.action === "login"),
  );

  if (_historyFilter !== "all") {
    entries = entries.filter((e) => {
      if (_historyFilter === "mission")
        return (
          e.entity_type === "mission" || e.entity_type === "archived_mission"
        );
      if (_historyFilter === "preferences")
        return e.entity_type === "owner" || e.entity_type === "device" || e.entity_type === "user";
      return e.entity_type === _historyFilter;
    });
  }

  if (entries.length === 0) {
    container.innerHTML = `<p style="color:var(--gray-400); text-align:center; padding:3rem 1rem;">${t("history.empty")}</p>`;
    return;
  }

  container.innerHTML = entries
    .map((entry) => {
      const { icon, color } = getActionMeta(entry.action);
      const title = describeTitle(entry);
      const diff = parseDiff(entry);
      const time = formatTimestamp(entry.timestamp);
      const badgeColor = BADGE_COLORS[entry.entity_type] || "#6b7280";
      const badgeLabel = getBadgeLabel(entry.entity_type);

      const diffHTML = diff.length
        ? `<div style="margin-top:6px; padding: 6px 8px; background:var(--gray-50); border-radius:6px; border:1px solid var(--gray-200);">
           ${diff.map((d) => renderDiffRow(d.field, d.before, d.after, d.rawField, entry.entity_id)).join("")}
         </div>`
        : "";

      return `
      <div style="display:flex; gap:0.875rem; padding:0.8rem 1rem; border-bottom:1px solid var(--gray-100); align-items:flex-start; transition:background 0.15s;"
           onmouseover="this.style.background='var(--gray-50)'" onmouseout="this.style.background=''">
        <div style="width:30px; height:30px; border-radius:50%; background:${color}1a; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px;">
          <i class="fa-solid ${icon}" style="color:${color}; font-size:0.8rem;"></i>
        </div>
        <div style="flex:1; min-width:0;">
          <div style="display:flex; align-items:center; gap:0.45rem; flex-wrap:wrap;">
            <span style="font-weight:600; color:var(--gray-900); font-size:0.875rem;">${escapeHTML(title)}</span>
            <span style="background:${badgeColor}18; color:${badgeColor}; font-size:0.68rem; font-weight:700; padding:1px 6px; border-radius:99px; text-transform:uppercase; letter-spacing:0.5px; white-space:nowrap;">${escapeHTML(badgeLabel)}</span>
          </div>
          ${entry.changed_by ? `<div style="font-size:0.72rem; color:var(--gray-400); margin-top:2px;"><i class="fa-solid fa-user" style="font-size:0.65rem; margin-left:0.25rem;"></i>${escapeHTML(t("history.changedBy").replace("{name}", entry.changed_by))}</div>` : ""}
          ${diffHTML}
        </div>
        <div style="color:var(--gray-400); font-size:0.75rem; white-space:nowrap; flex-shrink:0; margin-top:3px;">${escapeHTML(time)}</div>
      </div>`;
    })
    .join("");
}

window.loadHistory = loadHistory;
window.refreshHistory = refreshHistory;
window.setHistoryFilter = setHistoryFilter;
window.renderHistoryTab = renderHistoryTab;
