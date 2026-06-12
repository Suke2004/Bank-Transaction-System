"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Navbar } from "@/components/layout/Navbar";
import { Skeleton } from "@/components/ui/Skeleton";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (user.role === "customer") {
        router.push("/dashboard");
      }
    }
  }, [user, loading, router]);

  if (loading || !user || user.role === "customer") {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "var(--bg-deep)", color: "var(--text-primary)" }}>
        <div style={{ height: "70px", borderBottom: "1px solid var(--border)", padding: "0 24px", display: "flex", alignItems: "center" }}>
          <Skeleton width="120px" height="24px" />
        </div>
        <div style={{ flex: 1, display: "flex" }}>
          <div style={{ width: "240px", borderRight: "1px solid var(--border)", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <Skeleton height="35px" />
            <Skeleton height="35px" />
            <Skeleton height="35px" />
          </div>
          <div style={{ flex: 1, padding: "40px", display: "flex", flexDirection: "column", gap: "24px" }}>
            <Skeleton width="300px" height="40px" />
            <Skeleton width="100%" height="200px" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "var(--bg-deep)", color: "var(--text-primary)" }}>
      <Navbar />
      
      <div style={{ display: "flex", flex: 1 }}>
        <AdminSidebar />
        
        <main style={{ flex: 1, padding: "32px", maxWidth: "1200px", width: "100%", margin: "0 auto", overflowX: "hidden" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
