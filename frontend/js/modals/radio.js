// ==================== Radio Modal ====================

// Module-level handler references so we can remove them on next open
let _missionChangeHandler = null;
let _standbyMissionChangeHandler = null;
let _maintenanceDurationInterval = null;

function _formatMaintenanceDuration(startedAtIso) {
  const start = new Date(startedAtIso);
  if (isNaN(start.getTime())) return "—";
  let diffMinutes = Math.floor((Date.now() - start.getTime()) / 60000);
  if (diffMinutes < 0) diffMinutes = 0;
  const days = Math.floor(diffMinutes / 1440);
  const hours = Math.floor((diffMinutes % 1440) / 60);
  const minutes = diffMinutes % 60;
  const parts = [];
  if (days) parts.push(t("common.durationDays", { count: days }));
  if (days || hours) parts.push(t("common.durationHours", { count: hours }));
  parts.push(t("common.durationMinutes", { count: minutes }));
  return parts.join(" ");
}

function _stopMaintenanceDurationTimer() {
  if (_maintenanceDurationInterval) {
    clearInterval(_maintenanceDurationInterval);
    _maintenanceDurationInterval = null;
  }
}

function _startMaintenanceDurationTimer(startedAtIso) {
  _stopMaintenanceDurationTimer();
  const row = document.getElementById("maintenanceDurationRow");
  const display = document.getElementById("maintenanceDuration");
  if (!startedAtIso) {
    row.style.display = "none";
    return;
  }
  row.style.display = "flex";
  display.textContent = _formatMaintenanceDuration(startedAtIso);
  _maintenanceDurationInterval = setInterval(() => {
    display.textContent = _formatMaintenanceDuration(startedAtIso);
  }, 60000);
}

function openRadioModal(radioId) {
  const radio = window.appState.radios.find((r) => r.id === radioId);
  document.getElementById("radioId").value = radio.id;
  document.getElementById("radioIdDisplay").value = radio.id;
  document.getElementById("radioDeviceType").value = radio.device_type;
  updateFrequencyBandDisplay();

  // Current State
  document.getElementById("radioFrequency").value = radio.frequency || "";
  document.getElementById("radioOwner").value = radio.owner || "";
  document.getElementById("radioRole").value = radio.role || "";

  // Standby State
  document.getElementById("radioStandbyFrequency").value =
    radio.standby_frequency || "";
  document.getElementById("radioStandbyOwner").value =
    radio.standby_owner || "";
  document.getElementById("radioStandbyRole").value = radio.standby_role || "";

  document.getElementById("radioStatus").value = radio.status || "Usable";
  document.getElementById("radioNotes").value = radio.notes || "";
  document.getElementById("maintenanceReason").value = radio.maintenance_reason || "";
  document.getElementById("maintenanceReturnDate").value = radio.maintenance_return_date || "";
  toggleMaintenanceFields();
  _startMaintenanceDurationTimer(
    radio.status === "Unusable" ? radio.maintenance_started_at : null,
  );

  // Populate mission selects
  populateMissionSelects();

  // Ensure the radio's current mission values are present as options even if
  // the mission was archived or is otherwise missing from the active list
  function ensureMissionOption(selectId, missionName) {
    if (!missionName) return;
    const select = document.getElementById(selectId);
    if (!Array.from(select.options).some((o) => o.value === missionName)) {
      const opt = document.createElement("option");
      opt.value = missionName;
      opt.textContent = missionName;
      select.appendChild(opt);
    }
  }
  ensureMissionOption("radioMission", radio.mission_name);
  ensureMissionOption("radioStandbyMission", radio.standby_mission);

  // Set mission values AFTER populating selects (so value isn't lost when innerHTML is replaced)
  document.getElementById("radioMission").value = radio.mission_name || "";
  document.getElementById("radioStandbyMission").value =
    radio.standby_mission || "";

  // Lock owner/role fields if a mission is already selected
  const ownerSelect = document.getElementById("radioOwner");
  const standbyOwnerSelect = document.getElementById("radioStandbyOwner");
  ownerSelect.disabled = !!radio.mission_name;
  standbyOwnerSelect.disabled = !!radio.standby_mission;
  document.getElementById("radioRole").readOnly = !!radio.mission_name;
  document.getElementById("radioStandbyRole").readOnly =
    !!radio.standby_mission;

  // Remove old listeners before adding new ones (avoids accumulation across modal opens)
  const missionSelect = document.getElementById("radioMission");
  const standbyMissionSelect = document.getElementById("radioStandbyMission");

  if (_missionChangeHandler) {
    missionSelect.removeEventListener("change", _missionChangeHandler);
  }
  if (_standbyMissionChangeHandler) {
    standbyMissionSelect.removeEventListener(
      "change",
      _standbyMissionChangeHandler,
    );
  }

  _missionChangeHandler = () => {
    const selectedMission = missionSelect.value;
    const roleInput = document.getElementById("radioRole");
    if (selectedMission) {
      const missionOwner = getMissionOwner(selectedMission);
      if (missionOwner) {
        ownerSelect.value = missionOwner;
        ownerSelect.disabled = true;
      }
      roleInput.value = "";
      roleInput.readOnly = true;
    } else {
      ownerSelect.value = "";
      ownerSelect.disabled = false;
      roleInput.value = "";
      roleInput.readOnly = false;
      document.getElementById("radioFrequency").value = "";
    }
  };

  _standbyMissionChangeHandler = () => {
    const selectedMission = standbyMissionSelect.value;
    const standbyRoleInput = document.getElementById("radioStandbyRole");
    if (selectedMission) {
      const missionOwner = getMissionOwner(selectedMission);
      if (missionOwner) {
        standbyOwnerSelect.value = missionOwner;
        standbyOwnerSelect.disabled = true;
      }
      standbyRoleInput.value = "";
      standbyRoleInput.readOnly = true;
    } else {
      standbyOwnerSelect.value = "";
      standbyOwnerSelect.disabled = false;
      standbyRoleInput.value = "";
      standbyRoleInput.readOnly = false;
      document.getElementById("radioStandbyFrequency").value = "";
    }
  };

  missionSelect.addEventListener("change", _missionChangeHandler);
  standbyMissionSelect.addEventListener("change", _standbyMissionChangeHandler);

  const statusSelect = document.getElementById("radioStatus");
  statusSelect.removeEventListener("change", toggleMaintenanceFields);
  statusSelect.addEventListener("change", toggleMaintenanceFields);

  openModal("radioModal", false);
}

function toggleMaintenanceFields() {
  const isUnusable = document.getElementById("radioStatus").value === "Unusable";
  document.getElementById("maintenanceFields").style.display = isUnusable ? "block" : "none";
}

function closeRadioModal() {
  _stopMaintenanceDurationTimer();
  closeModal("radioModal");
}

async function saveRadio() {
  const radioId = document.getElementById("radioId").value;
  const frequency = document.getElementById("radioFrequency").value;
  const standbyFrequency = document.getElementById(
    "radioStandbyFrequency",
  ).value;

  if (frequency && !validateFrequency()) return;
  if (standbyFrequency && !validateStandbyFrequency()) return;

  let owner = document.getElementById("radioOwner").value || null;
  const missionName = document.getElementById("radioMission").value || null;

  // Enforce mission/owner matching for current state
  if (missionName) {
    const missionOwner = getMissionOwner(missionName);
    if (missionOwner) {
      owner = missionOwner;
      document.getElementById("radioOwner").value = missionOwner;
    }
  }
  // Note: if no mission, keep the user's manually entered owner value

  let standbyOwner = document.getElementById("radioStandbyOwner").value || null;
  const standbyMissionName =
    document.getElementById("radioStandbyMission").value || null;

  // Enforce mission/owner matching for standby state
  if (standbyMissionName) {
    const standbyMissionOwner = getMissionOwner(standbyMissionName);
    if (standbyMissionOwner) {
      standbyOwner = standbyMissionOwner;
      document.getElementById("radioStandbyOwner").value = standbyMissionOwner;
    }
  }
  // Note: if no standby mission, keep the user's manually entered owner value

  const radioData = {
    device_type: document.getElementById("radioDeviceType").value,
    frequency: frequency ? parseFloat(frequency) : null,
    owner: owner,
    mission_name: missionName,
    role: document.getElementById("radioRole").value || null,
    standby_frequency: standbyFrequency ? parseFloat(standbyFrequency) : null,
    standby_owner: standbyOwner,
    standby_role: document.getElementById("radioStandbyRole").value || null,
    standby_mission: standbyMissionName,
    status: document.getElementById("radioStatus").value,
    notes: document.getElementById("radioNotes").value,
    maintenance_reason: document.getElementById("maintenanceReason").value.trim(),
    maintenance_return_date: document.getElementById("maintenanceReturnDate").value,
  };

  await withSaveSpinner("radioModal", async () => {
    await apiCall(`/radios/${radioId}`, "POST", radioData);
    showNotification(t("notify.radioSaved"), "success");
    markModalClean("radioModal");
    closeRadioModal();
    await loadAllData();
    populateSelects();
    renderOverview();
    if (window.renderMissionsTab) renderMissionsTab();
    if (window.performSearch) performSearch();
  }).catch(() => showNotification(t("notify.radioSaveFailed"), "error"));
}

async function deleteRadio() {
  const radioId = document.getElementById("radioId").value;
  if (!confirm(t("confirm.deleteRadio"))) return;

  try {
    await apiCall(`/radios/${radioId}`, "DELETE");
    showNotification(t("notify.radioDeleted"), "success");
    closeRadioModal();
    await loadAllData();
    populateSelects();
    renderOverview();
  } catch (error) {
    showNotification(t("notify.radioDeleteFailed"), "error");
  }
}

// ==================== Add New Radio Modal ====================

function openAddRadioModal() {
  document.getElementById("addRadioForm").reset();
  openModal("addRadioModal");
}

function closeAddRadioModal() {
  closeModal("addRadioModal", false);
}

async function saveNewRadio() {
  const deviceType = document.getElementById("addRadioDeviceType").value;
  const quantity = parseInt(
    document.getElementById("addRadioQuantity").value,
    10,
  );

  if (!deviceType) {
    showNotification(t("error.fillRequired"), "error");
    return;
  }
  if (!quantity || quantity < 1) {
    showNotification(t("error.fillRequired"), "error");
    return;
  }

  const siteId = document.getElementById("addRadioSite").value;

  await withSaveSpinner("addRadioModal", async () => {
    const requests = Array.from({ length: quantity }, () =>
      apiCall("/radios", "POST", {
        site_id: siteId,
        device_type: deviceType,
        frequency: null,
        mission_name: null,
        standby_frequency: null,
        standby_owner: null,
        status: "Usable",
        notes: "",
      }),
    );
    await Promise.all(requests);
    const msg = quantity === 1
      ? t("notify.radioAdded")
      : t("notify.radiosAdded").replace("{{count}}", quantity);
    showNotification(msg, "success");
    closeAddRadioModal();
    await loadAllData();
    populateSelects();
    renderOverview();
  }).catch(() => showNotification(t("notify.radioAddFailed"), "error"));
}

function openAddRadioModalForSite(siteId) {
  document.getElementById("addRadioSite").value = siteId;
  openAddRadioModal();
}

// ==================== Frequency Link Suggestions ====================

function showRadioFreqSuggestions(inputId, dropdownId) {
  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  if (!input || !dropdown) return;

  const query = input.value.trim();
  if (!query) {
    dropdown.style.display = "none";
    return;
  }

  const lq = query.toLowerCase();
  const matches = (window.appState.links || []).filter((l) =>
    l.link_name.toLowerCase().includes(lq),
  );

  if (matches.length === 0) {
    dropdown.style.display = "none";
    return;
  }

  dropdown.innerHTML = matches
    .slice(0, 8)
    .map(
      (l) => `
      <div
        class="freq-suggestion-item"
        style="padding: 0.5rem 0.75rem; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--gray-200); font-size: 0.875rem;"
        onmousedown="selectRadioFreqSuggestion(${l.frequency}, '${inputId}', '${dropdownId}')"
      >
        <strong style="color: var(--gray-900);">${escapeHTML(l.link_name)}</strong>
        <span style="color: var(--primary-color); font-weight: 500; direction: ltr;">${formatFrequency(l.frequency, l.frequency_band)} MHz &nbsp;<span style="color: var(--gray-400); font-size: 0.75rem;">${escapeHTML(l.frequency_band || "")}</span></span>
      </div>`,
    )
    .join("");

  dropdown.style.display = "block";
}

function hideRadioFreqSuggestions(dropdownId) {
  setTimeout(() => {
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) dropdown.style.display = "none";
  }, 150);
}

function selectRadioFreqSuggestion(frequency, inputId, dropdownId) {
  const input = document.getElementById(inputId);
  if (input) {
    input.value = frequency;
    if (inputId === "radioFrequency") validateFrequency();
    else if (inputId === "radioStandbyFrequency") validateStandbyFrequency();
  }
  const dropdown = document.getElementById(dropdownId);
  if (dropdown) dropdown.style.display = "none";
}

// Export for inline onclick handlers
window.openRadioModal = openRadioModal;
window.closeRadioModal = closeRadioModal;
window.saveRadio = saveRadio;
window.deleteRadio = deleteRadio;
window.openAddRadioModal = openAddRadioModal;
window.closeAddRadioModal = closeAddRadioModal;
window.saveNewRadio = saveNewRadio;
window.openAddRadioModalForSite = openAddRadioModalForSite;
window.showRadioFreqSuggestions = showRadioFreqSuggestions;
window.hideRadioFreqSuggestions = hideRadioFreqSuggestions;
window.selectRadioFreqSuggestion = selectRadioFreqSuggestion;
