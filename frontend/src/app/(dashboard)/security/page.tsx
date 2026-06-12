"use client";

import React, { useEffect, useState } from "react";
import { 
  changePassword, 
  changePin, 
  sendPinChangeOtp, 
  resendOtp,
  getSessions, 
  revokeSession, 
  revokeAllSessions,
  Session 
} from "@/lib/api/auth";
import { showToast } from "@/lib/utils/toast";
import { formatIST } from "@/lib/utils/date";
import { Modal } from "@/components/ui/Modal";
import { OtpInput } from "@/components/ui/OtpInput";
import { Skeleton } from "@/components/ui/Skeleton";
import { 
  Lock, 
  ShieldCheck, 
  Smartphone, 
  Globe, 
  LogOut,
  AlertTriangle 
} from "lucide-react";

export default function SecurityDashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState<boolean>(true);

  // Password rotation state
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [passwordOtpModalOpen, setPasswordOtpModalOpen] = useState<boolean>(false);
  const [submittingPassword, setSubmittingPassword] = useState<boolean>(false);

  // PIN rotation state
  const [currentPin, setCurrentPin] = useState<string>("");
  const [newPin, setNewPin] = useState<string>("");
  const [confirmPin, setConfirmPin] = useState<string>("");
  const [pinOtpModalOpen, setPinOtpModalOpen] = useState<boolean>(false);
  const [submittingPin, setSubmittingPin] = useState<boolean>(false);

  const fetchActiveSessions = async () => {
    try {
      setLoadingSessions(true);
      const res = await getSessions();
      setSessions(res.sessions || []);
    } catch (err: any) {
      showToast(err.message || "Failed to retrieve active sessions", "error");
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    fetchActiveSessions();
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match", "warning");
      return;
    }
    if (newPassword.length < 8) {
      showToast("Password must be at least 8 characters long", "warning");
      return;
    }

    try {
      setSubmittingPassword(true);
      await resendOtp({ purpose: "CHANGE_PASSWORD" });
      showToast("OTP sent to your email to verify password change", "success");
      setPasswordOtpModalOpen(true);
    } catch (err: any) {
      showToast(err.message || "Failed to send verification OTP", "error");
    } finally {
      setSubmittingPassword(false);
    }
  };

  const handleVerifyPasswordChange = async (otp: string) => {
    try {
      setSubmittingPassword(true);
      await changePassword({ currentPassword, newPassword, otp });
      showToast("Password changed successfully", "success");
      setPasswordOtpModalOpen(false);
      // Clear password fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      showToast(err.message || "Incorrect verification OTP", "error");
    } finally {
      setSubmittingPassword(false);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin !== confirmPin) {
      showToast("New PINs do not match", "warning");
      return;
    }
    if (newPin.length !== 6 || isNaN(Number(newPin))) {
      showToast("PIN must be exactly 6 numeric digits", "warning");
      return;
    }

    try {
      setSubmittingPin(true);
      await sendPinChangeOtp();
      showToast("OTP sent to your email to verify PIN change", "success");
      setPinOtpModalOpen(true);
    } catch (err: any) {
      showToast(err.message || "Failed to send PIN change OTP", "error");
    } finally {
      setSubmittingPin(false);
    }
  };

  const handleVerifyPinChange = async (otp: string) => {
    try {
      setSubmittingPin(true);
      await changePin({ currentPin, newPin, otp });
      showToast("Transaction PIN updated successfully", "success");
      setPinOtpModalOpen(false);
      // Clear PIN fields
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
    } catch (err: any) {
      showToast(err.message || "Verification failed. Check OTP.", "error");
    } finally {
      setSubmittingPin(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await revokeSession(sessionId);
      showToast("Device session revoked", "success");
      fetchActiveSessions();
    } catch (err: any) {
      showToast(err.message || "Could not terminate session", "error");
    }
  };

  const handleRevokeAllSessions = async () => {
    if (window.confirm("Are you sure you want to log out of all other devices?")) {
      try {
        await revokeAllSessions();
        showToast("All other sessions closed", "success");
        fetchActiveSessions();
      } catch (err: any) {
        showToast(err.message || "Failed to close sessions", "error");
      }
    }
  };

  return (
    <div style={{ animation: "slideUp var(--transition-normal)", display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "4px" }}>Security Center</h1>
        <p style={{ color: "var(--text-secondary)" }}>Manage logins, transaction PIN credentials, and monitor active user sessions.</p>
      </div>

      {/* Forms Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "24px" }}>
        {/* Rotate Password Card */}
        <div className="glass-card">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
            <Lock size={18} style={{ color: "var(--accent-blue)" }} />
            <h3 style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>Rotate Password</h3>
          </div>

          <form onSubmit={handlePasswordSubmit} className="form">
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input 
                type="password" 
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="form-input"
              />
            </div>
            
            <div className="form-group" style={{ marginTop: "12px" }}>
              <label className="form-label">New Password</label>
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                required
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ marginTop: "12px" }}>
              <label className="form-label">Confirm New Password</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                className="form-input"
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "16px" }} disabled={submittingPassword}>
              {submittingPassword ? "Processing..." : "Update Password"}
            </button>
          </form>
        </div>

        {/* Change Transaction PIN Card */}
        <div className="glass-card">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
            <ShieldCheck size={18} style={{ color: "var(--accent-emerald)" }} />
            <h3 style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>Change Transaction PIN</h3>
          </div>

          <form onSubmit={handlePinSubmit} className="form">
            <div className="form-group">
              <label className="form-label">Current 6-Digit PIN</label>
              <input 
                type="password" 
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                placeholder="••••••"
                maxLength={6}
                required
                className="form-input"
                style={{ letterSpacing: "4px", fontFamily: "monospace" }}
              />
            </div>

            <div className="form-group" style={{ marginTop: "12px" }}>
              <label className="form-label">New 6-Digit PIN</label>
              <input 
                type="password" 
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="••••••"
                maxLength={6}
                required
                className="form-input"
                style={{ letterSpacing: "4px", fontFamily: "monospace" }}
              />
            </div>

            <div className="form-group" style={{ marginTop: "12px" }}>
              <label className="form-label">Confirm New PIN</label>
              <input 
                type="password" 
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="••••••"
                maxLength={6}
                required
                className="form-input"
                style={{ letterSpacing: "4px", fontFamily: "monospace" }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "16px" }} disabled={submittingPin}>
              {submittingPin ? "Processing..." : "Update Transaction PIN"}
            </button>
          </form>
        </div>
      </div>

      {/* Active sessions list card */}
      <div className="glass-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Smartphone size={20} style={{ color: "var(--accent-blue)" }} />
            <h3 style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>Active Device Sessions</h3>
          </div>
          
          <button onClick={handleRevokeAllSessions} className="btn btn-secondary btn-danger" style={{ fontSize: "13px", padding: "8px 16px" }}>
            <LogOut size={14} />
            <span>Terminate Other Sessions</span>
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                <th style={{ padding: "12px 16px" }}>Device / Browser</th>
                <th style={{ padding: "12px 16px" }}>IP Address</th>
                <th style={{ padding: "12px 16px" }}>Last Active Time</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Revoke Session</th>
              </tr>
            </thead>
            <tbody>
              {loadingSessions ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "14px 16px" }}><Skeleton width="180px" /></td>
                    <td style={{ padding: "14px 16px" }}><Skeleton width="100px" /></td>
                    <td style={{ padding: "14px 16px" }}><Skeleton width="120px" /></td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}><Skeleton width="80px" /></td>
                  </tr>
                ))
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: "24px", textAlign: "center", color: "var(--text-secondary)" }}>
                    No sessions found (anomaly, current session must exist).
                  </td>
                </tr>
              ) : (
                sessions.map((sess) => (
                  <tr key={sess._id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <Globe size={16} style={{ color: "var(--text-secondary)" }} />
                        <span style={{ fontWeight: 500 }}>{sess.deviceInfo || "Web Browser"}</span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", fontSize: "13px" }}>
                      {sess.ipAddress || "Unknown"}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "13px", color: "var(--text-secondary)" }}>
                      {formatIST(sess.lastUsedAt)}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <button 
                        onClick={() => handleRevokeSession(sess._id)} 
                        style={{ color: "var(--error)", background: "none", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 500 }}
                      >
                        Terminate
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Password change OTP Verification Modal */}
      <Modal isOpen={passwordOtpModalOpen} onClose={() => !submittingPassword && setPasswordOtpModalOpen(false)} title="Confirm Password Rotation">
          <div>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "24px" }}>
              A 6-digit OTP verification code has been dispatched to your email address to validate your password update.
            </p>

            <div style={{ display: "flex", justifyContent: "center", marginBottom: "32px" }}>
              <OtpInput onComplete={handleVerifyPasswordChange} onResend={async () => { await resendOtp({ purpose: "CHANGE_PASSWORD" }); }} />
            </div>

            <button 
              type="button" 
              onClick={() => setPasswordOtpModalOpen(false)} 
              className="btn btn-secondary"
              disabled={submittingPassword}
              style={{ width: "100%" }}
            >
              Cancel
            </button>
          </div>
        </Modal>

      {/* PIN change OTP Verification Modal */}
      <Modal isOpen={pinOtpModalOpen} onClose={() => !submittingPin && setPinOtpModalOpen(false)} title="Confirm PIN Rotation">
          <div>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "24px" }}>
              A 6-digit OTP verification code has been dispatched to your email address to validate your transaction PIN update.
            </p>

            <div style={{ display: "flex", justifyContent: "center", marginBottom: "32px" }}>
              <OtpInput onComplete={handleVerifyPinChange} onResend={async () => { await sendPinChangeOtp(); }} />
            </div>

            <button 
              type="button" 
              onClick={() => setPinOtpModalOpen(false)} 
              className="btn btn-secondary"
              disabled={submittingPin}
              style={{ width: "100%" }}
            >
              Cancel
            </button>
          </div>
        </Modal>
    </div>
  );
}
