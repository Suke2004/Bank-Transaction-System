"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "@/components/layout/AuthLayout.module.css";
import { Wallet } from "lucide-react";
import { OtpInput } from "@/components/ui/OtpInput";
import { verifyEmail, resendOtp } from "@/lib/api/auth";
import { useAuth } from "@/lib/context/AuthContext";
import { showToast } from "@/lib/utils/toast";

function RegisterOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  
  const userId = searchParams.get("userId");
  const [error, setError] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);

  useEffect(() => {
    if (!userId) {
      showToast("Registration context missing. Please sign up again.", "error");
      router.push("/register");
    }
  }, [userId, router]);

  const handleOtpComplete = async (otp: string) => {
    if (!userId) return;
    try {
      setVerifying(true);
      setError(false);
      
      const res = await verifyEmail({ userId, otp });
      showToast("Email verified successfully! Welcome.", "success");

      // Set user session
      login(res.user, false); // No PIN set up yet on new registration

      // Forward to dashboard which redirects to setup-pin
      router.push("/dashboard");
    } catch (err: any) {
      setError(true);
      showToast(err.message || "Invalid verification code", "error");
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (!userId) return;
    try {
      await resendOtp({ userId, purpose: "REGISTER" });
      showToast("Verification code resent to your email", "success");
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
            Verify your<br />
            <span className={styles.taglineHighlight}>Email Address</span>
          </h1>
          <p className={styles.description}>
            We have sent a 6-digit confirmation code to your registered email. Enter it here to activate your digital vault and finalize your registration.
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
              Activating account...
            </span>
          )}

          <button
            onClick={() => router.push("/register")}
            className={styles.linkText}
            style={{ marginTop: "20px", fontSize: "14px", background: "none", border: "none" }}
          >
            Back to Register
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RegisterOtpPage() {
  return (
    <Suspense fallback={<div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "var(--bg-deep)", color: "var(--text-primary)" }}>Loading verification...</div>}>
      <RegisterOtpContent />
    </Suspense>
  );
}
