// ==================== Link Dictionary Tab ====================

let _linkFilter = null;
let _linkSortCol = null;
let _linkSortDir = 1; // 1 = asc, -1 = desc

function sortLinksBy(col) {
  if (_linkSortCol === col) {
    _linkSortDir *= -1;
  } else {
    _linkSortCol = col;
    _linkSortDir = 1;
  }
  renderLinksTab();
}

function updateSortIndicators() {
  ["link_name", "frequency", "frequency_band", "owner"].forEach((col) => {
    const el = document.getElementById(`sort-${col}`);
    if (!el) return;
    if (col !== _linkSortCol) {
      el.textContent = " ↕";
      el.style.opacity = "0.3";
    } else {
      el.textContent = _linkSortDir === 1 ? " ↑" : " ↓";
      el.style.opacity = "1";
    }
  });
}

function renderLinksTab() {
  const tbody = document.getElementById("linksTableBody");
  tbody.innerHTML = "";

  let links = _linkFilter
    ? window.appState.links.filter((l) => _linkFilter.includes(l.id))
    : [...window.appState.links];

  if (_linkSortCol) {
    links.sort((a, b) => {
      const va = (a[_linkSortCol] ?? "").toString().toLowerCase();
      const vb = (b[_linkSortCol] ?? "").toString().toLowerCase();
      const na = parseFloat(va),
        nb = parseFloat(vb);
      const numeric = !isNaN(na) && !isNaN(nb);
      return (numeric ? na - nb : va.localeCompare(vb)) * _linkSortDir;
    });
  }

  updateSortIndicators();

  links.forEach((link) => {
    const ownerColor = link.owner ? getOwnerColor(link.owner) : null;
    const borderStyle = ownerColor
      ? `border-right: 4px solid ${ownerColor};`
      : "";
    const row = document.createElement("tr");
    row.innerHTML = `
      <td style="${borderStyle}">${escapeHTML(link.link_name)}</td>
      <td>${formatFrequency(link.frequency, link.frequency_band)}</td>
      <td>${escapeHTML(link.frequency_band) || "—"}</td>
      <td>${escapeHTML(link.owner) || "—"}</td>
      <td>${link.generic_role ? `<span class="link-generic-role-badge">${escapeHTML(link.generic_role)}</span>` : "—"}</td>
      <td>
        <button class="btn btn-sm btn-edit" onclick="openEditLinkModal('${link.id}')">${t("links.edit")}</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function lookupLink() {
  const query = document.getElementById("linkLookupInput").value.trim();
  const resultsEl = document.getElementById("linkLookupResults");

  if (!query) {
    resultsEl.style.display = "none";
    _linkFilter = null;
    renderLinksTab();
    return;
  }

  const links = window.appState.links;
  const lq = query.toLowerCase();
  const freqVal = parseFloat(query);

  // Match by name (always) and by frequency (when query is a valid number)
  const nameMatches = links.filter((l) =>
    l.link_name.toLowerCase().includes(lq),
  );
  const freqMatches = !isNaN(freqVal)
    ? links.filter(
        (l) =>
          !nameMatches.includes(l) &&
          (String(l.frequency).startsWith(query) ||
            Math.abs(l.frequency - freqVal) < 0.001),
      )
    : [];

  const matches = [...nameMatches, ...freqMatches];
  _linkFilter = matches.map((l) => l.id);
  renderLinksTab();

  resultsEl.style.display = "block";

  if (matches.length === 0) {
    resultsEl.innerHTML = `<p style="color: var(--gray-500); margin: 0; font-size: 0.9rem; text-align: center;">${t("links.noMatches")}</p>`;
    return;
  }

  const bandTag = (l) =>
    l.frequency_band
      ? `<span style="background: var(--primary-color); color: white; border-radius: 4px; padding: 1px 6px; font-size: 0.75rem; margin-right: 4px;">${escapeHTML(l.frequency_band)}</span>`
      : "";

  const items = [
    ...nameMatches.map(
      (l) => `
      <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; background: var(--gray-50); border-radius: 8px; margin-bottom: 0.5rem;">
        <i class="fa-solid fa-link" style="color: var(--primary-color); width: 16px;"></i>
        <strong style="color: var(--gray-900);">${escapeHTML(l.link_name)}</strong>
        <i class="fa-solid fa-arrow-left" style="color: var(--gray-400); font-size: 0.75rem;"></i>
        ${bandTag(l)}
        <span style="color: var(--gray-600); font-size: 0.9rem;">${formatFrequency(l.frequency, l.frequency_band)} MHz</span>
      </div>`,
    ),
    ...freqMatches.map(
      (l) => `
      <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; background: var(--gray-50); border-radius: 8px; margin-bottom: 0.5rem;">
        <i class="fa-solid fa-wave-square" style="color: var(--info-color); width: 16px;"></i>
        <span style="color: var(--gray-600); font-size: 0.9rem;">${formatFrequency(l.frequency, l.frequency_band)} MHz</span>
        <i class="fa-solid fa-arrow-left" style="color: var(--gray-400); font-size: 0.75rem;"></i>
        ${bandTag(l)}
        <strong style="color: var(--gray-900);">${escapeHTML(l.link_name)}</strong>
      </div>`,
    ),
  ].join("");

  resultsEl.innerHTML = `
    <p style="margin: 0 0 0.6rem 0; font-size: 0.8rem; font-weight: 600; color: var(--gray-500); text-transform: uppercase; letter-spacing: 0.5px;">
      ${matches.length} result${matches.length !== 1 ? "s" : ""}
    </p>
    ${items}
  `;
}

function clearLinkLookup() {
  document.getElementById("linkLookupInput").value = "";
  document.getElementById("linkLookupResults").style.display = "none";
  _linkFilter = null;
  renderLinksTab();
}

// ==================== Excel Import ====================

async function handleLinkExcelUpload(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

      if (rows.length < 2) {
        showNotification(t("notify.excelEmpty"), "error");
        input.value = "";
        return;
      }

      const header = rows[0].map((h) =>
        String(h || "")
          .trim()
          .toLowerCase(),
      );
      const nameIdx = header.findIndex(
        (h) => h.includes("name") || h.includes("link"),
      );
      const freqIdx = header.findIndex(
        (h) => h.includes("freq") || h.includes("mhz"),
      );
      const bandIdx        = header.findIndex((h) => h.includes("band"));
      const ownerIdx       = header.findIndex((h) => h.includes("owner"));
      const genericRoleIdx = header.findIndex(
        (h) => h.includes("generic") || (h.includes("role") && !h.includes("owner")),
      );

      if (nameIdx === -1) {
        showNotification(t("notify.excelNoNameCol"), "error");
        input.value = "";
        return;
      }
      if (freqIdx === -1) {
        showNotification(t("notify.excelNoFreqCol"), "error");
        input.value = "";
        return;
      }

      let imported = 0;
      const errors = [];
      // Track names and frequencies already processed in this batch
      const batchNames = new Set();
      const batchFreqs = new Set();

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const linkName = String(row[nameIdx] || "").trim();
        if (!linkName) continue;

        const frequency = parseFloat(String(row[freqIdx] ?? "").trim());
        if (isNaN(frequency)) {
          errors.push(t("import.link.invalidFreq", { row: i + 1, name: linkName }));
          continue;
        }

        // Auto-detect band if column is absent or cell is empty
        let frequencyBand =
          bandIdx >= 0 ? String(row[bandIdx] || "").trim() : "";
        if (!frequencyBand)
          frequencyBand = getBandForFrequency(frequency) || "";
        if (!frequencyBand) {
          errors.push(t("error.noBandDetected", { row: i + 1, freq: frequency }));
          continue;
        }

        // Validate frequency against band limits
        const limits = (window.appState.config.frequency_bands || {})[
          frequencyBand
        ];
        if (limits && (frequency < limits.min || frequency > limits.max)) {
          errors.push(
            t("error.freqOutOfRangeRow", {
              row: i + 1,
              freq: frequency,
              band: frequencyBand,
              min: limits.min,
              max: limits.max,
            }),
          );
          continue;
        }

        // Check duplicate link name (existing DB + current batch)
        const nameLower = linkName.toLowerCase();
        const dupName = (window.appState.links || []).find(
          (l) => l.link_name.toLowerCase() === nameLower,
        );
        if (dupName || batchNames.has(nameLower)) {
          errors.push(t("import.link.nameDup", { row: i + 1, name: linkName }));
          continue;
        }

        // Check duplicate frequency (existing DB + current batch)
        const dupFreq = (window.appState.links || []).find(
          (l) => Math.abs(Number(l.frequency) - frequency) < 0.001,
        );
        if (dupFreq || batchFreqs.has(frequency)) {
          errors.push(t("import.link.freqDup", { row: i + 1, freq: frequency }));
          continue;
        }

        const owner       = ownerIdx       >= 0 ? String(row[ownerIdx]       || "").trim() : "";
        const genericRole = genericRoleIdx >= 0 ? String(row[genericRoleIdx] || "").trim() : "";

        // Validate owner against known list (empty owner is allowed)
        if (owner) {
          const knownOwners = window.appState.config.owners || [];
          const ownerValid = knownOwners.some(
            (o) => o.name.toLowerCase() === owner.toLowerCase(),
          );
          if (!ownerValid) {
            errors.push(t("import.link.unknownOwner", { row: i + 1, name: owner }));
            continue;
          }
        }

        try {
          await apiCall("/links", "POST", {
            link_name: linkName,
            frequency,
            frequency_band: frequencyBand,
            owner: owner || null,
            generic_role: genericRole || null,
          });
          imported++;
          batchNames.add(nameLower);
          batchFreqs.add(frequency);
        } catch (err) {
          errors.push(t("import.link.saveFailed", { row: i + 1, name: linkName }));
        }
      }

      input.value = "";
      await loadLinks();
      renderLinksTab();

      if (errors.length > 0) {
        _showLinkImportErrors(errors, imported);
      } else if (imported > 0) {
        showNotification(t("notify.linksImported", { count: imported }), "success");
      } else {
        showNotification(t("notify.noValidLinks"), "warning");
      }
    } catch (err) {
      console.error("Excel parse error:", err);
      showNotification(
        t("notify.excelParseFailed", { error: err.message }),
        "error",
      );
    }
  };
  reader.readAsArrayBuffer(file);
}

function _showLinkImportErrors(errors, imported) {
  const existing = document.getElementById("linkImportErrorsModal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.id = "linkImportErrorsModal";
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 560px;">
      <div class="modal-header">
        <h3 style="color: var(--warning-color);">
          <i class="fa-solid fa-triangle-exclamation" style="margin-right: 0.5rem;"></i>
          ${t("excel.linkImportTitle")}
        </h3>
        <button class="modal-close" onclick="closeLinkImportErrorsModal()">&times;</button>
      </div>
      <div class="modal-form">
        <p style="margin-bottom: 1rem; color: var(--gray-700);">
          <strong>${t("excel.linkSuccess", { count: imported })}</strong>
          <strong style="color: var(--danger-color);">${t("excel.rowsSkipped", { count: errors.length })}:</strong>
        </p>
        <ul style="margin: 0; padding-right: 1.25rem; color: var(--gray-600); font-size: 0.875rem; line-height: 1.9;">
          ${errors.map((e) => `<li>${escapeHTML(e)}</li>`).join("")}
        </ul>
      </div>
      <div class="modal-footer">
        <div></div>
        <div><button class="btn btn-primary" onclick="closeLinkImportErrorsModal()">OK</button></div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener("click", (ev) => {
    if (ev.target === modal) closeLinkImportErrorsModal();
  });
}

function closeLinkImportErrorsModal() {
  const modal = document.getElementById("linkImportErrorsModal");
  if (modal) modal.remove();
}

function downloadLinkTemplate() {
  const template = [
    ["Link Name", "Frequency", "Band", "Owner", "Generic Role"],
    ["NAME", "FREQUENCY", "FREQUENCY-BAND", "OWNER-NAME", "ROLE (optional)"],
  ];
  const ws = XLSX.utils.aoa_to_sheet(template);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Links");
  ws["!cols"] = [{ wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 20 }, { wch: 18 }];
  XLSX.writeFile(wb, "link_dictionary_template.xlsx");
}

// Export for inline onclick handlers
window.renderLinksTab = renderLinksTab;
window.sortLinksBy = sortLinksBy;
window.lookupLink = lookupLink;
window.clearLinkLookup = clearLinkLookup;
window.handleLinkExcelUpload = handleLinkExcelUpload;
window.downloadLinkTemplate = downloadLinkTemplate;
window.closeLinkImportErrorsModal = closeLinkImportErrorsModal;
