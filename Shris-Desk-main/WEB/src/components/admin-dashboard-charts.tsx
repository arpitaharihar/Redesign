"use client";

import { useEffect, useRef } from "react";

export function AdminDashboardCharts() {
  const chartsRef = useRef<Array<{ destroy: () => void }>>([]);

  useEffect(() => {
    const chartLib = (window as typeof window & { Chart?: typeof import("chart.js") }).Chart;
    if (!chartLib) return;

    const registered: Array<{ destroy: () => void }> = [];

    const barCanvas = document.getElementById("chart-bars") as HTMLCanvasElement | null;
    if (barCanvas) {
      const existing = chartLib.getChart?.(barCanvas);
      if (existing) existing.destroy();
      new chartLib(barCanvas.getContext("2d")!, {
        type: "bar",
        data: {
          labels: ["M", "T", "W", "T", "F", "S", "S"],
          datasets: [
            {
              label: "Applications",
              tension: 0.4,
              borderWidth: 0,
              borderRadius: 4,
              borderSkipped: false,
              backgroundColor: "rgba(255, 255, 255, .8)",
              data: [12, 15, 9, 22, 18, 7, 11],
              maxBarThickness: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              grid: { drawBorder: false, color: "rgba(255, 255, 255, .2)" },
              ticks: { color: "#fff" },
            },
            x: {
              grid: { drawBorder: false, color: "rgba(255, 255, 255, .2)" },
              ticks: { color: "#f8f9fa" },
            },
          },
        },
      });
      const created = chartLib.getChart?.(barCanvas);
      if (created) registered.push(created);
    }

    const lineCanvas = document.getElementById("chart-line") as HTMLCanvasElement | null;
    if (lineCanvas) {
      const existing = chartLib.getChart?.(lineCanvas);
      if (existing) existing.destroy();
      new chartLib(lineCanvas.getContext("2d")!, {
        type: "line",
        data: {
          labels: ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
          datasets: [
            {
              label: "Hiring",
              tension: 0.3,
              pointRadius: 4,
              borderColor: "rgba(255, 255, 255, .8)",
              backgroundColor: "transparent",
              data: [12, 19, 28, 22, 35, 30, 22, 18, 26],
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              grid: { drawBorder: false, color: "rgba(255, 255, 255, .2)" },
              ticks: { color: "#f8f9fa" },
            },
            x: {
              grid: { drawBorder: false, display: false },
              ticks: { color: "#f8f9fa" },
            },
          },
        },
      });
      const created = chartLib.getChart?.(lineCanvas);
      if (created) registered.push(created);
    }

    const taskCanvas = document.getElementById("chart-line-tasks") as HTMLCanvasElement | null;
    if (taskCanvas) {
      const existing = chartLib.getChart?.(taskCanvas);
      if (existing) existing.destroy();
      new chartLib(taskCanvas.getContext("2d")!, {
        type: "line",
        data: {
          labels: ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
          datasets: [
            {
              label: "Reviews",
              tension: 0.3,
              pointRadius: 4,
              borderColor: "rgba(255, 255, 255, .8)",
              backgroundColor: "transparent",
              data: [10, 12, 17, 15, 26, 20, 28, 24, 30],
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              grid: { drawBorder: false, color: "rgba(255, 255, 255, .2)" },
              ticks: { color: "#f8f9fa" },
            },
            x: {
              grid: { drawBorder: false, display: false },
              ticks: { color: "#f8f9fa" },
            },
          },
        },
      });
      const created = chartLib.getChart?.(taskCanvas);
      if (created) registered.push(created);
    }

    chartsRef.current = registered;

    return () => {
      chartsRef.current.forEach((chart) => chart.destroy());
      chartsRef.current = [];
    };
  }, []);

  return null;
}
