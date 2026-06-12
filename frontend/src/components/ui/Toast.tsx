"use client";

import React, { useState, useEffect, useCallback } from "react";
import styles from "./Toast.module.css";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { ToastMessage, ToastType } from "../../lib/utils/toast";

export const Toast: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const handleNewToast = (event: Event) => {
      const customEvent = event as CustomEvent<{ message: string; type: ToastType }>;
      const { message, type } = customEvent.detail;
      const id = Math.random().toString(36).substring(2, 9);

      setToasts((prev) => [...prev, { id, message, type }]);

      // Auto dismiss after 4 seconds
      setTimeout(() => {
        removeToast(id);
      }, 4000);
    };

    window.addEventListener("show-toast", handleNewToast);
    return () => {
      window.removeEventListener("show-toast", handleNewToast);
    };
  }, [removeToast]);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className={styles.successIcon} size={18} />;
      case "error":
        return <AlertCircle className={styles.errorIcon} size={18} />;
      case "warning":
        return <AlertCircle className={styles.warningIcon} size={18} />;
      default:
        return <Info className={styles.infoIcon} size={18} />;
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className={styles.toastContainer}>
      {toasts.map((toast) => (
        <div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`}>
          {getIcon(toast.type)}
          <span className={styles.message}>{toast.message}</span>
          <button onClick={() => removeToast(toast.id)} className={styles.closeButton}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
