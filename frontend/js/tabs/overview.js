// ==================== Overview Rendering (Unified Table) ====================

function getFreqLabel(freq) {
  if (!freq || freq === "-") return freq || "-";
  if (window.overviewFreqMode !== "link") return freq;
  const links = window.appState.links || [];
  const match = links.find((l) => Math.abs(Number(l.frequency) - Number(freq)) < 0.001);
  return match ? match.link_name : freq;
}

window.setOverviewFreqMode = function (mode) {
  window.overviewFreqMode = mode;
  const freqBtn = document.getElementById("overviewFreqModeBtn");
  const linkBtn = document.getElementById("overviewLinkModeBtn");
  if (freqBtn && linkBtn) {
    if (mode === "frequency") {
      freqBtn.className = "btn btn-primary";
      linkBtn.className = "btn btn-secondary";
    } else {
      freqBtn.className = "btn btn-secondary";
      linkBtn.className = "btn btn-primary";
    }
  }
  renderOverview();
};

function renderOverview() {
  const tbody = document.getElementById("overviewTableBody");
  tbody.innerHTML = "";

  window.appState.hierarchy.forEach((sector) => {
    // Sector separator row
    const sectorRow = document.createElement("tr");
    sectorRow.className = "sector-row";

    sectorRow.innerHTML = `
      <td colspan="13" style="padding: 0;">
        <div class="sector-cell">
          <strong>${escapeHTML(sector.name)}</strong>
          <div class="sector-row-actions">
            <button class="btn btn-sm btn-edit" onclick="event.stopPropagation(); openSectorModal('${sector.id}')">${t("overview.editSector")}</button>
            <button class="btn btn-sm btn-add" onclick="event.stopPropagation(); openAddSiteModalForSector('${sector.id}')">${t("overview.addSite")}</button>
          </div>
        </div>
      </td>
    `;

    tbody.appendChild(sectorRow);

    // Render sites and radios within this sector
    sector.sites.forEach((site) => {
      // Site separator row
      const siteRow = document.createElement("tr");
      siteRow.className = "site-row";

      siteRow.innerHTML = `
        <td colspan="13" style="padding: 0;">
          <div class="site-cell">
            <strong style="margin-right: 2rem;">
              ${escapeHTML(site.name)}
              <span style="display:inline-block;font-size:0.7rem;font-weight:600;padding:0.1rem 0.45rem;border-radius:9999px;margin-right:0.4rem;vertical-align:middle;background:${site.site_type === 'Mobile' ? 'rgba(234,179,8,0.18)' : 'rgba(99,102,241,0.15)'};color:${site.site_type === 'Mobile' ? '#a16207' : '#4f46e5'};">${site.site_type === 'Mobile' ? t('site.typeMobile') : t('site.typeFixed')}</span>
              (${t("common.devicesCount", { count: site.radios.length })})
            </strong>
            <div class="site-row-actions">
              <button class="btn btn-sm btn-edit" onclick="event.stopPropagation(); openSiteModal('${site.id}')">${t("site.editTitle")}</button>
              <button class="btn btn-sm btn-add" onclick="event.stopPropagation(); openAddRadioModalForSite('${site.id}')">${t("overview.addDevice")}</button>
              <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); clearAllDevicesAtSite('${site.id}', '${escapeHTML(site.name)}')" title="${t("overview.clearAll")}">${t("overview.clearAll")}</button>
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
          <td style="word-wrap: break-word; ${freqCellStyle}" data-col="3" ondblclick="openInlineEditor(this, '${radio.id}', 3)">${escapeHTML(String(getFreqLabel(radio.frequency)))}</td>
          <td style="word-wrap: break-word; ${ownerCellStyle}" data-col="4" ondblclick="openInlineEditor(this, '${radio.id}', 4)">${escapeHTML(radio.owner) || "-"}</td>
          <td style="word-wrap: break-word; ${missionCellStyle}" data-col="5" ondblclick="openInlineEditor(this, '${radio.id}', 5)">${escapeHTML(radio.mission_name) || "-"}</td>
          <td style="word-wrap: break-word; ${missionCellStyle}" data-col="6" ondblclick="openInlineEditor(this, '${radio.id}', 6)">${escapeHTML(radio.role) || "-"}</td>
          <td style="word-wrap: break-word; ${standbyFreqCellStyle}" data-col="7" ondblclick="openInlineEditor(this, '${radio.id}', 7)">${escapeHTML(String(getFreqLabel(radio.standby_frequency)))}</td>
          <td style="word-wrap: break-word; ${standbyOwnerCellStyle}" data-col="8" ondblclick="openInlineEditor(this, '${radio.id}', 8)">${escapeHTML(radio.standby_owner) || "-"}</td>
          <td style="word-wrap: break-word; ${standbyMissionCellStyle}" data-col="9" ondblclick="openInlineEditor(this, '${radio.id}', 9)">${escapeHTML(radio.standby_mission) || "-"}</td>
          <td style="word-wrap: break-word; ${standbyMissionCellStyle}" data-col="10" ondblclick="openInlineEditor(this, '${radio.id}', 10)">${escapeHTML(radio.standby_role) || "-"}</td>
          <td style="word-wrap: break-word;" data-col="11" ondblclick="openInlineEditor(this, '${radio.id}', 11)"><span class="status-badge ${statusClass}">${t(radio.status === "Usable" ? "status.usable" : "status.unusable")}</span></td>
          <td style="word-wrap: break-word;" data-col="12" ondblclick="openInlineEditor(this, '${radio.id}', 12)">${escapeHTML(radio.notes) || "-"}</td>
          <td class="col-actions" style="word-wrap: break-word; white-space: nowrap;">
            <div style="display: flex; gap: 4px; flex-wrap: nowrap;">
              <button class="btn btn-sm btn-edit" title="${t('overview.btn.swapStates')}" onclick="switchDeviceStates('${radio.id}')">🔄</button>
              <button class="btn btn-sm btn-edit" title="${t('overview.btn.edit')}" onclick="openRadioModal('${radio.id}')">✏️</button>
              <button class="btn btn-sm btn-danger" title="${t('overview.btn.clear')}" onclick="clearDevice('${radio.id}')">📃</button>
            </div>
          </td>
        `;

        tbody.appendChild(row);
      });
    });
  });
}

// Export for inline onclick handlers
window.renderOverview = renderOverview;
window.clearDevice = clearDevice;
window.switchDeviceStates = switchDeviceStates;
window.clearAllDevicesAtSite = clearAllDevicesAtSite;

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
    (r) => r.frequency || r.owner || r.mission_name || r.standby_frequency || r.standby_owner || r.standby_mission,
  ).length;

  if (assignedCount === 0) {
    showNotification(t("notify.alreadyCleared"), "info");
    return;
  }

  if (!confirm(t("confirm.clearSite", { count: assignedCount, name: siteName }))) return;

  try {
    await apiCall("/batch/clear_site", "POST", { site_id: siteId });
    showNotification(t("notify.siteCleared", { count: assignedCount, name: siteName }), "success");
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

  if (!confirm(t("confirm.clearDevice"))) return;

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
    showNotification(t("notify.deviceCleared"), "success");
    await loadAllData();
    renderOverview();
    if (window.renderMissionsTab) renderMissionsTab();
    if (window.performSearch) performSearch();
  } catch (error) {
    showNotification(t("notify.deviceClearFailed"), "error");
  }
}
