// ==================== Dirty Modal Tracking ====================

// Track which modals have unsaved changes
window._dirtyModals = new Set();

function markModalDirty(modalId) {
  window._dirtyModals.add(modalId);
}

function markModalClean(modalId) {
  window._dirtyModals.delete(modalId);
}

function isModalDirty(modalId) {
  return window._dirtyModals.has(modalId);
}

function confirmCloseModal(modalId) {
  if (isModalDirty(modalId)) {
    return confirm("You have unsaved changes. Close anyway?");
  }
  return true;
}

window.markModalDirty = markModalDirty;
window.markModalClean = markModalClean;
window.isModalDirty = isModalDirty;
window.confirmCloseModal = confirmCloseModal;

// ==================== View / Edit Mode ====================

// ── Hardcoded passkey — change this value to set your own ──────────────────
const EDIT_PASSKEY = "1234";
// ──────────────────────────────────────────────────────────────────────────

// Edit mode is NOT persisted — every page load starts in View Only
let _editModeActive = false;

function isViewMode() {
  return !_editModeActive;
}

function applyStoredMode() {
  // Always start in View Only; user must enter passkey to edit
  _editModeActive = false;
  document.documentElement.classList.add("view-mode");
  _updateModeButton();
}

function toggleMode() {
  if (_editModeActive) {
    // Edit → View: no passkey needed
    _setEditMode(false);
  } else {
    // View → Edit: require passkey
    _openPasskeyModal();
  }
}

function _setEditMode(active) {
  _editModeActive = active;
  document.documentElement.classList.toggle("view-mode", !active);
  _updateModeButton();

  // When leaving edit mode, redirect away from preferences tab (edit-only)
  if (!active) {
    const activeContent = document.querySelector(".tab-content.active");
    if (activeContent && activeContent.id === "preferences") {
      const overviewBtn = document.querySelector('.tab-button[data-tab="overview"]');
      if (overviewBtn) {
        overviewBtn.click(); // triggers all re-renders via tab navigation
        return;
      }
    }
  }

  if (window.renderOverview)    renderOverview();
  if (window.renderMissionsTab) renderMissionsTab();
  if (window.renderLinksTab)    renderLinksTab();
  if (window.renderSummaryTab)  renderSummaryTab();
  if (window.renderTimelineTab) renderTimelineTab();
  if (window.performSearch)     performSearch();
}

function _updateModeButton() {
  const btn = document.getElementById("modeToggle");
  if (!btn) return;
  if (isViewMode()) {
    btn.innerHTML = `<i class="fa-solid fa-eye"></i> ${t("mode.view")}`;
    btn.title = t("mode.toggleToEdit");
    btn.style.background = "rgba(217,119,6,0.25)";
    btn.style.borderColor = "rgba(217,119,6,0.5)";
  } else {
    btn.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> ${t("mode.edit")}`;
    btn.title = t("mode.toggleToView");
    btn.style.background = "rgba(255,255,255,0.15)";
    btn.style.borderColor = "rgba(255,255,255,0.3)";
  }
}

// ── Passkey modal ──────────────────────────────────────────────────────────

function _openPasskeyModal() {
  const modal = document.getElementById("passkeyModal");
  const input = document.getElementById("passkeyInput");
  const err   = document.getElementById("passkeyError");
  if (input) input.value = "";
  if (err)   err.style.display = "none";
  if (modal) {
    modal.classList.remove("hidden");
    disableBodyScroll();
    requestAnimationFrame(() => { if (input) input.focus(); });
  }
}

function closePasskeyModal() {
  const modal = document.getElementById("passkeyModal");
  if (modal) { modal.classList.add("hidden"); enableBodyScroll(); }
}

function submitPasskey() {
  const input = document.getElementById("passkeyInput");
  const err   = document.getElementById("passkeyError");
  if (!input) return;

  if (input.value === EDIT_PASSKEY) {
    closePasskeyModal();
    _setEditMode(true);
  } else {
    input.value = "";
    if (err) err.style.display = "block";
    // Shake the input to signal wrong passkey
    input.classList.remove("passkey-shake");
    void input.offsetWidth; // reflow to restart animation
    input.classList.add("passkey-shake");
    input.focus();
  }
}

// Guard helper — call at the top of every mutating function
function guardViewMode() {
  if (isViewMode()) {
    showNotification(t("notify.viewModeBlock"), "warning");
    return true;
  }
  return false;
}

window.isViewMode        = isViewMode;
window.toggleMode        = toggleMode;
window.closePasskeyModal = closePasskeyModal;
window.submitPasskey     = submitPasskey;
window.guardViewMode     = guardViewMode;

// ==================== Initialization ====================

document.addEventListener("DOMContentLoaded", async () => {
  applyI18n();
  applyStoredDarkMode();
  applyStoredMode();   // reads localStorage + sets class + updates button label
  document.documentElement.style.opacity = '';
  await initializeApp();
  setupTabNavigation();
  setupModalCloseHandlers();
  setupDirtyTracking();
  restoreLastTab();
});

// ==================== Dark Mode ====================

function applyStoredDarkMode() {
  // Class already applied by inline head script — just sync the button label
  if (document.documentElement.classList.contains("dark")) {
    const btn = document.getElementById("darkModeToggle");
    if (btn) btn.innerHTML = t("btn.light");
  }
}

function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle("dark");
  const btn = document.getElementById("darkModeToggle");
  if (btn) btn.innerHTML = isDark ? t("btn.light") : t("btn.dark");
  localStorage.setItem("mahakesher-dark", isDark ? "1" : "0");

  // Re-render anything that applies owner colors inline
  if (window.renderOverview) renderOverview();
  if (window.renderMissionsTab) renderMissionsTab();
  if (window.renderSummaryTab) renderSummaryTab();
  if (window.renderLinksTab) renderLinksTab();
  if (window.renderTimelineTab) renderTimelineTab();
  if (window.performSearch) performSearch();
}

window.toggleDarkMode = toggleDarkMode;

async function initializeApp() {
  try {
    await loadConfiguration();
    await loadAllData();
    await loadLinks();
    populateSelects();
    renderOverview();
    renderMissionsTab();
    renderLinksTab();
    renderSummaryTab();
    renderTimelineTab();
    updateServerStatus(t("server.connected"), true);
    _startPolling();
  } catch (error) {
    console.error("Initialization error:", error);
    updateServerStatus(t("server.disconnected"), false);
  }
}

// ==================== Tab Navigation ====================

function setupTabNavigation() {
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tabName = button.getAttribute("data-tab");

      tabButtons.forEach((btn) => btn.classList.remove("active"));
      tabContents.forEach((content) => content.classList.remove("active"));

      button.classList.add("active");
      document.getElementById(tabName).classList.add("active");
      localStorage.setItem("mahakesher-tab", tabName);

      if (tabName === "history") {
        loadHistory().then(renderHistoryTab);
      }
      if (tabName === "timeline") {
        if (window.renderTimelineTab) renderTimelineTab();
      }
      if (tabName === "preferences") {
        if (window.renderPreferencesTab) renderPreferencesTab();
      }
    });
  });
}

function restoreLastTab() {
  const saved = localStorage.getItem("mahakesher-tab");
  if (!saved || saved === "preferences") {
    localStorage.setItem("mahakesher-tab", "overview");
    return; // overview is already the default active tab
  }
  const btn = document.querySelector(`.tab-button[data-tab="${saved}"]`);
  if (!btn) return;
  btn.click();
}

// ==================== Modal Close Handlers ====================

function setupModalCloseHandlers() {
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) {
      const modalId = e.target.id;
      if (!confirmCloseModal(modalId)) return;
      markModalClean(modalId);
      e.target.classList.add("hidden");
      enableBodyScroll();
    }
  });
}

// ==================== Dirty Tracking Setup ====================

function setupDirtyTracking() {
  // Track changes in radio modal form fields
  const radioFormInputs = document.querySelectorAll(
    "#radioForm input, #radioForm select, #radioForm textarea",
  );
  radioFormInputs.forEach((input) => {
    input.addEventListener("input", () => markModalDirty("radioModal"));
    input.addEventListener("change", () => markModalDirty("radioModal"));
  });

  // Track changes in mission planning modal form fields
  const missionFormInputs = document.querySelectorAll(
    "#planMissionForm input, #planMissionForm select, #planMissionForm textarea",
  );
  missionFormInputs.forEach((input) => {
    input.addEventListener("input", () => markModalDirty("planMissionModal"));
    input.addEventListener("change", () => markModalDirty("planMissionModal"));
  });

  // Track changes in sector modal
  const sectorFormInputs = document.querySelectorAll("#sectorForm input");
  sectorFormInputs.forEach((input) => {
    input.addEventListener("input", () => markModalDirty("sectorModal"));
  });

  // Track changes in site modal
  const siteFormInputs = document.querySelectorAll(
    "#siteForm input, #siteForm select",
  );
  siteFormInputs.forEach((input) => {
    input.addEventListener("input", () => markModalDirty("siteModal"));
    input.addEventListener("change", () => markModalDirty("siteModal"));
  });
}

// ==================== Live Sync Polling ====================

const POLL_INTERVAL_MS = 10000; // 10 seconds
let _lastKnownTs = 0;

function _startPolling() {
  setInterval(_pollForChanges, POLL_INTERVAL_MS);
}

async function _pollForChanges() {
  // Skip poll while the user has a modal open — avoids overwriting mid-edit state
  const openModal = document.querySelector(".modal:not(.hidden)");
  if (openModal) return;

  try {
    const { ts } = await fetch(window.API_BASE + "/version").then(r => r.json());

    if (_lastKnownTs === 0) {
      // First poll after init — just record the baseline
      _lastKnownTs = ts;
      return;
    }

    if (ts > _lastKnownTs) {
      _lastKnownTs = ts;
      await loadConfiguration();
      await loadAllData();
      await loadLinks();
      populateSelects();
      renderOverview();
      renderMissionsTab();
      renderLinksTab();
      renderSummaryTab();
      renderTimelineTab();
      if (window.performSearch) performSearch();
      if (window.renderPreferencesTab &&
          document.getElementById("preferences")?.classList.contains("active")) {
        renderPreferencesTab();
      }
    }
  } catch (_) {
    // Silent — server may be temporarily unreachable
  }
}
