// ==================== API Functions ====================

const _API_ERROR_MAP = {
  "Not authenticated":                                    () => t("error.notAuthenticated"),
  "Authentication required":                              () => t("error.notAuthenticated"),
  "You can only create missions for your own owner":      () => t("error.missionOwnerOnly"),
  "You can only edit missions for your own owner":        () => t("error.missionOwnerOnly"),
  "You cannot change mission owner":                      () => t("error.missionOwnerChange"),
};

function _translateApiError(msg) {
  const fn = _API_ERROR_MAP[msg];
  return fn ? fn() : ("Error: " + msg);
}

async function apiCall(endpoint, method = "GET", data = null) {
  try {
    const headers = { "Content-Type": "application/json" };
    const token = localStorage.getItem("mahakesher-token");
    if (token) headers["X-Auth-Token"] = token;

    const options = { method, headers };
    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(window.API_BASE + endpoint, options);

    if (!response.ok) {
      // Session expired — clear local auth state and prompt re-login
      if (
        response.status === 401 &&
        endpoint !== "/login" &&
        endpoint !== "/me"
      ) {
        localStorage.removeItem("mahakesher-token");
        if (window._handleSessionExpired) window._handleSessionExpired();
      }
      let errorMsg = `API Error: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.error) errorMsg = errorData.error;
        if (errorData.details) errorMsg += ": " + errorData.details.join(", ");
      } catch (_) {}
      throw new Error(errorMsg);
    }

    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    // 401 is already handled by _handleSessionExpired — don't double-notify
    // Login errors are shown inline in the login modal
    const suppress = endpoint === "/login" || error.message === "Not authenticated";
    if (!suppress) {
      const translated = _translateApiError(error.message);
      showNotification(translated, "error");
    }
    throw error;
  }
}

async function loadConfiguration() {
  window.appState.config = await apiCall("/config");
  // Clear owner color cache when config reloads (owners might change)
  if (window.clearOwnerColorCache) {
    window.clearOwnerColorCache();
  }
}

async function loadAllData() {
  const [sectors, sites, radios, hierarchy, plannedMissions, archivedMissions] =
    await Promise.all([
      apiCall("/sectors").catch(() => []),
      apiCall("/sites").catch(() => []),
      apiCall("/radios").catch(() => []),
      apiCall("/hierarchy").catch(() => []),
      apiCall("/planned_missions").catch(() => []),
      apiCall("/archived_missions").catch(() => []),
    ]);

  window.appState.sectors = sectors || [];
  window.appState.sites = sites || [];
  window.appState.radios = radios || [];
  window.appState.hierarchy = hierarchy || [];
  window.appState.plannedMissions = plannedMissions || [];
  window.appState.archivedMissions = archivedMissions || [];
}

async function loadLinks() {
  try {
    window.appState.links = (await apiCall("/links")) || [];
  } catch (error) {
    console.warn("Links endpoint not available, using empty array");
    window.appState.links = [];
  }
}

// ==================== Auth ====================

async function apiLogin(username, password) {
  return apiCall("/login", "POST", { username, password });
}

async function apiLogout() {
  try {
    await apiCall("/logout", "POST");
  } catch (_) {}
  localStorage.removeItem("mahakesher-token");
}

async function apiMe() {
  return apiCall("/me");
}

async function apiGetUsers() {
  return apiCall("/users");
}
async function apiUpdateUserRole(username, role, owner) {
  return apiCall(`/users/${encodeURIComponent(username)}`, "POST", { role, owner: owner || null });
}
async function apiResetPassword(username, newPassword) {
  return apiCall(`/users/${encodeURIComponent(username)}/reset_password`, "POST", { new_password: newPassword });
}

window.apiLogin = apiLogin;
window.apiLogout = apiLogout;
window.apiMe = apiMe;
window.apiGetUsers = apiGetUsers;
window.apiUpdateUserRole = apiUpdateUserRole;
window.apiResetPassword = apiResetPassword;

// ==================== Config CRUD ====================

async function createOwner(data) {
  return apiCall("/config/owners", "POST", data);
}
async function updateOwner(id, data) {
  return apiCall(`/config/owners/${id}`, "POST", data);
}
async function deleteOwner(id) {
  return apiCall(`/config/owners/${id}`, "DELETE");
}

async function createDevice(data) {
  return apiCall("/config/devices", "POST", data);
}
async function updateDevice(id, data) {
  return apiCall(`/config/devices/${id}`, "POST", data);
}
async function deleteDevice(id) {
  return apiCall(`/config/devices/${id}`, "DELETE");
}

window.createOwner = createOwner;
window.updateOwner = updateOwner;
window.deleteOwner = deleteOwner;
window.createDevice = createDevice;
window.updateDevice = updateDevice;
window.deleteDevice = deleteDevice;
