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
  const inRange = frequency >= limits.min && frequency <= limits.max;
  const alignedToStep = isFreqAlignedToStep(frequency, band);

  if (inRange && alignedToStep) {
    errorDiv.classList.remove("show");
    frequencyInput.classList.remove("invalid");
    return true;
  } else {
    errorDiv.textContent = !inRange
      ? t("error.freqOutOfRange", { min: limits.min, max: limits.max, band })
      : t("error.freqNotAligned", { step: limits.step, band });
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
  const inRange = frequency >= limits.min && frequency <= limits.max;
  const alignedToStep = isFreqAlignedToStep(frequency, band);

  if (inRange && alignedToStep) {
    errorDiv.classList.remove("show");
    frequencyInput.classList.remove("invalid");
    return true;
  } else {
    errorDiv.textContent = !inRange
      ? t("error.freqOutOfRange", { min: limits.min, max: limits.max, band })
      : t("error.freqNotAligned", { step: limits.step, band });
    errorDiv.classList.add("show");
    frequencyInput.classList.add("invalid");
    return false;
  }
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
  } else {
    errorDiv.textContent = !inRange
      ? t("error.freqOutOfRange", { min: limits.min, max: limits.max, band })
      : t("error.freqNotAligned", { step: limits.step, band });
    errorDiv.classList.add("show");
    freqInput.classList.add("invalid");
    return false;
  }
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
  } else {
    errorDiv.textContent = !inRange
      ? t("error.freqOutOfRange", { min: limits.min, max: limits.max, band })
      : t("error.freqNotAligned", { step: limits.step, band });
    errorDiv.classList.add("show");
    freqInput.classList.add("invalid");
    return false;
  }
}

// Export for inline onclick handlers
window.updateFrequencyBandDisplay = updateFrequencyBandDisplay;
window.validateFrequency = validateFrequency;
window.validateStandbyFrequency = validateStandbyFrequency;
window.validateLinkFrequency = validateLinkFrequency;
window.validateReqFrequency = validateReqFrequency;
