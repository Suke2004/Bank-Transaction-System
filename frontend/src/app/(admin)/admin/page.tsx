"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  adminSearchUsers, 
  adminGetAccounts, 
  adminGetTransactions, 
  adminGetSystemHealth,
  SystemHealth 
} from "@/lib/api/admin";
import { Transaction } from "@/lib/api/transactions";
import { formatRupees } from "@/lib/utils/currency";
import { showToast } from "@/lib/utils/toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { 
  Users, 
  Wallet, 
  ArrowRightLeft, 
  ShieldAlert, 
  Activity, 
  Server, 
  Database,
  Cpu
} from "lucide-react";

export default function AdminDashboardPage() {
  const router = useRouter();

  // Metrics
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [totalAccounts, setTotalAccounts] = useState<number>(0);
  const [totalTransactions, setTotalTransactions] = useState<number>(0);
  const [totalFlagged, setTotalFlagged] = useState<number>(0);

  // Lists
  const [flaggedTransactions, setFlaggedTransactions] = useState<Transaction[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadAdminStats = async () => {
    try {
      setLoading(true);
      const [usersRes, accountsRes, txRes, flaggedRes, healthRes] = await Promise.all([
        adminSearchUsers({ limit: 1 }),
        adminGetAccounts({ limit: 1 }),
        adminGetTransactions({ limit: 1 }),
        adminGetTransactions({ flagged: true, limit: 5 }),
        adminGetSystemHealth()
      ]);

      setTotalUsers(usersRes.pagination?.total || 0);
      setTotalAccounts(accountsRes.pagination?.total || 0);
      setTotalTransactions(txRes.pagination?.total || 0);
      
      // The flaggedRes is actually our flagged list, so its total is the number of flagged transactions
      setTotalFlagged(flaggedRes.pagination?.total || 0);
      setFlaggedTransactions(flaggedRes.transactions || []);
      setHealth(healthRes);
    } catch (err: any) {
      showToast(err.message || "Failed to load admin telemetry data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminStats();
  }, []);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor((seconds % (3600*24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  return (
    <div style={{ animation: "slideUp var(--transition-normal)", display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "4px" }}>Operations Overview</h1>
        <p style={{ color: "var(--text-secondary)" }}>Telemetry monitoring, risk assessments, and system status metrics.</p>
      </div>

      {/* Admin stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
        <div className="glass-card" style={{ padding: "24px", display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ background: "rgba(30, 111, 234, 0.12)", color: "var(--accent-blue)", width: "48px", height: "48px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users size={22} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>TOTAL USERS</span>
            {loading ? <Skeleton width="60px" height="24px" /> : <span style={{ fontSize: "20px", fontWeight: 700 }}>{totalUsers}</span>}
          </div>
        </div>

        <div className="glass-card" style={{ padding: "24px", display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ background: "rgba(0, 200, 150, 0.12)", color: "var(--accent-emerald)", width: "48px", height: "48px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Wallet size={22} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>ACTIVE LEDGERS</span>
            {loading ? <Skeleton width="60px" height="24px" /> : <span style={{ fontSize: "20px", fontWeight: 700 }}>{totalAccounts}</span>}
          </div>
        </div>

        <div className="glass-card" style={{ padding: "24px", display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ background: "rgba(255, 255, 255, 0.05)", color: "var(--text-primary)", width: "48px", height: "48px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ArrowRightLeft size={22} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>TOTAL TRANSFERS</span>
            {loading ? <Skeleton width="60px" height="24px" /> : <span style={{ fontSize: "20px", fontWeight: 700 }}>{totalTransactions}</span>}
          </div>
        </div>

        <div className="glass-card" style={{ padding: "24px", display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ 
            background: totalFlagged > 0 ? "rgba(255, 77, 106, 0.12)" : "rgba(255, 255, 255, 0.05)", 
            color: totalFlagged > 0 ? "var(--error)" : "var(--text-secondary)", 
            width: "48px", 
            height: "48px", 
            borderRadius: "10px", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center" 
          }}>
            <ShieldAlert size={22} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>FLAGGED ENTRIES</span>
            {loading ? <Skeleton width="60px" height="24px" /> : <span style={{ fontSize: "20px", fontWeight: 700, color: totalFlagged > 0 ? "var(--error)" : "var(--text-primary)" }}>{totalFlagged}</span>}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "24px" }}>
        {/* Left Side: Flagged Transactions */}
        <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>Flagged Transactions</h2>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                  <th style={{ padding: "12px 8px" }}>Tx ID</th>
                  <th style={{ padding: "12px 8px" }}>Sender / Recipient</th>
                  <th style={{ padding: "12px 8px" }}>Amount</th>
                  <th style={{ padding: "12px 8px" }}>Reason</th>
                  <th style={{ padding: "12px 8px", textAlign: "right" }}>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "12px 8px" }}><Skeleton width="60px" /></td>
                      <td style={{ padding: "12px 8px" }}><Skeleton width="120px" /></td>
                      <td style={{ padding: "12px 8px" }}><Skeleton width="60px" /></td>
                      <td style={{ padding: "12px 8px" }}><Skeleton width="100px" /></td>
                      <td style={{ padding: "12px 8px", textAlign: "right" }}><Skeleton width="40px" /></td>
                    </tr>
                  ))
                ) : flaggedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "32px 0", textAlign: "center", color: "var(--text-secondary)", fontStyle: "italic" }}>
                      Zero flagged items. System operations compliant.
                    </td>
                  </tr>
                ) : (
                  flaggedTransactions.map((tx) => (
                    <tr key={tx._id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "12px 8px", fontFamily: "var(--font-mono)" }}>
                        {tx._id.slice(-6)}
                      </td>
                      <td style={{ padding: "12px 8px" }}>
                        <div>{tx.fromAccount?.user?.name || "Sender"}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                          to {tx.toAccount?.user?.name || "Recipient"}
                        </div>
                      </td>
                      <td style={{ padding: "12px 8px", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                        {formatRupees(tx.amount)}
                      </td>
                      <td style={{ padding: "12px 8px", color: "var(--error)", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {tx.flagReason || "Compliance audit alert"}
                      </td>
                      <td style={{ padding: "12px 8px", textAlign: "right" }}>
                        <button 
                          onClick={() => router.push(`/admin/transactions?id=${tx._id}`)} 
                          style={{ color: "var(--accent-blue)", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Health Diagnostic */}
        <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Activity size={18} style={{ color: "var(--accent-emerald)" }} />
            <h2 style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>System Health</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {loading ? (
              <>
                <Skeleton height="45px" />
                <Skeleton height="45px" />
                <Skeleton height="45px" />
              </>
            ) : health ? (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", background: "rgba(10,22,40,0.5)", border: "1px solid var(--border)", borderRadius: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Server size={16} style={{ color: "var(--text-secondary)" }} />
                    <span style={{ fontSize: "14px" }}>Core API Status</span>
                  </div>
                  <Badge label={health.status === "healthy" ? "ACTIVE" : "CLOSED"} />
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", background: "rgba(10,22,40,0.5)", border: "1px solid var(--border)", borderRadius: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Database size={16} style={{ color: "var(--text-secondary)" }} />
                    <span style={{ fontSize: "14px" }}>MongoDB Connection</span>
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: health.db?.status === "connected" || health.db?.status === "healthy" ? "var(--accent-emerald)" : "var(--error)" }}>
                    {health.db?.status?.toUpperCase() || "CONNECTED"}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", background: "rgba(10,22,40,0.5)", border: "1px solid var(--border)", borderRadius: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Cpu size={16} style={{ color: "var(--text-secondary)" }} />
                    <span style={{ fontSize: "14px" }}>Uptime</span>
                  </div>
                  <span style={{ fontSize: "13px", fontFamily: "var(--font-mono)" }}>
                    {formatUptime(health.uptime)}
                  </span>
                </div>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px", fontSize: "12px", color: "var(--text-secondary)" }}>
                  <p>Runtime: {health.system?.nodeVersion || "Node.js v20.x"}</p>
                  <p style={{ marginTop: "4px" }}>Platform: {health.system?.platform || "Linux"} ({health.system?.arch || "x64"})</p>
                </div>
              </>
            ) : (
              <p style={{ color: "var(--text-secondary)", fontStyle: "italic", textAlign: "center" }}>
                Diagnostic connection timeout.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
