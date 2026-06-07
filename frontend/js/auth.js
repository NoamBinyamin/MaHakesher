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

let _loginLockoutInterval = null;

function _setLoginBannerError(active) {
  const banner = document.querySelector("#loginModal .login-modal-banner");
  if (banner) banner.classList.toggle("login-banner-error", active);
}

function _showLoginError(message) {
  const errorEl = document.getElementById("loginError");
  document.getElementById("loginErrorText").textContent = message;
  errorEl.classList.remove("hidden");
  _setLoginBannerError(true);
}

function _hideLoginError() {
  const errorEl = document.getElementById("loginError");
  errorEl.classList.add("hidden");
  document.getElementById("loginErrorText").textContent = "";
  _setLoginBannerError(false);
}

function _setLoginBusy(busy) {
  const btn = document.getElementById("loginSubmitBtn");
  if (!btn) return;
  if (busy) {
    if (!btn._originalHTML) btn._originalHTML = btn.innerHTML;
    btn.classList.add("btn-loading");
    btn.disabled = true;
    btn.innerHTML = `<span class="btn-spinner"></span>`;
  } else {
    btn.classList.remove("btn-loading");
    btn.disabled = false;
    if (btn._originalHTML) btn.innerHTML = btn._originalHTML;
  }
}

function _formatLockoutTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function _stopLoginLockoutCountdown() {
  if (_loginLockoutInterval) {
    clearInterval(_loginLockoutInterval);
    _loginLockoutInterval = null;
  }
  const btn = document.getElementById("loginSubmitBtn");
  if (btn) btn.disabled = false;
}

function _startLoginLockoutCountdown(seconds) {
  _stopLoginLockoutCountdown();
  let remaining = seconds;
  const btn = document.getElementById("loginSubmitBtn");
  if (btn) btn.disabled = true;
  _showLoginError(t("login.accountLocked").replace("{time}", _formatLockoutTime(remaining)));
  _loginLockoutInterval = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      _stopLoginLockoutCountdown();
      _hideLoginError();
      return;
    }
    _showLoginError(t("login.accountLocked").replace("{time}", _formatLockoutTime(remaining)));
  }, 1000);
}

function _onLoginUsernameChanged() {
  if (_loginLockoutInterval) {
    _stopLoginLockoutCountdown();
    _hideLoginError();
  }
}

// Browsers expose Caps Lock state only through keyboard/mouse event objects —
// there's no way to "poll" it directly. So we track it globally from any key
// or click anywhere on the page (capture phase, so it's seen even if the login
// modal isn't open yet) and just reflect the latest known value when the modal
// shows its hint icon.
let _capsLockOn = false;

function _trackCapsLockState(event) {
  if (typeof event.getModifierState !== "function") return;
  _capsLockOn = event.getModifierState("CapsLock");
  _syncLoginCapsIcon();
}

function _syncLoginCapsIcon() {
  const iconEl = document.getElementById("loginCapsIcon");
  if (!iconEl) return;
  iconEl.classList.toggle("hidden", !_capsLockOn);
}

document.addEventListener("keydown", _trackCapsLockState, true);
document.addEventListener("mousedown", _trackCapsLockState, true);

function toggleLoginPasswordVisibility() {
  const input = document.getElementById("loginPassword");
  const btn = document.getElementById("loginPasswordToggle");
  if (!input || !btn) return;
  const icon = btn.querySelector("i");
  const showing = input.type === "text";
  input.type = showing ? "password" : "text";
  if (icon) {
    icon.classList.toggle("fa-eye", showing);
    icon.classList.toggle("fa-eye-slash", !showing);
  }
  input.focus();
}

function openLoginModal() {
  const modal = document.getElementById("loginModal");
  if (!modal) return;
  document.getElementById("loginUsername").value = "";
  document.getElementById("loginPassword").value = "";
  document.getElementById("loginPassword").type = "password";
  const toggleIcon = document.querySelector("#loginPasswordToggle i");
  if (toggleIcon) {
    toggleIcon.classList.add("fa-eye");
    toggleIcon.classList.remove("fa-eye-slash");
  }
  const capsIcon = document.getElementById("loginCapsIcon");
  capsIcon.setAttribute("data-tooltip", t("login.capsLockOn"));
  _syncLoginCapsIcon();
  _hideLoginError();
  _setLoginBusy(false);
  _stopLoginLockoutCountdown();
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
  _stopLoginLockoutCountdown();
}

async function submitLogin() {
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;
  _hideLoginError();
  _stopLoginLockoutCountdown();

  if (!username || !password) {
    _showLoginError(t("login.fieldRequired"));
    return;
  }

  let result;
  _setLoginBusy(true);
  try {
    result = await apiLogin(username, password);
  } catch (err) {
    _setLoginBusy(false);
    if (err && err.code === "account_locked") {
      const seconds = err.retryAfter != null ? err.retryAfter : 0;
      _startLoginLockoutCountdown(seconds);
    } else if (err && err.code === "invalid_credentials" && err.data?.attempt_count != null) {
      _showLoginError(
        t("login.invalidCredentialsCount")
          .replace("{count}", err.data.attempt_count)
          .replace("{max}", err.data.max_attempts),
      );
    } else {
      _showLoginError(t("login.invalidCredentials"));
    }
    document.getElementById("loginPassword").value = "";
    document.getElementById("loginPassword").focus();
    return;
  }

  localStorage.setItem("mahakesher-token", result.token);
  _loggedInUser = { username: result.username, role: result.role, owner: result.owner || null };
  _setLoginBusy(false);
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

// Same lockdown as a session expiry, but for when the server itself becomes
// unreachable (network drop, process down) — pings never come back with a 401,
// so this is the only signal that the local "logged in" state is stale.
window._handleDisconnected = function () {
  if (!_loggedInUser) return;
  localStorage.removeItem("mahakesher-token");
  _loggedInUser = null;
  document.documentElement.classList.remove("user-role");
  _setEditMode(false);
  _updateUserButton();
  showNotification(t("login.connectionLost"), "warning");
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
window.toggleLoginPasswordVisibility = toggleLoginPasswordVisibility;
window.logout = logout;
window.confirmLogout = confirmLogout;
window.guardViewMode = guardViewMode;
window.applyStoredMode = applyStoredMode;
window.restoreSession = restoreSession;
window._updateUserButton = _updateUserButton;
