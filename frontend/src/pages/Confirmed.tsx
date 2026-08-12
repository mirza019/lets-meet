import { Link, useParams } from "react-router-dom";
import { PlanCard } from "../components/PlanCard";
import { Loading } from "../components/Loading";
import { PushNotifications } from "../components/PushNotifications";
import { useInvitation } from "../hooks/useInvitation";
import { Shell } from "../layouts/Shell";
import { displayName } from "../utils/names";
import { RecoveryError } from "../components/RecoveryError";
export function Confirmed({ role }: { role: "host" | "guest" }) {
  const p = useParams();
  const token = (role === "host" ? p.hostToken : p.guestToken) || "";
  const { data, error, reload } = useInvitation(role, token);
  if (error)
    return (
      <Shell privatePage wallpaper="meet">
        <RecoveryError message={error} onRetry={reload} />
      </Shell>
    );
  if (!data)
    return (
      <Shell privatePage wallpaper="meet">
        <Loading />
      </Shell>
    );
  const host = displayName(data, "host");
  const guest = displayName(data, "guest");
  return (
    <Shell privatePage wallpaper="meet">
      <section className="card">
        <div className="confetti">🤝✨</div>
        <p className="eyebrow">Suspiciously cute plan confirmed</p>
        <h1 className="title">THE ALIBI IS READY</h1>
        <p className="subtitle">
          {guest} ✅<br />
          {host} ✅<br />
          <br />
          Against all odds, two people successfully agreed on something. 😂
        </p>
        <PushNotifications role={role} token={token} />
        {data.current_proposal && (
          <PlanCard plan={data.current_proposal} invite={data} />
        )}
        <p className="muted">
          Officially a meetup. Unofficially, a very cute logistical victory. 👀
        </p>
        <div className="stack">
          <Link
            className="btn primary"
            to={`/${role === "host" ? "respond" : "invite"}/${token}/today`}
          >
            OPEN MEET MODE 💫
          </Link>
          <Link
            className="btn ghost"
            to={`/${role === "host" ? "respond" : "invite"}/${token}/history`}
          >
            VIEW PLAN JOURNEY
          </Link>
        </div>
      </section>
    </Shell>
  );
}
