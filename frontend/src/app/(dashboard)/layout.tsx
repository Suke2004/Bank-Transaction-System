"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Skeleton } from "@/components/ui/Skeleton";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, hasPinSetup, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (!hasPinSetup) {
        router.push("/setup-pin");
      }
    }
  }, [user, hasPinSetup, loading, router]);

  if (loading || !user || !hasPinSetup) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "var(--bg-deep)", color: "var(--text-primary)" }}>
        <div style={{ height: "70px", borderBottom: "1px solid var(--border-color)", padding: "0 24px", display: "flex", alignItems: "center" }}>
          <Skeleton width="120px" height="24px" />
        </div>
        <div style={{ flex: 1, padding: "40px", display: "flex", flexDirection: "column", gap: "24px" }}>
          <Skeleton width="300px" height="40px" />
          <Skeleton width="100%" height="200px" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "var(--bg-deep)", color: "var(--text-primary)" }}>
      <Navbar />
      <main style={{ flex: 1, padding: "24px 24px 48px 24px", maxWidth: "1280px", width: "100%", margin: "0 auto" }}>
        {children}
      </main>
    </div>
  );
}
