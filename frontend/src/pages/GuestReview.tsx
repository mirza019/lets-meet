import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { PlanCard } from "../components/PlanCard";
import { Loading } from "../components/Loading";
import { useInvitation } from "../hooks/useInvitation";
import { Shell } from "../layouts/Shell";
import { useDraft } from "../stores/draft";
import { displayName } from "../utils/names";
import { RecoveryError } from "../components/RecoveryError";
export function GuestReview() {
  const { guestToken = "" } = useParams();
  const nav = useNavigate();
  const { data, error, reload } = useInvitation("guest", guestToken);
  const { draft, reset } = useDraft();
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true);
    await api.propose("guest", guestToken, draft);
    reset();
    nav(`/invite/${guestToken}`);
  }
  if (error)
    return (
      <Shell privatePage wallpaper="review">
        <RecoveryError message={error} onRetry={reload} />
      </Shell>
    );
  if (!data)
    return (
      <Shell privatePage wallpaper="review">
        <Loading />
      </Shell>
    );
  const host = displayName(data, "host");
  return (
    <Shell privatePage wallpaper="review">
      <section className="card">
        <p className="eyebrow">The pitch is looking dangerously cute ✨</p>
        <h1 className="title">Ready to make {host} curious? 👀</h1>
        <p className="subtitle">
          Inspect your masterpiece, fix anything suspicious, then send it off
          for the only verdict that matters.
        </p>
        <PlanCard plan={draft} invite={data} />
        <div className="row">
          <button
            className="btn secondary"
            onClick={() => nav(`/invite/${guestToken}/build`)}
          >
            EDIT PLAN
          </button>
          <button className="btn primary" disabled={busy} onClick={send}>
            {busy ? "Sending…" : `TEMPT ${host.toUpperCase()} ✨`}
          </button>
        </div>
      </section>
    </Shell>
  );
}
