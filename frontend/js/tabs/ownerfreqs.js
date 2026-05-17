// ==================== Owner Frequencies Tab ====================

let _ownerFreqSelected = null;

function renderOwnerFreqsTab() {
  const content = document.getElementById("ownerFreqsContent");
  if (!content) return;

  const owners = window.appState.config.owners || [];

  // Preserve previous selection if the owner still exists
  if (_ownerFreqSelected && !owners.find((o) => o.name === _ownerFreqSelected)) {
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
    </div>
    <div id="ownerFreqTablesArea"></div>
  `;

  if (_ownerFreqSelected) {
    _renderOwnerFreqTables(_ownerFreqSelected);
  }
}

function onOwnerFreqChange(ownerName) {
  _ownerFreqSelected = ownerName || null;
  _renderOwnerFreqTables(_ownerFreqSelected);
}

// For a given frequency value, return which non-archived missions have it
// in their requirements, split by mission status: active vs. planned
function _missionsForFrequency(frequency) {
  const active  = [];
  const planned = [];

  (window.appState.plannedMissions || []).forEach((m) => {
    const reqs = m.requirements || [];
    const hasFreq = reqs.some(
      (req) => req.frequency != null &&
               Math.abs(Number(req.frequency) - frequency) < 0.001
    );
    if (!hasFreq) return;
    (m.status === "active" ? active : planned).push(m);
  });

  return { active, planned };
}

function _missionBadge(mission) {
  const color = mission.owner ? getOwnerColor(mission.owner) : null;
  const bg    = color || "var(--gray-300)";
  const fg    = color ? "white" : "var(--gray-700)";
  return `<span class="ownerfreq-mission-badge" style="background:${bg};color:${fg};">${escapeHTML(mission.name)}</span>`;
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

  const ownerColor = getOwnerColor(ownerName);
  const dash = `<span style="color:var(--gray-400)">—</span>`;

  bands.forEach((band) => {
    const freqs = byBand[band].slice().sort((a, b) => a.frequency - b.frequency);

    const section = document.createElement("div");
    section.className = "ownerfreq-band-section";

    const headerRow = document.createElement("div");
    headerRow.className = "ownerfreq-band-header";
    if (ownerColor) headerRow.style.borderColor = ownerColor;
    headerRow.innerHTML = `
      <span class="ownerfreq-band-title">${t("ownerfreqs.bandTitle").replace("{band}", escapeHTML(band))}</span>
      <span class="ownerfreq-band-count">${freqs.length}</span>
    `;
    section.appendChild(headerRow);

    const rows = freqs.map((l) => {
      const { active, planned } = _missionsForFrequency(l.frequency);
      const activeHtml  = active.length  ? active.map(_missionBadge).join("")  : dash;
      const plannedHtml = planned.length ? planned.map(_missionBadge).join("") : dash;
      return `
        <tr>
          <td><span class="ownerfreq-freq-badge">${l.frequency} MHz</span></td>
          <td>${escapeHTML(l.link_name)}</td>
          <td class="ownerfreq-missions-cell">${activeHtml}</td>
          <td class="ownerfreq-missions-cell">${plannedHtml}</td>
        </tr>`;
    }).join("");

    const table = document.createElement("table");
    table.className = "data-table ownerfreq-table";
    table.innerHTML = `
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
window.onOwnerFreqChange   = onOwnerFreqChange;
