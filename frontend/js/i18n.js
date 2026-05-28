// ==================== Internationalisation ====================
// To switch language: change LANG to any key defined in TRANSLATIONS.
// To add a language: add a new key (e.g. "he") with translated values.
// Untranslated keys fall back to "en" automatically.

let _currentLang = localStorage.getItem("mahakesher-lang") || "he";

const LANG_NAMES = { en: "English", he: "עברית" };

// ── Shared field labels (single source of truth) ──────────────────────────
// Translators: change a value here once and it updates every tab,
// column header, form label, and history diff that uses that concept.

const _en = {
  frequency: "Frequency",
  freqBand: "Frequency Band",
  band: "Band",
  owner: "Owner",
  mission: "Mission",
  role: "Role",
  status: "Status",
  notes: "Notes",
  deviceType: "Device Type",
  site: "Site",
  sector: "Sector",
  name: "Name",
  location: "Location",
  actions: "Actions",
  siteType: "Site Type",
  coords: "Coordinates",
  linkName: "Link Name",
  standbyFreq: "Standby Freq",
  standbyOwner: "Standby Owner",
  standbyMission: "Standby Mission",
  standbyRole: "Standby Role",
};

const _he = {
  frequency: "תדר",
  freqBand: "תחום תדר",
  band: "תחום תדר",
  owner: "בעלים",
  mission: "משימה",
  role: "תפקיד",
  status: "סטטוס",
  notes: "הערות",
  deviceType: "סוג מכשיר",
  site: "אתר",
  sector: "גזרה",
  name: "שם",
  location: "מיקום",
  actions: "פעולות",
  siteType: "סוג אתר",
  coords: "נ.צ",
  linkName: "עורק",
  standbyFreq: "תדר כוננות",
  standbyOwner: "בעלים כוננות",
  standbyMission: "משימת כוננות",
  standbyRole: "תפקיד כוננות",
};

const TRANSLATIONS = {
  en: {
    // ── Tabs ──────────────────────────────────────────────────
    "tab.overview": "Overview",
    "tab.missions": "Missions",
    "tab.links": "Link Dictionary",
    "tab.ownerfreqs": "Owner Frequencies",
    "tab.search": "Search",
    "tab.summary": "Summary",
    "tab.history": "History",
    "tab.timeline": "Timeline",
    "tab.preferences": "Preferences",

    // ── Login ─────────────────────────────────────────────────
    "login.title": "Login",
    "login.username": "Username",
    "login.usernamePlaceholder": "Enter username",
    "login.password": "Password",
    "login.passwordPlaceholder": "••••••••",
    "login.submit": "Login",
    "login.btnLogin": "Login",
    "login.btnLogout": "Logout",
    "login.fieldRequired": "Please enter username and password",
    "login.invalidCredentials": "Invalid username or password",
    "login.loggedOut": "Logged out successfully",
    "login.sessionExpired": "Session expired — please log in again",
    "login.loggedInAs": "Logged in as {name}",
    "login.confirmLogout": "Log out?",
    "login.logoutTooltip": "Click to log out",

    // ── Server status ─────────────────────────────────────────
    "server.connecting": "Connecting...",
    "server.connected": "Connected",
    "server.disconnected": "Disconnected",

    // ── View / Edit mode ──────────────────────────────────────
    "mode.edit": "Edit Mode",
    "mode.view": "View Only",
    "mode.toggleToView": "Switch to View Mode",
    "mode.toggleToEdit": "Switch to Edit Mode",
    "mode.banner": "View Only — switch to Edit Mode to make changes",
    "notify.viewModeBlock": "View Only — switch to Edit Mode to make changes",
    "notify.adminOnly": "This action requires admin access",

    // ── Passkey modal ─────────────────────────────────────────
    "passkey.title": "Enter Passkey",
    "passkey.hint": "Enter the passkey to switch to Edit Mode.",
    "passkey.label": "Passkey",
    "passkey.placeholder": "••••••••",
    "passkey.error": "Incorrect passkey. Try again.",
    "passkey.confirm": "Unlock",

    // ── Common buttons ────────────────────────────────────────
    "btn.save": "Save",
    "btn.cancel": "Cancel",
    "btn.undo": "Undo",
    "btn.delete": "Delete",
    "btn.edit": "Edit",
    "btn.add": "Add",
    "btn.clear": "Clear",
    "btn.refresh": "Refresh",
    "btn.ok": "OK",
    "btn.dark": "🌙 Dark",
    "btn.light": "☀️ Light",
    "btn.toggleDark": "Toggle dark mode",

    // ── Overview ──────────────────────────────────────────────
    "overview.title": "Deployment Overview",
    "overview.addSector": "Add Sector",
    "overview.collapseAll": "Collapse All",
    "overview.expandAll": "Expand All",
    "overview.editSector": "Edit Sector",
    "overview.addSite": "Add Site",
    "overview.addDevice": "Add Device",
    "overview.clearAll": "Clear All",
    "overview.modeFrequency": _en.frequency,
    "overview.modeLink": "Link",
    "overview.col.band": _en.freqBand,
    "overview.col.device": _en.deviceType,
    "overview.col.current": "Current State",
    "overview.col.standby": "Standby State",
    "overview.col.frequency": _en.frequency,
    "overview.col.owner": _en.owner,
    "overview.col.mission": _en.mission,
    "overview.col.role": _en.role,
    "overview.col.status": _en.status,
    "overview.col.notes": _en.notes,
    "overview.col.actions": _en.actions,
    "overview.col.site": _en.site,
    "overview.btn.swapStates": "Swap States",
    "overview.btn.edit": "Edit",
    "overview.btn.clear": "Clear",
    "overview.freqModeTitle": "Show frequencies as numbers",
    "overview.linkModeTitle": "Show frequencies as link names",

    // ── Missions tab ──────────────────────────────────────────
    "missions.title": "Missions Management",
    "missions.planMission": "Plan Mission",
    "missions.plannedMissions": "Planned Missions",
    "missions.sub.planned":
      "Prepare requirements for the mission. Devices cannot be assigned yet.",
    "missions.activeMissions": "Active Missions",
    "missions.sub.active":
      "Planning is complete — requirements are now placed on standby or assigned directly to devices.",
    "missions.help.tooltip": "Explain allocation functions",
    "missions.help.title": "Allocation Functions Guide",
    "missions.help.allocate.title":
      "Allocate — Fill requirements into current state",
    "missions.help.allocate.step1":
      "Pre-step: Any devices already queued as standby for this mission are promoted to current state first (same logic as Activate Standby).",
    "missions.help.allocate.step2":
      "Matching: For each remaining unmet requirement, searches for an available device with the same frequency band. If the requirement specifies a site or sector, the device must be located there.",
    "missions.help.allocate.step3":
      "On match: sets the device's current-state fields — mission name, mission owner, frequency (from the requirement if provided), and role (from the requirement if provided).",
    "missions.help.allocate.step4":
      "On failure: any requirements that could not be matched are shown in a summary modal so you can act on them manually.",
    "missions.help.standby.title":
      "Allocate to Standby — Reserve backup devices",
    "missions.help.standby.step1":
      "Skips requirements that are already covered — either by a device assigned to this mission in current state, or by one already on standby for it.",
    "missions.help.standby.step2":
      "Matching: for each remaining requirement, searches for a device with the same band and site/sector (if specified) whose standby slot is empty.",
    "missions.help.standby.step3":
      "On match: sets the device's standby-state fields — standby mission, owner, frequency, and role — leaving current state completely untouched.",
    "missions.help.standby.priority":
      "Priority: devices with no current mission assignment are tried first, then devices already carrying another active mission.",
    "missions.help.activate.title":
      "Activate Standby — Promote standby devices to current",
    "missions.help.activate.step1":
      "Scans all devices that have this mission set as their standby mission. Requirements are not re-evaluated — only explicitly queued standby devices are processed.",
    "missions.help.activate.step2":
      "Option A (same device): if the device's own current-state slot is completely empty (no mission, owner, role, or frequency), standby values are moved directly into current state and standby is cleared.",
    "missions.help.activate.step3":
      "Option B (different device): if the device is occupied in current state, the system finds another fully free device at the same site with the same frequency band, assigns the mission to it, and clears the original device's standby slot.",
    "missions.help.activate.step4":
      "If neither option is possible for a device, that standby device is counted as failed and a warning notification is shown.",
    "missions.archivedMissions": "Archived Missions",
    "missions.sub.archived":
      "Completed missions. Can be restored to planning at any time.",
    "missions.noPlanned": "No planned missions.",
    "missions.noActive": "No active missions.",
    "missions.noArchived": "No archived missions.",
    "missions.col.name": "Mission Name",
    "missions.col.owner": _en.owner,
    "missions.col.reqs": "Requirements",
    "missions.col.allocated": "Allocated",
    "missions.col.standby": "Standby",
    "missions.col.extra": "Extra",
    "missions.col.actions": _en.actions,
    "missions.overdueBadge": "⚠ Overdue",
    "missions.overdueTitle":
      "This mission's scheduled end time has passed and it has not been ended yet",
    "missions.btn.finishPlanning": "Finish Planning",
    "missions.btn.allocate": "Allocate",
    "missions.btn.allocateToStandby": "Allocate to Standby",
    "missions.btn.activateStandby": "Activate Standby",
    "missions.btn.returnToPlanning": "Return to Planning",
    "missions.btn.finishAndArchive": "Finish & Archive",
    "missions.btn.start": "Start",
    "missions.btn.update": "Update",
    "missions.btn.standby": "Standby",
    "missions.btn.end": "End",
    "missions.btn.archive": "Archive",
    "missions.btn.restore": "Restore to Planning",
    "missions.btn.editMission": "Edit",

    // ── Plan Mission modal ────────────────────────────────────
    "planMission.title": "Plan a New Mission",
    "planMission.editTitle": "Edit Mission",
    "planMission.infoSection": "Mission Information",
    "planMission.name": "Mission Name",
    "planMission.namePlaceholder": "e.g., Saving Willy",
    "planMission.owner": "Mission Owner",
    "planMission.ownerSelect": "Select an owner...",
    "planMission.created": "Created",
    "planMission.deviceReqs": "Device Requirements",
    "planMission.addReqHint":
      "Add specific device requirements for this mission",
    "planMission.freqBand": _en.freqBand,
    "planMission.freqBandAuto": "Auto-detected",
    "planMission.freqMhz": "Freq (MHz)",
    "planMission.freqPlaceholder": "e.g., 120.5 or link name",
    "planMission.role": _en.role,
    "planMission.rolePlaceholder": "e.g., Commander",
    "planMission.sector": _en.sector,
    "planMission.site": _en.site,
    "planMission.sectorSelect": "Select a sector...",
    "planMission.siteSelect": "Select a site...",
    "planMission.addBtn": "Add",
    "planMission.plannedReqs": "Planned Requirements",
    "planMission.sortBy": "Sort by:",
    "planMission.sortNone": "None",
    "planMission.sortState": "State",
    "planMission.sortFreq": _en.frequency,
    "planMission.sortLocation": _en.location,
    "planMission.removeAllReqs": "Remove All",
    "confirm.removeAllReqs": "Remove all requirements? This cannot be undone.",
    "planMission.noReqs": "No requirements added yet.",
    "planMission.extraDevices": "Extra Devices (Not in Requirements)",
    "planMission.noExtra": "No extra devices.",
    "planMission.saveMission": "Save Mission",
    "planMission.downloadTemplate": "Download Template",
    "planMission.loadExcel": "Load from Excel",
    "planMission.reqCol.band": _en.freqBand,
    "planMission.reqCol.location": "Station / Sector",
    "planMission.reqCol.frequency": _en.frequency,
    "planMission.reqCol.linkName": _en.linkName,
    "planMission.reqCol.role": _en.role,
    "planMission.reqCol.actions": _en.actions,
    "planMission.req.titleEdit": "Edit",
    "planMission.req.titleRemove": "Remove",
    "planMission.extraCol.band": _en.freqBand,
    "planMission.extraCol.device": _en.deviceType,
    "planMission.extraCol.frequency": _en.frequency,
    "planMission.extraCol.owner": _en.owner,
    "planMission.extraCol.location": "Station / Sector",
    "planMission.extraCol.status": _en.status,
    "planMission.anyLocation": "Any Location",
    "planMission.timeStart": "Start Time",
    "planMission.timeEnd": "End Time",

    // ── Timeline tab ──────────────────────────────────────────
    "timeline.title": "Mission Timeline",
    "timeline.noMissions": "No active missions to display.",
    "timeline.noScheduled":
      "No missions have scheduled times. Set start and end times when editing a mission.",
    "timeline.unscheduled": "Unscheduled Missions",
    "timeline.now": "NOW",
    "timeline.tooltip.start": "Start",
    "timeline.tooltip.end": "End",

    // ── Link Dictionary ───────────────────────────────────────
    "links.title": "Link Dictionary",
    "links.addLink": "Add Link",
    "links.template": "Template",
    "links.importExcel": "Import Excel",
    "links.searchPlaceholder": "Search by link name or frequency…",
    "links.clearSearch": "Clear",
    "links.col.name": _en.linkName,
    "links.col.frequency": _en.frequency,
    "links.col.band": _en.band,
    "links.col.owner": _en.owner,
    "links.col.genericRole": "Generic Role",
    "links.genericRolePlaceholder": "e.g., Commander",
    "links.col.actions": _en.actions,

    // ── Search tab ────────────────────────────────────────────
    "search.title": "Search & Filter",
    "search.clear": "Clear",
    "search.placeholder":
      "Search frequencies, owners, missions, device types, notes…",
    "search.stateLabel": "State",
    "search.bothStates": "Both States",
    "search.currentState": "Current",
    "search.standbyState": "Standby",
    "search.missionLabel": _en.mission,
    "search.allMissions": "All Missions",
    "search.statusLabel": _en.status,
    "search.allStatuses": "All Statuses",
    "search.results": "{count} result",
    "search.resultsPlural": "{count} results",
    "search.noResults": "No results",
    "search.statusUsable": "✓ Usable",
    "search.statusUnusable": "✗ Unusable",

    // ── History tab ───────────────────────────────────────────
    "history.title": "History",
    "history.refresh": "Refresh",
    "history.all": "All",
    "history.radio": "Radio",
    "history.mission": _en.mission,
    "history.sector": _en.sector,
    "history.site": _en.site,
    "history.link": "Link",
    "history.badge.archivedMission": "Archived Mission",
    "history.badge.fullBackup": "Full Backup",
    "history.badge.owner": "Owner",
    "history.badge.device": "Device",
    "history.preferences": "Preferences",
    "history.empty": "No history entries found.",
    "history.changedBy": "by {name}",
    "history.field.frequency": _en.frequency,
    "history.field.owner": _en.owner,
    "history.field.mission": _en.mission,
    "history.field.role": _en.role,
    "history.field.status": _en.status,
    "history.field.standbyFreq": _en.standbyFreq,
    "history.field.standbyOwner": _en.standbyOwner,
    "history.field.standbyMission": _en.standbyMission,
    "history.field.standbyRole": _en.standbyRole,
    "history.field.name": _en.name,
    "history.field.coordinates": _en.coords,
    "history.field.siteType": _en.siteType,
    "history.field.linkName": _en.linkName,
    "history.field.band": _en.band,
    "history.field.genericRole": "Generic Role",
    "history.create.radio": "Added {device} to {site}",
    "history.create.sector": 'Created sector "{name}"',
    "history.create.site": 'Added site "{name}"',
    "history.create.mission": 'Created mission "{name}"',
    "history.create.link": 'Added link "{name}"',
    "history.create.owner": 'Added owner "{name}"',
    "history.create.device": 'Added device "{name}" ({band})',
    "history.create.other": "Created {type}",
    "history.update.radio": "Updated {label} at {site}",
    "history.update.radioNoSite": "Updated {label}",
    "history.update.sector": "Updated sector",
    "history.update.site": "Updated site",
    "history.update.mission": 'Updated mission "{name}"',
    "history.update.link": "Updated link",
    "history.update.owner": 'Updated owner "{name}"',
    "history.update.device": 'Updated device "{name}"',
    "history.update.other": "Updated {type}",
    "history.delete.radio": "Deleted radio device",
    "history.delete.sector": "Deleted sector",
    "history.delete.sectorWithSites":
      "Deleted sector ({count} site(s) removed)",
    "history.delete.site": 'Deleted site "{name}"',
    "history.delete.mission": 'Deleted mission "{name}"',
    "history.delete.archivedMission": 'Deleted archived mission "{name}"',
    "history.delete.link": "Deleted link",
    "history.delete.owner": 'Deleted owner "{name}"',
    "history.delete.device": 'Deleted device "{name}"',
    "history.delete.other": "Deleted {type}",
    "history.startMission": 'Started mission "{name}"',
    "history.endMission": 'Ended mission "{name}"',
    "history.activate": 'Mission "{name}" moved to active',
    "history.deactivate": 'Mission "{name}" returned to planning',
    "history.archive": 'Archived mission "{name}"',
    "history.restore": 'Restored mission "{name}"',
    "history.batchClear": "Cleared {count} devices at {site}",
    "history.import": "Imported backup ({sectors}s · {sites}si · {radios}r)",

    // ── Summary tab ───────────────────────────────────────────
    "summary.title": "Summary Statistics",
    "summary.export": "Export Backup",
    "summary.import": "Import Backup",
    "summary.sitesView": "Sites View",
    "summary.sectorsView": "Sectors View",
    "summary.totalSectors": "Total Sectors",
    "summary.totalSites": "Total Sites",
    "summary.totalRadios": "Total Radios",
    "summary.usable": "Usable Devices",
    "summary.unusable": "Unusable Devices",
    "summary.activeBands": "Active Bands",
    "summary.analytics": "Analytics",
    "summary.radioSummary": "Radio Summary",
    "summary.chartHealth": "Device Health",
    "summary.chartMission": "Mission Coverage",
    "summary.chartBands": "Devices by Frequency Band",

    // ── Status values ─────────────────────────────────────────
    "status.usable": "Usable",
    "status.unusable": "Unusable",

    // ── Sector modal ──────────────────────────────────────────
    "sector.addTitle": "Add Sector",
    "sector.editTitle": "Edit Sector",
    "sector.nameLabel": "Sector Name",
    "sector.namePlaceholder": "e.g., Northern Command",

    // ── Site modal ────────────────────────────────────────────
    "site.addTitle": "Add Site",
    "site.editTitle": "Edit Site",
    "site.nameLabel": "Site Name",
    "site.namePlaceholder": "e.g., Alpha Base",
    "site.sectorLabel": _en.sector,
    "site.coordsLabel": "Coordinates (UTM)",
    "site.typeLabel": _en.siteType,

    // ── Radio modal ───────────────────────────────────────────
    "radio.title": "Radio Device Configuration",
    "radio.deviceInfo": "Device Information",
    "radio.deviceId": "Device ID",
    "radio.deviceType": _en.deviceType,
    "radio.freqBand": _en.freqBand,
    "radio.statesConfig": "Radio States Configuration",
    "radio.currentState": "Current State",
    "radio.activeConfig": "Active Configuration",
    "radio.standbyState": "Standby State",
    "radio.backupConfig": "Backup Configuration",
    "radio.freqMhz": "Frequency (MHz)",
    "radio.owner": _en.owner,
    "radio.mission": _en.mission,
    "radio.role": _en.role,
    "radio.rolePlaceholder": "Auto-filled from mission",
    "radio.status": _en.status,
    "radio.notes": _en.notes,
    "radio.notesPlaceholder": "Add any relevant notes...",
    "radio.freqPlaceholder": "e.g., 120.5 or link name",

    // ── Notifications ─────────────────────────────────────────
    "notify.deviceUpdated": "Device updated",
    "notify.deviceUpdateFailed": "Failed to update device",
    "notify.deviceCleared": "Device cleared",
    "notify.deviceClearFailed": "Failed to clear device",
    "notify.undone": "Action undone",
    "notify.undoFailed": "Could not undo — data may have changed",
    "notify.statesSwapped": "Device states swapped",
    "notify.statesSwapFailed": "Failed to swap device states",
    "notify.siteCleared": '{count} device(s) cleared at "{name}"',
    "notify.siteClearFailed": "Failed to clear some devices",
    "notify.noDevicesAtSite": "No devices at this site",
    "notify.alreadyCleared": "All devices are already cleared",
    "notify.radioSaved": "Radio updated successfully",
    "notify.radioSaveFailed": "Failed to save radio",
    "notify.radioDeleted": "Radio deleted successfully",
    "notify.radioDeleteFailed": "Failed to delete radio",
    "notify.radioAdded": "Radio added successfully",
    "notify.radiosAdded": "{{count}} radios added successfully",
    "notify.radioAddFailed": "Failed to add radio",
    "notify.sectorSaved": "Sector saved successfully",
    "notify.sectorSaveFailed": "Failed to save sector",
    "notify.sectorDeleted": "Sector deleted successfully",
    "notify.sectorDeleteFailed": "Failed to delete sector",
    "notify.siteSaved": "Site saved successfully",
    "notify.siteSaveFailed": "Failed to save site",
    "notify.siteDeleted": "Site deleted successfully",
    "notify.siteDeleteFailed": "Failed to delete site",
    "notify.missionActivated": "Mission moved to active",
    "notify.missionDeactivated": "Mission returned to planning",
    "notify.standbyActivated":
      "{count} standby device(s) moved to current for '{name}'",
    "notify.noStandbyDevices": "No standby devices found for this mission",
    "notify.standbyActivateFailed":
      "{count} standby device(s) could not be promoted",
    "confirm.returnToPlanning":
      "Return this mission to planning? All device assignments will be cleared.",
    "notify.missionSaved": "Mission planned successfully",
    "notify.missionUpdated": "Mission updated successfully",
    "notify.missionSaveFailed": "Failed to save mission: {error}",
    "notify.missionDeleted": "Archived mission deleted",
    "notify.missionDeleteFailed": "Failed to delete archived mission: {error}",
    "notify.missionEnded": "Mission ended successfully",
    "notify.missionEndFailed": "Failed to end mission: {error}",
    "notify.missionArchived": "Mission moved to archive",
    "notify.missionArchiveFailed": "Failed to archive mission: {error}",
    "notify.missionRestored": "Mission restored to active",
    "notify.missionRestoreFailed": "Failed to restore mission: {error}",
    "notify.missionAllocated": "{count} device(s) allocated to '{name}'",
    "notify.missionAllocFailed": "Failed to allocate some devices: {error}",
    "notify.rolesUpdated": "{count} device role(s) updated",
    "notify.roleUpdateFailed": "Failed to update some device roles",
    "notify.linkSaved": "Link mapping added successfully",
    "notify.linkSaveFailed": "Failed to add link mapping",
    "notify.linkUpdated": "Link updated successfully",
    "notify.linkUpdateFailed": "Failed to update link",
    "notify.linkDeleted": "Link deleted successfully",
    "notify.linkDeleteFailed": "Failed to delete link",
    "notify.linksImported": "Imported {count} link(s) from Excel",
    "notify.noValidLinks": "No valid links found in file",
    "notify.linksImported": "Imported {count} link(s) from Excel",
    "notify.reqsImported": "Imported {count} requirement(s) from Excel",
    "notify.noValidReqs": "No valid requirements found in file",
    "notify.reqsImported": "Imported {count} requirement(s) from Excel",
    "notify.excelEmpty": "Excel file is empty or has no data rows",
    "excel.importTitle": "Import Errors",
    "excel.linkImportTitle": "Import Completed with Warnings",
    "excel.reqSuccess": "{count} requirement(s) imported successfully",
    "excel.linkSuccess": "{count} link(s) imported successfully.",
    "excel.rowsSkipped": "{count} row(s) skipped",
    "excel.dueToErrors": "due to the following errors:",
    "excel.errorDetails": "Error Details",
    "notify.excelNoBandCol": "Could not find 'Frequency Band' column in Excel",
    "notify.excelParseFailed": "Failed to parse Excel file: {error}",
    "notify.refreshing": "Refreshing data...",
    "notify.dataRefreshed": "Data refreshed",
    "notify.refreshFailed": "Refresh failed",
    "notify.exportOk": "Backup exported successfully",
    "notify.exportFailed": "Failed to export data: {error}",
    "notify.importOk": "Data imported successfully. Reloading...",
    "notify.importBadFile": "Invalid backup file: missing data",
    "notify.importFailed": "Failed to import data: {error}",
    "notify.usesMissionsTab": "Use the Missions tab to manage your missions",

    // ── Confirmation dialogs ──────────────────────────────────
    "confirm.clearDevice": "Clear all editable fields for this device?",
    "confirm.clearSite":
      'Clear all assignments for {count} device(s) at "{name}"?\n\nThis will reset frequency, owner, mission, role, and notes for all devices at this site.',
    "confirm.deleteRadio": "Delete this radio device?",
    "confirm.deleteSector": "Delete this sector and all its sites/radios?",
    "confirm.deleteSite": "Delete this site and all its radios?",
    "confirm.deleteMission": 'Delete planned mission "{name}"?',
    "confirm.archiveMission": "Move this mission to archive?",
    "confirm.restoreMission": "Restore this mission to active?",
    "confirm.deleteArchived": "Permanently delete this archived mission?",
    "confirm.unsavedChanges": "You have unsaved changes. Close anyway?",
    "confirm.importData": "This will overwrite all current data. Continue?",

    // ── Validation errors ─────────────────────────────────────
    "error.freqBandNotDetected":
      "Frequency band could not be detected — check the frequency value",
    "error.selectLocation": "Please select a station or sector",
    "error.enterFrequency": "Please enter a required frequency",
    "error.freqOutOfRange":
      "Frequency must be between {min} and {max} for {band} band",
    "error.selectDeviceType": "Please select a device type",
    "error.fillRequired": "Please fill in all required fields",
    "error.siteNameExists": "A site with this name already exists",
    "error.sectorNameRequired": "Please enter a sector name",
    "error.sectorNameExists": "A sector with this name already exists",
    "error.missionNameRequired": "Mission name is required",
    "error.missionOwnerRequired": "Mission owner is required",
    "error.missionNoReqs": "Please add at least one device requirement",
    "error.missionNameExists": "A mission with this name already exists",
    "error.missionNotFound": "Mission not found",
    "error.missionHasNoReqs": "Mission has no requirements defined",
    "error.missionFulfilled": "Mission already has all requirements fulfilled",
    "error.linkNameRequired":
      "Please enter Link Name, Frequency, and Frequency Band",
    "error.linkNameExists": 'Link name "{name}" already exists',
    "error.freqAlreadyUsed": 'Frequency {freq} is already used by "{name}"',
    "error.unknownOwner": 'Row {row}: Unknown owner "{owner}" — skipped',
    "error.dupLinkName":
      'Row {row}: Link name "{name}" already exists — skipped',
    "error.dupFrequency":
      "Row {row}: Frequency {freq} MHz already exists — skipped",
    "error.invalidFreq": 'Row {row}: Invalid or missing frequency for "{name}"',
    "error.noBandDetected":
      "Row {row}: Could not detect frequency band for {freq} MHz",
    "error.freqOutOfRangeRow":
      "Row {row}: {freq} MHz is out of range for {band} ({min}–{max})",
    "error.saveFailed": 'Failed to save "{name}" — {error}',

    // ── Excel import row errors ───────────────────────────────
    "import.link.invalidFreq":
      'Row {row}: Invalid or missing frequency for "{name}"',
    "import.link.nameDup":
      'Row {row}: Link name "{name}" already exists — skipped',
    "import.link.freqDup":
      "Row {row}: Frequency {freq} MHz already exists — skipped",
    "import.link.unknownOwner": 'Row {row}: Unknown owner "{name}" — skipped',
    "import.link.saveFailed": 'Row {row}: Failed to save "{name}"',
    "import.mission.bothSectorSite":
      "Row {row}: Specify either Sector OR Site, not both",
    "import.mission.unknownBand": 'Row {row}: Unknown frequency band "{band}"',
    "import.mission.siteNotFound": 'Row {row}: Site "{name}" not found',
    "import.mission.sectorNotFound": 'Row {row}: Sector "{name}" not found',

    // ── Mission table & button titles ─────────────────────────
    "missions.btn.titleEdit": "Edit Mission",
    "missions.btn.titleStart": "Start Mission",
    "missions.btn.titleStandby": "Place on Standby",
    "missions.btn.titleEnd": "End Mission",
    "missions.btn.titleRestore": "Move to Active",
    "missions.btn.titleDelete": "Delete Mission",
    "missions.failedReqs.title": "Unfulfilled Requirements",
    "missions.failedReqs.desc":
      "The following requirements could not be fulfilled due to lack of available devices:",
    "missions.failedReqs.col.band": _en.freqBand,
    "missions.failedReqs.col.loc": _en.location,
    "missions.failedReqs.col.freq": _en.frequency,
    "missions.endConfirmMsg":
      "The mission will be moved to archive and will no longer appear in mission selection dropdowns.",

    // ── Link Dictionary extra ─────────────────────────────────
    "links.noMatches": "No matches found.",
    "links.edit": "Edit",

    // ── Owner Frequencies tab ─────────────────────────────────
    "ownerfreqs.title": "Owner Frequencies",
    "ownerfreqs.selectLabel": "Owner:",
    "ownerfreqs.selectPlaceholder": "Select an owner...",
    "ownerfreqs.bandTitle": "Frequency Band: {band}",
    "ownerfreqs.col.frequency": "Frequency",
    "ownerfreqs.col.name": "Frequency Name",
    "ownerfreqs.col.activeMissions": "Active Missions",
    "ownerfreqs.col.plannedMissions": "Planned Missions",
    "ownerfreqs.noLinks": "No frequencies assigned to this owner.",
    "ownerfreqs.unknownBand": "Unknown Band",

    // ── Summary charts & table headers ────────────────────────
    "summary.chart.usable": "Usable",
    "summary.chart.unusable": "Unusable",
    "summary.chart.active": "Active Mission",
    "summary.chart.standby": "Standby",
    "summary.chart.free": "Free",
    "summary.col.band": _en.band,
    "summary.col.total": "Total",
    "summary.col.occupied": "Occ.",
    "summary.col.unusable": "Unus.",
    "summary.col.free": "Free",
    "summary.col.freePercent": "% Free",
    "summary.noSites": "No sites in this sector.",

    // ── History time strings ──────────────────────────────────
    "history.justNow": "Just now",
    "history.minsAgo": "{n}m ago",
    "history.hoursAgo": "{n}h ago",
    "history.yesterday": "Yesterday {time}",
    "history.daysAgo": "{n}d ago {time}",

    // ── Selectors ─────────────────────────────────────────────
    "select.deviceType": "Select device type...",
    "select.noMission": "No Mission",
    "select.allMissions": "All Missions",
    "select.owner": "Select an owner...",
    "select.sector": "Select a sector...",
    "select.site": "Select a site...",

    // ── Validators ────────────────────────────────────────────
    "validator.validRange": "Valid range: {min} - {max}",
    "inline.freqConflict": "Frequency {frequency} already in use by: {types}",
    "inline.invalidNumber": "Invalid number",
    "inline.missionOwnerMismatch":
      'Mission owner must be "{owner}", not "{selected}"',

    // ── Additional notifications ──────────────────────────────
    "notify.excelNoNameCol": "Could not find a 'Link Name' column in the file",
    "notify.excelNoFreqCol": "Could not find a 'Frequency' column in the file",
    "confirm.deleteLink": "Delete this link mapping?",

    // ── Sector modal extra ─────────────────────────────────────
    "sector.help": "Enter the sector identifier below",
    "sector.idLabel": "Sector ID",

    // ── Site modal extra ───────────────────────────────────────
    "site.basicInfo": "Basic Information",
    "site.idLabel": "Site ID",
    "site.typeSelect": "Select site type...",
    "site.typeMobile": "Mobile",
    "site.typeFixed": "Fixed",
    "site.coordsSection": "Coordinates",
    "site.utmLabel": "UTM Coordinates",
    "site.utmPlaceholder": "e.g., 31U ES 500000 4500000",
    "site.utmHelp": "Format: Zone Letter + Easting Northing",

    // ── Add Radio modal ────────────────────────────────────────
    "radio.addTitle": "Add New Radio Device",
    "radio.addHelp": "Select the device type and quantity to add to this site",
    "radio.addBtn": "Add Device",
    "radio.quantity": "Quantity",

    // ── Add / Edit Link modals ─────────────────────────────────
    "addLink.title": "Add Link Mapping",
    "addLink.help": "Create a new link mapping for frequency management",
    "addLink.namePlaceholder": "e.g., Primary Network, Backup Link",
    "addLink.freqPlaceholder": "e.g., 120.5",
    "addLink.bandPlaceholder": "Auto-detected from frequency",
    "addLink.addBtn": "Add Link",
    "editLink.title": "Edit Link Mapping",
    "editLink.help": "Update the link mapping details",

    // ── History initial prompt ─────────────────────────────────
    "history.loadPrompt":
      "Click Refresh or switch to this tab to load history.",

    // ── Common counters ────────────────────────────────────────
    "common.devicesCount": "{count} devices",
    "common.deviceCount": "{count} device(s)",
    "notify.missionStandby": "{count} device(s) placed on standby for '{name}'",
    "notify.devicesUpdated": "Updated {count} allocated device(s)",
    "missions.endConfirmDevices":
      "This will clear {total} device(s) ({allocated} allocated, {extra} extra).\n\n",

    // ── Preferences tab ───────────────────────────────────────
    "pref.languageLabel": "Interface Language",
    "pref.langChanged": "Language updated",
    "pref.owners": "Owners",
    "pref.devices": "Device Types",
    "pref.col.light": "Light",
    "pref.col.dark": "Dark",
    "pref.col.name": _en.name,
    "pref.col.actions": _en.actions,
    "pref.col.band": _en.band,
    "pref.addOwner": "Add Owner",
    "pref.addDevice": "Add Device",
    "pref.label.name": _en.name,
    "pref.label.lightColor": "Light Color",
    "pref.label.darkColor": "Dark Color",
    "pref.label.autoSuggested": "(auto-suggested)",
    "pref.label.band": _en.band,
    "pref.btn.add": "Add",
    "pref.btn.cancel": "Cancel",
    "pref.confirm.deleteOwner": 'Delete owner "{name}"?',
    "pref.confirm.deleteDevice": 'Delete device "{name}"?',
    "pref.notify.ownerAdded": "Owner added successfully",
    "pref.notify.ownerDeleted": "Owner deleted",
    "pref.notify.deviceAdded": "Device added successfully",
    "pref.notify.deviceDeleted": "Device deleted",
    "pref.notify.nameRequired": "Owner name is required",
    "pref.notify.devNameRequired": "Device name is required",
    "pref.users": "Users",
    "pref.col.username": "Username",
    "pref.col.role": "Role",
    "pref.col.lastLogin": "Last Login",
    "pref.noUsers": "No users found",
    "pref.notify.userRoleUpdated": "Role updated successfully",
    "pref.error.generic": "An error occurred",
    "pref.error.alreadyExists": "This name already exists in the system",
    "pref.error.nameRequired": "Name is required",
    "pref.error.bandRequired": "Band is required",
    "pref.error.ownerInUse":
      "Cannot delete — owner is assigned to existing items",
    "pref.error.deviceInUse":
      "Cannot delete — existing radios use this device type",
    "pref.error.bandChangeLocked":
      "Cannot change band — radios of this type have active assignments. Clear them first.",
    "pref.error.notFound": "Record not found",
    "pref.error.invalidBand": "Invalid band",
  },
  // ── HEBREW ────────────────────────────────────────────────

  he: {
    // ── Tabs ──────────────────────────────────────────────────
    "tab.overview": "סקירה כללית",
    "tab.missions": "משימות",
    "tab.links": "קישור תדרים",
    "tab.ownerfreqs": "פלאקט עורקים",
    "tab.search": "חיפוש",
    "tab.summary": "סיכום",
    "tab.history": "היסטוריה",
    "tab.timeline": "ציר זמן",
    "tab.preferences": "העדפות",

    // ── Login ─────────────────────────────────────────────────
    "login.title": "התחברות",
    "login.username": "שם משתמש",
    "login.usernamePlaceholder": "הזן שם משתמש",
    "login.password": "סיסמה",
    "login.passwordPlaceholder": "••••••••",
    "login.submit": "התחבר",
    "login.btnLogin": "התחברות",
    "login.btnLogout": "התנתקות",
    "login.fieldRequired": "נא להזין שם משתמש וסיסמה",
    "login.invalidCredentials": "שם משתמש או סיסמה שגויים",
    "login.loggedOut": "התנתקת בהצלחה",
    "login.sessionExpired": "הפגישה פגה — אנא התחבר מחדש",
    "login.loggedInAs": "מחובר כ-{name}",
    "login.confirmLogout": "להתנתק?",
    "login.logoutTooltip": "לחץ להתנתקות",

    // ── Server status ─────────────────────────────────────────
    "server.connecting": "מתחבר...",
    "server.connected": "מחובר לשרת",
    "server.disconnected": "מנותק",

    // ── View / Edit mode ──────────────────────────────────────
    "mode.edit": "מצב עריכה",
    "mode.view": "צפייה בלבד",
    "mode.toggleToView": "עבור למצב צפייה",
    "mode.toggleToEdit": "עבור למצב עריכה",
    "mode.banner": "צפייה בלבד — לא ניתן לבצע שינויים",
    "notify.viewModeBlock": "לא ניתן לבצע שינויים במצב צפייה בלבד!",
    "notify.adminOnly": "פעולה זו דורשת הרשאות מנהל",

    // ── Passkey modal ─────────────────────────────────────────
    "passkey.title": "הזן מפתח גישה",
    "passkey.hint": "הזן את מפתח הגישה כדי לעבור למצב עריכה.",
    "passkey.label": "מפתח גישה",
    "passkey.placeholder": "••••••••",
    "passkey.error": "מפתח גישה שגוי. נסה שוב.",
    "passkey.confirm": "פתח",

    // ── Common buttons ────────────────────────────────────────
    "btn.save": "שמירה",
    "btn.cancel": "ביטול",
    "btn.undo": "בטל",
    "btn.delete": "מחיקה",
    "btn.edit": "עריכה",
    "btn.add": "הוספה",
    "btn.clear": "ניקוי",
    "btn.refresh": "רענון",
    "btn.ok": "אוקיי",
    "btn.dark": "🌙 כהה",
    "btn.light": "☀️ בהיר",
    "btn.toggleDark": "החלף מצב תצוגה",

    // ── Overview ──────────────────────────────────────────────
    "overview.title": "פריסת מכשירים",
    "overview.addSector": "הוספת גזרה",
    "overview.collapseAll": "כווץ הכל",
    "overview.expandAll": "הרחב הכל",
    "overview.editSector": "עריכת גזרה",
    "overview.addSite": "הוספת אתר",
    "overview.addDevice": "הוספת מכשיר",
    "overview.clearAll": "ניקוי הכל",
    "overview.modeFrequency": _he.frequency,
    "overview.modeLink": "עורק",
    "overview.col.band": _he.freqBand,
    "overview.col.device": _he.deviceType,
    "overview.col.current": "מצב נוכחי",
    "overview.col.standby": "מצב כוננות",
    "overview.col.frequency": _he.frequency,
    "overview.col.owner": _he.owner,
    "overview.col.mission": _he.mission,
    "overview.col.role": _he.role,
    "overview.col.status": _he.status,
    "overview.col.notes": _he.notes,
    "overview.col.actions": _he.actions,
    "overview.col.site": _he.site,
    "overview.btn.swapStates": "החלף מצבים",
    "overview.btn.edit": "עריכה",
    "overview.btn.clear": "ניקוי",
    "overview.freqModeTitle": "הצג תדרים כמספרים",
    "overview.linkModeTitle": "הצג תדרים כשמות עורקים",

    // ── Missions tab ──────────────────────────────────────────
    "missions.title": "ניהול משימות",
    "missions.planMission": "צור משימה חדשה",
    "missions.plannedMissions": "משימות בתכנון",
    "missions.sub.planned": "איזור תכנון למשימות ודרישות למשימות",
    "missions.activeMissions": "משימות פעילות",
    "missions.sub.active":
      "משימות שסיימו את שלב התכנון - מכאן ניתן להקצות לפעילות מבצעית",
    "missions.help.tooltip": "הסבר על פונקציות ההקצאה",
    "missions.help.title": "מדריך פונקציות הקצאה",
    "missions.help.allocate.title": "הקצה משימה",
    "missions.help.allocate.step1":
      "כל מכשיר שכבר בכוננות למשימה זו מועלה תחילה למצב פעיל (זהה לפעולת 'הפעל כוננות').",
    "missions.help.allocate.step2":
      "מפעיל חיפוש לכל דרישה ברשימת הדרישות של המשימה, ומקצה מכשיר זמין לפי התדר והאתר בדרישה.",
    "missions.help.allocate.step3":
      "מגדיר את שדות המצב הפעיל של המכשיר בהתאם לדרישה — שם המשימה, הבעלים, תדר והתפקיד.",
    "missions.help.allocate.step4":
      "דרישות שלא ניתן היה למלא מוצגות בחלון סיכום לטיפול ידני.",
    "missions.help.standby.title": "הקצה לכוננות",
    "missions.help.standby.step1":
      "מדלג על דרישות שכבר מכוסות — כאלה שמוקצות למכשירים במצב פעיל או כאלה שכבר בכוננות למשימה זו.",
    "missions.help.standby.step2":
      "בדומה להקצאה, מחפש מכשיר לפי רשימת הדרישות במשימה להקצאה, למצב הכוננות של המכשירים.",
    "missions.help.standby.step3":
      "מגדיר את שדות הכוננות של המכשיר — שם המשימה, בעלים, תדר ותפקיד — מבלי להשפיע על מצב המכשיר הנוכחי.",
    "missions.help.standby.priority":
      "מכשירים ללא משימה פעילה מקבלים עדיפות, לאחר מכן מכשירים המשובצים כבר למשימה אחרת.",
    "missions.help.activate.title":
      "הפעל כוננות — העלאת מכשירי כוננות למצב פעיל",
    "missions.help.activate.step1":
      "סורק את כל המכשירים שמשימת הכוננות שלהם היא משימה זו.",
    "missions.help.activate.step2":
      "אם המצב הפעיל של המכשיר ריק לחלוטין — משימת הכוננות מועברת באותו המכשיר למצב הפעיל.",
    "missions.help.activate.step3":
      "אם המכשיר תפוס במצב הפעיל — המערכת מחפשת מכשיר פנוי לחלוטין באותו אתר ובאותו תחום תדר, ומעבירה את משימת הכוננות למכשיר הפנוי.",
    "missions.help.activate.step4":
      "אם אין מכשיר זמין להקצאה, הוא יופיע ברשימת סיכום לטיפול ידני.",
    "missions.archivedMissions": "משימות בארכיון",
    "missions.sub.archived": "משימות שהסתיימו - ניתן לשחזרן לתכנון בכל עת.",
    "missions.noPlanned": "לא קיימות משימות בתכנון.",
    "missions.noActive": "לא קיימות משימות פעילות.",
    "missions.noArchived": "לא קיימות משימות בארכיון.",
    "missions.col.name": "שם המשימה",
    "missions.col.owner": _he.owner,
    "missions.col.reqs": "דרישות",
    "missions.col.allocated": "מוקצה",
    "missions.col.standby": "כוננות",
    "missions.col.extra": "נוספים",
    "missions.col.actions": _he.actions,
    "missions.overdueBadge": "⚠ באיחור",
    "missions.overdueTitle":
      "זמן הסיום המתוכנן של המשימה עבר והיא טרם הועברה לארכיון",
    "missions.btn.finishPlanning": "סיים תכנון",
    "missions.btn.allocate": "הקצה",
    "missions.btn.allocateToStandby": "הקצה לכוננות",
    "missions.btn.activateStandby": "הפעל כוננות",
    "missions.btn.returnToPlanning": "החזר לתכנון",
    "missions.btn.finishAndArchive": "סיים והעבר לארכיון",
    "missions.btn.start": "התחלה",
    "missions.btn.update": "עדכן",
    "missions.btn.standby": "כוננות",
    "missions.btn.end": "סיום",
    "missions.btn.archive": "העברה לארכיון",
    "missions.btn.restore": "שחזור לתכנון",
    "missions.btn.editMission": "עריכה",

    // ── Plan Mission modal ────────────────────────────────────
    "planMission.title": "תכנן משימה חדשה",
    "planMission.editTitle": "ערוך משימה",
    "planMission.infoSection": "פרטי המשימה",
    "planMission.name": "שם המשימה",
    "planMission.namePlaceholder": "לדוג' - להציל את ווילי",
    "planMission.owner": "בעלים למשימה",
    "planMission.ownerSelect": "בחר בעלים...",
    "planMission.created": "נוצר",
    "planMission.deviceReqs": "מכשירים נרדשים",
    "planMission.addReqHint": "הוסף מכשירים הנדרשים למשימה זו",
    "planMission.freqBand": _he.freqBand,
    "planMission.freqBandAuto": "---",
    "planMission.freqMhz": "תדר (MHz)",
    "planMission.freqPlaceholder": "לדוג' - 9005",
    "planMission.role": _he.role,
    "planMission.rolePlaceholder": "לדוג' - בתק",
    "planMission.sector": _he.sector,
    "planMission.site": _he.site,
    "planMission.sectorSelect": "בחר גזרה...",
    "planMission.siteSelect": "בחר אתר...",
    "planMission.addBtn": "הוסף",
    "planMission.plannedReqs": "דרישות מתוכננות",
    "planMission.sortBy": "סנן לפי:",
    "planMission.sortNone": "ללא",
    "planMission.sortState": "מצב הקצאה",
    "planMission.sortFreq": _he.frequency,
    "planMission.sortLocation": _he.location,
    "planMission.removeAllReqs": "הסר הכל",
    "confirm.removeAllReqs": "להסיר את כל הדרישות? פעולה זו אינה הפיכה.",
    "planMission.noReqs": "לא נוספו דרישות למשימה זו.",
    "planMission.extraDevices": "מכשירים נוספים (לא מופיעים בדרישות)",
    "planMission.noExtra": "ללא מכשירים נוספים.",
    "planMission.saveMission": "שמור משימה",
    "planMission.downloadTemplate": "הורדת תבנית",
    "planMission.loadExcel": "טען מ-Excel",
    "planMission.reqCol.band": _he.freqBand,
    "planMission.reqCol.location": "אתר / גזרה",
    "planMission.reqCol.frequency": _he.frequency,
    "planMission.reqCol.linkName": _he.linkName,
    "planMission.reqCol.role": _he.role,
    "planMission.reqCol.actions": _he.actions,
    "planMission.req.titleEdit": "עריכה",
    "planMission.req.titleRemove": "הסרה",
    "planMission.extraCol.band": _he.freqBand,
    "planMission.extraCol.device": _he.deviceType,
    "planMission.extraCol.frequency": _he.frequency,
    "planMission.extraCol.owner": _he.owner,
    "planMission.extraCol.location": "אתר / גזרה",
    "planMission.extraCol.status": _he.status,
    "planMission.anyLocation": "כל מקום",
    "planMission.timeStart": "שעת התחלה",
    "planMission.timeEnd": "שעת סיום",

    // ── Timeline tab ──────────────────────────────────────────
    "timeline.title": "ציר זמן משימות",
    "timeline.noMissions": "אין משימות פעילות להצגה.",
    "timeline.noScheduled":
      "אין משימות עם זמן מתוזמן. הגדר שעות התחלה וסיום בעריכת המשימה.",
    "timeline.unscheduled": "משימות ללא תזמון",
    "timeline.now": "עכשיו",
    "timeline.tooltip.start": "התחלה",
    "timeline.tooltip.end": "סיום",

    // ── Link Dictionary ───────────────────────────────────────
    "links.title": "קישור תדר לעורק",
    "links.addLink": "הוספת התאמה",
    "links.template": "הורדת תבנית",
    "links.importExcel": "העלה קובץ Excel",
    "links.searchPlaceholder": "חפש קישור...",
    "links.clearSearch": "ניקוי",
    "links.col.name": _he.linkName,
    "links.col.frequency": _he.frequency,
    "links.col.band": _he.band,
    "links.col.owner": _he.owner,
    "links.col.genericRole": "תפקיד גנרי",
    "links.genericRolePlaceholder": "לדוגמה: מפקד",
    "links.col.actions": _he.actions,

    // ── Search tab ────────────────────────────────────────────
    "search.title": "חיפוש & סינון",
    "search.clear": "נקה",
    "search.placeholder": "חפש מה שתרצה...",
    "search.stateLabel": "מצב הקצאה",
    "search.bothStates": "שני המצבים",
    "search.currentState": "הקצאה נוכחית",
    "search.standbyState": "הקצאה בכוננות",
    "search.missionLabel": _he.mission,
    "search.allMissions": "כל המשימות",
    "search.statusLabel": "סטטוס מכשיר",
    "search.allStatuses": "כל המצבים",
    "search.results": "{count} תוצאות",
    "search.resultsPlural": "{count} תוצאות",
    "search.noResults": "אין תוצאות",
    "search.statusUsable": "✓ שמיש",
    "search.statusUnusable": "✗ לא שמיש",

    // ── History tab ───────────────────────────────────────────
    "history.title": "היסטוריית פעולות",
    "history.refresh": "רענן",
    "history.all": "הכל",
    "history.radio": "רדיו",
    "history.mission": _he.mission,
    "history.sector": _he.sector,
    "history.site": _he.site,
    "history.link": "קישור",
    "history.badge.archivedMission": "משימה בארכיון",
    "history.badge.fullBackup": "גיבוי מלא",
    "history.badge.owner": "בעלים",
    "history.badge.device": "מכשיר",
    "history.preferences": "העדפות",
    "history.empty": "לא נמצאה היסטוריה.",
    "history.changedBy": "על ידי {name}",
    "history.field.frequency": _he.frequency,
    "history.field.owner": _he.owner,
    "history.field.mission": _he.mission,
    "history.field.role": _he.role,
    "history.field.status": _he.status,
    "history.field.standbyFreq": _he.standbyFreq,
    "history.field.standbyOwner": _he.standbyOwner,
    "history.field.standbyMission": _he.standbyMission,
    "history.field.standbyRole": _he.standbyRole,
    "history.field.name": _he.name,
    "history.field.coordinates": _he.coords,
    "history.field.siteType": _he.siteType,
    "history.field.linkName": _he.linkName,
    "history.field.band": _he.band,
    "history.field.genericRole": "תפקיד גנרי",
    "history.create.radio": "נוסף {device} ל-{site}",
    "history.create.sector": 'נוצרה גזרה "{name}"',
    "history.create.site": 'נוסף אתר "{name}"',
    "history.create.mission": 'נוצרה משימה "{name}"',
    "history.create.link": 'נוסף קישור "{name}"',
    "history.create.owner": 'נוסף בעלים "{name}"',
    "history.create.device": 'נוסף מכשיר "{name}" ({band})',
    "history.create.other": "נוצר {type}",
    "history.update.radio": "עודכן {label} ב-{site}",
    "history.update.radioNoSite": "עודכן {label}",
    "history.update.sector": "עודכנה גזרה",
    "history.update.site": "עודכן אתר",
    "history.update.mission": 'עודכנה משימה "{name}"',
    "history.update.link": "עודכן קישור",
    "history.update.owner": 'עודכן בעלים "{name}"',
    "history.update.device": 'עודכן מכשיר "{name}"',
    "history.update.other": "עודכן {type}",
    "history.delete.radio": "נמחק מכשיר קשר",
    "history.delete.sector": "נמחקה גזרה",
    "history.delete.sectorWithSites": "נמחקה גזרה ({count} אתרים הוסרו)",
    "history.delete.site": 'נמחק אתר "{name}"',
    "history.delete.mission": 'נמחקה משימה "{name}"',
    "history.delete.archivedMission": 'נמחקה משימה מהארכיון "{name}"',
    "history.delete.link": "נמחק קישור",
    "history.delete.owner": 'נמחק בעלים "{name}"',
    "history.delete.device": 'נמחק מכשיר "{name}"',
    "history.delete.other": "נמחק {type}",
    "history.startMission": 'הופעלה משימה "{name}"',
    "history.endMission": 'המשימה "{name}" סומנה כהסתיימה ועברה לארכיון',
    "history.activate": 'המשימה "{name}" הועברה לסטטוס פעילה',
    "history.deactivate": 'המשימה "{name}" הוחזרה לתכנון',
    "history.archive": 'הועברה לארכיון המשימה "{name}"',
    "history.restore": 'המשימה "{name}" שוחזרה מהארכיון',
    "history.batchClear": "נוקו {count} מכשירים ב-{site}",
    "history.import":
      "יובא גיבוי ({sectors} גזרות · {sites} אתרים · {radios} מכשירים)",

    // ── Summary tab ───────────────────────────────────────────
    "summary.title": "סיכום סטטיסטי",
    "summary.export": "ייצא גיבוי",
    "summary.import": "העלה גיבוי",
    "summary.sitesView": "תצוגת אתרים",
    "summary.sectorsView": "תצוגת גזרות",
    "summary.totalSectors": "סהכ גזרות",
    "summary.totalSites": "סהכ אתרים",
    "summary.totalRadios": "סהכ מכשירים",
    "summary.usable": "מכשירים שמישים",
    "summary.unusable": "מכשירים לא שמישים",
    "summary.activeBands": "תחומי תדר",
    "summary.analytics": "תצוגה גרפית",
    "summary.radioSummary": "סיכום רדיו",
    "summary.chartHealth": "בריאות מכשירים",
    "summary.chartMission": "כיסוי משימות",
    "summary.chartBands": "מכשירים לפי תחום תדר",

    // ── Status values ─────────────────────────────────────────
    "status.usable": "שמיש",
    "status.unusable": "לא שמיש",

    // ── Sector modal ──────────────────────────────────────────
    "sector.addTitle": "הוספת גזרה",
    "sector.editTitle": "עריכת גזרה",
    "sector.nameLabel": "שם הגזרה",
    "sector.namePlaceholder": "לדוג' גזרה צפונית",

    // ── Site modal ────────────────────────────────────────────
    "site.addTitle": "הוספת אתר",
    "site.editTitle": "עריכת אתר",
    "site.nameLabel": "שם האתר",
    "site.namePlaceholder": "לדוג' עפולה",
    "site.sectorLabel": _he.sector,
    "site.coordsLabel": "נ.צ אתר (UTM)",
    "site.typeLabel": _he.siteType,

    // ── Radio modal ───────────────────────────────────────────
    "radio.title": " הגדרת מכשיר קשר",
    "radio.deviceInfo": "פרטי המכשיר",
    "radio.deviceId": "מזהה מכשיר",
    "radio.deviceType": _he.deviceType,
    "radio.freqBand": _he.freqBand,
    "radio.statesConfig": "הגדרת מצבי מכשיר",
    "radio.currentState": "מצב נוכחי",
    "radio.activeConfig": "המצב עליו מכוייל המכשיר",
    "radio.standbyState": "מצב כוננות",
    "radio.backupConfig": "משימה בכוננות למכשיר",
    "radio.freqMhz": "תדר (MHz)",
    "radio.owner": _he.owner,
    "radio.mission": _he.mission,
    "radio.role": _he.role,
    "radio.rolePlaceholder": "---",
    "radio.status": _he.status,
    "radio.notes": _he.notes,
    "radio.notesPlaceholder": "הערות רלוונטיות למכשיר",
    "radio.freqPlaceholder": "לדוג' - 120.5 או שם עורק",

    // ── Notifications ─────────────────────────────────────────
    "notify.deviceUpdated": "פרטי המכשיר עודכנו",
    "notify.deviceUpdateFailed": "כשלון בעדכון פרטי המכשיר",
    "notify.deviceCleared": "פרטי המכשיר נוקו",
    "notify.deviceClearFailed": "כשלון בניקוי פרטי המכשיר",
    "notify.undone": "הפעולה בוטלה",
    "notify.undoFailed": "לא ניתן לבטל — הנתונים השתנו",
    "notify.statesSwapped": "הצרחה בוצעה בהצלחה",
    "notify.statesSwapFailed": "כשלון בביצוע הצרחה",
    "notify.siteCleared": '{count} מכשירים נוקו באתר "{name}"',
    "notify.siteClearFailed": "כשלון בניקוי מכשירים",
    "notify.noDevicesAtSite": "לא קיימים מכשירים באתר זה",
    "notify.alreadyCleared": "כל המכשירים כבר נוקו באתר זה",
    "notify.radioSaved": "המכשיר עודכן בהצלחה",
    "notify.radioSaveFailed": "כשלון בעדכון מכשיר",
    "notify.radioDeleted": "המכשיר נמחק בהצלחה",
    "notify.radioDeleteFailed": "כשלון במחיקת המכשיר",
    "notify.radioAdded": "המכשיר נוסף בהצלחה לאתר",
    "notify.radiosAdded": "{{count}} מכשירים נוספו בהצלחה לאתר",
    "notify.radioAddFailed": "כשלון בהוספת מכשיר",
    "notify.sectorSaved": "הגזרה נוספה בהצלחה",
    "notify.sectorSaveFailed": "כשלון בשמירת גזרה",
    "notify.sectorDeleted": "הגזרה נמחקה בהצלחה",
    "notify.sectorDeleteFailed": "כשלון במחיקת גזרה",
    "notify.siteSaved": "האתר נשמר בהצלחה",
    "notify.siteSaveFailed": "כשלון בשמירת האתר",
    "notify.siteDeleted": "האתר נמחק בהצלחה",
    "notify.siteDeleteFailed": "כשלון במחיקת אתר",
    "notify.missionActivated": "המשימה הועברה למצב פעיל",
    "notify.missionDeactivated": "המשימה חזרה לתכנון",
    "notify.standbyActivated":
      "{count} מכשירים עברו מכוננות לפעיל עבור '{name}'",
    "notify.noStandbyDevices": "לא נמצאו מכשירי כוננות למשימה זו",
    "notify.standbyActivateFailed":
      "{count} מכשירי כוננות לא הצליחו לעבור לפעיל",
    "confirm.returnToPlanning": "להחזיר את המשימה לתכנון? כל ההקצאות יתנקו.",
    "notify.missionSaved": "המשימה נשמרה בהצלחה",
    "notify.missionUpdated": "המשימה עודכנה בהצלחה",
    "notify.missionSaveFailed": "כשלון בשמירת משימה: {error}",
    "notify.missionDeleted": "המשימה נמחקה מהארכיון בהצלחה",
    "notify.missionDeleteFailed": "כשלון במחיקת משימה מהארכיון: {error}",
    "notify.missionEnded": "המשימה סומנה כהסתיימה בהצלחה",
    "notify.missionEndFailed": "כשלון בסיום המשימה: {error}",
    "notify.missionArchived": "המשימה הועברה לארכיון",
    "notify.missionArchiveFailed": "כשלון בהעברת משימה לארכיון: {error}",
    "notify.missionRestored": "המשימה אוחזרה בהצלחה",
    "notify.missionRestoreFailed": "כשלון באחזור משימה: {error}",
    "notify.missionAllocated": "{count} מכשירים הוקצו ל-'{name}'",
    "notify.missionAllocFailed": "כשלון בהקצאת מכשירים: {error}",
    "notify.rolesUpdated": "עודכנו תפקידים ל-{count} מכשירים",
    "notify.roleUpdateFailed": "כשלון בקביעת תפקידים למכשירים",
    "notify.linkSaved": "הקישור לתדר נוסף בהצלחה",
    "notify.linkSaveFailed": "כשלון בהוספת קישור לתדר",
    "notify.linkUpdated": "הקישור עודכן בהצלחה",
    "notify.linkUpdateFailed": "כשלון בעדכון הקישור",
    "notify.linkDeleted": "הקישור נמחק בהצלחה",
    "notify.linkDeleteFailed": "כשלון במחיקת קישור",
    "notify.linksImported": "יובאו {count} קישורים מ-Excel",
    "notify.noValidLinks": "לא נמצאו קישורים תקינים בקובץ",
    "notify.linksImported": "יובאו {count} קישורים מאקסל",
    "notify.reqsImported": "יובאו {count} דרישות למשימה מה-Excel",
    "notify.noValidReqs": "לא נמצאו דרישות מתאימות בקובץ",
    "notify.reqsImported": "יובאו {count} דרישות מאקסל",
    "notify.excelEmpty": "הקובץ ריק או שאין בו מידע בפורמט המתאים",
    "excel.importTitle": "שגיאות ייבוא",
    "excel.linkImportTitle": "הייבוא הושלם עם אזהרות",
    "excel.reqSuccess": "{count} דרישות יובאו בהצלחה",
    "excel.linkSuccess": "{count} קישורים יובאו בהצלחה.",
    "excel.rowsSkipped": "{count} שורות דולגו",
    "excel.dueToErrors": "עקב השגיאות הבאות:",
    "excel.errorDetails": "פרטי השגיאה",
    "notify.excelNoBandCol": "לא ניתן למצוא בקובץ עמודת תחום תדר",
    "notify.excelParseFailed": "תקלה בעיבוד הקובץ: {error}",
    "notify.refreshing": "מרענן נתונים...",
    "notify.dataRefreshed": "הנתונים רועננו",
    "notify.refreshFailed": "רענון נכשל",
    "notify.exportOk": "הגיבוי נוצר בהצלחה",
    "notify.exportFailed": "כשלון בייצוא המידע: {error}",
    "notify.importOk": "המידע הועלה בהצלחה, טוען מחדש...",
    "notify.importBadFile": "קובץ גיבוי לא תקין",
    "notify.importFailed": "כשלון בעדכון המידע: {error}",
    "notify.usesMissionsTab": "נא להשתמש בניהול המשימות על מנת לערוך את המשימה",

    // ── Confirmation dialogs ──────────────────────────────────
    "confirm.clearDevice": "האם לנקות את כל השדות במכשיר זה?",
    "confirm.clearSite":
      'האם אתה בטוחה שברצונך לנקות {count} מכשירים ב-"{name}"?\n\nפעולה זו תנקה את כל השדות של כל המכשירים באתר.',
    "confirm.deleteRadio": "האם אתה בטוח שברצונך למחוק מכשיר זה?",
    "confirm.deleteSector":
      "האם למחוק את גזרה זו? מחיקה תגרום למחיקת הגזרה, האתרים שלה והמכשירים שלהם!",
    "confirm.deleteSite":
      "האם למחוק אתר זה? פעולה זו תמחק את האתר עם כל המכשירים שבו!",
    "confirm.deleteMission": 'למחוק את המשימה "{name}"?',
    "confirm.archiveMission": "האם להעביר את המשימה הזו לארכיון?",
    "confirm.restoreMission": "האם לאחזר את המשימה הזו לרשימת המשימות הפעילות?",
    "confirm.deleteArchived": "האם אתה בטוח שברצונך למחוק לתמיד את המשימה?",
    "confirm.unsavedChanges": "יש שינויים שלא נשמרו, האם לסגור בכל זאת?",
    "confirm.importData":
      "פעולה זו תדרוס את המידע הקיים, האם אתה בטוח שברצונך להמשיך?",

    // ── Validation errors ─────────────────────────────────────
    "error.freqBandNotDetected": "תחום תדר לא זוהה — בדוק את ערך התדר",
    "error.selectLocation": "נא לבחור אתר או גזרה",
    "error.enterFrequency": "נא להזין תדר",
    "error.freqOutOfRange":
      "התדר חייב להיות בין {min} ל-{max} עבור תחום {band}",
    "error.selectDeviceType": "נא לבחור סוג מכשיר",
    "error.fillRequired": "נא למלא את כל השדות הנדרשים",
    "error.siteNameExists": "כבר קיים אתר עם שם זה",
    "error.sectorNameRequired": "נא להזין שם לגזרה",
    "error.sectorNameExists": "כבר קיימת גזרה עם שם זה",
    "error.missionNameRequired": "נדרש שם למשימה",
    "error.missionOwnerRequired": "נדרש בעלים למשימה",
    "error.missionNoReqs": "נא להוסיף לפחות דרישת מכשיר אחת",
    "error.missionNameExists": "כבר קיימת משימה עם שם זה",
    "error.missionNotFound": "המשימה לא נמצאה",
    "error.missionHasNoReqs": "לא הוגדרו דרישות למשימה",
    "error.missionFulfilled": "כל דרישות המשימה כבר הוקצו",
    "error.linkNameRequired": "נא להזין שם עורק, תדר ותחום תדר",
    "error.linkNameExists": 'שם עורק "{name}" כבר קיים',
    "error.freqAlreadyUsed": 'תדר {freq} כבר בשימוש על ידי "{name}"',
    "error.unknownOwner": 'שורה {row}: בעלים לא ידוע "{owner}" — דולג',
    "error.dupLinkName": 'שורה {row}: שם עורק "{name}" כבר קיים — דולג',
    "error.dupFrequency": "שורה {row}: תדר {freq} MHz כבר קיים — דולג",
    "error.invalidFreq": 'שורה {row}: תדר חסר או לא תקין עבור "{name}"',
    "error.noBandDetected":
      "שורה {row}: לא ניתן לזהות תחום תדר עבור {freq} MHz",
    "error.freqOutOfRangeRow":
      "שורה {row}: {freq} MHz מחוץ לתחום {band} ({min}–{max})",
    "error.saveFailed": 'כשלון בשמירת "{name}" — {error}',

    // ── Excel import row errors ───────────────────────────────
    "import.link.invalidFreq": 'שורה {row}: תדר לא תקין או חסר עבור "{name}"',
    "import.link.nameDup": 'שורה {row}: שם עורק "{name}" כבר קיים — דולג',
    "import.link.freqDup": "שורה {row}: תדר {freq} MHz כבר קיים — דולג",
    "import.link.unknownOwner": 'שורה {row}: בעלים לא מוכר "{name}" — דולג',
    "import.link.saveFailed": 'שורה {row}: שגיאה בשמירת "{name}"',
    "import.mission.bothSectorSite":
      "שורה {row}: יש לציין גזרה או אתר, לא שניהם",
    "import.mission.unknownBand": 'שורה {row}: תחום תדר לא מוכר "{band}"',
    "import.mission.siteNotFound": 'שורה {row}: אתר "{name}" לא נמצא',
    "import.mission.sectorNotFound": 'שורה {row}: גזרה "{name}" לא נמצאה',

    // ── Mission table & button titles ─────────────────────────
    "missions.btn.titleEdit": "ערוך משימה",
    "missions.btn.titleStart": "התחל משימה",
    "missions.btn.titleStandby": "מקם משימה בכוננות",
    "missions.btn.titleEnd": "סיים משימה",
    "missions.btn.titleRestore": "העבר לארכיון",
    "missions.btn.titleDelete": "מחק משימה",
    "missions.failedReqs.title": "דרישות שלא הוקצו",
    "missions.failedReqs.desc":
      "הדרישות הבאות לא הוקצו למכשירים מאחר ולא היו מכשירים זמינים להקצות:",
    "missions.failedReqs.col.band": _he.freqBand,
    "missions.failedReqs.col.loc": "אתר מבוקש",
    "missions.failedReqs.col.freq": "תדר מבוקש",
    "missions.endConfirmMsg": "המשימה תועבר לארכיון ותימחק מהמכשירים המוקצים!",

    // ── Link Dictionary extra ─────────────────────────────────
    "links.noMatches": "לא נמצאו התאמות",
    "links.edit": "עריכה",

    // ── Owner Frequencies tab ─────────────────────────────────
    "ownerfreqs.title": "פלאקט עורקים",
    "ownerfreqs.selectLabel": "בעלים:",
    "ownerfreqs.selectPlaceholder": "בחר בעלים...",
    "ownerfreqs.bandTitle": "תחום תדר: {band}",
    "ownerfreqs.col.frequency": "תדר",
    "ownerfreqs.col.name": "שם התדר",
    "ownerfreqs.col.activeMissions": "משימות פעילות",
    "ownerfreqs.col.plannedMissions": "משימות בתכנון",
    "ownerfreqs.noLinks": "לא קיימים תדרים לבעלים זה.",
    "ownerfreqs.unknownBand": "תחום לא ידוע",

    // ── Summary charts & table headers ────────────────────────
    "summary.chart.usable": "שמיש",
    "summary.chart.unusable": "לא שמיש",
    "summary.chart.active": "משימה פעילה",
    "summary.chart.standby": "בכוננות",
    "summary.chart.free": "פנוי",
    "summary.col.band": "תחום",
    "summary.col.total": "סהכ",
    "summary.col.occupied": "תפוס",
    "summary.col.unusable": "לא בשימוש",
    "summary.col.free": "פנוי",
    "summary.col.freePercent": "% פנוי",
    "summary.noSites": "אין אתרים בגזרה זו.",

    // ── History time strings ──────────────────────────────────
    "history.justNow": "ברגע זה",
    "history.minsAgo": "{n} דק'",
    "history.hoursAgo": "{n} שעות",
    "history.yesterday": "אתמול {time}",
    "history.daysAgo": "{n} יום {time}",

    // ── Selectors ─────────────────────────────────────────────
    "select.deviceType": "בחר סוג מכשיר...",
    "select.noMission": "ללא משימה",
    "select.allMissions": "כל המשימות",
    "select.owner": "בחר בעלים...",
    "select.sector": "בחר גזרה...",
    "select.site": "בחר אתר...",

    // ── Validators ────────────────────────────────────────────
    "validator.validRange": "תחום תדר אפשרי: {min} - {max}",
    "inline.freqConflict": "תדר {frequency} כבר בשימוש על ידי: {types}",
    "inline.invalidNumber": "מספר לא תקין",
    "inline.missionOwnerMismatch":
      'בעל המשימה חייב להיות "{owner}" ולא "{selected}"',

    // ── Additional notifications ──────────────────────────────
    "notify.excelNoNameCol": "לא נמצאה עמודת שם עורק בקובץ",
    "notify.excelNoFreqCol": "לא נמצאה עמודת תדר בקובץ",
    "confirm.deleteLink": "האם למחוק את מיפוי העורק?",

    // ── Sector modal extra ─────────────────────────────────────
    "sector.help": "ערוך פרטים לגזרה הנבחרת",
    "sector.idLabel": "מזהה גזרה",

    // ── Site modal extra ───────────────────────────────────────
    "site.basicInfo": "פרטים בסיסיים",
    "site.idLabel": "מזהה אתר",
    "site.typeSelect": "בחר סוג אתר...",
    "site.typeMobile": "נייד",
    "site.typeFixed": "קבוע",
    "site.coordsSection": "נצ אתר",
    "site.utmLabel": "נצ בפורמט UTM",
    "site.utmPlaceholder": "פורמט UTM",
    "site.utmHelp": "פורמט UTM בלבד",

    // ── Add Radio modal ────────────────────────────────────────
    "radio.addTitle": " הוספת מכשיר קשר חדש",
    "radio.addHelp": "בחר את סוג המכשיר והכמות להוספה לאתר שבחרת",
    "radio.addBtn": "הוספת מכשיר חדש",
    "radio.quantity": "כמות",

    // ── Add / Edit Link modals ─────────────────────────────────
    "addLink.title": "הוספת קישור חדש",
    "addLink.help": "הוסף קישור חדש בין עורק לתדר",
    "addLink.namePlaceholder": "לדוג' עורק ראשי, גיבוי",
    "addLink.freqPlaceholder": "לדוג' 120.5",
    "addLink.bandPlaceholder": "---",
    "addLink.addBtn": "הוספה",
    "editLink.title": "עריכת מיפוי עורק",
    "editLink.help": "עדכן את פרטי מיפוי העורק",

    // ── History initial prompt ─────────────────────────────────
    "history.loadPrompt": "לחץ רענן או עבור ללשונית זו לטעינת ההיסטוריה.",

    // ── Common counters ────────────────────────────────────────
    "common.devicesCount": "{count} מכשירים",
    "common.deviceCount": "{count} מכשירים",
    "notify.missionStandby": "{count} מכשירים מוקמו בכוננות '{name}'",
    "notify.devicesUpdated": "עודכנו {count} מכשירים מוקצים",
    "missions.endConfirmDevices":
      "פעולה זו תנקה {total} מכשירים ({allocated} מוקצים, {extra} נוספים).\n\n",

    // ── Preferences tab ───────────────────────────────────────
    "pref.languageLabel": "שפת ממשק",
    "pref.langChanged": "השפה עודכנה",
    "pref.owners": "בעלים",
    "pref.devices": "סוגי מכשירים",
    "pref.col.light": "בהיר",
    "pref.col.dark": "כהה",
    "pref.col.name": _he.name,
    "pref.col.actions": _he.actions,
    "pref.col.band": _he.band,
    "pref.addOwner": "הוסף בעלים",
    "pref.addDevice": "הוסף מכשיר",
    "pref.label.name": _he.name,
    "pref.label.lightColor": "צבע בהיר",
    "pref.label.darkColor": "צבע כהה",
    "pref.label.autoSuggested": "(מוצע אוטומטית)",
    "pref.label.band": _he.band,
    "pref.btn.add": "הוסף",
    "pref.btn.cancel": "ביטול",
    "pref.confirm.deleteOwner": 'למחוק את הבעלים "{name}"?',
    "pref.confirm.deleteDevice": 'למחוק את המכשיר "{name}"?',
    "pref.notify.ownerAdded": "הבעלים נוסף בהצלחה",
    "pref.notify.ownerDeleted": "הבעלים נמחק",
    "pref.notify.deviceAdded": "המכשיר נוסף בהצלחה",
    "pref.notify.deviceDeleted": "המכשיר נמחק",
    "pref.notify.nameRequired": "שם הבעלים נדרש",
    "pref.notify.devNameRequired": "שם המכשיר נדרש",
    "pref.users": "משתמשים",
    "pref.col.username": "שם משתמש",
    "pref.col.role": "תפקיד",
    "pref.col.lastLogin": "כניסה אחרונה",
    "pref.noUsers": "לא נמצאו משתמשים",
    "pref.notify.userRoleUpdated": "התפקיד עודכן בהצלחה",
    "pref.error.generic": "אירעה שגיאה",
    "pref.error.alreadyExists": "שם זה כבר קיים במערכת",
    "pref.error.nameRequired": "שם הוא שדה חובה",
    "pref.error.bandRequired": "יש לבחור תדר",
    "pref.error.ownerInUse": "לא ניתן למחוק — הבעלים משויך לרכיבים קיימים",
    "pref.error.deviceInUse": "לא ניתן למחוק — מכשירים קיימים משתמשים בסוג זה",
    "pref.error.bandChangeLocked":
      "לא ניתן לשנות תדר — למכשירים מסוג זה יש הקצאות פעילות. יש לנקות אותן תחילה",
    "pref.error.notFound": "הרשומה לא נמצאה",
    "pref.error.invalidBand": "תדר לא חוקי",
  },
};

// ── Core translation function ─────────────────────────────────
// Usage: t("key")  or  t("key", { count: 3, name: "Alpha" })
function t(key, params) {
  const primary = TRANSLATIONS[_currentLang] || {};
  const fallback = TRANSLATIONS["en"] || {};
  let str = primary[key] ?? fallback[key] ?? key;
  if (params) {
    str = str.replace(/\{(\w+)\}/g, (_, k) =>
      params[k] !== undefined ? params[k] : `{${k}}`,
    );
  }
  return str;
}

// ── DOM walker — applies translations to static HTML ──────────
// Elements:  data-i18n="key"               → sets textContent
//            data-i18n-html="key"           → sets innerHTML (use sparingly)
//            data-i18n-placeholder="key"    → sets placeholder attribute
//            data-i18n-title="key"          → sets title attribute
function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const text = t(el.getAttribute("data-i18n"));
    // If the element contains child elements (e.g. <i> icon), update only the
    // trailing text node so the icon is preserved.
    if (el.children.length > 0) {
      for (let i = el.childNodes.length - 1; i >= 0; i--) {
        const node = el.childNodes[i];
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
          node.textContent = " " + text;
          return;
        }
      }
      // No text node found — append one
      el.appendChild(document.createTextNode(" " + text));
    } else {
      el.textContent = text;
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
  });

  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.title = t(el.getAttribute("data-i18n-title"));
  });
}

function getCurrentLang() {
  return _currentLang;
}

function getAvailableLangs() {
  return Object.keys(LANG_NAMES).map((code) => ({
    code,
    label: LANG_NAMES[code],
  }));
}

function setLang(code) {
  if (!TRANSLATIONS[code]) return;
  _currentLang = code;
  localStorage.setItem("mahakesher-lang", code);
  document.documentElement.lang = code;
  applyI18n();
  // Re-translate server status (applyI18n doesn't touch it since we removed data-i18n)
  const _statusEl = document.getElementById("serverStatus");
  if (_statusEl) {
    const _connected = _statusEl.textContent.includes("🟢");
    if (
      _statusEl.textContent.includes("🟢") ||
      _statusEl.textContent.includes("🔴")
    ) {
      _statusEl.textContent = `${_connected ? "🟢" : "🔴"} ${t(_connected ? "server.connected" : "server.disconnected")}`;
    }
  }
  if (window.renderOverview) renderOverview();
  if (window.renderMissionsTab) renderMissionsTab();
  if (window.renderLinksTab) renderLinksTab();
  if (window.renderSummaryTab) renderSummaryTab();
  if (window.renderTimelineTab) renderTimelineTab();
  if (window.renderPreferencesTab) renderPreferencesTab();
  if (window.performSearch) performSearch();
  if (window.showNotification)
    showNotification(t("pref.langChanged"), "success");
}

window.t = t;
window.applyI18n = applyI18n;
window.setLang = setLang;
window.getCurrentLang = getCurrentLang;
window.getAvailableLangs = getAvailableLangs;
window.LANG_NAMES = LANG_NAMES;
