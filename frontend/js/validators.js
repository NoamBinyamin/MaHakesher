// ==================== Frequency Validation ====================

// Core validator: applies range + step checks to a parsed frequency value.
// Returns true if valid, false if not (and updates the UI accordingly).
function _applyFreqValidation(frequency, band, freqInput, errorDiv) {
  const limits = getFrequencyBandLimits(band);
  if (!limits) {
    errorDiv.classList.remove("show");
    freqInput.classList.remove("invalid");
    return true;
  }
  const inRange = frequency >= limits.min && frequency <= limits.max;
  const alignedToStep = isFreqAlignedToStep(frequency, band);
  if (inRange && alignedToStep) {
    errorDiv.classList.remove("show");
    freqInput.classList.remove("invalid");
    return true;
  }
  errorDiv.textContent = !inRange
    ? t("error.freqOutOfRange", { min: limits.min, max: limits.max, band })
    : t("error.freqNotAligned", { step: limits.step, band });
  errorDiv.classList.add("show");
  freqInput.classList.add("invalid");
  return false;
}

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
    const dec = limits.decimals ?? 0;
    const min = Number(limits.min).toFixed(dec);
    const max = Number(limits.max).toFixed(dec);
    const stepPart = limits.step != null
      ? "  |  " + t("validator.step", { step: limits.step })
      : "";
    limitsDiv.textContent = t("validator.validRange", { min, max }) + stepPart;
  }

  frequencyInput.value = "";
  errorDiv.classList.remove("show");
  frequencyInput.classList.remove("invalid");
}

function validateFrequency() {
  const deviceType = document.getElementById("radioDeviceType").value;
  const band = getFrequencyBandForDevice(deviceType);
  const frequencyInput = document.getElementById("radioFrequency");
  const errorDiv = document.getElementById("frequencyError");
  const frequency = parseFloat(frequencyInput.value);

  if (!deviceType || !frequency) {
    errorDiv.classList.remove("show");
    frequencyInput.classList.remove("invalid");
    return true;
  }

  return _applyFreqValidation(frequency, band, frequencyInput, errorDiv);
}

function validateStandbyFrequency() {
  const frequencyInput = document.getElementById("radioStandbyFrequency");
  const errorDiv = document.getElementById("standbyFrequencyError");
  if (!frequencyInput.value) {
    errorDiv.classList.remove("show");
    return true;
  }

  const band = getFrequencyBandForDevice(
    document.getElementById("radioDeviceType").value,
  );
  return _applyFreqValidation(parseFloat(frequencyInput.value), band, frequencyInput, errorDiv);
}

function validateLinkFrequency(freqInputId, bandInputId, errorDivId) {
  const freqInput = document.getElementById(freqInputId);
  const errorDiv = document.getElementById(errorDivId);
  if (!freqInput || !errorDiv) return true;

  const band = document.getElementById(bandInputId)?.value || "";
  const frequency = parseFloat(freqInput.value);

  if (!freqInput.value || isNaN(frequency) || !band) {
    errorDiv.classList.remove("show");
    freqInput.classList.remove("invalid");
    return true;
  }

  return _applyFreqValidation(frequency, band, freqInput, errorDiv);
}

function validateReqFrequency() {
  const freqInput = document.getElementById("reqFrequency");
  const errorDiv = document.getElementById("reqFrequencyError");
  if (!freqInput || !errorDiv) return true;

  const band = document.getElementById("reqFrequencyBand")?.value || "";
  const frequency = parseFloat(freqInput.value);

  if (!freqInput.value || isNaN(frequency) || !band) {
    errorDiv.classList.remove("show");
    freqInput.classList.remove("invalid");
    return true;
  }

  return _applyFreqValidation(frequency, band, freqInput, errorDiv);
}

// Export for inline onclick handlers
window.updateFrequencyBandDisplay = updateFrequencyBandDisplay;
window.validateFrequency = validateFrequency;
window.validateStandbyFrequency = validateStandbyFrequency;
window.validateLinkFrequency = validateLinkFrequency;
window.validateReqFrequency = validateReqFrequency;
