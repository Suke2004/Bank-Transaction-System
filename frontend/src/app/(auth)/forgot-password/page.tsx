"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "../../../components/layout/AuthLayout.module.css";
import { Wallet } from "lucide-react";
import { forgotPassword } from "../../../lib/api/auth";
import { showToast } from "../../../lib/utils/toast";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showToast("Email address is required", "warning");
      return;
    }

    try {
      setLoading(true);
      const res = await forgotPassword({ email });
      showToast("Password reset code sent to email", "success");
      
      // Redirect to OTP page passing userId (returned or looked up by backend)
      if (res.userId) {
        router.push(`/forgot-password/otp?userId=${res.userId}`);
      } else {
        // Fallback if email doesn't exist (returns generic message for security)
        router.push("/login");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to request password reset", "error");
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
            Restore your<br />
            <span className={styles.taglineHighlight}>Access Credentials</span>
          </h1>
          <p className={styles.description}>
            If you've forgotten your login credentials, you can trigger a password recovery process. We'll verify your identity via email OTP clearance before allowing password resets.
          </p>
        </div>
        <div className={styles.brandFooter}>
          © 2026 Bank Ledger Inc. All rights reserved. Secure connection guaranteed.
        </div>
      </div>

      <div className={styles.formSection}>
        <div className={styles.formBox}>
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>Forgot Password</h2>
            <p className={styles.formSubtitle}>
              Enter your email and we'll send a recovery code.
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

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary styles.submitBtn"
              style={{ width: "100%", padding: "14px", fontSize: "16px", marginTop: "10px" }}
            >
              {loading ? "Requesting Recovery..." : "Send Verification Code"}
            </button>

            <Link href="/login" className={styles.linkText} style={{ textAlign: "center", fontSize: "14px" }}>
              Return to Login
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}
