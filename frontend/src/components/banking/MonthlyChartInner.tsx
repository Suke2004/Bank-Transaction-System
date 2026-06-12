"use client";

import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface MonthlyChartInnerProps {
  chartData: {
    labels: string[];
    credits: number[];
    debits: number[];
  };
}

export const MonthlyChartInner: React.FC<MonthlyChartInnerProps> = ({ chartData }) => {
  const data = {
    labels: chartData.labels,
    datasets: [
      {
        label: "Incoming (Credits)",
        data: chartData.credits,
        backgroundColor: "rgba(0, 200, 150, 0.65)", // emerald
        borderColor: "rgb(0, 200, 150)",
        borderWidth: 1,
        borderRadius: 6,
      },
      {
        label: "Outgoing (Debits)",
        data: chartData.debits,
        backgroundColor: "rgba(255, 77, 106, 0.65)", // error/red
        borderColor: "rgb(255, 77, 106)",
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "#8E9CAE", // var(--text-secondary)
          font: {
            family: "var(--font-sans), system-ui",
            weight: 600,
          },
        },
      },
      tooltip: {
        backgroundColor: "#0F1D35", // var(--surface)
        titleColor: "#F0F4FF",
        bodyColor: "#F0F4FF",
        borderColor: "#1F314F",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: {
          color: "rgba(31, 49, 79, 0.2)",
        },
        ticks: {
          color: "#8E9CAE",
          font: {
            family: "var(--font-sans)",
          },
        },
      },
      y: {
        grid: {
          color: "rgba(31, 49, 79, 0.2)",
        },
        ticks: {
          color: "#8E9CAE",
          font: {
            family: "var(--font-sans)",
          },
          callback: (value) => `₹${Number(value).toLocaleString("en-IN")}`,
        },
      },
    },
  };

  return (
    <div style={{ height: "300px", width: "100%", position: "relative" }}>
      <Bar data={data} options={options} />
    </div>
  );
};
