export const copy = {
  noMessages: [
    "Aww, pretending not to be curious? 👀",
    "That was cute. Try catching it again. 😂",
    "Almost! The drama is getting good.",
    "The NO button thinks you secretly want the plan. 👀",
    "Playing hard to schedule, are we? 😌",
    "Nice try, tiny calendar tease. 😂",
    "It moved. Clearly it loves the attention.",
    "The button needs space to process your mixed signals. 👀",
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
