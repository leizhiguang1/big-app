"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/wa-client";

const VAPID_PUBLIC_KEY =
	process.env.NEXT_PUBLIC_WA_VAPID_PUBLIC_KEY ??
	"BBKs0hvVH7aeTIxIRDFmsX16qgDREMuvlTCWyAmtvwxNZe7Iu53qS9THi2ZE0lEusyI19hSUNapnswYl6byDmtM";

function urlB64ToBuffer(base64: string): ArrayBuffer {
	const padding = "=".repeat((4 - (base64.length % 4)) % 4);
	const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
	const raw = atob(b64);
	const arr = new Uint8Array(new ArrayBuffer(raw.length));
	for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
	return arr.buffer;
}

function isSupported(): boolean {
	if (typeof window === "undefined") return false;
	return (
		"serviceWorker" in navigator &&
		"PushManager" in window &&
		"Notification" in window
	);
}

type Permission = NotificationPermission | "unsupported";

export function usePushNotifications() {
	const [permission, setPermission] = useState<Permission>(() =>
		isSupported() ? Notification.permission : "unsupported",
	);
	const [subscription, setSubscription] = useState<PushSubscription | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [registering, setRegistering] = useState(false);
	const subRef = useRef<PushSubscription | null>(null);

	useEffect(() => {
		if (!isSupported()) return;

		navigator.serviceWorker
			.register("/sw.js")
			.then((reg) => reg.pushManager.getSubscription())
			.then((sub) => {
				if (sub) {
					subRef.current = sub;
					setSubscription(sub);
					getSocket().emit("register_push_subscription", sub.toJSON());
				}
			})
			.catch((err: Error) => {
				console.warn("[Push] SW registration error:", err);
				setError(err.message);
			});

		const sock = getSocket();
		const onSocketConnect = () => {
			if (subRef.current) {
				sock.emit("register_push_subscription", subRef.current.toJSON());
			}
		};
		sock.on("connect", onSocketConnect);

		const hadController = !!navigator.serviceWorker.controller;
		const onMessage = (event: MessageEvent) => {
			if (event.data?.type === "SW_UPDATED" && hadController) {
				window.location.reload();
			}
		};
		navigator.serviceWorker.addEventListener("message", onMessage);

		return () => {
			navigator.serviceWorker.removeEventListener("message", onMessage);
			sock.off("connect", onSocketConnect);
		};
	}, []);

	const subscribe = useCallback(async (): Promise<boolean> => {
		if (!isSupported()) {
			setError("Push notifications are not supported in this browser");
			return false;
		}
		setRegistering(true);
		setError(null);
		try {
			const perm = await Notification.requestPermission();
			setPermission(perm);
			if (perm !== "granted") {
				setError("Notification permission denied");
				setRegistering(false);
				return false;
			}
			const reg = await navigator.serviceWorker.ready;
			const sub = await reg.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlB64ToBuffer(VAPID_PUBLIC_KEY),
			});
			subRef.current = sub;
			setSubscription(sub);
			getSocket().emit("register_push_subscription", sub.toJSON());
			setRegistering(false);
			return true;
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			setError(msg);
			setRegistering(false);
			return false;
		}
	}, []);

	const unsubscribe = useCallback(async () => {
		if (!subscription) return;
		try {
			getSocket().emit("unregister_push_subscription", subscription.endpoint);
			await subscription.unsubscribe();
			subRef.current = null;
			setSubscription(null);
			setPermission("default");
		} catch (err) {
			console.warn("[Push] Unsubscribe error:", err);
		}
	}, [subscription]);

	return {
		permission,
		subscription,
		error,
		registering,
		subscribe,
		unsubscribe,
		isSupported: isSupported(),
	};
}
