import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { Draft, Invitation, Proposal } from "../types";

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() ?? "";

export function chooseApiBaseUrl(hostname: string, configured: string): string {
  return ["localhost", "127.0.0.1"].includes(hostname) ? configured : "";
}

// A developer's local .env must never make the deployed site call localhost
// on a visitor's device. Production uses the same Azure origin for UI + API.
const apiBaseUrl = chooseApiBaseUrl(window.location.hostname, configuredApiBaseUrl);

type RetryableRequest = InternalAxiosRequestConfig & { _retryCount?: number };

export const client = axios.create({
  baseURL: apiBaseUrl,
  // Proposal/confirmation requests may still include email delivery. Keep the
  // browser timeout longer than the mail provider's bounded timeout.
  timeout: 35000,
});

export function apiErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ detail?: unknown }>;
  const detail = axiosError.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) =>
        typeof item === "object" && item && "msg" in item
          ? String((item as { msg: unknown }).msg)
          : "",
      )
      .filter(Boolean);
    if (messages.length) return messages.join(" ");
  }
  if (axiosError.code === "ECONNABORTED") {
    return "The server took too long to answer. Your plan may still be saved—refresh once before trying again.";
  }
  if (!axiosError.response) {
    return "The app cannot reach the server right now. Check your connection and try once more.";
  }
  return "The meetup could not be created. Please try once more.";
}

client.interceptors.response.use(undefined, async (error: AxiosError) => {
  const request = error.config as RetryableRequest | undefined;
  if (!request || request.method?.toLowerCase() !== "get") throw error;
  const retryable = !error.response || [502, 503, 504].includes(error.response.status);
  const retryCount = request._retryCount ?? 0;
  if (!retryable || retryCount >= 3) throw error;
  request._retryCount = retryCount + 1;
  await new Promise((resolve) => window.setTimeout(resolve, 900 * 2 ** retryCount));
  return client(request);
});
export const api = {
  create: async (data: unknown) => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await client.post("/api/invitations", data).then((response) => response.data);
      } catch (error) {
        lastError = error;
        const axiosError = error as AxiosError;
        if (axiosError.response || attempt === 2) throw error;
        await new Promise((resolve) => window.setTimeout(resolve, 800 * 2 ** attempt));
      }
    }
    throw lastError;
  },
  get: (role: "guest" | "host", token: string) =>
    client
      .get<Invitation>(`/api/invitations/${role}/${token}`)
      .then((r) => r.data),
  decline: (token: string) =>
    client.post(`/api/invitations/guest/${token}/decline`),
  propose: (role: "guest" | "host", token: string, data: Draft) =>
    client
      .post<Proposal>(`/api/invitations/${role}/${token}/proposals`, data)
      .then((r) => r.data),
  accept: (role: "guest" | "host", token: string) =>
    client.post(`/api/invitations/${role}/${token}/accept`).then((r) => r.data),
  history: (role: "guest" | "host", token: string) =>
    client
      .get<Proposal[]>(`/api/invitations/${role}/${token}/history`)
      .then((r) => r.data),
  late: (role: "guest" | "host", token: string, minutes: number) =>
    client.post(`/api/invitations/${role}/${token}/running-late`, { minutes }),
  pushConfig: () =>
    client
      .get<{ enabled: boolean; public_key: string }>("/api/push/config")
      .then((response) => response.data),
  subscribePush: (
    role: "guest" | "host",
    token: string,
    subscription: { endpoint: string; p256dh: string; auth: string },
  ) =>
    client.post(
      `/api/invitations/${role}/${token}/push-subscriptions`,
      subscription,
    ),
};
