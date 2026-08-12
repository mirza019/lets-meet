import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { Invitation } from "../types";
export function useInvitation(role: "guest" | "host", token: string) {
  const navigate = useNavigate();
  const [data, setData] = useState<Invitation>();
  const [error, setError] = useState("");
  const validToken = /^[A-Za-z0-9_-]{32,}$/.test(token);
  const reload = () =>
    !validToken
      ? Promise.resolve(navigate("/", { replace: true }))
      :
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
    if (!validToken) {
      navigate("/", { replace: true });
      return;
    }
    void reload();
  }, [role, token, validToken, navigate]);
  return { data, error, reload };
}
