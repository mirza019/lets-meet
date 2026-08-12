import { useState } from "react";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { api, apiErrorMessage } from "../api/client";
import { Shell } from "../layouts/Shell";
export function Home() {
  const [form, setForm] = useState({
    host_name: "",
    host_email: "",
    guest_name: "",
    guest_email: "",
    host_nickname: "",
    guest_nickname: "",
    personal_note: "",
  });
  const [result, setResult] = useState<{
    host_url: string;
    guest_url: string;
    email_delivery: "sent" | "queued" | "console" | "failed";
  }>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const change = (key: string, value: string) =>
    setForm({ ...form, [key]: value });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      setResult(
        await api.create({
          ...form,
          host_email: form.host_email || null,
          client_request_id: crypto.randomUUID(),
        }),
      );
    } catch (err: unknown) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Shell>
      <motion.section
        className="card"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {result ? (
          <>
            <div className="confetti">📨✨</div>
            <p className="eyebrow">
              {result.email_delivery === "sent" || result.email_delivery === "queued"
                ? "Message dispatched"
                : "Local preview created"}
            </p>
            <h1 className="title">
              {result.email_delivery === "sent" || result.email_delivery === "queued"
                ? "Invitation sent"
                : "Invitation ready"}
            </h1>
            {result.email_delivery !== "sent" && result.email_delivery !== "queued" ? (
              <div className="note" role="status">
                {result.email_delivery === "failed"
                  ? "The invitation is safely created, but email delivery had a temporary problem. Copy and send the guest link below—the plan still works perfectly."
                  : "Development email mode is active, so no real email was sent. Copy the guest link below."}
              </div>
            ) : (
              <p className="subtitle">
                The challenge is officially in their inbox. Now
                {` ${form.guest_nickname || form.guest_name}`} gets to prove they
                deserve a spot on your calendar. 👀
              </p>
            )}
            <div className="field">
              <label>Your private review link</label>
              <input
                readOnly
                value={result.host_url}
                onFocus={(e) => e.currentTarget.select()}
              />
            </div>
            <button
              className="btn secondary"
              onClick={() => navigator.clipboard.writeText(result.host_url)}
            >
              Copy host link
            </button>
            <div className="field">
              <label>Guest invitation link</label>
              <input
                readOnly
                value={result.guest_url}
                onFocus={(event) => event.currentTarget.select()}
              />
            </div>
            <button
              className="btn secondary"
              onClick={() => navigator.clipboard.writeText(result.guest_url)}
            >
              Copy guest link
            </button>
          </>
        ) : (
          <>
            <p className="eyebrow">Your calendar. Their audition. 👀</p>
            <h1 className="title">
              Oh, you wanna
              <br />
              meet me?{" "}
              <span style={{ color: "var(--coral)" }}>Bold move.</span>
            </h1>
            <p className="subtitle">
              Send them a private link and let them build their best plan to
              see you. You inspect the effort, judge the snacks, and decide if
              they have earned some calendar space. 😌
            </p>
            <aside className="how-it-works" aria-label="How Let's Meet works">
              <strong>Someone wants to meet you? Here’s their little challenge:</strong>
              <ol>
                <li>
                  Add your name and the name of the person asking for your time.
                </li>
                <li>They get a private link and create a plan tempting enough for you.</li>
                <li>You receive their pitch, review it, and give the final verdict. 👀</li>
              </ol>
            </aside>
            <form className="stack" onSubmit={submit}>
              <div className="row">
                <div className="field">
                  <label>Your name</label>
                  <input
                    required
                    value={form.host_name}
                    onChange={(e) => change("host_name", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>
                    Your email <span className="muted">(for updates)</span>
                  </label>
                  <input
                    type="email"
                    value={form.host_email}
                    onChange={(e) => change("host_email", e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <div className="row">
                <div className="field">
                  <label>Who wants to meet you?</label>
                  <input
                    required
                    value={form.guest_name}
                    onChange={(e) => change("guest_name", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Their email</label>
                  <input
                    required
                    type="email"
                    value={form.guest_email}
                    onChange={(e) => change("guest_email", e.target.value)}
                    placeholder="them@example.com"
                  />
                </div>
              </div>
              <div className="row">
                <div className="field">
                  <label>
                    Your nickname <span className="muted">(optional)</span>
                  </label>
                  <input
                    value={form.host_nickname}
                    onChange={(e) => change("host_nickname", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>
                    Their nickname <span className="muted">(optional)</span>
                  </label>
                  <input
                    value={form.guest_nickname}
                    onChange={(e) => change("guest_nickname", e.target.value)}
                  />
                </div>
              </div>
              <div className="field">
                <label>
                  Personal invitation note{" "}
                  <span className="muted">(optional)</span>
                </label>
                <textarea
                  value={form.personal_note}
                  onChange={(e) => change("personal_note", e.target.value)}
                  placeholder="You want my time? Show me your best plan. 👀"
                />
              </div>
              {error && <div className="error">{error}</div>}
              <button className="btn primary" disabled={busy}>
                {busy ? (
                  "Sending…"
                ) : (
                  <>
                    SEND THE CHALLENGE <Sparkles size={18} />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </motion.section>
    </Shell>
  );
}
