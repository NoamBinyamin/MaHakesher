// ==================== Preferences Tab ====================

function _getAvailableBands() {
  return Object.keys((window.appState.config && window.appState.config.frequency_bands) || {});
}

let _addingOwner  = false;
let _addingDevice = false;
let _prefUsers    = []; // cached user list for the users section
let _editingUsername = null; // username being role-edited

// ── main render ─────────────────────────────────────────────────────────────

async function renderPreferencesTab() {
  const container = document.getElementById('preferencesContent');
  if (!container) return;

  try { _prefUsers = await apiGetUsers(); } catch (_) { _prefUsers = []; }

  container.innerHTML = `
    ${_renderLanguageSection()}
    <div style="display:flex;gap:2rem;flex-wrap:wrap;align-items:flex-start;padding:0.5rem 0">
      <div style="flex:1;min-width:300px" id="prefOwnersSection"></div>
      <div style="flex:1;min-width:300px" id="prefDevicesSection"></div>
    </div>
    <div style="margin-top:1.25rem" id="prefUsersSection"></div>`;

  _renderOwnersSection();
  _renderDevicesSection();
  _renderUsersSection();
}

// ── Language section ─────────────────────────────────────────────────────────

function _renderLanguageSection() {
  const langs = window.getAvailableLangs ? window.getAvailableLangs() : [];
  const current = window.getCurrentLang ? window.getCurrentLang() : 'en';
  const opts = langs.map(({ code, label }) =>
    `<option value="${escapeHTML(code)}"${code === current ? ' selected' : ''}>${escapeHTML(label)}</option>`
  ).join('');
  return `
    <div class="pref-section-card" style="margin-bottom:1.25rem">
      <h3 class="pref-section-title"><i class="fa-solid fa-globe"></i> ${escapeHTML(t('pref.languageLabel'))}</h3>
      <div style="padding:0.75rem">
        <select class="pref-input" style="max-width:220px" onchange="setLang(this.value)">
          ${opts}
        </select>
      </div>
    </div>`;
}

// ── Owners section ───────────────────────────────────────────────────────────

function _renderOwnersSection() {
  const sec = document.getElementById('prefOwnersSection');
  if (!sec) return;
  const owners = (window.appState.config && window.appState.config.owners) || [];

  const rows = owners.map(o => `
      <tr class="pref-row">
        <td style="width:2.5rem;padding:0.5rem 0.75rem">
          <span style="display:inline-block;width:1.5rem;height:1.5rem;border-radius:4px;background:${escapeHTML(o.light)};border:1px solid var(--gray-300)" title="${escapeHTML(t('pref.col.light'))}: ${escapeHTML(o.light)}"></span>
        </td>
        <td style="width:2.5rem;padding:0.5rem 0">
          <span style="display:inline-block;width:1.5rem;height:1.5rem;border-radius:4px;background:${escapeHTML(o.dark)};border:1px solid var(--gray-300)" title="${escapeHTML(t('pref.col.dark'))}: ${escapeHTML(o.dark)}"></span>
        </td>
        <td style="padding:0.5rem 0.75rem;font-weight:500">${escapeHTML(o.name)}</td>
        <td style="padding:0.5rem 0.75rem;white-space:nowrap">
          <button class="btn btn-sm btn-danger" onclick="prefDeleteOwner('${escapeHTML(o.id)}','${escapeHTML(o.name)}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>`).join('');

  const addRow = _addingOwner ? _ownerAddRow() : `
    <tr>
      <td colspan="4" style="padding:0.5rem 0.75rem">
        <button class="btn btn-sm btn-primary view-mode-hide" onclick="prefStartAddOwner()">
          <i class="fa-solid fa-plus"></i> ${escapeHTML(t('pref.addOwner'))}
        </button>
      </td>
    </tr>`;

  sec.innerHTML = `
    <div class="pref-section-card">
      <h3 class="pref-section-title"><i class="fa-solid fa-users"></i> ${escapeHTML(t('pref.owners'))}</h3>
      <table class="pref-table">
        <thead><tr>
          <th>${escapeHTML(t('pref.col.light'))}</th>
          <th>${escapeHTML(t('pref.col.dark'))}</th>
          <th>${escapeHTML(t('pref.col.name'))}</th>
          <th>${escapeHTML(t('pref.col.actions'))}</th>
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
              <label class="pref-label">${escapeHTML(t('pref.label.name'))}</label>
              <input id="addOwnerName" class="pref-input" type="text" placeholder="${escapeHTML(t('pref.label.name'))}" />
            </div>
            <div>
              <label class="pref-label">${escapeHTML(t('pref.label.lightColor'))}</label>
              <input id="addOwnerLight" type="color" value="#E5E7EB"
                style="width:2.5rem;height:2rem;border:none;cursor:pointer;border-radius:4px"
                oninput="prefSuggestDarkColor()" />
            </div>
            <div>
              <label class="pref-label">${escapeHTML(t('pref.label.darkColor'))} <span style="font-weight:400;opacity:0.65;font-size:0.7rem">${escapeHTML(t('pref.label.autoSuggested'))}</span></label>
              <input id="addOwnerDark" type="color" value="#334155" style="width:2.5rem;height:2rem;border:none;cursor:pointer;border-radius:4px" />
            </div>
          </div>
          <div style="display:flex;gap:0.5rem">
            <button class="btn btn-sm btn-primary" onclick="prefSaveNewOwner()">
              <i class="fa-solid fa-check"></i> ${escapeHTML(t('pref.btn.add'))}
            </button>
            <button class="btn btn-sm btn-secondary" onclick="prefCancelAddOwner()">
              <i class="fa-solid fa-xmark"></i> ${escapeHTML(t('pref.btn.cancel'))}
            </button>
          </div>
        </div>
      </td>
    </tr>`;
}

// ── Devices section ──────────────────────────────────────────────────────────

function _renderDevicesSection() {
  const sec = document.getElementById('prefDevicesSection');
  if (!sec) return;
  const devices = _getDevices();
  const bandOpts = _getAvailableBands().map(b => `<option value="${b}">${b}</option>`).join('');

  const rows = devices.map(d => `
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
      </tr>`).join('');

  const addRow = _addingDevice ? _deviceAddRow(bandOpts) : `
    <tr>
      <td colspan="3" style="padding:0.5rem 0.75rem">
        <button class="btn btn-sm btn-primary view-mode-hide" onclick="prefStartAddDevice()">
          <i class="fa-solid fa-plus"></i> ${escapeHTML(t('pref.addDevice'))}
        </button>
      </td>
    </tr>`;

  sec.innerHTML = `
    <div class="pref-section-card">
      <h3 class="pref-section-title"><i class="fa-solid fa-walkie-talkie"></i> ${escapeHTML(t('pref.devices'))}</h3>
      <table class="pref-table">
        <thead><tr>
          <th>${escapeHTML(t('pref.col.name'))}</th>
          <th>${escapeHTML(t('pref.col.band'))}</th>
          <th>${escapeHTML(t('pref.col.actions'))}</th>
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
            <label class="pref-label">${escapeHTML(t('pref.label.name'))}</label>
            <input id="addDeviceName" class="pref-input" type="text" placeholder="${escapeHTML(t('pref.label.name'))}" />
          </div>
          <div style="min-width:120px">
            <label class="pref-label">${escapeHTML(t('pref.label.band'))}</label>
            <select id="addDeviceBand" class="pref-input">${bandOpts}</select>
          </div>
          <div style="display:flex;gap:0.5rem">
            <button class="btn btn-sm btn-primary" onclick="prefSaveNewDevice()">
              <i class="fa-solid fa-check"></i> ${escapeHTML(t('pref.btn.add'))}
            </button>
            <button class="btn btn-sm btn-secondary" onclick="prefCancelAddDevice()">
              <i class="fa-solid fa-xmark"></i> ${escapeHTML(t('pref.btn.cancel'))}
            </button>
          </div>
        </div>
      </td>
    </tr>`;
}

// ── Owner actions ────────────────────────────────────────────────────────────

function prefStartAddOwner() {
  if (guardViewMode()) return;
  _addingOwner  = true;
  _addingDevice = false;
  _renderOwnersSection();
  document.getElementById('addOwnerName')?.focus();
}

function prefCancelAddOwner() {
  _addingOwner = false;
  _renderOwnersSection();
}

async function prefSaveNewOwner() {
  if (guardViewMode()) return;
  const name  = (document.getElementById('addOwnerName')?.value || '').trim();
  const light = document.getElementById('addOwnerLight')?.value || '#E5E7EB';
  const dark  = document.getElementById('addOwnerDark')?.value  || '#334155';
  if (!name) { showNotification(t('pref.notify.nameRequired'), 'error'); return; }
  try {
    await createOwner({ name, light, dark });
    _addingOwner = false;
    await _reloadConfig();
    showNotification(t('pref.notify.ownerAdded'), 'success');
    _fullRefresh();
  } catch (e) {
    showNotification(_translateServerError(e.message), 'error');
  }
}

async function prefDeleteOwner(id, name) {
  if (guardViewMode()) return;
  if (!confirm(t('pref.confirm.deleteOwner', { name }))) return;
  try {
    await deleteOwner(id);
    await _reloadConfig();
    showNotification(t('pref.notify.ownerDeleted'), 'success');
    _fullRefresh();
  } catch (e) {
    showNotification(_translateServerError(e.message), 'error');
  }
}

// ── Device actions ───────────────────────────────────────────────────────────

function prefStartAddDevice() {
  if (guardViewMode()) return;
  _addingDevice = true;
  _addingOwner  = false;
  _renderDevicesSection();
  document.getElementById('addDeviceName')?.focus();
}

function prefCancelAddDevice() {
  _addingDevice = false;
  _renderDevicesSection();
}

async function prefSaveNewDevice() {
  if (guardViewMode()) return;
  const name = (document.getElementById('addDeviceName')?.value || '').trim();
  const band = document.getElementById('addDeviceBand')?.value || '';
  if (!name) { showNotification(t('pref.notify.devNameRequired'), 'error'); return; }
  try {
    await createDevice({ name, band });
    _addingDevice = false;
    await _reloadConfig();
    showNotification(t('pref.notify.deviceAdded'), 'success');
    _fullRefresh();
  } catch (e) {
    showNotification(_translateServerError(e.message), 'error');
  }
}

async function prefDeleteDevice(id, name) {
  if (guardViewMode()) return;
  if (!confirm(t('pref.confirm.deleteDevice', { name }))) return;
  try {
    await deleteDevice(id);
    await _reloadConfig();
    showNotification(t('pref.notify.deviceDeleted'), 'success');
    _fullRefresh();
  } catch (e) {
    showNotification(_translateServerError(e.message), 'error');
  }
}

// ── Users section ────────────────────────────────────────────────────────────

const AVAILABLE_ROLES = ['admin', 'user'];

function _renderUsersSection() {
  const sec = document.getElementById('prefUsersSection');
  if (!sec) return;

  const roleOpts = AVAILABLE_ROLES.map(r =>
    `<option value="${escapeHTML(r)}">${escapeHTML(r)}</option>`
  ).join('');

  const rows = _prefUsers.map(u => {
    if (_editingUsername === u.username) {
      const opts = AVAILABLE_ROLES.map(r =>
        `<option value="${escapeHTML(r)}"${r === u.role ? ' selected' : ''}>${escapeHTML(r)}</option>`
      ).join('');
      return `
        <tr class="pref-row pref-row-editing">
          <td style="padding:0.5rem 0.75rem;font-weight:500">${escapeHTML(u.username)}</td>
          <td style="padding:0.5rem 0.75rem">
            <select id="editUserRole_${escapeHTML(u.username)}" class="pref-input" style="width:auto">${opts}</select>
          </td>
          <td style="padding:0.5rem 0.75rem;white-space:nowrap">
            <button class="btn btn-sm btn-primary" onclick="prefSaveUserRole('${escapeHTML(u.username)}')">
              <i class="fa-solid fa-check"></i>
            </button>
            <button class="btn btn-sm btn-secondary" onclick="prefCancelUserEdit()">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </td>
        </tr>`;
    }
    return `
      <tr class="pref-row">
        <td style="padding:0.5rem 0.75rem;font-weight:500">${escapeHTML(u.username)}</td>
        <td style="padding:0.5rem 0.75rem">
          <span class="pref-band-badge">${escapeHTML(u.role)}</span>
        </td>
        <td style="padding:0.5rem 0.75rem;white-space:nowrap">
          <button class="btn btn-sm btn-secondary view-mode-hide" onclick="prefEditUserRole('${escapeHTML(u.username)}')">
            <i class="fa-solid fa-pen"></i>
          </button>
        </td>
      </tr>`;
  }).join('');

  sec.innerHTML = `
    <div class="pref-section-card">
      <h3 class="pref-section-title"><i class="fa-solid fa-users-gear"></i> ${escapeHTML(t('pref.users'))}</h3>
      <table class="pref-table">
        <thead><tr>
          <th>${escapeHTML(t('pref.col.username'))}</th>
          <th>${escapeHTML(t('pref.col.role'))}</th>
          <th>${escapeHTML(t('pref.col.actions'))}</th>
        </tr></thead>
        <tbody>${rows || `<tr><td colspan="3" style="padding:0.75rem;color:var(--gray-400);text-align:center">${escapeHTML(t('pref.noUsers'))}</td></tr>`}</tbody>
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

async function prefSaveUserRole(username) {
  if (guardViewMode()) return;
  const role = document.getElementById(`editUserRole_${username}`)?.value;
  if (!role) return;
  try {
    await apiUpdateUserRole(username, role);
    _editingUsername = null;
    _prefUsers = await apiGetUsers();
    showNotification(t('pref.notify.userRoleUpdated'), 'success');
    _renderUsersSection();
  } catch (e) {
    showNotification(_translateServerError(e.message), 'error');
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// ---- Dark color suggestion ----

function prefSuggestDarkColor() {
  const light = document.getElementById('addOwnerLight')?.value;
  const darkPicker = document.getElementById('addOwnerDark');
  if (!light || !darkPicker) return;
  darkPicker.value = _suggestDarkColor(light);
}

function _suggestDarkColor(hex) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return '#334155';
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
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    default: h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function _hslToHex(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  if (s === 0) { const v = Math.round(l * 255); return { r: v, g: v, b: v }; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  return {
    r: Math.round(hue(h + 1/3) * 255),
    g: Math.round(hue(h)       * 255),
    b: Math.round(hue(h - 1/3) * 255),
  };
}

function _rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

// ---- Band tooltip ----

function _bandTooltip(band) {
  const limits = (window.appState.config && window.appState.config.frequency_bands || {})[band];
  if (!limits) return band;
  return `${band}: ${limits.min} – ${limits.max}`;
}

// ---- Error translation ----

function _translateServerError(msg) {
  if (!msg)                                                       return t('pref.error.generic');
  if (msg.includes('already exists'))                             return t('pref.error.alreadyExists');
  if (msg.includes('Name is required'))                           return t('pref.error.nameRequired');
  if (msg.includes('Band is required'))                           return t('pref.error.bandRequired');
  if (msg.includes('Cannot delete') && msg.includes('owner'))     return t('pref.error.ownerInUse');
  if (msg.includes('Cannot delete') && msg.includes('radio'))     return t('pref.error.deviceInUse');
  if (msg.includes('Cannot change band'))                         return t('pref.error.bandChangeLocked');
  if (msg.includes('not found'))                                  return t('pref.error.notFound');
  if (msg.includes('Band must be one of'))                        return t('pref.error.invalidBand');
  return msg;
}

// ---- Data / refresh helpers ----

function _getDevices() {
  const rt = (window.appState.config && window.appState.config.radio_types) || [];
  return Array.isArray(rt) ? rt : Object.entries(rt).map(([name, band]) => ({ id: name, name, band }));
}

async function _reloadConfig() {
  await loadConfiguration();
  populateSelects();
}

function _fullRefresh() {
  renderPreferencesTab();
  if (window.renderOverview)    renderOverview();
  if (window.renderMissionsTab) renderMissionsTab();
  if (window.renderLinksTab)    renderLinksTab();
}

// ── Inline CSS ───────────────────────────────────────────────────────────────

(function injectPrefStyles() {
  if (document.getElementById('pref-styles')) return;
  const style = document.createElement('style');
  style.id = 'pref-styles';
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
  `;
  document.head.appendChild(style);
})();

// ── Exports ──────────────────────────────────────────────────────────────────

window.renderPreferencesTab  = renderPreferencesTab;
window.prefEditUserRole      = prefEditUserRole;
window.prefCancelUserEdit    = prefCancelUserEdit;
window.prefSaveUserRole      = prefSaveUserRole;
window.prefSuggestDarkColor  = prefSuggestDarkColor;
window.prefStartAddOwner     = prefStartAddOwner;
window.prefCancelAddOwner    = prefCancelAddOwner;
window.prefSaveNewOwner      = prefSaveNewOwner;
window.prefDeleteOwner       = prefDeleteOwner;
window.prefStartAddDevice    = prefStartAddDevice;
window.prefCancelAddDevice   = prefCancelAddDevice;
window.prefSaveNewDevice     = prefSaveNewDevice;
window.prefDeleteDevice      = prefDeleteDevice;
