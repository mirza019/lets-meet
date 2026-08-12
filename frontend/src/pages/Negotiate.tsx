import { useState } from "react";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Loading } from "../components/Loading";
import { useInvitation } from "../hooks/useInvitation";
import { Shell } from "../layouts/Shell";
import type { Draft } from "../types";
import { RecoveryError } from "../components/RecoveryError";
const activityChoices = [
  "Food",
  "Coffee",
  "Walk",
  "Movie",
  "Nature",
  "Shopping",
  "Ice Cream",
  "Dessert",
  "Bowling",
  "Billiards",
  "Park",
  "Night Walk",
  "Games",
  "Small Trip",
  "Surprise Me",
];
export function Negotiate({ role }: { role: "host" | "guest" }) {
  const params = useParams();
  const token = (role === "host" ? params.hostToken : params.guestToken) || "";
  const nav = useNavigate();
  const { data, error, reload } = useInvitation(role, token);
  const [draft, setDraft] = useState<Draft>();
  const plan = draft || data?.current_proposal;
  async function submit() {
    if (!plan) return;
    await api.propose(role, token, plan);
    nav(`/${role === "host" ? "respond" : "invite"}/${token}`);
  }
  if (error)
    return (
      <Shell privatePage>
        <RecoveryError message={error} onRetry={reload} />
      </Shell>
    );
  if (!data || !plan)
    return (
      <Shell privatePage>
        <Loading />
      </Shell>
    );
  const set = (key: keyof Draft, value: any) =>
    setDraft({ ...plan, [key]: value });
  const removeActivity = (index: number) =>
    set(
      "activities",
      plan.activities.filter((_, activityIndex) => activityIndex !== index),
    );
  const moveActivity = (from: number, to: number) => {
    if (to < 0 || to >= plan.activities.length) return;
    const activities = [...plan.activities];
    const [activity] = activities.splice(from, 1);
    activities.splice(to, 0, activity);
    set("activities", activities);
  };
  const addActivity = (title: string) => {
    if (plan.activities.some((activity) => activity.title === title)) return;
    set("activities", [
      ...plan.activities,
      {
        activity_type: title.toLowerCase().replaceAll(" ", "_"),
        title,
      },
    ]);
  };
  const removeDuplicateActivities = () => {
    const seen = new Set<string>();
    set(
      "activities",
      plan.activities.filter((activity) => {
        const key = activity.title.trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }),
    );
  };
  return (
    <Shell privatePage>
      <section className="card">
        <p className="eyebrow">Counteroffer · new version</p>
        <h1 className="title">Apparently you have opinions. 🗿</h1>
        <p className="subtitle">
          Every edit creates a new immutable proposal. The other person's
          previous acceptance will not carry over.
        </p>
        <div className="row">
          <div className="field">
            <label>Date</label>
            <input
              type="date"
              value={plan.meeting_date || ""}
              onChange={(e) => set("meeting_date", e.target.value)}
            />
          </div>
          <div className="field">
            <label>Time</label>
            <input
              type="time"
              value={plan.meeting_time || ""}
              onChange={(e) => set("meeting_time", e.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <label>Duration (minutes)</label>
          <input
            type="number"
            value={plan.duration_minutes || ""}
            onChange={(e) => set("duration_minutes", +e.target.value)}
          />
        </div>
        <div className="field">
          <label>Meeting place</label>
          <input
            value={plan.meetup_name || ""}
            onChange={(e) => set("meetup_name", e.target.value)}
          />
        </div>
        <div className="field">
          <label>Food choices (separate with commas)</label>
          <input
            value={(plan.food_choices || (plan.food_choice ? [plan.food_choice] : [])).join(", ")}
            onChange={(e) =>
              set(
                "food_choices",
                e.target.value.split(",").map((value) => value.trim()).filter(Boolean),
              )
            }
          />
        </div>
        {plan.cooking_by_host && (
          <div className="field">
            <label>What should the host cook?</label>
            <input
              value={plan.host_cooking_request || ""}
              onChange={(e) => set("host_cooking_request", e.target.value)}
            />
          </div>
        )}
        <div className="field">
          <label>What to bring</label>
          <input
            value={plan.custom_bring_request || plan.bring_request || ""}
            onChange={(e) => set("custom_bring_request", e.target.value)}
          />
        </div>
        <div className="history">
          <div className="row">
            <div>
              <strong>Activities and their order</strong>
              <div className="muted">These become the new itinerary.</div>
            </div>
            <button
              className="btn ghost"
              onClick={removeDuplicateActivities}
              type="button"
            >
              Remove duplicates
            </button>
          </div>
          {plan.activities.map((activity, index) => (
            <div className="activity-order" key={`${activity.title}-${index}`}>
              <span>
                {index + 1}. {activity.title}
              </span>
              <span className="activity-actions">
                <button
                  className="icon-btn"
                  aria-label={`Move ${activity.title} up`}
                  disabled={index === 0}
                  onClick={() => moveActivity(index, index - 1)}
                >
                  <ArrowUp size={17} />
                </button>
                <button
                  className="icon-btn"
                  aria-label={`Move ${activity.title} down`}
                  disabled={index === plan.activities.length - 1}
                  onClick={() => moveActivity(index, index + 1)}
                >
                  <ArrowDown size={17} />
                </button>
                <button
                  className="icon-btn"
                  aria-label={`Remove ${activity.title}`}
                  onClick={() => removeActivity(index)}
                >
                  <X size={17} />
                </button>
              </span>
            </div>
          ))}
          <p>
            <strong>Add an activity</strong>
          </p>
          <div className="choices">
            {activityChoices.map((title) => {
              const selected = plan.activities.some(
                (activity) => activity.title === title,
              );
              return (
                <button
                  className={`choice ${selected ? "selected" : ""}`}
                  disabled={selected}
                  key={title}
                  onClick={() => addActivity(title)}
                >
                  {selected ? "✓" : "＋"} {title}
                </button>
              );
            })}
          </div>
        </div>
        <div className="field">
          <label>Notes</label>
          <textarea
            value={plan.notes || ""}
            onChange={(e) => set("notes", e.target.value)}
          />
        </div>
        <button className="btn primary" onClick={submit}>
          SEND COUNTEROFFER 💌
        </button>
      </section>
    </Shell>
  );
}
