"use client";

import React, { useEffect, useState } from "react";
import { getTransactions, Transaction, exportTransactionsCsvUrl } from "@/lib/api/transactions";
import { useAuth } from "@/lib/context/AuthContext";
import { formatRupees } from "@/lib/utils/currency";
import { showToast } from "@/lib/utils/toast";
import { TransactionRow } from "@/components/banking/TransactionRow";
import { Skeleton } from "@/components/ui/Skeleton";
import { Pagination } from "@/components/ui/Pagination";
import { Calendar, Download, Search, AlertCircle } from "lucide-react";

export default function TransactionsHistoryPage() {
  const { user } = useAuth();
  
  // States
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Filters
  const [status, setStatus] = useState<string>("");
  const [direction, setDirection] = useState<"SENT" | "RECEIVED" | "">("");
  const [search, setSearch] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalTransactions, setTotalTransactions] = useState<number>(0);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await getTransactions({
        status: status || undefined,
        direction: direction || undefined,
        search: search.trim() || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
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
  }, [status, direction, page, fromDate, toDate]);

  // Debounced search trigger
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setPage(1);
      fetchTransactions();
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [search]);

  const handleDownloadCsv = () => {
    const params: any = {};
    if (status) params.status = status;
    if (direction) params.direction = direction;
    if (search.trim()) params.search = search;
    if (fromDate) params.from = fromDate;
    if (toDate) params.to = toDate;

    const url = exportTransactionsCsvUrl(params);
    window.open(url, "_blank");
    showToast("Transaction CSV download started", "info");
  };

  return (
    <div style={{ animation: "slideUp var(--transition-normal)", display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "4px" }}>Transaction History</h1>
          <p style={{ color: "var(--text-secondary)" }}>Track and analyze all processed ledger entries across your accounts.</p>
        </div>

        <button onClick={handleDownloadCsv} className="btn btn-secondary" disabled={loading || transactions.length === 0}>
          <Download size={18} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filter panel */}
      <div className="glass-card" style={{ display: "flex", flexWrap: "wrap", gap: "16px", padding: "20px" }}>
        {/* Search */}
        <div style={{ flex: "1 1 200px", display: "flex", alignItems: "center", gap: "8px", background: "rgba(10,22,40,0.8)", border: "1px solid var(--border)", padding: "10px 16px", borderRadius: "8px" }}>
          <Search size={16} style={{ color: "var(--text-secondary)" }} />
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search descriptions..."
            style={{ background: "none", border: "none", color: "var(--text-primary)", fontSize: "14px", width: "100%" }}
          />
        </div>

        {/* Status Dropdown */}
        <select 
          value={status} 
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="form-input" 
          style={{ flex: "1 1 120px", width: "auto", padding: "10px 16px" }}
        >
          <option value="">All Statuses</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="PENDING">PENDING</option>
          <option value="FAILED">FAILED</option>
          <option value="REVERSED">REVERSED</option>
        </select>

        {/* Direction Dropdown */}
        <select 
          value={direction} 
          onChange={(e) => { setDirection(e.target.value as any); setPage(1); }}
          className="form-input" 
          style={{ flex: "1 1 120px", width: "auto", padding: "10px 16px" }}
        >
          <option value="">All Directions</option>
          <option value="SENT">Sent</option>
          <option value="RECEIVED">Received</option>
        </select>

        {/* Date Ranges */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flex: "1 1 300px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(10,22,40,0.8)", border: "1px solid var(--border)", padding: "10px 12px", borderRadius: "8px", width: "100%" }}>
            <Calendar size={14} style={{ color: "var(--text-secondary)" }} />
            <input 
              type="date" 
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              style={{ background: "none", border: "none", color: "var(--text-primary)", fontSize: "14px", width: "100%" }}
            />
          </div>
          <span style={{ color: "var(--text-secondary)" }}>to</span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(10,22,40,0.8)", border: "1px solid var(--border)", padding: "10px 12px", borderRadius: "8px", width: "100%" }}>
            <Calendar size={14} style={{ color: "var(--text-secondary)" }} />
            <input 
              type="date" 
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              style={{ background: "none", border: "none", color: "var(--text-primary)", fontSize: "14px", width: "100%" }}
            />
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="glass-card" style={{ padding: "0px", overflow: "hidden" }}>
        <div style={{ padding: "24px 24px 12px 24px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 600 }}>Ledger Record</h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", padding: "12px 24px" }}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ margin: "8px 0" }}><Skeleton height="65px" /></div>
            ))
          ) : transactions.length === 0 ? (
            <div style={{ padding: "48px 0", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
              <AlertCircle size={36} style={{ color: "var(--text-secondary)" }} />
              <p style={{ color: "var(--text-secondary)" }}>No transactions fit your search parameters.</p>
            </div>
          ) : (
            transactions.map((tx) => (
              <TransactionRow 
                key={tx._id} 
                transaction={tx} 
              />
            ))
          )}
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
    </div>
  );
}
