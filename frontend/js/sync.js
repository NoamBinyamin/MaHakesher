// ==================== Live Sync ====================

const POLL_INTERVAL_MS = 10000; // 10 seconds
let _lastKnownTs = 0;

// Reload all data from the server and re-render every tab.
// Called after polling detects a change, on keyboard shortcut, and from preferences.
async function refreshAllData() {
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
  if (
    window.loadHistory && window.renderHistoryTab &&
    document.getElementById("history")?.classList.contains("active")
  ) {
    loadHistory().then(renderHistoryTab);
  }
}

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
      _lastKnownTs = ts;
      return;
    }

    if (ts > _lastKnownTs) {
      _lastKnownTs = ts;

      if (latest && latest.changed_by && latest.changed_by !== getCurrentUsername()) {
        const msg = _buildSyncMessage(latest);
        if (msg) showNotification(msg, "info");
      }

      await refreshAllData();
    }
  } catch (_) {
    // Silent — server may be temporarily unreachable
  }
}

async function _keyboardForceRefresh() {
  try {
    showNotification(t("notify.refreshing"), "info");
    await refreshAllData();
    showNotification(t("notify.dataRefreshed"), "success");
  } catch (_) {
    showNotification(t("notify.refreshFailed"), "error");
  }
}

window.refreshAllData = refreshAllData;
window._startPolling = _startPolling;
window._keyboardForceRefresh = _keyboardForceRefresh;
