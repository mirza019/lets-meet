import { useState } from "react";
import { isToday, parseISO } from "date-fns";
import { Link, useParams } from "react-router-dom";
import { Loading } from "../components/Loading";
import { useInvitation } from "../hooks/useInvitation";
import { Shell } from "../layouts/Shell";
import { displayName } from "../utils/names";
import { RecoveryError } from "../components/RecoveryError";
export function MeetMode({ role }: { role: "host" | "guest" }) {
  const p = useParams();
  const token = (role === "host" ? p.hostToken : p.guestToken) || "";
  const { data, error, reload } = useInvitation(role, token);
  const [message, setMessage] = useState("");
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
  const plan = data.current_proposal;
  const host = displayName(data, "host");
  const guest = displayName(data, "guest");
  const meetingIsToday = plan?.meeting_date
    ? isToday(parseISO(plan.meeting_date))
    : false;
  const basePath = `/${role === "host" ? "respond" : "invite"}/${token}`;
  const directions = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(plan?.meetup_address || plan?.meetup_name || "")}`;
  return (
    <Shell privatePage wallpaper="meet">
      <section className="card">
        <p className="eyebrow">
          {meetingIsToday ? "Today 💫" : "Meet mode · coming up"}
        </p>
        <h1 className="title">
          {host} × {guest}
        </h1>
        <p className="subtitle">
          Next: <strong>{plan?.meetup_name || "The agreed place"}</strong>
          <br />
          {plan?.meeting_time || ""}
        </p>
        <div className="stack">
          <a className="btn primary" href={directions} target="_blank">
            DIRECTIONS 🗺️
          </a>
          <button
            className="btn secondary"
            onClick={() =>
              setMessage("You showed up. Looking suspiciously pleased about it too. 👀")
            }
          >
            I'M HERE 👀
          </button>
          {message && (
            <div className="note" aria-live="polite">
              {message}
            </div>
          )}
          <Link className="btn ghost" to={`${basePath}/confirmed`}>
            VIEW FULL CONFIRMED PLAN
          </Link>
        </div>
      </section>
    </Shell>
  );
}
