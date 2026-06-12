"use client";

import React from "react";
import styles from "./TransactionRow.module.css";
import { ArrowUpRight, ArrowDownLeft, RefreshCw } from "lucide-react";
import { Transaction } from "../../lib/api/transactions";
import { formatRupees } from "../../lib/utils/currency";
import { relativeTime, formatIST } from "../../lib/utils/date";
import { Badge } from "../ui/Badge";
import { useAuth } from "../../lib/context/AuthContext";
import Link from "next/link";

interface TransactionRowProps {
  transaction: Transaction;
}

export const TransactionRow: React.FC<TransactionRowProps> = ({ transaction }) => {
  const { user } = useAuth();

  if (!user) return null;

  // Resolve direction (CREDIT/DEBIT) based on ownership
  const isDebit = transaction.fromAccount?.user?.email === user.email;

  const counterpartyName = isDebit
    ? transaction.toAccount?.user?.name || "External Account"
    : transaction.fromAccount?.user?.name || "System/External";

  const isReversed = transaction.status === "REVERSED";

  return (
    <Link href={`/transactions/${transaction._id}`} className={styles.row}>
      <div className={styles.leftSection}>
        <div
          className={`${styles.iconWrapper} ${isDebit ? styles.debitIcon : styles.creditIcon}`}
        >
          {isReversed ? (
            <RefreshCw size={18} />
          ) : isDebit ? (
            <ArrowUpRight size={18} />
          ) : (
            <ArrowDownLeft size={18} />
          )}
        </div>

        <div className={styles.details}>
          <span className={styles.counterparty}>
            {isDebit ? `To: ${counterpartyName}` : `From: ${counterpartyName}`}
          </span>
          <span className={styles.description} title={transaction.description}>
            {transaction.description || "Bank transfer"}
          </span>
          <span className={styles.metaInfo}>
            {relativeTime(transaction.createdAt)} · {formatIST(transaction.createdAt).split(",")[0]}
          </span>
        </div>
      </div>

      <div className={styles.rightSection}>
        <span
          className={`${styles.amount} ${isDebit ? styles.debitAmount : styles.creditAmount}`}
        >
          {isReversed ? "" : isDebit ? "-" : "+"}
          {formatRupees(transaction.amount)}
        </span>
        <Badge label={transaction.status} />
      </div>
    </Link>
  );
};
