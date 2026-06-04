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
  if (isUserRole()) return;
  _setEditMode(!_editModeActive);
}

function _setEditMode(active) {
  _editModeActive = active;
  document.documentElement.classList.toggle("view-mode", !active);
  _updateModeButton();

  if (!active) {
    const activeContent = document.querySelector(".tab-content.active");
    if (activeContent && activeContent.id === "preferences") {
      const overviewBtn = document.querySelector('.tab-button[data-tab="overview"]');
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
  const btn    = document.getElementById("userInfoBtn");
  const nameEl = document.getElementById("userInfoName");
  const ownerEl = document.getElementById("userInfoOwner");
  if (!btn) return;

  if (isAuthenticated()) {
    if (nameEl)
      nameEl.textContent = t("login.loggedInAs").replace("{name}", _loggedInUser.username);
    btn.title = t("login.logoutTooltip");
    btn.style.display = "flex";

    if (ownerEl) {
      const owner = _loggedInUser.owner;
      if (isUserRole() && owner) {
        if (!window.appState?.config) {
          // Config not loaded yet — keep badge hidden to avoid a color flash on first render
          ownerEl.style.display = "none";
        } else {
          const ownerEntry = (window.appState.config.owners || []).find((o) => o.name === owner);
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
        }
      } else if (isAdminRole()) {
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

// ── Login modal ──────────────────────────────────────────────────────────────

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

  localStorage.setItem("mahakesher-token", result.token);
  _loggedInUser = { username: result.username, role: result.role, owner: result.owner || null };
  closeLoginModal();
  _applyRoleClasses();
  _updateModeButton();
  _updateUserButton();
  try {
    const me = await apiMe();
    _loggedInUser = me;
    _applyRoleClasses();
    _updateUserButton();
  } catch (_) {}

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
    _editModeActive = false;
    document.documentElement.classList.add("view-mode");
    document.documentElement.classList.add("user-role");
  } else if (role === "admin") {
    _editModeActive = true;
    document.documentElement.classList.remove("view-mode");
    document.documentElement.classList.remove("user-role");
  }
}

function guardViewMode() {
  if (isViewMode() && !isUserRole()) {
    showNotification(t("notify.viewModeBlock"), "warning");
    return true;
  }
  return false;
}

function guardAdminOnly() {
  if (!isAdminRole()) {
    showNotification(t("notify.adminOnly"), "warning");
    return true;
  }
  return false;
}

window._handleSessionExpired = function () {
  if (!_loggedInUser) return;
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
window.applyStoredMode = applyStoredMode;
window.restoreSession = restoreSession;
window._updateUserButton = _updateUserButton;
