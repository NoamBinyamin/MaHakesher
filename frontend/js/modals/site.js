// ==================== Site Modal ====================

function openSiteModal(siteId) {
  const site = window.appState.sites.find((s) => s.id === siteId);
  document.getElementById("siteId").value = site.id;
  document.getElementById("siteIdDisplay").value = site.id;
  document.getElementById("sectorId").value = site.sector_id;
  document.getElementById("siteName").value = site.name;
  document.getElementById("siteCoordinates").value = site.coordinates_utm;
  document.getElementById("siteType").value = site.site_type;
  document.getElementById("siteModalTitle").textContent = t("site.editTitle");
  document.getElementById("deleteSiteBtn").style.display = "block";
  document.getElementById("siteModal").classList.remove("hidden");
  watchModalSaveBtn("siteModal");
  checkModalSaveBtn("siteModal");
  disableBodyScroll();
}

function closeSiteModal() {
  if (!confirmCloseModal("siteModal")) return;
  markModalClean("siteModal");
  document.getElementById("siteModal").classList.add("hidden");
  enableBodyScroll();
}

async function saveSite() {
  const siteId = document.getElementById("siteId").value;
  const sectorId = document.getElementById("sectorId").value;
  const siteName = document.getElementById("siteName").value.trim();

  if (!siteName) {
    showNotification(t("error.fillRequired"), "error");
    return;
  }

  // Check for duplicate name (excluding current site when editing)
  const duplicate = window.appState.sites.find(
    (s) => s.name.toLowerCase() === siteName.toLowerCase() && s.id !== siteId,
  );
  if (duplicate) {
    showNotification(t("error.siteNameExists"), "error");
    return;
  }

  const siteData = {
    name: siteName,
    coordinates_utm: document.getElementById("siteCoordinates").value,
    site_type: document.getElementById("siteType").value,
  };

  await withSaveSpinner("siteModal", async () => {
    if (siteId) {
      await apiCall(`/sites/${siteId}`, "POST", siteData);
    } else {
      await apiCall("/sites", "POST", { ...siteData, sector_id: sectorId });
    }
    showNotification(t("notify.siteSaved"), "success");
    markModalClean("siteModal");
    closeSiteModal();
    await loadAllData();
    renderOverview();
  }).catch(() => showNotification(t("notify.siteSaveFailed"), "error"));
}

async function deleteSite() {
  const siteId = document.getElementById("siteId").value;
  if (!confirm(t("confirm.deleteSite"))) return;

  try {
    await apiCall(`/sites/${siteId}`, "DELETE");
    showNotification(t("notify.siteDeleted"), "success");
    closeSiteModal();
    await loadAllData();
    populateSelects();
    renderOverview();
  } catch (error) {
    showNotification(t("notify.siteDeleteFailed"), "error");
  }
}

function openAddSiteModalForSector(sectorId) {
  document.getElementById("sectorId").value = sectorId;
  document.getElementById("siteId").value = "";
  document.getElementById("siteName").value = "";
  document.getElementById("siteCoordinates").value = "";
  document.getElementById("siteType").value = "Fixed";
  document.getElementById("siteModalTitle").textContent = t("site.addTitle");
  document.getElementById("deleteSiteBtn").style.display = "none";
  document.getElementById("siteModal").classList.remove("hidden");
  watchModalSaveBtn("siteModal");
  checkModalSaveBtn("siteModal");
  disableBodyScroll();
}

// Export for inline onclick handlers
window.openSiteModal = openSiteModal;
window.closeSiteModal = closeSiteModal;
window.saveSite = saveSite;
window.deleteSite = deleteSite;
window.openAddSiteModalForSector = openAddSiteModalForSector;
