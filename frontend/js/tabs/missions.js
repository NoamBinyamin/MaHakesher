// ==================== Missions Tab ====================

// ----- Helper: Check if a radio satisfies a mission requirement -----
function radioSatisfiesRequirement(radio, mission, requirement) {
  // Check frequency band match
  const radioBand =
    radio.frequency_band || getFrequencyBandForDevice(radio.device_type);
  if (radioBand !== requirement.frequencyBand) return false;

  // Check sector match (if requirement specifies a sector)
  if (requirement.sectorId) {
    const site = window.appState.sites.find((s) => s.id === radio.site_id);
    if (!site || site.sector_id !== requirement.sectorId) return false;
  }

  // Check site match (if requirement specifies a site)
  if (requirement.siteId && radio.site_id !== requirement.siteId) return false;

  // Check frequency match (if requirement specifies a frequency)
  if (requirement.frequency && radio.frequency) {
    if (Math.abs(radio.frequency - requirement.frequency) > 0.01) return false;
  }

  return true;
}

// ----- Helper: Check if a radio is an allocated device for a mission -----
function isAllocatedToMission(radio, mission) {
  // Must have the mission name
  if (radio.mission_name !== mission.name) return false;
  // Must be usable
  if (radio.status !== "Usable") return false;

  // Must satisfy ALL requirements: band, location (site/sector), AND frequency
  for (const req of mission.requirements || []) {
    // Check frequency band match
    const radioBand =
      radio.frequency_band || getFrequencyBandForDevice(radio.device_type);
    if (radioBand !== req.frequencyBand) continue;

    // Check location match (sector or site)
    if (req.sectorId) {
      const site = window.appState.sites.find((s) => s.id === radio.site_id);
      if (!site || site.sector_id !== req.sectorId) continue;
    }
    if (req.siteId && radio.site_id !== req.siteId) continue;

    // Check frequency match (exact frequency required)
    if (req.frequency && radio.frequency) {
      if (Math.abs(radio.frequency - req.frequency) > 0.01) continue;
    } else {
      // If requirement has no frequency, it must not have a frequency set
      if (radio.frequency) continue;
    }

    // All checks passed for this requirement
    return true;
  }
  return false;
}

// ----- Helper: Check if a radio is an extra device for a mission -----
function isExtraDeviceForMission(radio, mission) {
  // Has this mission name but doesn't satisfy ALL requirements
  if (radio.mission_name !== mission.name) return false;
  if (radio.status !== "Usable") return false;
  // Extra = has mission name, is usable, but NOT allocated
  return !isAllocatedToMission(radio, mission);
}

// ----- Helper: Check if a radio is available for mission assignment -----
function isAvailableForMission(radio) {
  // Must be usable
  if (radio.status !== "Usable") return false;
  // Must not have any mission assignment
  if (radio.mission_name && radio.mission_name !== "Routine") return false;
  // Must not have owner
  if (radio.owner) return false;
  // Must not have frequency
  if (radio.frequency) return false;
  return true;
}

// ----- Strict helper: ALL current-state fields must be completely empty -----
// Used by Activate Standby to avoid touching any device that has ANY data.
function _currentStateIsEmpty(radio) {
  if (radio.status !== "Usable") return false;
  if (radio.mission_name) return false;              // any value including "Routine"
  if (radio.owner) return false;
  if (radio.role) return false;
  if (radio.frequency != null && radio.frequency !== 0) return false;
  return true;
}

// ----- Helper: Check if a radio is available for standby mission assignment -----
function isAvailableForStandbyMission(radio) {
  // Must be usable
  if (radio.status !== "Usable") return false;
  // Must not have any standby mission assignment
  if (radio.standby_mission && radio.standby_mission !== "Routine")
    return false;
  // Must not have standby owner
  if (radio.standby_owner) return false;
  // Must not have standby frequency
  if (radio.standby_frequency) return false;
  return true;
}

function _missionProgressCell(count, total, colorVar) {
  if (total === 0) return `<td style="color:var(--gray-400)">-</td>`;
  const capped = Math.min(count, total);
  const isFull = count >= total;
  const labelColor = isFull ? colorVar : "inherit";
  let barHtml;
  if (total <= 10) {
    const segs = Array.from({ length: total }, (_, i) => {
      const filled = i < capped;
      return `<span class="prog-seg${filled ? " filled" : ""}"${filled ? ` style="background:${colorVar}"` : ""}></span>`;
    }).join("");
    barHtml = `<div class="prog-segs">${segs}</div>`;
  } else {
    const pct = Math.min(Math.round((count / total) * 100), 100);
    barHtml = `<div class="prog-track"><div class="prog-fill" style="width:${pct}%;background:${colorVar}"></div></div>`;
  }
  // Show actual count in label even if it exceeds total, so user knows extras exist
  return `<td><div class="mission-prog-cell"><span class="mission-prog-label" style="color:${labelColor}">${count}/${total}</span>${barHtml}</div></td>`;
}

function _buildMissionRow(mission, actions) {
  const reqCount = mission.requirements ? mission.requirements.length : 0;
  const allocatedDevices = (window.appState.radios || []).filter((r) => isAllocatedToMission(r, mission)).length;
  const standbyDevices   = (window.appState.radios || []).filter((r) => r.standby_mission === mission.name && r.status === "Usable").length;
  const extraDevices     = (window.appState.radios || []).filter((r) => isExtraDeviceForMission(r, mission)).length;
  const isOverdue = mission.time_end && new Date(mission.time_end) < new Date();
  const overdueBadge = isOverdue
    ? `<span title="${t("missions.overdueTitle")}" style="display:inline-block;margin-inline-start:0.5rem;padding:0.1rem 0.45rem;background:var(--danger-color);color:#fff;border-radius:4px;font-size:0.72rem;font-weight:700;vertical-align:middle;">${t("missions.overdueBadge")}</span>`
    : "";
  const ownerColor  = mission.owner ? getOwnerColor(mission.owner) : null;
  const borderStyle = ownerColor ? `border-right: 4px solid ${ownerColor};` : "";

  const allocatedCell = _missionProgressCell(allocatedDevices, reqCount, "var(--success-color)");
  const standbyCell   = _missionProgressCell(standbyDevices,   reqCount, "var(--warning-color)");
  const extraCell     = extraDevices > 0
    ? `<td><span class="mission-extra-badge">+${extraDevices}</span></td>`
    : `<td style="color:var(--gray-400)">-</td>`;

  const row = document.createElement("tr");
  if (isOverdue) row.style.backgroundColor = "rgba(239,68,68,0.06)";
  row.innerHTML = `
    <td style="${borderStyle} padding-right: 0.5rem;"><strong>${escapeHTML(mission.name)}</strong>${overdueBadge}</td>
    <td style="padding-right: 0.5rem;">${escapeHTML(mission.owner) || "-"}</td>
    <td>${t("common.deviceCount", { count: reqCount })}</td>
    ${allocatedCell}
    ${standbyCell}
    ${extraCell}
    <td class="missions-actions-cell">${actions}</td>
  `;
  return row;
}

function _appendMissionSection(container, titleKey, missions, buildActions, emptyKey, extraStyle = "", subtitleKey = "") {
  const row = document.createElement("div");
  row.className = "missions-section-header-row";
  if (extraStyle) row.style.cssText = extraStyle;
  const header = document.createElement("h3");
  header.textContent = t(titleKey);
  row.appendChild(header);
  if (subtitleKey) {
    const divider = document.createElement("span");
    divider.className = "missions-section-divider";
    divider.textContent = "|";
    row.appendChild(divider);
    const sub = document.createElement("span");
    sub.className = "missions-section-subtitle";
    sub.innerHTML = `<span class="missions-info-badge">i</span>${escapeHTML(t(subtitleKey))}`;
    row.appendChild(sub);
  }
  container.appendChild(row);

  if (!missions || missions.length === 0) {
    const p = document.createElement("p");
    p.textContent = t(emptyKey);
    p.style.color = "var(--gray-500)";
    container.appendChild(p);
    return;
  }

  const table = document.createElement("table");
  table.className = "data-table";
  table.style.marginBottom = "1.5rem";
  table.innerHTML = `
    <thead><tr>
      <th>${t("missions.col.name")}</th>
      <th>${t("missions.col.owner")}</th>
      <th>${t("missions.col.reqs")}</th>
      <th>${t("missions.col.allocated")}</th>
      <th>${t("missions.col.standby")}</th>
      <th>${t("missions.col.extra")}</th>
      <th>${t("missions.col.actions")}</th>
    </tr></thead>
    <tbody></tbody>`;

  const tbody = table.querySelector("tbody");
  missions.forEach((m) => tbody.appendChild(_buildMissionRow(m, buildActions(m))));
  container.appendChild(table);
}

function renderMissionsTab() {
  const container = document.getElementById("missionsContent");
  container.innerHTML = "";

  const planned  = (window.appState.plannedMissions  || []).filter((m) => m.status === "planned");
  const active   = (window.appState.plannedMissions  || []).filter((m) => m.status === "active");
  const archived =  window.appState.archivedMissions || [];

  // ----- Planned Missions (compact: no allocation columns, no delete) -----
  const plannedRow = document.createElement("div");
  plannedRow.className = "missions-section-header-row";
  plannedRow.innerHTML = `<h3>${escapeHTML(t("missions.plannedMissions"))}</h3><span class="missions-section-divider">|</span><span class="missions-section-subtitle"><span class="missions-info-badge">i</span>${escapeHTML(t("missions.sub.planned"))}</span>`;
  container.appendChild(plannedRow);

  if (planned.length === 0) {
    const p = document.createElement("p");
    p.textContent = t("missions.noPlanned");
    p.style.color = "var(--gray-500)";
    container.appendChild(p);
  } else {
    const plannedTable = document.createElement("table");
    plannedTable.className = "data-table";
    plannedTable.style.marginBottom = "1.5rem";
    plannedTable.innerHTML = `
      <thead><tr>
        <th>${t("missions.col.name")}</th>
        <th>${t("missions.col.owner")}</th>
        <th>${t("missions.col.reqs")}</th>
        <th>${t("missions.col.actions")}</th>
      </tr></thead>
      <tbody></tbody>`;
    const plannedTbody = plannedTable.querySelector("tbody");
    planned.forEach((m) => {
      const reqCount    = m.requirements ? m.requirements.length : 0;
      const ownerColor  = m.owner ? getOwnerColor(m.owner) : null;
      const borderStyle = ownerColor ? `border-right:4px solid ${ownerColor};` : "";
      const row = document.createElement("tr");
      row.innerHTML = `
        <td style="${borderStyle}padding-right:0.5rem;"><strong>${escapeHTML(m.name)}</strong></td>
        <td>${escapeHTML(m.owner) || "-"}</td>
        <td>${t("common.deviceCount", { count: reqCount })}</td>
        <td class="missions-actions-cell">
          <button class="btn btn-sm btn-primary user-edit-allowed" onclick="editMission('${m.id}')">${t("missions.btn.editMission")}</button>
          <button class="btn btn-sm btn-success admin-only" style="background-color:var(--success-color);color:white;" onclick="finishMissionPlanning('${m.id}')">${t("missions.btn.finishPlanning")}</button>
          <button class="btn btn-sm btn-secondary user-edit-allowed" onclick="archiveMission('${m.id}')">${t("missions.btn.archive")}</button>
        </td>`;
      plannedTbody.appendChild(row);
    });
    container.appendChild(plannedTable);
  }

  // ----- Active Missions — admin only -----
  _appendMissionSection(container, "missions.activeMissions", active, (m) => `
    <button class="btn btn-sm btn-primary admin-only" onclick="editMission('${m.id}')">${t("missions.btn.editMission")}</button>
    <button class="btn btn-sm btn-success admin-only" style="background-color:var(--success-color);color:white;" onclick="allocateMission('${m.id}')">${t("missions.btn.allocate")}</button>
    <button class="btn btn-sm btn-info admin-only" style="background-color:#0ea5e9;color:white;" onclick="allocateToStandby('${m.id}')">${t("missions.btn.allocateToStandby")}</button>
    <button class="btn btn-sm btn-secondary admin-only" onclick="activateStandbyBtn('${m.id}')">${t("missions.btn.activateStandby")}</button>
    <button class="btn btn-sm btn-warning admin-only" onclick="returnToPlanning('${m.id}')">${t("missions.btn.returnToPlanning")}</button>
    <button class="btn btn-sm btn-danger admin-only" onclick="endMission('${m.id}')">${t("missions.btn.finishAndArchive")}</button>
  `, "missions.noActive", "margin-top:1.5rem", "missions.sub.active");

  // ----- Archived Missions -----
  const archivedRow = document.createElement("div");
  archivedRow.className = "missions-section-header-row";
  archivedRow.style.marginTop = "1.5rem";
  archivedRow.innerHTML = `<h3>${escapeHTML(t("missions.archivedMissions"))}</h3><span class="missions-section-divider">|</span><span class="missions-section-subtitle"><span class="missions-info-badge">i</span>${escapeHTML(t("missions.sub.archived"))}</span>`;
  container.appendChild(archivedRow);

  if (archived.length === 0) {
    const p = document.createElement("p");
    p.textContent = t("missions.noArchived");
    p.style.color = "var(--gray-500)";
    container.appendChild(p);
  } else {
    const table = document.createElement("table");
    table.className = "data-table";
    table.innerHTML = `
      <thead><tr>
        <th>${t("missions.col.name")}</th>
        <th>${t("missions.col.owner")}</th>
        <th>${t("missions.col.reqs")}</th>
        <th>${t("missions.col.actions")}</th>
      </tr></thead>
      <tbody></tbody>`;
    const tbody = table.querySelector("tbody");
    archived.forEach((mission) => {
      const reqCount = mission.requirements ? mission.requirements.length : 0;
      const ownerColor  = mission.owner ? getOwnerColor(mission.owner) : null;
      const borderStyle = ownerColor ? `border-right:4px solid ${ownerColor};` : "";
      const row = document.createElement("tr");
      row.innerHTML = `
        <td style="${borderStyle}padding-right:0.5rem;"><strong>${escapeHTML(mission.name)}</strong></td>
        <td>${escapeHTML(mission.owner) || "-"}</td>
        <td>${t("common.deviceCount", { count: reqCount })}</td>
        <td class="missions-actions-cell">
          <button class="btn btn-sm btn-secondary user-edit-allowed" onclick="restoreMission('${mission.id}')">${t("missions.btn.returnToPlanning")}</button>
          <button class="btn btn-sm btn-danger admin-only" onclick="deleteArchivedMission('${mission.id}')">🗑 ${t("btn.delete")}</button>
        </td>`;
      tbody.appendChild(row);
    });
    container.appendChild(table);
  }
}

// ----- Helper: Check if a device matches a band requirement -----
function deviceMatchesBand(device, frequencyBand) {
  const deviceBand =
    device.frequency_band || getFrequencyBandForDevice(device.device_type);
  return deviceBand === frequencyBand;
}

// ----- Mission Actions -----

function openMissionSelectForDevice(radioId, isStandby = false) {
  // Populate mission dropdown with only active missions
  const missionSelect = document.getElementById(
    isStandby ? "radioStandbyMission" : "radioMission",
  );
  if (!missionSelect) return;

  const activeMissionNames = window.appState.plannedMissions.map((m) => m.name);
  const allMissionOptions = window.appState.config.missions || [];

  const optionsHTML =
    '<option value="">No Mission</option>' +
    allMissionOptions
      .map((m) => {
        const isActive = activeMissionNames.includes(m);
        return `<option value="${m}" ${!isActive ? "disabled" : ""}>${m}${!isActive ? " (Archived)" : ""}</option>`;
      })
      .join("");

  missionSelect.innerHTML = optionsHTML;
}

async function startMission(missionId) {
  if (guardAdminOnly()) return;
  const mission = window.appState.plannedMissions.find(
    (m) => m.id === missionId,
  );
  if (!mission) {
    showNotification(t("error.missionNotFound"), "error");
    return;
  }

  if (!mission.requirements || mission.requirements.length === 0) {
    showNotification(t("error.missionHasNoReqs"), "error");
    return;
  }

  const missionName = mission.name;
  const missionOwner = mission.owner;

  // Get devices already allocated (satisfying requirements)
  const allocatedRadios = window.appState.radios.filter((r) =>
    isAllocatedToMission(r, mission),
  );
  const allocatedRadioIds = new Set(allocatedRadios.map((r) => r.id));

  // Track which allocated devices are being "used" for which requirement
  const usedAllocatedIds = new Set();

  // Build list of requirements that still need allocation
  const requirementsToFulfill = [];
  const roleUpdates = [];

  for (const req of mission.requirements) {
    const band = req.frequencyBand;

    // Check if there's an already-allocated device that could satisfy this requirement
    const matchingAllocated = allocatedRadios.find((r) => {
      if (usedAllocatedIds.has(r.id)) return false;
      if (!radioSatisfiesRequirement(r, mission, req)) return false;
      return true;
    });

    if (matchingAllocated) {
      usedAllocatedIds.add(matchingAllocated.id);
      // If the requirement's role changed, queue an update
      if (req.role != null && matchingAllocated.role !== req.role) {
        roleUpdates.push({ radio: matchingAllocated, role: req.role });
      }
    } else {
      requirementsToFulfill.push(req);
    }
  }

  if (requirementsToFulfill.length === 0 && roleUpdates.length === 0) {
    // All requirements already satisfied — still activate the mission status
    try { await apiCall(`/planned_missions/${missionId}/activate`, "POST"); } catch (_) {}
    await loadAllData();
    await loadConfiguration();
    populateSelects();
    renderMissionsTab();
    renderOverview();
    showNotification(t("error.missionFulfilled"), "info");
    return;
  }

  // Get available radios — exclude any radio whose standby state already carries this mission
  let availableRadios = window.appState.radios.filter(
    (r) => isAvailableForMission(r) && r.standby_mission !== missionName,
  );

  const assignments = [];
  const failedRequirements = [];

  // Try to fulfill remaining requirements
  for (const req of requirementsToFulfill) {
    const band = req.frequencyBand;
    const siteId = req.siteId;
    const sectorId = req.sectorId;

    // Find available device matching band and site/sector
    const deviceIndex = availableRadios.findIndex((r) => {
      if (!deviceMatchesBand(r, band)) return false;
      if (siteId && r.site_id !== siteId) return false;
      if (sectorId) {
        const site = window.appState.sites.find((s) => s.id === r.site_id);
        if (!site || site.sector_id !== sectorId) return false;
      }
      return true;
    });

    if (deviceIndex !== -1) {
      const deviceToAssign = availableRadios[deviceIndex];
      assignments.push({
        radio: deviceToAssign,
        requirement: req,
      });
      availableRadios.splice(deviceIndex, 1);
    } else {
      failedRequirements.push(req);
    }
  }

  // Execute successful assignments regardless of partial failures
  if (assignments.length > 0) {
    try {
      for (const assignment of assignments) {
        const { radio, requirement } = assignment;
        const newFrequency = requirement.frequency || radio.frequency;

        await apiCall(`/radios/${radio.id}`, "POST", {
          ...radio,
          mission_name: missionName,
          owner: missionOwner || radio.owner,
          frequency: newFrequency,
          role: requirement.role || null,
        });
      }
      showNotification(
        t("notify.missionAllocated", {
          count: assignments.length,
          name: missionName,
        }),
        "success",
      );
    } catch (error) {
      showNotification(
        "Failed to allocate some devices: " + error.message,
        "error",
      );
    }
  }

  // Update roles for already-allocated devices whose requirement role changed
  if (roleUpdates.length > 0) {
    try {
      for (const { radio, role } of roleUpdates) {
        await apiCall(`/radios/${radio.id}`, "POST", { ...radio, role });
      }
      showNotification(
        `${roleUpdates.length} device role(s) updated`,
        "success",
      );
    } catch (error) {
      showNotification(t("notify.roleUpdateFailed"), "error");
    }
  }

  // Activate mission status (assignments done client-side, status updated server-side)
  try { await apiCall(`/planned_missions/${missionId}/activate`, "POST"); } catch (_) {}

  // Show popup for failed requirements if any
  if (failedRequirements.length > 0) {
    showFailedRequirementsModal(failedRequirements);
  }

  await loadAllData();
  await loadConfiguration();
  populateSelects();
  renderMissionsTab();
  renderOverview();
}

// ── Finish Mission Planning: planned → active (status only, no allocation) ──

async function finishMissionPlanning(missionId) {
  if (guardAdminOnly()) return;
  try {
    await apiCall(`/planned_missions/${missionId}/activate`, "POST");
    showNotification(t("notify.missionActivated"), "success");
    await loadAllData();
    await loadConfiguration();
    populateSelects();
    renderMissionsTab();
  } catch (_) {}
}

// ── Return to Planning: active → planned (clears all assignments server-side) ──

async function returnToPlanning(missionId) {
  if (guardAdminOnly()) return;
  if (!confirm(t("confirm.returnToPlanning"))) return;
  try {
    await apiCall(`/planned_missions/${missionId}/deactivate`, "POST");
    showNotification(t("notify.missionDeactivated"), "success");
    await loadAllData();
    await loadConfiguration();
    populateSelects();
    renderMissionsTab();
    renderOverview();
  } catch (_) {}
}

// ── Activate Standby: internal helper used by both the button and Allocate ──
// For each radio with standby_mission === mission.name, tries to promote to
// Current on the same radio (if free) or another matching free radio.

async function _activateStandbyInternal(mission) {
  const missionName  = mission.name;
  const missionOwner = mission.owner;

  const standbyRadios = (window.appState.radios || []).filter(
    (r) => r.standby_mission === missionName && r.status === "Usable",
  );
  if (standbyRadios.length === 0) return { promoted: 0, failed: 0 };

  let promoted = 0;
  let failed   = 0;
  const usedIds = new Set();

  for (const standby of standbyRadios) {
    const band = standby.frequency_band || getFrequencyBandForDevice(standby.device_type);

    // Option 1: promote on the same radio if ALL its current-state fields are free
    if (_currentStateIsEmpty(standby)) {
      try {
        await apiCall(`/radios/${standby.id}`, "POST", {
          ...standby,
          mission_name:      missionName,
          frequency:         standby.standby_frequency,
          owner:             missionOwner || standby.standby_owner,
          role:              standby.standby_role,
          standby_mission:   null,
          standby_frequency: null,
          standby_owner:     null,
          standby_role:      null,
        });
        promoted++;
        usedIds.add(standby.id);
        continue;
      } catch (_) {}
    }

    // Option 2: find another fully free radio at the same site with the same band
    const freeRadio = (window.appState.radios || []).find(
      (r) =>
        r.id !== standby.id &&
        !usedIds.has(r.id) &&
        _currentStateIsEmpty(r) &&
        (r.frequency_band || getFrequencyBandForDevice(r.device_type)) === band &&
        r.site_id === standby.site_id,
    );

    if (freeRadio) {
      try {
        await apiCall(`/radios/${freeRadio.id}`, "POST", {
          ...freeRadio,
          mission_name: missionName,
          frequency:    standby.standby_frequency,
          owner:        missionOwner || standby.standby_owner,
          role:         standby.standby_role,
        });
        await apiCall(`/radios/${standby.id}`, "POST", {
          ...standby,
          standby_mission:   null,
          standby_frequency: null,
          standby_owner:     null,
          standby_role:      null,
        });
        promoted++;
        usedIds.add(freeRadio.id);
      } catch (_) { failed++; }
    } else {
      failed++;
    }
  }
  return { promoted, failed };
}

// ── Activate Standby button ──

async function activateStandbyBtn(missionId) {
  if (guardAdminOnly()) return;
  const mission = window.appState.plannedMissions.find((m) => m.id === missionId);
  if (!mission) { showNotification(t("error.missionNotFound"), "error"); return; }

  const { promoted, failed } = await _activateStandbyInternal(mission);

  if (promoted === 0 && failed === 0) {
    showNotification(t("notify.noStandbyDevices"), "info");
  } else {
    if (promoted > 0) showNotification(t("notify.standbyActivated", { count: promoted, name: mission.name }), "success");
    if (failed   > 0) showNotification(t("notify.standbyActivateFailed", { count: failed }), "warning");
  }

  await loadAllData();
  await loadConfiguration();
  populateSelects();
  renderMissionsTab();
  renderOverview();
}

// ── Allocate: Activate Standby first, then allocate remaining to Current ──

async function allocateMission(missionId) {
  if (guardAdminOnly()) return;
  const mission = window.appState.plannedMissions.find((m) => m.id === missionId);
  if (!mission) { showNotification(t("error.missionNotFound"), "error"); return; }
  if (!mission.requirements || mission.requirements.length === 0) {
    showNotification(t("error.missionHasNoReqs"), "error"); return;
  }

  const missionName  = mission.name;
  const missionOwner = mission.owner;

  // Step 1: promote standby devices to current first
  await _activateStandbyInternal(mission);
  await loadAllData();

  const freshMission = window.appState.plannedMissions.find((m) => m.id === missionId);
  if (!freshMission) return;

  // Step 2: find which requirements are still unmet in Current
  const allocatedRadios = window.appState.radios.filter((r) => isAllocatedToMission(r, freshMission));
  const usedIds = new Set();
  const toFulfill = [];

  for (const req of freshMission.requirements) {
    const match = allocatedRadios.find((r) => {
      if (usedIds.has(r.id)) return false;
      return radioSatisfiesRequirement(r, freshMission, req);
    });
    if (match) { usedIds.add(match.id); } else { toFulfill.push(req); }
  }

  if (toFulfill.length === 0) {
    showNotification(t("error.missionFulfilled"), "info");
    await loadAllData(); await loadConfiguration(); populateSelects(); renderMissionsTab(); renderOverview();
    return;
  }

  // Step 3: assign remaining requirements to free devices (Current field)
  let available = window.appState.radios.filter((r) => isAvailableForMission(r));
  const assignments = [];
  const failedReqs  = [];

  for (const req of toFulfill) {
    const idx = available.findIndex((r) => {
      if (!deviceMatchesBand(r, req.frequencyBand)) return false;
      if (req.siteId && r.site_id !== req.siteId) return false;
      if (req.sectorId) {
        const site = window.appState.sites.find((s) => s.id === r.site_id);
        if (!site || site.sector_id !== req.sectorId) return false;
      }
      return true;
    });
    if (idx !== -1) {
      assignments.push({ radio: available[idx], requirement: req });
      available.splice(idx, 1);
    } else {
      failedReqs.push(req);
    }
  }

  if (assignments.length > 0) {
    try {
      for (const { radio, requirement } of assignments) {
        await apiCall(`/radios/${radio.id}`, "POST", {
          ...radio,
          mission_name: missionName,
          frequency:    requirement.frequency || radio.frequency,
          owner:        missionOwner || radio.owner,
          role:         requirement.role || null,
        });
      }
      showNotification(t("notify.missionAllocated", { count: assignments.length, name: missionName }), "success");
    } catch (error) {
      showNotification(t("notify.missionAllocFailed", { error: error.message }), "error");
    }
  }

  if (failedReqs.length > 0) showFailedRequirementsModal(failedReqs);

  await loadAllData(); await loadConfiguration(); populateSelects(); renderMissionsTab(); renderOverview();
}

// ── Allocate to Standby: only assigns to devices with NO current allocation ──

async function allocateToStandby(missionId) {
  if (guardAdminOnly()) return;
  const mission = window.appState.plannedMissions.find((m) => m.id === missionId);
  if (!mission) { showNotification(t("error.missionNotFound"), "error"); return; }
  if (!mission.requirements || mission.requirements.length === 0) {
    showNotification(t("error.missionHasNoReqs"), "error"); return;
  }

  const missionName  = mission.name;
  const missionOwner = mission.owner;

  // Determine which requirements are already satisfied (current or standby)
  const currentRadios = window.appState.radios.filter((r) => r.mission_name === mission.name && r.status === "Usable");
  const standbyRadios = window.appState.radios.filter((r) => r.standby_mission === mission.name && r.status === "Usable");
  const usedCurrent   = new Set();
  const usedStandby   = new Set();
  const toFulfill     = [];

  for (const req of mission.requirements) {
    const matchCurrent = currentRadios.find((r) => { if (usedCurrent.has(r.id)) return false; return radioSatisfiesRequirement(r, mission, req); });
    if (matchCurrent) { usedCurrent.add(matchCurrent.id); continue; }

    const matchStandby = standbyRadios.find((r) => {
      if (usedStandby.has(r.id)) return false;
      const band = r.frequency_band || getFrequencyBandForDevice(r.device_type);
      if (band !== req.frequencyBand) return false;
      if (req.siteId && r.site_id !== req.siteId) return false;
      if (req.sectorId) { const site = window.appState.sites.find((s) => s.id === r.site_id); if (!site || site.sector_id !== req.sectorId) return false; }
      if (req.frequency && r.standby_frequency && Math.abs(r.standby_frequency - req.frequency) > 0.01) return false;
      return true;
    });
    if (matchStandby) { usedStandby.add(matchStandby.id); continue; }

    toFulfill.push(req);
  }

  if (toFulfill.length === 0) { showNotification(t("error.missionFulfilled"), "info"); return; }

  // Only block devices already assigned to THIS mission in current state
  let available = window.appState.radios.filter((r) => isAvailableForStandbyMission(r) && r.mission_name !== missionName);
  const assignments = [];
  const failedReqs  = [];

  for (const req of toFulfill) {
    const idx = available.findIndex((r) => {
      if (!deviceMatchesBand(r, req.frequencyBand)) return false;
      if (req.siteId && r.site_id !== req.siteId) return false;
      if (req.sectorId) { const site = window.appState.sites.find((s) => s.id === r.site_id); if (!site || site.sector_id !== req.sectorId) return false; }
      return true;
    });
    if (idx !== -1) { assignments.push({ radio: available[idx], requirement: req }); available.splice(idx, 1); }
    else failedReqs.push(req);
  }

  if (assignments.length > 0) {
    try {
      for (const { radio, requirement } of assignments) {
        await apiCall(`/radios/${radio.id}`, "POST", {
          ...radio,
          standby_mission:   missionName,
          standby_owner:     missionOwner || radio.standby_owner,
          standby_frequency: requirement.frequency || radio.standby_frequency,
          standby_role:      requirement.role || null,
        });
      }
      showNotification(t("notify.missionStandby", { count: assignments.length, name: missionName }), "success");
    } catch (error) {
      showNotification(t("notify.missionAllocFailed", { error: error.message }), "error");
    }
  }

  if (failedReqs.length > 0) showFailedRequirementsModal(failedReqs);

  await loadAllData(); await loadConfiguration(); populateSelects(); renderMissionsTab(); renderOverview();
}

// ----- Place Mission on Standby (similar to Start, but for standby state) -----

async function placeOnStandby(missionId) {
  if (guardAdminOnly()) return;
  const mission = window.appState.plannedMissions.find(
    (m) => m.id === missionId,
  );
  if (!mission) {
    showNotification(t("error.missionNotFound"), "error");
    return;
  }

  if (!mission.requirements || mission.requirements.length === 0) {
    showNotification(t("error.missionHasNoReqs"), "error");
    return;
  }

  const missionName = mission.name;
  const missionOwner = mission.owner;

  // Get devices already allocated to CURRENT state for this mission
  const currentAllocatedRadios = window.appState.radios.filter(
    (r) => r.mission_name === mission.name && r.status === "Usable",
  );
  const usedCurrentAllocatedIds = new Set();

  // Get devices already allocated to STANDBY state for this mission
  const standbyAllocatedRadios = window.appState.radios.filter(
    (r) => r.standby_mission === mission.name && r.status === "Usable",
  );
  const usedStandbyAllocatedIds = new Set();

  // Build list of requirements that still need allocation
  const requirementsToFulfill = [];

  for (const req of mission.requirements) {
    // 1. Check if satisfied by CURRENT state
    const matchingCurrent = currentAllocatedRadios.find((r) => {
      if (usedCurrentAllocatedIds.has(r.id)) return false;
      return radioSatisfiesRequirement(r, mission, req);
    });

    if (matchingCurrent) {
      usedCurrentAllocatedIds.add(matchingCurrent.id);
      continue; // Skip this requirement, it's already fulfilled in current state
    }

    // 2. Check if satisfied by STANDBY state
    const matchingStandby = standbyAllocatedRadios.find((r) => {
      if (usedStandbyAllocatedIds.has(r.id)) return false;

      const radioBand =
        r.frequency_band || getFrequencyBandForDevice(r.device_type);
      if (radioBand !== req.frequencyBand) return false;

      if (req.siteId && r.site_id !== req.siteId) return false;
      if (req.sectorId) {
        const site = window.appState.sites.find((s) => s.id === r.site_id);
        if (!site || site.sector_id !== req.sectorId) return false;
      }

      if (req.frequency && r.standby_frequency) {
        if (Math.abs(r.standby_frequency - req.frequency) > 0.01) return false;
      } else if (!req.frequency && r.standby_frequency) {
        return false;
      }

      return true;
    });

    if (matchingStandby) {
      usedStandbyAllocatedIds.add(matchingStandby.id);
      continue; // Skip this requirement, it's already fulfilled in standby state
    }

    // 3. Needs allocation
    requirementsToFulfill.push(req);
  }

  if (requirementsToFulfill.length === 0) {
    showNotification(t("error.missionFulfilled"), "info");
    return;
  }

  // Get available radios for standby allocation
  let availableRadios = window.appState.radios.filter((r) =>
    isAvailableForStandbyMission(r),
  );

  const assignments = [];
  const failedRequirements = [];

  // Try to fulfill remaining requirements
  for (const req of requirementsToFulfill) {
    const band = req.frequencyBand;
    const siteId = req.siteId;
    const sectorId = req.sectorId;

    // Find available device matching band and site/sector
    const deviceIndex = availableRadios.findIndex((r) => {
      // Ensure we don't assign standby on a device that already has this mission actively
      if (r.mission_name === missionName) return false;

      if (!deviceMatchesBand(r, band)) return false;
      if (siteId && r.site_id !== siteId) return false;
      if (sectorId) {
        const site = window.appState.sites.find((s) => s.id === r.site_id);
        if (!site || site.sector_id !== sectorId) return false;
      }
      return true;
    });

    if (deviceIndex !== -1) {
      const deviceToAssign = availableRadios[deviceIndex];
      assignments.push({
        radio: deviceToAssign,
        requirement: req,
      });
      availableRadios.splice(deviceIndex, 1);
    } else {
      failedRequirements.push(req);
    }
  }

  // Execute successful assignments regardless of partial failures
  if (assignments.length > 0) {
    try {
      for (const assignment of assignments) {
        const { radio, requirement } = assignment;
        const newStandbyFrequency =
          requirement.frequency || radio.standby_frequency;

        await apiCall(`/radios/${radio.id}`, "POST", {
          ...radio,
          standby_mission: missionName,
          standby_owner: missionOwner || radio.standby_owner,
          standby_frequency: newStandbyFrequency,
          standby_role: requirement.role || null,
        });
      }
      showNotification(
        t("notify.missionStandby", {
          count: assignments.length,
          name: missionName,
        }),
        "success",
      );
    } catch (error) {
      showNotification(
        "Failed to place some devices on standby: " + error.message,
        "error",
      );
    }
  }

  // Show popup for failed requirements if any
  if (failedRequirements.length > 0) {
    showFailedRequirementsModal(failedRequirements);
  }

  // Mark mission as active (standby = active status)
  try {
    await apiCall(`/planned_missions/${missionId}/activate`, "POST");
  } catch (_) {}

  await loadAllData();
  renderMissionsTab();
  renderOverview();
}

async function deletePlannedMission(missionId, missionName) {
  if (guardViewMode()) return;
  if (!confirm(t("confirm.deleteMission", { name: missionName }))) return;
  try {
    await apiCall(`/planned_missions/${missionId}`, "DELETE");
    showNotification(t("notify.missionDeleted", { name: missionName }), "success");
    await loadAllData();
    await loadConfiguration();
    populateSelects();
    renderMissionsTab();
  } catch (e) {
    showNotification(t("notify.missionDeleteFailed"), "error");
  }
}

window.deletePlannedMission   = deletePlannedMission;
window.finishMissionPlanning  = finishMissionPlanning;
window.returnToPlanning       = returnToPlanning;
window.activateStandbyBtn     = activateStandbyBtn;
window.allocateMission        = allocateMission;
window.allocateToStandby      = allocateToStandby;

function showFailedRequirementsModal(failedRequirements) {
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.id = "failedRequirementsModal";
  modal.style.cssText =
    "position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;";

  let tableRows = "";
  failedRequirements.forEach((req) => {
    let locationText = t("planMission.anyLocation");
    if (req.siteName) {
      locationText = req.siteName;
    } else if (req.sectorName) {
      locationText = `Sector: ${req.sectorName}`;
    }
    tableRows += `
      <tr>
        <td>${req.frequencyBand}</td>
        <td>${locationText}</td>
        <td>${req.frequency ? req.frequency + " MHz" : "-"}</td>
      </tr>
    `;
  });

  modal.innerHTML = `
    <div class="modal-content" style="padding: 2rem; border-radius: 8px; max-width: 500px; max-height: 80vh; overflow-y: auto;">
      <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h3 style="margin: 0;">${t("missions.failedReqs.title")}</h3>
        <button onclick="closeFailedRequirementsModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
      </div>
      <p style="margin-bottom: 1rem;">${t("missions.failedReqs.desc")}</p>
      <table class="data-table" style="width: 100%;">
        <thead>
          <tr>
            <th>${t("missions.failedReqs.col.band")}</th>
            <th>${t("missions.failedReqs.col.loc")}</th>
            <th>${t("missions.failedReqs.col.freq")}</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      <div style="margin-top: 1rem; text-align: center;">
        <button class="btn btn-primary" onclick="closeFailedRequirementsModal()">OK</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close on background click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeFailedRequirementsModal();
    }
  });
}

function closeFailedRequirementsModal() {
  const modal = document.getElementById("failedRequirementsModal");
  if (modal) {
    modal.remove();
  }
}

async function endMission(missionId) {
  if (guardAdminOnly()) return;
  const mission = window.appState.plannedMissions.find(
    (m) => m.id === missionId,
  );
  if (!mission) {
    showNotification(t("error.missionNotFound"), "error");
    return;
  }

  // Find devices with this mission (either current or standby)
  const allMissionDevices = window.appState.radios.filter(
    (r) =>
      (r.mission_name === mission.name || r.standby_mission === mission.name) &&
      r.status === "Usable",
  );
  const allocatedDevices = allMissionDevices.filter((r) =>
    isAllocatedToMission(r, mission),
  );
  const extraDevices = allMissionDevices.filter((r) =>
    isExtraDeviceForMission(r, mission),
  );
  const totalDevices = allMissionDevices.length;

  const confirmMessage =
    (totalDevices > 0
      ? t("missions.endConfirmDevices", {
          total: totalDevices,
          allocated: allocatedDevices.length,
          extra: extraDevices.length,
        })
      : "") + t("missions.endConfirmMsg");

  if (!confirm(confirmMessage)) return;

  try {
    // First, clear all devices with this mission (both allocated and extra, current and standby)
    for (const radio of allMissionDevices) {
      await apiCall(`/radios/${radio.id}`, "POST", {
        ...radio,
        frequency: null,
        owner: null,
        mission_name: null,
        role: null,
        standby_frequency: null,
        standby_owner: null,
        standby_mission: null,
        standby_role: null,
      });
    }

    // Then end the mission on the backend
    await apiCall(`/planned_missions/${missionId}/end`, "POST");
    showNotification(t("notify.missionEnded"), "success");
    await loadAllData();
    renderMissionsTab();
    renderOverview();
    if (window.renderTimelineTab) renderTimelineTab();
  } catch (error) {
    showNotification(
      t("notify.missionEndFailed", { error: error.message }),
      "error",
    );
  }
}

async function archiveMission(missionId) {
  if (guardViewMode()) return;
  // Note: Archive is now only allowed if mission has no allocated devices
  // This is enforced on backend
  if (!confirm(t("confirm.archiveMission"))) return;
  try {
    await apiCall(`/planned_missions/${missionId}/archive`, "POST");
    showNotification(t("notify.missionArchived"), "success");
    await loadAllData();
    renderMissionsTab();
  } catch (error) {
    showNotification(
      t("notify.missionArchiveFailed", { error: error.message }),
      "error",
    );
  }
}

async function restoreMission(missionId) {
  if (guardAdminOnly()) return;
  if (!confirm(t("confirm.restoreMission"))) return;
  try {
    await apiCall(`/archived_missions/${missionId}/restore`, "POST");
    showNotification(t("notify.missionRestored"), "success");
    await loadAllData();
    renderMissionsTab();
  } catch (error) {
    showNotification(
      t("notify.missionRestoreFailed", { error: error.message }),
      "error",
    );
  }
}

async function deleteArchivedMission(missionId) {
  if (guardAdminOnly()) return;
  if (!confirm(t("confirm.deleteArchived"))) return;
  try {
    await apiCall(`/archived_missions/${missionId}`, "DELETE");
    showNotification(t("notify.missionDeleted"), "success");
    await loadAllData();
    renderMissionsTab();
  } catch (error) {
    showNotification(
      "Failed to delete archived mission: " + error.message,
      "error",
    );
  }
}

// ----- Edit Mission -----

let editingMissionId = null;

function editMission(missionId) {
  const mission = window.appState.plannedMissions.find(
    (m) => m.id === missionId,
  );
  if (!mission) {
    showNotification(t("error.missionNotFound"), "error");
    return;
  }

  editingMissionId = missionId;
  document.getElementById("planMissionName").value = mission.name || "";
  document.getElementById("planMissionOwner").value = mission.owner || "";
  if (window.updatePlanMissionHeaderColor) updatePlanMissionHeaderColor();

  const timeStartEl = document.getElementById("planMissionTimeStart");
  const timeEndEl = document.getElementById("planMissionTimeEnd");
  if (timeStartEl)
    timeStartEl.value = mission.time_start
      ? mission.time_start.slice(0, 16)
      : "";
  if (timeEndEl)
    timeEndEl.value = mission.time_end ? mission.time_end.slice(0, 16) : "";

  // Show creation timestamp (read-only, only visible when editing)
  const createdAtGroup = document.getElementById("missionCreatedAtGroup");
  const createdAtInput = document.getElementById("missionCreatedAt");
  if (mission.created_at) {
    const d = new Date(mission.created_at);
    createdAtInput.value = d.toLocaleString();
    createdAtGroup.style.display = "block";
    document.getElementById("missionInfoGrid").style.gridTemplateColumns =
      "1fr 1fr 1fr";
  } else {
    createdAtInput.value = "";
    createdAtGroup.style.display = "none";
    document.getElementById("missionInfoGrid").style.gridTemplateColumns =
      "1fr 1fr";
  }

  // Populate selectors first (before showing modal)
  if (window.populateSelects) {
    window.populateSelects();
  }

  // Initialize location toggle to Site (true) by default
  const toggle = document.getElementById("reqLocationToggle");
  if (toggle) {
    toggle.checked = true;
    if (window.toggleLocationType) {
      window.toggleLocationType();
    }
  }

  // Load requirements - convert from stored format to display format
  missionRequirements = (mission.requirements || []).map((req) => ({
    sectorId: req.sectorId || req.sector_id || null,
    sectorName: req.sectorName || req.sector_name || null,
    siteId: req.siteId || req.site_id || null,
    siteName: req.siteName || req.site_name || null,
    frequencyBand: req.frequencyBand || req.frequency_band || "",
    frequency: req.frequency || null,
    role: req.role || null,
  }));
  renderRequirementsList();
  renderExtraDevices();

  // Change modal title
  const modalTitle = document.querySelector("#planMissionModal h3");
  if (modalTitle) {
    modalTitle.childNodes[modalTitle.childNodes.length - 1].textContent =
      " " + t("planMission.editTitle");
  }

  // Show modal
  document.getElementById("planMissionModal").classList.remove("hidden");
}

function closePlanMissionModal() {
  if (!confirmCloseModal("planMissionModal")) return;
  markModalClean("planMissionModal");
  document.getElementById("planMissionModal").classList.add("hidden");
  enableBodyScroll();
  missionRequirements = [];
  editingMissionId = null;

  // Reset modal title
  const modalTitle = document.querySelector("#planMissionModal h3");
  if (modalTitle) {
    modalTitle.childNodes[modalTitle.childNodes.length - 1].textContent =
      " " + t("planMission.title");
  }
}

async function savePlannedMission() {
  if (guardViewMode()) return;
  const missionName = document.getElementById("planMissionName").value.trim();
  const missionOwner = document.getElementById("planMissionOwner").value.trim();

  // Validation: Name is required
  if (!missionName) {
    showNotification(t("error.missionNameRequired"), "error");
    return;
  }

  // Validation: Owner is required
  if (!missionOwner) {
    showNotification(t("error.missionOwnerRequired"), "error");
    return;
  }

  // Validation: At least one requirement
  if (missionRequirements.length === 0) {
    showNotification(t("error.missionNoReqs"), "error");
    return;
  }

  // Check for duplicate name (excluding current mission when editing)
  const existingInActive = window.appState.plannedMissions.find(
    (m) =>
      m.name.toLowerCase() === missionName.toLowerCase() &&
      m.id !== editingMissionId,
  );
  const existingInArchived = (window.appState.archivedMissions || []).find(
    (m) => m.name.toLowerCase() === missionName.toLowerCase(),
  );
  if (existingInActive || existingInArchived) {
    showNotification(t("error.missionNameExists"), "error");
    return;
  }

  // Capture old mission data before the API call so we can update radios if name/owner changed
  let oldMission = null;
  if (editingMissionId) {
    oldMission = window.appState.plannedMissions.find(
      (m) => m.id === editingMissionId,
    );
  }

  try {
    // Convert to API format
    const requirementsForApi = missionRequirements.map((req) => ({
      sectorId: req.sectorId,
      sectorName: req.sectorName,
      siteId: req.siteId,
      siteName: req.siteName,
      frequencyBand: req.frequencyBand,
      frequency: req.frequency,
      role: req.role,
    }));

    const timeStart =
      document.getElementById("planMissionTimeStart")?.value || null;
    const timeEnd =
      document.getElementById("planMissionTimeEnd")?.value || null;

    const missionData = {
      name: missionName,
      owner: missionOwner,
      requirements: requirementsForApi,
      time_start: timeStart || null,
      time_end: timeEnd || null,
    };

    if (editingMissionId) {
      // Update existing mission
      await apiCall(
        `/planned_missions/${editingMissionId}`,
        "POST",
        missionData,
      );

      // If the mission name or owner changed, propagate to all allocated radios
      if (
        oldMission &&
        (oldMission.name !== missionName || oldMission.owner !== missionOwner)
      ) {
        const affectedRadios = window.appState.radios.filter(
          (r) =>
            r.mission_name === oldMission.name ||
            r.standby_mission === oldMission.name,
        );

        for (const radio of affectedRadios) {
          const updates = { ...radio };
          if (radio.mission_name === oldMission.name) {
            updates.mission_name = missionName;
            updates.owner = missionOwner;
          }
          if (radio.standby_mission === oldMission.name) {
            updates.standby_mission = missionName;
            updates.standby_owner = missionOwner;
          }
          await apiCall(`/radios/${radio.id}`, "POST", updates);
        }

        if (affectedRadios.length > 0) {
          showNotification(
            t("notify.devicesUpdated", { count: affectedRadios.length }),
            "info",
          );
        }
      }

      showNotification(t("notify.missionUpdated"), "success");
    } else {
      // Create new mission
      await apiCall("/planned_missions", "POST", missionData);
      showNotification(t("notify.missionSaved"), "success");
    }

    markModalClean("planMissionModal");
    closePlanMissionModal();
    await loadAllData();
    await loadConfiguration();
    populateSelects();
    renderMissionsTab();
    renderOverview();
    if (window.renderTimelineTab) renderTimelineTab();
  } catch (error) {
    showNotification(
      t("notify.missionSaveFailed", { error: error.message }),
      "error",
    );
  }
}

// Export for inline onclick handlers
window.renderMissionsTab = renderMissionsTab;
window.startMission = startMission;
window.placeOnStandby = placeOnStandby;
window.endMission = endMission;
window.archiveMission = archiveMission;
window.restoreMission = restoreMission;
window.deleteArchivedMission = deleteArchivedMission;
window.editMission = editMission;
window.closePlanMissionModal = closePlanMissionModal;
window.savePlannedMission = savePlannedMission;
window.removeMissionRequirement = removeMissionRequirement;
window.radioSatisfiesRequirement = radioSatisfiesRequirement;
window.isAllocatedToMission = isAllocatedToMission;
window.isExtraDeviceForMission = isExtraDeviceForMission;
window.isAvailableForMission = isAvailableForMission;
window.closeFailedRequirementsModal = closeFailedRequirementsModal;
window.handleMissionExcelUpload = handleMissionExcelUpload;

// ==================== Excel Import for Mission Requirements ====================

async function handleMissionExcelUpload(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array", cellDates: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

      if (rows.length < 2) {
        showNotification(t("notify.excelEmpty"), "error");
        return;
      }

      const header = rows[0].map((h) =>
        String(h || "")
          .trim()
          .toLowerCase(),
      );
      const bandIdx = header.findIndex((h) => h.includes("band"));
      const sectorIdx = header.findIndex(
        (h) => h.includes("sector") || h.includes("סקטור"),
      );
      const siteIdx = header.findIndex(
        (h) => h.includes("site") || h.includes("תחנה"),
      );
      const freqIdx = header.findIndex(
        (h) =>
          h.includes("mhz") ||
          (h.includes("freq") && !h.includes("band")) ||
          h.includes("תדר"),
      );
      const roleIdx = header.findIndex(
        (h) => h.includes("role") || h.includes("תפקיד"),
      );

      if (bandIdx === -1) {
        showNotification(t("notify.excelNoBandCol"), "error");
        return;
      }

      let imported = 0;
      let errors = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0 || !row[bandIdx]) continue;

        const frequencyBand = String(row[bandIdx] || "").trim();
        const sectorName =
          sectorIdx >= 0 ? String(row[sectorIdx] || "").trim() : "";
        const siteName = siteIdx >= 0 ? String(row[siteIdx] || "").trim() : "";
        const role = roleIdx >= 0 ? String(row[roleIdx] || "").trim() : "";

        if (sectorName && siteName) {
          errors.push(t("import.mission.bothSectorSite", { row: i + 1 }));
          continue;
        }

        let frequency = null;
        if (
          freqIdx >= 0 &&
          row[freqIdx] !== undefined &&
          row[freqIdx] !== null &&
          row[freqIdx] !== ""
        ) {
          const parsed = parseFloat(String(row[freqIdx]).trim());
          if (!isNaN(parsed)) frequency = parsed;
        }

        const validBands = Object.keys(
          window.appState.config.frequency_bands || {},
        );
        if (!validBands.includes(frequencyBand)) {
          errors.push(t("import.mission.unknownBand", { row: i + 1, band: frequencyBand }));
          continue;
        }

        if (frequency) {
          const limits = window.appState.config.frequency_bands[frequencyBand];
          if (limits && (frequency < limits.min || frequency > limits.max)) {
            errors.push(
              t("error.freqOutOfRangeRow", {
                row: i + 1,
                freq: frequency,
                band: frequencyBand,
                min: limits.min,
                max: limits.max,
              }),
            );
            continue;
          }
        }

        let sectorId = null;
        let siteId = null;
        let resolvedSectorName = null;
        let resolvedSiteName = null;

        if (siteName) {
          const site = window.appState.sites.find(
            (s) => s.name.toLowerCase() === siteName.toLowerCase(),
          );
          if (site) {
            siteId = site.id;
            resolvedSiteName = site.name;
            sectorId = site.sector_id;
            const sector = window.appState.sectors.find(
              (s) => s.id === sectorId,
            );
            resolvedSectorName = sector ? sector.name : null;
          } else {
            errors.push(t("import.mission.siteNotFound", { row: i + 1, name: siteName }));
            continue;
          }
        } else if (sectorName) {
          const sector = window.appState.sectors.find(
            (s) => s.name.toLowerCase() === sectorName.toLowerCase(),
          );
          if (sector) {
            sectorId = sector.id;
            resolvedSectorName = sector.name;
          } else {
            errors.push(t("import.mission.sectorNotFound", { row: i + 1, name: sectorName }));
            continue;
          }
        }

        missionRequirements.push({
          sectorId,
          sectorName: resolvedSectorName,
          siteId,
          siteName: resolvedSiteName,
          frequencyBand,
          frequency: frequency || null,
          role: role || null,
        });
        imported++;
      }

      renderRequirementsList();
      renderExtraDevices();
      input.value = "";

      if (errors.length > 0) {
        showExcelImportErrorsModal(errors, imported);
      } else if (imported > 0) {
        showNotification(
          `Imported ${imported} requirement(s) from Excel`,
          "success",
        );
      } else {
        showNotification(t("notify.noValidReqs"), "error");
      }
    } catch (err) {
      console.error("Excel parse error:", err);
      showNotification(
        t("notify.excelParseFailed", { error: err.message }),
        "error",
      );
    }
  };
  reader.readAsArrayBuffer(file);
}

function showExcelImportErrorsModal(errors, imported) {
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.id = "excelImportErrorsModal";
  modal.style.cssText =
    "position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;";

  let tableRows = errors
    .map(
      (e) =>
        `<tr><td style="padding: 0.75rem; border-bottom: 1px solid var(--gray-200);">${e}</td></tr>`,
    )
    .join("");

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 600px;">
      <div class="modal-header">
        <h3 style="color: var(--warning-color);">${t("excel.importTitle")}</h3>
        <button class="modal-close" onclick="closeExcelImportErrorsModal()">&times;</button>
      </div>
      <div class="modal-form">
        <p style="margin-bottom: 1rem;">
          <strong>${t("excel.reqSuccess", { count: imported })}</strong><br>
          <strong>${t("excel.rowsSkipped", { count: errors.length })}</strong> ${t("excel.dueToErrors")}
        </p>
        <table class="data-table" style="width: 100%;">
          <thead><tr><th>${t("excel.errorDetails")}</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
      <div class="modal-footer">
        <div></div>
        <div>
          <button class="btn btn-primary" onclick="closeExcelImportErrorsModal()">OK</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeExcelImportErrorsModal();
  });
}

function closeExcelImportErrorsModal() {
  const modal = document.getElementById("excelImportErrorsModal");
  if (modal) modal.remove();
}

function downloadMissionTemplate() {
  const template = [
    ["Frequency Band", "Sector", "Site", "Frequency (MHz)", "Role"],
    ["FREQUENCY-BAND", "SECTOR-OPTIONAL", "SITE-OPTIONAL", "FREQUENCY", "ROLE"],
  ];

  const ws = XLSX.utils.aoa_to_sheet(template);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Mission Requirements");
  ws["!cols"] = [
    { wch: 18 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 15 },
  ];
  XLSX.writeFile(wb, "mission_requirements_template.xlsx");
}

window.downloadMissionTemplate = downloadMissionTemplate;
window.closeExcelImportErrorsModal = closeExcelImportErrorsModal;
