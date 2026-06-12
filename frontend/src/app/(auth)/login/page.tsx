"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "../../../components/layout/AuthLayout.module.css";
import { Wallet, Shield } from "lucide-react";
import { loginUser } from "../../../lib/api/auth";
import { showToast } from "../../../lib/utils/toast";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast("Please enter both email and password", "warning");
      return;
    }

    try {
      setLoading(true);
      const res = await loginUser({ email, password });
      
      if (res.pendingOtp) {
        showToast("Credentials verified. Please enter OTP.", "info");
        router.push(`/login/otp?userId=${res.userId}`);
      } else {
        // Fallback or legacy flow (if OTP gets bypassed somehow, which TRD prevents)
        showToast("Logged in successfully", "success");
        router.push("/dashboard");
      }
    } catch (err: any) {
      showToast(err.message || "Invalid email or password", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      {/* Brand Section Left */}
      <div className={styles.brandSection}>
        <div className={styles.brandAccent} />
        
        <div className={styles.brandLogo}>
          <Wallet className={styles.brandLogoIcon} size={28} />
          <span>BANK LEDGER</span>
        </div>

        <div className={styles.brandContent}>
          <h1 className={styles.tagline}>
            Security of a <span className={styles.taglineHighlight}>vault</span>.<br />
            Simplicity of a tap.
          </h1>
          <p className={styles.description}>
            Experience premium double-entry bookkeeping, multi-factor security clearance, and real-time transaction tracking tailored for institutional compliance.
          </p>
        </div>

        <div className={styles.brandFooter}>
          © 2026 Bank Ledger Inc. All rights reserved. Secure connection guaranteed.
        </div>
      </div>

      {/* Form Section Right */}
      <div className={styles.formSection}>
        <div className={styles.formBox}>
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>Sign In</h2>
            <p className={styles.formSubtitle}>
              New to Bank Ledger?{" "}
              <Link href="/register" className={styles.linkText}>
                Create an account
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Corporate Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                className={styles.formInput}
              />
            </div>

            <div className={styles.formGroup}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label className={styles.formLabel}>Password</label>
                <Link href="/forgot-password" className={styles.linkText} style={{ fontSize: "13px" }}>
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {loading ? "Verifying Credentials..." : "Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
