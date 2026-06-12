export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

/**
 * Triggers a global toast notification. Can be used anywhere (components, services, API client).
 */
export const showToast = (message: string, type: ToastType = "info") => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: { message, type },
      })
    );
  }
};
