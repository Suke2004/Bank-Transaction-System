"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "./PinInput.module.css";

interface PinInputProps {
  onComplete: (pin: string) => void;
  isError?: boolean;
  lockedUntil?: string | null;
}

export const PinInput: React.FC<PinInputProps> = ({ onComplete, isError = false, lockedUntil = null }) => {
  const [pinValue, setPinValue] = useState<string>("");
  const [shouldShake, setShouldShake] = useState<boolean>(false);
  const [lockRemaining, setLockRemaining] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Trigger shake on error
  useEffect(() => {
    if (isError) {
      setShouldShake(true);
      const timer = setTimeout(() => setShouldShake(false), 500);
      setPinValue(""); // clear value on error
      return () => clearTimeout(timer);
    }
  }, [isError]);

  // Lockout countdown timer
  useEffect(() => {
    if (!lockedUntil) {
      setLockRemaining(null);
      return;
    }

    const updateTimer = () => {
      const lockTime = new Date(lockedUntil).getTime();
      const now = new Date().getTime();
      const diff = lockTime - now;

      if (diff <= 0) {
        setLockRemaining(null);
        // Page should reload or trigger check
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setLockRemaining(`${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`);
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [lockedUntil]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (lockRemaining) return;
    const value = e.target.value;
    if (isNaN(Number(value))) return; // only allow numbers

    setPinValue(value);
    if (value.length === 6) {
      onComplete(value);
    }
  };

  const handleDotsRowClick = () => {
    if (lockRemaining) return;
    inputRef.current?.focus();
  };

  // Maintain focus on render
  useEffect(() => {
    if (!lockRemaining) {
      inputRef.current?.focus();
    }
  }, [lockRemaining]);

  return (
    <div className={styles.pinWrapper}>
      {lockRemaining ? (
        <div className={styles.lockoutText}>
          PIN is locked. Try again in {lockRemaining}
        </div>
      ) : (
        <>
          <input
            ref={inputRef}
            type="password"
            maxLength={6}
            value={pinValue}
            onChange={handleInputChange}
            className={styles.hiddenInput}
            pattern="\d*"
            inputMode="numeric"
            autoFocus
          />

          <div
            onClick={handleDotsRowClick}
            className={`${styles.dotsRow} ${shouldShake ? styles.shake : ""}`}
          >
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className={`${styles.dot} ${
                  index < pinValue.length ? styles.dotActive : ""
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
