import { useState } from "react";
import { addDays, format, nextSaturday } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useInvitation } from "../hooks/useInvitation";
import { Shell } from "../layouts/Shell";
import { Loading } from "../components/Loading";
import { useDraft } from "../stores/draft";
import { MeetMap } from "../features/maps/MeetMap";
import type { Activity } from "../types";
import { displayName } from "../utils/names";
const steps = [
  "date",
  "time",
  "duration",
  "activity",
  "food",
  "bring",
  "mood",
  "location",
  "details",
] as const;
type Step = (typeof steps)[number];
const options: Record<string, [string, string][]> = {
  activity: [
    ["Food", "🍽️ Food"],
    ["Coffee", "☕ Coffee"],
    ["Walk", "🚶 Walk"],
    ["Movie", "🎬 Movie"],
    ["Nature", "🌲 Nature"],
    ["Shopping", "🛍️ Shopping"],
    ["Fun", "🎳 Something fun"],
    ["Surprise", "🎲 Surprise"],
    ["Hubble Bubble (Shisha)", "💨 Hubble Bubble (Shisha)"],
  ],
  bring: [
    ["Something sweet", "🍫 Something sweet"],
    ["Coffee", "☕ Coffee"],
    ["Something tasty", "🍉 Something tasty"],
    ["Something cute", "🌷 Something cute"],
    ["Surprise me", "🎁 Surprise me"],
    ["Custom", "😈 I have a request"],
    ["Just yourself", "✨ Just bring yourself"],
    ["Nothing", "Nothing"],
  ],
  mood: [
    ["Barely functioning", "😴 Barely functioning"],
    ["Chill", "🌿 Something chill"],
    ["Cozy", "🥰 Cozy"],
    ["Chaos", "😈 Chaos"],
    ["Adventure", "🚀 Take me somewhere"],
  ],
};
const extraActivities = [
  "Walk",
  "Ice Cream",
  "Coffee",
  "Dessert",
  "Movie",
  "Bowling",
  "Billiards",
  "Park",
  "Night Walk",
  "Shopping",
  "Games",
  "Nature",
  "Small Trip",
  "Hubble Bubble (Shisha)",
  "Surprise Me",
];
export function Wizard() {
  const { guestToken = "" } = useParams();
  const nav = useNavigate();
  const { data, error } = useInvitation("guest", guestToken);
  const { draft, set } = useDraft();
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const host = data ? displayName(data, "host") : "them";
  const choose = (key: string, value: any) => set({ [key]: value });
  const addActivity = (title: string) => {
    if (draft.activities.some((activity) => activity.title === title)) return;
    set({
      activities: [
        ...draft.activities,
        {
          activity_type: title.toLowerCase().replaceAll(" ", "_"),
          title,
        },
      ],
    });
  };
  const remove = (i: number) =>
    set({ activities: draft.activities.filter((_, x) => x !== i) });
  const moveActivity = (from: number, to: number) => {
    if (to < 0 || to >= draft.activities.length) return;
    const activities = [...draft.activities];
    const [activity] = activities.splice(from, 1);
    activities.splice(to, 0, activity);
    set({ activities });
  };
  if (error)
    return (
      <Shell privatePage wallpaper="planning">
        <div className="card error">{error}</div>
      </Shell>
    );
  if (!data)
    return (
      <Shell privatePage wallpaper="planning">
        <Loading />
      </Shell>
    );
  const next = () =>
    index === steps.length - 1
      ? nav(`/invite/${guestToken}/review`)
      : setIndex(index + 1);
  return (
    <Shell privatePage wallpaper="planning">
      <section className="card">
        <p className="eyebrow">
          Building trouble · {index + 1}/{steps.length}
        </p>
        <div className="progress">
          <span style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
          >
            <StepView
              step={step}
              host={host}
              draft={draft}
              choose={choose}
              addActivity={addActivity}
              remove={remove}
              moveActivity={moveActivity}
            />
          </motion.div>
        </AnimatePresence>
        <div className="row" style={{ marginTop: 28 }}>
          <button
            className="btn secondary"
            disabled={!index}
            onClick={() => setIndex(index - 1)}
          >
            <ArrowLeft size={18} /> Back
          </button>
          <button className="btn primary" onClick={next}>
            {index === steps.length - 1 ? "REVIEW THE DAMAGE" : "Continue"}{" "}
            <ArrowRight size={18} />
          </button>
        </div>
      </section>
    </Shell>
  );
}
function Choice({
  value,
  label,
  selected,
  onClick,
}: {
  value: string;
  label: string;
  selected?: boolean;
  onClick: () => void;
}) {
  void value;
  return (
    <button
      className={`choice ${selected ? "selected" : ""}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
function StepView({
  step,
  host,
  draft,
  choose,
  addActivity,
  remove,
  moveActivity,
}: {
  step: Step;
  host: string;
  draft: any;
  choose: (k: string, v: any) => void;
  addActivity: (v: string) => void;
  remove: (i: number) => void;
  moveActivity: (from: number, to: number) => void;
}) {
  const [showMoreFood, setShowMoreFood] = useState(false);
  const selectedFoods: string[] =
    draft.food_choices || (draft.food_choice ? [draft.food_choice] : []);
  const pickFood = (value: string) => {
    const food_choices = selectedFoods.includes(value)
      ? selectedFoods.filter((choice) => choice !== value)
      : [...selectedFoods, value];
    choose("food_choices", food_choices);
    choose("food_choice", undefined);
    if (!food_choices.includes("Other"))
      choose("custom_food_request", undefined);
  };
  const pickTime = (value: string) => {
    choose("meeting_time", value);
    choose("meal_type", mealForTime(value));
  };
  if (step === "date") {
    const dates = [
      [format(new Date(), "yyyy-MM-dd"), "Today"],
      [format(addDays(new Date(), 1), "yyyy-MM-dd"), "Tomorrow"],
      [format(nextSaturday(new Date()), "yyyy-MM-dd"), "This Weekend"],
    ];
    return (
      <>
        <h1 className="title">
          When can {host} borrow your excellent company? 👀
        </h1>
        <div className="choices">
          {dates.map(([v, l]) => (
            <Choice
              key={l}
              value={v}
              label={l}
              selected={draft.meeting_date === v}
              onClick={() => choose("meeting_date", v)}
            />
          ))}
        </div>
        <div className="field">
          <label>Or pick a date</label>
          <input
            type="date"
            value={draft.meeting_date || ""}
            onChange={(e) => choose("meeting_date", e.target.value)}
          />
        </div>
      </>
    );
  }
  if (step === "time")
    return (
      <>
        <h1 className="title">When should {host} clear the schedule? 😏</h1>
        <div className="choices">
          {[
            ["09:00", "Morning"],
            ["15:00", "Afternoon"],
            ["19:00", "Evening"],
          ].map(([v, l]) => (
            <Choice
              key={l}
              value={v}
              label={l}
              selected={draft.meeting_time === v}
              onClick={() => pickTime(v)}
            />
          ))}
        </div>
        <div className="field">
          <label>Exact time</label>
          <input
            type="time"
            value={draft.meeting_time || ""}
            onChange={(e) => pickTime(e.target.value)}
          />
        </div>
      </>
    );
  if (step === "duration")
    return (
      <>
        <h1 className="title">
          How much time does {host} get? Be generous-ish. 😌
        </h1>
        <div className="field">
          <label>Choose duration</label>
          <select
            value={draft.duration_minutes || ""}
            onChange={(event) =>
              choose(
                "duration_minutes",
                event.target.value ? Number(event.target.value) : undefined,
              )
            }
          >
            <option value="" disabled>
              Select how long…
            </option>
            {[1, 2, 3, 4, 5, 6].map((hours) => (
              <option key={hours} value={hours * 60}>
                {hours} {hours === 1 ? "hour" : "hours"}
              </option>
            ))}
            <option value={1440}>Whole day</option>
          </select>
        </div>
      </>
    );
  if (step === "activity")
    return (
      <>
        <h1 className="title">What's this “appointment” about? 👀</h1>
        <div className="choices">
          {options.activity.map(([v, l]) => (
            <Choice
              key={v}
              value={v}
              label={l}
              selected={draft.activities.some((a: Activity) => a.title === v)}
              onClick={() => addActivity(v)}
            />
          ))}
        </div>
        <div className="history">
          {draft.activities.map((a: Activity, i: number) => (
            <div className="row" key={i}>
              <span>
                {i + 1}. {a.title}
              </span>
              <button
                className="btn ghost"
                aria-label={`Remove ${a.title}`}
                onClick={() => remove(i)}
              >
                <X size={17} />
              </button>
            </div>
          ))}
        </div>
      </>
    );
  if (step === "food") {
    const food = draft.activities.some((a: Activity) => a.title === "Food");
    if (!food)
      return (
        <>
          <h1 className="title">Food can wait.</h1>
          <p className="subtitle">A bold choice. We respect it.</p>
        </>
      );
    return (
      <>
        <h1 className="title">Important business: what are we eating? 🍜</h1>
        {draft.meeting_time && (
          <p className="subtitle">
            Based on {draft.meeting_time}, <strong>{draft.meal_type}</strong> is
            ready for approval. The clock has spoken. 👀
          </p>
        )}
        <div className="choices">
          {["Breakfast", "Lunch", "Dinner", "Snack", "Dessert"].map((v) => (
            <Choice
              key={v}
              value={v}
              label={v}
              selected={draft.meal_type === v}
              onClick={() => choose("meal_type", v)}
            />
          ))}
        </div>
        {draft.meal_type && (
          <>
            <p>
              <strong>
                Pick a menu favorite. No committee meeting required.
              </strong>
            </p>
            <div className="choices">
              {[
                ["Korean Chicken", "🍗 Korean Chicken"],
                ["Half Döner", "🌯 Half Döner"],
                ["Burger", "🍔 Burger"],
                ["Chicken Fry", "🍗 Chicken Fry"],
                ["Pizza", "🍕 Pizza"],
                ["Surprise me", "🎲 Surprise me"],
              ].map(([value, label]) => (
                <Choice
                  key={value}
                  value={value}
                  label={label}
                  selected={selectedFoods.includes(value)}
                  onClick={() => pickFood(value)}
                />
              ))}
            </div>
            <button
              className="btn secondary more-food"
              onClick={() => setShowMoreFood((visible) => !visible)}
            >
              {showMoreFood ? "FEWER OPTIONS ↑" : "MORE OPTIONS 🍽️"}
            </button>
            {showMoreFood && (
              <motion.div
                className="choices"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {[
                  ["Persian", "🇮🇷 Persian"],
                  ["German", "🇩🇪 German"],
                  ["European", "🇪🇺 European"],
                  ["Indian", "🇮🇳 Indian"],
                  ["Bangladeshi", "🇧🇩 Bangladeshi"],
                  ["Other", "✍️ Other…"],
                ].map(([value, label]) => (
                  <Choice
                    key={value}
                    value={value}
                    label={label}
                    selected={selectedFoods.includes(value)}
                    onClick={() => pickFood(value)}
                  />
                ))}
              </motion.div>
            )}
            {selectedFoods.includes("Other") && (
              <motion.div
                className="field"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
              >
                <label>Write your food idea</label>
                <input
                  value={draft.custom_food_request || ""}
                  onChange={(event) =>
                    choose("custom_food_request", event.target.value)
                  }
                  placeholder="Anything the menu forgot…"
                />
              </motion.div>
            )}
            <div className="premium-service">
              <strong>✨ {host} can cook for you too.</strong>
              <span>
                A premium add-on for any food choice—including your own Other
                idea. Pick the food, then let {host} face the kitchen. 👨‍🍳
              </span>
            </div>
            <p className="muted">Select as many food options as you like.</p>
            <p>
              <strong>Want an add-on?</strong>
            </p>
            <div className="choices">
              {[
                ["cook", `👨‍🍳 ${host} cooks this for you`],
                ["restaurant", "🍽️ Add a restaurant or pickup place"],
              ].map(([v, l]) => (
                <Choice
                  key={v}
                  value={v}
                  label={l}
                  selected={
                    (draft.cooking_by_host && v === "cook") ||
                    (Boolean(draft.restaurant) && v === "restaurant")
                  }
                  onClick={() => {
                    if (v === "cook")
                      choose("cooking_by_host", !draft.cooking_by_host);
                    if (v === "restaurant") {
                      choose(
                        "restaurant",
                        draft.restaurant ? undefined : { name: "" },
                      );
                    }
                  }}
                />
              ))}
            </div>
            {draft.cooking_by_host && (
              <motion.div
                className="field"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
              >
                <label>What do you want {host} to cook for you?</label>
                <input
                  value={draft.host_cooking_request || ""}
                  onChange={(event) =>
                    choose("host_cooking_request", event.target.value)
                  }
                  placeholder={`Tell ${host} what to attempt…`}
                />
              </motion.div>
            )}
            {draft.restaurant && (
              <div className="stack">
                <div className="field">
                  <label>Restaurant</label>
                  <input
                    value={draft.restaurant.name}
                    onChange={(e) =>
                      choose("restaurant", {
                        ...draft.restaurant,
                        name: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="field">
                  <label>Address</label>
                  <input
                    value={draft.restaurant.address || ""}
                    onChange={(e) =>
                      choose("restaurant", {
                        ...draft.restaurant,
                        address: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="field">
                  <label>Menu URL</label>
                  <input
                    type="url"
                    value={draft.restaurant.menu_url || ""}
                    onChange={(e) =>
                      choose("restaurant", {
                        ...draft.restaurant,
                        menu_url: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            )}
          </>
        )}
      </>
    );
  }
  if (step === "bring")
    return (
      <>
        <h1 className="title">Should {host} bring something too?</h1>
        <p className="subtitle">
          Their excellent timing is already included. 😏
        </p>
        <div className="choices">
          {options.bring.map(([v, l]) => (
            <Choice
              key={v}
              value={v}
              label={l}
              selected={draft.bring_request === v}
              onClick={() => choose("bring_request", v)}
            />
          ))}
        </div>
        {draft.bring_request === "Custom" && (
          <div className="field">
            <label>Your wish 👑</label>
            <input
              value={draft.custom_bring_request || ""}
              onChange={(e) => choose("custom_bring_request", e.target.value)}
            />
            <small>{host} will review the terms and conditions. 🗿</small>
          </div>
        )}
      </>
    );
  if (step === "mood") {
    const key = step;
    return (
      <>
        <h1 className="title">
          How much human interaction on the meeting day? 😂
        </h1>
        <div className="choices">
          {options[step].map(([v, l]) => (
            <Choice
              key={v}
              value={v}
              label={l}
              selected={draft[key] === v}
              onClick={() => choose(key, v)}
            />
          ))}
        </div>
        <button className="btn ghost" onClick={() => choose(key, undefined)}>
          Skip this
        </button>
      </>
    );
  }
  if (step === "location")
    return (
      <>
        <h1 className="title">Where should {host} report for duty? 🫡</h1>
        <div className="field">
          <label>Place name</label>
          <input
            value={draft.meetup_name || ""}
            onChange={(e) => choose("meetup_name", e.target.value)}
            placeholder="Erlangen Hbf"
          />
        </div>
        <div className="field">
          <label>Address</label>
          <input
            value={draft.meetup_address || ""}
            onChange={(e) => choose("meetup_address", e.target.value)}
          />
        </div>
        <p className="muted">Tap the free OpenStreetMap to place a marker.</p>
        <MeetMap
          lat={draft.meetup_latitude}
          lng={draft.meetup_longitude}
          onPick={([lat, lng]) => setLocation(choose, lat, lng)}
        />
      </>
    );
  return (
    <>
      <h1 className="title">Dinner is over. Keep hanging out? 😏</h1>
      <div className="choices">
        {extraActivities.map((v) => (
          <Choice
            key={v}
            value={v}
            label={
              draft.activities.some(
                (activity: Activity) => activity.title === v,
              )
                ? `✓ ${v}`
                : `＋ ${v}`
            }
            selected={draft.activities.some(
              (activity: Activity) => activity.title === v,
            )}
            onClick={() => addActivity(v)}
          />
        ))}
      </div>
      <div className="history" aria-live="polite">
        <p>
          <strong>Your ordered plan</strong>
        </p>
        {draft.activities.length === 0 ? (
          <p className="muted">Choose at least one adventure above.</p>
        ) : (
          draft.activities.map((activity: Activity, index: number) => (
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
                  disabled={index === draft.activities.length - 1}
                  onClick={() => moveActivity(index, index + 1)}
                >
                  <ArrowDown size={17} />
                </button>
                <button
                  className="icon-btn"
                  aria-label={`Remove ${activity.title}`}
                  onClick={() => remove(index)}
                >
                  <X size={17} />
                </button>
              </span>
            </div>
          ))
        )}
      </div>
      <div className="field">
        <label>Final notes</label>
        <textarea
          value={draft.notes || ""}
          onChange={(e) => choose("notes", e.target.value)}
          placeholder="Allergies, secret instructions, plausible deniability…"
        />
      </div>
      <div className="revive-plan">
        <Choice
          value="revive"
          label="🪄 Revive a cancelled plan?"
          selected={draft.revive_cancelled_plan}
          onClick={() =>
            choose("revive_cancelled_plan", !draft.revive_cancelled_plan)
          }
        />
        {draft.revive_cancelled_plan && (
          <motion.div
            className="field"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
          >
            <label>Which cancelled plan deserves another chance?</label>
            <textarea
              value={draft.revive_plan_details || ""}
              onChange={(event) =>
                choose("revive_plan_details", event.target.value)
              }
              placeholder="Name the plan. We will pretend cancelling it was part of the strategy."
            />
          </motion.div>
        )}
      </div>
    </>
  );
}
function mealForTime(value?: string) {
  if (!value) return undefined;
  const hour = Number(value.split(":")[0]);
  if (!Number.isFinite(hour)) return undefined;
  if (hour < 11) return "Breakfast";
  if (hour < 15) return "Lunch";
  if (hour < 18) return "Snack";
  return "Dinner";
}
function setLocation(
  choose: (k: string, v: any) => void,
  lat: number,
  lng: number,
) {
  choose("meetup_latitude", lat);
  choose("meetup_longitude", lng);
}
