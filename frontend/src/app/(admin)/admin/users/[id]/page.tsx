"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  adminGetUserDetail, 
  adminSuspendUser, 
  adminUnsuspendUser, 
  adminChangeUserRole 
} from "@/lib/api/admin";
import { useAuth } from "@/lib/context/AuthContext";
import { Account } from "@/lib/api/accounts";
import { Session } from "@/lib/api/auth";
import { formatRupees } from "@/lib/utils/currency";
import { formatIST } from "@/lib/utils/date";
import { showToast } from "@/lib/utils/toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { 
  ArrowLeft, 
  User, 
  ShieldAlert, 
  Activity, 
  Smartphone, 
  Slash,
  Lock,
  Unlock,
  KeyRound,
  History
} from "lucide-react";

export default function AdminUserDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user: currentUser } = useAuth(); // Logged-in admin user

  const [targetUser, setTargetUser] = useState<any>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Suspension state
  const [suspendModalOpen, setSuspendModalOpen] = useState<boolean>(false);
  const [suspendReason, setSuspendReason] = useState<string>("");
  const [submittingSuspend, setSubmittingSuspend] = useState<boolean>(false);

  // Role modification state
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [submittingRole, setSubmittingRole] = useState<boolean>(false);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const res = await adminGetUserDetail(id);
      setTargetUser(res.user);
      setAccounts(res.accounts || []);
      setSessions(res.sessions || []);
      setSelectedRole(res.user?.role || "customer");
    } catch (err: any) {
      showToast(err.message || "Failed to load user profile details", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetails();
  }, [id]);

  const handleSuspend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspendReason.trim()) {
      showToast("Suspension reason is required", "warning");
      return;
    }

    try {
      setSubmittingSuspend(true);
      await adminSuspendUser(id, suspendReason.trim());
      showToast("User suspended successfully", "success");
      setSuspendModalOpen(false);
      setSuspendReason("");
      fetchUserDetails();
    } catch (err: any) {
      showToast(err.message || "Failed to suspend user", "error");
    } finally {
      setSubmittingSuspend(false);
    }
  };

  const handleUnsuspend = async () => {
    if (window.confirm("Restore status and activate all associated accounts?")) {
      try {
        await adminUnsuspendUser(id);
        showToast("User unsuspended successfully", "success");
        fetchUserDetails();
      } catch (err: any) {
        showToast(err.message || "Failed to unsuspend user", "error");
      }
    }
  };

  const handleRoleChange = async () => {
    if (selectedRole === targetUser?.role) {
      showToast("Role is already set to the selected value", "info");
      return;
    }

    if (window.confirm(`Elevate/change role of user to ${selectedRole.toUpperCase()}?`)) {
      try {
        setSubmittingRole(true);
        await adminChangeUserRole(id, selectedRole);
        showToast("User role updated successfully", "success");
        fetchUserDetails();
      } catch (err: any) {
        showToast(err.message || "Failed to update user role", "error");
      } finally {
        setSubmittingRole(false);
      }
    }
  };

  if (loading && !targetUser) {
    return (
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 0" }}>
        <div style={{ marginBottom: "20px" }}><Skeleton height="40px" /></div>
        <Skeleton height="300px" />
      </div>
    );
  }

  const isManagerOrAbove = currentUser && ["manager", "admin", "superAdmin"].includes(currentUser.role);
  const isSuperAdmin = currentUser && currentUser.role === "superAdmin";

  return (
    <div style={{ animation: "slideUp var(--transition-normal)", display: "flex", flexDirection: "column", gap: "32px", maxWidth: "900px", margin: "0 auto" }}>
      {/* Back link */}
      <div>
        <button 
          onClick={() => router.push("/admin/users")} 
          style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)", fontSize: "14px", fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}
        >
          <ArrowLeft size={16} />
          <span>Back to Directory</span>
        </button>
      </div>

      {/* Profile Header */}
      {targetUser && (
        <div className="glass-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--border)", color: "var(--accent-blue)" }}>
              <User size={28} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
                <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0 }}>{targetUser.name}</h1>
                <Badge label={targetUser.isActive ? "ACTIVE" : "CLOSED"} />
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>{targetUser.email}</p>
            </div>
          </div>

          {/* Suspend/Unsuspend Buttons */}
          {isManagerOrAbove && (
            <div style={{ display: "flex", gap: "12px" }}>
              {targetUser.isActive ? (
                <button onClick={() => setSuspendModalOpen(true)} className="btn btn-danger">
                  <Lock size={16} />
                  <span>Suspend User</span>
                </button>
              ) : (
                <button onClick={handleUnsuspend} className="btn btn-primary" style={{ background: "var(--accent-emerald)" }}>
                  <Unlock size={16} />
                  <span>Unsuspend User</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Suspended Details Banner */}
      {targetUser && !targetUser.isActive && (
        <div style={{ background: "rgba(255, 77, 106, 0.08)", border: "1px solid rgba(255, 77, 106, 0.3)", borderRadius: "8px", padding: "16px", display: "flex", gap: "12px", color: "var(--error)", fontSize: "14px" }}>
          <ShieldAlert size={20} style={{ flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: 600, marginBottom: "4px" }}>Suspended Account Metadata</p>
            <p style={{ color: "var(--text-secondary)", marginBottom: "4px" }}>
              <strong>Reason:</strong> {targetUser.suspendReason || "Regulatory compliance check."}
            </p>
            <p style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
              Frozen on {targetUser.suspendedAt ? formatIST(targetUser.suspendedAt) : "—"}
            </p>
          </div>
        </div>
      )}

      {/* Grid: Left holds Accounts, Right holds Role Modification & Sessions */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px" }}>
        {/* Accounts List */}
        <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>Associated Ledgers</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {accounts.length === 0 ? (
              <p style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>User holds zero accounts.</p>
            ) : (
              accounts.map((acc) => (
                <div 
                  key={acc._id} 
                  style={{ 
                    padding: "16px", 
                    background: "rgba(10,22,40,0.5)", 
                    border: "1px solid var(--border)", 
                    borderRadius: "10px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: 600, fontSize: "14px" }}>{acc.nickname || "Savings Account"}</span>
                      <Badge label={acc.status} />
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-secondary)", display: "block", marginTop: "4px" }}>
                      ID: {acc._id}
                    </span>
                  </div>

                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "16px" }}>
                    {formatRupees(acc.balance)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right side controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Role Change Control (Super Admin Only) */}
          {isSuperAdmin && targetUser && (
            <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <KeyRound size={18} style={{ color: "var(--accent-blue)" }} />
                <h2 style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>Security Role Access</h2>
              </div>
              
              <div style={{ display: "flex", gap: "12px" }}>
                <select 
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="form-input"
                  style={{ padding: "8px 12px" }}
                >
                  <option value="customer">Customer</option>
                  <option value="teller">Teller</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Administrator</option>
                  <option value="superAdmin">Super Administrator</option>
                </select>

                <button 
                  onClick={handleRoleChange} 
                  className="btn btn-primary"
                  disabled={submittingRole}
                >
                  Update
                </button>
              </div>
            </div>
          )}

          {/* Sessions List */}
          <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Smartphone size={18} style={{ color: "var(--text-secondary)" }} />
              <h2 style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>Active User Sessions</h2>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {sessions.length === 0 ? (
                <p style={{ color: "var(--text-secondary)", fontStyle: "italic", fontSize: "13px" }}>No active sessions.</p>
              ) : (
                sessions.map((sess) => (
                  <div 
                    key={sess._id} 
                    style={{ 
                      padding: "12px", 
                      background: "rgba(10,22,40,0.5)", 
                      border: "1px solid var(--border)", 
                      borderRadius: "8px",
                      fontSize: "13px"
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{sess.deviceInfo || "Web Browser"}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)", marginTop: "4px", fontSize: "11px" }}>
                      <span>IP: {sess.ipAddress}</span>
                      <span>Active: {formatIST(sess.lastUsedAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Suspend Modal */}
      {suspendModalOpen && (
        <Modal 
          isOpen={suspendModalOpen} 
          onClose={() => !submittingSuspend && setSuspendModalOpen(false)}
          title="Confirm Account Suspension"
        >
          <form onSubmit={handleSuspend}>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "20px" }}>
              Specify the security reason for locking this user's profile and freezing all holdings.
            </p>

            <div className="form-group">
              <label className="form-label">Reason for Suspension</label>
              <textarea 
                value={suspendReason} 
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="e.g. Suspected transaction laundering, pending investigation"
                required
                className="form-input"
                style={{ minHeight: "100px", padding: "12px", resize: "vertical" }}
                autoFocus
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
              <button 
                type="button" 
                onClick={() => setSuspendModalOpen(false)} 
                className="btn btn-secondary"
                disabled={submittingSuspend}
              >
                Abort
              </button>
              <button 
                type="submit" 
                className="btn btn-danger"
                disabled={submittingSuspend}
              >
                {submittingSuspend ? "Freezing User..." : "Confirm Freeze"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
