"use client";

import React from "react";
import styles from "./Pagination.module.css";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  limit: number;
  onPageChange: (newPage: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  totalItems,
  limit,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, totalItems);

  return (
    <div className={styles.paginationContainer}>
      <div className={styles.info}>
        Showing {startItem}–{endItem} of {totalItems} items
      </div>

      <div className={styles.controls}>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="btn btn-secondary"
          style={{ padding: "6px 12px", gap: "4px" }}
        >
          <ChevronLeft size={16} />
          Prev
        </button>

        <span className={styles.pageIndicator}>
          Page {page} of {totalPages}
        </span>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="btn btn-secondary"
          style={{ padding: "6px 12px", gap: "4px" }}
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
