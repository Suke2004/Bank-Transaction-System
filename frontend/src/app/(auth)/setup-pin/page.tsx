"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../../../components/layout/AuthLayout.module.css";
import { Wallet, ShieldAlert } from "lucide-react";
import { PinInput } from "../../../components/ui/PinInput";
import { setupPin } from "../../../lib/api/auth";
import { useAuth } from "../../../lib/context/AuthContext";
import { showToast } from "../../../lib/utils/toast";

export default function SetupPinPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  
  const [stage, setStage] = useState<1 | 2>(1);
  const [firstPin, setFirstPin] = useState<string>("");
  const [error, setError] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const handlePinComplete = async (pin: string) => {
    if (stage === 1) {
      setFirstPin(pin);
      setStage(2);
    } else {
      // Stage 2: Confirm PIN
      if (pin !== firstPin) {
        setError(true);
        showToast("PINs do not match. Please try again.", "error");
        setStage(1);
        setFirstPin("");
        return;
      }

      try {
        setSaving(true);
        setError(false);
        await setupPin(pin);
        
        showToast("Transaction PIN configured successfully!", "success");
        await refreshUser(); // refresh Auth context to know hasPinSetup is true
        router.push("/dashboard");
      } catch (err: any) {
        setError(true);
        showToast(err.message || "Failed to setup PIN", "error");
        setStage(1);
        setFirstPin("");
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.brandSection}>
        <div className={styles.brandAccent} />
        <div className={styles.brandLogo}>
          <Wallet className={styles.brandLogoIcon} size={28} />
          <span>BANK LEDGER</span>
        </div>
        <div className={styles.brandContent}>
          <h1 className={styles.tagline}>
            Configure your<br />
            <span className={styles.taglineHighlight}>Transaction PIN</span>
          </h1>
          <p className={styles.description}>
            All transfers and beneficiary updates require a 6-digit numeric PIN. This is a critical security layer to prevent unauthorized outflows even if your active session is hijacked.
          </p>
        </div>
        <div className={styles.brandFooter}>
          © 2026 Bank Ledger Inc. All rights reserved. Secure connection guaranteed.
        </div>
      </div>

      <div className={styles.formSection}>
        <div className={styles.formBox} style={{ alignItems: "center" }}>
          <div className={styles.formHeader} style={{ alignItems: "center", textAlign: "center" }}>
            <h2 className={styles.formTitle}>
              {stage === 1 ? "Create PIN" : "Confirm PIN"}
            </h2>
            <p className={styles.formSubtitle}>
              {stage === 1
                ? "Choose a secure 6-digit transaction PIN."
                : "Re-enter your 6-digit transaction PIN to confirm."}
            </p>
          </div>

          <div style={{ margin: "20px 0" }}>
            <PinInput
              onComplete={handlePinComplete}
              isError={error}
            />
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "20px" }}>
            <ShieldAlert size={14} style={{ color: "var(--text-secondary)" }} />
            <span style={{ fontSize: "12px", color: "var(--text-secondary)", textAlign: "center" }}>
              Make sure to choose a code that is hard to guess (avoid 123456 or 111111).
            </span>
          </div>

          {saving && (
            <span style={{ fontSize: "14px", color: "var(--text-secondary)", marginTop: "12px" }}>
              Configuring secure PIN...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
