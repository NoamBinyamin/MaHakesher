// ==================== API Functions ====================

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
    showNotification("Error: " + error.message, "error");
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
async function apiUpdateUserRole(username, role) {
  return apiCall(`/users/${encodeURIComponent(username)}`, "POST", { role });
}

window.apiLogin = apiLogin;
window.apiLogout = apiLogout;
window.apiMe = apiMe;
window.apiGetUsers = apiGetUsers;
window.apiUpdateUserRole = apiUpdateUserRole;

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
