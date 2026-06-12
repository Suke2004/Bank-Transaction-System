"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "@/components/layout/AuthLayout.module.css";
import { Wallet } from "lucide-react";
import { resetPassword } from "@/lib/api/auth";
import { showToast } from "@/lib/utils/toast";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const userId = searchParams.get("userId");
  const otp = searchParams.get("otp");

  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!userId || !otp) {
      showToast("Access token context missing. Please restart recovery.", "error");
      router.push("/forgot-password");
    }
  }, [userId, otp, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      showToast("All fields are required", "warning");
      return;
    }

    if (password !== confirmPassword) {
      showToast("Passwords do not match", "warning");
      return;
    }

    if (password.length < 6) {
      showToast("Password must be at least 6 characters long", "warning");
      return;
    }

    try {
      setLoading(true);
      await resetPassword({ userId, otp, newPassword: password });
      showToast("Password updated successfully! Please login.", "success");
      router.push("/login");
    } catch (err: any) {
      showToast(err.message || "Failed to reset password", "error");
    } finally {
      setLoading(false);
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
            Establish a New<br />
            <span className={styles.taglineHighlight}>Security Password</span>
          </h1>
          <p className={styles.description}>
            Once your recovery code is verified, you can re-establish a secure password. Make sure to use numbers and symbols to ensure institutional-grade complexity.
          </p>
        </div>
        <div className={styles.brandFooter}>
          © 2026 Bank Ledger Inc. All rights reserved. Secure connection guaranteed.
        </div>
      </div>

      <div className={styles.formSection}>
        <div className="glass-card" style={{ width: "100%", maxWidth: "420px", padding: "40px", display: "flex", flexDirection: "column", gap: "28px" }}>
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>Reset Password</h2>
            <p className={styles.formSubtitle}>
              Please enter your new security credentials.
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={styles.formInput}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={styles.formInput}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary styles.submitBtn"
              style={{ width: "100%", padding: "14px", fontSize: "16px", marginTop: "10px" }}
            >
              {loading ? "Updating Credentials..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "var(--bg-deep)", color: "var(--text-primary)" }}>Loading password reset...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
