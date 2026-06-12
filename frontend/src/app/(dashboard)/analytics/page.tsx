"use client";

import React, { useEffect, useState } from "react";
import { 
  getMonthlyAnalytics, 
  getTrendAnalytics, 
  MonthlyAnalytics, 
  TrendItem 
} from "@/lib/api/analytics";
import { formatRupees } from "@/lib/utils/currency";
import { showToast } from "@/lib/utils/toast";
import { MonthlyChart } from "@/components/banking/MonthlyChart";
import { Skeleton } from "@/components/ui/Skeleton";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Briefcase, 
  BarChart3, 
  ArrowRight,
  ShieldCheck
} from "lucide-react";

export default function AnalyticsPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-indexed

  // Filters state
  const [year, setYear] = useState<number>(currentYear);
  const [month, setMonth] = useState<number>(currentMonth);
  
  // Data states
  const [monthlyData, setMonthlyData] = useState<MonthlyAnalytics | null>(null);
  const [trendData, setTrendData] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [monthlyRes, trendRes] = await Promise.all([
        getMonthlyAnalytics({ year, month }),
        getTrendAnalytics({ months: 6 })
      ]);
      setMonthlyData(monthlyRes.analytics || null);
      setTrendData(trendRes.trend || []);
    } catch (err: any) {
      showToast(err.message || "Failed to load analytics data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [year, month]);

  const monthsList = [
    { value: 1, name: "January" },
    { value: 2, name: "February" },
    { value: 3, name: "March" },
    { value: 4, name: "April" },
    { value: 5, name: "May" },
    { value: 6, name: "June" },
    { value: 7, name: "July" },
    { value: 8, name: "August" },
    { value: 9, name: "September" },
    { value: 10, name: "October" },
    { value: 11, name: "November" },
    { value: 12, name: "December" }
  ];

  const yearsList = [currentYear, currentYear - 1, currentYear - 2];

  return (
    <div style={{ animation: "slideUp var(--transition-normal)", display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Header with Picker */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "4px" }}>Financial Insights</h1>
          <p style={{ color: "var(--text-secondary)" }}>Review transaction volumes, net growth, and cash flow history.</p>
        </div>

        {/* Date Pickers */}
        <div style={{ display: "flex", gap: "12px" }}>
          <select 
            value={month} 
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="form-input"
            style={{ width: "140px", padding: "10px 16px" }}
          >
            {monthsList.map((m) => (
              <option key={m.value} value={m.value}>{m.name}</option>
            ))}
          </select>
          <select 
            value={year} 
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="form-input"
            style={{ width: "100px", padding: "10px 16px" }}
          >
            {yearsList.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Top Level Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
        <div className="glass-card" style={{ padding: "24px", display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ background: "rgba(30, 111, 234, 0.15)", color: "var(--accent-blue)", width: "52px", height: "52px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <DollarSign size={24} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>NET MONTHLY SAVINGS</span>
            {loading ? (
              <Skeleton width="100px" height="24px" />
            ) : (
              <span style={{ fontSize: "22px", fontWeight: 700, fontFamily: "var(--font-mono)", color: (monthlyData?.netSavings || 0) >= 0 ? "var(--accent-emerald)" : "var(--error)" }}>
                {formatRupees(monthlyData?.netSavings || 0)}
              </span>
            )}
          </div>
        </div>

        <div className="glass-card" style={{ padding: "24px", display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ background: "rgba(0, 200, 150, 0.15)", color: "var(--accent-emerald)", width: "52px", height: "52px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={24} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>TOTAL CREDITED</span>
            {loading ? (
              <Skeleton width="100px" height="24px" />
            ) : (
              <span style={{ fontSize: "22px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--accent-emerald)" }}>
                {formatRupees(monthlyData?.totalCredit || 0)}
              </span>
            )}
          </div>
        </div>

        <div className="glass-card" style={{ padding: "24px", display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ background: "rgba(255, 77, 106, 0.15)", color: "var(--error)", width: "52px", height: "52px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingDown size={24} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>TOTAL DEBITED</span>
            {loading ? (
              <Skeleton width="100px" height="24px" />
            ) : (
              <span style={{ fontSize: "22px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--error)" }}>
                {formatRupees(monthlyData?.totalDebit || 0)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Graph & Account Breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "24px" }}>
        {/* Graph */}
        <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 600 }}>Cash Flow Aggregation</h2>
          <div style={{ height: "300px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {loading ? (
              <Skeleton width="100%" height="260px" />
            ) : (
              <MonthlyChart 
                chartData={{
                  labels: ["Monthly Flow"],
                  credits: [monthlyData?.totalCredit || 0],
                  debits: [monthlyData?.totalDebit || 0]
                }}
              />
            )}
          </div>
        </div>

        {/* Account breakdown list */}
        <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 600 }}>Ledger Account Performance</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {loading ? (
              <>
                <Skeleton height="50px" />
                <Skeleton height="50px" />
                <Skeleton height="50px" />
              </>
            ) : !monthlyData || monthlyData.accountBreakdown.length === 0 ? (
              <p style={{ color: "var(--text-secondary)", fontStyle: "italic", textAlign: "center", padding: "40px 0" }}>
                No active accounts found for this period.
              </p>
            ) : (
              monthlyData.accountBreakdown.map((breakdown) => (
                <div 
                  key={breakdown.accountId} 
                  style={{ 
                    display: "flex", 
                    flexDirection: "column", 
                    gap: "8px", 
                    padding: "16px", 
                    background: "rgba(10,22,40,0.4)", 
                    border: "1px solid var(--border)", 
                    borderRadius: "10px" 
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, fontSize: "14px" }}>{breakdown.nickname}</span>
                    <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                      ...{breakdown.accountId.slice(-6)}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "var(--text-secondary)" }}>
                    <span>Credit: {formatRupees(breakdown.credit)}</span>
                    <span>Debit: {formatRupees(breakdown.debit)}</span>
                  </div>

                  <div style={{ borderTop: "1px dashed var(--border)", paddingTop: "8px", display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: 500 }}>
                    <span>Net Activity</span>
                    <span style={{ color: breakdown.net >= 0 ? "var(--accent-emerald)" : "var(--error)" }}>
                      {breakdown.net >= 0 ? "+" : ""}{formatRupees(breakdown.net)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 6 Month Trend Historical Table */}
      <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 600 }}>6-Month Volume Trends</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                <th style={{ padding: "12px 16px" }}>Month</th>
                <th style={{ padding: "12px 16px" }}>Total Volume Credited</th>
                <th style={{ padding: "12px 16px" }}>Total Volume Debited</th>
                <th style={{ padding: "12px 16px", textAnchor: "end", textAlign: "right" }}>Net Cash Growth</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "14px 16px" }}><Skeleton width="100px" /></td>
                    <td style={{ padding: "14px 16px" }}><Skeleton width="120px" /></td>
                    <td style={{ padding: "14px 16px" }}><Skeleton width="120px" /></td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}><Skeleton width="100px" /></td>
                  </tr>
                ))
              ) : trendData.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: "24px", textAlign: "center", color: "var(--text-secondary)" }}>
                    Insufficient historical data to render trends.
                  </td>
                </tr>
              ) : (
                trendData.map((item, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "14px 16px", fontWeight: 600 }}>{item.label}</td>
                    <td style={{ padding: "14px 16px", fontFamily: "var(--font-mono)", color: "var(--accent-emerald)" }}>
                      {formatRupees(item.credit)}
                    </td>
                    <td style={{ padding: "14px 16px", fontFamily: "var(--font-mono)", color: "var(--error)" }}>
                      {formatRupees(item.debit)}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600, color: item.net >= 0 ? "var(--accent-emerald)" : "var(--error)" }}>
                      {item.net >= 0 ? "+" : ""}{formatRupees(item.net)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
