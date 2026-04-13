"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type Toast = {
	id: string;
	message: string;
	variant?: "default" | "success" | "error";
};

type Props = {
	toasts: Toast[];
	onDismiss: (id: string) => void;
};

export function AppointmentToastStack({ toasts, onDismiss }: Props) {
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	if (!mounted) return null;

	return createPortal(
		<div className="fixed right-6 bottom-6 z-[10100] flex flex-col gap-2">
			{toasts.map((t) => (
				<div
					key={t.id}
					className={cn(
						"flex min-w-[260px] items-center gap-3 rounded-md border bg-card px-3 py-2 text-sm shadow-xl",
						t.variant === "success" &&
							"border-emerald-300 bg-emerald-50 text-emerald-900",
						t.variant === "error" && "border-red-300 bg-red-50 text-red-900",
					)}
				>
					<span className="flex-1">{t.message}</span>
					<button
						type="button"
						onClick={() => onDismiss(t.id)}
						className="text-muted-foreground hover:text-foreground"
						aria-label="Dismiss"
					>
						<X className="size-3.5" />
					</button>
				</div>
			))}
		</div>,
		document.body,
	);
}
