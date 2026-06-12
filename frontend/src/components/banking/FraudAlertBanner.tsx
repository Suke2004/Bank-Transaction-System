"use client";

import React from "react";
import styles from "./FraudAlertBanner.module.css";
import { ShieldAlert } from "lucide-react";

interface FraudAlertBannerProps {
  show: boolean;
}

export const FraudAlertBanner: React.FC<FraudAlertBannerProps> = ({ show }) => {
  if (!show) return null;

  return (
    <div className={styles.banner}>
      <div className={styles.iconWrapper}>
        <ShieldAlert size={24} />
      </div>
      <div className={styles.content}>
        <span className={styles.title}>Account Under Security Review</span>
        <span className={styles.message}>
          One or more of your accounts has been flagged for suspicious activity. Some outbound transaction capabilities have been temporarily restricted. Please contact customer support immediately for verification.
        </span>
      </div>
    </div>
  );
};
