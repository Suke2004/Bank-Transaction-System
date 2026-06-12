"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "../ui/Skeleton";

// Dynamically import the inner chart component with SSR disabled
const ChartComponent = dynamic(
  () => import("./MonthlyChartInner").then((mod) => mod.MonthlyChartInner),
  {
    ssr: false,
    loading: () => <Skeleton height={300} borderRadius="12px" />,
  }
);

interface MonthlyChartProps {
  chartData: {
    labels: string[];
    credits: number[];
    debits: number[];
  };
}

export const MonthlyChart: React.FC<MonthlyChartProps> = (props) => {
  return <ChartComponent {...props} />;
};
