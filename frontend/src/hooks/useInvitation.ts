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
        setError(
          e.response?.data?.detail ||
            "Something broke. Probably the calendar being dramatic. Try again. 🗿",
        );
      });
  useEffect(() => {
    void reload();
  }, [role, token]);
  return { data, error, reload };
}
