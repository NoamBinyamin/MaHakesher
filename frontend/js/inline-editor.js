// ==================== Inline Editor ====================

// Track currently open editor
let activeInlineEditor = null;

// Column configuration: which fields use dropdowns (key matches data-col attribute)
// 1=Frequency Band, 2=Device Type (not editable), 3=Frequency, 4=Owner, 5=Mission,
// 6=Role (editable when no mission), 7=Standby Frequency, 8=Standby Owner, 9=Standby Mission,
// 10=Standby Role (editable when no mission), 11=Status, 12=Notes
const COLUMN_CONFIG = {
  3: { field: "frequency", type: "number" }, // Current Frequency
  4: { field: "owner", type: "owner" }, // Current Owner (dropdown)
  5: { field: "mission_name", type: "mission" }, // Current Mission (dropdown)
  6: { field: "role", type: "text" }, // Current Role (editable when no mission)
  7: { field: "standby_frequency", type: "number" }, // Standby Frequency
  8: { field: "standby_owner", type: "owner" }, // Standby Owner (dropdown)
  9: { field: "standby_mission", type: "mission" }, // Standby Mission (dropdown)
  10: { field: "standby_role", type: "text" }, // Standby Role (editable when no mission)
  11: { field: "status", type: "status" }, // Status (dropdown)
  12: { field: "notes", type: "text" }, // Notes
};

function getDropdownOptions(columnIndex) {
  switch (columnIndex) {
    case 4: // Owner
    case 8: // Standby Owner
      return (window.appState.config.owners || []).map((o) => o.name);
    case 5: // Mission
    case 9: // Standby Mission
      // Use unified function to get only active missions
      return getActiveMissions();
    case 11: // Status
      return ["Usable", "Unusable"];
    default:
      return null;
  }
}

function validateInlineFrequency(value, radio) {
  if (!value || value === "") return { valid: true, value: null };

  const frequency = parseFloat(value);
  if (isNaN(frequency)) return { valid: false, error: "Invalid number" };

  const band = getFrequencyBandForDevice(radio.device_type);
  if (!band) return { valid: true, value: frequency };

  const limits = getFrequencyBandLimits(band);
  if (!limits) return { valid: true, value: frequency };

  if (frequency < limits.min || frequency > limits.max) {
    return {
      valid: false,
      error: t("error.freqOutOfRange", { min: limits.min, max: limits.max, band }),
    };
  }

  return { valid: true, value: frequency };
}

function checkFrequencyConflict(frequency, radio, isStandby) {
  if (!frequency || isNaN(frequency)) return null;

  const siteId = radio.site_id;
  const conflicting = window.appState.radios.filter((r) => {
    if (r.id === radio.id) return false;
    if (r.site_id !== siteId) return false;
    if (r.frequency && Math.abs(r.frequency - frequency) < 0.001) return true;
    if (r.standby_frequency && Math.abs(r.standby_frequency - frequency) < 0.001) return true;
    return false;
  });

  if (conflicting.length > 0) {
    const types = conflicting.map((r) => r.device_type).join(", ");
    return t("inline.freqConflict", { frequency, types });
  }
  return null;
}

function showInlineWarning(cell, message) {
  // Remove existing warning
  const existing = cell.querySelector(".inline-warning");
  if (existing) existing.remove();

  const warningDiv = document.createElement("div");
  warningDiv.className = "inline-warning";
  warningDiv.textContent = message;
  warningDiv.style.cssText =
    "position: absolute; background: #fffbeb; color: #92400e; font-size: 0.75rem; padding: 4px 8px; border: 1px solid #fde68a; border-radius: 4px; z-index: 100; white-space: nowrap; top: 100%;";

  cell.style.position = "relative";
  cell.appendChild(warningDiv);
}

function clearInlineWarning(cell) {
  const existing = cell.querySelector(".inline-warning");
  if (existing) existing.remove();
}

function createEditor(cell, radio, columnIndex) {
  const config = COLUMN_CONFIG[columnIndex];
  if (!config) return null;

  const currentValue = radio[config.field] || "";
  let options = getDropdownOptions(columnIndex);

  // For mission dropdowns, extract mission names from objects
  let optionValues;
  let isMissionDropdown = false;
  if (columnIndex === 5 || columnIndex === 9) {
    isMissionDropdown = true;
    // Missions - options are mission objects, extract names
    optionValues = options.map((m) => (typeof m === "string" ? m : m.name));
  } else {
    optionValues = options;
  }

  let input;

  if (isMissionDropdown) {
    // Always create dropdown for mission fields - even if empty, show "No Mission"
    input = document.createElement("select");
    input.className = "inline-editor-select";
    input.style.cssText =
      "width: 100%; height: 100%; padding: 4px; font-size: inherit; border: 2px solid var(--primary-color);";

    // Add blank option first
    const blankOption = document.createElement("option");
    blankOption.value = "";
    blankOption.textContent = "—";
    input.appendChild(blankOption);

    // Add mission options
    optionValues.forEach((opt) => {
      const option = document.createElement("option");
      option.value = opt;
      option.textContent = opt;
      if (opt === currentValue) option.selected = true;
      input.appendChild(option);
    });
  } else if (optionValues && optionValues.length > 0) {
    // Create dropdown for other fields with options
    input = document.createElement("select");
    input.className = "inline-editor-select";
    input.style.cssText =
      "width: 100%; height: 100%; padding: 4px; font-size: inherit; border: 2px solid var(--primary-color);";

    // Add blank option first, except for Status (column 11)
    if (columnIndex !== 11) {
      const blankOption = document.createElement("option");
      blankOption.value = "";
      blankOption.textContent = "—";
      input.appendChild(blankOption);
    }

    optionValues.forEach((opt) => {
      const option = document.createElement("option");
      option.value = opt;
      option.textContent = columnIndex === 11
        ? t(opt === "Usable" ? "search.statusUsable" : "search.statusUnusable")
        : opt;
      if (opt === currentValue) option.selected = true;
      input.appendChild(option);
    });
  } else {
    // Create text/number input
    input = document.createElement("input");
    input.type = config.type === "number" ? "number" : "text";
    input.className = "inline-editor-input";
    input.value = currentValue;
    input.style.cssText =
      "width: 100%; height: 100%; padding: 4px; font-size: inherit; border: 2px solid var(--primary-color);";

    if (config.type === "number") {
      input.step = "0.025";
      // Set min/max from device type constraints
      const band = getFrequencyBandForDevice(radio.device_type);
      if (band) {
        const limits = getFrequencyBandLimits(band);
        if (limits) {
          input.min = limits.min;
          input.max = limits.max;
        }
      }
    }
  }

  return input;
}

function showInlineError(cell, message) {
  // Remove existing error
  const existingError = cell.querySelector(".inline-error");
  if (existingError) existingError.remove();

  const errorDiv = document.createElement("div");
  errorDiv.className = "inline-error";
  errorDiv.textContent = message;
  errorDiv.style.cssText =
    "position: absolute; background: #fef2f2; color: #721c24; font-size: 0.75rem; padding: 4px 8px; border: 1px solid #fecaca; border-radius: 4px; z-index: 100; white-space: nowrap;";

  cell.style.position = "relative";
  cell.appendChild(errorDiv);

  setTimeout(() => {
    if (errorDiv.parentElement) errorDiv.remove();
  }, 3000);
}

function clearInlineError(cell) {
  const existingError = cell.querySelector(".inline-error");
  if (existingError) existingError.remove();
}

function openInlineEditor(cell, radioId, columnIndex) {
  if (window.guardViewMode && guardViewMode()) return;
  // Close any existing editor first
  closeInlineEditor(true);

  const radio = window.appState.radios.find((r) => r.id === radioId);
  if (!radio) return;

  // Role columns are read-only when a mission is assigned
  if (columnIndex === 6 && radio.mission_name) return;
  if (columnIndex === 10 && radio.standby_mission) return;

  const originalValue = cell.textContent;
  const input = createEditor(cell, radio, columnIndex);

  if (!input) return;

  clearInlineError(cell);
  cell.textContent = "";
  cell.appendChild(input);
  cell.classList.add("editing");

  // Focus and select text for text inputs
  if (input.tagName === "INPUT") {
    input.focus();
    input.select();
  } else {
    input.focus();
  }

  // Live frequency conflict detection
  if (COLUMN_CONFIG[columnIndex] && COLUMN_CONFIG[columnIndex].type === "number") {
    const isStandby = columnIndex === 7;
    input.addEventListener("input", () => {
      clearInlineWarning(cell);
      const val = parseFloat(input.value);
      if (!isNaN(val)) {
        const conflict = checkFrequencyConflict(val, radio, isStandby);
        if (conflict) {
          showInlineWarning(cell, conflict);
        }
      }
    });
  }

  // Handle Enter to save, Escape to cancel, Tab/Shift+Tab to navigate
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveInlineEdit(cell, radioId, columnIndex, input, radio);
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelInlineEdit(cell, originalValue);
    } else if (e.key === "Tab") {
      e.preventDefault();
      saveInlineEdit(cell, radioId, columnIndex, input, radio);
      // Navigate to next/previous editable cell
      setTimeout(() => {
        navigateToNextCell(cell, radioId, columnIndex, e.shiftKey);
      }, 50);
    }
  });

  input.addEventListener("blur", () => {
    // Small delay to allow for dropdown selections to process
    setTimeout(() => {
      if (
        document.activeElement !== input &&
        document.activeElement.parentElement !== input
      ) {
        // Skip blur save for select elements - change event handles it
        if (input.tagName === "SELECT") {
          return;
        }
        clearInlineWarning(cell);
        saveInlineEdit(cell, radioId, columnIndex, input, radio);
      }
    }, 100);
  });

  // For dropdowns, also save on change event
  if (input.tagName === "SELECT") {
    input.addEventListener("change", () => {
      saveInlineEdit(cell, radioId, columnIndex, input, radio);
    });
  }

  activeInlineEditor = { cell, radioId, columnIndex, input, originalValue };
}

function saveInlineEdit(cell, radioId, columnIndex, input, radio) {
  const config = COLUMN_CONFIG[columnIndex];
  if (!config) return;

  // Check if still the active editor (might have been closed)
  if (activeInlineEditor && activeInlineEditor.input !== input) return;

  const newValue = input.value;

  // Check if value changed
  const oldValue = radio[config.field];
  if (
    oldValue === newValue ||
    (oldValue === null && newValue === "") ||
    (oldValue === undefined && newValue === "")
  ) {
    // No change - just restore original display
    cancelInlineEdit(cell, radio[config.field] || "-");
    return;
  }

  // Validate frequency fields
  if (config.type === "number" && newValue !== "") {
    const validation = validateInlineFrequency(newValue, radio);
    if (!validation.valid) {
      showInlineError(cell, validation.error);
      input.focus();
      return;
    }
    // Use parsed value for API call
    input.value = validation.value;
  }

  // Prepare update data - only update the specific field
  const updateData = {
    device_type: radio.device_type,
    frequency: radio.frequency,
    owner: radio.owner,
    mission_name: radio.mission_name,
    role: radio.role,
    standby_frequency: radio.standby_frequency,
    standby_owner: radio.standby_owner,
    standby_mission: radio.standby_mission,
    standby_role: radio.standby_role,
    status: radio.status,
    notes: radio.notes,
  };

  // Set the updated field
  if (newValue === "") {
    updateData[config.field] = null;
  } else if (config.type === "number") {
    updateData[config.field] = parseFloat(newValue);
  } else {
    updateData[config.field] = newValue;
  }

  // Enforce mission/owner matching
  // If updating mission_name (columns 5 or 9), automatically set owner to mission owner
  if ((columnIndex === 5 || columnIndex === 9) && newValue !== "") {
    const missionOwner = getMissionOwner(newValue);
    if (missionOwner) {
      if (columnIndex === 5) {
        // Current mission - update current owner
        updateData.owner = missionOwner;
      } else if (columnIndex === 9) {
        // Standby mission - update standby owner
        updateData.standby_owner = missionOwner;
      }
    }
  }

  // If updating owner (columns 4 or 8), check for mission mismatch
  if ((columnIndex === 4 || columnIndex === 8) && newValue !== "") {
    const currentMissionField =
      columnIndex === 4 ? "mission_name" : "standby_mission";
    const currentMission =
      updateData[currentMissionField] || radio[currentMissionField];

    if (currentMission) {
      const missionOwner = getMissionOwner(currentMission);
      if (missionOwner && missionOwner !== newValue) {
        showInlineError(
          cell,
          `Mission owner must be "${missionOwner}", not "${newValue}"`,
        );
        input.focus();
        return;
      }
    }
  }

  // If clearing a mission, also clear the associated role, owner, and frequency
  if (
    (columnIndex === 5 || columnIndex === 9) &&
    (newValue === "" || newValue === null)
  ) {
    if (columnIndex === 5) {
      updateData.role = null;
      updateData.owner = null;
      updateData.frequency = null;
    } else {
      updateData.standby_role = null;
      updateData.standby_owner = null;
      updateData.standby_frequency = null;
    }
  }

  // Call API to update
  apiCall(`/radios/${radioId}`, "POST", updateData)
    .then(() => {
      showNotification(t("notify.deviceUpdated"), "success");
      // Reload all data to ensure hierarchy is also updated
      loadAllData().then(() => {
        renderOverview();
        if (window.renderMissionsTab) {
          renderMissionsTab();
        }
        // Update search tab if it's active
        if (document.getElementById("search").classList.contains("active") && window.performSearch) {
          performSearch();
        }
      });
    })
    .catch((error) => {
      showNotification(t("notify.deviceUpdateFailed"), "error");
      cancelInlineEdit(cell, oldValue || "-");
    });

  closeInlineEditor(false);
}

function cancelInlineEdit(cell, originalValue) {
  clearInlineError(cell);
  clearInlineWarning(cell);
  cell.textContent = originalValue;
  cell.classList.remove("editing");
  activeInlineEditor = null;
}

function closeInlineEditor(restoreOriginal = true) {
  if (!activeInlineEditor) return;

  const { cell, originalValue } = activeInlineEditor;
  if (restoreOriginal) {
    clearInlineError(cell);
    clearInlineWarning(cell);
    cell.textContent = originalValue;
    cell.classList.remove("editing");
  }
  activeInlineEditor = null;
}

// ==================== Keyboard Navigation ====================

// Editable column indices in order
const EDITABLE_COLUMNS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function navigateToNextCell(currentCell, currentRadioId, currentColumnIndex, reverse) {
  const row = currentCell.closest("tr");
  if (!row) return;

  const currentColPos = EDITABLE_COLUMNS.indexOf(currentColumnIndex);
  if (currentColPos === -1) return;

  if (reverse) {
    // Shift+Tab: go to previous editable cell
    if (currentColPos > 0) {
      // Previous column in same row
      const prevCol = EDITABLE_COLUMNS[currentColPos - 1];
      const prevCell = row.querySelector(`td[data-col="${prevCol}"]`);
      if (prevCell) {
        openInlineEditor(prevCell, currentRadioId, prevCol);
        return;
      }
    }
    // Move to last editable column of previous radio row
    const prevRow = findAdjacentRadioRow(row, true);
    if (prevRow) {
      const prevRadioId = getRadioIdFromRow(prevRow);
      if (prevRadioId) {
        const lastCol = EDITABLE_COLUMNS[EDITABLE_COLUMNS.length - 1];
        const lastCell = prevRow.querySelector(`td[data-col="${lastCol}"]`);
        if (lastCell) {
          openInlineEditor(lastCell, prevRadioId, lastCol);
        }
      }
    }
  } else {
    // Tab: go to next editable cell
    if (currentColPos < EDITABLE_COLUMNS.length - 1) {
      // Next column in same row
      const nextCol = EDITABLE_COLUMNS[currentColPos + 1];
      const nextCell = row.querySelector(`td[data-col="${nextCol}"]`);
      if (nextCell) {
        openInlineEditor(nextCell, currentRadioId, nextCol);
        return;
      }
    }
    // Move to first editable column of next radio row
    const nextRow = findAdjacentRadioRow(row, false);
    if (nextRow) {
      const nextRadioId = getRadioIdFromRow(nextRow);
      if (nextRadioId) {
        const firstCol = EDITABLE_COLUMNS[0];
        const firstCell = nextRow.querySelector(`td[data-col="${firstCol}"]`);
        if (firstCell) {
          openInlineEditor(firstCell, nextRadioId, firstCol);
        }
      }
    }
  }
}

function findAdjacentRadioRow(currentRow, reverse) {
  let sibling = reverse ? currentRow.previousElementSibling : currentRow.nextElementSibling;
  while (sibling) {
    if (sibling.classList.contains("radio-row")) {
      return sibling;
    }
    sibling = reverse ? sibling.previousElementSibling : sibling.nextElementSibling;
  }
  return null;
}

function getRadioIdFromRow(row) {
  // Extract radio ID from an ondblclick attribute in the row
  const editableCell = row.querySelector("td[ondblclick]");
  if (!editableCell) return null;
  const match = editableCell.getAttribute("ondblclick").match(/openInlineEditor\(this,\s*'([^']+)'/);
  return match ? match[1] : null;
}

// Export for inline onclick handlers
window.openInlineEditor = openInlineEditor;
window.closeInlineEditor = closeInlineEditor;
