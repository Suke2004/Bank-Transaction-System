"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getTransactionDetail, Transaction } from "@/lib/api/transactions";
import { formatRupees } from "@/lib/utils/currency";
import { formatIST } from "@/lib/utils/date";
import { showToast } from "@/lib/utils/toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { 
  ArrowLeft, 
  Printer, 
  Copy, 
  ExternalLink, 
  ShieldAlert, 
  CheckCircle,
  HelpCircle,
  Clock
} from "lucide-react";

export default function TransactionDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadDetail = async () => {
      try {
        setLoading(true);
        const res = await getTransactionDetail(id);
        setTransaction(res.transaction);
      } catch (err: any) {
        showToast(err.message || "Failed to load transaction details", "error");
      } finally {
        setLoading(false);
      }
    };

    loadDetail();
  }, [id]);

  const handleCopyId = () => {
    if (transaction) {
      navigator.clipboard.writeText(transaction._id);
      showToast("Transaction ID copied to clipboard", "success");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "40px 0" }}>
        <div style={{ marginBottom: "20px" }}><Skeleton height="40px" /></div>
        <Skeleton height="350px" />
      </div>
    );
  }

  if (!transaction) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <HelpCircle size={48} style={{ color: "var(--text-secondary)", marginBottom: "16px" }} />
        <h2 style={{ fontSize: "20px", fontWeight: 600 }}>Transaction Not Found</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
          The requested transaction ID does not exist or you do not have permission to view it.
        </p>
        <button onClick={() => router.push("/transactions")} className="btn btn-primary">
          Back to History
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto", animation: "slideUp var(--transition-normal)" }}>
      {/* Back button and Print header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", contentVisibility: "auto" }} className="no-print">
        <button 
          onClick={() => router.push("/transactions")} 
          style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)", fontSize: "14px", fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}
        >
          <ArrowLeft size={16} />
          <span>Back to Transactions</span>
        </button>

        <button onClick={handlePrint} className="btn btn-secondary" style={{ padding: "8px 16px" }}>
          <Printer size={16} />
          <span>Print Receipt</span>
        </button>
      </div>

      {/* Main Receipt Card */}
      <div className="glass-card" style={{ padding: "40px", border: "1px solid var(--border)", position: "relative", overflow: "hidden" }}>
        {/* Print watermarks/lines */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "32px", borderBottom: "1px solid var(--border)", paddingBottom: "24px" }}>
          <CheckCircle size={48} style={{ color: "var(--accent-emerald)", marginBottom: "16px" }} />
          <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: "1px" }}>
            Payment Receipt
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "4px" }}>
            Official Ledger Record
          </p>
        </div>

        {/* Flagged Alert Banner */}
        {transaction.flagged && (
          <div style={{ background: "rgba(255, 77, 106, 0.08)", border: "1px solid rgba(255, 77, 106, 0.3)", borderRadius: "8px", padding: "16px", marginBottom: "24px", display: "flex", gap: "12px", color: "var(--error)", fontSize: "14px" }}>
            <ShieldAlert size={20} style={{ flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: 600, marginBottom: "2px" }}>Flagged Transaction</p>
              <p style={{ color: "var(--text-secondary)" }}>
                This ledger transfer has been marked as suspicious and is undergoing security audit compliance checks.
              </p>
            </div>
          </div>
        )}

        {/* Detail entries */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Transaction ID</span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "14px", fontWeight: 600 }}>
                {transaction._id}
              </span>
              <button onClick={handleCopyId} style={{ color: "var(--text-secondary)" }} className="no-print">
                <Copy size={14} />
              </button>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Status</span>
            <Badge label={transaction.status} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "16px" }}>
            <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Timestamp</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "14px" }}>
              <Clock size={14} style={{ color: "var(--text-secondary)" }} />
              {formatIST(transaction.createdAt)}
            </span>
          </div>

          {/* Accounts */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "12px 0" }}>
            <div>
              <span style={{ color: "var(--text-secondary)", fontSize: "12px", display: "block", marginBottom: "4px" }}>
                SENDER
              </span>
              <span style={{ fontSize: "15px", fontWeight: 600 }}>
                {transaction.fromAccount?.user?.name || "Sender Account"}
              </span>
              <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--text-secondary)" }}>
                {transaction.fromAccount?._id || "—"}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "center", padding: "4px 0" }}>
              <div style={{ width: "2px", height: "16px", background: "var(--border)" }} />
            </div>

            <div>
              <span style={{ color: "var(--text-secondary)", fontSize: "12px", display: "block", marginBottom: "4px" }}>
                RECIPIENT
              </span>
              <span style={{ fontSize: "15px", fontWeight: 600 }}>
                {transaction.toAccount?.user?.name || "Recipient Account"}
              </span>
              <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--text-secondary)" }}>
                {transaction.toAccount?._id || "—"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
            <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Description Memo</span>
            <span style={{ fontSize: "14px", fontStyle: transaction.description ? "normal" : "italic" }}>
              {transaction.description || "None provided"}
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface)", padding: "16px 20px", borderRadius: "8px", marginTop: "12px" }}>
            <span style={{ color: "var(--text-secondary)", fontWeight: 500, fontSize: "14px" }}>
              TRANSACTION AMOUNT
            </span>
            <span style={{ fontSize: "22px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--accent-blue)" }}>
              {formatRupees(transaction.amount)}
            </span>
          </div>
        </div>

        {/* Security Footer */}
        <div style={{ marginTop: "40px", borderTop: "1px dashed var(--border)", paddingTop: "24px", textAlign: "center", fontSize: "12px", color: "var(--text-secondary)" }}>
          <p>This is a computer generated bank ledger record. No signature required.</p>
          <p style={{ marginTop: "4px" }}>Bank Ledger Security Encryption Verification Clearance: Argon2id Verified.</p>
        </div>
      </div>

      {/* CSS print override styles */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background-color: white !important;
            color: black !important;
          }
          .glass-card {
            border: none !important;
            box-shadow: none !important;
            background: none !important;
            padding: 0 !important;
            color: black !important;
          }
          table, th, td, tr, p, div, span {
            color: black !important;
          }
        }
      `}</style>
    </div>
  );
}
