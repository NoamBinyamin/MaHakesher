// ==================== Sector Modal ====================

function openSectorModal(sectorId) {
  const sector = window.appState.sectors.find((s) => s.id === sectorId);
  document.getElementById("sectorId").value = sector.id;
  document.getElementById("sectorIdDisplay").value = sector.id;
  document.getElementById("sectorName").value = sector.name;
  document.getElementById("sectorModalTitle").textContent = t("sector.editTitle");
  const deleteBtn = document.querySelector("#sectorModal .btn-danger");
  if (deleteBtn) deleteBtn.style.display = "block";
  document.getElementById("sectorModal").classList.remove("hidden");
  disableBodyScroll();
}

function openAddSectorModal() {
  document.getElementById("sectorId").value = "";
  document.getElementById("sectorName").value = "";
  document.getElementById("sectorModalTitle").textContent = t("sector.addTitle");
  const deleteBtn = document.querySelector("#sectorModal .btn-danger");
  if (deleteBtn) deleteBtn.style.display = "none";
  document.getElementById("sectorModal").classList.remove("hidden");
  disableBodyScroll();
}

function closeSectorModal() {
  if (!confirmCloseModal("sectorModal")) return;
  markModalClean("sectorModal");
  document.getElementById("sectorModal").classList.add("hidden");
  enableBodyScroll();
}

async function saveSector() {
  const sectorId = document.getElementById("sectorId").value;
  const sectorName = document.getElementById("sectorName").value.trim();

  if (!sectorName) {
    showNotification(t("error.sectorNameRequired"), "error");
    return;
  }

  // Check for duplicate name (excluding current sector when editing)
  const duplicate = window.appState.sectors.find(
    (s) =>
      s.name.toLowerCase() === sectorName.toLowerCase() && s.id !== sectorId,
  );
  if (duplicate) {
    showNotification(t("error.sectorNameExists"), "error");
    return;
  }

  const sectorData = { name: sectorName };

  try {
    if (sectorId) {
      await apiCall(`/sectors/${sectorId}`, "POST", sectorData);
      showNotification(t("notify.sectorSaved"), "success");
    } else {
      await apiCall("/sectors", "POST", sectorData);
      showNotification(t("notify.sectorSaved"), "success");
    }
    markModalClean("sectorModal");
    closeSectorModal();
    await loadAllData();
    renderOverview();
  } catch (error) {
    showNotification(t("notify.sectorSaveFailed"), "error");
  }
}

async function deleteSector() {
  const sectorId = document.getElementById("sectorId").value;
  if (!confirm(t("confirm.deleteSector"))) return;

  try {
    await apiCall(`/sectors/${sectorId}`, "DELETE");
    showNotification(t("notify.sectorDeleted"), "success");
    closeSectorModal();
    await loadAllData();
    populateSelects();
    renderOverview();
  } catch (error) {
    showNotification(t("notify.sectorDeleteFailed"), "error");
  }
}

// Export for inline onclick handlers
window.openSectorModal = openSectorModal;
window.openAddSectorModal = openAddSectorModal;
window.closeSectorModal = closeSectorModal;
window.saveSector = saveSector;
window.deleteSector = deleteSector;
