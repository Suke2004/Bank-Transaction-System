const API_BASE_URL = "/v2"; // Prepend base path /v2 for Next.js basePath rewrites

interface ApiFetchOptions extends RequestInit {
  skipAuthRefresh?: boolean;
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

/**
 * Custom fetch wrapper that includes credentials, processes JSON requests,
 * and handles 401 token refresh rotation transparently.
 */
export const apiFetch = async (endpoint: string, options: ApiFetchOptions = {}): Promise<any> => {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  // Set default headers
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: "include", // Essential for HttpOnly cookie forwarding
  };

  try {
    const response = await fetch(url, fetchOptions);

    // If unauthorized and we aren't already skipping refresh logic
    if (response.status === 401 && !options.skipAuthRefresh && endpoint !== "/api/v1/auth/refresh") {
      if (!isRefreshing) {
        isRefreshing = true;

        try {
          // Attempt to refresh the access token using the refresh cookie
          const refreshRes = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
            method: "POST",
            credentials: "include",
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            const newToken = data.token;
            
            isRefreshing = false;
            onRefreshed(newToken);
          } else {
            // Refresh token has expired or is invalid
            isRefreshing = false;
            // Force logout by clearing credentials and redirecting
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("unauthorized-session-expired"));
            }
            throw new Error("Session expired. Please log in again.");
          }
        } catch (refreshErr) {
          isRefreshing = false;
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("unauthorized-session-expired"));
          }
          throw refreshErr;
        }
      }

      // If a refresh is already in progress, wait for it to complete
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((newToken) => {
          // Re-fetch the original request with new headers
          const retriedHeaders = new Headers(options.headers || {});
          if (!retriedHeaders.has("Content-Type") && !(options.body instanceof FormData)) {
            retriedHeaders.set("Content-Type", "application/json");
          }
          resolve(
            fetch(url, { ...fetchOptions, headers: retriedHeaders })
              .then((res) => {
                if (!res.ok) {
                  return res.json().then((json) => Promise.reject(json));
                }
                // Handle empty responses or JSON
                const contentType = res.headers.get("content-type");
                if (contentType && contentType.includes("text/csv")) {
                  return res.text();
                }
                return res.json();
              })
          );
        });
      });
    }

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      return Promise.reject({
        status: response.status,
        message: errorJson.message || "Something went wrong",
        errors: errorJson.errors || [],
      });
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("text/csv")) {
      return await response.text();
    }

    // Try parsing as JSON, fallback to text
    return await response.json().catch(() => ({}));
  } catch (err: any) {
    return Promise.reject(err);
  }
};
