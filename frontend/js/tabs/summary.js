// ==================== Summary Tab ====================

window.summaryView = "sites";

let _chartHealth = null;
let _chartMission = null;
let _chartBands = null;

function renderCharts() {
  if (typeof Chart === "undefined") return;

  const radios = window.appState.radios;

  if (_chartHealth) { _chartHealth.destroy(); _chartHealth = null; }
  if (_chartMission) { _chartMission.destroy(); _chartMission = null; }
  if (_chartBands) { _chartBands.destroy(); _chartBands = null; }

  const usable = radios.filter((r) => r.status === "Usable").length;
  const unusable = radios.filter((r) => r.status === "Unusable").length;

  const healthCtx = document.getElementById("chartDeviceHealth");
  if (healthCtx) {
    _chartHealth = new Chart(healthCtx, {
      type: "doughnut",
      data: {
        labels: [t("summary.chart.usable"), t("summary.chart.unusable")],
        datasets: [{ data: [usable, unusable], backgroundColor: ["#059669", "#dc2626"], borderWidth: 0 }],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: "bottom", labels: { font: { size: 12 } } } },
        cutout: "65%",
      },
    });
  }

  const active = radios.filter((r) => r.status === "Usable" && r.mission_name).length;
  const standby = radios.filter((r) => r.status === "Usable" && r.standby_mission && !r.mission_name).length;
  const free = radios.filter((r) => r.status === "Usable" && !r.mission_name && !r.standby_mission).length;

  const missionCtx = document.getElementById("chartMissionCoverage");
  if (missionCtx) {
    _chartMission = new Chart(missionCtx, {
      type: "doughnut",
      data: {
        labels: [t("summary.chart.active"), t("summary.chart.standby"), t("summary.chart.free"), t("summary.chart.unusable")],
        datasets: [{ data: [active, standby, free, unusable], backgroundColor: ["#2563eb", "#d97706", "#059669", "#dc2626"], borderWidth: 0 }],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: "bottom", labels: { font: { size: 12 } } } },
        cutout: "65%",
      },
    });
  }

  const allBands = [...new Set(radios.map((r) => r.frequency_band))].filter(Boolean).sort();
  const freePerBand = [], occupiedPerBand = [], unusablePerBand = [];

  allBands.forEach((band) => {
    const bandRadios = radios.filter((r) => r.frequency_band === band);
    const u = bandRadios.filter((r) => r.status === "Unusable").length;
    const o = bandRadios.filter((r) => r.status === "Usable" && (r.frequency || r.mission_name || r.owner)).length;
    const f = bandRadios.length - u - o;
    freePerBand.push(f);
    occupiedPerBand.push(o);
    unusablePerBand.push(u);
  });

  const bandsCtx = document.getElementById("chartBandDistribution");
  if (bandsCtx) {
    _chartBands = new Chart(bandsCtx, {
      type: "bar",
      data: {
        labels: allBands,
        datasets: [
          { label: t("summary.chart.free"),     data: freePerBand,     backgroundColor: "#059669", borderRadius: 4 },
          { label: t("summary.col.occupied"),   data: occupiedPerBand, backgroundColor: "#2563eb", borderRadius: 4 },
          { label: t("summary.chart.unusable"), data: unusablePerBand, backgroundColor: "#dc2626", borderRadius: 4 },
        ],
      },
      options: {
        responsive: true,
        scales: {
          x: { stacked: true, grid: { display: false } },
          y: { stacked: true, ticks: { stepSize: 1 }, grid: { color: "#f4f4f5" } },
        },
        plugins: { legend: { position: "bottom", labels: { font: { size: 12 } } } },
      },
    });
  }
}

window.setSummaryView = function (view) {
  window.summaryView = view;
  const sitesBtn = document.getElementById("viewSitesBtn");
  const sectorsBtn = document.getElementById("viewSectorsBtn");
  if (sitesBtn && sectorsBtn) {
    if (view === "sites") {
      sitesBtn.className = "btn btn-primary";
      sectorsBtn.className = "btn btn-secondary";
    } else {
      sitesBtn.className = "btn btn-secondary";
      sectorsBtn.className = "btn btn-primary";
    }
  }
  renderSummaryTab();
};

function renderSummaryTab() {
  if (document.getElementById("totalSectors"))
    document.getElementById("totalSectors").textContent =
      window.appState.sectors.length;
  if (document.getElementById("totalSites"))
    document.getElementById("totalSites").textContent =
      window.appState.sites.length;
  if (document.getElementById("totalRadios"))
    document.getElementById("totalRadios").textContent =
      window.appState.radios.length;

  const usable =
    window.appState.radios.filter((r) => r.status === "Usable").length || 0;
  const unusable = window.appState.radios.filter(
    (r) => r.status === "Unusable",
  ).length;

  document.getElementById("usableRadios").textContent = usable;
  document.getElementById("unusableRadios").textContent = unusable;

  const bands = new Set(window.appState.radios.map((r) => r.frequency_band));
  document.getElementById("frequencyBands").textContent = bands.size;

  const container = document.getElementById("radioSummaryContainer");
  if (!container) return;
  container.innerHTML = "";

  const allBands = Array.from(bands).sort();

  renderCharts();

  if (window.summaryView === "sectors") {
    const sectorsGrid = document.createElement("div");
    sectorsGrid.style.display = "grid";
    sectorsGrid.style.gridTemplateColumns =
      "repeat(auto-fill, minmax(400px, 1fr))";
    sectorsGrid.style.gap = "1rem";
    sectorsGrid.style.marginTop = "1rem";
    sectorsGrid.style.marginBottom = "2rem";

    window.appState.sectors.forEach((sector) => {
      const sectorCard = document.createElement("div");
      sectorCard.className = "summary-card-sector";
      sectorCard.style.backgroundColor = "";
      sectorCard.style.padding = "1rem";
      sectorCard.style.borderRadius = "8px";
      sectorCard.style.boxShadow = "var(--box-shadow)";
      sectorCard.style.border = "1px solid var(--gray-200)";

      const sectorHeader = document.createElement("h5");
      sectorHeader.textContent = `${sector.name}`;
      sectorHeader.style.marginTop = "0";
      sectorHeader.style.marginBottom = "0.75rem";
      sectorHeader.style.color = "var(--primary-dark)";
      sectorCard.appendChild(sectorHeader);

      const sectorSites = window.appState.sites.filter(
        (s) => s.sector_id === sector.id,
      );

      const tableResponsive = document.createElement("div");
      tableResponsive.className = "table-responsive";
      tableResponsive.style.margin = "0";

      const table = document.createElement("table");
      table.className = "data-table";
      table.style.fontSize = "0.8rem";

      table.innerHTML = `
        <thead>
          <tr>
            <th style="padding: 0.5rem;">${t("summary.col.band")}</th>
            <th style="padding: 0.5rem;">${t("summary.col.total")}</th>
            <th style="padding: 0.5rem;">${t("summary.col.occupied")}</th>
            <th style="padding: 0.5rem;">${t("summary.col.unusable")}</th>
            <th style="padding: 0.5rem;">${t("summary.col.free")}</th>
            <th style="padding: 0.5rem;">${t("summary.col.freePercent")}</th>
          </tr>
        </thead>
        <tbody>
        </tbody>
      `;

      const tbody = table.querySelector("tbody");
      const sectorRadios = window.appState.radios.filter((r) =>
        sectorSites.some((s) => s.id === r.site_id),
      );

      allBands.forEach((band) => {
        const bandRadios = sectorRadios.filter(
          (r) => r.frequency_band === band,
        );
        const total = bandRadios.length;

        const unusableCount = bandRadios.filter(
          (r) => r.status === "Unusable",
        ).length;
        const occupiedCount = bandRadios.filter(
          (r) =>
            r.status === "Usable" && (r.frequency || r.mission_name || r.owner),
        ).length;

        const freeCount = total - unusableCount - occupiedCount;
        const freePercent =
          total > 0 ? Math.round((freeCount / total) * 100) : 0;

        const row = document.createElement("tr");
        row.innerHTML = `
          <td style="padding: 0.5rem;"><strong>${band}</strong></td>
          <td style="padding: 0.5rem;">${total}</td>
          <td style="padding: 0.5rem;">${occupiedCount}</td>
          <td style="padding: 0.5rem;">${unusableCount}</td>
          <td style="padding: 0.5rem;">${freeCount}</td>
          <td style="padding: 0.5rem;">${freePercent}%</td>
        `;
        tbody.appendChild(row);
      });

      tableResponsive.appendChild(table);
      sectorCard.appendChild(tableResponsive);
      sectorsGrid.appendChild(sectorCard);
    });

    container.appendChild(sectorsGrid);
  } else {
    // Original sites view
    window.appState.sectors.forEach((sector) => {
      const sectorWrapper = document.createElement("div");
      sectorWrapper.style.backgroundColor = "var(--gray-100)";
      sectorWrapper.style.padding = "1.5rem";
      sectorWrapper.style.borderRadius = "8px";
      sectorWrapper.style.marginBottom = "2rem";
      sectorWrapper.style.border = "1px solid var(--gray-200)";

      // Sector Title
      const sectorTitle = document.createElement("h4");
      sectorTitle.textContent = `${sector.name}`;
      sectorTitle.style.marginTop = "0";
      sectorTitle.style.borderBottom = "1px solid var(--gray-300)";
      sectorTitle.style.paddingBottom = "0.5rem";
      sectorWrapper.appendChild(sectorTitle);

      const sectorSites = window.appState.sites.filter(
        (s) => s.sector_id === sector.id,
      );

      if (sectorSites.length === 0) {
        const noSites = document.createElement("p");
        noSites.textContent = t("summary.noSites");
        noSites.style.color = "var(--gray-500)";
        sectorWrapper.appendChild(noSites);
      } else {
        const sitesGrid = document.createElement("div");
        sitesGrid.style.display = "grid";
        sitesGrid.style.gridTemplateColumns =
          "repeat(auto-fill, minmax(400px, 1fr))";
        sitesGrid.style.gap = "1rem";
        sitesGrid.style.marginTop = "1rem";
        sitesGrid.style.marginBottom = "0";

        sectorSites.forEach((site) => {
          const siteCard = document.createElement("div");
          siteCard.className = "summary-card-site";
          siteCard.style.backgroundColor = "";
          siteCard.style.padding = "1rem";
          siteCard.style.borderRadius = "8px";
          siteCard.style.boxShadow = "var(--box-shadow)";
          siteCard.style.border = "1px solid var(--gray-200)";

          const siteHeader = document.createElement("h5");
          siteHeader.textContent = `${site.name}`;
          siteHeader.style.marginTop = "0";
          siteHeader.style.marginBottom = "0.75rem";
          siteHeader.style.color = "var(--primary-dark)";
          siteCard.appendChild(siteHeader);

          const tableResponsive = document.createElement("div");
          tableResponsive.className = "table-responsive";
          tableResponsive.style.margin = "0"; // Reset margin for tighter look

          const table = document.createElement("table");
          table.className = "data-table";
          table.style.fontSize = "0.8rem"; // Smaller text for better fit

          // Define smaller padding explicitly inside table innerHTML
          table.innerHTML = `
            <thead>
              <tr>
                <th style="padding: 0.5rem;">${t("summary.col.band")}</th>
                <th style="padding: 0.5rem;">${t("summary.col.total")}</th>
                <th style="padding: 0.5rem;">${t("summary.col.occupied")}</th>
                <th style="padding: 0.5rem;">${t("summary.col.unusable")}</th>
                <th style="padding: 0.5rem;">${t("summary.col.free")}</th>
                <th style="padding: 0.5rem;">${t("summary.col.freePercent")}</th>
              </tr>
            </thead>
            <tbody>
            </tbody>
          `;

          const tbody = table.querySelector("tbody");
          const siteRadios = window.appState.radios.filter(
            (r) => r.site_id === site.id,
          );

          allBands.forEach((band) => {
            const bandRadios = siteRadios.filter(
              (r) => r.frequency_band === band,
            );
            const total = bandRadios.length;

            const unusableCount = bandRadios.filter(
              (r) => r.status === "Unusable",
            ).length;
            const occupiedCount = bandRadios.filter(
              (r) =>
                r.status === "Usable" &&
                (r.frequency || r.mission_name || r.owner),
            ).length;

            const freeCount = total - unusableCount - occupiedCount;
            const freePercent =
              total > 0 ? Math.round((freeCount / total) * 100) : 0;

            const row = document.createElement("tr");
            row.innerHTML = `
              <td style="padding: 0.5rem;"><strong>${band}</strong></td>
              <td style="padding: 0.5rem;">${total}</td>
              <td style="padding: 0.5rem;">${occupiedCount}</td>
              <td style="padding: 0.5rem;">${unusableCount}</td>
              <td style="padding: 0.5rem;">${freeCount}</td>
              <td style="padding: 0.5rem;">${freePercent}%</td>
            `;
            tbody.appendChild(row);
          });

          tableResponsive.appendChild(table);
          siteCard.appendChild(tableResponsive);
          sitesGrid.appendChild(siteCard);
        });

        sectorWrapper.appendChild(sitesGrid);
      }

      container.appendChild(sectorWrapper);
    });
  }
}

// Export for inline onclick handlers
window.renderSummaryTab = renderSummaryTab;
window.renderCharts = renderCharts;
