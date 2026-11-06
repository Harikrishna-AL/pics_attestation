// PICS blue theme for Chart.js (visual styling only - no data/logic changes)
// Load right after chart.js and before any chart is created.
(function () {
  if (!window.Chart) return;

  try {
    const pal = ["#1e40af", "#3b82f6", "#0ea5e9", "#60a5fa", "#1d4ed8", "#38bdf8", "#93c5fd", "#0369a1", "#7dd3fc", "#2563eb", "#0a1f44", "#bfdbfe"];
    const FONT = "'Poppins', system-ui, sans-serif";
    const INK = "#14213d", MUTED = "#8a97b4", GRID = "rgba(37,99,235,0.08)";

    // ---------- global look ----------
    Chart.defaults.font.family = FONT;
    Chart.defaults.font.size = 11.5;
    Chart.defaults.color = MUTED;
    Chart.defaults.borderColor = GRID;
    if (Chart.defaults.plugins.colors) Chart.defaults.plugins.colors.enabled = false;
    Chart.defaults.animation.duration = 1000;
    Chart.defaults.animation.easing = "easeOutQuart";

    const legend = Chart.defaults.plugins.legend.labels;
    legend.usePointStyle = true;
    legend.pointStyle = "circle";
    legend.boxWidth = 8;
    legend.boxHeight = 8;
    legend.padding = 16;
    legend.color = "#4b5a7a";
    legend.font = { family: FONT, size: 11.5, weight: "500" };

    const tip = Chart.defaults.plugins.tooltip;
    tip.backgroundColor = "rgba(10,31,68,0.95)";
    tip.titleColor = "#fff";
    tip.bodyColor = "#dbeafe";
    tip.titleFont = { family: FONT, size: 12, weight: "600" };
    tip.bodyFont = { family: FONT, size: 12 };
    tip.padding = 12;
    tip.cornerRadius = 10;
    tip.caretSize = 6;
    tip.boxPadding = 6;
    tip.usePointStyle = true;
    tip.borderColor = "rgba(96,165,250,0.35)";
    tip.borderWidth = 1;

    // axes: clean, no borders, soft dashed horizontal grid only
    Chart.defaults.scale.border = { display: false, dash: [4, 4] };
    Chart.defaults.scale.ticks.padding = 8;
    Chart.defaults.scale.ticks.color = MUTED;
    Chart.defaults.scale.grid.color = GRID;
    Chart.defaults.set("scales.category", { grid: { display: false } });
    Chart.defaults.set("scales.linear", { beginAtZero: true });

    // per chart-type defaults
    Chart.overrides.doughnut.cutout = "70%";
    Chart.overrides.pie.cutout = "58%";
    Chart.overrides.bar.layout = { padding: { top: 22 } };
    Chart.overrides.bar.interaction = { mode: "index", intersect: false };
    Chart.overrides.line.interaction = { mode: "index", intersect: false };
    Chart.overrides.line.layout = { padding: { top: 10 } };

    // ---------- helpers ----------
    const compact = (v) => {
      const a = Math.abs(v);
      if (a >= 1e7) return (v / 1e7).toFixed(1).replace(/\.0$/, "") + "Cr";
      if (a >= 1e5) return (v / 1e5).toFixed(1).replace(/\.0$/, "") + "L";
      if (a >= 1e3) return (v / 1e3).toFixed(1).replace(/\.0$/, "") + "k";
      return v.toLocaleString("en-IN", { maximumFractionDigits: 1 });
    };

    const barGradient = (ctx) => {
      const { chart } = ctx, a = chart.chartArea;
      if (!a) return "#2563eb";
      const g = chart.ctx.createLinearGradient(0, a.bottom, 0, a.top);
      g.addColorStop(0, "#7dd3fc");
      g.addColorStop(0.5, "#3b82f6");
      g.addColorStop(1, "#1e40af");
      return g;
    };
    const lineFill = (ctx) => {
      const { chart } = ctx, a = chart.chartArea;
      if (!a) return "rgba(37,99,235,0.15)";
      const g = chart.ctx.createLinearGradient(0, a.top, 0, a.bottom);
      g.addColorStop(0, "rgba(37,99,235,0.35)");
      g.addColorStop(1, "rgba(37,99,235,0.00)");
      return g;
    };

    Chart.register({
      id: "picsBlueTheme",

      beforeUpdate(chart) {
        const type = chart.config.type;
        const n = (chart.data.labels || []).length;
        chart.data.datasets.forEach((ds) => {
          if (type === "doughnut" || type === "pie") {
            ds.backgroundColor = Array.from({ length: n }, (_, i) => pal[i % pal.length]);
            ds.hoverBackgroundColor = ds.backgroundColor;
            ds.borderColor = "#ffffff";
            ds.borderWidth = 3;
            ds.borderRadius = 8;
            ds.spacing = 2;
            ds.hoverOffset = 10;
          } else if (type === "bar") {
            ds.backgroundColor = barGradient;
            ds.hoverBackgroundColor = "#0ea5e9";
            ds.borderRadius = { topLeft: 10, topRight: 10 };
            ds.borderSkipped = "start";
            ds.maxBarThickness = 34;
          } else if (type === "line") {
            ds.borderColor = "#2563eb";
            ds.backgroundColor = lineFill;
            ds.fill = true;
            ds.borderWidth = 3;
            ds.tension = 0.4;
            ds.cubicInterpolationMode = "monotone";
            ds.pointRadius = 0;
            ds.pointHitRadius = 14;
            ds.pointHoverRadius = 6;
            ds.pointHoverBackgroundColor = "#ffffff";
            ds.pointHoverBorderColor = "#2563eb";
            ds.pointHoverBorderWidth = 3;
          }
        });
      },

      // soft glow under lines
      beforeDatasetDraw(chart) {
        if (chart.config.type !== "line") return;
        const c = chart.ctx;
        c.save();
        c.shadowColor = "rgba(37,99,235,0.35)";
        c.shadowBlur = 12;
        c.shadowOffsetY = 6;
      },
      afterDatasetDraw(chart) {
        if (chart.config.type === "line") chart.ctx.restore();
      },

      afterDatasetsDraw(chart) {
        const type = chart.config.type;
        const c = chart.ctx;

        // value labels on top of bars
        if (type === "bar") {
          const meta = chart.getDatasetMeta(0);
          if (!meta || !meta.data || meta.data.length > 14) return;
          const values = chart.data.datasets[0].data;
          c.save();
          c.font = "600 11px " + FONT;
          c.fillStyle = "#1e3a8a";
          c.textAlign = "center";
          c.textBaseline = "bottom";
          meta.data.forEach((bar, i) => {
            const v = Number(values[i]) || 0;
            if (!v) return;
            c.fillText(compact(v), bar.x, bar.y - 5);
          });
          c.restore();
        }

        // total in the centre of doughnut / pie
        if (type === "doughnut" || type === "pie") {
          const meta = chart.getDatasetMeta(0);
          if (!meta || !meta.data || !meta.data.length) return;
          const arc = meta.data[0];
          const total = (chart.data.datasets[0].data || []).reduce((a, b) => a + (Number(b) || 0), 0);
          c.save();
          c.textAlign = "center";
          c.textBaseline = "middle";
          c.fillStyle = INK;
          c.font = "700 22px " + FONT;
          c.fillText(total.toLocaleString("en-IN"), arc.x, arc.y - 7);
          c.fillStyle = MUTED;
          c.font = "500 10.5px " + FONT;
          c.fillText("TOTAL", arc.x, arc.y + 14);
          c.restore();
        }
      }
    });
  } catch (e) {
    console.warn("PICS chart theme skipped:", e);
  }
})();
