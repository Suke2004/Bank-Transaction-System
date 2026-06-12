"use client";

import React, { useState } from "react";
import Link from "next/link";
import styles from "./AccountCard.module.css";
import { Edit2, Check, Copy, ExternalLink } from "lucide-react";
import { Account, updateAccountNickname } from "../../lib/api/accounts";
import { formatRupees } from "../../lib/utils/currency";
import { showToast } from "../../lib/utils/toast";
import { Badge } from "../ui/Badge";

interface AccountCardProps {
  account: Account;
  onRefresh?: () => void;
}

export const AccountCard: React.FC<AccountCardProps> = ({ account, onRefresh }) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [nickname, setNickname] = useState<string>(account.nickname || "");
  const [saving, setSaving] = useState<boolean>(false);

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(account._id);
      showToast("Account ID copied to clipboard", "success");
    } catch (err) {
      showToast("Failed to copy account ID", "error");
    }
  };

  const handleSaveNickname = async () => {
    if (!nickname.trim()) {
      showToast("Nickname cannot be empty", "warning");
      return;
    }
    try {
      setSaving(true);
      await updateAccountNickname(account._id, nickname.trim());
      setIsEditing(false);
      showToast("Nickname updated successfully", "success");
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showToast(err.message || "Failed to update nickname", "error");
    } finally {
      setSaving(false);
    }
  };

  const isFrozen = account.status === "FROZEN";

  return (
    <div className={`${styles.card} ${isFrozen ? styles.frozenCard : ""}`}>
      <div className={styles.cardAccent} />

      <div className={styles.header}>
        <div>
          <div className={styles.nicknameSection}>
            {isEditing ? (
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onBlur={handleSaveNickname}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveNickname();
                  if (e.key === "Escape") {
                    setNickname(account.nickname || "");
                    setIsEditing(false);
                  }
                }}
                disabled={saving}
                className={styles.nicknameInput}
                autoFocus
              />
            ) : (
              <>
                <span className={styles.nickname} title={account.nickname}>
                  {account.nickname || "Primary Account"}
                </span>
                <button onClick={() => setIsEditing(true)} className={styles.editBtn}>
                  <Edit2 size={12} />
                </button>
              </>
            )}
          </div>

          <div className={styles.accountNumberSection}>
            <span className={styles.accountNumber}>
              ACT-{account._id.slice(0, 8).toUpperCase()}-...
            </span>
            <button onClick={handleCopyId} className={styles.copyBtn} title="Copy Account ID">
              <Copy size={12} />
            </button>
          </div>
        </div>

        <Badge label={account.status} />
      </div>

      <div className={styles.balanceSection}>
        <div className={styles.balanceLabel}>Available Balance</div>
        <div className={styles.balance}>{formatRupees(account.balance)}</div>
      </div>

      <div className={styles.footer}>
        <div className={styles.actions}>
          <Link href={`/accounts/${account._id}`} className={styles.actionLink}>
            Statement
            <ExternalLink size={12} />
          </Link>
        </div>
        
        {isFrozen && (
          <span style={{ fontSize: "11px", color: "var(--error)", fontWeight: 700 }}>
            Read Only
          </span>
        )}
      </div>
    </div>
  );
};
