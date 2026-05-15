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

function renderMissionsTab() {
  const container = document.getElementById("missionsContent");
  container.innerHTML = "";

  // ----- Active Missions Section -----
  const activeHeader = document.createElement("h3");
  activeHeader.textContent = t("missions.activeMissions");
  container.appendChild(activeHeader);

  if (
    !window.appState.plannedMissions ||
    window.appState.plannedMissions.length === 0
  ) {
    const noActive = document.createElement("p");
    noActive.textContent = t("missions.noActive");
    noActive.style.color = "var(--gray-500)";
    container.appendChild(noActive);
  } else {
    const table = document.createElement("table");
    table.className = "data-table";
    table.style.marginBottom = "2rem";
    table.innerHTML = `
      <thead>
        <tr>
          <th>${t("missions.col.name")}</th>
          <th>${t("missions.col.owner")}</th>
          <th>${t("missions.col.reqs")}</th>
          <th>${t("missions.col.allocated")}</th>
          <th>${t("missions.col.standby")}</th>
          <th>${t("missions.col.extra")}</th>
          <th>${t("missions.col.actions")}</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");
    window.appState.plannedMissions.forEach((mission) => {
      const reqCount = mission.requirements ? mission.requirements.length : 0;

      // Count properly allocated devices
      const allocatedDevices = window.appState.radios.filter((r) =>
        isAllocatedToMission(r, mission),
      ).length;

      // Count standby devices
      const standbyDevices = window.appState.radios.filter(
        (r) => r.standby_mission === mission.name && r.status === "Usable",
      ).length;

      // Count extra devices (has mission name but doesn't satisfy requirements)
      const extraDevices = window.appState.radios.filter((r) =>
        isExtraDeviceForMission(r, mission),
      ).length;

      const allocationText = `${allocatedDevices}/${reqCount}`;
      const standbyText = `${standbyDevices}/${reqCount}`;
      const isFullyAllocated = allocatedDevices >= reqCount;
      const isFullyStandby = standbyDevices >= reqCount;

      const isOverdue =
        mission.time_end && new Date(mission.time_end) < new Date();
      const overdueBadge = isOverdue
        ? `<span title="${t("missions.overdueTitle")}" style="display:inline-block;margin-inline-start:0.5rem;padding:0.1rem 0.45rem;background:var(--danger-color);color:#fff;border-radius:4px;font-size:0.72rem;font-weight:700;vertical-align:middle;letter-spacing:0.02em;">${t("missions.overdueBadge")}</span>`
        : "";

      const row = document.createElement("tr");
      if (isOverdue) row.style.backgroundColor = "rgba(239,68,68,0.06)";
      const ownerColor = mission.owner ? getOwnerColor(mission.owner) : null;
      const borderStyle = ownerColor
        ? `border-right: 4px solid ${ownerColor};`
        : "";

      row.innerHTML = `
        <td style="${borderStyle} padding-right: 0.5rem;"><strong>${escapeHTML(mission.name)}</strong>${overdueBadge}</td>
        <td style="padding-right: 0.5rem;">${escapeHTML(mission.owner) || "-"}</td>
        <td>${t("common.deviceCount", { count: reqCount })}</td>
        <td style="color: ${isFullyAllocated ? "var(--success-color)" : "inherit"}">${allocationText}</td>
        <td style="color: ${isFullyStandby ? "var(--warning-color)" : "inherit"}">${standbyText}</td>
        <td style="color: inherit">${extraDevices > 0 ? extraDevices : "-"}</td>
        <td class="missions-actions-cell">
          <button class="btn btn-sm btn-primary" onclick="editMission('${mission.id}')" title="${t("missions.btn.titleEdit")}">${t("missions.btn.editMission")}</button>
          <button class="btn btn-sm btn-success" style="background-color: var(--success-color); color: white;" onclick="startMission('${mission.id}')" title="${t("missions.btn.titleStart")}">${t("missions.btn.start")}</button>
          <button class="btn btn-sm btn-info" style="background-color: #0ea5e9; color: white;" onclick="placeOnStandby('${mission.id}')" title="${t("missions.btn.titleStandby")}">${t("missions.btn.standby")}</button>
          <button class="btn btn-sm btn-warning" onclick="endMission('${mission.id}')" title="${t("missions.btn.titleEnd")}">${t("missions.btn.end")}</button>
        </td>
      `;
      tbody.appendChild(row);
    });

    container.appendChild(table);
  }

  // ----- Archived Missions Section -----
  const archivedHeader = document.createElement("h3");
  archivedHeader.textContent = t("missions.archivedMissions");
  archivedHeader.style.marginTop = "2rem";
  container.appendChild(archivedHeader);

  if (
    !window.appState.archivedMissions ||
    window.appState.archivedMissions.length === 0
  ) {
    const noArchived = document.createElement("p");
    noArchived.textContent = t("missions.noArchived");
    noArchived.style.color = "var(--gray-500)";
    container.appendChild(noArchived);
  } else {
    const table = document.createElement("table");
    table.className = "data-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th>${t("missions.col.name")}</th>
          <th>${t("missions.col.owner")}</th>
          <th>${t("missions.col.reqs")}</th>
          <th>${t("missions.col.actions")}</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");
    window.appState.archivedMissions.forEach((mission) => {
      const reqCount = mission.requirements ? mission.requirements.length : 0;
      const row = document.createElement("tr");
      const ownerColor = mission.owner ? getOwnerColor(mission.owner) : null;
      const borderStyle = ownerColor
        ? `border-right: 4px solid ${ownerColor};`
        : "";

      row.innerHTML = `
        <td style="${borderStyle} padding-right: 0.5rem;"><strong>${escapeHTML(mission.name)}</strong></td>
        <td style="padding-right: 0.5rem;">${escapeHTML(mission.owner) || "-"}</td>
        <td>${t("common.deviceCount", { count: reqCount })}</td>
        <td class="missions-actions-cell">
          <button class="btn btn-sm btn-secondary" onclick="restoreMission('${mission.id}')" title="${t("missions.btn.titleRestore")}">${t("missions.btn.restore")}</button>
          <button class="btn btn-sm btn-danger" onclick="deleteArchivedMission('${mission.id}')" title="${t("missions.btn.titleDelete")}">🗑 ${t("btn.delete")}</button>
        </td>
      `;
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
  if (guardViewMode()) return;
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

  // Show popup for failed requirements if any
  if (failedRequirements.length > 0) {
    showFailedRequirementsModal(failedRequirements);
  }

  await loadAllData();
  renderMissionsTab();
  renderOverview();
}

// ----- Place Mission on Standby (similar to Start, but for standby state) -----

async function placeOnStandby(missionId) {
  if (guardViewMode()) return;
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
    showNotification(
      "Mission already has all requirements placed on standby or currently active",
      "info",
    );
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

  await loadAllData();
  renderMissionsTab();
  renderOverview();
}

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
  if (guardViewMode()) return;
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
  if (guardViewMode()) return;
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
  if (guardViewMode()) return;
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
          errors.push(`Row ${i + 1}: Specify either Sector OR Site, not both`);
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
          errors.push(
            `Row ${i + 1}: Unknown frequency band "${frequencyBand}"`,
          );
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
            errors.push(`Row ${i + 1}: Site "${siteName}" not found`);
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
            errors.push(`Row ${i + 1}: Sector "${sectorName}" not found`);
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
