import { Clock, MapPin, Utensils } from "lucide-react";
import type { Draft, Invitation } from "../types";
import { displayName } from "../utils/names";
export function PlanCard({
  plan,
  invite,
}: {
  plan: Draft;
  invite: Invitation;
}) {
  const maps =
    plan.meetup_latitude != null
      ? `https://www.openstreetmap.org/?mlat=${plan.meetup_latitude}&mlon=${plan.meetup_longitude}#map=16/${plan.meetup_latitude}/${plan.meetup_longitude}`
      : `https://www.openstreetmap.org/search?query=${encodeURIComponent(plan.meetup_address || plan.meetup_name || "")}`;
  const guest = displayName(invite, "guest");
  const host = displayName(invite, "host");
  const foodChoices =
    plan.food_choices?.length
      ? plan.food_choices
      : plan.food_choice
        ? [plan.food_choice]
        : [];
  const food = foodChoices
    .map((choice) =>
      choice === "Other"
        ? plan.custom_food_request || "Other menu choice"
        : choice,
    )
    .join(", ");
  return (
    <div>
      <p className="eyebrow">A suspiciously thoughtful meetup pitch ✨</p>
      <h2>
        {guest} <span className="muted">→</span> {host}
      </h2>
      <div className="timeline">
        <div className="timeline-item">
          <strong>
            {plan.meeting_date || "Date TBD"} ·{" "}
            {plan.meeting_time || "Time TBD"}
          </strong>
          <div className="muted">
            <Clock size={15} />{" "}
            {plan.duration_minutes
              ? `${plan.duration_minutes} minutes`
              : "Duration negotiable"}
          </div>
        </div>
        {plan.meetup_name && (
          <div className="timeline-item">
            <strong>
              <MapPin size={15} /> Meet: {plan.meetup_name}
            </strong>
            <div className="muted">{plan.meetup_address}</div>
            <a href={maps} target="_blank" rel="noreferrer">
              Open in OpenStreetMap
            </a>{" "}
            ·{" "}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(plan.meetup_address || plan.meetup_name)}`}
              target="_blank"
              rel="noreferrer"
            >
              Google Maps
            </a>
          </div>
        )}
        {plan.meal_type && (
          <div className="timeline-item">
            <strong>
              <Utensils size={15} /> {plan.meal_type}
            </strong>
            <div>{food || plan.restaurant?.name || "Food to be decided"}</div>
            {plan.cooking_by_host && (
              <div className="muted">
                👨‍🍳 Premium add-on: {host} cooks for you
                {plan.host_cooking_request
                  ? ` — ${plan.host_cooking_request}`
                  : ""}
              </div>
            )}
            {plan.restaurant?.name && food && (
              <div className="muted">🍽️ Restaurant/pickup: {plan.restaurant.name}</div>
            )}
            {plan.restaurant?.menu_url && (
              <a href={plan.restaurant.menu_url}>View menu</a>
            )}
          </div>
        )}
        {plan.activities.map((a, i) => (
          <div className="timeline-item" key={i}>
            <strong>{a.title}</strong>
            <div className="muted">
              {a.location_name}{" "}
              {a.duration_minutes ? `· ${a.duration_minutes}m` : ""}
            </div>
          </div>
        ))}
      </div>
      {plan.bring_request && (
        <p>
          <strong>Bring:</strong>{" "}
          {plan.custom_bring_request || plan.bring_request}
        </p>
      )}
      {plan.notes && <div className="note">{plan.notes}</div>}
      {plan.revive_cancelled_plan && (
        <div className="note revive-note">
          <strong>Cancelled-plan comeback 🪄</strong>
          <br />
          {plan.revive_plan_details || "Details to be revealed dramatically."}
        </div>
      )}
    </div>
  );
}
