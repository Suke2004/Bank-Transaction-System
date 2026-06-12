"use client";

import React from "react";
import styles from "./Badge.module.css";

interface BadgeProps {
  label: string;
  variant?: "status" | "role";
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = "status" }) => {
  const normLabel = label.trim();
  
  // Resolve class names based on label value
  let styleClass = styles.customer;
  const lowerLabel = normLabel.toLowerCase();

  if (variant === "status") {
    if (["active", "completed"].includes(lowerLabel)) {
      styleClass = styles.active;
    } else if (["frozen", "pending"].includes(lowerLabel)) {
      styleClass = styles.frozen;
    } else if (["closed", "failed", "reversed"].includes(lowerLabel)) {
      styleClass = styles.closed;
    }
  } else {
    // Role variant
    if (lowerLabel === "teller") styleClass = styles.teller;
    else if (lowerLabel === "manager") styleClass = styles.manager;
    else if (lowerLabel === "admin") styleClass = styles.admin;
    else if (lowerLabel === "superadmin") styleClass = styles.superAdmin;
    else styleClass = styles.customer;
  }

  return <span className={`${styles.badge} ${styleClass}`}>{normLabel}</span>;
};
