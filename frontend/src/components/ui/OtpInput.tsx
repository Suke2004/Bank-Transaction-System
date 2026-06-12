"use client";

import React, { useState, useRef, useEffect } from "react";
import styles from "./OtpInput.module.css";
import { RefreshCw } from "lucide-react";

interface OtpInputProps {
  onComplete: (otp: string) => void;
  onResend: () => Promise<void>;
  isError?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({ onComplete, onResend, isError = false }) => {
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(""));
  const [cooldown, setCooldown] = useState<number>(60);
  const [resending, setResending] = useState<boolean>(false);
  const [shouldShake, setShouldShake] = useState<boolean>(false);
  const inputRefs = useRef<HTMLInputElement[]>([]);

  // Trigger shake on error
  useEffect(() => {
    if (isError) {
      setShouldShake(true);
      const timer = setTimeout(() => setShouldShake(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isError]);

  // Resend countdown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleChange = (element: HTMLInputElement, index: number) => {
    const val = element.value;
    if (isNaN(Number(val))) return; // only allow numbers

    const newOtp = [...otp];
    newOtp[index] = val.substring(val.length - 1); // take only last character if typed fast
    setOtp(newOtp);

    // Auto-advance
    if (val !== "" && index < 5) {
      inputRefs.current[index + 1].focus();
    }

    // Check if complete
    const combinedOtp = newOtp.join("");
    if (combinedOtp.length === 6) {
      onComplete(combinedOtp);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const newOtp = [...otp];
      
      if (otp[index] !== "") {
        newOtp[index] = "";
      } else if (index > 0) {
        newOtp[index - 1] = "";
        inputRefs.current[index - 1].focus();
      }
      
      setOtp(newOtp);
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1].focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").trim();
    if (pasteData.length !== 6 || isNaN(Number(pasteData))) return;

    const pasteArray = pasteData.split("");
    setOtp(pasteArray);
    onComplete(pasteData);
    inputRefs.current[5].focus();
  };

  const handleResendClick = async () => {
    if (cooldown > 0 || resending) return;
    try {
      setResending(true);
      await onResend();
      setCooldown(60);
    } catch (err) {
      console.error("Resend OTP failed", err);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className={styles.otpContainer}>
      <div className={`${styles.inputRow} ${shouldShake ? styles.shake : ""}`}>
        {otp.map((data, index) => (
          <input
            key={index}
            type="text"
            maxLength={1}
            ref={(ref) => {
              if (ref) inputRefs.current[index] = ref;
            }}
            value={data}
            onChange={(e) => handleChange(e.target, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onPaste={handlePaste}
            className={styles.otpBox}
            pattern="\d*"
            inputMode="numeric"
            autoFocus={index === 0}
            disabled={resending}
          />
        ))}
      </div>

      <div className={styles.resendSection}>
        {cooldown > 0 ? (
          <span className={styles.cooldownText}>
            Resend code in <b>{cooldown}s</b>
          </span>
        ) : (
          <button
            onClick={handleResendClick}
            disabled={resending}
            className={styles.resendButton}
          >
            <RefreshCw size={14} className={resending ? "animate-spin" : ""} />
            Resend OTP Code
          </button>
        )}
      </div>
    </div>
  );
};
