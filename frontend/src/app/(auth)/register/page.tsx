"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "../../../components/layout/AuthLayout.module.css";
import { Wallet } from "lucide-react";
import { registerUser } from "../../../lib/api/auth";
import { showToast } from "../../../lib/utils/toast";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const calculatePasswordStrength = (pwd: string): number => {
    let score = 0;
    if (!pwd) return 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 10) score += 1;
    if (/\d/.test(pwd)) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    return score;
  };

  const strengthScore = calculatePasswordStrength(password);

  const getStrengthLabel = (score: number) => {
    if (score === 0) return { label: "", color: "transparent" };
    if (score <= 2) return { label: "Weak Password", color: "var(--error)" };
    if (score <= 4) return { label: "Strong Password", color: "#F39C12" };
    return { label: "Excellent Password", color: "var(--accent-emerald)" };
  };

  const strengthDetails = getStrengthLabel(strengthScore);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      showToast("Please fill in all fields", "warning");
      return;
    }

    if (password.length < 6) {
      showToast("Password must be at least 6 characters long", "warning");
      return;
    }

    if (!/\d/.test(password)) {
      showToast("Password must contain at least one number", "warning");
      return;
    }

    try {
      setLoading(true);
      const res = await registerUser({ name, email, password });
      showToast("Registration initiated. Verification OTP sent.", "success");
      router.push(`/register/otp?userId=${res.userId}`);
    } catch (err: any) {
      showToast(err.message || "Failed to register", "error");
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
            Open your<br />
            <span className={styles.taglineHighlight}>digital vault</span>.
          </h1>
          <p className={styles.description}>
            Create your account today and gain access to dual-token secured ledger controls, real-time transaction statements, and advanced double-entry accounting.
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
            <h2 className={styles.formTitle}>Register</h2>
            <p className={styles.formSubtitle}>
              Already registered?{" "}
              <Link href="/login" className={styles.linkText}>
                Sign in to your account
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Full Legal Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                className={styles.formInput}
              />
            </div>

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
              <label className={styles.formLabel}>Security Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={styles.formInput}
              />
              
              {/* Password strength meter */}
              {password && (
                <>
                  <div className={styles.strengthMeter}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={styles.strengthBar}
                        style={{
                          backgroundColor: i < strengthScore ? strengthDetails.color : "var(--border)",
                        }}
                      />
                    ))}
                  </div>
                  <span className={styles.strengthText} style={{ color: strengthDetails.color }}>
                    {strengthDetails.label}
                  </span>
                </>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary styles.submitBtn"
              style={{ width: "100%", padding: "14px", fontSize: "16px", marginTop: "10px" }}
            >
              {loading ? "Creating Account..." : "Register"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
