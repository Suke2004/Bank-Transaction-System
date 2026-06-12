"use client";

import React, { useEffect, useState } from "react";
import { adminGetAuditLogs, adminGetAuditLogsCsvUrl, AuditLog } from "@/lib/api/admin";
import { formatIST } from "@/lib/utils/date";
import { showToast } from "@/lib/utils/toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { Pagination } from "@/components/ui/Pagination";
import { Download, Terminal, User, Clock, ShieldCheck, HelpCircle } from "lucide-react";

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionFilter, setActionFilter] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalLogs, setTotalLogs] = useState<number>(0);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await adminGetAuditLogs({
        action: actionFilter || undefined,
        page,
        limit: 15
      });
      setLogs(res.logs || []);
      setTotalPages(res.pagination?.pages || 1);
      setTotalLogs(res.pagination?.total || 0);
    } catch (err: any) {
      showToast(err.message || "Failed to load system audit trails", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, page]);

  const handleDownloadCsv = () => {
    const url = adminGetAuditLogsCsvUrl({ action: actionFilter || undefined });
    window.open(url, "_blank");
    showToast("Audit logs CSV download started", "info");
  };

  // Human-readable action mapping
  const formatAction = (act: string) => {
    return act.replace(/_/g, " ").toUpperCase();
  };

  // Human-readable metadata extractor
  const formatMetadata = (meta: any) => {
    if (!meta) return "—";
    try {
      if (typeof meta === "string") return meta;
      // Extract key highlights to keep table clean
      const keys = Object.keys(meta);
      if (keys.length === 0) return "—";
      return keys.map(k => `${k}: ${typeof meta[k] === "object" ? JSON.stringify(meta[k]) : meta[k]}`).join(" | ");
    } catch (e) {
      return JSON.stringify(meta);
    }
  };

  return (
    <div style={{ animation: "slideUp var(--transition-normal)", display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "4px" }}>Security Audit Trails</h1>
          <p style={{ color: "var(--text-secondary)" }}>Immutable forensic logs recording all administrative overrides, logins, and funds transfers.</p>
        </div>

        <button onClick={handleDownloadCsv} className="btn btn-secondary" disabled={loading || logs.length === 0}>
          <Download size={18} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filter panel */}
      <div className="glass-card" style={{ padding: "16px", display: "flex", gap: "16px" }}>
        <select 
          value={actionFilter} 
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="form-input" 
          style={{ width: "260px", padding: "10px 16px" }}
        >
          <option value="">All Actions</option>
          <option value="USER_LOGIN">USER_LOGIN</option>
          <option value="USER_LOGIN_OTP_SENT">USER_LOGIN_OTP_SENT</option>
          <option value="USER_REGISTER">USER_REGISTER</option>
          <option value="TRANSACTION_CREATE">TRANSACTION_CREATE</option>
          <option value="TRANSACTION_REVERSE">TRANSACTION_REVERSE</option>
          <option value="ACCOUNT_FREEZE">ACCOUNT_FREEZE</option>
          <option value="ACCOUNT_UNFREEZE">ACCOUNT_UNFREEZE</option>
          <option value="ACCOUNT_LIMIT_CHANGE">ACCOUNT_LIMIT_CHANGE</option>
          <option value="ACCOUNT_FUND">ACCOUNT_FUND</option>
          <option value="USER_SUSPEND">USER_SUSPEND</option>
          <option value="USER_UNSUSPEND">USER_UNSUSPEND</option>
          <option value="CONFIG_UPDATE">CONFIG_UPDATE</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="glass-card" style={{ padding: 0 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                <th style={{ padding: "16px 24px", width: "180px" }}>Timestamp</th>
                <th style={{ padding: "16px 24px", width: "180px" }}>Operator Identity</th>
                <th style={{ padding: "16px 24px", width: "200px" }}>Action</th>
                <th style={{ padding: "16px 24px" }}>Context Metadata</th>
                <th style={{ padding: "16px 24px", width: "120px" }}>Network IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "14px 24px" }}><Skeleton width="130px" /></td>
                    <td style={{ padding: "14px 24px" }}><Skeleton width="120px" /></td>
                    <td style={{ padding: "14px 24px" }}><Skeleton width="140px" /></td>
                    <td style={{ padding: "14px 24px" }}><Skeleton width="240px" /></td>
                    <td style={{ padding: "14px 24px" }}><Skeleton width="90px" /></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "48px 0", textAlign: "center", color: "var(--text-secondary)", fontStyle: "italic" }}>
                    No audit records match the selected action code.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "14px 24px", color: "var(--text-secondary)" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <Clock size={12} />
                        {formatIST(log.createdAt)}
                      </span>
                    </td>
                    <td style={{ padding: "14px 24px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: 500 }}>
                        <User size={12} style={{ color: "var(--text-secondary)" }} />
                        {log.userId ? log.userId.name : "SYSTEM PROCESS"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 24px" }}>
                      <span style={{ 
                        fontFamily: "var(--font-mono)", 
                        fontSize: "11px", 
                        background: "rgba(30,111,234,0.08)", 
                        color: "var(--accent-blue)",
                        padding: "3px 6px",
                        borderRadius: "4px",
                        fontWeight: 600
                      }}>
                        {formatAction(log.action)}
                      </span>
                    </td>
                    <td style={{ padding: "14px 24px", color: "var(--text-secondary)", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={JSON.stringify(log.metadata)}>
                      {formatMetadata(log.metadata)}
                    </td>
                    <td style={{ padding: "14px 24px", fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-secondary)" }}>
                      {log.ip || "127.0.0.1"}
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
            totalItems={totalLogs}
            limit={15}
            onPageChange={setPage} 
          />
        </div>
      )}
    </div>
  );
}
