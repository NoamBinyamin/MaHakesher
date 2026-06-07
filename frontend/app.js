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
  initChangelog();
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

  // Admin-gated tabs (e.g. Preferences) must not be restored for a session that
  // turned out to be invalid — also corrects the inline pre-paint switch in
  // index.html, which runs before auth is known and may have guessed wrong.
  if (btn.classList.contains("view-mode-hide") && !isAdminRole()) {
    const overviewBtn = document.querySelector('.tab-button[data-tab="overview"]');
    if (overviewBtn) overviewBtn.click();
    return;
  }

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
  const radioFormInputs = document.querySelectorAll(
    "#radioForm input, #radioForm select, #radioForm textarea",
  );
  radioFormInputs.forEach((input) => {
    input.addEventListener("input", () => markModalDirty("radioModal"));
    input.addEventListener("change", () => markModalDirty("radioModal"));
  });

  const missionFormInputs = document.querySelectorAll(
    "#planMissionForm input, #planMissionForm select, #planMissionForm textarea",
  );
  missionFormInputs.forEach((input) => {
    input.addEventListener("input", () => markModalDirty("planMissionModal"));
    input.addEventListener("change", () => markModalDirty("planMissionModal"));
  });

  const sectorFormInputs = document.querySelectorAll("#sectorForm input");
  sectorFormInputs.forEach((input) => {
    input.addEventListener("input", () => markModalDirty("sectorModal"));
  });

  const siteFormInputs = document.querySelectorAll(
    "#siteForm input, #siteForm select",
  );
  siteFormInputs.forEach((input) => {
    input.addEventListener("input", () => markModalDirty("siteModal"));
    input.addEventListener("change", () => markModalDirty("siteModal"));
  });
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
