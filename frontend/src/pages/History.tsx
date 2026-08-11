import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { Shell } from "../layouts/Shell";
import type { Proposal } from "../types";
import { useInvitation } from "../hooks/useInvitation";
import { displayName } from "../utils/names";
export function History({ role }: { role: "host" | "guest" }) {
  const p = useParams();
  const token = (role === "host" ? p.hostToken : p.guestToken) || "";
  const [items, setItems] = useState<Proposal[]>([]);
  const { data } = useInvitation(role, token);
  useEffect(() => {
    api.history(role, token).then(setItems);
  }, [role, token]);
  return (
    <Shell privatePage wallpaper="review">
      <section className="card">
        <p className="eyebrow">Plan journey</p>
        <h1 className="title">The plan's plot twists</h1>
        <div className="timeline">
          {items.map((x) => (
            <div className="timeline-item" key={x.id}>
              <strong>
                #{x.version} ·{" "}
                {data
                  ? displayName(data, x.created_by_role as "host" | "guest")
                  : x.created_by_role}
              </strong>
              <div>
                {x.meeting_date} at {x.meeting_time} ·{" "}
                {x.activities.map((a) => a.title).join(" + ")}
              </div>
              <small className="muted">
                {new Date(x.created_at).toLocaleString()}
              </small>
            </div>
          ))}
        </div>
      </section>
    </Shell>
  );
}
