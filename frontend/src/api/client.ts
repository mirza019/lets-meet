import axios from "axios";
import type { Draft, Invitation, Proposal } from "../types";
export const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
  timeout: 12000,
});
export const api = {
  create: (data: unknown) =>
    client.post("/api/invitations", data).then((r) => r.data),
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
