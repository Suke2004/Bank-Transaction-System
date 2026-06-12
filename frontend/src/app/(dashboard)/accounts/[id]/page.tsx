"use client";

import React, { useEffect, useState, use } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  getAccountDetail, 
  getAccountStatement, 
  closeAccount, 
  Account, 
  StatementEntry 
} from "@/lib/api/accounts";
import { resendOtp } from "@/lib/api/auth";
import { formatRupees } from "@/lib/utils/currency";
import { formatIST } from "@/lib/utils/date";
import { showToast } from "@/lib/utils/toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import { OtpInput } from "@/components/ui/OtpInput";
import Link from "next/link";
import { 
  ArrowLeft, 
  Download, 
  Trash2, 
  Calendar, 
  Info, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock 
} from "lucide-react";

export default function AccountDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [account, setAccount] = useState<Account | null>(null);
  const [entries, setEntries] = useState<StatementEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Filters
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalEntries, setTotalEntries] = useState<number>(0);

  // Close Account modal
  const [closeModalOpen, setCloseModalOpen] = useState<boolean>(false);
  const [closeStep, setCloseStep] = useState<"confirm" | "otp">("confirm");
  const [sendingOtp, setSendingOtp] = useState<boolean>(false);
  const [closing, setClosing] = useState<boolean>(false);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const accRes = await getAccountDetail(id);
      setAccount(accRes.account);

      const stmtRes = await getAccountStatement(id, {
        from: fromDate || undefined,
        to: toDate || undefined,
        page,
        limit: 10
      });
      setEntries(stmtRes.entries || []);
      setTotalPages(stmtRes.pagination?.pages || 1);
      setTotalEntries(stmtRes.pagination?.total || 0);
    } catch (err: any) {
      showToast(err.message || "Failed to load account details", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id, page, fromDate, toDate]);

  // Calculations based on statement entries
  const totalCredited = entries
    .filter(e => e.type === "CREDIT")
    .reduce((sum, curr) => sum + curr.amount, 0);

  const totalDebited = entries
    .filter(e => e.type === "DEBIT")
    .reduce((sum, curr) => sum + curr.amount, 0);

  const handleDownloadCsv = () => {
    let url = `/api/v1/accounts/${id}/statement/csv`;
    const qParams = new URLSearchParams();
    if (fromDate) qParams.append("from", fromDate);
    if (toDate) qParams.append("to", toDate);
    
    const queryString = qParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    
    window.open(url, "_blank");
    showToast("Statement CSV download initiated", "info");
  };

  const handleStartCloseFlow = async () => {
    if (account && account.balance > 0) {
      showToast("Account balance must be exactly ₹0.00 to close it. Please transfer out your remaining funds first.", "warning");
      return;
    }
    
    try {
      setSendingOtp(true);
      setCloseModalOpen(true);
      setCloseStep("confirm");
    } catch (err: any) {
      showToast(err.message || "Failed to initiate close flow", "error");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSendCloseOtp = async () => {
    try {
      setSendingOtp(true);
      await resendOtp({ purpose: "CLOSE_ACCOUNT" });
      showToast("OTP sent to your registered email address", "success");
      setCloseStep("otp");
    } catch (err: any) {
      showToast(err.message || "Failed to send OTP", "error");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyCloseOtp = async (otp: string) => {
    try {
      setClosing(true);
      await closeAccount(id, otp);
      showToast("Account ledger closed successfully", "success");
      setCloseModalOpen(false);
      router.push("/accounts");
    } catch (err: any) {
      showToast(err.message || "Verification failed. Please check the OTP.", "error");
    } finally {
      setClosing(false);
    }
  };

  return (
    <div style={{ animation: "slideUp var(--transition-normal)", display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Back button */}
      <div>
        <button 
          onClick={() => router.push("/accounts")} 
          style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)", fontSize: "14px", fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}
        >
          <ArrowLeft size={16} />
          <span>Back to Ledgers</span>
        </button>
      </div>

      {/* Account Info Header */}
      {loading && !account ? (
        <Skeleton height="100px" />
      ) : account ? (
        <div className="glass-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "24px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <h1 style={{ fontSize: "24px", fontWeight: 700 }}>{account.nickname || "Ledger Account"}</h1>
              <Badge label={account.status} variant="status" />
            </div>
            <p style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)", fontSize: "14px", marginBottom: "4px" }}>
              ID: {account._id}
            </p>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
              Opened on {formatIST(account.createdAt)}
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button onClick={handleDownloadCsv} className="btn btn-secondary">
              <Download size={18} />
              <span>Download CSV</span>
            </button>
            {account.status !== "CLOSED" && (
              <button onClick={handleStartCloseFlow} className="btn btn-danger">
                <Trash2 size={18} />
                <span>Close Ledger</span>
              </button>
            )}
          </div>
        </div>
      ) : null}

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
        <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>CURRENT BALANCE</span>
          <span style={{ fontSize: "22px", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
            {loading && !account ? <Skeleton width="100px" height="26px" /> : formatRupees(account?.balance || 0)}
          </span>
        </div>

        <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>CREDITS IN STATEMENT</span>
          <span style={{ fontSize: "22px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--accent-emerald)" }}>
            {loading ? <Skeleton width="100px" height="26px" /> : formatRupees(totalCredited)}
          </span>
        </div>

        <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>DEBITS IN STATEMENT</span>
          <span style={{ fontSize: "22px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--error)" }}>
            {loading ? <Skeleton width="100px" height="26px" /> : formatRupees(totalDebited)}
          </span>
        </div>

        <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>TRANSACTION COUNT</span>
          <span style={{ fontSize: "22px", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
            {loading ? <Skeleton width="80px" height="26px" /> : totalEntries}
          </span>
        </div>
      </div>

      {/* Date filter & Ledger entries */}
      <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 600 }}>Ledger Statement</h2>
          
          {/* Date Pickers */}
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(10,22,40,0.8)", border: "1px solid var(--border)", padding: "8px 12px", borderRadius: "8px" }}>
              <Calendar size={16} style={{ color: "var(--text-secondary)" }} />
              <input 
                type="date" 
                value={fromDate} 
                onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                style={{ background: "none", border: "none", color: "var(--text-primary)", fontSize: "14px" }}
              />
            </div>
            <span style={{ color: "var(--text-secondary)" }}>to</span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(10,22,40,0.8)", border: "1px solid var(--border)", padding: "8px 12px", borderRadius: "8px" }}>
              <Calendar size={16} style={{ color: "var(--text-secondary)" }} />
              <input 
                type="date" 
                value={toDate} 
                onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                style={{ background: "none", border: "none", color: "var(--text-primary)", fontSize: "14px" }}
              />
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                <th style={{ padding: "12px 16px" }}>Timestamp</th>
                <th style={{ padding: "12px 16px" }}>Transaction ID / Description</th>
                <th style={{ padding: "12px 16px" }}>Type</th>
                <th style={{ padding: "12px 16px", textAnchor: "end", textAlign: "right" }}>Amount</th>
                <th style={{ padding: "12px 16px", textAnchor: "end", textAlign: "right" }}>Running Balance</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "16px" }}><Skeleton width="120px" /></td>
                    <td style={{ padding: "16px" }}><Skeleton width="220px" /></td>
                    <td style={{ padding: "16px" }}><Skeleton width="60px" /></td>
                    <td style={{ padding: "16px" }}><Skeleton width="80px" /></td>
                    <td style={{ padding: "16px" }}><Skeleton width="80px" /></td>
                  </tr>
                ))
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
                    No statement entries found for the selected period.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const isCredit = entry.type === "CREDIT";
                  return (
                    <tr key={entry._id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "16px" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Clock size={14} style={{ color: "var(--text-secondary)" }} />
                          {formatIST(entry.createdAt)}
                        </span>
                      </td>
                      <td style={{ padding: "16px" }}>
                        <div style={{ fontWeight: 500 }}>
                          {entry.transaction ? (
                            <Link href={`/transactions/${entry.transaction._id}`} style={{ color: "var(--accent-blue)" }}>
                              {entry.transaction.description || "Fund Transfer"}
                            </Link>
                          ) : (
                            "System Funding"
                          )}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                          ID: {entry.transaction?._id || entry._id}
                        </div>
                      </td>
                      <td style={{ padding: "16px" }}>
                        <span style={{ 
                          display: "inline-flex", 
                          alignItems: "center", 
                          gap: "4px",
                          color: isCredit ? "var(--accent-emerald)" : "var(--error)",
                          fontWeight: 600,
                          fontSize: "13px"
                        }}>
                          {isCredit ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                          {entry.type}
                        </span>
                      </td>
                      <td style={{ padding: "16px", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600, color: isCredit ? "var(--accent-emerald)" : "var(--text-primary)" }}>
                        {isCredit ? "+" : "-"}{formatRupees(entry.amount)}
                      </td>
                      <td style={{ padding: "16px", textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                        {entry.balanceAfter !== undefined ? formatRupees(entry.balanceAfter) : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
            <Pagination 
              page={page} 
              totalPages={totalPages} 
              totalItems={totalEntries}
              limit={10}
              onPageChange={setPage} 
            />
          </div>
        )}
      </div>

      {/* Close Account Modal */}
      {closeModalOpen && (
        <Modal 
          isOpen={closeModalOpen} 
          onClose={() => !closing && setCloseModalOpen(false)}
          title="Close Ledger Account"
        >
          {closeStep === "confirm" ? (
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: 600, color: "var(--error)", marginBottom: "16px" }}>
                Close Account Ledger?
              </h2>
              <div style={{ background: "rgba(255, 77, 106, 0.08)", border: "1px solid rgba(255, 77, 106, 0.3)", borderRadius: "8px", padding: "16px", marginBottom: "20px", fontSize: "14px", display: "flex", gap: "12px" }}>
                <Info size={20} style={{ flexShrink: 0, color: "var(--error)" }} />
                <div>
                  <p style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>Critical Warning</p>
                  <p style={{ color: "var(--text-secondary)" }}>
                    Closing this ledger is permanent. The history will remain in system logs for regulatory audit, but you will no longer be able to make transfers, receive funds, or view this ledger on your active dashboard.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button onClick={() => setCloseModalOpen(false)} className="btn btn-secondary">
                  Abort
                </button>
                <button 
                  onClick={handleSendCloseOtp} 
                  className="btn btn-danger" 
                  disabled={sendingOtp}
                >
                  {sendingOtp ? "Sending Verification..." : "Confirm & Send OTP"}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "16px" }}>Verify OTP to Close</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "24px" }}>
                We have dispatched a 6-digit OTP code to your registered email to complete the closure request.
              </p>
              
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "32px" }}>
                <OtpInput onComplete={handleVerifyCloseOtp} onResend={handleSendCloseOtp} />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button 
                  type="button" 
                  onClick={() => setCloseStep("confirm")} 
                  className="btn btn-secondary"
                  disabled={closing}
                >
                  Back
                </button>
                
                {closing && (
                  <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                    Closing Ledger Account...
                  </span>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
