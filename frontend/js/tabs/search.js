// ==================== Search Tab ====================

function clearSearch() {
  document.getElementById("searchQuery").value = "";
  document.getElementById("searchState").value = "both";
  document.getElementById("searchMission").value = "";
  document.getElementById("searchStatus").value = "";
  performSearch();
}

function performSearch() {
  const query = document.getElementById("searchQuery").value.toLowerCase();
  const searchState = document.getElementById("searchState").value;
  const mission = document.getElementById("searchMission").value;
  const status = document.getElementById("searchStatus").value;

  const results = window.appState.radios.filter((radio) => {
    let fieldsToSearch = [radio.device_type, radio.notes];

    if (searchState === "both" || searchState === "current") {
      fieldsToSearch.push(
        radio.owner,
        radio.mission_name,
        radio.role,
        radio.frequency ? String(radio.frequency) : null,
      );
    }

    if (searchState === "both" || searchState === "standby") {
      fieldsToSearch.push(
        radio.standby_owner,
        radio.standby_mission,
        radio.standby_role,
        radio.standby_frequency ? String(radio.standby_frequency) : null,
      );
    }

    const matchesQuery =
      !query ||
      fieldsToSearch.some(
        (field) => field && field.toLowerCase().includes(query),
      );

    let matchesMission = false;
    if (!mission) {
      matchesMission = true;
    } else {
      if (searchState === "both") {
        matchesMission =
          radio.mission_name === mission || radio.standby_mission === mission;
      } else if (searchState === "current") {
        matchesMission = radio.mission_name === mission;
      } else if (searchState === "standby") {
        matchesMission = radio.standby_mission === mission;
      }
    }

    const matchesStatus = !status || radio.status === status;

    return matchesQuery && matchesMission && matchesStatus;
  });

  const tbody = document.getElementById("searchResultsBody");
  tbody.innerHTML = "";

  const countEl = document.getElementById("searchResultCount");
  if (countEl) {
    if (results.length === 0) {
      countEl.innerHTML = `<span style="color: var(--danger-color);"><i class="fa-solid fa-circle-xmark" style="margin-left: 0.3rem;"></i> ${t("search.noResults")}</span>`;
    } else {
      const key = results.length === 1 ? "search.results" : "search.resultsPlural";
      countEl.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--success-color); margin-left: 0.3rem;"></i> ${t(key, { count: results.length })}`;
    }
  }

  results.forEach((radio) => {
    const siteName = getSiteName(radio.site_id);
    const statusClass =
      radio.status === "Usable" ? "status-usable" : "status-unusable";

    const currentOwnerColor = radio.owner ? getOwnerColor(radio.owner) : null;
    const freqCellStyle = currentOwnerColor
      ? `background-color: ${currentOwnerColor};`
      : "";
    const ownerCellStyle = currentOwnerColor
      ? `background-color: ${currentOwnerColor};`
      : "";
    const missionCellStyle = currentOwnerColor
      ? `background-color: ${currentOwnerColor};`
      : "";

    const standbyOwnerColor = radio.standby_owner
      ? getOwnerColor(radio.standby_owner)
      : null;
    const standbyFreqCellStyle = standbyOwnerColor
      ? `background-color: ${standbyOwnerColor};`
      : "";
    const standbyOwnerCellStyle = standbyOwnerColor
      ? `background-color: ${standbyOwnerColor};`
      : "";
    const standbyMissionCellStyle = standbyOwnerColor
      ? `background-color: ${standbyOwnerColor};`
      : "";

    const row = document.createElement("tr");
    row.innerHTML = `
          <td style="padding-right: 4rem; word-wrap: break-word;">${radio.frequency_band}</td>
          <td style="word-wrap: break-word;">${radio.device_type}</td>
          <td style="word-wrap: break-word; ${freqCellStyle}">${radio.frequency || "-"}</td>
          <td style="word-wrap: break-word; ${ownerCellStyle}">${radio.owner || "-"}</td>
          <td style="word-wrap: break-word; ${missionCellStyle}">${radio.mission_name || "-"}</td>
          <td style="word-wrap: break-word; ${missionCellStyle}">${radio.role || "-"}</td>
          <td style="word-wrap: break-word; ${standbyFreqCellStyle}">${radio.standby_frequency || "-"}</td>
          <td style="word-wrap: break-word; ${standbyOwnerCellStyle}">${radio.standby_owner || "-"}</td>
          <td style="word-wrap: break-word; ${standbyMissionCellStyle}">${radio.standby_mission || "-"}</td>
          <td style="word-wrap: break-word; ${standbyMissionCellStyle}">${radio.standby_role || "-"}</td>
          <td style="word-wrap: break-word;"><span class="status-badge ${statusClass}">${t(radio.status === "Usable" ? "status.usable" : "status.unusable")}</span></td>
          <td style="word-wrap: break-word;">${siteName}</td>
          <td style="word-wrap: break-word;">${radio.notes || "-"}</td>
          <td style="word-wrap: break-word; white-space: nowrap;">
            <div style="display: flex; gap: 4px; flex-wrap: nowrap;">
              <button class="btn btn-sm btn-edit" title="${t('overview.btn.swapStates')}" onclick="switchDeviceStates('${radio.id}')">🔄</button>
              <button class="btn btn-sm btn-edit" title="${t('overview.btn.edit')}" onclick="openRadioModal('${radio.id}')">✏️</button>
              <button class="btn btn-sm btn-danger" title="${t('overview.btn.clear')}" onclick="clearDevice('${radio.id}')">📃</button>
            </div>
          </td>
        `;
    tbody.appendChild(row);
  });
}

// Export for inline onclick handlers
window.performSearch = performSearch;
window.clearSearch = clearSearch;
