"use client";

import React from "react";
import styles from "./Skeleton.module.css";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  className?: string;
  borderRadius?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  circle = false,
  className = "",
  borderRadius,
}) => {
  const customStyles: React.CSSProperties = {
    width: width ? (typeof width === "number" ? `${width}px` : width) : "100%",
    height: height ? (typeof height === "number" ? `${height}px` : height) : "16px",
    borderRadius: circle ? "50%" : borderRadius || "6px",
  };

  return <div className={`${styles.skeleton} ${className}`} style={customStyles} />;
};
