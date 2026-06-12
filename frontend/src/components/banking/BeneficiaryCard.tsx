"use client";

import React, { useState } from "react";
import styles from "./BeneficiaryCard.module.css";
import { Send, Trash2, User } from "lucide-react";
import { Beneficiary, deleteBeneficiary } from "../../lib/api/beneficiaries";
import { useRouter } from "next/navigation";
import { Modal } from "../ui/Modal";
import { PinInput } from "../ui/PinInput";
import { showToast } from "../../lib/utils/toast";

interface BeneficiaryCardProps {
  beneficiary: Beneficiary;
  onRefresh?: () => void;
}

export const BeneficiaryCard: React.FC<BeneficiaryCardProps> = ({ beneficiary, onRefresh }) => {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  const [pinError, setPinError] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);

  const handleSendMoney = () => {
    router.push(`/transfer?toAccountId=${beneficiary.accountId?._id || ""}`);
  };

  const handleDeleteConfirm = async (pin: string) => {
    try {
      setDeleting(true);
      setPinError(false);
      await deleteBeneficiary(beneficiary._id, pin);
      setDeleteOpen(false);
      showToast("Beneficiary removed successfully", "success");
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setPinError(true);
      showToast(err.message || "Failed to remove beneficiary", "error");
    } finally {
      setDeleting(false);
    }
  };

  const accountIdStr = beneficiary.accountId?._id || "Unknown Account";
  const maskedAccountId = `ACT-${accountIdStr.slice(0, 8).toUpperCase()}-...`;

  return (
    <>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.info}>
            <span className={styles.name}>{beneficiary.name}</span>
            <span className={styles.accountNumber}>{maskedAccountId}</span>
            {beneficiary.note && <span className={styles.note}>{beneficiary.note}</span>}
          </div>
          <div className={styles.avatar}>
            <User size={18} />
          </div>
        </div>

        <div className={styles.actions}>
          <button onClick={handleSendMoney} className="btn btn-primary styles.sendBtn">
            <Send size={14} />
            Send Money
          </button>
          <button
            onClick={() => setDeleteOpen(true)}
            className={styles.deleteBtn}
            title="Remove Payee"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Secure Delete Confirmation Modal with PIN */}
      <Modal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} title="Confirm Payee Removal">
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", alignItems: "center" }}>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", textAlign: "center" }}>
            To securely remove <b>{beneficiary.name}</b> from your saved payees list, please verify your transaction PIN.
          </p>

          <PinInput
            onComplete={handleDeleteConfirm}
            isError={pinError}
          />

          <div style={{ display: "flex", gap: "12px", width: "100%", justifyContent: "flex-end" }}>
            <button
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
