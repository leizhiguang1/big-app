"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Listener = () => void;
const listeners = new Set<Listener>();

export function startNavProgress() {
	for (const fn of listeners) fn();
}

export function NavProgress() {
	const pathname = usePathname();
	const [phase, setPhase] = useState<"idle" | "running" | "finishing">("idle");

	useEffect(() => {
		const onStart = () => {
			setPhase((prev) => (prev === "running" ? prev : "running"));
		};
		listeners.add(onStart);
		return () => {
			listeners.delete(onStart);
		};
	}, []);

	useEffect(() => {
		setPhase((prev) => {
			if (prev === "running") return "finishing";
			return prev;
		});
	}, [pathname]);

	useEffect(() => {
		if (phase !== "finishing") return;
		const id = window.setTimeout(() => setPhase("idle"), 220);
		return () => window.clearTimeout(id);
	}, [phase]);

	if (phase === "idle") return null;

	return (
		<div
			aria-hidden
			className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden"
		>
			<div
				className="h-full bg-primary shadow-[0_0_8px_var(--color-primary)]"
				style={
					phase === "running"
						? { animation: "nav-progress-grow 2.4s ease-out forwards" }
						: { animation: "nav-progress-finish 200ms ease-out forwards" }
				}
			/>
		</div>
	);
}
