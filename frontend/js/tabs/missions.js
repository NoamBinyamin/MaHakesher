// ==================== Missions Tab ====================

// Animations play on first load and after a data refresh — not on every re-render
let _missionsAnimatePending = true;

function markMissionsForAnimation() {
  _missionsAnimatePending = true;
}
window.markMissionsForAnimation = markMissionsForAnimation;

function _missionProgressCell(count, total, colorVar) {
  if (total === 0) return `<td style="color:var(--gray-400)">-</td>`;
  const capped = Math.min(count, total);
  const isFull = count >= total;
  const labelColor = isFull ? colorVar : "inherit";
  let barHtml;
  // Shimmer fires after the last segment finishes: (capped-1)*45ms delay + 180ms anim ≈ +50ms buffer
  const shimmerDelay = isFull ? `${(capped - 1) * 45 + 230}ms` : "0ms";
  if (total <= 10) {
    const segs = Array.from({ length: total }, (_, i) => {
      const filled = i < capped;
      const delay = filled ? `animation-delay:${i * 45}ms` : "";
      return `<span class="prog-seg${filled ? " filled" : ""}" style="${filled ? `background:${colorVar};` : ""}${delay}"></span>`;
    }).join("");
    barHtml = `<div class="prog-segs${isFull ? " prog-full" : ""}" style="--shimmer-delay:${shimmerDelay}">${segs}</div>`;
  } else {
    const pct = Math.min(Math.round((count / total) * 100), 100);
    barHtml = `<div class="prog-track"><div class="prog-fill${isFull ? " prog-full" : ""}" style="width:${pct}%;background:${colorVar};--shimmer-delay:${shimmerDelay}"></div></div>`;
  }
  // Show actual count in label even if it exceeds total, so user knows extras exist
  return `<td><div class="mission-prog-cell"><span class="mission-prog-label" style="color:${labelColor}">${count}/${total}</span>${barHtml}</div></td>`;
}

function _buildMissionRow(mission, actions) {
  const reqCount = mission.requirements ? mission.requirements.length : 0;
  const allocatedDevices = (window.appState.radios || []).filter((r) =>
    isAllocatedToMission(r, mission),
  ).length;
  const standbyDevices = (window.appState.radios || []).filter(
    (r) => r.standby_mission === mission.name && r.status === "Usable",
  ).length;
  const extraDevices = (window.appState.radios || []).filter((r) =>
    isExtraDeviceForMission(r, mission),
  ).length;
  const isOverdue = mission.time_end && new Date(mission.time_end) < new Date();
  const overdueBadge = isOverdue
    ? `<span title="${t("missions.overdueTitle")}" style="display:inline-block;margin-inline-start:0.5rem;padding:0.1rem 0.45rem;background:var(--danger-color);color:#fff;border-radius:4px;font-size:0.72rem;font-weight:700;vertical-align:middle;">${t("missions.overdueBadge")}</span>`
    : "";
  const ownerColor = mission.owner ? getOwnerColor(mission.owner) : null;
  const borderStyle = ownerColor
    ? `border-right: 4px solid ${ownerColor};`
    : "";

  const allocatedCell = _missionProgressCell(allocatedDevices, reqCount, "var(--success-color)");
  const standbyCell = _missionProgressCell(standbyDevices, reqCount, "var(--warning-color)");
  const extraCell =
    extraDevices > 0
      ? `<td><span class="mission-extra-badge">+${extraDevices}</span></td>`
      : `<td style="color:var(--gray-400)">-</td>`;

  const row = document.createElement("tr");
  if (isOverdue) row.style.backgroundColor = "rgba(239,68,68,0.06)";
  const _mCreatedBy = mission.created_by
    ? `<div style="font-size:0.72rem;color:var(--gray-400);margin-top:2px;"><i class="fa-solid fa-user" style="font-size:0.65rem;margin-left:0.25rem;"></i>${escapeHTML(t("planMission.createdBy"))} ${escapeHTML(mission.created_by)}</div>`
    : "";
  row.innerHTML = `
    <td style="${borderStyle} padding-right: 0.5rem;"><strong>${escapeHTML(mission.name)}</strong>${overdueBadge}${_mCreatedBy}</td>
    <td style="padding-right: 0.5rem;">${escapeHTML(mission.owner) || "-"}</td>
    <td>${t("common.deviceCount", { count: reqCount })}</td>
    ${allocatedCell}
    ${standbyCell}
    ${extraCell}
    <td class="missions-actions-cell"><div>${actions}</div></td>
  `;
  return row;
}

function _appendMissionSection(
  container,
  titleKey,
  missions,
  buildActions,
  emptyKey,
  extraStyle = "",
  subtitleKey = "",
  showHelp = false,
) {
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
  if (showHelp) {
    const helpBtn = document.createElement("button");
    helpBtn.className = "missions-help-btn admin-only";
    helpBtn.title = t("missions.help.tooltip");
    helpBtn.innerHTML = `<i class="fa-solid fa-circle-question"></i>`;
    helpBtn.onclick = openMissionAllocHelp;
    row.appendChild(helpBtn);
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
  missions.forEach((m) =>
    tbody.appendChild(_buildMissionRow(m, buildActions(m))),
  );
  container.appendChild(table);
}

function renderMissionsTab() {
  const container = document.getElementById("missionsContent");
  container.innerHTML = "";

  // Suppress progress-bar animations when data hasn't changed.
  if (_missionsAnimatePending) {
    container.classList.remove("missions-no-anim");
    _missionsAnimatePending = false;
    // Row glow is the longest: delay (~640ms) + duration (1600ms) = ~2250ms
    setTimeout(() => {
      const el = document.getElementById("missionsContent");
      if (el) el.classList.add("missions-no-anim");
    }, 2500);
  } else {
    container.classList.add("missions-no-anim");
  }

  const planned = (window.appState.plannedMissions || []).filter(
    (m) => m.status === "planned",
  );
  const active = (window.appState.plannedMissions || []).filter(
    (m) => m.status === "active",
  );
  const archived = window.appState.archivedMissions || [];

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
      const reqCount = m.requirements ? m.requirements.length : 0;
      const ownerColor = m.owner ? getOwnerColor(m.owner) : null;
      const borderStyle = ownerColor ? `border-right:4px solid ${ownerColor};` : "";
      const row = document.createElement("tr");
      const isOwnMission = isAdminRole() || m.owner === getCurrentUserOwner();
      const plannedActions = isAdminRole()
        ? `<button class="mission-btn btn-primary" data-tooltip="${escapeHTML(t("missions.btn.editMission"))}" onclick="editMission('${m.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
           <button class="mission-btn" style="background:var(--success-color);" data-tooltip="${escapeHTML(t("missions.btn.finishPlanning"))}" onclick="finishMissionPlanning('${m.id}')"><i class="fa-solid fa-check"></i></button>
           <button class="mission-btn btn-secondary" data-tooltip="${escapeHTML(t("missions.btn.archive"))}" onclick="archiveMission('${m.id}')"><i class="fa-solid fa-box-archive"></i></button>`
        : isOwnMission
          ? `<button class="mission-btn btn-primary" data-tooltip="${escapeHTML(t("missions.btn.editMission"))}" onclick="editMission('${m.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
             <button class="mission-btn btn-secondary" data-tooltip="${escapeHTML(t("missions.btn.archive"))}" onclick="archiveMission('${m.id}')"><i class="fa-solid fa-box-archive"></i></button>`
          : `<button class="mission-btn" style="background:var(--info-color);" data-tooltip="${escapeHTML(t("missions.btn.viewMission"))}" onclick="editMission('${m.id}', true)"><i class="fa-solid fa-eye"></i></button>`;
      const createdByLabel = m.created_by
        ? `<div style="font-size:0.72rem;color:var(--gray-400);margin-top:2px;"><i class="fa-solid fa-user" style="font-size:0.65rem;margin-left:0.25rem;"></i>${escapeHTML(t("planMission.createdBy"))} ${escapeHTML(m.created_by)}</div>`
        : "";
      row.innerHTML = `
        <td style="${borderStyle}padding-right:0.5rem;"><strong>${escapeHTML(m.name)}</strong>${createdByLabel}</td>
        <td>${escapeHTML(m.owner) || "-"}</td>
        <td>${t("common.deviceCount", { count: reqCount })}</td>
        <td class="missions-actions-cell">${plannedActions}</td>`;
      plannedTbody.appendChild(row);
    });
    container.appendChild(plannedTable);
  }

  // ----- Active Missions -----
  _appendMissionSection(
    container,
    "missions.activeMissions",
    active,
    (m) => `
    ${isUserRole() ? `
    <button class="mission-btn" style="background:var(--info-color);" data-tooltip="${escapeHTML(t("missions.btn.viewMission"))}" onclick="editMission('${m.id}', true)"><i class="fa-solid fa-eye"></i></button>
    ` : `
    <button class="mission-btn btn-primary" data-tooltip="${escapeHTML(t("missions.btn.editMission"))}" onclick="editMission('${m.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
    <button class="mission-btn" style="background:var(--success-color);" data-tooltip="${escapeHTML(t("missions.btn.allocate"))}" onclick="allocateMission('${m.id}')"><i class="fa-solid fa-bolt"></i></button>
    <div class="standby-dropdown">
      <button class="mission-btn" style="background:#0ea5e9;" data-tooltip="${escapeHTML(t("missions.btn.standbyGroup"))}" onclick="_toggleStandbyMenu('${m.id}', event)">
        <i class="fa-solid fa-hourglass" style="font-size:0.8rem;"></i><i class="fa-solid fa-chevron-down" style="font-size:0.5rem;margin-right:2px;"></i>
      </button>
      <div id="standby-menu-${m.id}" class="standby-dropdown-menu">
        <button onclick="_closeStandbyMenu();allocateToStandby('${m.id}')"><i class="fa-solid fa-hourglass-half" style="color:#0ea5e9;"></i>${escapeHTML(t("missions.btn.allocateToStandby"))}</button>
        <button onclick="_closeStandbyMenu();activateStandbyBtn('${m.id}')"><i class="fa-solid fa-circle-play" style="color:var(--gray-500);"></i>${escapeHTML(t("missions.btn.activateStandby"))}</button>
        <button onclick="_closeStandbyMenu();demoteToStandby('${m.id}')"><i class="fa-solid fa-hourglass-start" style="color:#7c3aed;"></i>${escapeHTML(t("missions.btn.demoteToStandby"))}</button>
      </div>
    </div>
    <button class="mission-btn btn-warning" data-tooltip="${escapeHTML(t("missions.btn.returnToPlanning"))}" onclick="returnToPlanning('${m.id}')"><i class="fa-solid fa-rotate-left"></i></button>
    <button class="mission-btn btn-danger" data-tooltip="${escapeHTML(t("missions.btn.finishAndArchive"))}" onclick="endMission('${m.id}')"><i class="fa-solid fa-flag-checkered"></i></button>
    `}
  `,
    "missions.noActive",
    "margin-top:1.5rem",
    "missions.sub.active",
    true,
  );

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
      const ownerColor = mission.owner ? getOwnerColor(mission.owner) : null;
      const borderStyle = ownerColor ? `border-right:4px solid ${ownerColor};` : "";
      const row = document.createElement("tr");
      const _archCreatedBy = mission.created_by
        ? `<div style="font-size:0.72rem;color:var(--gray-400);margin-top:2px;"><i class="fa-solid fa-user" style="font-size:0.65rem;margin-left:0.25rem;"></i>${escapeHTML(t("planMission.createdBy"))} ${escapeHTML(mission.created_by)}</div>`
        : "";
      row.innerHTML = `
        <td style="${borderStyle}padding-right:0.5rem;"><strong>${escapeHTML(mission.name)}</strong>${_archCreatedBy}</td>
        <td>${escapeHTML(mission.owner) || "-"}</td>
        <td>${t("common.deviceCount", { count: reqCount })}</td>
        ${(() => {
          const canAct = isAdminRole() || mission.owner === getCurrentUserOwner();
          if (!canAct) return `<td></td>`;
          return `<td class="missions-actions-cell">
            <button class="mission-btn btn-secondary" data-tooltip="${escapeHTML(t("missions.btn.returnToPlanning"))}" onclick="restoreMission('${mission.id}')"><i class="fa-solid fa-rotate-right"></i></button>
            <button class="mission-btn btn-danger admin-only" data-tooltip="${escapeHTML(t("btn.delete"))}" onclick="deleteArchivedMission('${mission.id}')"><i class="fa-solid fa-trash"></i></button>
          </td>`;
        })()}
      `;
      tbody.appendChild(row);
    });
    container.appendChild(table);
  }
}

// ----- Edit Mission -----

let editingMissionId = null;

function editMission(missionId, readOnly = false) {
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
    timeStartEl.value = mission.time_start ? mission.time_start.slice(0, 16) : "";
  if (timeEndEl)
    timeEndEl.value = mission.time_end ? mission.time_end.slice(0, 16) : "";

  const createdAtGroup = document.getElementById("missionCreatedAtGroup");
  const createdByGroup = document.getElementById("missionCreatedByGroup");
  const createdAtInput = document.getElementById("missionCreatedAt");
  const createdByInput = document.getElementById("missionCreatedBy");
  if (mission.created_at) {
    const d = new Date(mission.created_at);
    createdAtInput.value = d.toLocaleString([], { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    if (createdByInput) createdByInput.value = mission.created_by || "—";
    createdAtGroup.style.display = "block";
    if (createdByGroup) createdByGroup.style.display = "block";
    document.getElementById("missionInfoGrid").style.gridTemplateColumns = "2fr 2fr 1fr 1fr";
  } else {
    createdAtInput.value = "";
    if (createdByInput) createdByInput.value = "";
    createdAtGroup.style.display = "none";
    if (createdByGroup) createdByGroup.style.display = "none";
    document.getElementById("missionInfoGrid").style.gridTemplateColumns = "1fr 1fr";
  }

  if (window.populateSelects) window.populateSelects();

  const toggle = document.getElementById("reqLocationToggle");
  if (toggle) {
    toggle.checked = true;
    if (window.toggleLocationType) window.toggleLocationType();
  }

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

  const modalTitle = document.querySelector("#planMissionModal h3");
  if (modalTitle) {
    modalTitle.childNodes[modalTitle.childNodes.length - 1].textContent =
      " " + t(readOnly ? "planMission.viewTitle" : "planMission.editTitle");
  }

  const modal = document.getElementById("planMissionModal");
  if (readOnly) {
    modal.classList.add("plan-mission-readonly");
  } else {
    modal.classList.remove("plan-mission-readonly");
  }

  openModal("planMissionModal");
}

function closePlanMissionModal() {
  if (!confirmCloseModal("planMissionModal")) return;
  markModalClean("planMissionModal");
  const planModal = document.getElementById("planMissionModal");
  planModal.classList.add("hidden");
  planModal.classList.remove("plan-mission-readonly");
  const ownerEl = document.getElementById("planMissionOwner");
  if (ownerEl) ownerEl.disabled = false;
  enableBodyScroll();
  missionRequirements = [];
  editingMissionId = null;

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

  if (!missionName) {
    showNotification(t("error.missionNameRequired"), "error");
    return;
  }

  if (!missionOwner) {
    showNotification(t("error.missionOwnerRequired"), "error");
    return;
  }

  if (missionRequirements.length === 0) {
    showNotification(t("error.missionNoReqs"), "error");
    return;
  }

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

  let oldMission = null;
  if (editingMissionId) {
    oldMission = window.appState.plannedMissions.find(
      (m) => m.id === editingMissionId,
    );
  }

  await withSaveSpinner("planMissionModal", async () => {
    const requirementsForApi = missionRequirements.map((req) => ({
      sectorId: req.sectorId,
      sectorName: req.sectorName,
      siteId: req.siteId,
      siteName: req.siteName,
      frequencyBand: req.frequencyBand,
      frequency: req.frequency,
      role: req.role,
    }));

    const timeStart = document.getElementById("planMissionTimeStart")?.value || null;
    const timeEnd = document.getElementById("planMissionTimeEnd")?.value || null;

    if (timeStart && timeEnd && new Date(timeEnd) <= new Date(timeStart)) {
      showNotification(t("error.missionEndBeforeStart"), "error");
      return;
    }

    const missionData = {
      name: missionName,
      owner: missionOwner,
      requirements: requirementsForApi,
      time_start: timeStart || null,
      time_end: timeEnd || null,
    };

    if (editingMissionId) {
      await apiCall(`/planned_missions/${editingMissionId}`, "POST", missionData);

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
          await apiCall(`/radios/${radio.id}`, "POST", { ...updates, _trigger: 'mission_rename' });
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
      await apiCall("/planned_missions", "POST", missionData);
      showNotification(t("notify.missionSaved"), "success");
    }

    markModalClean("planMissionModal");
    closePlanMissionModal();
    await _refreshAfterMissionAction();
    if (window.renderTimelineTab) renderTimelineTab();
  }).catch((error) => showNotification(
    t("notify.missionSaveFailed", { error: error.message }),
    "error",
  ));
}

function openMissionAllocHelp() {
  const existing = document.getElementById("missionAllocHelpModal");
  if (existing) existing.remove();

  const sections = [
    {
      icon: "fa-bolt",
      color: "var(--success-color)",
      title: t("missions.help.allocate.title"),
      steps: [
        t("missions.help.allocate.step1"),
        t("missions.help.allocate.step2"),
        t("missions.help.allocate.step3"),
        t("missions.help.allocate.step4"),
      ],
    },
    {
      icon: "fa-hourglass-half",
      color: "#0ea5e9",
      title: t("missions.help.standby.title"),
      steps: [
        t("missions.help.standby.step1"),
        t("missions.help.standby.step2"),
        t("missions.help.standby.step3"),
        t("missions.help.standby.priority"),
      ],
    },
    {
      icon: "fa-circle-play",
      color: "var(--gray-500)",
      title: t("missions.help.activate.title"),
      steps: [
        t("missions.help.activate.step1"),
        t("missions.help.activate.step2"),
        t("missions.help.activate.step3"),
        t("missions.help.activate.step4"),
      ],
    },
    {
      icon: "fa-hourglass-start",
      color: "#7c3aed",
      title: t("missions.help.demote.title"),
      steps: [
        t("missions.help.demote.step1"),
        t("missions.help.demote.step2"),
        t("missions.help.demote.step3"),
        t("missions.help.demote.step4"),
      ],
    },
  ];

  const sectionsHtml = sections
    .map(
      (s) => `
    <div class="alloc-help-section">
      <div class="alloc-help-section-title">
        <span class="alloc-help-icon" style="background:${s.color};"><i class="fa-solid ${s.icon}"></i></span>
        <strong>${escapeHTML(s.title)}</strong>
      </div>
      <ul class="alloc-help-list">
        ${s.steps.map((step) => `<li>${escapeHTML(step)}</li>`).join("")}
      </ul>
    </div>`,
    )
    .join("");

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.id = "missionAllocHelpModal";
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 850px;">
      <div class="modal-header">
        <h3>
          <i class="fa-solid fa-circle-question" style="color:var(--primary-color);margin-left:0.5rem;"></i>
          ${escapeHTML(t("missions.help.title"))}
        </h3>
        <button class="modal-close" onclick="closeMissionAllocHelp()">&times;</button>
      </div>
      <div class="modal-form" style="gap:1.25rem;">
        ${sectionsHtml}
      </div>
      <div class="modal-footer">
        <div></div>
        <div><button class="btn btn-primary" onclick="closeMissionAllocHelp()">${t("btn.ok")}</button></div>
      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeMissionAllocHelp();
  });
  disableBodyScroll();
}

function closeMissionAllocHelp() {
  const modal = document.getElementById("missionAllocHelpModal");
  if (modal) modal.remove();
  enableBodyScroll();
}

// Export for inline onclick handlers
window.renderMissionsTab = renderMissionsTab;
window.editMission = editMission;
window.closePlanMissionModal = closePlanMissionModal;
window.savePlannedMission = savePlannedMission;
window.openMissionAllocHelp = openMissionAllocHelp;
window.closeMissionAllocHelp = closeMissionAllocHelp;
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
        String(h || "").trim().toLowerCase(),
      );
      const freqIdx = header.findIndex(
        (h) => h.includes("mhz") || h.includes("freq") || h.includes("תדר"),
      );
      const sectorIdx = header.findIndex(
        (h) => h.includes("sector") || h.includes("סקטור"),
      );
      const siteIdx = header.findIndex(
        (h) => h.includes("site") || h.includes("תחנה"),
      );
      const roleIdx = header.findIndex(
        (h) => h.includes("role") || h.includes("תפקיד"),
      );

      if (freqIdx === -1) {
        showNotification(t("notify.excelNoFreqCol"), "error");
        return;
      }

      let imported = 0;
      let errors = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        // Frequency — required
        const rawFreq = row[freqIdx];
        if (rawFreq === undefined || rawFreq === null || rawFreq === "") continue;
        const frequency = parseFloat(String(rawFreq).trim());
        if (isNaN(frequency)) {
          errors.push(t("import.link.invalidFreq", { row: i + 1, name: `row ${i + 1}` }));
          continue;
        }

        // Band — always auto-detected from frequency
        const frequencyBand = getBandForFrequency(frequency) || "";
        if (!frequencyBand) {
          errors.push(t("error.noBandDetected", { row: i + 1, freq: frequency }));
          continue;
        }

        const limits = window.appState.config.frequency_bands[frequencyBand];
        if (limits && (frequency < limits.min || frequency > limits.max)) {
          errors.push(t("error.freqOutOfRangeRow", { row: i + 1, freq: frequency, band: frequencyBand, min: limits.min, max: limits.max }));
          continue;
        }
        if (!isFreqAlignedToStep(frequency, frequencyBand)) {
          errors.push(t("error.freqNotAlignedRow", { row: i + 1, freq: frequency, step: limits?.step, band: frequencyBand }));
          continue;
        }

        const sectorName = sectorIdx >= 0 ? String(row[sectorIdx] || "").trim() : "";
        const siteName   = siteIdx   >= 0 ? String(row[siteIdx]   || "").trim() : "";
        const role       = roleIdx   >= 0 ? String(row[roleIdx]   || "").trim() : "";

        // Sector / site — at least one required
        if (!sectorName && !siteName) {
          errors.push(t("import.mission.noSectorOrSite", { row: i + 1 }));
          continue;
        }

        let sectorId = null;
        let siteId = null;
        let resolvedSectorName = null;
        let resolvedSiteName = null;

        if (siteName) {
          const site = window.appState.sites.find(
            (s) => s.name.toLowerCase() === siteName.toLowerCase(),
          );
          if (!site) {
            errors.push(t("import.mission.siteNotFound", { row: i + 1, name: siteName }));
            continue;
          }
          siteId = site.id;
          resolvedSiteName = site.name;
          sectorId = site.sector_id;
          const sector = window.appState.sectors.find((s) => s.id === sectorId);
          resolvedSectorName = sector ? sector.name : null;

          // Both provided — validate site belongs to the given sector
          if (sectorName) {
            const givenSector = window.appState.sectors.find(
              (s) => s.name.toLowerCase() === sectorName.toLowerCase(),
            );
            if (!givenSector) {
              errors.push(t("import.mission.sectorNotFound", { row: i + 1, name: sectorName }));
              continue;
            }
            if (site.sector_id !== givenSector.id) {
              errors.push(t("import.mission.siteNotInSector", { row: i + 1, site: siteName, sector: sectorName }));
              continue;
            }
          }
        } else {
          const sector = window.appState.sectors.find(
            (s) => s.name.toLowerCase() === sectorName.toLowerCase(),
          );
          if (!sector) {
            errors.push(t("import.mission.sectorNotFound", { row: i + 1, name: sectorName }));
            continue;
          }
          sectorId = sector.id;
          resolvedSectorName = sector.name;
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
        showNotification(t("notify.reqsImported", { count: imported }), "success");
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
    ["Frequency (MHz)", "Sector", "Site", "Role (optional)"],
    ["FREQUENCY", "SECTOR (or Site)", "SITE (or Sector)", "ROLE"],
  ];

  const ws = XLSX.utils.aoa_to_sheet(template);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Mission Requirements");
  ws["!cols"] = [{ wch: 20 }, { wch: 22 }, { wch: 22 }, { wch: 18 }];
  XLSX.writeFile(wb, "mission_requirements_template.xlsx");
}

window.downloadMissionTemplate = downloadMissionTemplate;
window.closeExcelImportErrorsModal = closeExcelImportErrorsModal;
