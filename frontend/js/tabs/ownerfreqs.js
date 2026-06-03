// ==================== Owner Frequencies Tab ====================

let _ownerFreqSelected = null;

function _owfOwnerBadge(ownerName) {
  const isDark = document.documentElement.classList.contains("dark");
  const entry = (window.appState.config?.owners || []).find((o) => o.name === ownerName);
  let bg, text, border;
  if (entry) {
    if (isDark) {
      bg = entry.dark;
      text = contrastColor(entry.dark);
      border = "transparent";
    } else {
      bg = entry.light;
      text = entry.dark;
      border = entry.dark;
    }
  } else {
    bg = isDark ? "#334155" : "#E5E7EB";
    text = isDark ? "#e2e8f0" : "#374151";
    border = "transparent";
  }
  return `<span style="display:inline-block;padding:0.25rem 0.85rem;border-radius:9999px;font-size:0.9rem;font-weight:700;background:${bg};color:${text};border:1.5px solid ${border};vertical-align:middle;">${escapeHTML(ownerName || "—")}</span>`;
}

function renderOwnerFreqsTab() {
  const content = document.getElementById("ownerFreqsContent");
  if (!content) return;

  // User role: bypass dropdown — show their belonging directly
  if (isUserRole && isUserRole()) {
    const userOwner = getCurrentUserOwner ? getCurrentUserOwner() : null;
    content.innerHTML = `
      <div class="ownerfreq-controls">
        <span class="ownerfreq-label"><i class="fa-solid fa-user" style="margin-left:0.4rem;color:var(--primary-color);"></i></span>
        ${_owfOwnerBadge(userOwner)}
      </div>
      <div id="ownerFreqTablesArea"></div>`;
    if (userOwner) _renderOwnerFreqTables(userOwner);
    return;
  }

  const owners = window.appState.config.owners || [];

  // Preserve previous selection if the owner still exists
  if (
    _ownerFreqSelected &&
    !owners.find((o) => o.name === _ownerFreqSelected)
  ) {
    _ownerFreqSelected = null;
  }

  // ── Dropdown header ──────────────────────────────────────────
  content.innerHTML = `
    <div class="ownerfreq-controls">
      <label class="ownerfreq-label" for="ownerFreqSelect">${t("ownerfreqs.selectLabel")}</label>
      <select id="ownerFreqSelect" class="ownerfreq-select" onchange="onOwnerFreqChange(this.value)">
        <option value="">${t("ownerfreqs.selectPlaceholder")}</option>
        ${owners.map((o) => `<option value="${escapeHTML(o.name)}"${_ownerFreqSelected === o.name ? " selected" : ""}>${escapeHTML(o.name)}</option>`).join("")}
      </select>
      <span id="ownerFreqBadgeArea">${_ownerFreqSelected ? _owfOwnerBadge(_ownerFreqSelected) : ""}</span>
    </div>
    <div id="ownerFreqTablesArea"></div>
  `;

  if (_ownerFreqSelected) {
    _renderOwnerFreqTables(_ownerFreqSelected);
  }
}

function onOwnerFreqChange(ownerName) {
  _ownerFreqSelected = ownerName || null;
  const badgeArea = document.getElementById("ownerFreqBadgeArea");
  if (badgeArea) badgeArea.innerHTML = _ownerFreqSelected ? _owfOwnerBadge(_ownerFreqSelected) : "";
  _renderOwnerFreqTables(_ownerFreqSelected);
}

// Returns { active: [{mission, roles[]}, ...], planned: [{mission, roles[]}, ...] }
// roles = all roles from requirements of that mission that match the frequency
function _missionsForFrequency(frequency) {
  const active = [];
  const planned = [];

  (window.appState.plannedMissions || []).forEach((m) => {
    const matchingRoles = (m.requirements || [])
      .filter(
        (req) =>
          req.frequency != null &&
          Math.abs(Number(req.frequency) - frequency) < 0.001,
      )
      .map((req) => req.role || null);

    if (matchingRoles.length === 0) return;

    // Deduplicate roles, drop nulls
    const roles = [...new Set(matchingRoles.filter(Boolean))];
    (m.status === "active" ? active : planned).push({ mission: m, roles });
  });

  return { active, planned };
}

function _missionBadge({ mission, roles }) {
  const color = mission.owner ? getOwnerColor(mission.owner) : null;
  const bg = color || "var(--gray-300)";
  const fg = color ? contrastColor(color) : "var(--gray-700)";
  const label = roles.length
    ? `<span style="font-weight:700">${escapeHTML(mission.name)}</span> - <span style="font-weight:400">${roles.map(escapeHTML).join(" | ")}</span>`
    : `<span style="font-weight:700">${escapeHTML(mission.name)}</span>`;
  return `<span class="ownerfreq-mission-badge" style="background:${bg};color:${fg};cursor:default;"
    onmouseenter="_owfShowMissionTooltip('${escapeHTML(mission.id)}', event)"
    onmousemove="_owfMoveMissionTooltip(event)"
    onmouseleave="_owfHideMissionTooltip()"
  >${label}</span>`;
}

// ── Mission tooltip ───────────────────────────────────────────────────────────

function _owfGetMissionTip() {
  let tip = document.getElementById("owf-mission-tooltip");
  if (!tip) {
    tip = document.createElement("div");
    tip.id = "owf-mission-tooltip";
    tip.style.display = "none";
    document.body.appendChild(tip);
  }
  return tip;
}

function _owfFormatTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yy} ${hh}:${min}`;
}

function _owfShowMissionTooltip(missionId, e) {
  const mission = (window.appState.plannedMissions || []).find(m => m.id === missionId);
  if (!mission) return;

  const tip = _owfGetMissionTip();
  const isDark = document.documentElement.classList.contains("dark");
  const bg = isDark ? "#1e2d45" : "#ffffff";
  const border = isDark ? "rgba(255,255,255,0.12)" : "var(--gray-200)";
  const textMain = isDark ? "#e2e8f0" : "var(--gray-800)";
  const textSub = isDark ? "#94a3b8" : "var(--gray-500)";
  const shadow = isDark ? "0 4px 20px rgba(0,0,0,0.5)" : "0 4px 16px rgba(0,0,0,0.15)";
  const ownerColor = mission.owner ? getOwnerColor(mission.owner) : (isDark ? "rgba(255,255,255,0.2)" : "var(--gray-300)");
  const reqCount = mission.requirements ? mission.requirements.length : 0;

  tip.style.cssText = `
    position: fixed;
    z-index: 9999;
    pointer-events: none;
    background: ${bg};
    border: 1px solid ${border};
    border-radius: 10px;
    padding: 0.75rem 1rem;
    box-shadow: ${shadow};
    font-size: 0.82rem;
    min-width: 190px;
    max-width: 270px;
    display: block;
    line-height: 1.6;
    color: ${textMain};
  `;

  tip.innerHTML = `
    <div style="font-weight:700;font-size:0.9rem;margin-bottom:0.55rem;
                border-right:3px solid ${ownerColor};padding-right:0.45rem;
                white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
      ${escapeHTML(mission.name)}
    </div>
    <div style="display:grid;grid-template-columns:auto 1fr;gap:0.2rem 0.65rem;align-items:baseline;">
      <span style="color:${textSub};font-size:0.74rem;white-space:nowrap;">👤 ${escapeHTML(t("missions.col.owner"))}</span>
      <span>${escapeHTML(mission.owner || "—")}</span>
      <span style="color:${textSub};font-size:0.74rem;white-space:nowrap;">📡 ${escapeHTML(t("missions.col.reqs"))}</span>
      <span>${reqCount}</span>
      ${mission.time_start ? `
      <span style="color:${textSub};font-size:0.74rem;white-space:nowrap;">🕐 ${escapeHTML(t("timeline.tooltip.start"))}</span>
      <span>${_owfFormatTime(mission.time_start)}</span>
      ` : ""}
      ${mission.time_end ? `
      <span style="color:${textSub};font-size:0.74rem;white-space:nowrap;">🏁 ${escapeHTML(t("timeline.tooltip.end"))}</span>
      <span>${_owfFormatTime(mission.time_end)}</span>
      ` : ""}
    </div>
  `;

  _owfMoveMissionTooltip(e);
}

function _owfMoveMissionTooltip(e) {
  const tip = document.getElementById("owf-mission-tooltip");
  if (!tip || tip.style.display === "none") return;
  const margin = 14;
  let x = e.clientX + margin;
  let y = e.clientY - margin;
  const tipW = tip.offsetWidth || 270;
  const tipH = tip.offsetHeight || 130;
  if (x + tipW > window.innerWidth - 8) x = e.clientX - tipW - margin;
  if (y + tipH > window.innerHeight - 8) y = e.clientY - tipH - margin;
  if (y < 8) y = 8;
  tip.style.left = `${x}px`;
  tip.style.top = `${y}px`;
}

function _owfHideMissionTooltip() {
  const tip = document.getElementById("owf-mission-tooltip");
  if (tip) tip.style.display = "none";
}

function _renderOwnerFreqTables(ownerName) {
  const area = document.getElementById("ownerFreqTablesArea");
  if (!area) return;
  area.innerHTML = "";

  if (!ownerName) return;

  const links = (window.appState.links || []).filter(
    (l) => l.owner && l.owner === ownerName,
  );

  if (links.length === 0) {
    area.innerHTML = `<p class="ownerfreq-empty">${t("ownerfreqs.noLinks")}</p>`;
    return;
  }

  // Group by frequency_band
  const byBand = {};
  links.forEach((l) => {
    const band = l.frequency_band || t("ownerfreqs.unknownBand");
    if (!byBand[band]) byBand[band] = [];
    byBand[band].push(l);
  });

  // Sort bands by the order defined in config, then alphabetically for any remainder
  const bandOrder = Object.keys(window.appState.config.frequency_bands || {});
  const bands = Object.keys(byBand).sort((a, b) => {
    const ia = bandOrder.indexOf(a);
    const ib = bandOrder.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  const dash = `<span style="color:var(--gray-400)">—</span>`;

  bands.forEach((band) => {
    const freqs = byBand[band]
      .slice()
      .sort((a, b) => a.frequency - b.frequency);

    const bandColor = (window.appState.config.frequency_bands?.[band]?.color) || "var(--primary-color)";

    const section = document.createElement("div");
    section.className = "ownerfreq-band-section";
    section.style.borderRight = `4px solid ${bandColor}`;

    const headerRow = document.createElement("div");
    headerRow.className = "ownerfreq-band-header";
    headerRow.innerHTML = `
      <span class="ownerfreq-band-title">${t("ownerfreqs.bandTitle").replace("{band}", escapeHTML(band))}</span>
      <span class="ownerfreq-band-count" style="background:${bandColor};color:${contrastColor(bandColor)}">${freqs.length}</span>
    `;
    section.appendChild(headerRow);

    const rows = freqs
      .map((l) => {
        const { active, planned } = _missionsForFrequency(l.frequency);
        const activeHtml = active.length
          ? `<div class="ownerfreq-missions-list">${active.map(_missionBadge).join("")}</div>`
          : dash;
        const plannedHtml = planned.length
          ? `<div class="ownerfreq-missions-list">${planned.map(_missionBadge).join("")}</div>`
          : dash;
        return `
        <tr>
          <td><span class="ownerfreq-freq-badge">${formatFrequency(l.frequency, band)} MHz</span></td>
          <td>${escapeHTML(l.link_name)}</td>
          <td class="ownerfreq-missions-cell">${activeHtml}</td>
          <td class="ownerfreq-missions-cell">${plannedHtml}</td>
        </tr>`;
      })
      .join("");

    const table = document.createElement("table");
    table.className = "data-table ownerfreq-table";
    table.innerHTML = `
      <colgroup>
        <col style="width:9rem">
        <col style="width:14rem">
        <col style="width:35%">
        <col style="width:35%">
      </colgroup>
      <thead><tr>
        <th>${t("ownerfreqs.col.frequency")}</th>
        <th>${t("ownerfreqs.col.name")}</th>
        <th>${t("ownerfreqs.col.activeMissions")}</th>
        <th>${t("ownerfreqs.col.plannedMissions")}</th>
      </tr></thead>
      <tbody>${rows}</tbody>`;
    section.appendChild(table);
    area.appendChild(section);
  });
}

window.renderOwnerFreqsTab = renderOwnerFreqsTab;
window.onOwnerFreqChange = onOwnerFreqChange;
