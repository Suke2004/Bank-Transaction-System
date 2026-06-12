"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "@/components/layout/AuthLayout.module.css";
import { Wallet } from "lucide-react";
import { OtpInput } from "@/components/ui/OtpInput";
import { verifyLoginOtp, resendOtp } from "@/lib/api/auth";
import { useAuth } from "@/lib/context/AuthContext";
import { showToast } from "@/lib/utils/toast";

function LoginOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  
  const userId = searchParams.get("userId");
  const [error, setError] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);

  useEffect(() => {
    if (!userId) {
      showToast("Session invalid. Please login again.", "error");
      router.push("/login");
    }
  }, [userId, router]);

  const handleOtpComplete = async (otp: string) => {
    if (!userId) return;
    try {
      setVerifying(true);
      setError(false);
      
      const res = await verifyLoginOtp({ userId, otp });
      showToast("Security check passed!", "success");

      // Verify if user needs PIN setup
      // We'll fetch /me after login to know
      // For now we set auth user and then refresh/check
      login(res.user, true); // optimistically login

      // We wait for router or check redirect
      // Wait, let's redirect them to dashboard
      // The dashboard layout will check if they have a PIN, and redirect to setup-pin if not!
      // This is extremely clean and central!
      router.push("/dashboard");
    } catch (err: any) {
      setError(true);
      showToast(err.message || "Invalid OTP code", "error");
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (!userId) return;
    try {
      await resendOtp({ userId, purpose: "LOGIN" });
      showToast("MFA verification code resent", "success");
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
            Multi-Factor<br />
            <span className={styles.taglineHighlight}>Authentication</span>
          </h1>
          <p className={styles.description}>
            To protect your account, we have sent a 6-digit verification code to your registered email address. This security check is required on all login attempts.
          </p>
        </div>
        <div className={styles.brandFooter}>
          © 2026 Bank Ledger Inc. All rights reserved. Secure connection guaranteed.
        </div>
      </div>

      <div className={styles.formSection}>
        <div className={styles.formBox} style={{ alignItems: "center" }}>
          <div className={styles.formHeader} style={{ alignItems: "center", textAlign: "center" }}>
            <h2 className={styles.formTitle}>Verification Code</h2>
            <p className={styles.formSubtitle}>
              Please enter the 6-digit code sent to your email.
            </p>
          </div>

          <OtpInput
            onComplete={handleOtpComplete}
            onResend={handleResendOtp}
            isError={error}
          />

          {verifying && (
            <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
              Authorizing session...
            </span>
          )}

          <button
            onClick={() => router.push("/login")}
            className={styles.linkText}
            style={{ marginTop: "20px", fontSize: "14px", background: "none", border: "none" }}
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginOtpPage() {
  return (
    <Suspense fallback={<div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "var(--bg-deep)", color: "var(--text-primary)" }}>Loading authentication...</div>}>
      <LoginOtpContent />
    </Suspense>
  );
}
