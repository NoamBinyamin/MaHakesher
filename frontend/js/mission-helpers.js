// ==================== Mission Helpers ====================
// Pure radio-mission matching logic shared between modals/mission.js and tabs/missions.js.

function radioSatisfiesRequirement(radio, mission, requirement) {
  const radioBand =
    radio.frequency_band || getFrequencyBandForDevice(radio.device_type);
  if (radioBand !== requirement.frequencyBand) return false;

  if (requirement.sectorId) {
    const site = window.appState.sites.find((s) => s.id === radio.site_id);
    if (!site || site.sector_id !== requirement.sectorId) return false;
  }

  if (requirement.siteId && radio.site_id !== requirement.siteId) return false;

  if (requirement.frequency && radio.frequency) {
    if (Math.abs(radio.frequency - requirement.frequency) > 0.01) return false;
  }

  return true;
}

function isAllocatedToMission(radio, mission) {
  if (radio.mission_name !== mission.name) return false;
  if (radio.status !== "Usable") return false;

  for (const req of mission.requirements || []) {
    const radioBand =
      radio.frequency_band || getFrequencyBandForDevice(radio.device_type);
    if (radioBand !== req.frequencyBand) continue;

    if (req.sectorId) {
      const site = window.appState.sites.find((s) => s.id === radio.site_id);
      if (!site || site.sector_id !== req.sectorId) continue;
    }
    if (req.siteId && radio.site_id !== req.siteId) continue;

    if (req.frequency && radio.frequency) {
      if (Math.abs(radio.frequency - req.frequency) > 0.01) continue;
    } else {
      if (radio.frequency) continue;
    }

    return true;
  }
  return false;
}

function isExtraDeviceForMission(radio, mission) {
  if (radio.mission_name !== mission.name) return false;
  if (radio.status !== "Usable") return false;
  return !isAllocatedToMission(radio, mission);
}

function isAvailableForMission(radio) {
  if (radio.status !== "Usable") return false;
  if (radio.mission_name && radio.mission_name !== "Routine") return false;
  if (radio.owner) return false;
  if (radio.frequency) return false;
  return true;
}

// Used by Activate Standby to avoid touching any device that has ANY data.
function _currentStateIsEmpty(radio) {
  if (radio.status !== "Usable") return false;
  if (radio.mission_name) return false;
  if (radio.owner) return false;
  if (radio.role) return false;
  if (radio.frequency != null && radio.frequency !== 0) return false;
  return true;
}

function isAvailableForStandbyMission(radio) {
  if (radio.status !== "Usable") return false;
  if (radio.standby_mission && radio.standby_mission !== "Routine") return false;
  if (radio.standby_owner) return false;
  if (radio.standby_frequency) return false;
  return true;
}

window.radioSatisfiesRequirement = radioSatisfiesRequirement;
window.isAllocatedToMission = isAllocatedToMission;
window.isExtraDeviceForMission = isExtraDeviceForMission;
window.isAvailableForMission = isAvailableForMission;
window.isAvailableForStandbyMission = isAvailableForStandbyMission;
