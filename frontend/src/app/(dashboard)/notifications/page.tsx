"use client";

import React, { useEffect, useState } from "react";
import { 
  getNotifications, 
  markAllNotificationsRead, 
  markNotificationRead, 
  NotificationItem 
} from "@/lib/api/notifications";
import { relativeTime } from "@/lib/utils/date";
import { showToast } from "@/lib/utils/toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { Pagination } from "@/components/ui/Pagination";
import { 
  Bell, 
  Check, 
  CheckCheck, 
  AlertTriangle, 
  Lock, 
  ArrowRightLeft, 
  FileText,
  UserCheck
} from "lucide-react";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);
  const [totalNotifications, setTotalNotifications] = useState<number>(0);

  const fetchList = async () => {
    try {
      setLoading(true);
      const res = await getNotifications({
        page,
        limit: 10,
        unreadOnly: unreadOnly || undefined
      });
      setNotifications(res.notifications || []);
      setTotalPages(res.pagination?.pages || 1);
      setTotalNotifications(res.pagination?.total || 0);
    } catch (err: any) {
      showToast(err.message || "Failed to load notifications", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [page, unreadOnly]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      showToast("All notifications marked as read", "success");
      fetchList();
      // Dispatch a custom event to notify Navbar so that Navbar will refresh its notifications immediately
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("notifications-marked-read"));
      }
    } catch (err: any) {
      showToast(err.message || "Operation failed", "error");
    }
  };

  const handleMarkOneRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      fetchList();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("notifications-marked-read"));
      }
    } catch (err: any) {
      console.error("Failed to mark single notification as read", err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "ACCOUNT_LOCKED":
      case "PIN_LOCKED":
        return <Lock size={18} style={{ color: "var(--error)" }} />;
      case "ACCOUNT_FROZEN":
      case "SUSPICIOUS_ACTIVITY":
      case "TRANSACTION_FLAGGED":
        return <AlertTriangle size={18} style={{ color: "var(--error)" }} />;
      case "TRANSFER_SENT":
      case "TRANSFER_RECEIVED":
      case "TRANSACTION_REVERSED":
        return <ArrowRightLeft size={18} style={{ color: "var(--accent-blue)" }} />;
      case "LOGIN_ALERT":
        return <UserCheck size={18} style={{ color: "var(--accent-emerald)" }} />;
      default:
        return <Bell size={18} style={{ color: "var(--text-secondary)" }} />;
    }
  };

  return (
    <div style={{ animation: "slideUp var(--transition-normal)", display: "flex", flexDirection: "column", gap: "32px", maxWidth: "800px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "4px" }}>Notifications Log</h1>
          <p style={{ color: "var(--text-secondary)" }}>Review security events, login alerts, and ledger operations history.</p>
        </div>

        <button 
          onClick={handleMarkAllRead} 
          className="btn btn-secondary" 
          disabled={loading || notifications.length === 0}
          style={{ fontSize: "14px" }}
        >
          <CheckCheck size={16} />
          <span>Mark All Read</span>
        </button>
      </div>

      {/* Filter Options */}
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <button 
          onClick={() => { setUnreadOnly(false); setPage(1); }} 
          className={`btn ${!unreadOnly ? "btn-primary" : "btn-secondary"}`}
          style={{ padding: "8px 16px", fontSize: "13px" }}
        >
          All Notifications
        </button>
        <button 
          onClick={() => { setUnreadOnly(true); setPage(1); }} 
          className={`btn ${unreadOnly ? "btn-primary" : "btn-secondary"}`}
          style={{ padding: "8px 16px", fontSize: "13px" }}
        >
          Unread Only
        </button>
      </div>

      {/* List Card */}
      <div className="glass-card" style={{ padding: 0 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ padding: "20px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ marginBottom: "8px" }}><Skeleton height="20px" /></div>
                <Skeleton height="15px" width="70%" />
              </div>
            ))
          ) : notifications.length === 0 ? (
            <div style={{ padding: "60px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
              <Bell size={40} style={{ color: "var(--text-secondary)" }} />
              <p style={{ color: "var(--text-secondary)" }}>
                {unreadOnly ? "You have zero unread notifications." : "Your notification log is empty."}
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div 
                key={notif._id} 
                onClick={() => !notif.read && handleMarkOneRead(notif._id)}
                style={{ 
                  display: "flex", 
                  gap: "20px", 
                  padding: "20px 24px", 
                  borderBottom: "1px solid var(--border)",
                  background: notif.read ? "transparent" : "rgba(30, 111, 234, 0.03)",
                  cursor: notif.read ? "default" : "pointer",
                  transition: "background var(--transition-fast)"
                }}
              >
                {/* Icon wrapper */}
                <div style={{ 
                  width: "40px", 
                  height: "40px", 
                  borderRadius: "10px", 
                  background: "var(--surface)", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  {getIcon(notif.type)}
                </div>

                {/* Details */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "4px" }}>
                    <h3 style={{ fontSize: "15px", fontWeight: 600, color: notif.read ? "var(--text-primary)" : "#ffffff", margin: 0 }}>
                      {notif.title}
                    </h3>
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                      {relativeTime(notif.createdAt)}
                    </span>
                  </div>
                  <p style={{ fontSize: "14px", color: notif.read ? "var(--text-secondary)" : "var(--text-primary)", margin: 0, lineHeight: 1.4 }}>
                    {notif.body}
                  </p>
                </div>

                {/* Unread circle dot */}
                {!notif.read && (
                  <div style={{ alignSelf: "center", width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent-blue)", flexShrink: 0 }} />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Pagination 
            page={page} 
            totalPages={totalPages} 
            totalItems={totalNotifications}
            limit={10}
            onPageChange={setPage} 
          />
        </div>
      )}
    </div>
  );
}
