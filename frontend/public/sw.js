self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      title: "LET'S MEET 💌",
      body: event.data?.text() || "Your plan has an update.",
    };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "LET'S MEET 💌", {
      body: data.body || "Your private plan has an update.",
      icon: "/icon.svg",
      badge: "/icon.svg",
      tag: data.tag || "lets-meet-update",
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin)
    .href;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((client) => client.url === url);
        return existing ? existing.focus() : self.clients.openWindow(url);
      }),
  );
});
