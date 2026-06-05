// ==================== Changelog / What's New ====================

let _changelogData = null;
const _CHANGELOG_SEEN_KEY = "mahakesher-changelog-seen";
const _NEW_BADGE_DAYS = 7;

async function initChangelog() {
  try {
    const res = await fetch("/changelog.json?_=" + Date.now());
    _changelogData = await res.json();
  } catch (_) {
    _changelogData = [];
  }
  _updateChangelogBadge();
}

function _updateChangelogBadge() {
  const badge = document.getElementById("changelogBadge");
  if (!badge || !_changelogData?.length) return;
  const seenDate   = _parseDate(localStorage.getItem(_CHANGELOG_SEEN_KEY) || "") || new Date(0);
  const newestDate = _parseDate(_changelogData[0]?.date || "") || new Date(0);
  badge.style.display = newestDate > seenDate ? "block" : "none";
}

// Applies inline formatting to already-escaped HTML.
// Supported: **text** → bold,  __text__ → underline
function _applyInline(html) {
  return html
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_\n]+)__/g, '<u>$1</u>');
}

// Converts content string into HTML — lines starting with "- " become bullets.
function _renderChangelogContent(text) {
  if (!text) return "";
  const lines = text.split("\n");
  const out = [];
  let inList = false;

  for (const line of lines) {
    if (line.startsWith("- ")) {
      if (!inList) {
        out.push('<ul style="margin:0.2rem 0; padding-inline-start:1.1rem; list-style:disc;">');
        inList = true;
      }
      out.push(`<li style="margin:0.2rem 0; color:var(--gray-600); font-size:0.97rem; line-height:1.55;">${_applyInline(escapeHTML(line.slice(2)))}</li>`);
    } else {
      if (inList) { out.push("</ul>"); inList = false; }
      if (line.trim()) {
        out.push(`<p style="margin:0.25rem 0; font-size:0.97rem; color:var(--gray-600); line-height:1.55;">${_applyInline(escapeHTML(line))}</p>`);
      } else {
        out.push(`<div style="height:0.5rem;"></div>`);
      }
    }
  }
  if (inList) out.push("</ul>");
  return out.join("");
}

// Parse both DD/MM/YYYY and YYYY-MM-DD date formats
function _parseDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr.includes("/")) {
    const [d, m, y] = dateStr.split("/");
    return new Date(`${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`);
  }
  return new Date(dateStr);
}

function _isNew(dateStr) {
  const entryDate = _parseDate(dateStr);
  if (!entryDate || isNaN(entryDate)) return false;
  const cutoff = new Date(Date.now() - _NEW_BADGE_DAYS * 24 * 60 * 60 * 1000);
  return entryDate >= cutoff;
}

function _renderTimelineEntry(entry, isLast) {
  const isNew = _isNew(entry.date);

  const newBadge = isNew
    ? `<span style="background:#10b981; color:white; font-size:0.65rem; font-weight:700; padding:2px 7px; border-radius:99px; flex-shrink:0;">${escapeHTML(t("changelog.new"))}</span>`
    : "";

  const iconHtml = entry.icon
    ? `<span style="font-size:1.15rem; flex-shrink:0;">${entry.icon}</span>`
    : "";

  const dotColor = isNew ? "#10b981" : "var(--primary-color)";

  return `
    <div style="display:flex; gap:0.9rem; align-items:stretch;">

      <!-- Timeline column — no padding so line stretches through the gap between entries -->
      <div style="display:flex; flex-direction:column; align-items:center; flex-shrink:0; padding-top:3px;">
        <div style="
          width:13px; height:13px; border-radius:50%;
          background:${dotColor};
          box-shadow:0 0 0 3px ${dotColor}22;
          flex-shrink:0;
        "></div>
        ${isLast
          ? `<div style="width:2px; height:2rem; background:linear-gradient(to bottom, var(--gray-200), transparent); margin-top:5px;"></div>`
          : `<div style="width:2px; flex:1; background:var(--gray-200); margin-top:5px;"></div>`}
      </div>

      <!-- Content column carries the spacing — line extends through it -->
      <div style="flex:1; min-width:0; padding-bottom:${isLast ? "0.25rem" : "1.75rem"};">

        <!-- Title row -->
        <div style="display:flex; align-items:center; gap:0.45rem; flex-wrap:wrap; margin-bottom:0.4rem;">
          ${iconHtml}
          <span style="font-weight:700; font-size:0.95rem; color:var(--gray-900);">${escapeHTML(entry.title || "")}</span>
          ${newBadge}
          <span style="
            font-size:0.7rem; color:var(--gray-500);
            background:var(--gray-100);
            padding:2px 8px; border-radius:99px;
            white-space:nowrap; font-family:monospace;
            margin-inline-start:auto;
          ">${escapeHTML(entry.date || "")}</span>
        </div>

        <!-- Body content -->
        <div style="
          padding-inline-start:0.65rem;
          border-inline-start:2px solid var(--gray-100);
          margin-top:0.1rem;
        ">
          ${_renderChangelogContent(entry.content || "")}
        </div>

        ${isLast ? "" : `<div style="margin-top:0.9rem; border-top:1px dashed var(--gray-200);"></div>`}

      </div>
    </div>`;
}

function openChangelogModal() {
  if (_changelogData?.length) {
    const d = _parseDate(_changelogData[0].date);
    localStorage.setItem(_CHANGELOG_SEEN_KEY, d ? d.toISOString() : _changelogData[0].date);
    _updateChangelogBadge();
  }

  const existing = document.getElementById("changelogModal");
  if (existing) existing.remove();

  const entries = _changelogData || [];

  const timelineHTML = entries.length
    ? entries.map((entry, i) => _renderTimelineEntry(entry, i === entries.length - 1)).join("")
    : `<p style="color:var(--gray-400); text-align:center; padding:2rem 0;">${escapeHTML(t("changelog.empty"))}</p>`;

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.id = "changelogModal";
  modal.innerHTML = `
    <div class="modal-content" style="max-width:980px; padding:0;">

      <!-- Hero gradient header -->
      <div style="
        background: linear-gradient(135deg, var(--primary-color) 0%, #7c3aed 100%);
        padding: 2rem 1.75rem 1.75rem;
        text-align: center;
        position: relative;
        border-radius: var(--border-radius) var(--border-radius) 0 0;
      ">
        <button onclick="closeChangelogModal()" style="
          position:absolute; top:0.75rem; inset-inline-end:0.75rem;
          background:rgba(255,255,255,0.2); border:none; border-radius:50%;
          width:32px; height:32px; cursor:pointer; color:white; font-size:1.1rem;
          display:flex; align-items:center; justify-content:center;
          transition:background 0.15s;
        " onmouseover="this.style.background='rgba(255,255,255,0.35)'"
           onmouseout="this.style.background='rgba(255,255,255,0.2)'">&times;</button>
        <div style="font-size:2.75rem; line-height:1; margin-bottom:0.6rem; display:inline-block; animation:changelogFloat 2.8s ease-in-out infinite;">🎉</div>
        <h2 style="color:white; margin:0 0 0.3rem; font-size:1.35rem; font-weight:700;">${escapeHTML(t("changelog.title"))}</h2>
        <p style="color:rgba(255,255,255,0.75); margin:0; font-size:0.85rem;">${escapeHTML(t("changelog.subtitle"))}</p>
      </div>

      <!-- Timeline content -->
      <div style="padding:1.5rem 1.75rem 1rem; max-height:60vh; overflow-y:auto; overflow-wrap:break-word; word-break:break-word;">
        ${timelineHTML}
      </div>

      <!-- Footer -->
      <div class="modal-footer" style="border-top:1px solid var(--gray-100);">
        <div></div>
        <div><button class="btn btn-primary" onclick="closeChangelogModal()">${escapeHTML(t("btn.ok"))}</button></div>
      </div>

    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeChangelogModal();
  });
  disableBodyScroll();
}

function closeChangelogModal() {
  const modal = document.getElementById("changelogModal");
  if (modal) modal.remove();
  enableBodyScroll();
}

window.initChangelog       = initChangelog;
window.openChangelogModal  = openChangelogModal;
window.closeChangelogModal = closeChangelogModal;
