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
    return confirm(t("confirm.unsavedChanges"));
  }
  return true;
}

window.markModalDirty = markModalDirty;
window.markModalClean = markModalClean;
window.isModalDirty = isModalDirty;
window.confirmCloseModal = confirmCloseModal;

// ==================== Auth & Edit Mode ====================

let _editModeActive = false;
let _loggedInUser = null; // {username, role} when authenticated

function isViewMode() {
  return !_editModeActive;
}
function isAuthenticated() {
  return _loggedInUser !== null;
}
function getCurrentUserRole() {
  return _loggedInUser ? _loggedInUser.role : null;
}
function isUserRole() {
  return getCurrentUserRole() === "user";
}
function isAdminRole() {
  return getCurrentUserRole() === "admin";
}
function getCurrentUsername() {
  return _loggedInUser ? _loggedInUser.username : null;
}
function getCurrentUserOwner() {
  return _loggedInUser ? _loggedInUser.owner : null;
}

// On page load — restore session if token is still valid
async function restoreSession() {
  const token = localStorage.getItem("mahakesher-token");
  if (!token) return;
  try {
    // Use raw fetch to avoid showing an error notification for a stale token
    const res = await fetch(window.API_BASE + "/me", {
      headers: { "X-Auth-Token": token, "Content-Type": "application/json" },
    });
    if (!res.ok) {
      localStorage.removeItem("mahakesher-token");
      return;
    }
    const me = await res.json();
    _loggedInUser = me;
    _applyRoleClasses();
    _updateModeButton();
    _updateUserButton();
  } catch (_) {
    localStorage.removeItem("mahakesher-token");
  }
}

function applyStoredMode() {
  _editModeActive = false;
  document.documentElement.classList.add("view-mode");
  _updateModeButton();
}

function toggleMode() {
  if (!isAuthenticated()) {
    openLoginModal();
    return;
  }
  if (isUserRole()) return; // user-role cannot toggle mode
  _setEditMode(!_editModeActive);
}

function _setEditMode(active) {
  _editModeActive = active;
  document.documentElement.classList.toggle("view-mode", !active);
  _updateModeButton();

  if (!active) {
    const activeContent = document.querySelector(".tab-content.active");
    if (activeContent && activeContent.id === "preferences") {
      const overviewBtn = document.querySelector(
        '.tab-button[data-tab="overview"]',
      );
      if (overviewBtn) {
        overviewBtn.click();
        return;
      }
    }
  }

  if (window.renderOverview) renderOverview();
  if (window.renderMissionsTab) renderMissionsTab();
  if (window.renderLinksTab) renderLinksTab();
  if (window.renderSummaryTab) renderSummaryTab();
  if (window.renderTimelineTab) renderTimelineTab();
  if (window.performSearch) performSearch();
}

function _updateModeButton() {
  const btn = document.getElementById("modeToggle");
  if (!btn) return;
  if (!isAuthenticated()) {
    btn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> ${t("login.btnLogin")}`;
    btn.title = t("login.btnLogin");
    btn.style.background = "rgba(217,119,6,0.25)";
    btn.style.borderColor = "rgba(217,119,6,0.5)";
  } else if (isViewMode()) {
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

function _updateUserButton() {
  const btn       = document.getElementById("userInfoBtn");
  const nameEl    = document.getElementById("userInfoName");
  const ownerEl   = document.getElementById("userInfoOwner");
  if (!btn) return;

  if (isAuthenticated()) {
    if (nameEl)
      nameEl.textContent = t("login.loggedInAs").replace("{name}", _loggedInUser.username);
    btn.title = t("login.logoutTooltip");
    btn.style.display = "flex";

    if (ownerEl) {
      const owner = _loggedInUser.owner;
      if (isUserRole() && owner) {
        // User role — owner name badge using owner's colors
        const ownerEntry = (window.appState?.config?.owners || []).find((o) => o.name === owner);
        ownerEl.textContent = owner;
        ownerEl.className = "navbar-role-badge";
        if (ownerEntry) {
          const isDark = document.documentElement.classList.contains("dark");
          if (isDark) {
            ownerEl.style.background = ownerEntry.dark;
            ownerEl.style.color      = contrastColor ? contrastColor(ownerEntry.dark) : "#fff";
            ownerEl.style.border     = "none";
          } else {
            ownerEl.style.background = ownerEntry.light;
            ownerEl.style.color      = ownerEntry.dark;
            ownerEl.style.border     = `1px solid ${ownerEntry.dark}`;
          }
        } else {
          ownerEl.style.background = "rgba(255,255,255,0.15)";
          ownerEl.style.color      = "rgba(255,255,255,0.85)";
          ownerEl.style.border     = "1px solid rgba(255,255,255,0.25)";
        }
        ownerEl.style.display = "inline-block";
      } else if (isAdminRole()) {
        // Admin role — "מנהל" red badge
        ownerEl.textContent = t("pref.role.admin");
        ownerEl.className = "navbar-role-badge navbar-badge-admin";
        ownerEl.style.cssText = "";
        ownerEl.style.display = "inline-block";
      } else {
        ownerEl.style.display = "none";
      }
    }
  } else {
    btn.style.display = "none";
    if (ownerEl) ownerEl.style.display = "none";
  }
}

async function confirmLogout() {
  if (confirm(t("login.confirmLogout"))) {
    await logout();
  }
}

// ── Login modal ────────────────────────────────────────────────────────────

function openLoginModal() {
  const modal = document.getElementById("loginModal");
  if (!modal) return;
  document.getElementById("loginUsername").value = "";
  document.getElementById("loginPassword").value = "";
  document.getElementById("loginError").style.display = "none";
  modal.classList.remove("hidden");
  disableBodyScroll();
  requestAnimationFrame(() => document.getElementById("loginUsername").focus());
}

function closeLoginModal() {
  const modal = document.getElementById("loginModal");
  if (modal) {
    modal.classList.add("hidden");
    enableBodyScroll();
  }
}

async function submitLogin() {
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;
  const errorEl = document.getElementById("loginError");
  errorEl.style.display = "none";

  if (!username || !password) {
    errorEl.textContent = t("login.fieldRequired");
    errorEl.style.display = "block";
    return;
  }

  let result;
  try {
    result = await apiLogin(username, password);
  } catch (_) {
    errorEl.textContent = t("login.invalidCredentials");
    errorEl.style.display = "block";
    document.getElementById("loginPassword").value = "";
    document.getElementById("loginPassword").focus();
    return;
  }
  // Login succeeded — apply auth state
  localStorage.setItem("mahakesher-token", result.token);
  _loggedInUser = { username: result.username, role: result.role, owner: result.owner || null };
  closeLoginModal();
  _applyRoleClasses();
  _updateModeButton();
  _updateUserButton();
  // Fetch full user info (ensures owner is populated regardless of login response version)
  try {
    const me = await apiMe();
    _loggedInUser = me;
    _applyRoleClasses();
    _updateUserButton();
  } catch (_) {}
  // Re-render permission-sensitive tabs with the correct role/owner
  if (window.renderMissionsTab) renderMissionsTab();
  if (window.renderPreferencesTab &&
    document.getElementById("preferences")?.classList.contains("active")
  ) renderPreferencesTab();
}

async function logout() {
  await apiLogout();
  _loggedInUser = null;
  document.documentElement.classList.remove("user-role");
  _setEditMode(false);
  _updateUserButton();
  showNotification(t("login.loggedOut"), "success");
}

function _applyRoleClasses() {
  const role = getCurrentUserRole();
  if (role === "user") {
    // user-role stays in view-mode for overview/links etc., only missions are editable
    _editModeActive = false;
    document.documentElement.classList.add("view-mode");
    document.documentElement.classList.add("user-role");
  } else if (role === "admin") {
    _editModeActive = true;
    document.documentElement.classList.remove("view-mode");
    document.documentElement.classList.remove("user-role");
  }
}

// Guard helper — call at the top of every mutating function
function guardViewMode() {
  // user-role is technically in view-mode but CAN edit missions
  if (isViewMode() && !isUserRole()) {
    showNotification(t("notify.viewModeBlock"), "warning");
    return true;
  }
  return false;
}

// Guard for admin-only actions (blocked for both guests and user-role)
function guardAdminOnly() {
  if (!isAdminRole()) {
    showNotification(t("notify.adminOnly"), "warning");
    return true;
  }
  return false;
}

// Called by apiCall when any request gets a 401 (server restarted, session lost)
window._handleSessionExpired = function () {
  if (!_loggedInUser) return; // already logged out
  _loggedInUser = null;
  document.documentElement.classList.remove("user-role");
  _setEditMode(false);
  _updateUserButton();
  showNotification(t("login.sessionExpired"), "warning");
  openLoginModal();
};

// ==================== Presentation Modal ====================

function openPresentationModal() {
  const modal = document.getElementById("presentationModal");
  const frame = document.getElementById("presentationFrame");
  if (!frame.src || frame.src === window.location.href) {
    frame.src = "presentation-he.html";
  }
  modal.classList.add("visible");
  disableBodyScroll();
}

function closePresentationModal() {
  document.getElementById("presentationModal").classList.remove("visible");
  enableBodyScroll();
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && document.getElementById("presentationModal")?.classList.contains("visible")) {
    closePresentationModal();
  }
});

window.openPresentationModal = openPresentationModal;
window.closePresentationModal = closePresentationModal;

window.isViewMode = isViewMode;
window.isAuthenticated = isAuthenticated;
window.getCurrentUserRole = getCurrentUserRole;
window.isUserRole = isUserRole;
window.isAdminRole = isAdminRole;
window.getCurrentUsername = getCurrentUsername;
window.getCurrentUserOwner = getCurrentUserOwner;
window.guardAdminOnly = guardAdminOnly;
window.toggleMode = toggleMode;
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.submitLogin = submitLogin;
window.logout = logout;
window.confirmLogout = confirmLogout;
window.guardViewMode = guardViewMode;

// ==================== Initialization ====================

document.addEventListener("DOMContentLoaded", async () => {
  applyI18n();
  applyStoredDarkMode();
  applyStoredMode();
  document.documentElement.style.opacity = "";
  await restoreSession(); // validates stored token with server before data loads
  await initializeApp();
  setupTabNavigation();
  setupModalCloseHandlers();
  setupDirtyTracking();
  setupKeyboardShortcuts();
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
  if (window.renderOwnerFreqsTab) renderOwnerFreqsTab();
  if (window._renderUsersSection) _renderUsersSection();
  _updateUserButton();
}

window.toggleDarkMode = toggleDarkMode;

async function initializeApp() {
  try {
    await loadConfiguration();
    await loadAllData();
    await loadLinks();
    populateSelects();
    _updateUserButton(); // owners now loaded — refresh badge colors
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
      if (tabName === "ownerfreqs") {
        if (window.renderOwnerFreqsTab) renderOwnerFreqsTab();
      }
    });
  });
}

function restoreLastTab() {
  const saved = localStorage.getItem("mahakesher-tab");
  if (!saved || saved === "overview") {
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

// ==================== Live Sync Notifications ====================

function _buildSyncMessage(entry) {
  const { action, entity_type, details = {}, changed_by } = entry;
  const by = t("sync.by").replace("{user}", changed_by || "?");
  const name = details.name || (details.after || {}).name || "";

  let msg = null;

  switch (action) {
    case "start_mission":
      msg = t("sync.missionStarted").replace("{name}", name); break;
    case "end_mission":
      msg = t("sync.missionEnded").replace("{name}", name); break;
    case "archive":
      if (entity_type === "mission") msg = t("sync.missionArchived").replace("{name}", name); break;
    case "activate":
      if (entity_type === "mission") msg = t("sync.missionActivated").replace("{name}", name); break;
    case "deactivate":
      if (entity_type === "mission") msg = t("sync.missionDeactivated").replace("{name}", name); break;
    case "batch_clear": {
      const siteName = window.getSiteName ? getSiteName(entry.entity_id) : "";
      msg = t("sync.batchClear").replace("{name}", siteName); break;
    }
    case "import":
      msg = t("sync.import"); break;
    case "create":
    case "update":
    case "delete":
      if (entity_type === "radio")                  msg = t("sync.radioUpdated");
      else if (entity_type === "mission")           msg = t("sync.missionUpdated");
      else if (entity_type === "sector" || entity_type === "site") msg = t("sync.structureUpdated");
      else if (entity_type === "owner" || entity_type === "device") msg = t("sync.configUpdated");
      break;
  }

  if (!msg) return null;
  return `${msg} — ${by}`;
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

  // Heartbeat — keeps the online indicator alive while the tab is open
  if (isAuthenticated()) {
    apiCall("/ping").catch(() => {});
  }

  try {
    const { ts, latest } = await fetch(window.API_BASE + "/version").then((r) =>
      r.json(),
    );

    if (_lastKnownTs === 0) {
      // First poll after init — just record the baseline
      _lastKnownTs = ts;
      return;
    }

    if (ts > _lastKnownTs) {
      _lastKnownTs = ts;

      // Show "updated by" notification if another user made the change
      if (latest && latest.changed_by && latest.changed_by !== getCurrentUsername()) {
        const msg = _buildSyncMessage(latest);
        if (msg) showNotification(msg, "info");
      }

      await loadConfiguration();
      await loadAllData();
      await loadLinks();
      populateSelects();
      renderOverview();
      if (window.markMissionsForAnimation) markMissionsForAnimation();
      renderMissionsTab();
      renderLinksTab();
      renderSummaryTab();
      renderTimelineTab();
      if (window.performSearch) performSearch();
      if (
        window.renderPreferencesTab &&
        document.getElementById("preferences")?.classList.contains("active")
      ) {
        renderPreferencesTab();
      }
      if (
        window.renderOwnerFreqsTab &&
        document.getElementById("ownerfreqs")?.classList.contains("active")
      ) {
        renderOwnerFreqsTab();
      }
    }
  } catch (_) {
    // Silent — server may be temporarily unreachable
  }
}

// ==================== Keyboard Shortcuts ====================

function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    const tag = document.activeElement?.tagName;
    const isTyping = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    const openModal = document.querySelector(".modal:not(.hidden)");

    // Escape — close open modal (works even while typing inside it)
    if (e.key === "Escape" && openModal) {
      const closeBtn = openModal.querySelector(".modal-close");
      if (closeBtn) closeBtn.click();
      return;
    }

    // Alt+S — save open modal (works even while typing inside it)
    if (e.altKey && e.key === "s" && openModal) {
      e.preventDefault();
      const saveBtn = openModal.querySelector(".modal-footer .btn-primary");
      if (saveBtn) saveBtn.click();
      return;
    }

    // Remaining shortcuts are suppressed while typing in a field
    if (isTyping) return;

    // Alt+E — toggle edit / view mode
    if (e.altKey && e.key === "e") {
      e.preventDefault();
      toggleMode();
      return;
    }

    // Alt+R — force data refresh without page reload
    if (e.altKey && e.key === "r") {
      e.preventDefault();
      _keyboardForceRefresh();
      return;
    }

    // Alt+1–9 — switch to the Nth visible tab
    if (e.altKey && e.key >= "1" && e.key <= "9") {
      e.preventDefault();
      const visibleTabs = Array.from(
        document.querySelectorAll(".tab-button"),
      ).filter((btn) => btn.offsetParent !== null);
      const idx = parseInt(e.key) - 1;
      if (visibleTabs[idx]) visibleTabs[idx].click();
      return;
    }
  });
}

async function _keyboardForceRefresh() {
  try {
    showNotification(t("notify.refreshing"), "info");
    await loadConfiguration();
    await loadAllData();
    await loadLinks();
    populateSelects();
    renderOverview();
    if (window.markMissionsForAnimation) markMissionsForAnimation();
    renderMissionsTab();
    renderLinksTab();
    renderSummaryTab();
    renderTimelineTab();
    if (window.performSearch) performSearch();
    if (
      window.renderOwnerFreqsTab &&
      document.getElementById("ownerfreqs")?.classList.contains("active")
    ) {
      renderOwnerFreqsTab();
    }
    showNotification(t("notify.dataRefreshed"), "success");
  } catch (_) {
    showNotification(t("notify.refreshFailed"), "error");
  }
}
