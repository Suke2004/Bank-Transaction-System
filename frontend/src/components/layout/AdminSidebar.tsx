"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../lib/context/AuthContext";
import styles from "./AdminSidebar.module.css";
import { Users, Wallet, Send, Terminal, Sliders, Activity, Menu } from "lucide-react";

export const AdminSidebar: React.FC = () => {
  const pathname = usePathname();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState<boolean>(false);

  if (!user) return null;

  const role = user.role || "customer";

  const allItems = [
    {
      label: "Users Management",
      href: "/admin/users",
      icon: <Users size={18} />,
      roles: ["teller", "manager", "admin", "superAdmin"],
    },
    {
      label: "Accounts Control",
      href: "/admin/accounts",
      icon: <Wallet size={18} />,
      roles: ["teller", "manager", "admin", "superAdmin"],
    },
    {
      label: "Transactions Control",
      href: "/admin/transactions",
      icon: <Send size={18} />,
      roles: ["teller", "manager", "admin", "superAdmin"],
    },
    {
      label: "System Audit Logs",
      href: "/admin/audit-logs",
      icon: <Terminal size={18} />,
      roles: ["admin", "superAdmin"],
    },
    {
      label: "System Configuration",
      href: "/admin/system",
      icon: <Sliders size={18} />,
      roles: ["admin", "superAdmin"],
    },
    {
      label: "System Health",
      href: "/admin/health", // wait! TRD mentions admin/page and admin/system/health, let's keep path consistent
      icon: <Activity size={18} />,
      roles: ["admin", "superAdmin"],
    },
  ];

  // Filter items by user role
  const visibleItems = allItems.filter((item) => item.roles.includes(role));

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
      <div className={styles.header}>
        {!collapsed && (
          <div className={styles.adminLabel}>
            <div className={styles.redDot} />
            <span>Admin Control</span>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className={styles.toggleBtn}>
          <Menu size={18} />
        </button>
      </div>

      <nav className={styles.navSection}>
        {visibleItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <div
              key={item.href}
              className={`${styles.navItem} ${isActive ? styles.activeItem : ""} ${
                collapsed ? styles.iconOnly : ""
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Link href={item.href}>
                {item.icon}
                <span className={`${styles.label} ${collapsed ? styles.collapsedLabel : ""}`}>
                  {item.label}
                </span>
              </Link>
            </div>
          );
        })}
      </nav>
    </aside>
  );
};
