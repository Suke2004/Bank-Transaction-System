"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccounts, Account } from "@/lib/api/accounts";
import { getBeneficiaries, Beneficiary } from "@/lib/api/beneficiaries";
import { createTransaction, Transaction } from "@/lib/api/transactions";
import { formatRupees } from "@/lib/utils/currency";
import { generateIdempotencyKey } from "@/lib/utils/uuid";
import { showToast } from "@/lib/utils/toast";
import { PinInput } from "@/components/ui/PinInput";
import { OtpInput } from "@/components/ui/OtpInput";
import { Skeleton } from "@/components/ui/Skeleton";
import { 
  ArrowLeft, 
  ArrowRight, 
  Send, 
  ShieldCheck, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Clock,
  QrCode
} from "lucide-react";

export default function TransferPage() {
  const router = useRouter();
  
  // Step tracking: 1 = Form, 2 = Review, 3 = Verify, 4 = Result
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  
  // Form State
  const [fromAccountId, setFromAccountId] = useState<string>("");
  const [toAccountId, setToAccountId] = useState<string>("");
  const [isRawAccountId, setIsRawAccountId] = useState<boolean>(false);
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");

  // Auth/Verification State
  const [pin, setPin] = useState<string>("");
  const [otpRequired, setOtpRequired] = useState<boolean>(false);
  const [otpToken, setOtpToken] = useState<string>("");

  // Result State
  const [resultTx, setResultTx] = useState<Transaction | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [accsRes, bensRes] = await Promise.all([
          getAccounts(),
          getBeneficiaries()
        ]);
        
        // Filter out closed/frozen from-accounts
        const activeAccs = (accsRes.accounts || []).filter(a => a.status === "ACTIVE");
        setAccounts(activeAccs);
        const activeBens = bensRes.beneficiaries || [];
        setBeneficiaries(activeBens);

        if (activeAccs.length > 0) {
          setFromAccountId(activeAccs[0]._id);
        }

        // Check for prefilled recipient query parameter
        const searchParams = new URLSearchParams(window.location.search);
        const toParam = searchParams.get("to");
        if (toParam) {
          const isSaved = activeBens.some(b => b.accountId._id === toParam);
          if (isSaved) {
            setIsRawAccountId(false);
            setToAccountId(toParam);
          } else {
            setIsRawAccountId(true);
            setToAccountId(toParam);
          }
        }
      } catch (err: any) {
        showToast(err.message || "Failed to load initial data", "error");
      } finally {
        setLoading(false);
      }
    };

    loadData();
    setIdempotencyKey(generateIdempotencyKey());
  }, []);

  const selectedFromAccount = accounts.find(a => a._id === fromAccountId);
  const selectedBeneficiary = beneficiaries.find(b => b.accountId._id === toAccountId);

  // Form Submission/Review
  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromAccountId || !toAccountId) {
      showToast("Please select from and to accounts", "warning");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showToast("Please enter a valid amount greater than zero", "warning");
      return;
    }

    if (selectedFromAccount && numAmount > selectedFromAccount.balance) {
      showToast("Insufficient funds in selected ledger account", "error");
      return;
    }

    if (fromAccountId === toAccountId) {
      showToast("Source and destination accounts cannot be identical", "warning");
      return;
    }

    setStep(2);
  };

  // Trigger Transaction Dispatch
  const handleExecuteTransfer = async (securityPin: string, verificationOtp?: string) => {
    try {
      setSubmitting(true);
      setErrorMsg("");

      const res = await createTransaction({
        fromAccount: fromAccountId,
        toAccount: toAccountId,
        amount: parseFloat(amount),
        description: description.trim() || undefined,
        pin: securityPin,
        idempotencyKey,
        otpToken: verificationOtp || undefined
      });

      if (res.pendingOtp) {
        setOtpRequired(true);
        setPin(securityPin); // Cache pin for retry
        setStep(3); // Stay/Transition on Verify step, but with OTP render
        showToast("High-value verification OTP sent to your email", "info");
      } else {
        setResultTx(res.transaction || null);
        setStep(4);
        showToast("Funds transferred successfully", "success");
      }
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes("pin")) {
        showToast(err.message, "error");
        // Reset pin input
        setPin("");
      } else {
        setErrorMsg(err.message || "An unexpected error occurred during transfer");
        setStep(4);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetWizard = () => {
    setStep(1);
    setAmount("");
    setDescription("");
    setPin("");
    setOtpRequired(false);
    setOtpToken("");
    setIdempotencyKey(generateIdempotencyKey());
    setResultTx(null);
    setErrorMsg("");
  };

  if (loading) {
    return (
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "40px 0" }}>
        <div style={{ marginBottom: "20px" }}><Skeleton height="40px" /></div>
        <Skeleton height="300px" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto", animation: "slideUp var(--transition-normal)" }}>
      {/* Wizard Header Progress */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px", position: "relative" }}>
        <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: "2px", background: "var(--border)", zIndex: 1 }} />
        <div style={{ position: "absolute", top: "50%", left: 0, width: `${((step - 1) / 3) * 100}%`, height: "2px", background: "var(--accent-blue)", zIndex: 2, transition: "width 0.3s ease" }} />

        {[1, 2, 3, 4].map((s) => (
          <div 
            key={s} 
            style={{ 
              width: "36px", 
              height: "36px", 
              borderRadius: "50%", 
              background: step > s ? "var(--accent-blue)" : step === s ? "var(--bg-deep)" : "var(--surface)", 
              border: `2px solid ${step >= s ? "var(--accent-blue)" : "var(--border)"}`,
              color: step >= s ? "#fff" : "var(--text-secondary)", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              fontWeight: 600, 
              fontSize: "14px",
              zIndex: 3 
            }}
          >
            {s}
          </div>
        ))}
      </div>

      <div className="glass-card" style={{ padding: "32px" }}>
        {/* STEP 1: FORM */}
        {step === 1 && (
          <form onSubmit={handleProceedToReview}>
            <h1 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "24px" }}>Transfer Funds</h1>

            <div className="form-group">
              <label className="form-label">Source Ledger Account</label>
              <select 
                value={fromAccountId} 
                onChange={(e) => setFromAccountId(e.target.value)}
                className="form-input"
                style={{ appearance: "none", backgroundImage: "radial-gradient(var(--text-secondary) 1px, transparent 0)", backgroundSize: "8px 8px" }}
              >
                {accounts.map((acc) => (
                  <option key={acc._id} value={acc._id}>
                    {acc.nickname || `Account ending in ...${acc._id.slice(-4)}`} ({formatRupees(acc.balance)})
                  </option>
                ))}
              </select>
              {selectedFromAccount && (
                <span style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
                  Available Balance: {formatRupees(selectedFromAccount.balance)}
                </span>
              )}
            </div>

            <div className="form-group" style={{ marginTop: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <label className="form-label" style={{ margin: 0 }}>Recipient Account</label>
                <button 
                  type="button" 
                  onClick={() => { setIsRawAccountId(!isRawAccountId); setToAccountId(""); }}
                  style={{ fontSize: "13px", color: "var(--accent-blue)", fontWeight: 500 }}
                >
                  {isRawAccountId ? "Select from Beneficiaries" : "Enter Raw Account ID"}
                </button>
              </div>

              {isRawAccountId ? (
                <input 
                  type="text" 
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  placeholder="Paste 24-character hexadecimal account ID"
                  required
                  pattern="^[0-9a-fA-F]{24}$"
                  title="24-character hex ID"
                  className="form-input"
                />
              ) : (
                <select 
                  value={toAccountId} 
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="form-input"
                  required
                >
                  <option value="">-- Choose saved beneficiary --</option>
                  {beneficiaries.map((ben) => (
                    <option key={ben._id} value={ben.accountId._id}>
                      {ben.name} (...{ben.accountId._id.slice(-6)}) - {ben.note || "Payee"}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group" style={{ marginTop: "16px" }}>
              <label className="form-label">Transfer Amount (INR)</label>
              <input 
                type="number" 
                step="0.01" 
                min="0.01"
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                placeholder="₹ 0.00"
                required
                className="form-input"
                style={{ fontFamily: "var(--font-mono)", fontSize: "18px", fontWeight: 600 }}
              />
            </div>

            <div className="form-group" style={{ marginTop: "16px" }}>
              <label className="form-label">Memo / Description (Optional)</label>
              <input 
                type="text" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Invoice payment"
                maxLength={200}
                className="form-input"
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "24px" }}>
              <span>Review Details</span>
              <ArrowRight size={18} />
            </button>
          </form>
        )}

        {/* STEP 2: REVIEW */}
        {step === 2 && (
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "24px" }}>Review Transaction</h1>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", background: "var(--surface)", padding: "20px", borderRadius: "12px", border: "1px solid var(--border)", marginBottom: "32px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Source Account</span>
                <span style={{ fontWeight: 600 }}>
                  {selectedFromAccount?.nickname || "Corporate Ledger"} (...{fromAccountId.slice(-6)})
                </span>
              </div>
              
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Destination Account</span>
                <span style={{ fontWeight: 600 }}>
                  {isRawAccountId ? `External Account (...${toAccountId.slice(-6)})` : selectedBeneficiary?.name || "Direct Transfer"}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--border)", paddingBottom: "12px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Description</span>
                <span style={{ fontStyle: description ? "normal" : "italic" }}>{description || "No memo"}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px" }}>
                <span style={{ color: "var(--text-secondary)", fontSize: "15px" }}>Total Transfer Amount</span>
                <span style={{ fontSize: "20px", fontWeight: 700, color: "var(--accent-blue)", fontFamily: "var(--font-mono)" }}>
                  {formatRupees(parseFloat(amount))}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setStep(1)} className="btn btn-secondary" style={{ flex: 1 }}>
                Go Back
              </button>
              <button onClick={() => setStep(3)} className="btn btn-primary" style={{ flex: 1 }}>
                <span>Proceed to Verify</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SECURITY CLEARANCE */}
        {step === 3 && (
          <div style={{ textAlign: "center" }}>
            {!otpRequired ? (
              <>
                <ShieldCheck size={48} style={{ color: "var(--accent-blue)", margin: "0 auto 16px auto" }} />
                <h1 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "8px" }}>Clearance PIN Required</h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "32px" }}>
                  Please input your 6-digit transaction PIN to validate security clearance.
                </p>

                <div style={{ display: "flex", justifyContent: "center", marginBottom: "40px" }}>
                  <PinInput onComplete={(securityPin: string) => handleExecuteTransfer(securityPin)} />
                </div>
              </>
            ) : (
              <>
                <AlertCircle size={48} style={{ color: "var(--accent-emerald)", margin: "0 auto 16px auto" }} />
                <h1 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "8px" }}>High Value OTP Required</h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "32px" }}>
                  This transfer exceeds the limits threshold (₹10,000). A verification code has been sent to your email.
                </p>

                <div style={{ display: "flex", justifyContent: "center", marginBottom: "40px" }}>
                  <OtpInput onComplete={(otp: string) => handleExecuteTransfer(pin, otp)} onResend={async () => { await handleExecuteTransfer(pin); }} />
                </div>
              </>
            )}

            <button 
              onClick={() => { setStep(2); setOtpRequired(false); }} 
              className="btn btn-secondary" 
              disabled={submitting}
              style={{ width: "100%" }}
            >
              Cancel Clearance
            </button>
          </div>
        )}

        {/* STEP 4: RESULT */}
        {step === 4 && (
          <div style={{ textAlign: "center" }}>
            {resultTx ? (
              <>
                <CheckCircle size={56} style={{ color: "var(--accent-emerald)", margin: "0 auto 20px auto" }} />
                <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px" }}>Transfer Completed</h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "32px" }}>
                  The ledger entry has been securely recorded on the bank database.
                </p>

                <div style={{ background: "var(--surface)", padding: "24px", borderRadius: "12px", border: "1px solid var(--border)", textAlign: "left", display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Transaction ID</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{resultTx._id}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Amount Sent</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--accent-emerald)" }}>
                      {formatRupees(resultTx.amount)}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Status</span>
                    <span style={{ fontWeight: 600 }}>COMPLETED</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Timestamp</span>
                    <span style={{ fontSize: "13px" }}>{new Date(resultTx.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  <button onClick={() => router.push("/dashboard")} className="btn btn-secondary" style={{ flex: 1 }}>
                    Dashboard
                  </button>
                  <button onClick={handleResetWizard} className="btn btn-primary" style={{ flex: 1 }}>
                    New Transfer
                  </button>
                </div>
              </>
            ) : (
              <>
                <XCircle size={56} style={{ color: "var(--error)", margin: "0 auto 20px auto" }} />
                <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px" }}>Transfer Failed</h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "32px" }}>
                  Your funds could not be processed due to a ledger execution failure.
                </p>

                <div style={{ background: "rgba(255, 77, 106, 0.08)", border: "1px solid rgba(255, 77, 106, 0.2)", padding: "16px", borderRadius: "8px", color: "var(--error)", fontSize: "14px", textAlign: "left", marginBottom: "32px" }}>
                  <strong>Error details:</strong> {errorMsg || "Database transaction lock conflict. Please retry with a new key."}
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  <button onClick={() => router.push("/dashboard")} className="btn btn-secondary" style={{ flex: 1 }}>
                    Go to Dashboard
                  </button>
                  <button onClick={handleResetWizard} className="btn btn-primary" style={{ flex: 1 }}>
                    Try Again
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
