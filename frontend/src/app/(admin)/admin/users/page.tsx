"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminSearchUsers } from "@/lib/api/admin";
import { User } from "@/lib/api/auth";
import { showToast } from "@/lib/utils/toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { Search, ShieldAlert, ArrowRight, UserCheck } from "lucide-react";

export default function AdminUsersListPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalUsers, setTotalUsers] = useState<number>(0);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await adminSearchUsers({
        search: search.trim() || undefined,
        page,
        limit: 10
      });
      setUsers(res.users || []);
      setTotalPages(res.pagination?.pages || 1);
      setTotalUsers(res.pagination?.total || 0);
    } catch (err: any) {
      showToast(err.message || "Failed to load user directory", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page]);

  // Debounced search
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setPage(1);
      fetchUsers();
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [search]);

  return (
    <div style={{ animation: "slideUp var(--transition-normal)", display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "4px" }}>User Directory</h1>
        <p style={{ color: "var(--text-secondary)" }}>Audit bank customers, system tellers, and administrative security staff profiles.</p>
      </div>

      {/* Search Bar */}
      <div className="glass-card" style={{ padding: "16px", display: "flex", gap: "16px" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px", background: "rgba(10,22,40,0.8)", border: "1px solid var(--border)", padding: "10px 16px", borderRadius: "8px" }}>
          <Search size={16} style={{ color: "var(--text-secondary)" }} />
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or user ID..."
            style={{ background: "none", border: "none", color: "var(--text-primary)", fontSize: "14px", width: "100%" }}
          />
        </div>
      </div>

      {/* Directory Table */}
      <div className="glass-card" style={{ padding: 0 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                <th style={{ padding: "16px 24px" }}>User Identity</th>
                <th style={{ padding: "16px 24px" }}>System Role</th>
                <th style={{ padding: "16px 24px" }}>Status</th>
                <th style={{ padding: "16px 24px" }}>User ID</th>
                <th style={{ padding: "16px 24px", textAlign: "right" }}>Inspect Profile</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "16px 24px" }}><Skeleton width="180px" /></td>
                    <td style={{ padding: "16px 24px" }}><Skeleton width="80px" /></td>
                    <td style={{ padding: "16px 24px" }}><Skeleton width="80px" /></td>
                    <td style={{ padding: "16px 24px" }}><Skeleton width="120px" /></td>
                    <td style={{ padding: "16px 24px", textAlign: "right" }}><Skeleton width="40px" /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "48px 0", textAlign: "center", color: "var(--text-secondary)", fontStyle: "italic" }}>
                    No users match your query parameters.
                  </td>
                </tr>
              ) : (
                users.map((item) => (
                  <tr 
                    key={item._id} 
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{item.email}</div>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <span style={{ 
                        fontSize: "11px", 
                        background: item.role !== "customer" ? "rgba(30, 111, 234, 0.15)" : "rgba(255, 255, 255, 0.05)", 
                        color: item.role !== "customer" ? "var(--accent-blue)" : "var(--text-secondary)", 
                        padding: "3px 8px", 
                        borderRadius: "10px",
                        fontWeight: 600,
                        textTransform: "uppercase"
                      }}>
                        {item.role}
                      </span>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      {item.isActive ? (
                        <Badge label="ACTIVE" />
                      ) : (
                        <span style={{ 
                          fontSize: "11px", 
                          background: "rgba(255, 77, 106, 0.15)", 
                          color: "var(--error)", 
                          padding: "3px 8px", 
                          borderRadius: "10px",
                          fontWeight: 600
                        }}>
                          SUSPENDED
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "16px 24px", fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--text-secondary)" }}>
                      {item._id}
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "right" }}>
                      <button 
                        onClick={() => router.push(`/admin/users/${item._id}`)}
                        className="btn btn-secondary"
                        style={{ padding: "6px 12px", fontSize: "12px", borderRadius: "6px" }}
                      >
                        <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Pagination 
            page={page} 
            totalPages={totalPages} 
            totalItems={totalUsers}
            limit={10}
            onPageChange={setPage} 
          />
        </div>
      )}
    </div>
  );
}
