// ==================== Timeline Tab ====================

const _TL_DAY_MS  = 86400000;
const _TL_ROW_H   = 64;
const _TL_AXIS_H  = 42;
const _TL_LABEL_W = 220;

function _tlDayWidth(numDays) {
  if (numDays <= 3)  return 280;
  if (numDays <= 7)  return 200;
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
  const bg       = isDark ? "#1e2d45"                  : "#ffffff";
  const border   = isDark ? "rgba(255,255,255,0.12)"   : "var(--gray-200)";
  const textMain = isDark ? "#e2e8f0"                  : "var(--gray-800)";
  const textSub  = isDark ? "#94a3b8"                  : "var(--gray-500)";
  const shadow   = isDark ? "0 4px 20px rgba(0,0,0,0.5)" : "0 4px 16px rgba(0,0,0,0.15)";

  const reqCount   = mission.requirements ? mission.requirements.length : 0;
  const ownerColor = mission.owner ? getOwnerColor(mission.owner)
                                   : (isDark ? "rgba(255,255,255,0.2)" : "var(--gray-300)");

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

  tip.innerHTML = `
    <div style="font-weight:700;font-size:0.9rem;margin-bottom:0.55rem;
                border-right:3px solid ${ownerColor};padding-right:0.45rem;
                white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
      ${escapeHTML(mission.name)}
    </div>
    <div style="display:grid;grid-template-columns:auto 1fr;gap:0.2rem 0.65rem;align-items:baseline;">
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
  if (x + tipW > window.innerWidth - 8)  x = e.clientX - tipW - margin;
  if (y + tipH > window.innerHeight - 8) y = e.clientY - tipH - margin;
  if (y < 8) y = 8;
  tip.style.left = `${x}px`;
  tip.style.top  = `${y}px`;
}

function _tlHideTooltip() {
  const tip = document.getElementById("tl-mission-tooltip");
  if (tip) tip.style.display = "none";
}

// ── Public entry point ────────────────────────────────────────────────────────

function renderTimelineTab() {
  const container = document.getElementById("timelineContent");
  if (!container) return;
  container.innerHTML = "";

  const missions = window.appState.plannedMissions || [];

  if (missions.length === 0) {
    const p = document.createElement("p");
    p.textContent = t("timeline.noMissions");
    p.style.cssText = "color: var(--gray-500); padding: 2rem 0;";
    container.appendChild(p);
    return;
  }

  const scheduled = missions.filter(
    (m) => m.time_start && m.time_end &&
      new Date(m.time_start).getTime() < new Date(m.time_end).getTime()
  );
  const unscheduled = missions.filter(
    (m) => !m.time_start || !m.time_end ||
      new Date(m.time_start).getTime() >= new Date(m.time_end).getTime()
  );

  if (scheduled.length > 0) {
    _renderGantt(container, scheduled);
  } else {
    const p = document.createElement("p");
    p.textContent = t("timeline.noScheduled");
    p.style.cssText = "color: var(--gray-500); font-size: 0.9rem; padding: 1rem 0 1.5rem 0;";
    container.appendChild(p);
  }

  if (unscheduled.length > 0) {
    const sec = document.createElement("div");
    sec.style.marginTop = scheduled.length > 0 ? "2.5rem" : "0";

    const hdr = document.createElement("h3");
    hdr.textContent = t("timeline.unscheduled");
    hdr.style.cssText = "margin: 0 0 1rem 0; font-size: 1rem; font-weight: 700; color: var(--gray-700);";
    sec.appendChild(hdr);

    const grid = document.createElement("div");
    grid.style.cssText = "display: flex; flex-wrap: wrap; gap: 1rem;";
    unscheduled.forEach((m) => grid.appendChild(_tlCard(m)));
    sec.appendChild(grid);
    container.appendChild(sec);
  }
}

// ── Gantt chart ───────────────────────────────────────────────────────────────

function _renderGantt(container, missions) {
  // ── Dark mode palette ─────────────────────────────────────────────────────
  const isDark = document.documentElement.classList.contains("dark");
  const c = {
    bgPanel:   isDark ? "#1a2235" : "var(--gray-50)",
    bgRow0:    isDark ? "#1a2235" : "white",
    bgRow1:    isDark ? "#131c2e" : "var(--gray-50)",
    border:    isDark ? "rgba(255,255,255,0.08)" : "var(--gray-200)",
    borderHdr: isDark ? "rgba(255,255,255,0.15)" : "var(--gray-300)",
    textMain:  isDark ? "#e2e8f0" : "var(--gray-800)",
    textSub:   isDark ? "#94a3b8" : "var(--gray-500)",
    textFaint: isDark ? "#475569" : "var(--gray-400)",
    axisLbl:   isDark ? "#94a3b8" : "var(--gray-600)",
    axisLblBg: isDark ? "#1a2235" : "var(--gray-50)",
    dayLine:   isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
  };

  // ── Date range (day-aligned) ──────────────────────────────────────────────
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
  const DAY_W   = _tlDayWidth(numDays);
  const totalW  = numDays * DAY_W;
  const now     = Date.now();

  const toX = (ms) => ((ms - chartStart) / _TL_DAY_MS) * DAY_W;

  // Repeating vertical line every DAY_W pixels — 270deg so lines align from the RIGHT
  const dayLineBg =
    `repeating-linear-gradient(270deg,` +
    ` transparent 0px, transparent ${DAY_W - 1}px,` +
    ` ${c.dayLine} ${DAY_W - 1}px, ${c.dayLine} ${DAY_W}px)`;

  // ── Outer two-panel wrapper ───────────────────────────────────────────────
  // direction: rtl → labelsPanel (first child) sits on the RIGHT
  //                   scrollArea (second child) sits on the LEFT
  const gantt = document.createElement("div");
  gantt.className = "timeline-gantt";
  gantt.style.cssText = `
    display: flex;
    direction: rtl;
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
      <div style="font-size: 0.82rem; font-weight: 700; color: ${c.textMain};
                  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
        ${escapeHTML(mission.name)}
      </div>
      ${mission.owner
        ? `<div style="font-size: 0.7rem; color: ${c.textSub}; white-space: nowrap;
                       overflow: hidden; text-overflow: ellipsis; margin-top: 1px;">
             ${escapeHTML(mission.owner)}
           </div>`
        : ""}
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
    const mEnd   = new Date(mission.time_end).getTime();
    const barX   = toX(mStart);
    const barW   = Math.max(toX(mEnd) - barX, 4);
    const ownerColor = mission.owner ? getOwnerColor(mission.owner) : c.border;
    const reqCount   = mission.requirements ? mission.requirements.length : 0;
    const bg = i % 2 === 0 ? c.bgRow0 : c.bgRow1;

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
    bar.className = "timeline-bar";
    bar.style.cssText = `
      position: absolute;
      right: ${barX}px;
      width: ${barW}px;
      top: 10px;
      bottom: 10px;
      background: ${ownerColor};
      border-radius: 5px;
      display: flex;
      align-items: center;
      direction: rtl;
      padding: 0 0.5rem;
      gap: 0.3rem;
      overflow: hidden;
      border: 1.5px solid rgba(0,0,0,0.12);
      box-shadow: 0 1px 4px rgba(0,0,0,0.1);
      cursor: default;
    `;

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
      dot.style.cssText = "color: rgba(0,0,0,0.25); flex-shrink: 0; font-size: 0.7rem;";
      dot.textContent = "·";
      bar.appendChild(dot);

      const ownerEl = document.createElement("span");
      ownerEl.style.cssText = "font-size: 0.7rem; color: var(--gray-700); white-space: nowrap; flex-shrink: 0;";
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

    row.appendChild(bar);
    chartBody.appendChild(row);
  });

  canvas.appendChild(chartBody);

  // ── "Now" indicator – appended LAST so it renders on top of everything ────
  const nowX = toX(now);   // distance from the RIGHT edge (same scale as bars)
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
    canvas.appendChild(nowLine);   // LAST child → always paints on top
  }

  scrollArea.appendChild(canvas);
  gantt.appendChild(scrollArea);
  container.appendChild(gantt);

  // Auto-scroll so "now" appears near the RIGHT (label-panel) side of the viewport.
  // nowX is distance from right edge; "now" sits at (totalW - nowX) from the left.
  // We want it at ~30 % from the right  →  70 % from the left of the visible area.
  if (nowX >= 0 && nowX <= totalW) {
    requestAnimationFrame(() => {
      const visW = scrollArea.clientWidth || 600;
      const nowLeft = totalW - nowX;               // physical left position of the line
      const target  = nowLeft - visW * 0.7;        // scroll so "now" is 70 % from left
      scrollArea.scrollLeft = Math.max(0, Math.min(totalW - visW, target));
    });
  }
}

// ── Unscheduled card ──────────────────────────────────────────────────────────

function _tlCard(mission) {
  const ownerColor = mission.owner ? getOwnerColor(mission.owner) : "var(--gray-200)";
  const reqCount   = mission.requirements ? mission.requirements.length : 0;

  const card = document.createElement("div");
  card.className = "timeline-card";
  card.style.cssText = `background: ${ownerColor}; border: 1.5px solid rgba(0,0,0,0.1);`;
  card.innerHTML = `
    <div class="timeline-card-name">${escapeHTML(mission.name)}</div>
    ${mission.owner ? `<div class="timeline-card-meta">👤 ${escapeHTML(mission.owner)}</div>` : ""}
    <div class="timeline-card-meta">📡 ${reqCount}</div>
  `;

  card.addEventListener("mouseenter", (e) => _tlShowTooltip(mission, e));
  card.addEventListener("mousemove", _tlMoveTooltip);
  card.addEventListener("mouseleave", _tlHideTooltip);

  return card;
}

window.renderTimelineTab = renderTimelineTab;
