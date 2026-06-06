// ==================== Overview Rendering (Unified Table) ====================

function getFreqLabel(freq, band) {
  if (!freq || freq === "-") return freq || "-";
  if (window.overviewFreqMode === "link") {
    const links = window.appState.links || [];
    const match = links.find(
      (l) => Math.abs(Number(l.frequency) - Number(freq)) < 0.001,
    );
    if (match) return match.link_name;
  }
  return formatFrequency(freq, band);
}

window.setOverviewFreqMode = function (mode) {
  window.overviewFreqMode = mode;
  _syncFreqModeButtons(mode);
  renderOverview();
  if (window.performSearch) performSearch();
};

function _syncFreqModeButtons(mode) {
  const isFreq = mode === "frequency";
  // Overview tab-header buttons
  const freqBtn = document.getElementById("overviewFreqModeBtn");
  const linkBtn = document.getElementById("overviewLinkModeBtn");
  if (freqBtn)
    freqBtn.className = isFreq ? "btn btn-primary" : "btn btn-secondary";
  if (linkBtn)
    linkBtn.className = isFreq ? "btn btn-secondary" : "btn btn-primary";
  // Floating pill buttons
  const pillFreq = document.getElementById("overviewModePillFreq");
  const pillLink = document.getElementById("overviewModePillLink");
  if (pillFreq)
    pillFreq.className = isFreq ? "btn btn-primary" : "btn btn-secondary";
  if (pillLink)
    pillLink.className = isFreq ? "btn btn-secondary" : "btn btn-primary";
  // Search tab buttons
  const searchFreq = document.getElementById("searchFreqModeBtn");
  const searchLink = document.getElementById("searchLinkModeBtn");
  if (searchFreq)
    searchFreq.className = isFreq ? "btn btn-primary" : "btn btn-secondary";
  if (searchLink)
    searchLink.className = isFreq ? "btn btn-secondary" : "btn btn-primary";
  // Search tab pill buttons
  const searchPillFreq = document.getElementById("searchModePillFreq");
  const searchPillLink = document.getElementById("searchModePillLink");
  if (searchPillFreq)
    searchPillFreq.className = isFreq ? "btn btn-primary" : "btn btn-secondary";
  if (searchPillLink)
    searchPillLink.className = isFreq ? "btn btn-secondary" : "btn btn-primary";
}

// Show the floating pill when the tab-header buttons scroll out of view
(function _initOverviewPill() {
  document.addEventListener("DOMContentLoaded", () => {
    const pill = document.getElementById("overviewModePill");
    const target = document.getElementById("overviewFreqModeBtn");
    if (!pill || !target || !window.IntersectionObserver) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const onOverview = document
          .getElementById("overview")
          ?.classList.contains("active");
        if (entry.isIntersecting || !onOverview) {
          pill.classList.remove("visible");
          pill.setAttribute("aria-hidden", "true");
        } else {
          pill.classList.add("visible");
          pill.setAttribute("aria-hidden", "false");
        }
      },
      { threshold: 0 },
    );
    observer.observe(target);

    // Also hide when switching away from the overview tab
    document.querySelectorAll(".tab-button").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.getAttribute("data-tab") !== "overview") {
          pill.classList.remove("visible");
        }
      });
    });
  });
})();

// Show the floating pill when the search tab-header buttons scroll out of view
(function _initSearchPill() {
  document.addEventListener("DOMContentLoaded", () => {
    const pill = document.getElementById("searchModePill");
    const target = document.getElementById("searchFreqModeBtn");
    if (!pill || !target || !window.IntersectionObserver) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const onSearch = document
          .getElementById("search")
          ?.classList.contains("active");
        if (entry.isIntersecting || !onSearch) {
          pill.classList.remove("visible");
          pill.setAttribute("aria-hidden", "true");
        } else {
          pill.classList.add("visible");
          pill.setAttribute("aria-hidden", "false");
        }
      },
      { threshold: 0 },
    );
    observer.observe(target);

    // Also hide when switching away from the search tab
    document.querySelectorAll(".tab-button").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.getAttribute("data-tab") !== "search") {
          pill.classList.remove("visible");
        }
      });
    });
  });
})();

// Collapse state — survives re-renders
const _collapsedSectors = new Set();
const _collapsedSites = new Set();

function toggleSectorCollapse(sectorId) {
  const isNowCollapsed = !_collapsedSectors.has(sectorId);
  if (isNowCollapsed) {
    _collapsedSectors.add(sectorId);
    document
      .querySelectorAll(`[data-parent-sector="${sectorId}"]`)
      .forEach((r) => {
        r.style.display = "none";
      });
  } else {
    _collapsedSectors.delete(sectorId);
    // When expanding a sector, respect per-site collapse
    document
      .querySelectorAll(`[data-parent-sector="${sectorId}"]`)
      .forEach((r) => {
        const ps = r.dataset.parentSite;
        r.style.display = ps && _collapsedSites.has(ps) ? "none" : "";
      });
  }
  const row = document.querySelector(
    `.sector-row[data-sector-id="${sectorId}"]`,
  );
  if (row) row.classList.toggle("sector-is-collapsed", isNowCollapsed);
  _updateCollapseAllBtn();
}

function toggleSiteCollapse(siteId) {
  const siteRow = document.querySelector(`.site-row[data-site-id="${siteId}"]`);
  const parentSector = siteRow?.dataset.parentSector;
  const isNowCollapsed = !_collapsedSites.has(siteId);
  if (isNowCollapsed) {
    _collapsedSites.add(siteId);
    document.querySelectorAll(`[data-parent-site="${siteId}"]`).forEach((r) => {
      r.style.display = "none";
    });
  } else {
    _collapsedSites.delete(siteId);
    // Only show radio rows if the parent sector is not collapsed
    if (!parentSector || !_collapsedSectors.has(parentSector)) {
      document
        .querySelectorAll(`[data-parent-site="${siteId}"]`)
        .forEach((r) => {
          r.style.display = "";
        });
    }
  }
  if (siteRow) siteRow.classList.toggle("site-is-collapsed", isNowCollapsed);
  _updateCollapseAllBtn();
}

function collapseExpandAll() {
  const sectors = window.appState.hierarchy || [];
  const anyExpanded =
    sectors.some((s) => !_collapsedSectors.has(s.id)) ||
    sectors.some((s) => s.sites.some((site) => !_collapsedSites.has(site.id)));

  if (anyExpanded) {
    sectors.forEach((s) => {
      _collapsedSectors.add(s.id);
      s.sites.forEach((site) => _collapsedSites.add(site.id));
    });
    document
      .querySelectorAll("[data-parent-sector]")
      .forEach((r) => (r.style.display = "none"));
    document
      .querySelectorAll(".sector-row")
      .forEach((r) => r.classList.add("sector-is-collapsed"));
    document
      .querySelectorAll(".site-row")
      .forEach((r) => r.classList.add("site-is-collapsed"));
  } else {
    _collapsedSectors.clear();
    _collapsedSites.clear();
    document
      .querySelectorAll("[data-parent-sector]")
      .forEach((r) => (r.style.display = ""));
    document
      .querySelectorAll(".sector-row")
      .forEach((r) => r.classList.remove("sector-is-collapsed"));
    document
      .querySelectorAll(".site-row")
      .forEach((r) => r.classList.remove("site-is-collapsed"));
  }
  _updateCollapseAllBtn();
}

function _updateCollapseAllBtn() {
  const btn = document.getElementById("collapseAllBtn");
  if (!btn) return;
  const sectors = window.appState.hierarchy || [];
  const allCollapsed =
    sectors.length > 0 && sectors.every((s) => _collapsedSectors.has(s.id));
  btn.innerHTML = allCollapsed
    ? `<i class="fa-solid fa-expand"></i> ${t("overview.expandAll")}`
    : `<i class="fa-solid fa-compress"></i> ${t("overview.collapseAll")}`;
}

window.toggleSectorCollapse = toggleSectorCollapse;
window.toggleSiteCollapse = toggleSiteCollapse;
window.collapseExpandAll = collapseExpandAll;

function renderOverview() {
  const tbody = document.getElementById("overviewTableBody");
  tbody.innerHTML = "";

  window.appState.hierarchy.forEach((sector) => {
    const isCollapsed = _collapsedSectors.has(sector.id);

    // Sector separator row
    const sectorRow = document.createElement("tr");
    sectorRow.className =
      "sector-row" + (isCollapsed ? " sector-is-collapsed" : "");
    sectorRow.dataset.sectorId = sector.id;

    sectorRow.innerHTML = `
      <td colspan="13" style="padding: 0;">
        <div style="display: flex; align-items: stretch;">
          <div class="sector-collapse-border" onclick="toggleSectorCollapse('${sector.id}')">
            <i class="fa-solid fa-chevron-down sector-chevron"></i>
          </div>
          <div class="sector-cell" style="flex: 1;">
            <strong>${escapeHTML(sector.name)}</strong>
            <div class="sector-row-actions">
              <button class="btn btn-sm btn-edit" onclick="event.stopPropagation(); openSectorModal('${sector.id}')">${t("overview.editSector")}</button>
              <button class="btn btn-sm btn-add" onclick="event.stopPropagation(); openAddSiteModalForSector('${sector.id}')">${t("overview.addSite")}</button>
            </div>
          </div>
        </div>
      </td>
    `;

    tbody.appendChild(sectorRow);

    // Render sites and radios within this sector
    sector.sites.forEach((site) => {
      // Site separator row
      const isSiteCollapsed = _collapsedSites.has(site.id);
      const siteRow = document.createElement("tr");
      siteRow.className =
        "site-row" + (isSiteCollapsed ? " site-is-collapsed" : "");
      siteRow.dataset.parentSector = sector.id;
      siteRow.dataset.siteId = site.id;
      if (isCollapsed) siteRow.style.display = "none";

      siteRow.innerHTML = `
        <td colspan="13" style="padding: 0;">
          <div style="display: flex; align-items: stretch;">
            <div class="site-collapse-border" onclick="toggleSiteCollapse('${site.id}')">
              <i class="fa-solid fa-chevron-down site-chevron"></i>
            </div>
            <div class="site-cell" style="flex: 1;">
              <strong style="margin-right: 2rem;">
                ${escapeHTML(site.name)}
                <span style="display:inline-block;font-size:0.7rem;font-weight:600;padding:0.1rem 0.45rem;border-radius:9999px;margin-right:0.4rem;vertical-align:middle;background:${site.site_type === "Mobile" ? "rgba(234,179,8,0.18)" : "rgba(99,102,241,0.15)"};color:${site.site_type === "Mobile" ? "#a16207" : "#4f46e5"};">${site.site_type === "Mobile" ? t("site.typeMobile") : t("site.typeFixed")}</span>
                (${t("common.devicesCount", { count: site.radios.length })})
              </strong>
              <div class="site-row-actions">
                <button class="btn btn-sm btn-edit" onclick="event.stopPropagation(); openSiteModal('${site.id}')">${t("site.editTitle")}</button>
                <button class="btn btn-sm btn-add" onclick="event.stopPropagation(); openAddRadioModalForSite('${site.id}')">${t("overview.addDevice")}</button>
                <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); clearAllDevicesAtSite('${site.id}', '${escapeHTML(site.name)}')" title="${t("overview.clearAll")}">${t("overview.clearAll")}</button>
              </div>
            </div>
          </div>
        </td>
      `;

      tbody.appendChild(siteRow);

      // Find duplicate frequencies allocated to different devices in the same site
      const currentFreqCounts = {};
      const standbyFreqCounts = {};
      site.radios.forEach((radio) => {
        if (radio.frequency && radio.frequency !== "-") {
          const freq = String(radio.frequency).trim();
          currentFreqCounts[freq] = (currentFreqCounts[freq] || 0) + 1;
        }
        if (radio.standby_frequency && radio.standby_frequency !== "-") {
          const freq = String(radio.standby_frequency).trim();
          standbyFreqCounts[freq] = (standbyFreqCounts[freq] || 0) + 1;
        }
      });

      // Render radio device rows (sorted by frequency band)
      const sortedRadios = [...site.radios].sort((a, b) => {
        const bandA = a.frequency_band || "";
        const bandB = b.frequency_band || "";
        return bandA.localeCompare(bandB);
      });

      sortedRadios.forEach((radio) => {
        const row = document.createElement("tr");
        row.className = "radio-row";
        row.dataset.parentSector = sector.id;
        row.dataset.parentSite = site.id;
        if (isCollapsed || isSiteCollapsed) row.style.display = "none";

        const statusClass =
          radio.status === "Usable" ? "status-usable" : "status-unusable";

        // Owner colors for current state (owner, frequency, mission)
        const ownerColor = radio.owner ? getOwnerColor(radio.owner) : null;
        // Owner colors for standby state (standby_owner, standby_frequency, standby_mission)
        const standbyOwnerColor = radio.standby_owner
          ? getOwnerColor(radio.standby_owner)
          : null;

        // Duplicate frequencies check
        const isFreqDuplicate =
          radio.frequency &&
          radio.frequency !== "-" &&
          currentFreqCounts[String(radio.frequency).trim()] > 1;
        const isStandbyFreqDuplicate =
          radio.standby_frequency &&
          radio.standby_frequency !== "-" &&
          standbyFreqCounts[String(radio.standby_frequency).trim()] > 1;
        const duplicateTextStyle = "color: red; font-weight: bold;";

        // Cell styling with owner colors
        let freqCellStyle = ownerColor
          ? `background-color: ${ownerColor};`
          : "";
        if (isFreqDuplicate) freqCellStyle += duplicateTextStyle;

        const ownerCellStyle = ownerColor
          ? `background-color: ${ownerColor};`
          : "";
        const missionCellStyle = ownerColor
          ? `background-color: ${ownerColor};`
          : "";

        let standbyFreqCellStyle = standbyOwnerColor
          ? `background-color: ${standbyOwnerColor};`
          : "";
        if (isStandbyFreqDuplicate) standbyFreqCellStyle += duplicateTextStyle;

        const standbyOwnerCellStyle = standbyOwnerColor
          ? `background-color: ${standbyOwnerColor};`
          : "";
        const standbyMissionCellStyle = standbyOwnerColor
          ? `background-color: ${standbyOwnerColor};`
          : "";

        row.innerHTML = `
          <td style="padding-right: 4rem; word-wrap: break-word;" data-col="1">${escapeHTML(radio.frequency_band)}</td>
          <td style="word-wrap: break-word;" data-col="2">${escapeHTML(radio.device_type)}</td>
          <td style="word-wrap: break-word; ${freqCellStyle}" data-col="3" ondblclick="openInlineEditor(this, '${radio.id}', 3)">${escapeHTML(String(getFreqLabel(radio.frequency, radio.frequency_band)))}</td>
          <td style="word-wrap: break-word; ${ownerCellStyle}" data-col="4" ondblclick="openInlineEditor(this, '${radio.id}', 4)">${escapeHTML(radio.owner) || "-"}</td>
          <td style="word-wrap: break-word; ${missionCellStyle}" data-col="5" ondblclick="openInlineEditor(this, '${radio.id}', 5)">${escapeHTML(radio.mission_name) || "-"}</td>
          <td style="word-wrap: break-word; ${missionCellStyle}" data-col="6" ondblclick="openInlineEditor(this, '${radio.id}', 6)">${escapeHTML(radio.role) || "-"}</td>
          <td style="word-wrap: break-word; ${standbyFreqCellStyle}" data-col="7" ondblclick="openInlineEditor(this, '${radio.id}', 7)">${escapeHTML(String(getFreqLabel(radio.standby_frequency, radio.frequency_band)))}</td>
          <td style="word-wrap: break-word; ${standbyOwnerCellStyle}" data-col="8" ondblclick="openInlineEditor(this, '${radio.id}', 8)">${escapeHTML(radio.standby_owner) || "-"}</td>
          <td style="word-wrap: break-word; ${standbyMissionCellStyle}" data-col="9" ondblclick="openInlineEditor(this, '${radio.id}', 9)">${escapeHTML(radio.standby_mission) || "-"}</td>
          <td style="word-wrap: break-word; ${standbyMissionCellStyle}" data-col="10" ondblclick="openInlineEditor(this, '${radio.id}', 10)">${escapeHTML(radio.standby_role) || "-"}</td>
          <td style="word-wrap: break-word;" data-col="11" ondblclick="openInlineEditor(this, '${radio.id}', 11)"><span class="status-badge ${statusClass}">${t(radio.status === "Usable" ? "status.usable" : "status.unusable")}</span></td>
          <td style="word-wrap: break-word;" data-col="12" ondblclick="openInlineEditor(this, '${radio.id}', 12)">${escapeHTML(radio.notes) || "-"}</td>
          <td class="col-actions" style="word-wrap: break-word; white-space: nowrap; text-align: center;">
            <div style="display: inline-flex; gap: 0.3rem; flex-wrap: nowrap; align-items: center; justify-content: center;">
              <button class="mission-btn btn-secondary" data-tooltip="${escapeHTML(t("overview.btn.swapStates"))}" onclick="switchDeviceStates('${radio.id}')"><i class="fa-solid fa-right-left"></i></button>
              <button class="mission-btn btn-primary" data-tooltip="${escapeHTML(t("overview.btn.edit"))}" onclick="openRadioModal('${radio.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
              <button class="mission-btn btn-danger" data-tooltip="${escapeHTML(t("overview.btn.clear"))}" onclick="clearDevice('${radio.id}')"><i class="fa-solid fa-eraser"></i></button>
            </div>
          </td>
        `;

        tbody.appendChild(row);
      });
    });
  });

  _updateCollapseAllBtn();
}

// ==================== Excel Export ====================

function _contrastHex(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? "000000" : "FFFFFF";
}

function exportRadiosExcel() {
  const hierarchy = window.appState?.hierarchy || [];
  if (!hierarchy.length) {
    showNotification(t("links.exportEmpty"), "warning");
    return;
  }

  const owners = window.appState?.config?.owners || [];
  const ownerColors = {};
  for (const o of owners) {
    if (o.name && o.light) {
      const bg = o.light.replace('#', '').toUpperCase().padStart(6, '0');
      ownerColors[o.name] = { bg, fg: _contrastHex(o.light) };
    }
  }

  const headers = [
    t("export.col.sector"), t("export.col.site"),
    t("export.col.band"), t("export.col.device"), t("export.col.freq"),
    t("export.col.owner"), t("export.col.mission"), t("export.col.role"),
    t("export.col.standbyFreq"), t("export.col.standbyOwner"),
    t("export.col.standbyMission"), t("export.col.standbyRole"),
    t("export.col.status"), t("export.col.notes"),
  ];

  const rows = [headers];
  const ownerCells = [];

  for (const sector of hierarchy) {
    for (const site of (sector.sites || [])) {
      for (const radio of (site.radios || [])) {
        const rowIdx = rows.length;
        rows.push([
          sector.name || "",
          site.name || "",
          radio.frequency_band || "",
          radio.device_type || "",
          radio.frequency != null ? radio.frequency : "",
          radio.owner || "",
          radio.mission_name || "",
          radio.role || "",
          radio.standby_frequency != null ? radio.standby_frequency : "",
          radio.standby_owner || "",
          radio.standby_mission || "",
          radio.standby_role || "",
          t(radio.status === "Usable" ? "status.usable" : "status.unusable"),
          radio.notes || "",
        ]);
        if (radio.owner)         ownerCells.push({ row: rowIdx, col: 5, owner: radio.owner });
        if (radio.standby_owner) ownerCells.push({ row: rowIdx, col: 9, owner: radio.standby_owner });
      }
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Style header row
  for (let c = 0; c < headers.length; c++) {
    const ref = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[ref]) ws[ref].s = {
      fill: { patternType: "solid", fgColor: { rgb: "374151" } },
      font: { bold: true, color: { rgb: "FFFFFF" } },
    };
  }

  // Apply owner background colors
  for (const { row, col, owner } of ownerCells) {
    const colors = ownerColors[owner];
    if (!colors) continue;
    const ref = XLSX.utils.encode_cell({ r: row, c: col });
    if (ws[ref]) ws[ref].s = {
      fill: { patternType: "solid", fgColor: { rgb: colors.bg } },
      font: { color: { rgb: colors.fg } },
    };
  }

  ws["!cols"] = [
    { wch: 16 }, { wch: 14 }, { wch: 8  }, { wch: 18 }, { wch: 12 },
    { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 18 },
    { wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 24 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Radios");
  XLSX.writeFile(wb, `radios-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// Export for inline onclick handlers
window.renderOverview = renderOverview;
window.clearDevice = clearDevice;
window.switchDeviceStates = switchDeviceStates;
window.clearAllDevicesAtSite = clearAllDevicesAtSite;
window.exportRadiosExcel = exportRadiosExcel;

async function switchDeviceStates(radioId) {
  const radio = window.appState.radios.find((r) => r.id === radioId);
  if (!radio) return;

  try {
    await apiCall(`/radios/${radioId}`, "POST", {
      ...radio,
      frequency: radio.standby_frequency || null,
      owner: radio.standby_owner || null,
      mission_name: radio.standby_mission || null,
      role: radio.standby_role || null,
      standby_frequency: radio.frequency || null,
      standby_owner: radio.owner || null,
      standby_mission: radio.mission_name || null,
      standby_role: radio.role || null,
    });
    showNotification(t("notify.statesSwapped"), "success");
    await loadAllData();
    renderOverview();
    if (window.renderMissionsTab) renderMissionsTab();
    if (window.performSearch) performSearch();
  } catch (error) {
    showNotification(t("notify.statesSwapFailed"), "error");
  }
}

async function clearAllDevicesAtSite(siteId, siteName) {
  const siteRadios = window.appState.radios.filter((r) => r.site_id === siteId);
  if (siteRadios.length === 0) {
    showNotification(t("notify.noDevicesAtSite"), "info");
    return;
  }

  const assignedCount = siteRadios.filter(
    (r) =>
      r.frequency ||
      r.owner ||
      r.mission_name ||
      r.standby_frequency ||
      r.standby_owner ||
      r.standby_mission,
  ).length;

  if (assignedCount === 0) {
    showNotification(t("notify.alreadyCleared"), "info");
    return;
  }

  if (
    !confirm(t("confirm.clearSite", { count: assignedCount, name: siteName }))
  )
    return;

  try {
    await apiCall("/batch/clear_site", "POST", { site_id: siteId });
    showNotification(
      t("notify.siteCleared", { count: assignedCount, name: siteName }),
      "success",
    );
    await loadAllData();
    renderOverview();
    if (window.renderMissionsTab) {
      renderMissionsTab();
    }
  } catch (error) {
    showNotification(t("notify.siteClearFailed"), "error");
  }
}

async function clearDevice(radioId) {
  const radio = window.appState.radios.find((r) => r.id === radioId);
  if (!radio) return;

  // Do nothing if all clearable fields are already empty
  const hasData =
    radio.frequency ||
    radio.owner ||
    radio.mission_name ||
    radio.role ||
    radio.standby_frequency ||
    radio.standby_owner ||
    radio.standby_mission ||
    radio.standby_role ||
    radio.notes;
  if (!hasData) return;

  // Snapshot the state before clearing so we can restore it on Undo
  const snapshot = { ...radio };

  try {
    await apiCall(`/radios/${radioId}`, "POST", {
      ...radio,
      frequency: null,
      owner: null,
      mission_name: null,
      role: null,
      standby_frequency: null,
      standby_owner: null,
      standby_mission: null,
      standby_role: null,
      notes: null,
    });
    await loadAllData();
    renderOverview();
    if (window.renderMissionsTab) renderMissionsTab();
    if (window.performSearch) performSearch();

    showUndoToast(t("notify.deviceCleared"), async () => {
      try {
        await apiCall(`/radios/${radioId}`, "POST", snapshot);
        await loadAllData();
        renderOverview();
        if (window.renderMissionsTab) renderMissionsTab();
        if (window.performSearch) performSearch();
        showNotification(t("notify.undone"), "success");
      } catch (_) {
        showNotification(t("notify.undoFailed"), "error");
      }
    });
  } catch (error) {
    showNotification(t("notify.deviceClearFailed"), "error");
  }
}
