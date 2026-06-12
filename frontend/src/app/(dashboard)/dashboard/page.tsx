"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import { useAuth } from "@/lib/context/AuthContext";
import { getAccounts, Account } from "@/lib/api/accounts";
import { getMonthlyAnalytics, MonthlyAnalytics } from "@/lib/api/analytics";
import { getTransactions, Transaction } from "@/lib/api/transactions";
import { formatRupees } from "@/lib/utils/currency";
import { AccountCard } from "@/components/banking/AccountCard";
import { TransactionRow } from "@/components/banking/TransactionRow";
import { FraudAlertBanner } from "@/components/banking/FraudAlertBanner";
import { MonthlyChart } from "@/components/banking/MonthlyChart";
import { Skeleton } from "@/components/ui/Skeleton";
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Send, 
  PlusCircle, 
  Users, 
  BarChart3 
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [analytics, setAnalytics] = useState<MonthlyAnalytics | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [accsRes, analyticsRes, txRes] = await Promise.all([
          getAccounts(),
          getMonthlyAnalytics(),
          getTransactions({ limit: 5 })
        ]);
        setAccounts(accsRes.accounts || []);
        setAnalytics(analyticsRes.analytics || null);
        setTransactions(txRes.transactions || []);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const totalBalance = accounts.reduce((acc, curr) => acc + (curr.balance || 0), 0);

  // Time-based greeting helper
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className={styles.container}>
      <FraudAlertBanner show={accounts.some(acc => acc.isFlaggedFraud)} />

      {/* Welcome & Greeting */}
      <div className={styles.welcomeSection}>
        <div>
          <h1 className={styles.welcomeHeading}>
            {getGreeting()}, {user?.name || "User"} 👋
          </h1>
          <p className={styles.welcomeSubtitle}>
            Here is your financial ledger overview for today.
          </p>
        </div>
      </div>

      {/* Summary Metrics Row */}
      <div className={styles.summaryRow}>
        <div className={styles.metricCard}>
          <div className={`${styles.iconWrapper} ${styles.iconWrapperBlue}`}>
            <Wallet size={24} />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Total Combined Balance</span>
            {loading ? (
              <Skeleton width="120px" height="28px" />
            ) : (
              <span className={styles.metricValue}>{formatRupees(totalBalance)}</span>
            )}
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={`${styles.iconWrapper} ${styles.iconWrapperEmerald}`}>
            <TrendingUp size={24} />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Monthly Inflow</span>
            {loading ? (
              <Skeleton width="120px" height="28px" />
            ) : (
              <span className={styles.metricValue}>
                {formatRupees(analytics?.totalCredit || 0)}
              </span>
            )}
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={`${styles.iconWrapper} ${styles.iconWrapperRose}`}>
            <TrendingDown size={24} />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Monthly Outflow</span>
            {loading ? (
              <Skeleton width="120px" height="28px" />
            ) : (
              <span className={styles.metricValue}>
                {formatRupees(analytics?.totalDebit || 0)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={styles.quickActions}>
        <Link href="/transfer" className="btn btn-primary" style={{ flex: 1, minWidth: "150px" }}>
          <Send size={18} />
          <span>Transfer Money</span>
        </Link>
        <Link href="/accounts" className="btn btn-secondary" style={{ flex: 1, minWidth: "150px" }}>
          <PlusCircle size={18} />
          <span>Accounts Control</span>
        </Link>
        <Link href="/beneficiaries" className="btn btn-secondary" style={{ flex: 1, minWidth: "150px" }}>
          <Users size={18} />
          <span>Beneficiaries</span>
        </Link>
        <Link href="/analytics" className="btn btn-secondary" style={{ flex: 1, minWidth: "150px" }}>
          <BarChart3 size={18} />
          <span>Insights</span>
        </Link>
      </div>

      {/* Main Grid: Accounts & Right Panel */}
      <div className={styles.mainGrid}>
        {/* Left Side: Accounts & Graph */}
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          <div>
            <h2 className={styles.sectionTitle}>Your Active Ledgers</h2>
            {loading ? (
              <div className={styles.accountsGrid}>
                <Skeleton height="150px" />
                <Skeleton height="150px" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="glass-card" style={{ padding: "40px", textAlign: "center" }}>
                <p style={{ color: "var(--text-secondary)", marginBottom: "20px" }}>
                  You don't have any active account ledgers yet.
                </p>
                <Link href="/accounts" className="btn btn-primary">
                  Create Ledger Account
                </Link>
              </div>
            ) : (
              <div className={styles.accountsGrid}>
                {accounts.map((acc) => (
                  <AccountCard key={acc._id} account={acc} />
                ))}
              </div>
            )}
          </div>

          <div className="glass-card">
            <h2 className={styles.sectionTitle}>Inflow vs Outflow</h2>
            <div className={styles.chartContainer}>
              {loading ? (
                <Skeleton width="100%" height="240px" />
              ) : (
                <MonthlyChart 
                  chartData={{
                    labels: ["Monthly Flow"],
                    credits: [analytics?.totalCredit || 0],
                    debits: [analytics?.totalDebit || 0]
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Recent Transactions */}
        <div className={styles.recentSection}>
          <div className={styles.transactionsCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Recent Activity</h2>
              <Link href="/transactions" style={{ fontSize: "14px", color: "var(--accent-blue)", fontWeight: 500 }}>
                View All
              </Link>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {loading ? (
                <>
                  <div style={{ marginBottom: "8px" }}><Skeleton height="60px" /></div>
                  <div style={{ marginBottom: "8px" }}><Skeleton height="60px" /></div>
                  <Skeleton height="60px" />
                </>
              ) : transactions.length === 0 ? (
                <p className={styles.noDataText}>No recent transactions found.</p>
              ) : (
                transactions.map((tx) => (
                  <TransactionRow key={tx._id} transaction={tx} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
