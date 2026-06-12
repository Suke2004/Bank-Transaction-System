"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../lib/context/AuthContext";
import { useNotifications } from "../../lib/context/NotificationContext";
import styles from "./Navbar.module.css";
import { Bell, ChevronDown, LogOut, User, Wallet, Send, Users, BarChart3, Shield } from "lucide-react";
import { relativeTime } from "../../lib/utils/date";
import { markAllNotificationsRead } from "../../lib/api/notifications";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { notifications, unreadCount, refreshNotifications, readNotification } = useNotifications();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (notifOpen && notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (profileOpen && profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [notifOpen, profileOpen]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      refreshNotifications();
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  const handleNotifClick = async (id: string, metadata: any) => {
    await readNotification(id);
    setNotifOpen(false);
    
    // Redirect contextually if relevant
    if (metadata?.txId) {
      router.push(`/transactions/${metadata.txId}`);
    } else if (metadata?.accountId) {
      router.push(`/accounts/${metadata.accountId}`);
    } else {
      router.push("/notifications");
    }
  };

  const menuItems = [
    { label: "Dashboard", href: "/dashboard", icon: <BarChart3 size={16} /> },
    { label: "Accounts", href: "/accounts", icon: <Wallet size={16} /> },
    { label: "Transfers", href: "/transfer", icon: <Send size={16} /> },
    { label: "Beneficiaries", href: "/beneficiaries", icon: <Users size={16} /> },
    { label: "Analytics", href: "/analytics", icon: <BarChart3 size={16} /> },
  ];

  const isAdmin = user && ["teller", "manager", "admin", "superAdmin"].includes(user.role);

  return (
    <nav className={styles.navbar}>
      <div className={`${styles.navContainer} container`}>
        {/* Brand Logo */}
        <Link href="/dashboard" className={styles.logo}>
          <Wallet className={styles.logoIcon} size={24} />
          <span>BANK LEDGER</span>
        </Link>

        {/* Center menu */}
        <ul className={styles.menuList}>
          {menuItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <li
                key={item.href}
                className={`${styles.menuItem} ${isActive ? styles.activeMenu : ""}`}
              >
                <Link href={item.href}>{item.label}</Link>
              </li>
            );
          })}
        </ul>

        {/* Right action group */}
        <div className={styles.actionsSection}>
          {/* Admin badge and panel shortcut */}
          {isAdmin && (
            <Link href="/admin" className={styles.adminBadge}>
              Admin Panel
            </Link>
          )}

          {/* Notifications bell */}
          <div ref={notifRef} className={styles.dropdownWrapper}>
            <button
              onClick={() => {
                setNotifOpen(!notifOpen);
                setProfileOpen(false);
              }}
              className={styles.bellButton}
            >
              <Bell size={20} />
              {unreadCount > 0 && <span className={styles.unreadBadge}>{unreadCount}</span>}
            </button>

            {notifOpen && (
              <div className={styles.dropdownMenu}>
                <div className={styles.dropdownHeader}>
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className={styles.clearAllBtn}>
                      Mark all read
                    </button>
                  )}
                </div>

                <div className={styles.notificationList}>
                  {notifications.length === 0 ? (
                    <div className={styles.emptyNotif}>No new notifications</div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item._id}
                        onClick={() => handleNotifClick(item._id, item.metadata)}
                        className={styles.notificationItem}
                      >
                        {!item.read && <div className={styles.unreadDot} />}
                        <div className={styles.notifTitle}>{item.title}</div>
                        <div className={styles.notifBody}>{item.body}</div>
                        <div className={styles.notifTime}>{relativeTime(item.createdAt)}</div>
                      </div>
                    ))
                  )}
                </div>

                <Link
                  href="/notifications"
                  onClick={() => setNotifOpen(false)}
                  className={styles.viewAllBtn}
                >
                  View All Notifications
                </Link>
              </div>
            )}
          </div>

          {/* User profile avatar dropdown */}
          {user && (
            <div ref={profileRef} className={styles.dropdownWrapper}>
              <div
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotifOpen(false);
                }}
                className={styles.profileTrigger}
              >
                <div className={styles.avatar}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className={styles.username}>
                  {user.name.split(" ")[0]}
                </span>
                <ChevronDown size={14} className={styles.chevron} />
              </div>

              {profileOpen && (
                <div className={`${styles.dropdownMenu} ${styles.profileDropdown}`}>
                  <div className={styles.profileInfo}>
                    <div className={styles.profileName}>{user.name}</div>
                    <div className={styles.profileEmail}>{user.email}</div>
                  </div>

                  <Link
                    href="/profile"
                    onClick={() => setProfileOpen(false)}
                    className={styles.profileLink}
                  >
                    <User size={16} />
                    My Profile
                  </Link>

                  <Link
                    href="/security"
                    onClick={() => setProfileOpen(false)}
                    className={styles.profileLink}
                  >
                    <Shield size={16} />
                    Security Settings
                  </Link>

                  <button
                    onClick={async () => {
                      setProfileOpen(false);
                      await logout();
                    }}
                    className={`${styles.profileLink} ${styles.logoutBtn}`}
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
