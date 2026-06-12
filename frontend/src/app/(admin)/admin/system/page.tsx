"use client";

import React, { useEffect, useState } from "react";
import { adminGetSystemConfig, adminUpdateSystemConfig, SystemConfig } from "@/lib/api/admin";
import { showToast } from "@/lib/utils/toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { Settings, ShieldAlert, Save, RotateCcw } from "lucide-react";

export default function AdminSystemConfigPage() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form states mapping directly to db config keys
  const [highValueThreshold, setHighValueThreshold] = useState<number>(10000);
  const [maxAccounts, setMaxAccounts] = useState<number>(5);
  const [maxDailyTransfer, setMaxDailyTransfer] = useState<number>(100000);
  const [pinLockout, setPinLockout] = useState<number>(15);
  const [loginLockout, setLoginLockout] = useState<number>(30);
  const [otpExpiry, setOtpExpiry] = useState<number>(10);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await adminGetSystemConfig();
      const items = res.configs || [];
      setConfigs(items);

      // Parse values into state
      items.forEach((c) => {
        const val = c.value;
        switch (c.key) {
          case "HIGH_VALUE_THRESHOLD_PAISE":
            setHighValueThreshold(val / 100);
            break;
          case "MAX_ACCOUNTS_PER_USER":
            setMaxAccounts(val);
            break;
          case "MAX_DAILY_TRANSFER_PAISE":
            setMaxDailyTransfer(val / 100);
            break;
          case "PIN_LOCKOUT_MINUTES":
            setPinLockout(val);
            break;
          case "LOGIN_LOCKOUT_MINUTES":
            setLoginLockout(val);
            break;
          case "OTP_EXPIRY_MINUTES":
            setOtpExpiry(val);
            break;
        }
      });
    } catch (err: any) {
      showToast(err.message || "Failed to load system configs", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);

      // We update each config parameter in parallel
      await Promise.all([
        adminUpdateSystemConfig("HIGH_VALUE_THRESHOLD_PAISE", highValueThreshold * 100),
        adminUpdateSystemConfig("MAX_ACCOUNTS_PER_USER", maxAccounts),
        adminUpdateSystemConfig("MAX_DAILY_TRANSFER_PAISE", maxDailyTransfer * 100),
        adminUpdateSystemConfig("PIN_LOCKOUT_MINUTES", pinLockout),
        adminUpdateSystemConfig("LOGIN_LOCKOUT_MINUTES", loginLockout),
        adminUpdateSystemConfig("OTP_EXPIRY_MINUTES", otpExpiry)
      ]);

      showToast("System configurations saved successfully", "success");
      fetchConfig();
    } catch (err: any) {
      showToast(err.message || "Failed to update configurations", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "40px 0" }}>
        <div style={{ marginBottom: "20px" }}><Skeleton height="40px" /></div>
        <Skeleton height="350px" />
      </div>
    );
  }

  return (
    <div style={{ animation: "slideUp var(--transition-normal)", display: "flex", flexDirection: "column", gap: "32px", maxWidth: "720px", margin: "0 auto" }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "4px" }}>System Config</h1>
        <p style={{ color: "var(--text-secondary)" }}>Modify security rules, lockout limits, and transaction controls globally.</p>
      </div>

      <div className="glass-card" style={{ padding: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
          <Settings size={20} style={{ color: "var(--accent-blue)" }} />
          <h2 style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>Global Rule Configurations</h2>
        </div>

        <form onSubmit={handleSaveConfig} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div className="form-group">
              <label className="form-label">High-Value OTP Threshold (INR)</label>
              <input 
                type="number" 
                value={highValueThreshold} 
                onChange={(e) => setHighValueThreshold(parseFloat(e.target.value))}
                required
                min={1}
                className="form-input"
              />
              <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Transfers above this require dual PIN+OTP verification.</span>
            </div>

            <div className="form-group">
              <label className="form-label">Max Ledgers per Customer</label>
              <input 
                type="number" 
                value={maxAccounts} 
                onChange={(e) => setMaxAccounts(parseInt(e.target.value))}
                required
                min={1}
                max={20}
                className="form-input"
              />
              <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Max limit of active ledgers a user can create.</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", borderTop: "1px solid var(--border)", paddingTop: "20px" }}>
            <div className="form-group">
              <label className="form-label">Max Daily Outflow Limit (INR)</label>
              <input 
                type="number" 
                value={maxDailyTransfer} 
                onChange={(e) => setMaxDailyTransfer(parseFloat(e.target.value))}
                required
                min={1}
                className="form-input"
              />
              <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Global default daily transfer cap per ledger account.</span>
            </div>

            <div className="form-group">
              <label className="form-label">OTP Lifespan Expiry (minutes)</label>
              <input 
                type="number" 
                value={otpExpiry} 
                onChange={(e) => setOtpExpiry(parseInt(e.target.value))}
                required
                min={1}
                max={60}
                className="form-input"
              />
              <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Time-to-Live duration before email OTP tokens expire.</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", borderTop: "1px solid var(--border)", paddingTop: "20px" }}>
            <div className="form-group">
              <label className="form-label">PIN Lockout Duration (minutes)</label>
              <input 
                type="number" 
                value={pinLockout} 
                onChange={(e) => setPinLockout(parseInt(e.target.value))}
                required
                min={1}
                className="form-input"
              />
              <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Lockout time applied after 3 incorrect PIN inputs.</span>
            </div>

            <div className="form-group">
              <label className="form-label">Login Lockout Duration (minutes)</label>
              <input 
                type="number" 
                value={loginLockout} 
                onChange={(e) => setLoginLockout(parseInt(e.target.value))}
                required
                min={1}
                className="form-input"
              />
              <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Lockout time applied after 5 failed password attempts.</span>
            </div>
          </div>

          <div style={{ background: "rgba(30,111,234,0.06)", border: "1px solid rgba(30,111,234,0.2)", borderRadius: "8px", padding: "16px", marginTop: "12px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
            <ShieldAlert size={18} style={{ color: "var(--accent-blue)", flexShrink: 0, marginTop: "2px" }} />
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>
              Updating these values affects rules evaluated in real time across all customer endpoints. Ensure compliance limits align with institutional directives.
            </p>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
            <button 
              type="button" 
              onClick={fetchConfig} 
              className="btn btn-secondary"
              disabled={submitting}
            >
              <RotateCcw size={16} />
              <span>Reset</span>
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={submitting}
            >
              <Save size={16} />
              <span>{submitting ? "Saving Config..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
