import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../api/client";
import { copy } from "../content/copy";
import { useInvitation } from "../hooks/useInvitation";
import { Shell } from "../layouts/Shell";
import { Loading } from "../components/Loading";
import { PushNotifications } from "../components/PushNotifications";
import { PlanCard } from "../components/PlanCard";
import { Confirmed } from "./Confirmed";
import { RoleReview } from "./RoleReview";
import { displayName } from "../utils/names";
import { RecoveryError } from "../components/RecoveryError";
export function GuestInvite() {
  const { guestToken = "" } = useParams();
  const nav = useNavigate();
  const { data, error, reload } = useInvitation("guest", guestToken);
  const [tries, setTries] = useState(0);
  const [pos, setPos] = useState<{ left: number; top: number }>();
  const [noVisible, setNoVisible] = useState(true);
  const playgroundRef = useRef<HTMLDivElement>(null);
  function move() {
    const nextTry = tries + 1;
    setNoVisible(false);
    setTries(nextTry);
    if (nextTry >= 6) return;
    window.setTimeout(() => {
      const playground = playgroundRef.current;
      const width = playground?.clientWidth || 300;
      const height = playground?.clientHeight || 170;
      const buttonWidth = 128;
      const buttonHeight = 52;
      const margin = 8;
      setPos({
        left:
          margin +
          Math.random() * Math.max(0, width - buttonWidth - margin * 2),
        top:
          margin +
          Math.random() * Math.max(0, height - buttonHeight - margin * 2),
      });
      setNoVisible(true);
    }, 160);
  }
  async function declineForReal() {
    await api.decline(guestToken);
    reload();
  }
  if (error)
    return (
      <Shell privatePage>
        <RecoveryError message={error} onRetry={reload} />
      </Shell>
    );
  if (!data)
    return (
      <Shell privatePage>
        <Loading />
      </Shell>
    );
  const host = displayName(data, "host");
  const guest = displayName(data, "guest");
  if (data.status === "declined")
    return (
      <Shell privatePage>
        <div className="card">
          <p className="eyebrow">No worries</p>
          <h1 className="title">Not today 🙂</h1>
          <p className="subtitle">
            The invitation was declined. No guilt, no drama, no follow-up quest.
          </p>
        </div>
      </Shell>
    );
  if (data.status === "confirmed") return <Confirmed role="guest" />;
  if (data.status === "pending_guest" && data.current_proposal)
    return <RoleReview role="guest" />;
  if (data.status === "pending_host" && data.current_proposal)
    return (
      <Shell privatePage>
        <section className="card">
          <p className="eyebrow">Proposal sent ✨</p>
          <h1 className="title">Now {host} gets the final say. 👀</h1>
          <p className="subtitle">
            Your current proposal is waiting for review. If they change it, this
            page will become your plan-update review screen.
          </p>
          <PushNotifications role="guest" token={guestToken} />
          <PlanCard plan={data.current_proposal} invite={data} />
        </section>
      </Shell>
    );
  return (
    <Shell privatePage>
      <motion.section
        className="card"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <p className="eyebrow">Your calendar audition has arrived ✨</p>
        <h1 className="title">So, {guest}… you wanna meet {host}? 👀</h1>
        <p className="subtitle">
          Well, well. <strong>{host}</strong> handed you the planning power, so
          this is your chance to make a dangerously convincing little plan.
          <br />
          <br />
          Pick the day, choose the fun, handle the snacks—and maybe earn that
          very exclusive calendar approval. No pressure. Just your reputation. 😌
        </p>
        {data.personal_note && (
          <blockquote className="note">“{data.personal_note}”</blockquote>
        )}
        <PushNotifications role="guest" token={guestToken} />
        <div className="stack">
          <button
            className="btn primary"
            onClick={() => nav(`/invite/${guestToken}/build`)}
          >
            FINE, I’LL IMPRESS {host.toUpperCase()} 👀
          </button>
        </div>
        <div
          className="no-playground"
          ref={playgroundRef}
          aria-label="The no button playground"
        >
          {noVisible && tries < 6 && (
            <button
              className={`btn secondary no-teleport ${pos ? "" : "no-start"}`}
              style={pos}
              onClick={move}
            >
              NO 🙄
            </button>
          )}
        </div>
        {tries > 0 && (
          <div
            aria-live="polite"
            className={tries >= 6 ? "note final-no-message" : "muted"}
            style={{ minHeight: 24, textAlign: "center" }}
          >
            {tries >= 6 ? (
              <>
                <strong>
                  Sorry {guest}, the NO button has resigned. You have no choice
                  now—you’ll have to meet {host}. Try not to look too excited. 👀😂
                </strong>
                <br />
                <button
                  className="btn ghost"
                  onClick={declineForReal}
                >
                  OKAY, RELEASE ME 😂
                </button>
              </>
            ) : (
              copy.noMessages[(tries - 1) % copy.noMessages.length]
            )}
          </div>
        )}
      </motion.section>
    </Shell>
  );
}
