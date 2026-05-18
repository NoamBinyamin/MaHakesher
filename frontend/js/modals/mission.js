// ==================== Mission Modal ====================

function openMissionModal() {
  // The missions tab is now the primary interface - this can be removed or used for future expansion
  showNotification(t("notify.usesMissionsTab"), "info");
}

// ==================== Plan Mission Modal ====================

let missionRequirements = [];
let requirementsSortOrder = "none";

function toggleLocationType() {
  const isSite = document.getElementById("reqLocationToggle").checked;
  const reqSector = document.getElementById("reqSector");
  const reqSite = document.getElementById("reqSite");
  const lblSector = document.getElementById("lblSector");
  const lblSite = document.getElementById("lblSite");
  const knob = document.querySelector("#reqLocationToggle + span");

  if (isSite) {
    reqSector.style.display = "none";
    reqSite.style.display = "";
    reqSector.value = "";
    if (lblSector) {
      lblSector.style.fontWeight = "normal";
      lblSector.style.color = "var(--gray-500)";
    }
    if (lblSite) {
      lblSite.style.fontWeight = "bold";
      lblSite.style.color = "var(--gray-900)";
    }
    if (knob) {
      knob.style.left = "4px";
      knob.style.right = "auto";
    }
  } else {
    reqSector.style.display = "";
    reqSite.style.display = "none";
    reqSite.value = "";
    if (lblSector) {
      lblSector.style.fontWeight = "bold";
      lblSector.style.color = "var(--gray-900)";
    }
    if (lblSite) {
      lblSite.style.fontWeight = "normal";
      lblSite.style.color = "var(--gray-500)";
    }
    if (knob) {
      knob.style.right = "4px";
      knob.style.left = "auto";
    }
  }
}

function updatePlanMissionHeaderColor() {
  const header = document.getElementById("planMissionModalHeader");
  if (!header) return;
  const owner = (document.getElementById("planMissionOwner")?.value || "").trim();
  if (owner) {
    header.style.background = getOwnerColor(owner);
  } else {
    header.style.background = "";
  }
}

function autoFillReqBand() {
  const freq = parseFloat(document.getElementById("reqFrequency").value);
  const band = !isNaN(freq) ? getBandForFrequency(freq) : null;
  const select = document.getElementById("reqFrequencyBand");
  if (band) select.value = band;
}

function showFreqLinkSuggestions() {
  const input = document.getElementById("reqFrequency");
  const dropdown = document.getElementById("reqFreqSuggestions");
  if (!input || !dropdown) return;

  const query = input.value.trim();
  if (!query) { dropdown.style.display = "none"; return; }

  const lq = query.toLowerCase();
  const matches = (window.appState.links || []).filter((l) =>
    l.link_name.toLowerCase().includes(lq)
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
      onmousedown="selectFreqLinkSuggestion(${l.frequency})"
    >
      <strong style="color: var(--gray-900);">${escapeHTML(l.link_name)}</strong>
      <span style="color: var(--primary-color); font-weight: 500; direction: ltr;">${l.frequency} MHz &nbsp;<span style="color: var(--gray-400); font-size: 0.75rem;">${escapeHTML(l.frequency_band || "")}</span></span>
    </div>`
    )
    .join("");

  dropdown.style.display = "block";
}

function hideFreqLinkSuggestions() {
  setTimeout(() => {
    const dropdown = document.getElementById("reqFreqSuggestions");
    if (dropdown) dropdown.style.display = "none";
  }, 150);
}

function selectFreqLinkSuggestion(frequency) {
  const input = document.getElementById("reqFrequency");
  if (input) {
    input.value = frequency;
    autoFillReqBand();
    checkFreqOwnerMismatch();
  }
  const dropdown = document.getElementById("reqFreqSuggestions");
  if (dropdown) dropdown.style.display = "none";
}

let _roleHideTimer = null;

function showRoleSuggestions() {
  const dropdown = document.getElementById("reqRoleSuggestions");
  if (!dropdown) return;

  const freqVal = parseFloat(document.getElementById("reqFrequency")?.value);
  if (isNaN(freqVal)) { dropdown.style.display = "none"; return; }

  const rolesFromReqs = missionRequirements
    .filter((req) => req.frequency != null &&
                     Math.abs(req.frequency - freqVal) < 0.001 &&
                     req.role)
    .map((req) => req.role);

  const matchedLink = (window.appState.links || []).find(
    (l) => l.frequency != null && Math.abs(Number(l.frequency) - freqVal) < 0.001
  );
  const genericRole = matchedLink?.generic_role || null;

  const roles = [...new Set([
    ...(genericRole ? [genericRole] : []),
    ...rolesFromReqs,
  ])];

  if (roles.length === 0) { dropdown.style.display = "none"; return; }

  const dark = document.documentElement.classList.contains("dark");
  dropdown.style.background = dark ? "#1e293b" : "white";

  dropdown.innerHTML = roles.map((role) => `
    <div
      style="padding: 0.5rem 0.75rem; display: flex; align-items: center; gap: 0.5rem; border-bottom: 1px solid var(--gray-200); font-size: 0.875rem; cursor: pointer;"
      onmousedown="selectRoleSuggestion('${escapeHTML(role)}')"
      onmouseover="this.style.background='var(--gray-50)'"
      onmouseout="this.style.background=''"
    >
      <i class="fa-solid fa-briefcase" style="color: var(--info-color); width: 16px; flex-shrink: 0;"></i>
      <span style="color: var(--gray-900);">${escapeHTML(role)}</span>
    </div>`).join("");

  dropdown.style.display = "block";
}

function hideRoleSuggestions() {
  _roleHideTimer = setTimeout(() => {
    const dropdown = document.getElementById("reqRoleSuggestions");
    if (dropdown) dropdown.style.display = "none";
    _roleHideTimer = null;
  }, 150);
}

function selectRoleSuggestion(role) {
  if (_roleHideTimer) { clearTimeout(_roleHideTimer); _roleHideTimer = null; }
  const input = document.getElementById("reqRole");
  if (input) input.value = role;
  const dropdown = document.getElementById("reqRoleSuggestions");
  if (dropdown) dropdown.style.display = "none";
}

function checkFreqOwnerMismatch() {
  const box = document.getElementById("reqFormBox");
  if (!box) return;

  const freqVal = parseFloat(document.getElementById("reqFrequency").value);
  const missionOwner = (document.getElementById("planMissionOwner")?.value || "").trim();

  if (isNaN(freqVal) || !missionOwner) {
    _resetReqFormBox(box);
    return;
  }

  const link = (window.appState.links || []).find(
    (l) => Math.abs(Number(l.frequency) - freqVal) < 0.001
  );

  if (link && link.owner && link.owner !== missionOwner) {
    box.classList.add("mismatch");
  } else {
    box.classList.remove("mismatch");
  }
}

function _resetReqFormBox(box) {
  if (!box) box = document.getElementById("reqFormBox");
  if (!box) return;
  box.classList.remove("mismatch");
}

function openPlanMissionModal() {
  missionRequirements = [];
  editingMissionId = null; // Reset editing state
  document.getElementById("missionCreatedAtGroup").style.display = "none";
  document.getElementById("missionCreatedAt").value = "";
  document.getElementById("missionInfoGrid").style.gridTemplateColumns = "1fr 1fr";
  const planMissionName = document.getElementById("planMissionName");
  const planMissionOwner = document.getElementById("planMissionOwner");
  const reqSector = document.getElementById("reqSector");
  const reqSite = document.getElementById("reqSite");
  const reqFrequencyBand = document.getElementById("reqFrequencyBand");
  const reqFrequency = document.getElementById("reqFrequency");
  const planMissionTimeStart = document.getElementById("planMissionTimeStart");
  const planMissionTimeEnd = document.getElementById("planMissionTimeEnd");

  // Only set values if elements exist
  if (planMissionName) planMissionName.value = "";
  if (planMissionOwner) planMissionOwner.value = "";
  if (reqSector) reqSector.value = "";
  if (reqSite) reqSite.value = "";
  if (reqFrequencyBand) reqFrequencyBand.value = "";
  if (reqFrequency) reqFrequency.value = "";
  if (planMissionTimeStart) planMissionTimeStart.value = "";
  if (planMissionTimeEnd) planMissionTimeEnd.value = "";

  // Populate selectors first (before showing modal)
  if (window.populateSelects) {
    window.populateSelects();
  }

  const toggle = document.getElementById("reqLocationToggle");
  if (toggle) {
    toggle.checked = true;
    toggleLocationType();
  }

  // Reset modal title to "Plan a New Mission"
  const modalTitle = document.querySelector("#planMissionModal h3");
  if (modalTitle) {
    modalTitle.childNodes[modalTitle.childNodes.length - 1].textContent = " " + t("planMission.title");
  }

  renderRequirementsList();
  renderExtraDevices();
  updatePlanMissionHeaderColor();
  _resetReqFormBox();

  const modal = document.getElementById("planMissionModal");
  if (modal) {
    modal.classList.remove("hidden");
    disableBodyScroll();
  }
}

function addMissionRequirement() {
  const sectorId = document.getElementById("reqSector").value;
  const siteId = document.getElementById("reqSite").value;
  const frequencyBand = document.getElementById("reqFrequencyBand").value;
  const frequency = document.getElementById("reqFrequency").value;
  const role = document.getElementById("reqRole").value;

  if (!frequencyBand) {
    showNotification(t("error.freqBandNotDetected"), "error");
    return;
  }

  if (!sectorId && !siteId) {
    showNotification(t("error.selectLocation"), "error");
    return;
  }

  if (!frequency) {
    showNotification(t("error.enterFrequency"), "error");
    return;
  }

  let freqVal = null;
  if (frequency) {
    freqVal = parseFloat(frequency);
    const limits = window.appState.config.frequency_bands[frequencyBand];
    if (limits && (freqVal < limits.min || freqVal > limits.max)) {
      showNotification(
        t("error.freqOutOfRange", { min: limits.min, max: limits.max, band: frequencyBand }),
        "error",
      );
      return;
    }
  }

  const site = window.appState.sites.find((s) => s.id === siteId);
  const siteName = site ? site.name : null;

  const sector = window.appState.sectors.find((s) => s.id === sectorId);
  const sectorName = sector ? sector.name : null;

  missionRequirements.push({
    sectorId: sectorId || null,
    sectorName,
    siteId: siteId || null,
    siteName,
    frequencyBand,
    frequency: freqVal,
    role: role || null,
  });
  markModalDirty("planMissionModal");

  document.getElementById("reqSector").value = "";
  document.getElementById("reqSite").value = "";
  document.getElementById("reqFrequencyBand").value = "";
  document.getElementById("reqFrequency").value = "";
  document.getElementById("reqRole").value = "";
  _resetReqFormBox();

  renderRequirementsList();
  renderExtraDevices();
}

function setSortOrder(value) {
  requirementsSortOrder = value;
  renderRequirementsList();
}

function editMissionRequirement(originalIndex) {
  const req = missionRequirements[originalIndex];
  if (!req) return;

  if (req.siteId) {
    const toggle = document.getElementById("reqLocationToggle");
    if (toggle) { toggle.checked = true; toggleLocationType(); }
    const siteEl = document.getElementById("reqSite");
    if (siteEl) siteEl.value = req.siteId;
  } else if (req.sectorId) {
    const toggle = document.getElementById("reqLocationToggle");
    if (toggle) { toggle.checked = false; toggleLocationType(); }
    const sectorEl = document.getElementById("reqSector");
    if (sectorEl) sectorEl.value = req.sectorId;
  }

  const bandEl = document.getElementById("reqFrequencyBand");
  const freqEl = document.getElementById("reqFrequency");
  const roleEl = document.getElementById("reqRole");
  if (bandEl) bandEl.value = req.frequencyBand || "";
  if (freqEl) freqEl.value = req.frequency != null ? req.frequency : "";
  if (roleEl) roleEl.value = req.role || "";

  missionRequirements.splice(originalIndex, 1);
  renderRequirementsList();
  renderExtraDevices();
}

function renderRequirementsList() {
  const container = document.getElementById("plannedRequirementsList");
  container.innerHTML = "";

  if (missionRequirements.length === 0) {
    container.innerHTML =
      `<p style="color: #94a3b8; font-size: 14px; text-align: center; padding: 16px;">${t("planMission.noReqs")}</p>`;
    return;
  }

  const indexed = missionRequirements.map((req, i) => ({ ...req, _idx: i }));

  // Resolve mission data upfront (needed for both state pre-computation and rendering)
  let allocatedRadios = [];
  let standbyRadios = [];
  let currentMission = null;

  if (typeof editingMissionId !== "undefined" && editingMissionId) {
    currentMission = window.appState.plannedMissions.find(
      (m) => m.id === editingMissionId,
    );
    if (currentMission) {
      allocatedRadios = window.appState.radios.filter((r) =>
        isAllocatedToMission(r, currentMission),
      );
      standbyRadios = window.appState.radios.filter(
        (r) => r.standby_mission === currentMission.name && r.status === "Usable",
      );
    }
  }

  // Pre-compute allocation state for each requirement before sorting
  const preUsedAllocatedIds = new Set();
  const preUsedStandbyIds = new Set();

  indexed.forEach((req) => {
    req._isAllocated = false;
    req._isStandby = false;

    if (!currentMission) return;

    const matchingAllocated = allocatedRadios.find((r) => {
      if (preUsedAllocatedIds.has(r.id)) return false;
      return radioSatisfiesRequirement(r, currentMission, req);
    });

    if (matchingAllocated) {
      req._isAllocated = true;
      preUsedAllocatedIds.add(matchingAllocated.id);
      return;
    }

    const matchingStandby = standbyRadios.find((r) => {
      if (preUsedStandbyIds.has(r.id)) return false;
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
      req._isStandby = true;
      preUsedStandbyIds.add(matchingStandby.id);
    }
  });

  // Apply sort (state sort uses the precomputed flags above)
  if (requirementsSortOrder === "frequency") {
    indexed.sort((a, b) => (a.frequency || 0) - (b.frequency || 0));
  } else if (requirementsSortOrder === "location") {
    indexed.sort((a, b) => {
      const locA = a.siteName || a.sectorName || "";
      const locB = b.siteName || b.sectorName || "";
      return locA.localeCompare(locB);
    });
  } else if (requirementsSortOrder === "state") {
    // 0 = unfulfilled, 1 = standby, 2 = filled/allocated — ascending puts unfulfilled first
    const stateRank = (r) => (r._isAllocated ? 2 : r._isStandby ? 1 : 0);
    indexed.sort((a, b) => stateRank(a) - stateRank(b));
  }

  const table = document.createElement("table");
  table.style.cssText = "width: 100%; font-size: 14px; text-align: right;";
  table.innerHTML = `
    <thead style="background: var(--gray-100); color: var(--gray-500); font-size: 12px; text-transform: uppercase; font-weight: 600;">
      <tr>
        <th style="padding: 12px 16px; border: none;">${t("planMission.reqCol.band")}</th>
        <th style="padding: 12px 16px; border: none;">${t("planMission.reqCol.location")}</th>
        <th style="padding: 12px 16px; border: none;">${t("planMission.reqCol.frequency")}</th>
        <th style="padding: 12px 16px; border: none;">${t("planMission.reqCol.role")}</th>
        <th style="padding: 12px 16px; border: none; text-align: center;">${t("planMission.reqCol.actions")}</th>
      </tr>
    </thead>
    <tbody style="border: 1px solid var(--gray-200); background: var(--gray-50);"></tbody>
  `;

  const tbody = table.querySelector("tbody");

  indexed.forEach((req) => {
    const originalIndex = req._idx;
    const isAllocated = req._isAllocated;
    const isStandby = req._isStandby;

    const row = document.createElement("tr");
    row.className = "req-row";
    const freqLink = req.frequency
      ? (window.appState.links || []).find((l) => Math.abs(Number(l.frequency) - req.frequency) < 0.001)
      : null;
    const linkOwnerColor = freqLink?.owner ? getOwnerColor(freqLink.owner) : "#6b7280";
    const ownerBorder = `border-right: 4px solid ${linkOwnerColor};`;
    row.style.cssText = `border-bottom: 1px solid var(--gray-200);`;

    let locationText = t("planMission.anyLocation");
    if (req.siteName) {
      locationText = req.siteName;
    } else if (req.sectorName) {
      locationText = `${req.sectorName}`;
    }

    const textStyle = isAllocated
      ? "color: #059669; font-weight: 600;"
      : isStandby
        ? "color: #ea580c; font-weight: bold;"
        : "color: var(--gray-800);";
    const locStyle = isAllocated
      ? "color: #059669; font-weight: 600;"
      : isStandby
        ? "color: #ea580c; font-weight: bold;"
        : "color: var(--gray-500);";
    const freqStyle = isAllocated
      ? "color: #059669; font-weight: 600; direction: ltr;"
      : isStandby
        ? "color: #ea580c; font-weight: bold; direction: ltr;"
        : "color: var(--gray-800); font-weight: 500; direction: ltr;";

    row.innerHTML = `
      <td style="padding: 12px 16px; ${textStyle}${ownerBorder}">${req.frequencyBand}</td>
      <td style="padding: 12px 16px; ${locStyle}">${locationText}</td>
      <td style="padding: 12px 16px; ${freqStyle}">${req.frequency ? req.frequency + " MHz" : "-"}</td>
      <td style="padding: 12px 16px; ${textStyle}">${req.role || "-"}</td>
      <td style="padding: 12px 16px; text-align: center; white-space: nowrap;">
        <button type="button" onclick="editMissionRequirement(${originalIndex})" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 16px; padding: 0 4px; transition: color 0.2s;" onmouseover="this.style.color='#2563eb'" onmouseout="this.style.color='#94a3b8'" title="${t('planMission.req.titleEdit')}">
          <i class="fa-regular fa-pen-to-square"></i>
        </button>
        <button type="button" onclick="removeMissionRequirement(${originalIndex})" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 16px; padding: 0 4px; transition: color 0.2s;" onmouseover="this.style.color='#dc2626'" onmouseout="this.style.color='#94a3b8'" title="${t('planMission.req.titleRemove')}">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });

  container.appendChild(table);
}

function renderExtraDevices() {
  const section = document.getElementById("extraDevicesSection");
  const container = document.getElementById("extraDevicesList");

  // Only show extra devices section when editing an existing mission
  if (!editingMissionId) {
    section.style.display = "none";
    return;
  }

  const currentMission = window.appState.plannedMissions.find(
    (m) => m.id === editingMissionId,
  );
  if (!currentMission) {
    section.style.display = "none";
    return;
  }

  // Get all extra devices (assigned to mission but don't satisfy requirements)
  const extraRadios = window.appState.radios.filter((r) =>
    isExtraDeviceForMission(r, currentMission),
  );

  if (extraRadios.length === 0) {
    container.innerHTML =
      `<p style="color: #94a3b8; font-size: 14px; text-align: center; padding: 16px;">${t("planMission.noExtra")}</p>`;
    section.style.display = "none";
    return;
  }

  // Show section and render table
  section.style.display = "block";
  container.innerHTML = "";

  const table = document.createElement("table");
  table.style.cssText = "width: 100%; font-size: 14px; text-align: right;";
  table.innerHTML = `
    <thead style="background: var(--gray-100); color: var(--gray-500); font-size: 12px; text-transform: uppercase; font-weight: 600;">
      <tr>
        <th style="padding: 12px 16px; border: none;">${t("planMission.extraCol.band")}</th>
        <th style="padding: 12px 16px; border: none;">${t("planMission.extraCol.device")}</th>
        <th style="padding: 12px 16px; border: none;">${t("planMission.extraCol.frequency")}</th>
        <th style="padding: 12px 16px; border: none;">${t("planMission.extraCol.owner")}</th>
        <th style="padding: 12px 16px; border: none;">${t("planMission.extraCol.location")}</th>
        <th style="padding: 12px 16px; border: none;">${t("planMission.extraCol.status")}</th>
      </tr>
    </thead>
    <tbody style="border: 1px solid var(--gray-200); background: var(--gray-50);"></tbody>
  `;

  const tbody = table.querySelector("tbody");

  extraRadios.forEach((radio) => {
    const row = document.createElement("tr");
    row.className = "extra-device-row";
    row.style.cssText = "border-bottom: 1px solid var(--gray-200);";

    const site = window.appState.sites.find((s) => s.id === radio.site_id);
    const sector = window.appState.sectors.find(
      (sec) => site && site.sector_id === sec.id,
    );

    let locationText = "Unknown";
    if (site && sector) {
      locationText = `${sector.name} / ${site.name}`;
    } else if (site) {
      locationText = site.name;
    }

    const statusColor = radio.status === "Usable" ? "#10b981" : "#ef4444";
    const statusStyle = `background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; display: inline-block;`;

    row.innerHTML = `
      <td style="padding: 12px 16px; color: var(--gray-800);">${radio.frequency_band || "-"}</td>
      <td style="padding: 12px 16px; color: var(--gray-700);">${radio.device_type}</td>
      <td style="padding: 12px 16px; color: var(--gray-600); direction: ltr;">${radio.frequency || "-"}</td>
      <td style="padding: 12px 16px; color: var(--gray-600);">${radio.owner || "-"}</td>
      <td style="padding: 12px 16px; color: var(--gray-600);">${locationText}</td>
      <td style="padding: 12px 16px;"><span style="${statusStyle}">${t(radio.status === "Usable" ? "status.usable" : "status.unusable")}</span></td>
    `;
    tbody.appendChild(row);
  });

  container.appendChild(table);
}

function removeMissionRequirement(index) {
  missionRequirements.splice(index, 1);
  markModalDirty("planMissionModal");
  renderRequirementsList();
  renderExtraDevices();
}

// Export for inline onclick handlers
window.openMissionModal = openMissionModal;
window.openPlanMissionModal = openPlanMissionModal;
window.addMissionRequirement = addMissionRequirement;
window.removeMissionRequirement = removeMissionRequirement;
window.editMissionRequirement = editMissionRequirement;
window.setSortOrder = setSortOrder;
window.renderRequirementsList = renderRequirementsList;
window.renderExtraDevices = renderExtraDevices;
window.toggleLocationType = toggleLocationType;
window.autoFillReqBand = autoFillReqBand;
window.showFreqLinkSuggestions = showFreqLinkSuggestions;
window.hideFreqLinkSuggestions = hideFreqLinkSuggestions;
window.selectFreqLinkSuggestion = selectFreqLinkSuggestion;
window.showRoleSuggestions = showRoleSuggestions;
window.hideRoleSuggestions = hideRoleSuggestions;
window.selectRoleSuggestion = selectRoleSuggestion;
window.checkFreqOwnerMismatch = checkFreqOwnerMismatch;
window.updatePlanMissionHeaderColor = updatePlanMissionHeaderColor;
