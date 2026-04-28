"use client";

import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/components/chats/usePushNotifications";

export function NotificationsPanel() {
	const push = usePushNotifications();

	if (!push.isSupported) {
		return (
			<section className="rounded-lg border bg-card px-5 py-4">
				<h3 className="font-semibold text-sm">Notifications</h3>
				<p className="mt-1 text-muted-foreground text-xs">
					Push notifications are not supported in this browser.
				</p>
			</section>
		);
	}

	const granted = push.permission === "granted" && !!push.subscription;
	const denied = push.permission === "denied";

	return (
		<section className="flex items-center justify-between gap-3 rounded-lg border bg-card px-5 py-4">
			<div className="flex items-start gap-3">
				{granted ? (
					<Bell className="mt-0.5 size-4 text-success" />
				) : (
					<BellOff className="mt-0.5 size-4 text-muted-foreground" />
				)}
				<div>
					<h3 className="font-semibold text-sm">Push notifications</h3>
					<p className="text-muted-foreground text-xs">
						{granted
							? "On — incoming WhatsApp messages will notify this device."
							: denied
								? "Blocked — enable in browser settings, then reload."
								: "Off — turn on to get notified about new messages on this device."}
					</p>
					{push.error && (
						<p className="mt-1 text-destructive text-xs">{push.error}</p>
					)}
				</div>
			</div>
			{denied ? (
				<Button variant="outline" disabled>
					Blocked
				</Button>
			) : granted ? (
				<Button variant="outline" onClick={push.unsubscribe}>
					Turn off
				</Button>
			) : (
				<Button onClick={push.subscribe} disabled={push.registering}>
					{push.registering ? "Enabling…" : "Enable"}
				</Button>
			)}
		</section>
	);
}
