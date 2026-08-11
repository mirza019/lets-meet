import type { Invitation } from "../types";

export function displayName(invitation: Invitation, role: "host" | "guest") {
  return role === "host"
    ? invitation.host_nickname?.trim() || invitation.host_name
    : invitation.guest_nickname?.trim() || invitation.guest_name;
}
