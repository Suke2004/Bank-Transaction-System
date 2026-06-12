"use client";

import React, { useEffect, useState } from "react";
import { 
  adminGetTransactions, 
  adminFlagTransaction, 
  adminReverseTransaction 
} from "@/lib/api/admin";
import { useAuth } from "@/lib/context/AuthContext";
import { Transaction } from "@/lib/api/transactions";
import { formatRupees } from "@/lib/utils/currency";
import { formatIST } from "@/lib/utils/date";
import { showToast } from "@/lib/utils/toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import { ShieldAlert, RefreshCw, Eye, AlertCircle, FileText } from "lucide-react";

export default function AdminTransactionsControlPage() {
  const { user: currentUser } = useAuth();

  // Data State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [flaggedFilter, setFlaggedFilter] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalTransactions, setTotalTransactions] = useState<number>(0);

  // Selected item states
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  
  // Modal control states
  const [flagModalOpen, setFlagModalOpen] = useState<boolean>(false);
  const [flagReason, setFlagReason] = useState<string>("");
  const [submittingFlag, setSubmittingFlag] = useState<boolean>(false);

  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);

  const [reversing, setReversing] = useState<boolean>(false);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await adminGetTransactions({
        status: statusFilter || undefined,
        flagged: flaggedFilter || undefined,
        page,
        limit: 10
      });
      setTransactions(res.transactions || []);
      setTotalPages(res.pagination?.pages || 1);
      setTotalTransactions(res.pagination?.total || 0);
    } catch (err: any) {
      showToast(err.message || "Failed to load transaction history", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [statusFilter, flaggedFilter, page]);

  // Actions
  const handleFlagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTx) return;
    if (!flagReason.trim()) {
      showToast("Flag reason is required", "warning");
      return;
    }

    try {
      setSubmittingFlag(true);
      await adminFlagTransaction(selectedTx._id, flagReason.trim());
      showToast("Transaction flagged as suspicious", "success");
      setFlagModalOpen(false);
      setFlagReason("");
      setSelectedTx(null);
      fetchTransactions();
    } catch (err: any) {
      showToast(err.message || "Failed to flag transaction", "error");
    } finally {
      setSubmittingFlag(false);
    }
  };

  const handleReverse = async (txId: string) => {
    if (window.confirm("CRITICAL: This will issue compensating ledger credit/debit adjustments to restore balances. Are you sure you want to reverse this transaction?")) {
      try {
        setReversing(true);
        await adminReverseTransaction(txId);
        showToast("Transaction reversed successfully", "success");
        fetchTransactions();
      } catch (err: any) {
        showToast(err.message || "Failed to reverse transaction", "error");
      } finally {
        setReversing(false);
      }
    }
  };

  const isManagerOrAbove = currentUser && ["manager", "admin", "superAdmin"].includes(currentUser.role);

  return (
    <div style={{ animation: "slideUp var(--transition-normal)", display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "4px" }}>System Ledger Transfers</h1>
        <p style={{ color: "var(--text-secondary)" }}>Audit all transaction flows, mark transfers for AML compliance reviews, or issue ledger reversals.</p>
      </div>

      {/* Filter panel */}
      <div className="glass-card" style={{ padding: "16px", display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
        <select 
          value={statusFilter} 
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="form-input" 
          style={{ width: "200px", padding: "10px 16px" }}
        >
          <option value="">All Statuses</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="PENDING">PENDING</option>
          <option value="FAILED">FAILED</option>
          <option value="REVERSED">REVERSED</option>
        </select>

        {/* Flagged Checkbox */}
        <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "14px", cursor: "pointer" }}>
          <input 
            type="checkbox" 
            checked={flaggedFilter}
            onChange={(e) => { setFlaggedFilter(e.target.checked); setPage(1); }}
            style={{ width: "16px", height: "16px", accentColor: "var(--accent-blue)" }}
          />
          <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Suspicious/Flagged Only</span>
        </label>
      </div>

      {/* Transactions Table */}
      <div className="glass-card" style={{ padding: 0 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                <th style={{ padding: "16px 24px" }}>Tx ID</th>
                <th style={{ padding: "16px 24px" }}>Sender Account</th>
                <th style={{ padding: "16px 24px" }}>Recipient Account</th>
                <th style={{ padding: "16px 24px" }}>Amount</th>
                <th style={{ padding: "16px 24px" }}>Status</th>
                <th style={{ padding: "16px 24px", textAlign: "right" }}>Compliance Control</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "16px 24px" }}><Skeleton width="60px" /></td>
                    <td style={{ padding: "16px 24px" }}><Skeleton width="120px" /></td>
                    <td style={{ padding: "16px 24px" }}><Skeleton width="120px" /></td>
                    <td style={{ padding: "16px 24px" }}><Skeleton width="80px" /></td>
                    <td style={{ padding: "16px 24px" }}><Skeleton width="80px" /></td>
                    <td style={{ padding: "16px 24px", textAlign: "right" }}><Skeleton width="140px" /></td>
                  </tr>
                ))
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "48px 0", textAlign: "center", color: "var(--text-secondary)", fontStyle: "italic" }}>
                    No transactions matched your filters.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx._id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "16px 24px", fontFamily: "var(--font-mono)" }}>
                      {tx._id.slice(-8)}
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ fontWeight: 500 }}>{tx.fromAccount?.user?.name || "Corporate Reserve"}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                        ID: {tx.fromAccount?._id || "System"}
                      </div>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ fontWeight: 500 }}>{tx.toAccount?.user?.name || "Corporate Reserve"}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                        ID: {tx.toAccount?._id || "System"}
                      </div>
                    </td>
                    <td style={{ padding: "16px 24px", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                      {formatRupees(tx.amount)}
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <Badge label={tx.status} />
                        {tx.flagged && (
                          <span style={{ 
                            fontSize: "10px", 
                            background: "rgba(255, 77, 106, 0.15)", 
                            color: "var(--error)", 
                            padding: "2px 6px", 
                            borderRadius: "6px",
                            fontWeight: 600,
                            width: "fit-content"
                          }}>
                            FLAGGED SUSPICIOUS
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "8px" }}>
                        {/* Inspect details */}
                        <button 
                          onClick={() => { setSelectedTx(tx); setDetailModalOpen(true); }}
                          className="btn btn-secondary"
                          style={{ padding: "6px 10px", fontSize: "12px", borderRadius: "6px" }}
                          title="Inspect Details"
                        >
                          <Eye size={14} />
                        </button>

                        {isManagerOrAbove && (
                          <>
                            {/* Flag Suspicious */}
                            {!tx.flagged && tx.status !== "FAILED" && (
                              <button 
                                onClick={() => { setSelectedTx(tx); setFlagModalOpen(true); }}
                                className="btn btn-secondary"
                                style={{ padding: "6px 10px", fontSize: "12px", borderRadius: "6px", color: "var(--error)" }}
                                title="Flag Transaction"
                              >
                                <ShieldAlert size={14} />
                              </button>
                            )}

                            {/* Reverse completed transfer */}
                            {tx.status === "COMPLETED" && (
                              <button 
                                onClick={() => handleReverse(tx._id)}
                                className="btn btn-secondary"
                                style={{ padding: "6px 10px", fontSize: "12px", borderRadius: "6px", color: "var(--accent-blue)" }}
                                disabled={reversing}
                                title="Reverse Completed Transfer"
                              >
                                <RefreshCw size={14} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
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
            totalItems={totalTransactions}
            limit={10}
            onPageChange={setPage} 
          />
        </div>
      )}

      {/* Flag suspicious transaction modal */}
      {flagModalOpen && (
        <Modal 
          isOpen={flagModalOpen} 
          onClose={() => !submittingFlag && setFlagModalOpen(false)}
          title="Flag Ledger Entry"
        >
          <form onSubmit={handleFlagSubmit}>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "20px" }}>
              Specify the AML compliance reasoning for flagging this payment as suspicious.
            </p>

            <div className="form-group">
              <label className="form-label">Suspicion Reason</label>
              <textarea 
                value={flagReason} 
                onChange={(e) => setFlagReason(e.target.value)}
                placeholder="e.g. Unusually large transfer size, possible laundering pattern"
                required
                className="form-input"
                style={{ minHeight: "100px", resize: "vertical" }}
                autoFocus
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
              <button 
                type="button" 
                onClick={() => setFlagModalOpen(false)} 
                className="btn btn-secondary"
                disabled={submittingFlag}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-danger"
                disabled={submittingFlag}
              >
                {submittingFlag ? "Flagging..." : "Flag Entry"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Detail Inspection Modal */}
      {detailModalOpen && selectedTx && (
        <Modal 
          isOpen={detailModalOpen} 
          onClose={() => setDetailModalOpen(false)}
          title="Transaction Audit Record"
        >

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontSize: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Transaction ID</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{selectedTx._id}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Status</span>
              <Badge label={selectedTx.status} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Created At</span>
              <span>{formatIST(selectedTx.createdAt)}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--border)", paddingBottom: "12px" }}>
              <span style={{ color: "var(--text-secondary)" }}>Description</span>
              <span>{selectedTx.description || "—"}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "8px 0" }}>
              <div>
                <span style={{ fontSize: "11px", color: "var(--text-secondary)", display: "block" }}>SENDER</span>
                <span style={{ fontWeight: 600 }}>{selectedTx.fromAccount?.user?.name || "Corporate Reserve"}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-secondary)", display: "block" }}>
                  {selectedTx.fromAccount?._id || "System"}
                </span>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "var(--text-secondary)", display: "block" }}>RECIPIENT</span>
                <span style={{ fontWeight: 600 }}>{selectedTx.toAccount?.user?.name || "Corporate Reserve"}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-secondary)", display: "block" }}>
                  {selectedTx.toAccount?._id || "System"}
                </span>
              </div>
            </div>

            {selectedTx.flagged && (
              <div style={{ background: "rgba(255, 77, 106, 0.06)", border: "1px solid rgba(255, 77, 106, 0.2)", borderRadius: "8px", padding: "12px" }}>
                <span style={{ color: "var(--error)", fontWeight: 600, fontSize: "12px", display: "block", marginBottom: "4px" }}>
                  COMPLIANCE AUDIT REASON
                </span>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>
                  {selectedTx.flagReason || "Suspected transaction pattern lock."}
                </p>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface)", padding: "12px 16px", borderRadius: "8px", marginTop: "12px" }}>
              <span style={{ fontWeight: 500, fontSize: "13px", color: "var(--text-secondary)" }}>LEDGER AMOUNT</span>
              <span style={{ fontSize: "20px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--accent-blue)" }}>
                {formatRupees(selectedTx.amount)}
              </span>
            </div>
          </div>

          <button 
            onClick={() => setDetailModalOpen(false)} 
            className="btn btn-secondary" 
            style={{ width: "100%", marginTop: "24px" }}
          >
            Close Inspector
          </button>
        </Modal>
      )}
    </div>
  );
}
