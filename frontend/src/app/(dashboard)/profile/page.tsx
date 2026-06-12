"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { changeName, updateNotificationPrefs } from "@/lib/api/auth";
import { showToast } from "@/lib/utils/toast";
import { Modal } from "@/components/ui/Modal";
import { User, Mail, Calendar, ShieldCheck, Settings, Bell, Lock } from "lucide-react";

export default function ProfileSettingsPage() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState<string>(user?.name || "");
  const [passwordConfirm, setPasswordConfirm] = useState<string>("");
  const [submittingName, setSubmittingName] = useState<boolean>(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);

  // Notifications state
  const [emailOnLogin, setEmailOnLogin] = useState<boolean>(
    user?.notificationPreferences?.emailOnLogin ?? true
  );
  const [emailOnTransaction, setEmailOnTransaction] = useState<boolean>(
    user?.notificationPreferences?.emailOnTransaction ?? true
  );
  const [emailOnSuspicious, setEmailOnSuspicious] = useState<boolean>(
    user?.notificationPreferences?.emailOnSuspicious ?? true
  );
  const [submittingPrefs, setSubmittingPrefs] = useState<boolean>(false);

  const handleUpdateNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("Name cannot be empty", "warning");
      return;
    }
    if (name.trim() === user?.name) {
      showToast("Name is identical to current name", "info");
      return;
    }
    setPasswordConfirm("");
    setConfirmModalOpen(true);
  };

  const handleVerifyPasswordAndUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordConfirm) {
      showToast("Password confirmation is required", "warning");
      return;
    }

    try {
      setSubmittingName(true);
      await changeName({ name: name.trim(), password: passwordConfirm });
      showToast("Display name updated successfully", "success");
      setConfirmModalOpen(false);
      await refreshUser();
    } catch (err: any) {
      showToast(err.message || "Incorrect confirmation password", "error");
    } finally {
      setSubmittingName(false);
    }
  };

  const handleUpdatePrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingPrefs(true);
      await updateNotificationPrefs({
        emailOnLogin,
        emailOnTransaction,
        emailOnSuspicious
      });
      showToast("Notification preferences updated", "success");
      await refreshUser();
    } catch (err: any) {
      showToast(err.message || "Failed to save preferences", "error");
    } finally {
      setSubmittingPrefs(false);
    }
  };

  return (
    <div style={{ animation: "slideUp var(--transition-normal)", display: "flex", flexDirection: "column", gap: "32px", maxWidth: "800px", margin: "0 auto" }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "4px" }}>Profile Settings</h1>
        <p style={{ color: "var(--text-secondary)" }}>Manage your account settings, display details, and notification thresholds.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "24px" }}>
        {/* Left Side: Summary Card */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className="glass-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "32px 24px" }}>
            <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px", border: "2px solid var(--border)", color: "var(--accent-blue)" }}>
              <User size={36} />
            </div>
            
            <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "4px" }}>{user?.name}</h2>
            <span style={{ 
              fontSize: "12px", 
              background: "rgba(30, 111, 234, 0.15)", 
              color: "var(--accent-blue)", 
              padding: "4px 12px", 
              borderRadius: "12px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "24px"
            }}>
              {user?.role}
            </span>

            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "16px", textAlign: "left", borderTop: "1px solid var(--border)", paddingTop: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "14px" }}>
                <Mail size={16} style={{ color: "var(--text-secondary)" }} />
                <span style={{ wordBreak: "break-all" }}>{user?.email}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "14px", color: "var(--text-secondary)" }}>
                <Calendar size={16} />
                <span>Active Member since 2026</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "14px", color: "var(--text-secondary)" }}>
                <ShieldCheck size={16} style={{ color: "var(--accent-emerald)" }} />
                <span>Argon2id Hashing Enabled</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Forms */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Display Name Edit Card */}
          <div className="glass-card">
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <Settings size={18} style={{ color: "var(--accent-blue)" }} />
              <h3 style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>Identity Details</h3>
            </div>

            <form onSubmit={handleUpdateNameSubmit} className="form">
              <div className="form-group">
                <label className="form-label">Full Display Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                  className="form-input"
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: "8px" }}>
                Save Profile Name
              </button>
            </form>
          </div>

          {/* Email notifications settings Card */}
          <div className="glass-card">
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <Bell size={18} style={{ color: "var(--accent-emerald)" }} />
              <h3 style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>Notification Policies</h3>
            </div>

            <form onSubmit={handleUpdatePrefs} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 600 }}>Login Security Alerts</p>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Receive email notices immediately upon every session logon.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={emailOnLogin} 
                  onChange={(e) => setEmailOnLogin(e.target.checked)}
                  style={{ width: "18px", height: "18px", accentColor: "var(--accent-blue)" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 600 }}>Ledger Transaction Notices</p>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Receive alerts when transfers are dispatched or received.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={emailOnTransaction} 
                  onChange={(e) => setEmailOnTransaction(e.target.checked)}
                  style={{ width: "18px", height: "18px", accentColor: "var(--accent-blue)" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 600 }}>Fraud and Suspicious Activity</p>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Receive critical high-priority updates relating to ledger locks.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={emailOnSuspicious} 
                  onChange={(e) => setEmailOnSuspicious(e.target.checked)}
                  style={{ width: "18px", height: "18px", accentColor: "var(--accent-blue)" }}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-secondary" 
                disabled={submittingPrefs}
                style={{ alignSelf: "flex-start", marginTop: "12px" }}
              >
                {submittingPrefs ? "Saving..." : "Save Preferences"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Confirm Password Modal for display name update */}
      {confirmModalOpen && (
        <Modal 
          isOpen={confirmModalOpen}
          onClose={() => !submittingName && setConfirmModalOpen(false)}
          title="Confirm Identity"
        >
          <form onSubmit={handleVerifyPasswordAndUpdateName}>
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <Lock size={36} style={{ color: "var(--accent-blue)", margin: "0 auto 12px auto" }} />
              <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "4px" }}>
                Please enter your corporate password to approve changing your profile display name.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input 
                type="password" 
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="••••••••"
                required
                className="form-input"
                autoFocus
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
              <button 
                type="button" 
                onClick={() => setConfirmModalOpen(false)} 
                className="btn btn-secondary"
                disabled={submittingName}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={submittingName}
              >
                {submittingName ? "Updating Profile..." : "Approve Change"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
