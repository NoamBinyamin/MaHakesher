// ==================== Mission Actions ====================
// All async operations that mutate mission/radio state on the server.

function deviceMatchesBand(device, frequencyBand) {
  const deviceBand =
    device.frequency_band || getFrequencyBandForDevice(device.device_type);
  return deviceBand === frequencyBand;
}

// Every mission action that mutates server state ends with this sequence.
async function _refreshAfterMissionAction() {
  await loadAllData();
  await loadConfiguration();
  populateSelects();
  renderMissionsTab();
  renderOverview();
}

function openMissionSelectForDevice(radioId, isStandby = false) {
  const missionSelect = document.getElementById(
    isStandby ? "radioStandbyMission" : "radioMission",
  );
  if (!missionSelect) return;

  const activeMissionNames = (window.appState.plannedMissions || [])
    .filter((m) => m.status === "active")
    .map((m) => m.name);
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

  const allocatedRadios = window.appState.radios.filter((r) =>
    isAllocatedToMission(r, mission),
  );
  const usedAllocatedIds = new Set();
  const requirementsToFulfill = [];
  const roleUpdates = [];

  for (const req of mission.requirements) {
    const matchingAllocated = allocatedRadios.find((r) => {
      if (usedAllocatedIds.has(r.id)) return false;
      if (!radioSatisfiesRequirement(r, mission, req)) return false;
      return true;
    });

    if (matchingAllocated) {
      usedAllocatedIds.add(matchingAllocated.id);
      if (req.role != null && matchingAllocated.role !== req.role) {
        roleUpdates.push({ radio: matchingAllocated, role: req.role });
      }
    } else {
      requirementsToFulfill.push(req);
    }
  }

  if (requirementsToFulfill.length === 0 && roleUpdates.length === 0) {
    try {
      await apiCall(`/planned_missions/${missionId}/activate`, "POST");
    } catch (_) {}
    await _refreshAfterMissionAction();
    showNotification(t("error.missionFulfilled"), "info");
    return;
  }

  let availableRadios = window.appState.radios.filter(
    (r) => isAvailableForMission(r) && r.standby_mission !== missionName,
  );

  const assignments = [];
  const failedRequirements = [];

  for (const req of requirementsToFulfill) {
    const band = req.frequencyBand;
    const siteId = req.siteId;
    const sectorId = req.sectorId;

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
      assignments.push({ radio: deviceToAssign, requirement: req });
      availableRadios.splice(deviceIndex, 1);
    } else {
      failedRequirements.push(req);
    }
  }

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
        t("notify.missionAllocated", { count: assignments.length, name: missionName }),
        "success",
      );
    } catch (error) {
      showNotification("Failed to allocate some devices: " + error.message, "error");
    }
  }

  if (roleUpdates.length > 0) {
    try {
      for (const { radio, role } of roleUpdates) {
        await apiCall(`/radios/${radio.id}`, "POST", { ...radio, role });
      }
      showNotification(`${roleUpdates.length} device role(s) updated`, "success");
    } catch (error) {
      showNotification(t("notify.roleUpdateFailed"), "error");
    }
  }

  try {
    await apiCall(`/planned_missions/${missionId}/activate`, "POST");
  } catch (_) {}

  if (failedRequirements.length > 0) {
    showFailedRequirementsModal(failedRequirements);
  }

  await _refreshAfterMissionAction();
}

// ── Finish Mission Planning: planned → active (status only, no allocation) ──

async function finishMissionPlanning(missionId) {
  if (guardAdminOnly()) return;
  try {
    await apiCall(`/planned_missions/${missionId}/activate`, "POST");
    showNotification(t("notify.missionActivated"), "success");
    await _refreshAfterMissionAction();
  } catch (_) {}
}

// ── Return to Planning: active → planned (clears all assignments server-side) ──

async function returnToPlanning(missionId) {
  if (guardAdminOnly()) return;
  if (!confirm(t("confirm.returnToPlanning"))) return;
  try {
    await apiCall(`/planned_missions/${missionId}/deactivate`, "POST");
    showNotification(t("notify.missionDeactivated"), "success");
    await _refreshAfterMissionAction();
  } catch (_) {}
}

// ── Activate Standby: promotes standby-state radios to current-state ──

async function _activateStandbyInternal(mission) {
  const missionName = mission.name;
  const missionOwner = mission.owner;

  const standbyRadios = (window.appState.radios || []).filter(
    (r) => r.standby_mission === missionName && r.status === "Usable",
  );
  if (standbyRadios.length === 0) return { promoted: 0, failed: 0 };

  let promoted = 0;
  let failed = 0;
  const usedIds = new Set();
  const batchUpdates = [];

  for (const standby of standbyRadios) {
    const band =
      standby.frequency_band || getFrequencyBandForDevice(standby.device_type);

    if (_currentStateIsEmpty(standby)) {
      batchUpdates.push({
        ...standby,
        mission_name: missionName,
        frequency: standby.standby_frequency,
        owner: missionOwner || standby.standby_owner,
        role: standby.standby_role,
        standby_mission: null,
        standby_frequency: null,
        standby_owner: null,
        standby_role: null,
      });
      promoted++;
      usedIds.add(standby.id);
      continue;
    }

    const freeRadio = (window.appState.radios || []).find(
      (r) =>
        r.id !== standby.id &&
        !usedIds.has(r.id) &&
        _currentStateIsEmpty(r) &&
        (r.frequency_band || getFrequencyBandForDevice(r.device_type)) === band &&
        r.site_id === standby.site_id,
    );

    if (freeRadio) {
      batchUpdates.push({
        ...freeRadio,
        mission_name: missionName,
        frequency: standby.standby_frequency,
        owner: missionOwner || standby.standby_owner,
        role: standby.standby_role,
      });
      batchUpdates.push({
        ...standby,
        standby_mission: null,
        standby_frequency: null,
        standby_owner: null,
        standby_role: null,
      });
      promoted++;
      usedIds.add(freeRadio.id);
    } else {
      failed++;
    }
  }

  if (batchUpdates.length > 0) {
    try {
      await apiCall("/batch/update_radios", "POST", { updates: batchUpdates });
    } catch (_) {
      failed += promoted;
      promoted = 0;
    }
  }

  return { promoted, failed };
}

function _standbyStateIsEmpty(radio) {
  if (radio.status !== "Usable") return false;
  if (radio.standby_mission) return false;
  if (radio.standby_owner) return false;
  if (radio.standby_role) return false;
  if (radio.standby_frequency != null && radio.standby_frequency !== 0) return false;
  return true;
}

// ── Demote to Standby: moves current-state radios to standby-state ──

async function _demoteToStandbyInternal(mission) {
  const missionName = mission.name;
  const missionOwner = mission.owner;

  const currentRadios = (window.appState.radios || []).filter(
    (r) => r.mission_name === missionName && r.status === "Usable",
  );
  if (currentRadios.length === 0) return { demoted: 0, failed: 0 };

  let demoted = 0;
  let failed = 0;
  const usedIds = new Set();
  const batchUpdates = [];

  for (const radio of currentRadios) {
    const band = radio.frequency_band || getFrequencyBandForDevice(radio.device_type);

    if (_standbyStateIsEmpty(radio)) {
      batchUpdates.push({
        ...radio,
        standby_mission: missionName,
        standby_frequency: radio.frequency,
        standby_owner: missionOwner || radio.owner,
        standby_role: radio.role,
        mission_name: null,
        frequency: null,
        owner: null,
        role: null,
      });
      demoted++;
      usedIds.add(radio.id);
      continue;
    }

    const freeRadio = (window.appState.radios || []).find(
      (r) =>
        r.id !== radio.id &&
        !usedIds.has(r.id) &&
        _standbyStateIsEmpty(r) &&
        (r.frequency_band || getFrequencyBandForDevice(r.device_type)) === band &&
        r.site_id === radio.site_id,
    );

    if (freeRadio) {
      batchUpdates.push({
        ...freeRadio,
        standby_mission: missionName,
        standby_frequency: radio.frequency,
        standby_owner: missionOwner || radio.owner,
        standby_role: radio.role,
      });
      batchUpdates.push({
        ...radio,
        mission_name: null,
        frequency: null,
        owner: null,
        role: null,
      });
      demoted++;
      usedIds.add(freeRadio.id);
    } else {
      failed++;
    }
  }

  if (batchUpdates.length > 0) {
    try {
      await apiCall("/batch/update_radios", "POST", { updates: batchUpdates });
    } catch (_) {
      failed += demoted;
      demoted = 0;
    }
  }

  return { demoted, failed };
}

// ── Demote to Standby button ──

async function demoteToStandby(missionId) {
  if (guardAdminOnly()) return;
  const mission = window.appState.plannedMissions.find((m) => m.id === missionId);
  if (!mission) {
    showNotification(t("error.missionNotFound"), "error");
    return;
  }

  const { demoted, failed } = await _demoteToStandbyInternal(mission);

  if (demoted === 0 && failed === 0) {
    showNotification(t("notify.noCurrentDevices"), "info");
  } else {
    if (demoted > 0)
      showNotification(
        t("notify.demotedToStandby", { count: demoted, name: mission.name }),
        "success",
      );
    if (failed > 0)
      showNotification(
        t("notify.demoteToStandbyFailed", { count: failed }),
        "warning",
      );
  }

  await _refreshAfterMissionAction();
}

// ── Activate Standby button ──

async function activateStandbyBtn(missionId) {
  if (guardAdminOnly()) return;
  const mission = window.appState.plannedMissions.find((m) => m.id === missionId);
  if (!mission) {
    showNotification(t("error.missionNotFound"), "error");
    return;
  }

  const { promoted, failed } = await _activateStandbyInternal(mission);

  if (promoted === 0 && failed === 0) {
    showNotification(t("notify.noStandbyDevices"), "info");
  } else {
    if (promoted > 0)
      showNotification(
        t("notify.standbyActivated", { count: promoted, name: mission.name }),
        "success",
      );
    if (failed > 0)
      showNotification(
        t("notify.standbyActivateFailed", { count: failed }),
        "warning",
      );
  }

  await _refreshAfterMissionAction();
}

// ── Allocate: Activate Standby first, then allocate remaining to Current ──

async function allocateMission(missionId) {
  if (guardAdminOnly()) return;
  const mission = window.appState.plannedMissions.find((m) => m.id === missionId);
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

  await _activateStandbyInternal(mission);
  await loadAllData();

  const freshMission = window.appState.plannedMissions.find((m) => m.id === missionId);
  if (!freshMission) return;

  const allocatedRadios = window.appState.radios.filter((r) =>
    isAllocatedToMission(r, freshMission),
  );
  const usedIds = new Set();
  const toFulfill = [];
  const roleUpdates = [];

  for (const req of freshMission.requirements) {
    const match = allocatedRadios.find((r) => {
      if (usedIds.has(r.id)) return false;
      return radioSatisfiesRequirement(r, freshMission, req);
    });
    if (match) {
      usedIds.add(match.id);
      if (req.role != null && match.role !== req.role) {
        roleUpdates.push({ radio: match, role: req.role });
      }
    } else {
      toFulfill.push(req);
    }
  }

  if (toFulfill.length === 0 && roleUpdates.length === 0) {
    showNotification(t("error.missionFulfilled"), "info");
    await _refreshAfterMissionAction();
    return;
  }

  let available = window.appState.radios.filter((r) => isAvailableForMission(r));
  const assignments = [];
  const failedReqs = [];

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
      await apiCall("/batch/update_radios", "POST", {
        updates: assignments.map(({ radio, requirement }) => ({
          ...radio,
          mission_name: missionName,
          frequency: requirement.frequency || radio.frequency,
          owner: missionOwner || radio.owner,
          role: requirement.role || null,
        })),
      });
      showNotification(
        t("notify.missionAllocated", { count: assignments.length, name: missionName }),
        "success",
      );
    } catch (error) {
      showNotification(t("notify.missionAllocFailed", { error: error.message }), "error");
    }
  }

  if (roleUpdates.length > 0) {
    try {
      await apiCall("/batch/update_radios", "POST", {
        updates: roleUpdates.map(({ radio, role }) => ({ ...radio, role })),
      });
      showNotification(t("notify.roleUpdated", { count: roleUpdates.length }), "success");
    } catch (error) {
      showNotification(t("notify.roleUpdateFailed"), "error");
    }
  }

  if (failedReqs.length > 0) showFailedRequirementsModal(failedReqs);

  await _refreshAfterMissionAction();
}

// ── Allocate to Standby: only assigns to devices with NO current allocation ──

async function allocateToStandby(missionId) {
  if (guardAdminOnly()) return;
  const mission = window.appState.plannedMissions.find((m) => m.id === missionId);
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

  const currentRadios = window.appState.radios.filter(
    (r) => r.mission_name === mission.name && r.status === "Usable",
  );
  const standbyRadios = window.appState.radios.filter(
    (r) => r.standby_mission === mission.name && r.status === "Usable",
  );
  const usedCurrent = new Set();
  const usedStandby = new Set();
  const toFulfill = [];

  for (const req of mission.requirements) {
    const matchCurrent = currentRadios.find((r) => {
      if (usedCurrent.has(r.id)) return false;
      return radioSatisfiesRequirement(r, mission, req);
    });
    if (matchCurrent) { usedCurrent.add(matchCurrent.id); continue; }

    const matchStandby = standbyRadios.find((r) => {
      if (usedStandby.has(r.id)) return false;
      const band = r.frequency_band || getFrequencyBandForDevice(r.device_type);
      if (band !== req.frequencyBand) return false;
      if (req.siteId && r.site_id !== req.siteId) return false;
      if (req.sectorId) {
        const site = window.appState.sites.find((s) => s.id === r.site_id);
        if (!site || site.sector_id !== req.sectorId) return false;
      }
      if (req.frequency && r.standby_frequency &&
          Math.abs(r.standby_frequency - req.frequency) > 0.01) return false;
      return true;
    });
    if (matchStandby) { usedStandby.add(matchStandby.id); continue; }

    toFulfill.push(req);
  }

  if (toFulfill.length === 0) {
    showNotification(t("error.missionFulfilled"), "info");
    return;
  }

  let available = window.appState.radios
    .filter((r) => isAvailableForStandbyMission(r) && r.mission_name !== missionName)
    .sort((a, b) => (_currentStateIsEmpty(a) ? 0 : 1) - (_currentStateIsEmpty(b) ? 0 : 1));
  const assignments = [];
  const failedReqs = [];

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
    } else failedReqs.push(req);
  }

  if (assignments.length > 0) {
    try {
      await apiCall("/batch/update_radios", "POST", {
        updates: assignments.map(({ radio, requirement }) => ({
          ...radio,
          standby_mission: missionName,
          standby_owner: missionOwner || radio.standby_owner,
          standby_frequency: requirement.frequency || radio.standby_frequency,
          standby_role: requirement.role || null,
        })),
      });
      showNotification(
        t("notify.missionStandby", { count: assignments.length, name: missionName }),
        "success",
      );
    } catch (error) {
      showNotification(t("notify.missionAllocFailed", { error: error.message }), "error");
    }
  }

  if (failedReqs.length > 0) showFailedRequirementsModal(failedReqs);

  await _refreshAfterMissionAction();
}

async function placeOnStandby(missionId) {
  if (guardAdminOnly()) return;
  const mission = window.appState.plannedMissions.find((m) => m.id === missionId);
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

  const currentAllocatedRadios = window.appState.radios.filter(
    (r) => r.mission_name === mission.name && r.status === "Usable",
  );
  const usedCurrentAllocatedIds = new Set();

  const standbyAllocatedRadios = window.appState.radios.filter(
    (r) => r.standby_mission === mission.name && r.status === "Usable",
  );
  const usedStandbyAllocatedIds = new Set();

  const requirementsToFulfill = [];

  for (const req of mission.requirements) {
    const matchingCurrent = currentAllocatedRadios.find((r) => {
      if (usedCurrentAllocatedIds.has(r.id)) return false;
      return radioSatisfiesRequirement(r, mission, req);
    });
    if (matchingCurrent) {
      usedCurrentAllocatedIds.add(matchingCurrent.id);
      continue;
    }

    const matchingStandby = standbyAllocatedRadios.find((r) => {
      if (usedStandbyAllocatedIds.has(r.id)) return false;
      const radioBand = r.frequency_band || getFrequencyBandForDevice(r.device_type);
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
      continue;
    }

    requirementsToFulfill.push(req);
  }

  if (requirementsToFulfill.length === 0) {
    showNotification(t("error.missionFulfilled"), "info");
    return;
  }

  let availableRadios = window.appState.radios
    .filter((r) => isAvailableForStandbyMission(r))
    .sort((a, b) => (_currentStateIsEmpty(a) ? 0 : 1) - (_currentStateIsEmpty(b) ? 0 : 1));

  const assignments = [];
  const failedRequirements = [];

  for (const req of requirementsToFulfill) {
    const band = req.frequencyBand;
    const siteId = req.siteId;
    const sectorId = req.sectorId;

    const deviceIndex = availableRadios.findIndex((r) => {
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
      assignments.push({ radio: deviceToAssign, requirement: req });
      availableRadios.splice(deviceIndex, 1);
    } else {
      failedRequirements.push(req);
    }
  }

  if (assignments.length > 0) {
    try {
      for (const assignment of assignments) {
        const { radio, requirement } = assignment;
        const newStandbyFrequency = requirement.frequency || radio.standby_frequency;
        await apiCall(`/radios/${radio.id}`, "POST", {
          ...radio,
          standby_mission: missionName,
          standby_owner: missionOwner || radio.standby_owner,
          standby_frequency: newStandbyFrequency,
          standby_role: requirement.role || null,
        });
      }
      showNotification(
        t("notify.missionStandby", { count: assignments.length, name: missionName }),
        "success",
      );
    } catch (error) {
      showNotification(
        "Failed to place some devices on standby: " + error.message,
        "error",
      );
    }
  }

  if (failedRequirements.length > 0) {
    showFailedRequirementsModal(failedRequirements);
  }

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
    await _refreshAfterMissionAction();
  } catch (e) {
    showNotification(t("notify.missionDeleteFailed"), "error");
  }
}

function _closeStandbyMenu() {
  document.querySelectorAll(".standby-dropdown-menu.open").forEach((m) => m.classList.remove("open"));
}

function _toggleStandbyMenu(missionId, event) {
  event.stopPropagation();
  const menu = document.getElementById(`standby-menu-${missionId}`);
  if (!menu) return;
  const isOpen = menu.classList.contains("open");
  _closeStandbyMenu();
  if (!isOpen) menu.classList.add("open");
}

document.addEventListener("click", _closeStandbyMenu);

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
        <td>${req.frequency ? formatFrequency(req.frequency, req.frequencyBand) + " MHz" : "-"}</td>
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
        <tbody>${tableRows}</tbody>
      </table>
      <div style="margin-top: 1rem; text-align: center;">
        <button class="btn btn-primary" onclick="closeFailedRequirementsModal()">OK</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeFailedRequirementsModal();
  });
}

function closeFailedRequirementsModal() {
  const modal = document.getElementById("failedRequirementsModal");
  if (modal) modal.remove();
}

async function endMission(missionId) {
  if (guardAdminOnly()) return;
  const mission = window.appState.plannedMissions.find((m) => m.id === missionId);
  if (!mission) {
    showNotification(t("error.missionNotFound"), "error");
    return;
  }

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

    await apiCall(`/planned_missions/${missionId}/end`, "POST");
    showNotification(t("notify.missionEnded"), "success");
    await loadAllData();
    renderMissionsTab();
    renderOverview();
    if (window.renderTimelineTab) renderTimelineTab();
  } catch (error) {
    showNotification(t("notify.missionEndFailed", { error: error.message }), "error");
  }
}

async function archiveMission(missionId) {
  if (guardViewMode()) return;
  if (!confirm(t("confirm.archiveMission"))) return;
  try {
    await apiCall(`/planned_missions/${missionId}/archive`, "POST");
    showNotification(t("notify.missionArchived"), "success");
    await loadAllData();
    renderMissionsTab();
  } catch (error) {
    showNotification(t("notify.missionArchiveFailed", { error: error.message }), "error");
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
    showNotification(t("notify.missionRestoreFailed", { error: error.message }), "error");
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
    showNotification("Failed to delete archived mission: " + error.message, "error");
  }
}

// Export for inline onclick handlers
window.openMissionSelectForDevice = openMissionSelectForDevice;
window.startMission = startMission;
window.finishMissionPlanning = finishMissionPlanning;
window.returnToPlanning = returnToPlanning;
window.activateStandbyBtn = activateStandbyBtn;
window.demoteToStandby = demoteToStandby;
window._toggleStandbyMenu = _toggleStandbyMenu;
window._closeStandbyMenu = _closeStandbyMenu;
window.allocateMission = allocateMission;
window.allocateToStandby = allocateToStandby;
window.placeOnStandby = placeOnStandby;
window.deletePlannedMission = deletePlannedMission;
window.showFailedRequirementsModal = showFailedRequirementsModal;
window.closeFailedRequirementsModal = closeFailedRequirementsModal;
window.endMission = endMission;
window.archiveMission = archiveMission;
window.restoreMission = restoreMission;
window.deleteArchivedMission = deleteArchivedMission;
