"use client";

import React, { useEffect, useState } from "react";
import { getAccounts, createAccount, Account } from "@/lib/api/accounts";
import { AccountCard } from "@/components/banking/AccountCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { showToast } from "@/lib/utils/toast";
import { Plus, Check, ShieldAlert } from "lucide-react";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [nickname, setNickname] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const res = await getAccounts();
      setAccounts(res.accounts || []);
    } catch (err: any) {
      showToast(err.message || "Failed to load accounts", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleOpenAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await createAccount(nickname.trim() || undefined);
      showToast("Account ledger created successfully", "success");
      setNickname("");
      setModalOpen(false);
      await loadAccounts();
    } catch (err: any) {
      showToast(err.message || "Could not open new account", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ animation: "slideUp var(--transition-normal)", display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Header section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "4px" }}>Account Ledgers</h1>
          <p style={{ color: "var(--text-secondary)" }}>Manage your multiple active balances and credit accounts.</p>
        </div>
        
        <button 
          onClick={() => setModalOpen(true)}
          className="btn btn-primary"
          disabled={loading || accounts.length >= 5}
        >
          <Plus size={18} />
          <span>Open New Ledger</span>
        </button>
      </div>

      {/* Account cards grid */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
          <Skeleton height="160px" />
          <Skeleton height="160px" />
          <Skeleton height="160px" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="glass-card" style={{ padding: "60px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <ShieldAlert size={48} style={{ color: "var(--text-secondary)" }} />
          <h2 style={{ fontSize: "20px", fontWeight: 600 }}>No Accounts Found</h2>
          <p style={{ color: "var(--text-secondary)", maxWidth: "400px", margin: "0 auto 16px auto", textAlign: "center" }}>
            You do not have any active ledger accounts. Open a new ledger account to start sending and receiving funds.
          </p>
          <button onClick={() => setModalOpen(true)} className="btn btn-primary">
            Open Your First Account
          </button>
        </div>
      ) : (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
            {accounts.map((acc) => (
              <AccountCard key={acc._id} account={acc} onRefresh={loadAccounts} />
            ))}
          </div>

          {accounts.length >= 5 && (
            <div style={{ marginTop: "24px", padding: "16px", background: "rgba(255, 77, 106, 0.08)", border: "1px solid rgba(255, 77, 106, 0.3)", borderRadius: "8px", display: "flex", alignItems: "center", gap: "12px", color: "var(--error)", fontSize: "14px" }}>
              <ShieldAlert size={18} />
              <span>You have reached the maximum limit of 5 active ledger accounts per customer.</span>
            </div>
          )}
        </div>
      )}

      {/* Modal for opening account */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Open Account Ledger">
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "20px" }}>
            Give your new ledger account a nickname for easy identification (e.g. "Savings Account", "Business Vault").
          </p>
          
          <form onSubmit={handleOpenAccount} className="form">
            <div className="form-group">
              <label className="form-label">Account Nickname (Optional)</label>
              <input 
                type="text" 
                value={nickname} 
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g. Expense Pool"
                maxLength={50}
                className="form-input"
                autoFocus
              />
            </div>
            
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
              <button 
                type="button" 
                onClick={() => setModalOpen(false)} 
                className="btn btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? "Opening Ledger..." : "Open Account"}
              </button>
            </div>
          </form>
        </Modal>
    </div>
  );
}
