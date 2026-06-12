"use client";

import React, { useEffect, useState } from "react";
import { 
  getBeneficiaries, 
  addBeneficiary, 
  Beneficiary 
} from "@/lib/api/beneficiaries";
import { resendOtp } from "@/lib/api/auth";
import { showToast } from "@/lib/utils/toast";
import { BeneficiaryCard } from "@/components/banking/BeneficiaryCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { OtpInput } from "@/components/ui/OtpInput";
import { Plus, Users, ShieldAlert } from "lucide-react";

export default function BeneficiariesPage() {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Add Beneficiary State
  const [addModalOpen, setAddModalOpen] = useState<boolean>(false);
  const [addStep, setAddStep] = useState<"form" | "otp">("form");
  const [name, setName] = useState<string>("");
  const [accountId, setAccountId] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchBeneficiaries = async () => {
    try {
      setLoading(true);
      const res = await getBeneficiaries();
      setBeneficiaries(res.beneficiaries || []);
    } catch (err: any) {
      showToast(err.message || "Failed to load beneficiaries", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBeneficiaries();
  }, []);

  const handleStartAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !accountId) {
      showToast("Please enter payee name and account ID", "warning");
      return;
    }
    if (accountId.length !== 24) {
      showToast("Account ID must be a 24-character hex code", "warning");
      return;
    }
    
    // Trigger OTP sending
    handleSendOtp();
  };

  const handleSendOtp = async () => {
    try {
      setSubmitting(true);
      await resendOtp({ purpose: "ADD_BENEFICIARY" });
      showToast("Verification OTP sent to your email", "success");
      setAddStep("otp");
    } catch (err: any) {
      showToast(err.message || "Failed to dispatch verification OTP", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtpAndAdd = async (otp: string) => {
    try {
      setSubmitting(true);
      await addBeneficiary({
        name: name.trim(),
        accountId: accountId.trim(),
        otp,
        note: note.trim() || undefined
      });
      showToast("Beneficiary saved successfully", "success");
      setAddModalOpen(false);
      resetAddForm();
      fetchBeneficiaries();
    } catch (err: any) {
      showToast(err.message || "Failed to save beneficiary", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const resetAddForm = () => {
    setAddStep("form");
    setName("");
    setAccountId("");
    setNote("");
  };

  return (
    <div style={{ animation: "slideUp var(--transition-normal)", display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "4px" }}>Beneficiaries</h1>
          <p style={{ color: "var(--text-secondary)" }}>Manage your saved payees for quick and secure transfers.</p>
        </div>

        <button onClick={() => setAddModalOpen(true)} className="btn btn-primary" disabled={loading}>
          <Plus size={18} />
          <span>Add Beneficiary</span>
        </button>
      </div>

      {/* Grid of payees */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
          <Skeleton height="150px" />
          <Skeleton height="150px" />
          <Skeleton height="150px" />
        </div>
      ) : beneficiaries.length === 0 ? (
        <div className="glass-card" style={{ padding: "60px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <Users size={48} style={{ color: "var(--text-secondary)" }} />
          <h2 style={{ fontSize: "20px", fontWeight: 600 }}>No Beneficiaries</h2>
          <p style={{ color: "var(--text-secondary)", maxWidth: "400px", margin: "0 auto 16px auto", textAlign: "center" }}>
            You haven't saved any recipient accounts yet. Add one to accelerate future fund transfers.
          </p>
          <button onClick={() => setAddModalOpen(true)} className="btn btn-primary">
            Add Your First Payee
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "24px" }}>
          {beneficiaries.map((ben) => (
            <BeneficiaryCard 
              key={ben._id} 
              beneficiary={ben} 
              onRefresh={fetchBeneficiaries}
            />
          ))}
        </div>
      )}

      {/* Modal for adding beneficiary */}
      <Modal 
        isOpen={addModalOpen} 
        onClose={() => !submitting && setAddModalOpen(false)} 
        title={addStep === "form" ? "Add Beneficiary" : "Verify OTP"}
      >
        {addStep === "form" ? (
          <form onSubmit={handleStartAdd}>
            <div className="form-group">
              <label className="form-label">Payee Full Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alice Smith"
                required
                className="form-input"
                autoFocus
              />
            </div>

            <div className="form-group" style={{ marginTop: "16px" }}>
              <label className="form-label">Account ID</label>
              <input 
                type="text" 
                value={accountId} 
                onChange={(e) => setAccountId(e.target.value)}
                placeholder="24-character hexadecimal code"
                required
                pattern="^[0-9a-fA-F]{24}$"
                title="24-character hex ID"
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ marginTop: "16px" }}>
              <label className="form-label">Note / Reference (Optional)</label>
              <input 
                type="text" 
                value={note} 
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Partner, Landlord"
                maxLength={200}
                className="form-input"
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
              <button 
                type="button" 
                onClick={() => setAddModalOpen(false)} 
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
                {submitting ? "Sending OTP..." : "Proceed"}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "24px" }}>
              We have dispatched a 6-digit OTP to your registered email to authorise saving this new payee.
            </p>
            
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "32px" }}>
              <OtpInput onComplete={handleVerifyOtpAndAdd} onResend={handleSendOtp} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button 
                type="button" 
                onClick={() => setAddStep("form")} 
                className="btn btn-secondary"
                disabled={submitting}
              >
                Back
              </button>

              {submitting && (
                <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                  Verifying OTP code...
                </span>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
