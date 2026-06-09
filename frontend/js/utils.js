// ==================== Utility Functions ====================

function escapeHTML(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showNotification(message, type = "success") {
  const notification = document.getElementById("notification");
  notification.textContent = message;
  notification.className = `notification ${type}`;

  setTimeout(() => {
    notification.classList.add("hidden");
  }, 3000);
}

function updateServerStatus(status, connected) {
  const element = document.getElementById("serverStatus");
  element.textContent = `${connected ? "🟢" : "🔴"} ${status}`;
}

function getSectorName(sectorId) {
  const sector = window.appState.sectors.find((s) => s.id === sectorId);
  return sector ? sector.name : "Unknown";
}

function getSiteName(siteId) {
  const site = window.appState.sites.find((s) => s.id === siteId);
  return site ? site.name : "Unknown";
}

function getFrequencyBandForDevice(deviceType) {
  const rt = window.appState.config.radio_types;
  if (Array.isArray(rt)) {
    const device = rt.find((d) => d.name === deviceType);
    return device ? device.band : null;
  }
  return rt[deviceType] || null;
}

function getFrequencyBandLimits(band) {
  return window.appState.config.frequency_bands[band] || null;
}

function getBandForFrequency(freq) {
  const bands = window.appState.config.frequency_bands || {};
  for (const [name, limits] of Object.entries(bands)) {
    if (freq >= limits.min && freq <= limits.max) return name;
  }
  return null;
}

function getMissionOwner(missionName) {
  if (!missionName) return null;
  const mission = window.appState.plannedMissions.find(
    (m) => m.name === missionName,
  );
  return mission ? mission.owner : null;
}

// ==================== Export / Import ====================

async function exportData() {
  try {
    const exportPayload = await apiCall("/export");
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `radio-manager-backup-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification(t("notify.exportOk"), "success");
  } catch (error) {
    showNotification(
      t("notify.exportFailed", { error: error.message }),
      "error",
    );
  }
}

async function importData(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = "";

  let payload;
  try {
    payload = JSON.parse(await file.text());
  } catch (_) {
    showNotification(t("notify.importBadFile"), "error");
    return;
  }

  if (!payload.data?.config || !payload.data?.data) {
    showNotification(t("notify.importBadFile"), "error");
    return;
  }

  _showImportConfirmModal(payload);
}

function _showImportConfirmModal(payload) {
  const existing = document.getElementById("importConfirmModal");
  if (existing) existing.remove();

  const cfg = payload.data?.config || {};
  const d   = payload.data?.data   || {};

  const cur = {
    radios:      (window.appState?.radios              || []).length,
    links:       (window.appState?.links               || []).length,
    missions:    (window.appState?.plannedMissions     || []).length,
    sectors:     (window.appState?.sectors             || []).length,
    sites:       (window.appState?.sites               || []).length,
    owners:      (window.appState?.config?.owners      || []).length,
    devices:     (window.appState?.config?.radio_types || []).length,
    annotations: (window.appState?.timelineAnnotations || []).length,
  };
  const inc = {
    radios:      (d.radios                        || []).length,
    links:       (payload.mapping?.mappings       || []).length,
    missions:    (d.planned_missions              || []).length,
    sectors:     (d.sectors                       || []).length,
    sites:       (d.sites                         || []).length,
    owners:      (cfg.owners                      || []).length,
    devices:     (cfg.radio_types                 || []).length,
    annotations: (d.timeline_annotations          || []).length,
  };

  // Client-side cross-reference validation
  const warnings = [];
  const ownerNames  = new Set((cfg.owners      || []).map(o  => o.name).filter(Boolean));
  const deviceNames = new Set((cfg.radio_types || []).map(dt => dt.name).filter(Boolean));
  for (const r of (d.radios || [])) {
    const lbl = r.name || r.id || "?";
    if (r.owner       && !ownerNames.has(r.owner))
      warnings.push(`Radio "${lbl}": unknown owner "${r.owner}"`);
    if (r.device_type && !deviceNames.has(r.device_type))
      warnings.push(`Radio "${lbl}": unknown device type "${r.device_type}"`);
  }
  for (const lnk of (d.links || [])) {
    const lbl = lnk.link_name || lnk.id || "?";
    if (lnk.owner && !ownerNames.has(lnk.owner))
      warnings.push(`Link "${lbl}": unknown owner "${lnk.owner}"`);
  }
  for (const m of (d.planned_missions || [])) {
    const lbl = m.name || m.id || "?";
    if (m.owner && !ownerNames.has(m.owner))
      warnings.push(`Mission "${lbl}": unknown owner "${m.owner}"`);
  }

  const exportedAt = payload.exported_at
    ? new Date(payload.exported_at).toLocaleString()
    : "—";

  const rowDefs = [
    ["import.modal.radios",       "fa-walkie-talkie", cur.radios,      inc.radios      ],
    ["import.modal.links",        "fa-link",          cur.links,       inc.links       ],
    ["import.modal.missions",     "fa-crosshairs",    cur.missions,    inc.missions    ],
    ["import.modal.sectors",      "fa-layer-group",   cur.sectors,     inc.sectors     ],
    ["import.modal.sites",        "fa-location-dot",  cur.sites,       inc.sites       ],
    ["import.modal.owners",       "fa-users",         cur.owners,      inc.owners      ],
    ["import.modal.devices",      "fa-microchip",     cur.devices,     inc.devices     ],
    ["import.modal.annotations",  "fa-note-sticky",   cur.annotations, inc.annotations ],
  ];

  const tableRows = rowDefs.map(([key, icon, c, i]) => {
    const diff = i - c;
    const diffCell = diff === 0
      ? `<span style="color:var(--gray-400)">—</span>`
      : `<span style="color:${diff > 0 ? "var(--success-color)" : "var(--danger-color)"};font-weight:600;">${diff > 0 ? "+" : ""}${diff}</span>`;
    return `<tr style="border-bottom:1px solid var(--gray-100);">
      <td style="padding:0.4rem 0.75rem;color:var(--gray-700);">
        <i class="fa-solid ${icon}" style="color:var(--gray-400);width:1rem;margin-inline-end:0.35rem;"></i>${escapeHTML(t(key))}
      </td>
      <td style="padding:0.4rem 0.75rem;text-align:center;color:var(--gray-500);">${c}</td>
      <td style="padding:0.4rem 0.75rem;text-align:center;font-weight:600;">${i}</td>
      <td style="padding:0.4rem 0.75rem;text-align:center;">${diffCell}</td>
    </tr>`;
  }).join("");

  const warningsHtml = warnings.length ? `
    <div style="margin-top:1rem;padding:0.75rem 1rem;background:rgba(217,119,6,0.12);border:1px solid var(--warning-color);border-radius:6px;">
      <p style="margin:0 0 0.4rem;font-weight:600;color:var(--warning-color);">
        <i class="fa-solid fa-triangle-exclamation"></i>
        ${warnings.length} ${escapeHTML(t("import.modal.warnings"))}
      </p>
      <ul style="margin:0;padding-inline-start:1.25rem;font-size:0.82rem;color:var(--gray-700);">
        ${warnings.map(w => `<li>${escapeHTML(w)}</li>`).join("")}
      </ul>
    </div>` : "";

  const modal = document.createElement("div");
  modal.id = "importConfirmModal";
  modal.className = "modal";
  modal.style.display = "flex";
  modal.innerHTML = `
    <div class="modal-content" style="max-width:500px;">
      <div class="modal-header">
        <h3>
          <i class="fa-solid fa-file-import" style="color:var(--primary-color);margin-inline-end:0.4rem;"></i>
          ${escapeHTML(t("import.modal.title"))}
        </h3>
        <button class="modal-close" onclick="closeImportConfirmModal()">&times;</button>
      </div>
      <div class="modal-form" style="padding:1.25rem;">
        <p style="font-size:0.83rem;color:var(--gray-500);margin:0 0 1rem;">
          <i class="fa-regular fa-clock"></i>
          ${escapeHTML(t("import.modal.exportedAt"))}: <strong>${escapeHTML(exportedAt)}</strong>
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:0.875rem;">
          <thead>
            <tr style="border-bottom:2px solid var(--gray-200);">
              <th style="padding:0.3rem 0.75rem;color:var(--gray-500);font-weight:600;"></th>
              <th style="padding:0.3rem 0.75rem;text-align:center;color:var(--gray-500);font-weight:600;">${escapeHTML(t("import.modal.current"))}</th>
              <th style="padding:0.3rem 0.75rem;text-align:center;color:var(--gray-500);font-weight:600;">${escapeHTML(t("import.modal.inFile"))}</th>
              <th style="padding:0.3rem 0.75rem;text-align:center;color:var(--gray-500);font-weight:600;">${escapeHTML(t("import.modal.diff"))}</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
        ${warningsHtml}
        <div style="margin-top:1.25rem;padding:0.75rem 1rem;background:rgba(220,38,38,0.1);border:1.5px solid var(--danger-color);border-radius:6px;">
          <p style="margin:0 0 0.25rem;font-weight:600;color:var(--danger-color);">
            <i class="fa-solid fa-circle-exclamation"></i>
            ${escapeHTML(t("import.modal.warning"))}
          </p>
          <p style="margin:0;font-size:0.82rem;color:var(--gray-600);">
            ${escapeHTML(t("import.modal.warningDetail"))}
          </p>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeImportConfirmModal()">
          ${escapeHTML(t("btn.cancel"))}
        </button>
        <button class="btn btn-danger" onclick="_doImport()">
          <i class="fa-solid fa-file-import"></i>
          ${escapeHTML(t("import.modal.confirm"))}
        </button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener("click", e => { if (e.target === modal) closeImportConfirmModal(); });
  disableBodyScroll();
  window._pendingImportPayload = payload;
}

function closeImportConfirmModal() {
  const modal = document.getElementById("importConfirmModal");
  if (modal) modal.remove();
  enableBodyScroll();
  window._pendingImportPayload = null;
}

async function _doImport() {
  const payload = window._pendingImportPayload;
  if (!payload) return;
  closeImportConfirmModal();
  try {
    const res = await apiCall("/import", "POST", payload);
    const warnCount = res?.warnings?.length || 0;
    showNotification(
      t("notify.importOk") + (warnCount ? ` — ${warnCount} ${t("import.modal.warnings")}` : ""),
      warnCount ? "warning" : "success",
    );
    await loadConfiguration();
    await loadAllData();
    await loadLinks();
    populateSelects();
    renderOverview();
    renderMissionsTab();
    renderLinksTab();
    renderSummaryTab();
    if (typeof renderPreferencesTab === "function") renderPreferencesTab();
  } catch (error) {
    showNotification(t("notify.importFailed", { error: error.message }), "error");
  }
}

async function rollbackImport() {
  if (!confirm(t("import.rollback.confirm"))) return;
  try {
    await apiCall("/rollback_import", "POST", {});
    showNotification(t("import.rollback.ok"), "success");
    await loadConfiguration();
    await loadAllData();
    await loadLinks();
    populateSelects();
    renderOverview();
    renderMissionsTab();
    renderLinksTab();
    renderSummaryTab();
    if (typeof renderPreferencesTab === "function") renderPreferencesTab();
  } catch (error) {
    showNotification(t("import.rollback.failed"), "error");
  }
}

window.exportData = exportData;
window.importData = importData;
window._showImportConfirmModal = _showImportConfirmModal;
window.closeImportConfirmModal = closeImportConfirmModal;
window._doImport = _doImport;
window.rollbackImport = rollbackImport;
window.getMissionOwner = getMissionOwner;
window.getBandForFrequency = getBandForFrequency;

// ==================== Modal Scroll Locking ====================

let scrollLockCount = 0;

function disableBodyScroll() {
  scrollLockCount++;
  if (scrollLockCount === 1) {
    document.body.style.overflow = "hidden";
  }
}

function enableBodyScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) {
    document.body.style.overflow = "auto";
  }
}

window.disableBodyScroll = disableBodyScroll;
window.enableBodyScroll = enableBodyScroll;

function openModal(modalId, checkSaveBtn = true) {
  const el = document.getElementById(modalId);
  if (!el) return;
  el.classList.remove("hidden");
  watchModalSaveBtn(modalId);
  if (checkSaveBtn) checkModalSaveBtn(modalId);
  disableBodyScroll();
}

function closeModal(modalId, checkDirty = true) {
  if (checkDirty) {
    if (!window.confirmCloseModal(modalId)) return;
    window.markModalClean(modalId);
  }
  document.getElementById(modalId).classList.add("hidden");
  enableBodyScroll();
}

window.openModal = openModal;
window.closeModal = closeModal;

// ==================== Color Utilities ====================

// Returns a dark or light text color that contrasts well against a hex background.
// Used wherever owner-colored badges or cards need readable text.
function contrastColor(hex) {
  if (!hex || !hex.startsWith("#")) return "white";
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#1e293b" : "white";
}

window.contrastColor = contrastColor;

// ==================== Frequency Formatting ====================

function formatFrequency(freq, bandName) {
  if (freq === null || freq === undefined || freq === "" || freq === "-")
    return "-";
  const num = Number(freq);
  if (isNaN(num)) return String(freq);
  const band = (window.appState?.config?.frequency_bands || {})[bandName];
  const decimals =
    band && typeof band.decimals === "number" ? band.decimals : 3;
  return num.toFixed(decimals);
}

window.formatFrequency = formatFrequency;

// ==================== Hebrew Keyboard Layout Fix ====================

const _HE_KEYBOARD_MAP = {
  a:'ש',b:'נ',c:'ב',d:'ג',e:'ק',f:'כ',g:'ע',h:'י',i:'ן',j:'ח',
  k:'ל',l:'ך',m:'צ',n:'מ',o:'ם',p:'פ',q:'/',r:'ר',s:'ד',t:'א',
  u:'ו',v:'ה',w:"'",x:'ס',y:'ט',z:'ז',',':'ת','.':'ץ',';':'ף'
};

function latinToHebrew(str) {
  return str.toLowerCase().split('').map(c => _HE_KEYBOARD_MAP[c] ?? c).join('');
}

function isLatinOnly(str) {
  return str.length > 1 && /^[a-zA-Z,.; ]+$/.test(str.trim());
}

function showKeyboardSuggestion(inputId, suggestionId, applyCallback) {
  const input = document.getElementById(inputId);
  const box   = document.getElementById(suggestionId);
  if (!input || !box) return;

  const val = input.value;
  if (!isLatinOnly(val)) { box.style.display = 'none'; return; }

  const converted = latinToHebrew(val);
  box.style.display = 'flex';
  box.innerHTML = `
    <span style="font-size:0.82rem;color:var(--gray-600);">${t('keyboard.suggestion')} <strong style="color:var(--gray-900);direction:rtl;">${escapeHTML(converted)}</strong></span>
    <button onclick="applyKeyboardSuggestion('${escapeHTML(inputId)}','${escapeHTML(suggestionId)}')" class="btn btn-sm btn-primary" style="padding:0.15rem 0.6rem;font-size:0.78rem;">${t('keyboard.apply')}</button>
    <button onclick="document.getElementById('${escapeHTML(suggestionId)}').style.display='none'" style="background:none;border:none;cursor:pointer;color:var(--gray-400);font-size:1rem;line-height:1;padding:0 0.2rem;">&times;</button>
  `;
  box._applyCallback = applyCallback;
}

function applyKeyboardSuggestion(inputId, suggestionId) {
  const input = document.getElementById(inputId);
  const box   = document.getElementById(suggestionId);
  if (!input) return;
  input.value = latinToHebrew(input.value);
  box.style.display = 'none';
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

window.latinToHebrew = latinToHebrew;
window.isLatinOnly = isLatinOnly;
window.showKeyboardSuggestion = showKeyboardSuggestion;
window.applyKeyboardSuggestion = applyKeyboardSuggestion;

function isFreqAlignedToStep(freq, bandName) {
  if (freq === null || freq === undefined || freq === "") return true;
  const num = Number(freq);
  if (isNaN(num)) return true;
  const band = (window.appState?.config?.frequency_bands || {})[bandName];
  const step = band && typeof band.step === "number" ? band.step : null;
  if (!step || step <= 0) return true;
  const ratio = num / step;
  return Math.abs(Math.round(ratio) - ratio) < 1e-9;
}

window.isFreqAlignedToStep = isFreqAlignedToStep;

// ==================== Undo Toast ====================

let _undoTimer = null;
let _undoToastEl = null;
let _undoPendingFn = null;

function showUndoToast(message, onUndo, duration = 5000) {
  // Dismiss any existing toast immediately
  _dismissUndoToast(false);

  _undoPendingFn = onUndo;

  const toast = document.createElement("div");
  toast.className = "undo-toast";
  toast.innerHTML = `
    <span class="undo-toast-msg">${escapeHTML(message)}</span>
    <button class="undo-toast-btn" onclick="window._triggerUndo()">${t("btn.undo")}</button>
    <button class="undo-toast-close" onclick="window._dismissUndoToast(false)">&times;</button>
    <div class="undo-toast-progress">
      <div class="undo-toast-bar" style="animation-duration:${duration}ms"></div>
    </div>
  `;
  document.body.appendChild(toast);
  _undoToastEl = toast;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add("visible"));
  });

  _undoTimer = setTimeout(() => _dismissUndoToast(false), duration);
}

function _triggerUndo() {
  if (_undoPendingFn) {
    _undoPendingFn();
    _undoPendingFn = null;
  }
  _dismissUndoToast(false);
}

function _dismissUndoToast(runUndo = false) {
  if (_undoTimer) {
    clearTimeout(_undoTimer);
    _undoTimer = null;
  }
  if (runUndo && _undoPendingFn) {
    _undoPendingFn();
    _undoPendingFn = null;
  }
  if (_undoToastEl) {
    _undoToastEl.classList.remove("visible");
    const el = _undoToastEl;
    _undoToastEl = null;
    setTimeout(() => el.remove(), 320);
  }
}

window.showUndoToast = showUndoToast;
window._triggerUndo = _triggerUndo;
window._dismissUndoToast = _dismissUndoToast;

// ==================== Save Button Utilities ====================

function checkModalSaveBtn(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  const saveBtn = modal.querySelector(".modal-footer .btn-primary");
  if (!saveBtn || saveBtn.classList.contains("btn-loading")) return;
  const required = modal.querySelectorAll("[required]");
  const allFilled = Array.from(required).every((el) => el.value.trim() !== "");
  saveBtn.disabled = !allFilled;
}

function watchModalSaveBtn(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal || modal._saveBtnWatcher) return;
  modal._saveBtnWatcher = true;
  modal.addEventListener("input",  () => checkModalSaveBtn(modalId));
  modal.addEventListener("change", () => checkModalSaveBtn(modalId));
}

async function withSaveSpinner(modalId, asyncFn) {
  const modal = document.getElementById(modalId);
  const btn = modal?.querySelector(".modal-footer .btn-primary");
  if (!btn) { await asyncFn(); return; }
  const originalHTML = btn.innerHTML;
  btn.classList.add("btn-loading");
  btn.disabled = true;
  btn.innerHTML = `<span class="btn-spinner"></span>`;
  try {
    await asyncFn();
  } finally {
    btn.classList.remove("btn-loading");
    btn.innerHTML = originalHTML;
    checkModalSaveBtn(modalId);
  }
}

window.checkModalSaveBtn = checkModalSaveBtn;
window.watchModalSaveBtn = watchModalSaveBtn;
window.withSaveSpinner = withSaveSpinner;
