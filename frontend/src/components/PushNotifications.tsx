import { useEffect, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { api } from "../api/client";

function applicationServerKey(value: string): Uint8Array {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replaceAll("-", "+").replaceAll("_", "/");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

export function PushNotifications({
  role,
  token,
}: {
  role: "guest" | "host";
  token: string;
}) {
  const [state, setState] = useState<
    "checking" | "available" | "enabled" | "unsupported" | "unconfigured"
  >("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    api
      .pushConfig()
      .then(async (config) => {
        if (!config.enabled) {
          setState("unconfigured");
          return;
        }
        const registration = await navigator.serviceWorker.register("/sw.js");
        const subscription = await registration.pushManager.getSubscription();
        setState(subscription ? "enabled" : "available");
      })
      .catch(() => setState("unconfigured"));
  }, []);

  async function enable() {
    try {
      const config = await api.pushConfig();
      if (!config.enabled) {
        setState("unconfigured");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage(
          "Notifications were not allowed. You can change this in browser settings.",
        );
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey(config.public_key),
        }));
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
        throw new Error(
          "The browser returned an incomplete push subscription.",
        );
      }
      await api.subscribePush(role, token, {
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      });
      setState("enabled");
      setMessage(
        "Phone notifications are on. We'll only send important plan updates. 💫",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Notifications could not be enabled on this device.",
      );
    }
  }

  if (state === "checking") return null;
  if (state === "enabled")
    return (
      <div className="push-card" role="status">
        <BellRing size={20} />
        <span>{message || "Phone notifications enabled"}</span>
      </div>
    );
  if (state === "unsupported")
    return (
      <div className="push-card muted">
        Phone notifications are unavailable in this browser. On iPhone, add the
        app to your Home Screen first.
      </div>
    );
  if (state === "unconfigured")
    return (
      <div className="push-card muted">
        Phone notifications are not configured on this server yet.
      </div>
    );
  return (
    <div className="stack push-card">
      <div>
        <strong>Get plan updates on this phone</strong>
        <p className="muted">
          Plan updates and confirmations only—no notification chaos.
        </p>
      </div>
      <button className="btn secondary" onClick={enable}>
        <Bell size={18} /> ENABLE PHONE NOTIFICATIONS
      </button>
      {message && <small aria-live="polite">{message}</small>}
    </div>
  );
}
