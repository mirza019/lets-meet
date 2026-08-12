import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Invitation } from "../types";
export function useInvitation(role: "guest" | "host", token: string) {
  const [data, setData] = useState<Invitation>();
  const [error, setError] = useState("");
  const reload = () =>
    api
      .get(role, token)
      .then((value) => {
        setData(value);
        setError("");
      })
      .catch((e) => {
        if (e.response?.status === 404) {
          setError("This private link is invalid, expired, or no longer active.");
          return;
        }
        setError(e.response?.data?.detail || "The server did not answer after several tries. It may be waking up—try once more. 🗿");
      });
  useEffect(() => {
    void reload();
  }, [role, token]);
  return { data, error, reload };
}
