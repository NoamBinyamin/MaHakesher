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

  if (!confirm(t("confirm.importData"))) {
    input.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const importPayload = JSON.parse(e.target.result);

      if (!importPayload.data) {
        showNotification(t("notify.importBadFile"), "error");
        return;
      }

      await apiCall("/import", "POST", importPayload);
      showNotification(t("notify.importOk"), "success");
      await loadConfiguration();
      await loadAllData();
      await loadLinks();
      populateSelects();
      renderOverview();
      renderMissionsTab();
      renderLinksTab();
      renderSummaryTab();
    } catch (error) {
      showNotification(
        t("notify.importFailed", { error: error.message }),
        "error",
      );
    }
  };
  reader.readAsText(file);
  input.value = "";
}

window.exportData = exportData;
window.importData = importData;
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
