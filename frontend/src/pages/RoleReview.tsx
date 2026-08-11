import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { PlanCard } from "../components/PlanCard";
import { Loading } from "../components/Loading";
import { PushNotifications } from "../components/PushNotifications";
import { useInvitation } from "../hooks/useInvitation";
import { Shell } from "../layouts/Shell";
import { displayName } from "../utils/names";
export function RoleReview({ role }: { role: "host" | "guest" }) {
  const params = useParams();
  const token = (role === "host" ? params.hostToken : params.guestToken) || "";
  const nav = useNavigate();
  const { data, error, reload } = useInvitation(role, token);
  const [busy, setBusy] = useState(false);
  async function accept() {
    setBusy(true);
    const r = await api.accept(role, token);
    if (r.confirmed)
      nav(`/${role === "host" ? "respond" : "invite"}/${token}/confirmed`);
    else reload();
    setBusy(false);
  }
  if (error)
    return (
      <Shell privatePage wallpaper="review">
        <div className="card error">{error}</div>
      </Shell>
    );
  if (!data)
    return (
      <Shell privatePage wallpaper="review">
        <Loading />
      </Shell>
    );
  if (!data.current_proposal)
    return (
      <Shell privatePage wallpaper="review">
        <div className="card">
          <p className="eyebrow">The suspense</p>
          <h1 className="title">No plan yet.</h1>
          <p className="subtitle">
            We'll let you know when someone develops opinions.
          </p>
        </div>
      </Shell>
    );
  const isConfirmed = data.status === "confirmed";
  const host = displayName(data, "host");
  const guest = displayName(data, "guest");
  return (
    <Shell privatePage wallpaper="review">
      <section className="card">
        <h1 className="title">
          {isConfirmed
            ? "This plan is confirmed. 🤝"
            : role === "host"
              ? `${host}, we have news. 👀`
              : `Plan update received. 👀`}
        </h1>
        <p className="subtitle">
          {isConfirmed
            ? "The confirmed version stays active until both people accept any requested change."
            : role === "host"
              ? `${guest} built a suspiciously organized meetup. Your approval is requested.`
              : `${host} adjusted the plan. Bold move—review the evidence.`}
        </p>
        <PushNotifications role={role} token={token} />
        <PlanCard plan={data.current_proposal} invite={data} />
        <div className="row">
          {!isConfirmed && (
            <button className="btn primary" disabled={busy} onClick={accept}>
              ACCEPT ✨
            </button>
          )}
        </div>
      </section>
    </Shell>
  );
}
