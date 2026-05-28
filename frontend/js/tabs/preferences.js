// ==================== Preferences Tab ====================

function _getAvailableBands() {
  return Object.keys(
    (window.appState.config && window.appState.config.frequency_bands) || {},
  );
}

let _addingOwner = false;
let _addingDevice = false;
let _prefUsers = []; // cached user list for the users section
let _editingUsername = null; // username being role-edited

// ── main render ─────────────────────────────────────────────────────────────

async function renderPreferencesTab() {
  const container = document.getElementById("preferencesContent");
  if (!container) return;

  try {
    _prefUsers = await apiGetUsers();
  } catch (_) {
    _prefUsers = [];
  }

  // Only build the skeleton on the first render — subsequent calls just
  // refresh each section in-place to avoid wiping content mid-async-call.
  if (!document.getElementById("prefOwnersSection")) {
    container.innerHTML = `
      ${_renderLanguageSection()}
      <div style="display:flex;gap:2rem;flex-wrap:wrap;align-items:flex-start;padding:0.5rem 0">
        <div style="flex:1;min-width:300px" id="prefOwnersSection"></div>
        <div style="flex:1;min-width:300px" id="prefDevicesSection"></div>
      </div>
      <div style="margin-top:1.25rem" id="prefUsersSection"></div>`;
  }

  _renderOwnersSection();
  _renderDevicesSection();
  _renderUsersSection();
}

// ── Language section ─────────────────────────────────────────────────────────

function _renderLanguageSection() {
  const langs = window.getAvailableLangs ? window.getAvailableLangs() : [];
  const current = window.getCurrentLang ? window.getCurrentLang() : "en";
  const opts = langs
    .map(
      ({ code, label }) =>
        `<option value="${escapeHTML(code)}"${code === current ? " selected" : ""}>${escapeHTML(label)}</option>`,
    )
    .join("");
  return `
    <div class="pref-section-card" style="margin-bottom:1.25rem">
      <h3 class="pref-section-title"><i class="fa-solid fa-globe"></i> ${escapeHTML(t("pref.languageLabel"))}</h3>
      <div style="padding:0.75rem">
        <select class="pref-input" style="max-width:220px" onchange="setLang(this.value)">
          ${opts}
        </select>
      </div>
    </div>`;
}

// ── Owners section ───────────────────────────────────────────────────────────

function _renderOwnersSection() {
  const sec = document.getElementById("prefOwnersSection");
  if (!sec) return;
  const owners =
    (window.appState.config && window.appState.config.owners) || [];

  const rows = owners
    .map(
      (o) => `
      <tr class="pref-row">
        <td style="width:2.5rem;padding:0.5rem 0.75rem">
          <span style="display:inline-block;width:1.5rem;height:1.5rem;border-radius:4px;background:${escapeHTML(o.light)};border:1px solid var(--gray-300)" title="${escapeHTML(t("pref.col.light"))}: ${escapeHTML(o.light)}"></span>
        </td>
        <td style="width:2.5rem;padding:0.5rem 0">
          <span style="display:inline-block;width:1.5rem;height:1.5rem;border-radius:4px;background:${escapeHTML(o.dark)};border:1px solid var(--gray-300)" title="${escapeHTML(t("pref.col.dark"))}: ${escapeHTML(o.dark)}"></span>
        </td>
        <td style="padding:0.5rem 0.75rem;font-weight:500">${escapeHTML(o.name)}</td>
        <td style="padding:0.5rem 0.75rem;white-space:nowrap">
          <button class="btn btn-sm btn-danger" onclick="prefDeleteOwner('${escapeHTML(o.id)}','${escapeHTML(o.name)}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>`,
    )
    .join("");

  const addRow = _addingOwner
    ? _ownerAddRow()
    : `
    <tr>
      <td colspan="4" style="padding:0.5rem 0.75rem">
        <button class="btn btn-sm btn-primary view-mode-hide" onclick="prefStartAddOwner()">
          <i class="fa-solid fa-plus"></i> ${escapeHTML(t("pref.addOwner"))}
        </button>
      </td>
    </tr>`;

  sec.innerHTML = `
    <div class="pref-section-card">
      <h3 class="pref-section-title"><i class="fa-solid fa-users"></i> ${escapeHTML(t("pref.owners"))}</h3>
      <table class="pref-table">
        <thead><tr>
          <th>${escapeHTML(t("pref.col.light"))}</th>
          <th>${escapeHTML(t("pref.col.dark"))}</th>
          <th>${escapeHTML(t("pref.col.name"))}</th>
          <th>${escapeHTML(t("pref.col.actions"))}</th>
        </tr></thead>
        <tbody>${rows}${addRow}</tbody>
      </table>
    </div>`;
}

function _ownerAddRow() {
  return `
    <tr class="pref-row pref-row-editing">
      <td colspan="4" style="padding:0.75rem">
        <div style="display:flex;flex-direction:column;gap:0.5rem">
          <div style="display:flex;gap:0.75rem;align-items:center;flex-wrap:wrap">
            <div style="flex:1;min-width:160px">
              <label class="pref-label">${escapeHTML(t("pref.label.name"))}</label>
              <input id="addOwnerName" class="pref-input" type="text" placeholder="${escapeHTML(t("pref.label.name"))}" />
            </div>
            <div>
              <label class="pref-label">${escapeHTML(t("pref.label.lightColor"))}</label>
              <input id="addOwnerLight" type="color" value="#E5E7EB"
                style="width:2.5rem;height:2rem;border:none;cursor:pointer;border-radius:4px"
                oninput="prefSuggestDarkColor()" />
            </div>
            <div>
              <label class="pref-label">${escapeHTML(t("pref.label.darkColor"))} <span style="font-weight:400;opacity:0.65;font-size:0.7rem">${escapeHTML(t("pref.label.autoSuggested"))}</span></label>
              <input id="addOwnerDark" type="color" value="#334155" style="width:2.5rem;height:2rem;border:none;cursor:pointer;border-radius:4px" />
            </div>
          </div>
          <div style="display:flex;gap:0.5rem">
            <button class="btn btn-sm btn-primary" onclick="prefSaveNewOwner()">
              <i class="fa-solid fa-check"></i> ${escapeHTML(t("pref.btn.add"))}
            </button>
            <button class="btn btn-sm btn-secondary" onclick="prefCancelAddOwner()">
              <i class="fa-solid fa-xmark"></i> ${escapeHTML(t("pref.btn.cancel"))}
            </button>
          </div>
        </div>
      </td>
    </tr>`;
}

// ── Devices section ──────────────────────────────────────────────────────────

function _renderDevicesSection() {
  const sec = document.getElementById("prefDevicesSection");
  if (!sec) return;
  const devices = _getDevices();
  const bandOpts = _getAvailableBands()
    .map((b) => `<option value="${b}">${b}</option>`)
    .join("");

  const rows = devices
    .map(
      (d) => `
      <tr class="pref-row">
        <td style="padding:0.5rem 0.75rem;font-weight:500">${escapeHTML(d.name)}</td>
        <td style="padding:0.5rem 0.75rem">
          <span class="pref-band-badge" title="${escapeHTML(_bandTooltip(d.band))}">${escapeHTML(d.band)}</span>
        </td>
        <td style="padding:0.5rem 0.75rem;white-space:nowrap">
          <button class="btn btn-sm btn-danger" onclick="prefDeleteDevice('${escapeHTML(d.id)}','${escapeHTML(d.name)}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>`,
    )
    .join("");

  const addRow = _addingDevice
    ? _deviceAddRow(bandOpts)
    : `
    <tr>
      <td colspan="3" style="padding:0.5rem 0.75rem">
        <button class="btn btn-sm btn-primary view-mode-hide" onclick="prefStartAddDevice()">
          <i class="fa-solid fa-plus"></i> ${escapeHTML(t("pref.addDevice"))}
        </button>
      </td>
    </tr>`;

  sec.innerHTML = `
    <div class="pref-section-card">
      <h3 class="pref-section-title"><i class="fa-solid fa-walkie-talkie"></i> ${escapeHTML(t("pref.devices"))}</h3>
      <table class="pref-table">
        <thead><tr>
          <th>${escapeHTML(t("pref.col.name"))}</th>
          <th>${escapeHTML(t("pref.col.band"))}</th>
          <th>${escapeHTML(t("pref.col.actions"))}</th>
        </tr></thead>
        <tbody>${rows}${addRow}</tbody>
      </table>
    </div>`;
}

function _deviceAddRow(bandOpts) {
  return `
    <tr class="pref-row pref-row-editing">
      <td colspan="3" style="padding:0.75rem">
        <div style="display:flex;gap:0.75rem;align-items:flex-end;flex-wrap:wrap">
          <div style="flex:1;min-width:140px">
            <label class="pref-label">${escapeHTML(t("pref.label.name"))}</label>
            <input id="addDeviceName" class="pref-input" type="text" placeholder="${escapeHTML(t("pref.label.name"))}" />
          </div>
          <div style="min-width:120px">
            <label class="pref-label">${escapeHTML(t("pref.label.band"))}</label>
            <select id="addDeviceBand" class="pref-input">${bandOpts}</select>
          </div>
          <div style="display:flex;gap:0.5rem">
            <button class="btn btn-sm btn-primary" onclick="prefSaveNewDevice()">
              <i class="fa-solid fa-check"></i> ${escapeHTML(t("pref.btn.add"))}
            </button>
            <button class="btn btn-sm btn-secondary" onclick="prefCancelAddDevice()">
              <i class="fa-solid fa-xmark"></i> ${escapeHTML(t("pref.btn.cancel"))}
            </button>
          </div>
        </div>
      </td>
    </tr>`;
}

// ── Owner actions ────────────────────────────────────────────────────────────

function prefStartAddOwner() {
  if (guardViewMode()) return;
  _addingOwner = true;
  _addingDevice = false;
  _renderOwnersSection();
  document.getElementById("addOwnerName")?.focus();
}

function prefCancelAddOwner() {
  _addingOwner = false;
  _renderOwnersSection();
}

async function prefSaveNewOwner() {
  if (guardViewMode()) return;
  const name = (document.getElementById("addOwnerName")?.value || "").trim();
  const light = document.getElementById("addOwnerLight")?.value || "#E5E7EB";
  const dark = document.getElementById("addOwnerDark")?.value || "#334155";
  if (!name) {
    showNotification(t("pref.notify.nameRequired"), "error");
    return;
  }
  try {
    await createOwner({ name, light, dark });
    _addingOwner = false;
    await _reloadConfig();
    showNotification(t("pref.notify.ownerAdded"), "success");
    _fullRefresh();
  } catch (e) {
    showNotification(_translateServerError(e.message), "error");
  }
}

async function prefDeleteOwner(id, name) {
  if (guardViewMode()) return;
  if (!confirm(t("pref.confirm.deleteOwner", { name }))) return;
  try {
    await deleteOwner(id);
    await _reloadConfig();
    showNotification(t("pref.notify.ownerDeleted"), "success");
    _fullRefresh();
  } catch (e) {
    showNotification(_translateServerError(e.message), "error");
  }
}

// ── Device actions ───────────────────────────────────────────────────────────

function prefStartAddDevice() {
  if (guardViewMode()) return;
  _addingDevice = true;
  _addingOwner = false;
  _renderDevicesSection();
  document.getElementById("addDeviceName")?.focus();
}

function prefCancelAddDevice() {
  _addingDevice = false;
  _renderDevicesSection();
}

async function prefSaveNewDevice() {
  if (guardViewMode()) return;
  const name = (document.getElementById("addDeviceName")?.value || "").trim();
  const band = document.getElementById("addDeviceBand")?.value || "";
  if (!name) {
    showNotification(t("pref.notify.devNameRequired"), "error");
    return;
  }
  try {
    await createDevice({ name, band });
    _addingDevice = false;
    await _reloadConfig();
    showNotification(t("pref.notify.deviceAdded"), "success");
    _fullRefresh();
  } catch (e) {
    showNotification(_translateServerError(e.message), "error");
  }
}

async function prefDeleteDevice(id, name) {
  if (guardViewMode()) return;
  if (!confirm(t("pref.confirm.deleteDevice", { name }))) return;
  try {
    await deleteDevice(id);
    await _reloadConfig();
    showNotification(t("pref.notify.deviceDeleted"), "success");
    _fullRefresh();
  } catch (e) {
    showNotification(_translateServerError(e.message), "error");
  }
}

// ── Users section ────────────────────────────────────────────────────────────

const AVAILABLE_ROLES = ["admin", "user"];

function _ownerBadge(ownerName) {
  const isDark = document.documentElement.classList.contains("dark");
  const entry = (window.appState.config?.owners || []).find((o) => o.name === ownerName);
  let bg, text, border;
  if (entry) {
    if (isDark) {
      bg = entry.dark;
      text = contrastColor(entry.dark);
      border = "transparent";
    } else {
      // Light mode: pale background + saturated dark color for text + border = readable badge
      bg = entry.light;
      text = entry.dark;
      border = entry.dark;
    }
  } else {
    bg = isDark ? "#334155" : "#E5E7EB";
    text = isDark ? "#e2e8f0" : "#374151";
    border = "transparent";
  }
  return `<span style="display:inline-block;padding:0.15rem 0.55rem;border-radius:9999px;font-size:0.75rem;font-weight:600;background:${bg};color:${text};border:1.5px solid ${border};">${escapeHTML(ownerName || "—")}</span>`;
}

function _renderUsersSection() {
  const sec = document.getElementById("prefUsersSection");
  if (!sec) return;

  const ownerNames = (window.appState.config?.owners || []).map((o) => o.name);

  // Admins first, then users
  const sorted = [..._prefUsers].sort((a, b) => {
    if (a.role === b.role) return 0;
    return a.role === "admin" ? -1 : 1;
  });

  const rows = sorted
    .map((u) => {
      const onlineDot = u.online
        ? `<span class="online-dot-pulse" title="${escapeHTML(t("pref.online"))}"></span>`
        : `<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--gray-300);margin-left:0.6rem;vertical-align:middle;flex-shrink:0;" title="${escapeHTML(t("pref.offline"))}"></span>`;
      const lastLogin = u.last_login
        ? new Date(u.last_login).toLocaleString([], { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
        : `<span style="color:var(--gray-400)">—</span>`;

      const ownerDisplay = u.role === "admin"
        ? `<span class="pref-admin-badge">${escapeHTML(t("pref.role.admin"))}</span>`
        : _ownerBadge(u.owner);

      // Admins have no editable owner — only "user" role rows get an edit button
      if (_editingUsername === u.username && u.role === "user") {
        const ownerOpts = ownerNames.map(
          (o) => `<option value="${escapeHTML(o)}"${o === u.owner ? " selected" : ""}>${escapeHTML(o)}</option>`,
        ).join("");
        return `
        <tr class="pref-row pref-row-editing">
          <td style="padding:0.5rem 0.75rem;font-weight:500">${onlineDot}${escapeHTML(u.username)}</td>
          <td style="padding:0.5rem 0.75rem">
            <span class="pref-band-badge">${escapeHTML(t(`pref.role.${u.role}`) || u.role)}</span>
          </td>
          <td style="padding:0.5rem 0.75rem">
            <select id="editUserOwner_${escapeHTML(u.username)}" class="pref-input" style="width:auto">
              <option value="">${escapeHTML(t("pref.selectOwner"))}</option>
              ${ownerOpts}
            </select>
          </td>
          <td style="padding:0.5rem 0.75rem;color:var(--gray-500);font-size:0.85rem">${lastLogin}</td>
          <td style="padding:0.5rem 0.75rem;white-space:nowrap;">
            <div style="display:inline-flex;gap:0.3rem;">
              <button class="btn btn-sm btn-primary" onclick="prefSaveUserRole('${escapeHTML(u.username)}')">
                <i class="fa-solid fa-check"></i>
              </button>
              <button class="btn btn-sm btn-secondary" onclick="prefCancelUserEdit()">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </td>
        </tr>`;
      }
      return `
      <tr class="pref-row">
        <td style="padding:0.5rem 0.75rem;font-weight:500">${onlineDot}${escapeHTML(u.username)}</td>
        <td style="padding:0.5rem 0.75rem">
          <span class="pref-band-badge">${escapeHTML(t(`pref.role.${u.role}`) || u.role)}</span>
        </td>
        <td style="padding:0.5rem 0.75rem">${ownerDisplay}</td>
        <td style="padding:0.5rem 0.75rem;color:var(--gray-500);font-size:0.85rem">${lastLogin}</td>
        <td style="padding:0.5rem 0.75rem;white-space:nowrap;">
          <div style="display:inline-flex;gap:0.3rem;">
            ${u.role === "user" ? `<button class="btn btn-sm btn-secondary view-mode-hide" title="${escapeHTML(t("pref.col.owner"))}" onclick="prefEditUserRole('${escapeHTML(u.username)}')"><i class="fa-solid fa-pen"></i></button>` : ""}
            ${(u.role === "user" || u.username === getCurrentUsername()) ? `<button class="btn btn-sm btn-secondary view-mode-hide" title="${escapeHTML(t("pref.resetPwd.tooltip"))}" onclick="openResetPasswordModal('${escapeHTML(u.username)}')"><i class="fa-solid fa-key"></i></button>` : ""}
          </div>
        </td>
      </tr>`;
    })
    .join("");

  sec.innerHTML = `
    <div class="pref-section-card">
      <h3 class="pref-section-title">
        <i class="fa-solid fa-users-gear"></i> ${escapeHTML(t("pref.users"))}
        <button class="missions-help-btn" title="${escapeHTML(t("pref.roles.help.tooltip"))}" onclick="openRolesHelp()">
          <i class="fa-solid fa-circle-question"></i>
        </button>
      </h3>
      <table class="pref-table" style="table-layout:fixed;">
        <thead><tr>
          <th style="width:22%">${escapeHTML(t("pref.col.username"))}</th>
          <th style="width:12%">${escapeHTML(t("pref.col.role"))}</th>
          <th style="width:24%">${escapeHTML(t("pref.col.owner"))}</th>
          <th style="width:30%">${escapeHTML(t("pref.col.lastLogin"))}</th>
          <th style="width:12%">${escapeHTML(t("pref.col.actions"))}</th>
        </tr></thead>
        <tbody>${rows || `<tr><td colspan="5" style="padding:0.75rem;color:var(--gray-400);text-align:center">${escapeHTML(t("pref.noUsers"))}</td></tr>`}</tbody>
      </table>
    </div>`;
}

function prefEditUserRole(username) {
  if (guardViewMode()) return;
  _editingUsername = username;
  _renderUsersSection();
  document.getElementById(`editUserRole_${username}`)?.focus();
}

function prefCancelUserEdit() {
  _editingUsername = null;
  _renderUsersSection();
}

function prefToggleOwnerCell(username) {
  const role = document.getElementById(`editUserRole_${username}`)?.value;
  const cell = document.getElementById(`editUserOwnerCell_${username}`);
  if (!cell) return;
  const owners = (window.appState.config?.owners || []).map((o) => o.name);
  if (role === "admin") {
    cell.innerHTML = `<span class="pref-admin-badge">${escapeHTML(t("pref.role.admin"))}</span>`;
  } else {
    const ownerOpts = owners.map(
      (o) => `<option value="${escapeHTML(o)}">${escapeHTML(o)}</option>`,
    ).join("");
    cell.innerHTML = `<select id="editUserOwner_${escapeHTML(username)}" class="pref-input" style="width:auto">
      <option value="">${escapeHTML(t("pref.selectOwner"))}</option>
      ${ownerOpts}
    </select>`;
  }
}

async function prefSaveUserRole(username) {
  if (guardViewMode()) return;
  const user = _prefUsers.find((u) => u.username === username);
  if (!user) return;
  const owner = document.getElementById(`editUserOwner_${username}`)?.value || null;
  if (!owner) {
    showNotification(t("pref.ownerRequired"), "warning");
    return;
  }
  try {
    await apiUpdateUserRole(username, user.role, owner);
    _editingUsername = null;
    _prefUsers = await apiGetUsers();
    showNotification(t("pref.notify.userRoleUpdated"), "success");
    _renderUsersSection();
  } catch (e) {
    showNotification(_translateServerError(e.message), "error");
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// ---- Dark color suggestion ----

function prefSuggestDarkColor() {
  const light = document.getElementById("addOwnerLight")?.value;
  const darkPicker = document.getElementById("addOwnerDark");
  if (!light || !darkPicker) return;
  darkPicker.value = _suggestDarkColor(light);
}

function _suggestDarkColor(hex) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return "#334155";
  const { r, g, b } = _hexToRgb(hex);
  const { h, s } = _rgbToHsl(r, g, b);
  const darkS = s < 10 ? 55 : Math.min(100, s * 1.15);
  const darkL = 22;
  const { r: dr, g: dg, b: db } = _hslToHex(h, darkS, darkL);
  return _rgbToHex(dr, dg, db);
}

function _hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function _rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    default:
      h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function _hslToHex(h, s, l) {
  h /= 360;
  s /= 100;
  l /= 100;
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return {
    r: Math.round(hue(h + 1 / 3) * 255),
    g: Math.round(hue(h) * 255),
    b: Math.round(hue(h - 1 / 3) * 255),
  };
}

function _rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

// ---- Band tooltip ----

function _bandTooltip(band) {
  const limits = ((window.appState.config &&
    window.appState.config.frequency_bands) ||
    {})[band];
  if (!limits) return band;
  return `${band}: ${limits.min} – ${limits.max}`;
}

// ---- Error translation ----

function _translateServerError(msg) {
  if (!msg) return t("pref.error.generic");
  if (msg.includes("already exists")) return t("pref.error.alreadyExists");
  if (msg.includes("Name is required")) return t("pref.error.nameRequired");
  if (msg.includes("Band is required")) return t("pref.error.bandRequired");
  if (msg.includes("Cannot delete") && msg.includes("owner"))
    return t("pref.error.ownerInUse");
  if (msg.includes("Cannot delete") && msg.includes("radio"))
    return t("pref.error.deviceInUse");
  if (msg.includes("Cannot change band"))
    return t("pref.error.bandChangeLocked");
  if (msg.includes("not found")) return t("pref.error.notFound");
  if (msg.includes("Band must be one of")) return t("pref.error.invalidBand");
  return msg;
}

// ---- Data / refresh helpers ----

function _getDevices() {
  const rt =
    (window.appState.config && window.appState.config.radio_types) || [];
  return Array.isArray(rt)
    ? rt
    : Object.entries(rt).map(([name, band]) => ({ id: name, name, band }));
}

async function _reloadConfig() {
  await loadConfiguration();
  populateSelects();
}

function _fullRefresh() {
  renderPreferencesTab();
  if (window.renderOverview) renderOverview();
  if (window.renderMissionsTab) renderMissionsTab();
  if (window.renderLinksTab) renderLinksTab();
}

// ── Inline CSS ───────────────────────────────────────────────────────────────

(function injectPrefStyles() {
  if (document.getElementById("pref-styles")) return;
  const style = document.createElement("style");
  style.id = "pref-styles";
  style.textContent = `
    .pref-section-card {
      background: var(--gray-100);
      border: 2px solid var(--gray-200);
      border-radius: 8px;
      overflow: hidden;
    }
    .pref-section-title {
      margin: 0;
      padding: 0.9rem 1rem;
      font-size: 1rem;
      font-weight: 700;
      border-bottom: 2px solid var(--gray-200);
      background: var(--gray-200);
      color: var(--gray-900);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .pref-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
      background: var(--gray-100);
      color: var(--gray-900);
    }
    .pref-table thead th {
      padding: 0.5rem 0.75rem;
      text-align: right;
      font-weight: 600;
      font-size: 0.75rem;
      color: var(--gray-500);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--gray-200);
      background: var(--gray-200);
    }
    .pref-row { background: var(--gray-100); }
    .pref-row td { border-bottom: 1px solid var(--gray-200); color: var(--gray-900); }
    .pref-row:last-child td { border-bottom: none; }
    .pref-row-editing { background: var(--gray-200) !important; }
    .pref-input {
      width: 100%;
      padding: 0.35rem 0.6rem;
      border: 1px solid var(--gray-300);
      border-radius: 4px;
      font-size: 0.875rem;
      background: var(--gray-50);
      color: var(--gray-900);
      box-sizing: border-box;
    }
    .pref-input:focus { outline: 2px solid var(--primary-color); border-color: transparent; }
    .pref-label {
      display: block;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--gray-500);
      margin-bottom: 0.25rem;
    }
    .pref-band-badge {
      display: inline-block;
      padding: 0.15rem 0.55rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      background: rgba(37, 99, 235, 0.15);
      color: var(--primary-color);
      cursor: help;
    }
    .pref-admin-badge {
      display: inline-block;
      padding: 0.15rem 0.55rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      background: rgba(220, 38, 38, 0.08);
      color: #b91c1c;
      border: 1px solid rgba(220, 38, 38, 0.3);
    }
    html.dark .pref-admin-badge {
      background: rgba(220, 38, 38, 0.2);
      color: #fca5a5;
      border-color: rgba(220, 38, 38, 0.5);
    }
  `;
  document.head.appendChild(style);
})();

// ── Reset password modal ─────────────────────────────────────────────────────

function openResetPasswordModal(username) {
  const existing = document.getElementById("resetPasswordModal");
  if (existing) existing.remove();

  const subtitle = t("pref.resetPwd.subtitle").replace("{name}", username);
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.id = "resetPasswordModal";
  modal.innerHTML = `
    <div class="modal-content" style="max-width:400px;">
      <div class="modal-header">
        <div>
          <h3 style="margin:0;">
            <i class="fa-solid fa-key" style="color:var(--primary-color);margin-left:0.5rem;"></i>
            ${escapeHTML(t("pref.resetPwd.title"))}
          </h3>
          <p style="margin:0.25rem 0 0 0;font-size:0.82rem;color:var(--gray-400);font-weight:400;">${escapeHTML(subtitle)}</p>
        </div>
        <button class="modal-close" onclick="closeResetPasswordModal()">&times;</button>
      </div>
      <div class="modal-form">
        <div class="form-group">
          <label for="resetPwdNew">
            <i class="fa-solid fa-lock" style="color:var(--gray-400);margin-left:0.4rem;"></i>
            ${escapeHTML(t("pref.resetPwd.newPwd"))}
          </label>
          <input type="password" id="resetPwdNew" autocomplete="new-password"
            oninput="_updatePwdFeedback('${escapeHTML(username)}')" />
          <div id="resetPwdLengthCheck" style="margin-top:0.4rem;font-size:0.78rem;color:var(--gray-400);display:flex;align-items:center;gap:0.35rem;">
            <i class="fa-solid fa-circle" style="font-size:0.5rem;"></i>
            ${escapeHTML(t("pref.resetPwd.minLength"))}
          </div>
        </div>
        <div class="form-group">
          <label for="resetPwdConfirm">
            <i class="fa-solid fa-lock" style="color:var(--gray-400);margin-left:0.4rem;"></i>
            ${escapeHTML(t("pref.resetPwd.confirmPwd"))}
          </label>
          <input type="password" id="resetPwdConfirm" autocomplete="new-password"
            oninput="_updatePwdFeedback('${escapeHTML(username)}')"
            onkeydown="if(event.key==='Enter') submitResetPassword('${escapeHTML(username)}')" />
          <div id="resetPwdMatchCheck" style="margin-top:0.4rem;font-size:0.78rem;color:var(--gray-400);display:flex;align-items:center;gap:0.35rem;visibility:hidden;">
            <i class="fa-solid fa-circle" style="font-size:0.5rem;"></i>
            ${escapeHTML(t("pref.resetPwd.match"))}
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <div></div>
        <div>
          <button class="btn btn-secondary" onclick="closeResetPasswordModal()">${escapeHTML(t("btn.cancel"))}</button>
          <button id="resetPwdSubmitBtn" class="btn btn-primary" onclick="submitResetPassword('${escapeHTML(username)}')" disabled>
            <i class="fa-solid fa-check"></i> ${escapeHTML(t("btn.save"))}
          </button>
        </div>
      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeResetPasswordModal(); });
  disableBodyScroll();
  document.getElementById("resetPwdNew")?.focus();
}

function _updatePwdFeedback() {
  const newPwd     = document.getElementById("resetPwdNew")?.value || "";
  const confirmPwd = document.getElementById("resetPwdConfirm")?.value || "";
  const lengthOk   = newPwd.length >= 6;
  const matchOk    = newPwd.length > 0 && newPwd === confirmPwd;
  const hasConfirm = confirmPwd.length > 0;

  // Length check row
  const lengthEl = document.getElementById("resetPwdLengthCheck");
  if (lengthEl) {
    lengthEl.style.color  = newPwd.length === 0 ? "var(--gray-400)" : lengthOk ? "#10b981" : "#ef4444";
    lengthEl.querySelector("i").className = lengthOk ? "fa-solid fa-circle-check" : "fa-solid fa-circle";
  }

  // Match check row
  const matchEl = document.getElementById("resetPwdMatchCheck");
  if (matchEl) {
    if (!hasConfirm) {
      matchEl.style.visibility = "hidden";
    } else {
      matchEl.style.visibility = "visible";
      matchEl.style.color = matchOk ? "#10b981" : "#ef4444";
      matchEl.querySelector("i").className = matchOk ? "fa-solid fa-circle-check" : "fa-solid fa-circle-xmark";
      matchEl.childNodes[matchEl.childNodes.length - 1].textContent =
        " " + (matchOk ? t("pref.resetPwd.match") : t("pref.resetPwd.mismatch"));
    }
  }

  // Enable/disable save button
  const btn = document.getElementById("resetPwdSubmitBtn");
  if (btn) btn.disabled = !(lengthOk && matchOk);
}

function closeResetPasswordModal() {
  const modal = document.getElementById("resetPasswordModal");
  if (modal) modal.remove();
  enableBodyScroll();
}

async function submitResetPassword(username) {
  const newPwd     = document.getElementById("resetPwdNew")?.value || "";
  const confirmPwd = document.getElementById("resetPwdConfirm")?.value || "";
  if (newPwd.length < 6 || newPwd !== confirmPwd) return;
  try {
    await apiResetPassword(username, newPwd);
    showNotification(t("pref.resetPwd.success"), "success");
    closeResetPasswordModal();
  } catch (e) {
    showNotification(e.message || t("pref.error.generic"), "error");
  }
}

// ── Roles help modal ─────────────────────────────────────────────────────────

function openRolesHelp() {
  const existing = document.getElementById("rolesHelpModal");
  if (existing) existing.remove();

  const makeSection = (icon, color, titleKey, points) => `
    <div class="alloc-help-section">
      <div class="alloc-help-section-title">
        <span class="alloc-help-icon" style="background:${color};"><i class="fa-solid ${icon}"></i></span>
        <strong>${escapeHTML(t(titleKey))}</strong>
      </div>
      <ul class="alloc-help-list">
        ${points.map((k) => `<li>${escapeHTML(t(k))}</li>`).join("")}
      </ul>
    </div>`;

  const body =
    makeSection("fa-shield-halved", "var(--primary-color)", "pref.roles.help.admin.title", [
      "pref.roles.help.admin.p1",
      "pref.roles.help.admin.p2",
      "pref.roles.help.admin.p3",
      "pref.roles.help.admin.p4",
    ]) +
    makeSection("fa-eye", "var(--gray-500)", "pref.roles.help.user.title", [
      "pref.roles.help.user.p1",
      "pref.roles.help.user.p2",
      "pref.roles.help.user.p3",
    ]);

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.id = "rolesHelpModal";
  modal.innerHTML = `
    <div class="modal-content" style="max-width:520px;">
      <div class="modal-header">
        <h3>
          <i class="fa-solid fa-circle-question" style="color:var(--primary-color);margin-left:0.5rem;"></i>
          ${escapeHTML(t("pref.roles.help.title"))}
        </h3>
        <button class="modal-close" onclick="closeRolesHelp()">&times;</button>
      </div>
      <div class="modal-form" style="gap:1.25rem;">${body}</div>
      <div class="modal-footer">
        <div></div>
        <div><button class="btn btn-primary" onclick="closeRolesHelp()">${escapeHTML(t("btn.ok"))}</button></div>
      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeRolesHelp(); });
  disableBodyScroll();
}

function closeRolesHelp() {
  const modal = document.getElementById("rolesHelpModal");
  if (modal) modal.remove();
  enableBodyScroll();
}

// ── Exports ──────────────────────────────────────────────────────────────────

window.renderPreferencesTab = renderPreferencesTab;
window._renderUsersSection = _renderUsersSection;
window.prefEditUserRole = prefEditUserRole;
window.prefCancelUserEdit = prefCancelUserEdit;
window.prefSaveUserRole = prefSaveUserRole;
window.prefSuggestDarkColor = prefSuggestDarkColor;
window.prefStartAddOwner = prefStartAddOwner;
window.prefCancelAddOwner = prefCancelAddOwner;
window.prefSaveNewOwner = prefSaveNewOwner;
window.prefDeleteOwner = prefDeleteOwner;
window.prefStartAddDevice = prefStartAddDevice;
window.prefCancelAddDevice = prefCancelAddDevice;
window.prefSaveNewDevice = prefSaveNewDevice;
window.prefDeleteDevice = prefDeleteDevice;
window.openResetPasswordModal = openResetPasswordModal;
window.closeResetPasswordModal = closeResetPasswordModal;
window.submitResetPassword = submitResetPassword;
window._updatePwdFeedback = _updatePwdFeedback;
window.openRolesHelp = openRolesHelp;
window.closeRolesHelp = closeRolesHelp;
window.prefToggleOwnerCell = prefToggleOwnerCell;
