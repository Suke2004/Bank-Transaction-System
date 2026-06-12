"use client";

import React, { useEffect, useState } from "react";
import { 
  adminGetAccounts, 
  adminFreezeAccount, 
  adminUnfreezeAccount, 
  adminSetAccountLimit,
  adminFundAccount 
} from "@/lib/api/admin";
import { useAuth } from "@/lib/context/AuthContext";
import { Account } from "@/lib/api/accounts";
import { formatRupees } from "@/lib/utils/currency";
import { showToast } from "@/lib/utils/toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import { ShieldAlert, Snowflake, Flame, ShieldCheck, Landmark, Edit, CreditCard } from "lucide-react";

export default function AdminAccountsControlPage() {
  const { user: currentUser } = useAuth();
  
  // Data State
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalAccounts, setTotalAccounts] = useState<number>(0);

  // Selected Account details for actions
  const [selectedAcc, setSelectedAcc] = useState<Account | null>(null);

  // Modal control States
  const [freezeModalOpen, setFreezeModalOpen] = useState<boolean>(false);
  const [freezeReason, setFreezeReason] = useState<string>("");
  const [submittingFreeze, setSubmittingFreeze] = useState<boolean>(false);

  const [limitModalOpen, setLimitModalOpen] = useState<boolean>(false);
  const [limitAmount, setLimitAmount] = useState<string>("");
  const [submittingLimit, setSubmittingLimit] = useState<boolean>(false);

  const [fundModalOpen, setFundModalOpen] = useState<boolean>(false);
  const [fundAmount, setFundAmount] = useState<string>("");
  const [submittingFund, setSubmittingFund] = useState<boolean>(false);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await adminGetAccounts({
        status: statusFilter || undefined,
        page,
        limit: 10
      });
      setAccounts(res.accounts || []);
      setTotalPages(res.pagination?.pages || 1);
      setTotalAccounts(res.pagination?.total || 0);
    } catch (err: any) {
      showToast(err.message || "Failed to load bank ledger accounts", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [statusFilter, page]);

  // Actions
  const handleFreeze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAcc) return;
    if (!freezeReason.trim()) {
      showToast("A freeze reason is required", "warning");
      return;
    }

    try {
      setSubmittingFreeze(true);
      await adminFreezeAccount(selectedAcc._id, freezeReason.trim());
      showToast("Ledger account frozen", "success");
      setFreezeModalOpen(false);
      setFreezeReason("");
      setSelectedAcc(null);
      fetchAccounts();
    } catch (err: any) {
      showToast(err.message || "Failed to freeze account", "error");
    } finally {
      setSubmittingFreeze(false);
    }
  };

  const handleUnfreeze = async (accId: string) => {
    if (window.confirm("Restore status to ACTIVE?")) {
      try {
        await adminUnfreezeAccount(accId);
        showToast("Ledger account un-frozen successfully", "success");
        fetchAccounts();
      } catch (err: any) {
        showToast(err.message || "Failed to unfreeze account", "error");
      }
    }
  };

  const handleSetLimitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAcc) return;

    try {
      setSubmittingLimit(true);
      // If empty string, pass null to reset to system default limit
      const parsedLimit = limitAmount.trim() === "" ? null : parseFloat(limitAmount);
      await adminSetAccountLimit(selectedAcc._id, parsedLimit);
      showToast("Account limits updated", "success");
      setLimitModalOpen(false);
      setLimitAmount("");
      setSelectedAcc(null);
      fetchAccounts();
    } catch (err: any) {
      showToast(err.message || "Failed to adjust daily limit", "error");
    } finally {
      setSubmittingLimit(false);
    }
  };

  const handleFundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAcc) return;
    const amountNum = parseFloat(fundAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast("Please enter a valid credit amount", "warning");
      return;
    }

    try {
      setSubmittingFund(true);
      await adminFundAccount(selectedAcc._id, amountNum);
      showToast(`Ledger account credited with ${formatRupees(amountNum)}`, "success");
      setFundModalOpen(false);
      setFundAmount("");
      setSelectedAcc(null);
      fetchAccounts();
    } catch (err: any) {
      showToast(err.message || "Failed to credit account", "error");
    } finally {
      setSubmittingFund(false);
    }
  };

  const isManagerOrAbove = currentUser && ["manager", "admin", "superAdmin"].includes(currentUser.role);
  const isAdminOrAbove = currentUser && ["admin", "superAdmin"].includes(currentUser.role);

  return (
    <div style={{ animation: "slideUp var(--transition-normal)", display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "4px" }}>Ledger Accounts Control</h1>
        <p style={{ color: "var(--text-secondary)" }}>Manage individual ledgers, configure custom daily caps, and issue system credits.</p>
      </div>

      {/* Filter panel */}
      <div className="glass-card" style={{ padding: "16px", display: "flex", gap: "16px" }}>
        <select 
          value={statusFilter} 
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="form-input" 
          style={{ width: "200px", padding: "10px 16px" }}
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="FROZEN">FROZEN</option>
          <option value="CLOSED">CLOSED</option>
        </select>
      </div>

      {/* Accounts Directory table */}
      <div className="glass-card" style={{ padding: 0 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                <th style={{ padding: "16px 24px" }}>Account Title / ID</th>
                <th style={{ padding: "16px 24px" }}>Status</th>
                <th style={{ padding: "16px 24px" }}>Balance</th>
                <th style={{ padding: "16px 24px" }}>Daily Cap Limit</th>
                <th style={{ padding: "16px 24px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "16px 24px" }}><Skeleton width="180px" /></td>
                    <td style={{ padding: "16px 24px" }}><Skeleton width="60px" /></td>
                    <td style={{ padding: "16px 24px" }}><Skeleton width="100px" /></td>
                    <td style={{ padding: "16px 24px" }}><Skeleton width="100px" /></td>
                    <td style={{ padding: "16px 24px", textAlign: "right" }}><Skeleton width="180px" /></td>
                  </tr>
                ))
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "48px 0", textAlign: "center", color: "var(--text-secondary)", fontStyle: "italic" }}>
                    No ledger accounts fit your filters.
                  </td>
                </tr>
              ) : (
                accounts.map((acc) => (
                  <tr key={acc._id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ fontWeight: 600 }}>{acc.nickname || "General Ledger"}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                        ID: {acc._id}
                      </div>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <Badge label={acc.status} />
                    </td>
                    <td style={{ padding: "16px 24px", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                      {formatRupees(acc.balance)}
                    </td>
                    <td style={{ padding: "16px 24px", fontFamily: "var(--font-mono)", color: acc.dailyLimit ? "var(--text-primary)" : "var(--text-secondary)" }}>
                      {acc.dailyLimit ? formatRupees(acc.dailyLimit) : "System Default"}
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "right" }}>
                      {isManagerOrAbove && acc.status !== "CLOSED" && (
                        <div style={{ display: "inline-flex", gap: "8px" }}>
                          {/* Daily cap Limit adjust */}
                          <button 
                            onClick={() => { setSelectedAcc(acc); setLimitAmount(acc.dailyLimit ? acc.dailyLimit.toString() : ""); setLimitModalOpen(true); }}
                            className="btn btn-secondary"
                            style={{ padding: "6px 10px", fontSize: "12px", borderRadius: "6px" }}
                            title="Adjust Daily Cap Limit"
                          >
                            <Edit size={14} />
                          </button>

                          {/* Fund seeds (Admin+) */}
                          {isAdminOrAbove && (
                            <button 
                              onClick={() => { setSelectedAcc(acc); setFundModalOpen(true); }}
                              className="btn btn-secondary"
                              style={{ padding: "6px 10px", fontSize: "12px", borderRadius: "6px", color: "var(--accent-emerald)" }}
                              title="Seed Credit Funds"
                            >
                              <Landmark size={14} />
                            </button>
                          )}

                          {/* Freeze toggles */}
                          {acc.status === "ACTIVE" ? (
                            <button 
                              onClick={() => { setSelectedAcc(acc); setFreezeModalOpen(true); }}
                              className="btn btn-secondary"
                              style={{ padding: "6px 10px", fontSize: "12px", borderRadius: "6px", color: "var(--error)" }}
                              title="Freeze Ledger"
                            >
                              <Snowflake size={14} />
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleUnfreeze(acc._id)}
                              className="btn btn-secondary"
                              style={{ padding: "6px 10px", fontSize: "12px", borderRadius: "6px", color: "var(--accent-emerald)" }}
                              title="Unfreeze Ledger"
                            >
                              <Flame size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Pagination 
            page={page} 
            totalPages={totalPages} 
            totalItems={totalAccounts}
            limit={10}
            onPageChange={setPage} 
          />
        </div>
      )}

      {/* Freeze Account Reason Modal */}
      {freezeModalOpen && (
        <Modal 
          isOpen={freezeModalOpen} 
          onClose={() => !submittingFreeze && setFreezeModalOpen(false)}
          title="Freeze Account Ledger"
        >
          <form onSubmit={handleFreeze}>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "20px" }}>
              Provide the compliance or risk description for freezing this ledger account.
            </p>

            <div className="form-group">
              <label className="form-label">Reason for freezing</label>
              <textarea 
                value={freezeReason} 
                onChange={(e) => setFreezeReason(e.target.value)}
                placeholder="e.g. AML compliance review, suspected account takeover"
                required
                className="form-input"
                style={{ minHeight: "100px", resize: "vertical" }}
                autoFocus
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
              <button 
                type="button" 
                onClick={() => setFreezeModalOpen(false)} 
                className="btn btn-secondary"
                disabled={submittingFreeze}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-danger"
                disabled={submittingFreeze}
              >
                {submittingFreeze ? "Freezing..." : "Freeze Ledger"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Adjust Daily caps Modal */}
      {limitModalOpen && (
        <Modal 
          isOpen={limitModalOpen} 
          onClose={() => !submittingLimit && setLimitModalOpen(false)}
          title="Adjust Daily cap Limit"
        >
          <form onSubmit={handleSetLimitSubmit}>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "20px" }}>
              Configure account-specific daily limit (INR). Leave input empty to restore to the system default configuration limit.
            </p>

            <div className="form-group">
              <label className="form-label">Daily Transfer Limit (INR)</label>
              <input 
                type="number" 
                step="1"
                value={limitAmount} 
                onChange={(e) => setLimitAmount(e.target.value)}
                placeholder="e.g. 50000 (Empty for System default)"
                className="form-input"
                autoFocus
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
              <button 
                type="button" 
                onClick={() => setLimitModalOpen(false)} 
                className="btn btn-secondary"
                disabled={submittingLimit}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={submittingLimit}
              >
                {submittingLimit ? "Updating..." : "Update Daily Limit"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Fund seed Modal */}
      {fundModalOpen && (
        <Modal 
          isOpen={fundModalOpen} 
          onClose={() => !submittingFund && setFundModalOpen(false)}
          title="Credit Ledger Account"
        >
          <form onSubmit={handleFundSubmit}>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "20px" }}>
              Specify the amount to be directly credited/funded into this ledger. This action is recorded on system audit trails.
            </p>

            <div className="form-group">
              <label className="form-label">Funding Amount (INR)</label>
              <input 
                type="number" 
                step="0.01"
                min="0.01"
                value={fundAmount} 
                onChange={(e) => setFundAmount(e.target.value)}
                placeholder="₹ 0.00"
                required
                className="form-input"
                autoFocus
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
              <button 
                type="button" 
                onClick={() => setFundModalOpen(false)} 
                className="btn btn-secondary"
                disabled={submittingFund}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ background: "var(--accent-emerald)" }}
                disabled={submittingFund}
              >
                {submittingFund ? "Executing credit..." : "Issue Credit"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
