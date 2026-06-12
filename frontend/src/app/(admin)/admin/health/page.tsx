"use client";

import React, { useEffect, useState } from "react";
import { adminGetSystemHealth, SystemHealth } from "@/lib/api/admin";
import { showToast } from "@/lib/utils/toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { Activity, Server, Cpu, HardDrive, Database, RefreshCw, Clock } from "lucide-react";

export default function AdminHealthPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchHealth = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      else setRefreshing(true);
      const res = await adminGetSystemHealth();
      // Wait, let's see if the api returns { status, ... } directly or wraps it
      // Based on controller: res.status(200).json({ status, ... })
      // And in admin.ts: export const adminGetSystemHealth = (): Promise<{ health: SystemHealth }> => ...
      // Let's support both nested and flat responses to be safe
      const data = (res as any).health ? (res as any).health : res;
      setHealth(data);
    } catch (err: any) {
      showToast(err.message || "Failed to fetch system health status", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(" ");
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <Skeleton height="50px" width="300px" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px" }}>
          <Skeleton height="120px" />
          <Skeleton height="120px" />
          <Skeleton height="120px" />
        </div>
        <Skeleton height="300px" />
      </div>
    );
  }

  const isHealthy = health?.status === "healthy";

  return (
    <div style={{ animation: "slideUp var(--transition-normal)", display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "4px" }}>System Diagnostics</h1>
          <p style={{ color: "var(--text-secondary)" }}>Real-time infrastructure health, memory usage, and host specifications.</p>
        </div>
        <button
          onClick={() => fetchHealth(false)}
          disabled={refreshing}
          className="btn btn-secondary"
          style={{ padding: "10px 16px", fontSize: "14px", height: "fit-content" }}
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing..." : "Refresh Status"}
        </button>
      </div>

      {/* Quick Status Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
        {/* Core Status */}
        <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{
            background: isHealthy ? "rgba(2, 184, 117, 0.1)" : "rgba(255, 59, 92, 0.1)",
            color: isHealthy ? "var(--accent-emerald)" : "var(--error)",
            padding: "16px",
            borderRadius: "12px"
          }}>
            <Activity size={28} />
          </div>
          <div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>Core Engine</div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: isHealthy ? "var(--accent-emerald)" : "var(--error)", textTransform: "capitalize" }}>
              {health?.status || "Unknown"}
            </div>
          </div>
        </div>

        {/* Database Status */}
        <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{
            background: health?.db?.status === "connected" ? "rgba(2, 184, 117, 0.1)" : "rgba(255, 59, 92, 0.1)",
            color: health?.db?.status === "connected" ? "var(--accent-emerald)" : "var(--error)",
            padding: "16px",
            borderRadius: "12px"
          }}>
            <Database size={28} />
          </div>
          <div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>Database Cluster</div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: health?.db?.status === "connected" ? "var(--accent-emerald)" : "var(--error)", textTransform: "capitalize" }}>
              {health?.db?.status || "Unknown"}
            </div>
          </div>
        </div>

        {/* System Uptime */}
        <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{
            background: "rgba(44, 107, 230, 0.1)",
            color: "var(--accent-blue)",
            padding: "16px",
            borderRadius: "12px"
          }}>
            <Clock size={28} />
          </div>
          <div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>Process Uptime</div>
            <div style={{ fontSize: "20px", fontWeight: 700 }}>
              {health ? formatUptime(health.uptime) : "0s"}
            </div>
          </div>
        </div>
      </div>

      {/* System Resource Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px" }}>
        {/* Host Specs */}
        <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
            <Server size={20} style={{ color: "var(--accent-blue)" }} />
            <h3 style={{ fontSize: "18px", fontWeight: 700 }}>Host Specifications</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Operating System</span>
              <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{health?.system?.platform || "Unknown"} ({health?.system?.arch || "N/A"})</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Runtime Version</span>
              <span style={{ fontWeight: 600, fontFamily: "var(--font-mono)", color: "var(--accent-blue)" }}>Node.js {health?.system?.nodeVersion || "Unknown"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Local Timestamp</span>
              <span style={{ fontWeight: 600 }}>{health ? new Date(health.timestamp).toLocaleString() : "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Resource Allocation */}
        <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
            <Cpu size={20} style={{ color: "var(--accent-blue)" }} />
            <h3 style={{ fontSize: "18px", fontWeight: 700 }}>Resource Utilization</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Memory Usage */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "14px" }}>
                <span style={{ color: "var(--text-secondary)" }}>RAM Allocation</span>
                <span style={{ fontWeight: 600 }}>
                  {health ? formatBytes(health.system.totalMemory - health.system.freeMemory) : "0 GB"} / {health ? formatBytes(health.system.totalMemory) : "0 GB"}
                </span>
              </div>
              <div style={{ height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  background: "var(--accent-blue)",
                  width: health ? `${((health.system.totalMemory - health.system.freeMemory) / health.system.totalMemory) * 100}%` : "0%"
                }} />
              </div>
            </div>

            {/* CPU Load averages */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--text-secondary)" }}>CPU Load Averages (1/5/15m)</span>
              <span style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                {health?.system?.cpuLoad ? health.system.cpuLoad.map(v => v.toFixed(2)).join(" / ") : "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
