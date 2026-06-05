// ==================== History Tab ====================

let _historyEntries  = [];
let _historyFilter   = "all";
let _historySearch   = "";
let _historyDateFilter = "all";   // "all" | "today" | "24h" | "week"
let _historyUserFilter = "all";   // "all" | specific username
const _HISTORY_PAGE  = 50;        // entries per load
let _historyOffset   = 0;         // how many entries we have loaded so far
let _historyHasMore  = false;
const _expandedGroups = new Set(); // keys of expanded batch groups

async function loadHistory(append = false) {
  try {
    const offset = append ? _historyOffset : 0;
    const data = await apiCall(`/audit?limit=${_HISTORY_PAGE}&offset=${offset}`);
    if (append) {
      _historyEntries = [..._historyEntries, ...data];
    } else {
      _historyEntries = data;
    }
    _historyHasMore = data.length >= _HISTORY_PAGE;
    _historyOffset  = (append ? _historyOffset : 0) + data.length;
  } catch (e) {
    if (!append) _historyEntries = [];
    _historyHasMore = false;
  }
}

async function refreshHistory() {
  _historyOffset = 0;
  _historyHasMore = false;
  _expandedGroups.clear();
  await loadHistory();
  renderHistoryTab();
  _updateHistoryFilterCounts();
}

async function loadMoreHistory() {
  await loadHistory(true);
  renderHistoryTab();
  _updateHistoryFilterCounts();
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

function setHistorySearch(query) {
  _historySearch = query;
  renderHistoryTab();
}

function setHistoryDateFilter(filter) {
  _historyDateFilter = filter;
  ["all", "today", "24h", "week"].forEach(f => {
    const btn = document.getElementById(`hdf-${f}`);
    if (btn) btn.className = `btn btn-sm ${f === filter ? "btn-primary" : "btn-secondary"}`;
  });
  renderHistoryTab();
}

function setHistoryUserFilter(user) {
  _historyUserFilter = user;
  renderHistoryTab();
}

function toggleHistoryGroup(key) {
  if (_expandedGroups.has(key)) _expandedGroups.delete(key);
  else _expandedGroups.add(key);
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
  notes: "history.field.notes",
  band: "history.field.band",
  time_start: "history.field.timeStart",
  time_end: "history.field.timeEnd",
  requirements_count: "history.field.reqCount",
  device_type: "history.field.deviceType",
  site_name: "history.field.siteName",
  sector_name: "history.field.sectorName",
};

function _getFieldLabel(field) {
  return _FIELD_KEY_MAP[field]
    ? t(_FIELD_KEY_MAP[field])
    : field.replace(/_/g, " ");
}

// ---- Entity lookup helpers ----

function lookupRadioInfo(entityId, details = {}) {
  const radio = (window.appState.radios || []).find((r) => r.id === entityId);
  if (radio) {
    const site = (window.appState.sites || []).find((s) => s.id === radio.site_id);
    return { label: radio.device_type, siteName: site ? site.name : null };
  }
  return {
    label:    details.device_type || entityId,
    siteName: details.site_name   || null,
  };
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

// ---- Create / delete detail field definitions ----

function _getEntityDetailFields(entity_type, details) {
  switch (entity_type) {
    case "radio":
      return [
        ["device_type",    details.device_type],
        ["frequency_band", details.frequency_band],
        ["site_name",      details.site_name],
      ];
    case "link":
      return [
        ["link_name",      details.link_name],
        ["frequency",      details.frequency],
        ["frequency_band", details.frequency_band],
        ["owner",          details.owner],
      ];
    case "mission":
      return [
        ["name",  details.name],
        ["owner", details.owner],
      ];
    case "sector":
      return [["name", details.name]];
    case "site":
      return [
        ["name",        details.name],
        ["sector_name", details.sector_name],
      ];
    case "owner":
      return [["name", details.name]];
    case "device":
      return [
        ["name", details.name],
        ["band", details.band],
      ];
    default:
      return [];
  }
}

// ---- Parse diff from entry details ----

function parseDiff(entry) {
  const { action, entity_type, details = {} } = entry;

  if (action === "update") {
    if (details.before !== undefined || details.after !== undefined) {
      const before = details.before || {};
      const after  = details.after  || {};
      const fields = new Set([...Object.keys(before), ...Object.keys(after)]);
      return [...fields].map((f) => ({
        rawField: f,
        field: _getFieldLabel(f),
        before: before[f] ?? null,
        after:  after[f]  ?? null,
      }));
    }
    return [];
  }

  if (action === "create") {
    return _getEntityDetailFields(entity_type, details)
      .filter(([, v]) => v != null && v !== "")
      .map(([rawField, v]) => ({
        rawField,
        field:  _getFieldLabel(rawField),
        before: null,
        after:  v,
      }));
  }

  if (action === "delete") {
    return _getEntityDetailFields(entity_type, details)
      .filter(([, v]) => v != null && v !== "")
      .map(([rawField, v]) => ({
        rawField,
        field:  _getFieldLabel(rawField),
        before: v,
        after:  null,
      }));
  }

  return [];
}

// ---- Human-readable title ----

function describeTitle(entry) {
  const { action, entity_type, entity_id, details = {} } = entry;

  switch (action) {
    case "create":
      if (entity_type === "radio")
        return t(details.frequency_band ? "history.create.radioWithBand" : "history.create.radio", {
          device: details.device_type,
          band:   details.frequency_band,
          site:   details.site_name || lookupSiteName(details.site_id || ""),
        });
      if (entity_type === "sector")
        return t("history.create.sector", { name: details.name || entity_id });
      if (entity_type === "site")
        return details.sector_name
          ? t("history.create.siteInSector", { name: details.name, sector: details.sector_name })
          : t("history.create.site", { name: details.name });
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
        return t("history.create.device", { name: details.name, band: details.band });
      return t("history.create.other", { type: entity_type });

    case "update": {
      if (entity_type === "radio") {
        const { label, siteName } = lookupRadioInfo(entity_id, details);
        return siteName
          ? t("history.update.radio", { label, site: siteName })
          : t("history.update.radioNoSite", { label });
      }
      if (entity_type === "sector")
        return t("history.update.sectorNamed", { name: details.name || entity_id });
      if (entity_type === "site")
        return t("history.update.siteNamed", { name: details.name || entity_id });
      if (entity_type === "mission") {
        const name =
          (details.after || {}).name ||
          (details.before || {}).name ||
          details.name ||
          lookupMissionName(entity_id) ||
          entity_id;
        return t("history.update.mission", { name });
      }
      if (entity_type === "link")
        return t("history.update.linkNamed", { name: details.name || entity_id });
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
      if (entity_type === "radio") {
        if (details.device_type && details.site_name)
          return t("history.delete.radioDetail", {
            device: details.device_type,
            band:   details.frequency_band || "—",
            site:   details.site_name,
          });
        return t("history.delete.radio");
      }
      if (entity_type === "sector")
        return details.cascaded_sites?.length
          ? t("history.delete.sectorWithSites", { name: details.name || entity_id, count: details.cascaded_sites.length })
          : t("history.delete.sector", { name: details.name || entity_id });
      if (entity_type === "site")
        return details.sector_name
          ? t("history.delete.siteFromSector", { name: details.name || entity_id, sector: details.sector_name })
          : t("history.delete.site", { name: details.name || entity_id });
      if (entity_type === "mission")
        return t("history.delete.mission", { name: details.name });
      if (entity_type === "archived_mission")
        return t("history.delete.archivedMission", { name: details.name });
      if (entity_type === "link") {
        if (details.link_name)
          return t("history.delete.linkDetail", {
            name:      details.link_name,
            frequency: details.frequency != null
              ? formatFrequency(details.frequency, details.frequency_band || null)
              : "—",
          });
        return t("history.delete.link");
      }
      if (entity_type === "owner")
        return t("history.delete.owner", { name: details.name });
      if (entity_type === "device")
        return t("history.delete.device", { name: details.name });
      return t("history.delete.other", { type: entity_type });

    case "start_mission":  return t("history.startMission",  { name: details.name });
    case "end_mission":    return t("history.endMission",    { name: details.name });
    case "activate":       return t("history.activate",      { name: details.name });
    case "deactivate":     return t("history.deactivate",    { name: details.name });
    case "archive":        return t("history.archive",       { name: details.name });
    case "restore":        return t("history.restore",       { name: details.name });
    case "batch_clear":
      return t("history.batchClear", {
        count: details.devices_cleared ?? "all",
        site:  details.site_name || lookupSiteName(entity_id),
      });
    case "import":
      return t("history.import", {
        sectors: details.sectors,
        sites:   details.sites,
        radios:  details.radios,
      });
    default:
      return `${action} ${entity_type}`;
  }
}

// ---- Translate known enum values stored as English strings ----

const VALUE_LABELS = {
  Fixed:    () => t("site.typeFixed"),
  Mobile:   () => t("site.typeMobile"),
  Usable:   () => t("search.statusUsable"),
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
  const TIME_FIELDS = new Set(["time_start", "time_end"]);
  const isFreq = FREQ_FIELDS.has(rawField);
  const isTime = TIME_FIELDS.has(rawField);

  let band = null;
  if (isFreq && entityId) {
    const radio = (window.appState.radios || []).find((r) => r.id === entityId);
    band = radio?.frequency_band || null;
    if (!band) {
      const link = (window.appState.links || []).find((l) => l.id === entityId);
      band = link?.frequency_band || null;
    }
  }

  let timeShowDate  = true;
  let timeShowClock = true;
  if (isTime && beforeVal != null && afterVal != null) {
    const bd = new Date(beforeVal);
    const ad = new Date(afterVal);
    if (!isNaN(bd) && !isNaN(ad)) {
      const sameDate  = bd.toLocaleDateString() === ad.toLocaleDateString();
      const sameClock = bd.getHours() === ad.getHours() && bd.getMinutes() === ad.getMinutes();
      timeShowDate  = !sameDate;
      timeShowClock = !sameClock;
      if (!timeShowDate && !timeShowClock) { timeShowDate = true; timeShowClock = true; }
    }
  }

  const fmtTime = (v) => {
    const d = new Date(v);
    if (isNaN(d)) return String(v);
    if (timeShowDate && timeShowClock)
      return d.toLocaleString([], { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    if (timeShowDate)
      return d.toLocaleDateString([], { year: "numeric", month: "2-digit", day: "2-digit" });
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const fmt = (v) => {
    if (v == null) return '<span style="color:var(--gray-400);">—</span>';
    if (isFreq && !isNaN(Number(v)))
      return `<span>${escapeHTML(formatFrequency(v, band))}</span>`;
    if (isTime)
      return `<span>${escapeHTML(fmtTime(v))}</span>`;
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

// ---- Trigger badge ----

const _TRIGGER_META = {
  allocate:         { color: "#10b981", key: "history.trigger.allocate" },
  standby:          { color: "#0ea5e9", key: "history.trigger.standby" },
  activate_standby: { color: "#7c3aed", key: "history.trigger.activateStandby" },
  demote_standby:   { color: "#f59e0b", key: "history.trigger.demoteStandby" },
  end_mission:      { color: "#ef4444", key: "history.trigger.endMission" },
  mission_rename:   { color: "#6b7280", key: "history.trigger.missionRename" },
};

function _getTriggerBadge(entry) {
  if (entry.action !== "update" || entry.entity_type !== "radio") return "";
  const trigger = entry.details?.trigger;
  if (!trigger) return "";
  const meta = _TRIGGER_META[trigger];
  if (!meta) return "";
  const c = meta.color;
  return `<span style="background:${c}1a; color:${c}; font-size:0.65rem; font-weight:700; padding:1px 6px; border-radius:99px; white-space:nowrap; display:inline-flex; align-items:center; gap:3px;"><i class="fa-solid fa-bolt" style="font-size:0.55rem;"></i>${escapeHTML(t(meta.key))}</span>`;
}

// ---- Filter predicates ----

const _isRadioCreate = (e) => e.entity_type === "radio" && e.action === "create";
const _isRadioDelete = (e) => e.entity_type === "radio" && e.action === "delete";
const _isSiteLevel   = (e) => _isRadioCreate(e) || _isRadioDelete(e);
const _isSiteCreate  = (e) => e.entity_type === "site"  && e.action === "create";
const _isSiteDelete  = (e) => e.entity_type === "site"  && e.action === "delete";
const _isSectorLevel = (e) => _isSiteCreate(e) || _isSiteDelete(e);

function _matchesEntityFilter(e, filter) {
  if (filter === "radio")       return e.entity_type === "radio" && !_isSiteLevel(e);
  if (filter === "site")        return (e.entity_type === "site" && !_isSectorLevel(e)) || _isSiteLevel(e);
  if (filter === "sector")      return e.entity_type === "sector" || _isSectorLevel(e);
  if (filter === "mission")     return e.entity_type === "mission" || e.entity_type === "archived_mission";
  if (filter === "preferences") return e.entity_type === "owner" || e.entity_type === "device" || e.entity_type === "user";
  return e.entity_type === filter;
}

// ---- Get filtered entries (all active filters applied) ----

function _getFilteredEntries() {
  let entries = _historyEntries.filter(
    (e) => !(e.entity_type === "user" && e.action === "login"),
  );

  if (_historyFilter !== "all")
    entries = entries.filter((e) => _matchesEntityFilter(e, _historyFilter));

  if (_historyDateFilter !== "all") {
    const now = new Date();
    const cutoffs = {
      today: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      "24h": new Date(now - 24 * 60 * 60 * 1000),
      week:  new Date(now - 7 * 24 * 60 * 60 * 1000),
    };
    const cutoff = cutoffs[_historyDateFilter];
    if (cutoff) entries = entries.filter((e) => new Date(e.timestamp) >= cutoff);
  }

  if (_historyUserFilter !== "all")
    entries = entries.filter((e) => e.changed_by === _historyUserFilter);

  if (_historySearch.trim()) {
    const q = _historySearch.trim().toLowerCase();
    entries = entries.filter((e) => {
      const title = describeTitle(e).toLowerCase();
      const by    = (e.changed_by || "").toLowerCase();
      return title.includes(q) || by.includes(q);
    });
  }

  return entries;
}

// ---- Filter count badges ----

function _getFilterCount(filter) {
  const entries = _historyEntries.filter(
    (e) => !(e.entity_type === "user" && e.action === "login"),
  );
  if (filter === "all") return entries.length;
  return entries.filter((e) => _matchesEntityFilter(e, filter)).length;
}

function _updateHistoryFilterCounts() {
  ["all", "radio", "mission", "sector", "site", "link", "preferences"].forEach((f) => {
    const btn = document.getElementById(`hf-${f}`);
    if (!btn) return;
    const count = _getFilterCount(f);
    let badge = btn.querySelector(".hf-count");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "hf-count";
      btn.appendChild(badge);
    }
    badge.textContent = count;
    badge.style.display = count === 0 ? "none" : "";
  });
}

// ---- Populate user filter dropdown ----

function _updateUserFilterSelect() {
  const sel = document.getElementById("historyUserSelect");
  if (!sel) return;
  const users = [...new Set(
    _historyEntries
      .map((e) => e.changed_by)
      .filter(Boolean)
  )].sort();
  const current = _historyUserFilter;
  sel.innerHTML =
    `<option value="all">${escapeHTML(t("history.user.all"))}</option>` +
    users.map((u) => `<option value="${escapeHTML(u)}"${u === current ? " selected" : ""}>${escapeHTML(u)}</option>`).join("");
  sel.value = current;
}

// ---- Mission batch grouping ----
// Groups ≥3 consecutive auto-triggered radio updates with the same trigger +
// changed_by within a 60-second window into a single collapsible item.

const _BATCH_WINDOW_MS = 60000;
const _BATCH_MIN       = 3;

function _groupBatches(entries) {
  const result = [];
  let i = 0;
  while (i < entries.length) {
    const e = entries[i];
    const trigger = e.details?.trigger;
    if (trigger && e.action === "update" && e.entity_type === "radio") {
      const group = [e];
      let j = i + 1;
      while (j < entries.length) {
        const next = entries[j];
        if (
          next.action === "update" &&
          next.entity_type === "radio" &&
          next.details?.trigger === trigger &&
          next.changed_by === e.changed_by &&
          Math.abs(new Date(e.timestamp) - new Date(next.timestamp)) <= _BATCH_WINDOW_MS
        ) {
          group.push(next);
          j++;
        } else break;
      }
      if (group.length >= _BATCH_MIN) {
        result.push({ type: "group", entries: group, trigger, key: `${trigger}_${e.timestamp}_${e.changed_by || ""}` });
        i = j;
      } else {
        result.push({ type: "entry", entry: e });
        i++;
      }
    } else {
      result.push({ type: "entry", entry: e });
      i++;
    }
  }
  return result;
}

// ---- Render a single history entry ----

function _renderEntry(entry) {
  const { icon, color } = getActionMeta(entry.action);
  const title       = describeTitle(entry);
  const diff        = parseDiff(entry);
  const time        = formatTimestamp(entry.timestamp);
  const badgeColor  = BADGE_COLORS[entry.entity_type] || "#6b7280";
  const badgeLabel  = getBadgeLabel(entry.entity_type);
  const triggerBadge = _getTriggerBadge(entry);

  const diffHTML = diff.length
    ? `<div style="margin-top:6px; padding:6px 8px; background:var(--gray-50); border-radius:6px; border:1px solid var(--gray-200);">
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
          ${triggerBadge}
        </div>
        ${entry.changed_by ? `<div style="font-size:0.72rem; color:var(--gray-400); margin-top:2px;"><i class="fa-solid fa-user" style="font-size:0.65rem; margin-left:0.25rem;"></i>${escapeHTML(t("history.changedBy").replace("{name}", entry.changed_by))}</div>` : ""}
        ${diffHTML}
      </div>
      <div style="color:var(--gray-400); font-size:0.75rem; white-space:nowrap; flex-shrink:0; margin-top:3px;">${escapeHTML(time)}</div>
    </div>`;
}

// ---- Render a grouped batch item ----

function _renderGroup(item) {
  const { entries, trigger, key } = item;
  const isExpanded = _expandedGroups.has(key);
  const meta = _TRIGGER_META[trigger];
  const c    = meta ? meta.color : "#6b7280";
  const triggerLabel = meta ? t(meta.key) : trigger;
  const rep  = entries[0];
  const time = formatTimestamp(rep.timestamp);

  const summary = `
    <div style="display:flex; gap:0.875rem; padding:0.8rem 1rem; border-bottom:1px solid var(--gray-100); align-items:center; cursor:pointer; background:${c}08; transition:background 0.15s;"
         onclick="toggleHistoryGroup('${escapeHTML(key)}')"
         onmouseover="this.style.background='${c}14'" onmouseout="this.style.background='${c}08'">
      <div style="width:30px; height:30px; border-radius:50%; background:${c}1a; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
        <i class="fa-solid fa-layer-group" style="color:${c}; font-size:0.8rem;"></i>
      </div>
      <div style="flex:1; min-width:0;">
        <div style="display:flex; align-items:center; gap:0.45rem; flex-wrap:wrap;">
          <span style="font-weight:600; color:var(--gray-900); font-size:0.875rem;">${escapeHTML(t("history.grouped", { count: entries.length }))}</span>
          <span style="background:${c}1a; color:${c}; font-size:0.65rem; font-weight:700; padding:1px 6px; border-radius:99px; white-space:nowrap; display:inline-flex; align-items:center; gap:3px;"><i class="fa-solid fa-bolt" style="font-size:0.55rem;"></i>${escapeHTML(triggerLabel)}</span>
        </div>
        ${rep.changed_by ? `<div style="font-size:0.72rem; color:var(--gray-400); margin-top:2px;"><i class="fa-solid fa-user" style="font-size:0.65rem; margin-left:0.25rem;"></i>${escapeHTML(t("history.changedBy").replace("{name}", rep.changed_by))}</div>` : ""}
      </div>
      <div style="display:flex; align-items:center; gap:0.5rem; flex-shrink:0;">
        <div style="color:var(--gray-400); font-size:0.75rem; white-space:nowrap;">${escapeHTML(time)}</div>
        <i class="fa-solid ${isExpanded ? "fa-chevron-up" : "fa-chevron-down"}" style="color:var(--gray-400); font-size:0.7rem;"></i>
      </div>
    </div>`;

  if (!isExpanded) return summary;
  return summary + entries.map(_renderEntry).join("");
}

// ---- Render full tab ----

function renderHistoryTab() {
  const container = document.getElementById("historyList");
  if (!container) return;

  _updateUserFilterSelect();

  const entries = _getFilteredEntries();

  if (entries.length === 0) {
    const msg = _historyEntries.length === 0
      ? t("history.empty")
      : t("history.noResults");
    container.innerHTML = `<p style="color:var(--gray-400); text-align:center; padding:3rem 1rem;">${msg}</p>`;
    _updateHistoryFilterCounts();
    return;
  }

  const items = _groupBatches(entries);

  const loadMoreBtn = _historyHasMore
    ? `<div style="text-align:center; padding:1rem;">
         <button class="btn btn-secondary btn-sm" onclick="loadMoreHistory()">${escapeHTML(t("history.loadMore"))}</button>
       </div>`
    : "";

  container.innerHTML =
    items.map((item) => item.type === "group" ? _renderGroup(item) : _renderEntry(item.entry)).join("") +
    loadMoreBtn;

  _updateHistoryFilterCounts();
}

window.loadHistory = loadHistory;
window.refreshHistory = refreshHistory;
window.loadMoreHistory = loadMoreHistory;
window.setHistoryFilter = setHistoryFilter;
window.setHistorySearch = setHistorySearch;
window.setHistoryDateFilter = setHistoryDateFilter;
window.setHistoryUserFilter = setHistoryUserFilter;
window.toggleHistoryGroup = toggleHistoryGroup;
window.renderHistoryTab = renderHistoryTab;
window._updateHistoryFilterCounts = _updateHistoryFilterCounts;
