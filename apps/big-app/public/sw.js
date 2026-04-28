// BIG App Service Worker — Web Push + auto-reload on update
const CACHE_VERSION = "big-app-v1";

self.addEventListener("install", (e) => {
	e.waitUntil(
		caches.open(CACHE_VERSION).then((cache) => cache.addAll(["/"]).catch(() => {})),
	);
	self.skipWaiting();
});

self.addEventListener("activate", (e) => {
	e.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)),
				),
			)
			.then(() => self.clients.claim())
			.then(async () => {
				const allClients = await self.clients.matchAll({
					type: "window",
					includeUncontrolled: true,
				});
				allClients.forEach((client) => client.postMessage({ type: "SW_UPDATED" }));
			}),
	);
});

self.addEventListener("push", (event) => {
	let data = {};
	try {
		data = event.data?.json() ?? {};
	} catch {
		data = { title: "BIG", body: event.data?.text() ?? "" };
	}

	const title = data.title ?? "BIG";
	const options = {
		body: data.body ?? "",
		icon: "/icon-192.png",
		badge: "/icon-192.png",
		tag: data.tag ?? "big-app",
		renotify: true,
		data: { url: data.url ?? "/chats" },
		vibrate: [200, 100, 200],
	};

	event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	const targetUrl = event.notification.data?.url ?? "/chats";

	event.waitUntil(
		self.clients
			.matchAll({ type: "window", includeUncontrolled: true })
			.then((clientList) => {
				for (const client of clientList) {
					if ("focus" in client) {
						client.focus();
						if ("navigate" in client) client.navigate(targetUrl);
						return;
					}
				}
				if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
			}),
	);
});
