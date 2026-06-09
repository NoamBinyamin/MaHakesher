// ==================== Timeline Tab ====================

const _TL_DAY_MS = 86400000;
const _TL_ROW_H = 64;
const _TL_AXIS_H = 42;
const _TL_LABEL_W = 220;

function _tlDayWidth(numDays) {
  if (numDays <= 3) return 280;
  if (numDays <= 7) return 200;
  if (numDays <= 14) return 150;
  if (numDays <= 30) return 110;
  if (numDays <= 90) return 75;
  return 52;
}

// DD/MM/YY label for every day column
function _tlDayLabel(date) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(2);
  return `${dd}/${mm}/${yy}`;
}

// Hatching overlay for planned bars
function _tlPlannedFill(ownerColor) {
  return (
    `repeating-linear-gradient(135deg,` +
    ` transparent 0px, transparent 7px,` +
    ` rgba(255,255,255,0.3) 7px, rgba(255,255,255,0.3) 9px),` +
    ` ${ownerColor}`
  );
}

// ── Tooltip helpers ───────────────────────────────────────────────────────────

function _tlGetTooltip() {
  let tip = document.getElementById("tl-mission-tooltip");
  if (!tip) {
    tip = document.createElement("div");
    tip.id = "tl-mission-tooltip";
    tip.style.display = "none";
    document.body.appendChild(tip);
  }
  return tip;
}

function _tlFormatTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yy} ${hh}:${min}`;
}

function _tlShowTooltip(mission, e) {
  const tip = _tlGetTooltip();
  const isDark = document.documentElement.classList.contains("dark");
  const bg = isDark ? "#1e2d45" : "#ffffff";
  const border = isDark ? "rgba(255,255,255,0.12)" : "var(--gray-200)";
  const textMain = isDark ? "#e2e8f0" : "var(--gray-800)";
  const textSub = isDark ? "#94a3b8" : "var(--gray-500)";
  const shadow = isDark
    ? "0 4px 20px rgba(0,0,0,0.5)"
    : "0 4px 16px rgba(0,0,0,0.15)";

  const reqCount = mission.requirements ? mission.requirements.length : 0;
  const ownerColor = mission.owner
    ? getOwnerColor(mission.owner)
    : isDark
      ? "rgba(255,255,255,0.2)"
      : "var(--gray-300)";

  tip.style.cssText = `
    position: fixed;
    z-index: 9999;
    pointer-events: none;
    background: ${bg};
    border: 1px solid ${border};
    border-radius: 10px;
    padding: 0.75rem 1rem;
    box-shadow: ${shadow};
    font-size: 0.82rem;
    min-width: 190px;
    max-width: 270px;
    display: block;
    line-height: 1.6;
    color: ${textMain};
  `;

  const isPlanned = mission.status === "planned";
  const statusLabel = t(isPlanned ? "missions.status.planned" : "missions.status.active");
  const statusColor = isPlanned ? "#f59e0b" : "#22c55e";

  tip.innerHTML = `
    <div style="font-weight:700;font-size:0.9rem;margin-bottom:0.55rem;
                border-right:3px solid ${ownerColor};padding-right:0.45rem;
                white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
      ${escapeHTML(mission.name)}
    </div>
    <div style="display:grid;grid-template-columns:auto 1fr;gap:0.2rem 0.65rem;align-items:baseline;">
      <span style="color:${textSub};font-size:0.74rem;white-space:nowrap;">${t("timeline.tooltip.status")}</span>
      <span>
        <span style="display:inline-flex;align-items:center;gap:0.3rem;font-weight:600;color:${statusColor};">
          <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${statusColor};"></span>
          ${escapeHTML(statusLabel)}
        </span>
      </span>
      <span style="color:${textSub};font-size:0.74rem;white-space:nowrap;">👤 ${t("missions.col.owner")}</span>
      <span>${escapeHTML(mission.owner || "—")}</span>
      <span style="color:${textSub};font-size:0.74rem;white-space:nowrap;">📡 ${t("missions.col.reqs")}</span>
      <span>${reqCount}</span>
      <span style="color:${textSub};font-size:0.74rem;white-space:nowrap;">🕐 ${t("timeline.tooltip.start")}</span>
      <span>${_tlFormatTime(mission.time_start)}</span>
      <span style="color:${textSub};font-size:0.74rem;white-space:nowrap;">🏁 ${t("timeline.tooltip.end")}</span>
      <span>${_tlFormatTime(mission.time_end)}</span>
    </div>
  `;

  _tlMoveTooltip(e);
}

function _tlMoveTooltip(e) {
  const tip = document.getElementById("tl-mission-tooltip");
  if (!tip || tip.style.display === "none") return;
  const margin = 14;
  let x = e.clientX + margin;
  let y = e.clientY - margin;
  const tipW = tip.offsetWidth || 270;
  const tipH = tip.offsetHeight || 130;
  if (x + tipW > window.innerWidth - 8) x = e.clientX - tipW - margin;
  if (y + tipH > window.innerHeight - 8) y = e.clientY - tipH - margin;
  if (y < 8) y = 8;
  tip.style.left = `${x}px`;
  tip.style.top = `${y}px`;
}

function _tlHideTooltip() {
  const tip = document.getElementById("tl-mission-tooltip");
  if (tip) tip.style.display = "none";
}

// ── Annotation color palette ──────────────────────────────────────────────────

const _TL_ANNOTATION_COLORS = [
  '#f59e0b', '#ef4444', '#10b981', '#3b82f6',
  '#8b5cf6', '#ec4899', '#f97316', '#06b6d4',
];

function _tlBuildColorPicker(selectedColor) {
  const color = selectedColor || _TL_ANNOTATION_COLORS[0];
  const picker = document.createElement("div");
  picker.className = "tl-color-picker";
  picker.dataset.selected = color;
  _TL_ANNOTATION_COLORS.forEach((c) => {
    const swatch = document.createElement("span");
    swatch.className = "tl-color-swatch" + (c === color ? " selected" : "");
    swatch.style.background = c;
    swatch.dataset.color = c;
    swatch.addEventListener("click", () => {
      picker.querySelectorAll(".tl-color-swatch").forEach((s) => s.classList.remove("selected"));
      swatch.classList.add("selected");
      picker.dataset.selected = c;
    });
    picker.appendChild(swatch);
  });
  return picker;
}

// ── Status filter state ───────────────────────────────────────────────────────

let _tlStatusFilter = "both"; // "both" | "active" | "planned"

// ── Public entry point ────────────────────────────────────────────────────────

function renderTimelineTab() {
  const container = document.getElementById("timelineContent");
  if (!container) return;
  container.innerHTML = "";
  _tlHideTooltip();
  _tlHideAnnotationTooltip();

  const allMissions = (window.appState.plannedMissions || []).filter(
    (m) => m.status === "active" || m.status === "planned",
  );

  if (allMissions.length === 0) {
    const p = document.createElement("p");
    p.textContent = t("timeline.noMissions");
    p.style.cssText = "color: var(--gray-500); padding: 2rem 0;";
    container.appendChild(p);
    return;
  }

  const missions = allMissions.filter((m) => {
    if (_tlStatusFilter === "active")  return m.status === "active";
    if (_tlStatusFilter === "planned") return m.status === "planned";
    return true;
  });

  const scheduled = missions
    .filter(
      (m) =>
        m.time_start &&
        m.time_end &&
        new Date(m.time_start).getTime() < new Date(m.time_end).getTime(),
    )
    .sort(
      (a, b) => new Date(a.time_start).getTime() - new Date(b.time_start).getTime(),
    );
  const unscheduled = missions.filter(
    (m) =>
      !m.time_start ||
      !m.time_end ||
      new Date(m.time_start).getTime() >= new Date(m.time_end).getTime(),
  );

  // ── Toolbar always rendered (status toggle + admin tools) ────────────────
  const toolbar = document.createElement("div");
  toolbar.className = "timeline-toolbar";
  toolbar.id = "timeline-main-toolbar";

  const statusToggle = document.createElement("div");
  statusToggle.className = "timeline-status-toggle";
  ["both", "active", "planned"].forEach((f) => {
    const btn = document.createElement("button");
    btn.className = `btn btn-sm ${_tlStatusFilter === f ? "btn-primary" : "btn-secondary"}`;
    btn.textContent = t(`timeline.filter.${f}`);
    btn.addEventListener("click", () => { _tlStatusFilter = f; renderTimelineTab(); });
    statusToggle.appendChild(btn);
  });

  const toolbarActions = document.createElement("div");
  toolbarActions.className = "timeline-toolbar-actions";
  toolbarActions.id = "timeline-toolbar-actions";
  toolbarActions.appendChild(statusToggle);

  if (isAdminRole()) {
    const manageNotesBtn = document.createElement("button");
    manageNotesBtn.className = "btn btn-secondary btn-sm";
    manageNotesBtn.innerHTML = `<i class="fa-solid fa-list"></i> ${escapeHTML(t("timeline.manageNotes"))}`;
    manageNotesBtn.addEventListener("click", () => _openAllAnnotationsModal());
    toolbarActions.appendChild(manageNotesBtn);

    const addNoteBtn = document.createElement("button");
    addNoteBtn.className = "btn btn-secondary btn-sm timeline-add-note-btn";
    addNoteBtn.innerHTML = `<i class="fa-solid fa-note-sticky"></i> ${escapeHTML(t("timeline.addNote"))}`;
    addNoteBtn.addEventListener("click", () => _openAddTimelineAnnotationModal());
    toolbarActions.appendChild(addNoteBtn);
  }

  toolbar.appendChild(toolbarActions);
  container.appendChild(toolbar);

  if (missions.length === 0) {
    const p = document.createElement("p");
    p.textContent = t("timeline.noMissions");
    p.style.cssText = "color: var(--gray-500); padding: 2rem 0;";
    container.appendChild(p);
  } else if (scheduled.length > 0) {
    _renderGantt(container, scheduled, toolbarActions);
  } else {
    const p = document.createElement("p");
    p.textContent = t("timeline.noScheduled");
    p.style.cssText =
      "color: var(--gray-500); font-size: 0.9rem; padding: 1rem 0 1.5rem 0;";
    container.appendChild(p);
  }

  if (unscheduled.length > 0) {
    const sec = document.createElement("div");
    sec.style.marginTop = scheduled.length > 0 ? "2.5rem" : "0";

    const hdr = document.createElement("h3");
    hdr.textContent = t("timeline.unscheduled");
    hdr.style.cssText =
      "margin: 0 0 1rem 0; font-size: 1rem; font-weight: 700; color: var(--gray-700);";
    sec.appendChild(hdr);

    const grid = document.createElement("div");
    grid.style.cssText = "display: flex; flex-wrap: wrap; gap: 1rem;";
    unscheduled.forEach((m) => grid.appendChild(_tlCard(m)));
    sec.appendChild(grid);
    container.appendChild(sec);
  }
}

// ── Gantt chart ───────────────────────────────────────────────────────────────

function _renderGantt(container, missions, toolbarActions) {
  // ── Dark mode palette ─────────────────────────────────────────────────────
  const isDark = document.documentElement.classList.contains("dark");
  const c = {
    bgPanel: isDark ? "#1a2235" : "var(--gray-50)",
    bgRow0: isDark ? "#1a2235" : "white",
    bgRow1: isDark ? "#131c2e" : "var(--gray-50)",
    border: isDark ? "rgba(255,255,255,0.08)" : "var(--gray-200)",
    borderHdr: isDark ? "rgba(255,255,255,0.15)" : "var(--gray-300)",
    textMain: isDark ? "#e2e8f0" : "var(--gray-800)",
    textSub: isDark ? "#94a3b8" : "var(--gray-500)",
    textFaint: isDark ? "#475569" : "var(--gray-400)",
    axisLbl: isDark ? "#94a3b8" : "var(--gray-600)",
    axisLblBg: isDark ? "#1a2235" : "var(--gray-50)",
    dayLine: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
  };

  // ── Annotations (grouped by date so multiple notes on the same day share a marker) ─
  const annotationsByDate = {};
  (window.appState.timelineAnnotations || []).forEach((a) => {
    if (!a.date) return;
    const ms = new Date(`${a.date}T00:00:00`).getTime();
    if (isNaN(ms)) return;
    (annotationsByDate[a.date] = annotationsByDate[a.date] || { ms, items: [] }).items.push(a);
  });
  // ── Date range (day-aligned) — scoped to missions only; annotations outside simply don't render ──
  const minStart = Math.min(...missions.map((m) => new Date(m.time_start).getTime()));
  const maxEnd   = Math.max(...missions.map((m) => new Date(m.time_end).getTime()));

  const d0 = new Date(minStart);
  d0.setHours(0, 0, 0, 0);
  const chartStart = d0.getTime();

  const d1 = new Date(maxEnd);
  d1.setHours(0, 0, 0, 0);
  d1.setDate(d1.getDate() + 1);
  const chartEnd = d1.getTime();

  const numDays = Math.max(1, Math.round((chartEnd - chartStart) / _TL_DAY_MS));
  const DAY_W = _tlDayWidth(numDays);
  const totalW = numDays * DAY_W;
  const now = Date.now();

  const toX = (ms) => ((ms - chartStart) / _TL_DAY_MS) * DAY_W;

  // Repeating vertical line every DAY_W pixels — 270deg so lines align from the RIGHT
  const dayLineBg =
    `repeating-linear-gradient(270deg,` +
    ` transparent 0px, transparent ${DAY_W - 1}px,` +
    ` ${c.dayLine} ${DAY_W - 1}px, ${c.dayLine} ${DAY_W}px)`;

  // ── Legend injected into the shared toolbar ───────────────────────────────
  const sharedToolbar = document.getElementById("timeline-main-toolbar");
  if (sharedToolbar) {
    const legend = document.createElement("div");
    legend.className = "timeline-legend";
    legend.innerHTML = `
      <span class="timeline-legend-title">${escapeHTML(t("timeline.legend.title"))}</span>
      <span class="timeline-legend-item">
        <span class="timeline-legend-swatch timeline-legend-swatch-active"></span>
        ${escapeHTML(t("missions.status.active"))}
      </span>
      <span class="timeline-legend-item">
        <span class="timeline-legend-swatch timeline-legend-swatch-planned"></span>
        ${escapeHTML(t("missions.status.planned"))}
      </span>
      <span class="timeline-legend-item">
        <span class="tl-annotation-badge timeline-legend-annotation-badge">
          <i class="fa-solid fa-note-sticky"></i>
        </span>
        ${escapeHTML(t("timeline.annotation.modalTitle"))}
      </span>
    `;
    sharedToolbar.insertBefore(legend, sharedToolbar.firstChild);
  }

  // ── Outer two-panel wrapper ───────────────────────────────────────────────
  // direction: rtl → labelsPanel (first child) sits on the RIGHT
  //                   scrollArea (second child) sits on the LEFT
  const gantt = document.createElement("div");
  gantt.className = "timeline-gantt";
  gantt.style.cssText = `
    display: flex;
    direction: rtl;
    position: relative;
    border: 1px solid ${c.borderHdr};
    border-radius: var(--border-radius-sm);
    overflow: hidden;
    background: ${c.bgPanel};
  `;

  // ── Labels panel (RIGHT – always visible, never scrolls) ──────────────────
  const labelsPanel = document.createElement("div");
  labelsPanel.className = "timeline-labels-panel";
  labelsPanel.style.cssText = `
    width: ${_TL_LABEL_W}px;
    min-width: ${_TL_LABEL_W}px;
    flex-shrink: 0;
    direction: rtl;
    border-left: 2px solid ${c.borderHdr};
    z-index: 2;
    background: ${c.bgPanel};
  `;

  // Axis spacer (same height as axis)
  const lAxisSpacer = document.createElement("div");
  lAxisSpacer.style.cssText = `
    height: ${_TL_AXIS_H}px;
    display: flex;
    align-items: center;
    padding: 0 0.75rem;
    font-size: 0.7rem;
    font-weight: 700;
    color: ${c.axisLbl};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 2px solid ${c.borderHdr};
    background: ${c.bgPanel};
  `;
  lAxisSpacer.textContent = t("missions.col.name");
  labelsPanel.appendChild(lAxisSpacer);

  // One label row per mission
  missions.forEach((mission, i) => {
    const ownerColor = mission.owner ? getOwnerColor(mission.owner) : c.border;
    const bg = i % 2 === 0 ? c.bgRow0 : c.bgRow1;

    const row = document.createElement("div");
    row.className = "tl-label-row";
    row.style.cssText = `
      height: ${_TL_ROW_H}px;
      display: flex;
      align-items: center;
      padding: 0 0.75rem;
      border-bottom: 1px solid ${c.border};
      background: ${bg};
      overflow: hidden;
    `;

    const inner = document.createElement("div");
    inner.style.cssText = `
      border-right: 4px solid ${ownerColor};
      padding-right: 0.5rem;
      overflow: hidden;
      width: 100%;
    `;
    inner.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.4rem; overflow:hidden;">
        <div style="font-size: 0.82rem; font-weight: 700; color: ${c.textMain};
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0;">
          ${escapeHTML(mission.name)}
        </div>
        ${
          mission.status === "planned"
            ? `<span class="tl-status-badge tl-status-planned"><i class="fa-regular fa-clock"></i> ${escapeHTML(t("missions.status.planned"))}</span>`
            : ""
        }
      </div>
      ${
        mission.owner
          ? `<div style="font-size: 0.7rem; color: ${c.textSub}; white-space: nowrap;
                       overflow: hidden; text-overflow: ellipsis; margin-top: 1px;">
             ${escapeHTML(mission.owner)}
           </div>`
          : ""
      }
      <div style="font-size: 0.68rem; color: ${c.textFaint}; margin-top: 1px;">
        📡 ${mission.requirements ? mission.requirements.length : 0}
      </div>
    `;
    row.appendChild(inner);
    labelsPanel.appendChild(row);
  });

  gantt.appendChild(labelsPanel);

  // ── Scroll area (LEFT – grows with days, scrolls horizontally) ────────────
  const scrollArea = document.createElement("div");
  scrollArea.className = "timeline-scroll-area";
  scrollArea.style.cssText = `
    flex: 1;
    overflow-x: auto;
    overflow-y: hidden;
    direction: ltr;
    min-width: 0;
  `;

  // Fixed-width inner canvas (position: relative so nowLine can anchor to it)
  const canvas = document.createElement("div");
  canvas.style.cssText = `
    width: ${totalW}px;
    min-width: ${totalW}px;
    direction: ltr;
    position: relative;
  `;

  // ── Time axis ─────────────────────────────────────────────────────────────
  const axis = document.createElement("div");
  axis.style.cssText = `
    height: ${_TL_AXIS_H}px;
    position: relative;
    overflow: hidden;
    background-color: ${c.bgPanel};
    background-image: ${dayLineBg};
    border-bottom: 2px solid ${c.borderHdr};
  `;

  // Label every day, centered in its column (RTL: day 0 is rightmost), DD/MM/YY format
  for (let d = 0; d < numDays; d++) {
    // In RTL layout day d occupies right: d*DAY_W .. (d+1)*DAY_W
    // Center from left = totalW - (d + 0.5) * DAY_W
    const cx = totalW - (d + 0.5) * DAY_W;
    const dayDate = new Date(chartStart + d * _TL_DAY_MS);

    const lbl = document.createElement("div");
    lbl.style.cssText = `
      position: absolute;
      left: ${cx}px;
      top: 50%;
      transform: translate(-50%, -50%);
      font-size: 0.65rem;
      font-weight: 600;
      color: ${c.axisLbl};
      white-space: nowrap;
      user-select: none;
      direction: ltr;
      background: ${c.axisLblBg};
      padding: 1px 3px;
      border-radius: 2px;
      max-width: ${DAY_W - 4}px;
      overflow: hidden;
    `;
    lbl.textContent = _tlDayLabel(dayDate);
    axis.appendChild(lbl);
  }

  canvas.appendChild(axis);

  // ── Chart body ────────────────────────────────────────────────────────────
  const chartBody = document.createElement("div");
  chartBody.style.cssText = "position: relative;";

  // Mission rows
  missions.forEach((mission, i) => {
    const mStart = new Date(mission.time_start).getTime();
    const mEnd = new Date(mission.time_end).getTime();
    const barX = toX(mStart);
    const barW = Math.max(toX(mEnd) - barX, 4);
    const ownerColor = mission.owner ? getOwnerColor(mission.owner) : c.border;
    const reqCount = mission.requirements ? mission.requirements.length : 0;
    const bg = i % 2 === 0 ? c.bgRow0 : c.bgRow1;
    const isPlanned = mission.status === "planned";

    const row = document.createElement("div");
    row.className = "tl-bar-row";
    row.style.cssText = `
      height: ${_TL_ROW_H}px;
      position: relative;
      border-bottom: 1px solid ${c.border};
      background-color: ${bg};
      background-image: ${dayLineBg};
    `;

    const bar = document.createElement("div");
    bar.className = `timeline-bar${isPlanned ? " timeline-bar-planned" : ""}`;
    bar.style.cssText = `
      position: absolute;
      right: ${barX}px;
      width: ${barW}px;
      top: 10px;
      bottom: 10px;
      background: ${isPlanned ? _tlPlannedFill(ownerColor) : ownerColor};
      border-radius: 5px;
      display: flex;
      align-items: center;
      direction: rtl;
      padding: 0 0.5rem;
      gap: 0.3rem;
      overflow: hidden;
      border: ${isPlanned ? "2px dashed rgba(0,0,0,0.28)" : "1.5px solid rgba(0,0,0,0.12)"};
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      cursor: default;
    `;

    if (isPlanned && barW >= 20) {
      const clock = document.createElement("span");
      clock.style.cssText =
        "flex-shrink: 0; font-size: 0.7rem; color: var(--gray-900);";
      clock.innerHTML = `<i class="fa-regular fa-clock" title="${escapeHTML(t("missions.status.planned"))}"></i>`;
      bar.appendChild(clock);
    }

    if (barW >= 20) {
      const name = document.createElement("span");
      name.style.cssText = `
        font-size: 0.78rem;
        font-weight: 700;
        color: var(--gray-900);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex-shrink: 1;
        min-width: 0;
      `;
      name.textContent = mission.name;
      bar.appendChild(name);
    }

    if (mission.owner && barW >= 110) {
      const dot = document.createElement("span");
      dot.style.cssText =
        "color: rgba(0,0,0,0.25); flex-shrink: 0; font-size: 0.7rem;";
      dot.textContent = "·";
      bar.appendChild(dot);

      const ownerEl = document.createElement("span");
      ownerEl.style.cssText =
        "font-size: 0.7rem; color: var(--gray-700); white-space: nowrap; flex-shrink: 0;";
      ownerEl.textContent = mission.owner;
      bar.appendChild(ownerEl);
    }

    if (barW >= 60) {
      const badge = document.createElement("span");
      badge.className = "timeline-device-badge";
      badge.style.marginLeft = "auto";
      badge.textContent = `📡 ${reqCount}`;
      bar.appendChild(badge);
    }

    bar.addEventListener("mouseenter", (e) => _tlShowTooltip(mission, e));
    bar.addEventListener("mousemove", _tlMoveTooltip);
    bar.addEventListener("mouseleave", _tlHideTooltip);

    if (isAdminRole()) {
      bar.style.cursor = "pointer";
      bar.addEventListener("dblclick", () => {
        _tlHideTooltip();
        window.editMission(mission.id);
      });
    }

    row.appendChild(bar);
    chartBody.appendChild(row);
  });

  canvas.appendChild(chartBody);

  // ── Annotation markers — one flagged dashed line per noted date ───────────
  Object.entries(annotationsByDate).forEach(([dateStr, group]) => {
    const x = toX(group.ms);
    if (x < 0 || x > totalW) return;

    const markerColor = group.items[0]?.color || '#f59e0b';

    const markerLine = document.createElement("div");
    markerLine.className = "tl-annotation-line";
    markerLine.style.cssText = `
      position: absolute;
      right: ${x}px;
      top: ${_TL_AXIS_H}px;
      bottom: 0;
      width: 0;
      border-right: 2px dashed ${markerColor};
      z-index: 15;
      pointer-events: none;
    `;
    canvas.appendChild(markerLine);

    const flag = document.createElement("div");
    flag.className = "tl-annotation-flag";
    flag.style.cssText = `
      position: absolute;
      right: ${x}px;
      top: ${_TL_AXIS_H}px;
      transform: translate(50%, -50%);
      z-index: 16;
      cursor: pointer;
    `;
    flag.innerHTML = `
      <span class="tl-annotation-badge" style="background:${markerColor};">
        <i class="fa-solid fa-note-sticky"></i>${group.items.length > 1 ? ` ${group.items.length}` : ""}
      </span>
    `;
    flag.addEventListener("mouseenter", (e) => _tlShowAnnotationTooltip(dateStr, group.items, e));
    flag.addEventListener("mousemove", _tlMoveAnnotationTooltip);
    flag.addEventListener("mouseleave", _tlHideAnnotationTooltip);
    flag.addEventListener("click", () => { _tlHideAnnotationTooltip(); _openTimelineAnnotationsModal(dateStr, group.items); });
    canvas.appendChild(flag);
  });

  // ── "Now" indicator – appended LAST so it renders on top of everything ────
  const nowX = toX(now); // distance from the RIGHT edge (same scale as bars)
  if (nowX >= 0 && nowX <= totalW) {
    const nowLine = document.createElement("div");
    nowLine.style.cssText = `
      position: absolute;
      right: ${nowX}px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: #ef4444;
      z-index: 20;
      pointer-events: none;
    `;
    const badge = document.createElement("span");
    badge.textContent = t("timeline.now");
    badge.style.cssText = `
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      background: #ef4444;
      color: white;
      font-size: 0.6rem;
      font-weight: 700;
      padding: 2px 5px;
      border-radius: 0 0 3px 3px;
      white-space: nowrap;
    `;
    nowLine.appendChild(badge);
    canvas.appendChild(nowLine); // LAST child → always paints on top
  }

  scrollArea.appendChild(canvas);
  gantt.appendChild(scrollArea);
  container.appendChild(gantt);

  // Scrolls so "now" sits ~30% from the right (70% from the left) of the viewport.
  // nowX is distance from the right edge; "now" sits at (totalW - nowX) from the left.
  const scrollToNow = () => {
    const visW = scrollArea.clientWidth || 600;
    const nowLeft = totalW - nowX; // physical left position of the line
    const target = nowLeft - visW * 0.7; // scroll so "now" is 70 % from left
    scrollArea.scrollLeft = Math.max(0, Math.min(totalW - visW, target));
  };

  // Auto-scroll to "now" on first render
  if (nowX >= 0 && nowX <= totalW) {
    requestAnimationFrame(scrollToNow);

    // ── "Jump to now" toolbar button — re-centers the chart on the current time ─
    const jumpBtn = document.createElement("button");
    jumpBtn.type = "button";
    jumpBtn.className = "btn btn-secondary btn-sm timeline-jump-now-btn";
    jumpBtn.innerHTML = `<i class="fa-solid fa-location-crosshairs"></i> ${escapeHTML(t("timeline.jumpToNow"))}`;
    jumpBtn.title = t("timeline.jumpToNow");
    jumpBtn.addEventListener("click", () => {
      requestAnimationFrame(scrollToNow);
    });
    toolbarActions.prepend(jumpBtn);
  }
}

// ── Unscheduled card ──────────────────────────────────────────────────────────

function _tlCard(mission) {
  const isDark = document.documentElement.classList.contains("dark");
  const ownerColor = mission.owner ? getOwnerColor(mission.owner) : null;
  const cardBg = ownerColor || (isDark ? "#243044" : "var(--gray-100)");
  const reqCount = mission.requirements ? mission.requirements.length : 0;

  // Pick text color based on actual background luminance
  let textMain, textMeta;
  if (ownerColor && ownerColor.startsWith("#")) {
    const fg = contrastColor(ownerColor);
    textMain = fg;
    textMeta =
      fg === "white" ? "rgba(241,245,249,0.75)" : "rgba(30,41,59,0.65)";
  } else {
    textMain = isDark ? "#e2e8f0" : "var(--gray-800)";
    textMeta = isDark ? "#94a3b8" : "var(--gray-600)";
  }

  const isPlanned = mission.status === "planned";

  const card = document.createElement("div");
  card.className = "timeline-card";
  card.style.cssText = `background: ${isPlanned ? _tlPlannedFill(cardBg) : cardBg}; border: 1.5px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"};`;
  card.innerHTML = `
    <div class="timeline-card-name" style="color:${textMain};display:flex;align-items:center;gap:0.4rem;">
      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHTML(mission.name)}</span>
      ${
        isPlanned
          ? `<span class="tl-status-badge tl-status-planned"><i class="fa-regular fa-clock"></i> ${escapeHTML(t("missions.status.planned"))}</span>`
          : ""
      }
    </div>
    ${mission.owner ? `<div class="timeline-card-meta" style="color:${textMeta};">👤 ${escapeHTML(mission.owner)}</div>` : ""}
    <div class="timeline-card-meta" style="color:${textMeta};">📡 ${reqCount}</div>
  `;

  card.addEventListener("mouseenter", (e) => _tlShowTooltip(mission, e));
  card.addEventListener("mousemove", _tlMoveTooltip);
  card.addEventListener("mouseleave", _tlHideTooltip);

  return card;
}

// ── Annotations ───────────────────────────────────────────────────────────────

// "YYYY-MM-DD" → "DD/MM/YYYY"
function _tlFormatDateOnly(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function _tlGetAnnotationTooltip() {
  let tip = document.getElementById("tl-annotation-tooltip");
  if (!tip) {
    tip = document.createElement("div");
    tip.id = "tl-annotation-tooltip";
    tip.style.display = "none";
    document.body.appendChild(tip);
  }
  return tip;
}

function _tlShowAnnotationTooltip(dateStr, annotations, e) {
  const tip = _tlGetAnnotationTooltip();
  const isDark = document.documentElement.classList.contains("dark");
  const bg = isDark ? "#1e2d45" : "#ffffff";
  const border = isDark ? "rgba(255,255,255,0.12)" : "var(--gray-200)";
  const textMain = isDark ? "#e2e8f0" : "var(--gray-800)";
  const textSub = isDark ? "#94a3b8" : "var(--gray-500)";
  const shadow = isDark
    ? "0 4px 20px rgba(0,0,0,0.5)"
    : "0 4px 16px rgba(0,0,0,0.15)";

  tip.style.cssText = `
    position: fixed;
    z-index: 9999;
    pointer-events: none;
    background: ${bg};
    border: 1px solid ${border};
    border-radius: 10px;
    padding: 0.75rem 1rem;
    box-shadow: ${shadow};
    font-size: 0.82rem;
    min-width: 190px;
    max-width: 280px;
    display: block;
    line-height: 1.55;
    color: ${textMain};
  `;

  const itemsHtml = annotations
    .map(
      (a) => `
      <div style="padding: 0.3rem 0; ${annotations.length > 1 ? `border-top: 1px solid ${border};` : ""}">
        <div style="word-break: break-word;">${escapeHTML(a.text)}</div>
      </div>`,
    )
    .join("");

  const tooltipColor = annotations[0]?.color || '#f59e0b';
  tip.innerHTML = `
    <div style="font-weight:700;font-size:0.9rem;margin-bottom:0.4rem;
                border-right:3px solid ${tooltipColor};padding-right:0.45rem;">
      📅 ${escapeHTML(_tlFormatDateOnly(dateStr))}
    </div>
    ${itemsHtml}
  `;

  _tlMoveAnnotationTooltip(e);
}

function _tlMoveAnnotationTooltip(e) {
  const tip = document.getElementById("tl-annotation-tooltip");
  if (!tip || tip.style.display === "none") return;
  const margin = 14;
  let x = e.clientX + margin;
  let y = e.clientY - margin;
  const tipW = tip.offsetWidth || 270;
  const tipH = tip.offsetHeight || 100;
  if (x + tipW > window.innerWidth - 8) x = e.clientX - tipW - margin;
  if (y + tipH > window.innerHeight - 8) y = e.clientY - tipH - margin;
  if (y < 8) y = 8;
  tip.style.left = `${x}px`;
  tip.style.top = `${y}px`;
}

function _tlHideAnnotationTooltip() {
  const tip = document.getElementById("tl-annotation-tooltip");
  if (tip) tip.style.display = "none";
}

// ── Add-note modal (admin only) ───────────────────────────────────────────────

function _openAddTimelineAnnotationModal() {
  const existing = document.getElementById("addTimelineAnnotationModal");
  if (existing) existing.remove();

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.id = "addTimelineAnnotationModal";
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 420px;">
      <div class="modal-header">
        <h3>
          <i class="fa-solid fa-note-sticky" style="color:#f59e0b;margin-left:0.5rem;"></i>
          ${escapeHTML(t("timeline.addNote"))}
        </h3>
        <button class="modal-close" onclick="_closeAddTimelineAnnotationModal()">&times;</button>
      </div>
      <div class="modal-form">
        <div class="form-group">
          <label for="tlAnnotationDate">
            <i class="fa-solid fa-calendar-day" style="color: var(--primary-color); margin-right: 0.4rem"></i>
            <span>${escapeHTML(t("timeline.annotation.date"))}</span>
            <span style="color: var(--danger-color)">*</span>
          </label>
          <input type="date" id="tlAnnotationDate" value="${todayStr}" required />
        </div>
        <div class="form-group">
          <label for="tlAnnotationText">
            <i class="fa-solid fa-pen" style="color: var(--primary-color); margin-right: 0.4rem"></i>
            <span>${escapeHTML(t("timeline.annotation.text"))}</span>
            <span style="color: var(--danger-color)">*</span>
          </label>
          <textarea id="tlAnnotationText" rows="3" placeholder="${escapeHTML(t("timeline.annotation.textPlaceholder"))}" required></textarea>
        </div>
        <div class="form-group">
          <label>
            <i class="fa-solid fa-palette" style="color: var(--primary-color); margin-right: 0.4rem"></i>
            <span>${escapeHTML(t("timeline.annotation.color"))}</span>
          </label>
          <div id="tlAnnotationColorPicker"></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="_closeAddTimelineAnnotationModal()">${escapeHTML(t("btn.cancel"))}</button>
        <button class="btn btn-primary" id="tlAnnotationSaveBtn">${escapeHTML(t("btn.save"))}</button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) _closeAddTimelineAnnotationModal();
  });
  document.getElementById("tlAnnotationColorPicker").appendChild(_tlBuildColorPicker(_TL_ANNOTATION_COLORS[0]));
  document.getElementById("tlAnnotationSaveBtn").addEventListener("click", _submitTimelineAnnotation);
  disableBodyScroll();

  setTimeout(() => document.getElementById("tlAnnotationText")?.focus(), 50);
}

function _closeAddTimelineAnnotationModal() {
  const modal = document.getElementById("addTimelineAnnotationModal");
  if (modal) modal.remove();
  enableBodyScroll();
}

async function _submitTimelineAnnotation() {
  const dateInput = document.getElementById("tlAnnotationDate");
  const textInput = document.getElementById("tlAnnotationText");
  const date = (dateInput?.value || "").trim();
  const text = (textInput?.value || "").trim();

  if (!date || !text) {
    showNotification(t("timeline.annotation.required"), "error");
    return;
  }

  const pickerEl = document.querySelector("#tlAnnotationColorPicker .tl-color-picker");
  const color = pickerEl?.dataset.selected || _TL_ANNOTATION_COLORS[0];

  const saveBtn = document.getElementById("tlAnnotationSaveBtn");
  if (saveBtn) saveBtn.disabled = true;

  try {
    await createTimelineAnnotation({ date, text, color });
    _closeAddTimelineAnnotationModal();
    showNotification(t("notify.annotationAdded"), "success");
    await loadAllData();
    renderTimelineTab();
  } catch (error) {
    showNotification(t("notify.annotationAddFailed", { error: error.message }), "error");
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

// ── Manage-notes modal (per date) ─────────────────────────────────────────────

function _openTimelineAnnotationsModal(dateStr, annotations) {
  const existing = document.getElementById("timelineAnnotationsModal");
  if (existing) existing.remove();

  const adminButtons = (id) => isAdminRole() ? `
    <div class="tl-annotation-card-actions">
      <button class="mission-btn btn-secondary tl-annotation-edit-btn" data-id="${id}" data-tooltip="${escapeHTML(t("btn.edit"))}">
        <i class="fa-solid fa-pen"></i>
      </button>
      <button class="mission-btn btn-danger tl-annotation-delete-btn" data-id="${id}" data-tooltip="${escapeHTML(t("btn.delete"))}">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>` : "";

  const itemsHtml = annotations
    .map(
      (a) => {
        const cardColor = a.color || '#f59e0b';
        return `
      <div class="tl-annotation-note-card" data-id="${a.id}" style="border-inline-start-color:${cardColor};">
        <div class="tl-annotation-note-content">
          <div class="tl-annotation-note-text">${escapeHTML(a.text)}</div>
          <div class="tl-annotation-row-meta">👤 ${escapeHTML(t("timeline.annotation.by"))} ${escapeHTML(a.created_by || "—")} · ${_tlFormatTime(a.created_at)}</div>
        </div>
        ${adminButtons(a.id)}
      </div>`;
      },
    )
    .join("");

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.id = "timelineAnnotationsModal";
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 460px; min-height: 300px; display: flex; flex-direction: column;">
      <div class="modal-header">
        <h3>
          <i class="fa-solid fa-note-sticky" style="color:#f59e0b;margin-left:0.5rem;"></i>
          ${escapeHTML(_tlFormatDateOnly(dateStr))}
        </h3>
        <button class="modal-close" onclick="closeTimelineAnnotationsModal()">&times;</button>
      </div>
      <div class="modal-form" style="gap:0.6rem; flex:1; overflow-y:auto; max-height:55vh;">
        ${itemsHtml}
      </div>
      <div class="modal-footer">
        <div></div>
        <div><button class="btn btn-primary" onclick="closeTimelineAnnotationsModal()">${escapeHTML(t("btn.ok"))}</button></div>
      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeTimelineAnnotationsModal();
  });

  modal.querySelectorAll(".tl-annotation-delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => _confirmDeleteTimelineAnnotation(btn.dataset.id));
  });
  modal.querySelectorAll(".tl-annotation-edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = modal.querySelector(`.tl-annotation-note-card[data-id="${btn.dataset.id}"]`);
      const annotation = annotations.find((a) => a.id === btn.dataset.id);
      if (card && annotation) _startInlineEditAnnotation(card, annotation);
    });
  });

  disableBodyScroll();
}

function closeTimelineAnnotationsModal() {
  const modal = document.getElementById("timelineAnnotationsModal");
  if (modal) modal.remove();
  enableBodyScroll();
}

function _startInlineEditAnnotation(card, annotation, onSaved) {
  const textEl = card.querySelector(".tl-annotation-note-text");
  const metaEl = card.querySelector(".tl-annotation-row-meta");
  const actionsEl = card.querySelector(".tl-annotation-card-actions");
  const contentEl = card.querySelector(".tl-annotation-note-content") || card;
  if (!textEl || card.dataset.editing) return;
  card.dataset.editing = "1";

  const original = annotation.text;
  textEl.style.display = "none";
  if (actionsEl) actionsEl.style.display = "none";

  const dateInput = document.createElement("input");
  dateInput.type = "date";
  dateInput.className = "tl-annotation-edit-date";
  dateInput.value = annotation.date || "";

  const colorPicker = _tlBuildColorPicker(annotation.color || _TL_ANNOTATION_COLORS[0]);

  const textarea = document.createElement("textarea");
  textarea.className = "tl-annotation-edit-textarea";
  textarea.value = original;
  textarea.rows = 3;

  const btnRow = document.createElement("div");
  btnRow.className = "tl-annotation-edit-actions";

  const saveBtn = document.createElement("button");
  saveBtn.className = "btn btn-primary btn-sm";
  saveBtn.textContent = t("btn.save");

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "btn btn-secondary btn-sm";
  cancelBtn.textContent = t("btn.cancel");

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(saveBtn);
  contentEl.insertBefore(dateInput, metaEl);
  contentEl.insertBefore(textarea, metaEl);
  contentEl.insertBefore(colorPicker, metaEl);
  contentEl.insertBefore(btnRow, metaEl);
  dateInput.focus();

  cancelBtn.addEventListener("click", () => {
    dateInput.remove();
    colorPicker.remove();
    textarea.remove();
    btnRow.remove();
    textEl.style.display = "";
    if (actionsEl) actionsEl.style.display = "";
    delete card.dataset.editing;
  });

  saveBtn.addEventListener("click", async () => {
    const newText = textarea.value.trim();
    const newDate = dateInput.value.trim();
    const newColor = colorPicker.dataset.selected || annotation.color || _TL_ANNOTATION_COLORS[0];
    if (!newText || !newDate) {
      showNotification(t("timeline.annotation.required"), "error");
      return;
    }
    saveBtn.disabled = true;
    try {
      await updateTimelineAnnotation(annotation.id, { text: newText, color: newColor, date: newDate });
      showNotification(t("notify.annotationUpdated"), "success");
      if (onSaved) { await onSaved(); return; }
      closeTimelineAnnotationsModal();
      await loadAllData();
      renderTimelineTab();
    } catch (error) {
      showNotification(t("notify.annotationUpdateFailed", { error: error.message }), "error");
      saveBtn.disabled = false;
    }
  });
}

async function _confirmDeleteTimelineAnnotation(id) {
  if (!confirm(t("confirm.deleteTimelineAnnotation"))) return;
  try {
    await deleteTimelineAnnotation(id);
    closeTimelineAnnotationsModal();
    showNotification(t("notify.annotationDeleted"), "success");
    await loadAllData();
    renderTimelineTab();
  } catch (error) {
    showNotification(t("notify.annotationDeleteFailed", { error: error.message }), "error");
  }
}

// ── All annotations management modal ─────────────────────────────────────────

function _openAllAnnotationsModal() {
  const existing = document.getElementById("allAnnotationsModal");
  if (existing) existing.remove();

  const all = [...(window.appState.timelineAnnotations || [])]
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const adminButtons = (id) => `
    <div class="tl-annotation-card-actions">
      <button class="mission-btn btn-secondary tl-annotation-edit-btn" data-id="${id}" data-tooltip="${escapeHTML(t("btn.edit"))}">
        <i class="fa-solid fa-pen"></i>
      </button>
      <button class="mission-btn btn-danger tl-annotation-delete-btn" data-id="${id}" data-tooltip="${escapeHTML(t("btn.delete"))}">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>`;

  const itemsHtml = all.length === 0
    ? `<p style="color:var(--gray-400);text-align:center;padding:2rem 1rem;">${escapeHTML(t("timeline.allNotes.empty"))}</p>`
    : all.map((a) => {
        const cardColor = a.color || '#f59e0b';
        return `
        <div class="tl-annotation-note-card" data-id="${a.id}" style="border-inline-start-color:${cardColor};">
          <div class="tl-annotation-note-content">
            <div class="tl-annotation-note-text">${escapeHTML(a.text)}</div>
            <div class="tl-annotation-row-meta">📅 ${escapeHTML(_tlFormatDateOnly(a.date))}${a.created_by ? ` · 👤 ${escapeHTML(a.created_by)}` : ""}</div>
          </div>
          ${adminButtons(a.id)}
        </div>`;
      }).join("");

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.id = "allAnnotationsModal";
  modal.innerHTML = `
    <div class="modal-content" style="max-width:500px;min-height:300px;display:flex;flex-direction:column;">
      <div class="modal-header">
        <h3>
          <i class="fa-solid fa-note-sticky" style="color:#f59e0b;margin-left:0.5rem;"></i>
          ${escapeHTML(t("timeline.allNotes.title"))}${all.length ? ` (${all.length})` : ""}
        </h3>
        <button class="modal-close" onclick="_closeAllAnnotationsModal()">&times;</button>
      </div>
      <div class="modal-form" style="gap:0.6rem;flex:1;overflow-y:auto;max-height:55vh;">
        ${itemsHtml}
      </div>
      <div class="modal-footer">
        <div></div>
        <div><button class="btn btn-primary" onclick="_closeAllAnnotationsModal()">${escapeHTML(t("btn.ok"))}</button></div>
      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener("click", (e) => { if (e.target === modal) _closeAllAnnotationsModal(); });

  modal.querySelectorAll(".tl-annotation-delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm(t("confirm.deleteTimelineAnnotation"))) return;
      try {
        await deleteTimelineAnnotation(btn.dataset.id);
        showNotification(t("notify.annotationDeleted"), "success");
        await loadAllData();
        renderTimelineTab();
        _openAllAnnotationsModal();
      } catch (error) {
        showNotification(t("notify.annotationDeleteFailed", { error: error.message }), "error");
      }
    });
  });

  modal.querySelectorAll(".tl-annotation-edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = modal.querySelector(`.tl-annotation-note-card[data-id="${btn.dataset.id}"]`);
      const annotation = all.find((a) => a.id === btn.dataset.id);
      if (card && annotation) {
        _startInlineEditAnnotation(card, annotation, async () => {
          _closeAllAnnotationsModal();
          await loadAllData();
          renderTimelineTab();
          _openAllAnnotationsModal();
        });
      }
    });
  });

  disableBodyScroll();
}

function _closeAllAnnotationsModal() {
  const modal = document.getElementById("allAnnotationsModal");
  if (modal) modal.remove();
  enableBodyScroll();
}

window._closeAllAnnotationsModal = _closeAllAnnotationsModal;
window.renderTimelineTab = renderTimelineTab;
