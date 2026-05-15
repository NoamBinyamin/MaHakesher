// ==================== Frequency Validation ====================

function updateFrequencyBandDisplay() {
  const deviceType = document.getElementById("radioDeviceType").value;
  const bandInput = document.getElementById("radioFrequencyBand");
  const limitsDiv = document.getElementById("frequencyBandLimits");
  const frequencyInput = document.getElementById("radioFrequency");
  const errorDiv = document.getElementById("frequencyError");

  if (!deviceType) {
    bandInput.value = "";
    limitsDiv.textContent = "";
    frequencyInput.value = "";
    errorDiv.classList.remove("show");
    return;
  }

  const band = getFrequencyBandForDevice(deviceType);
  bandInput.value = band;

  const limits = getFrequencyBandLimits(band);
  if (limits) {
    limitsDiv.textContent = t("validator.validRange", { min: limits.min, max: limits.max });
  }

  frequencyInput.value = "";
  errorDiv.classList.remove("show");
  frequencyInput.classList.remove("invalid");
}

function validateFrequency() {
  const deviceType = document.getElementById("radioDeviceType").value;
  const band = getFrequencyBandForDevice(deviceType);
  const frequency = parseFloat(document.getElementById("radioFrequency").value);
  const frequencyInput = document.getElementById("radioFrequency");
  const errorDiv = document.getElementById("frequencyError");

  if (!deviceType || !frequency) {
    errorDiv.classList.remove("show");
    frequencyInput.classList.remove("invalid");
    return true;
  }

  const limits = getFrequencyBandLimits(band);
  if (!limits) {
    errorDiv.classList.remove("show");
    frequencyInput.classList.remove("invalid");
    return true;
  }
  const isValid = frequency >= limits.min && frequency <= limits.max;

  if (isValid) {
    errorDiv.classList.remove("show");
    frequencyInput.classList.remove("invalid");
    return true;
  } else {
    errorDiv.textContent = t("error.freqOutOfRange", { min: limits.min, max: limits.max, band });
    errorDiv.classList.add("show");
    frequencyInput.classList.add("invalid");
    return false;
  }
}

function validateStandbyFrequency() {
  const standbyFreqValue = document.getElementById(
    "radioStandbyFrequency",
  ).value;
  if (!standbyFreqValue) {
    document.getElementById("standbyFrequencyError").classList.remove("show");
    return true;
  }

  const deviceType = document.getElementById("radioDeviceType").value;
  const band = getFrequencyBandForDevice(deviceType);
  const frequency = parseFloat(standbyFreqValue);
  const frequencyInput = document.getElementById("radioStandbyFrequency");
  const errorDiv = document.getElementById("standbyFrequencyError");

  const limits = getFrequencyBandLimits(band);
  if (!limits) {
    errorDiv.classList.remove("show");
    frequencyInput.classList.remove("invalid");
    return true;
  }
  const isValid = frequency >= limits.min && frequency <= limits.max;

  if (isValid) {
    errorDiv.classList.remove("show");
    frequencyInput.classList.remove("invalid");
    return true;
  } else {
    errorDiv.textContent = t("error.freqOutOfRange", { min: limits.min, max: limits.max, band });
    errorDiv.classList.add("show");
    frequencyInput.classList.add("invalid");
    return false;
  }
}

// Export for inline onclick handlers
window.updateFrequencyBandDisplay = updateFrequencyBandDisplay;
window.validateFrequency = validateFrequency;
window.validateStandbyFrequency = validateStandbyFrequency;
