// ==================== Link Dictionary Modals ====================

function updateLinkBand(freqInputId, bandInputId) {
  const freq = parseFloat(document.getElementById(freqInputId).value);
  const band = !isNaN(freq) ? getBandForFrequency(freq) : null;
  document.getElementById(bandInputId).value = band || "";
}

function openAddLinkModal() {
  document.getElementById("linkName").value = "";
  document.getElementById("linkFrequency").value = "";
  document.getElementById("linkFrequencyBand").value = "";
  document.getElementById("linkOwner").value = "";
  document.getElementById("linkGenericRole").value = "";
  if (window.populateSelects) window.populateSelects();
  document.getElementById("addLinkModal").classList.remove("hidden");
  disableBodyScroll();
}

function closeAddLinkModal() {
  document.getElementById("addLinkModal").classList.add("hidden");
  enableBodyScroll();
}

async function saveNewLink() {
  const linkData = {
    link_name: document.getElementById("linkName").value,
    frequency: parseFloat(document.getElementById("linkFrequency").value),
    frequency_band: document.getElementById("linkFrequencyBand").value || null,
    owner: document.getElementById("linkOwner").value,
    generic_role: document.getElementById("linkGenericRole").value.trim() || null,
  };

  if (!linkData.link_name || !linkData.frequency || !linkData.frequency_band) {
    showNotification(t("error.linkNameRequired"), "error");
    return;
  }

  const dupName = window.appState.links.find(
    (l) => l.link_name.toLowerCase() === linkData.link_name.toLowerCase()
  );
  if (dupName) {
    showNotification(t("error.linkNameExists", { name: linkData.link_name }), "error");
    return;
  }

  const dupFreq = window.appState.links.find(
    (l) => Math.abs(l.frequency - linkData.frequency) < 0.001
  );
  if (dupFreq) {
    showNotification(t("error.freqAlreadyUsed", { freq: linkData.frequency, name: dupFreq.link_name }), "error");
    return;
  }

  try {
    await apiCall("/links", "POST", linkData);
    showNotification(t("notify.linkSaved"), "success");
    closeAddLinkModal();
    await loadLinks();
    renderLinksTab();
  } catch (error) {
    showNotification(t("notify.linkSaveFailed"), "error");
  }
}

function openEditLinkModal(linkId) {
  const link = window.appState.links.find((l) => l.id === linkId);
  if (window.populateSelects) window.populateSelects();
  document.getElementById("editLinkId").value = link.id;
  document.getElementById("editLinkName").value = link.link_name;
  document.getElementById("editLinkFrequency").value = link.frequency;
  document.getElementById("editLinkFrequencyBand").value =
    link.frequency_band || (link.frequency ? getBandForFrequency(parseFloat(link.frequency)) : "") || "";
  document.getElementById("editLinkOwner").value = link.owner || "";
  document.getElementById("editLinkGenericRole").value = link.generic_role || "";
  document.getElementById("editLinkModal").classList.remove("hidden");
  disableBodyScroll();
}

function closeEditLinkModal() {
  document.getElementById("editLinkModal").classList.add("hidden");
  enableBodyScroll();
}

async function saveEditLink() {
  const linkId = document.getElementById("editLinkId").value;
  const linkData = {
    link_name: document.getElementById("editLinkName").value,
    frequency: parseFloat(document.getElementById("editLinkFrequency").value),
    frequency_band: document.getElementById("editLinkFrequencyBand").value || null,
    owner: document.getElementById("editLinkOwner").value,
    generic_role: document.getElementById("editLinkGenericRole").value.trim() || null,
  };

  if (!linkData.link_name || !linkData.frequency || !linkData.frequency_band) {
    showNotification(t("error.linkNameRequired"), "error");
    return;
  }

  const dupName = window.appState.links.find(
    (l) => l.id !== linkId && l.link_name.toLowerCase() === linkData.link_name.toLowerCase()
  );
  if (dupName) {
    showNotification(t("error.linkNameExists", { name: linkData.link_name }), "error");
    return;
  }

  const dupFreq = window.appState.links.find(
    (l) => l.id !== linkId && Math.abs(l.frequency - linkData.frequency) < 0.001
  );
  if (dupFreq) {
    showNotification(t("error.freqAlreadyUsed", { freq: linkData.frequency, name: dupFreq.link_name }), "error");
    return;
  }

  try {
    await apiCall(`/links/${linkId}`, "POST", linkData);
    showNotification(t("notify.linkUpdated"), "success");
    closeEditLinkModal();
    await loadLinks();
    renderLinksTab();
  } catch (error) {
    showNotification(t("notify.linkUpdateFailed"), "error");
  }
}

async function deleteLink() {
  const linkId = document.getElementById("editLinkId").value;
  if (!confirm(t("confirm.deleteLink"))) return;

  try {
    await apiCall(`/links/${linkId}`, "DELETE");
    showNotification(t("notify.linkDeleted"), "success");
    closeEditLinkModal();
    await loadLinks();
    renderLinksTab();
  } catch (error) {
    showNotification(t("notify.linkDeleteFailed"), "error");
  }
}

// Export for inline onclick handlers
window.updateLinkBand = updateLinkBand;
window.openAddLinkModal = openAddLinkModal;
window.closeAddLinkModal = closeAddLinkModal;
window.saveNewLink = saveNewLink;
window.openEditLinkModal = openEditLinkModal;
window.closeEditLinkModal = closeEditLinkModal;
window.saveEditLink = saveEditLink;
window.deleteLink = deleteLink;
