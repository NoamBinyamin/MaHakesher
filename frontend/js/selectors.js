// ==================== Dropdown Population ====================

// Unified function to get active mission names (used by both inline editor and modal)
function getActiveMissionNames() {
  const activeMissionNames = window.appState.plannedMissions.map((m) => m.name);
  return activeMissionNames;
}

// Unified function to get active missions as options HTML
function getActiveMissionOptionsHTML() {
  return (window.appState.plannedMissions || [])
    .map((m) => `<option value="${escapeHTML(m.name)}">${escapeHTML(m.name)}</option>`)
    .join("");
}

// Unified function to get active missions as array
function getActiveMissions() {
  const activeMissionNames = getActiveMissionNames();
  const allMissions = window.appState.config.missions || [];
  return allMissions.filter((m) => activeMissionNames.includes(m));
}

function populateSelects() {
  // Populate device type
  const deviceSelects = document.querySelectorAll(
    "#radioDeviceType, #addRadioDeviceType",
  );
  const rt = window.appState.config.radio_types;
  const deviceNames = Array.isArray(rt) ? rt.map(d => d.name) : Object.keys(rt);
  const deviceOptions = deviceNames
    .map((type) => `<option value="${escapeHTML(type)}">${escapeHTML(type)}</option>`)
    .join("");
  deviceSelects.forEach((select) => {
    select.innerHTML =
      `<option value="">${t("select.deviceType")}</option>` + deviceOptions;
  });

  // Populate missions (for Current State) - only active missions
  const missionSelects = document.querySelectorAll(
    "#radioMission, #addRadioMission, #searchMission",
  );
  const activeMissionOptions = getActiveMissionOptionsHTML();
  missionSelects.forEach((select) => {
    const placeholder = select.querySelector('option[value=""]');
    const currentValue = select.value;
    const newOptions = placeholder
      ? `<option value="">${t("select.allMissions")}</option>` + activeMissionOptions
      : `<option value="">${t("select.noMission")}</option>` + activeMissionOptions;
    select.innerHTML = newOptions;
    if (currentValue) select.value = currentValue;
  });

  // Populate standby mission select
  const standbyMissionSelect = document.getElementById("radioStandbyMission");
  if (standbyMissionSelect) {
    standbyMissionSelect.innerHTML =
      `<option value="">${t("select.noMission")}</option>` + activeMissionOptions;
  }

  // Populate owner selects
  const ownerSelects = document.querySelectorAll(
    "#radioOwner, #radioStandbyOwner, #planMissionOwner, #linkOwner, #editLinkOwner",
  );
  const ownerOptions =
    (window.appState.config.owners || [])
      .map(({ name }) => `<option value="${escapeHTML(name)}">${escapeHTML(name)}</option>`)
      .join("") || "";
  ownerSelects.forEach((select) => {
    const placeholder = select.querySelector('option[value=""]');
    const currentValue = select.value;
    const newOptions =
      `<option value="">${t("select.owner")}</option>` + ownerOptions;
    select.innerHTML = newOptions;
    if (currentValue) select.value = currentValue;
  });

  // Populate sectors for mission planning
  const sectorSelects = document.querySelectorAll("#reqSector");
  const sectorOptions = window.appState.sectors
    .map((sector) => `<option value="${escapeHTML(sector.id)}">${escapeHTML(sector.name)}</option>`)
    .join("");
  sectorSelects.forEach((select) => {
    select.innerHTML =
      `<option value="">${t("select.sector")}</option>` + sectorOptions;
  });

  // Populate sites for add radio and mission planning
  const siteSelects = document.querySelectorAll("#addRadioSite, #reqSite");
  const siteOptions = window.appState.sites
    .map((site) => `<option value="${escapeHTML(site.id)}">${escapeHTML(site.name)}</option>`)
    .join("");
  siteSelects.forEach((select) => {
    select.innerHTML =
      `<option value="">${t("select.site")}</option>` + siteOptions;
  });

}

function populateMissionSelects() {
  // Helper to populate mission selects in the edit modal
  // Use unified function to get only active missions
  const activeMissionOptions = getActiveMissionOptionsHTML();

  const radioMissionSelect = document.getElementById("radioMission");
  if (radioMissionSelect) {
    radioMissionSelect.innerHTML =
      `<option value="">${t("select.noMission")}</option>` + activeMissionOptions;
  }

  const standbyMissionSelect = document.getElementById("radioStandbyMission");
  if (standbyMissionSelect) {
    standbyMissionSelect.innerHTML =
      `<option value="">${t("select.noMission")}</option>` + activeMissionOptions;
  }
}

// Export for use by other modules
window.populateSelects = populateSelects;
window.populateMissionSelects = populateMissionSelects;
window.getActiveMissionNames = getActiveMissionNames;
window.getActiveMissionOptionsHTML = getActiveMissionOptionsHTML;
window.getActiveMissions = getActiveMissions;
