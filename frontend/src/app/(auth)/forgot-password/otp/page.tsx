"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "@/components/layout/AuthLayout.module.css";
import { Wallet } from "lucide-react";
import { OtpInput } from "@/components/ui/OtpInput";
import { resendOtp } from "@/lib/api/auth";
import { showToast } from "@/lib/utils/toast";

function ForgotPasswordOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const userId = searchParams.get("userId");
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (!userId) {
      showToast("Recovery context missing. Please start over.", "error");
      router.push("/forgot-password");
    }
  }, [userId, router]);

  const handleOtpComplete = (otp: string) => {
    if (!userId) return;
    showToast("OTP code entered. Please set your new password.", "success");
    // Pass both userId and otp to the final reset page
    router.push(`/forgot-password/reset?userId=${userId}&otp=${otp}`);
  };

  const handleResendOtp = async () => {
    if (!userId) return;
    try {
      await resendOtp({ userId, purpose: "FORGOT_PASSWORD" });
      showToast("Recovery code resent to email", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to resend code", "error");
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
            Clearance<br />
            <span className={styles.taglineHighlight}>Verification</span>
          </h1>
          <p className={styles.description}>
            Enter the 6-digit recovery OTP code sent to your email to verify ownership. Once cleared, you will be permitted to set a new security credential.
          </p>
        </div>
        <div className={styles.brandFooter}>
          © 2026 Bank Ledger Inc. All rights reserved. Secure connection guaranteed.
        </div>
      </div>

      <div className={styles.formSection}>
        <div className={styles.formBox} style={{ alignItems: "center" }}>
          <div className={styles.formHeader} style={{ alignItems: "center", textAlign: "center" }}>
            <h2 className={styles.formTitle}>Verification</h2>
            <p className={styles.formSubtitle}>
              Please enter the 6-digit recovery code.
            </p>
          </div>

          <OtpInput
            onComplete={handleOtpComplete}
            onResend={handleResendOtp}
            isError={error}
          />

          <button
            onClick={() => router.push("/forgot-password")}
            className={styles.linkText}
            style={{ marginTop: "20px", fontSize: "14px", background: "none", border: "none" }}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordOtpPage() {
  return (
    <Suspense fallback={<div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "var(--bg-deep)", color: "var(--text-primary)" }}>Loading verification...</div>}>
      <ForgotPasswordOtpContent />
    </Suspense>
  );
}
