export const copy = {
  noMessages: [
    "Hmm… wrong button? 👀",
    "You're persistent 😂",
    "Almost caught it.",
    "That NO button is fighting for its life.",
    "Professional plan canceller detected.",
    "Nice try 😏",
    "It moved. Very mature of it. 😂",
    "The button requests another location.",
  ],
  negotiation: [
    "{name} has notes. 👀",
    "Apparently negotiations are necessary.",
    "Someone has opinions. 🗿",
  ],
  errors: {
    invalid: "This link doesn't seem to belong to any active appointment.",
    expired: "Looks like this invitation got lost in time. 🥲",
    server:
      "Something broke. Probably the calendar being dramatic. Try again. 🗿",
  },
};
export const fill = (value: string, data: Record<string, string>) =>
  Object.entries(data).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, v), value);
