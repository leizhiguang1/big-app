"use client";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";
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

const VARIANT_STYLES = {
	default: {
		text: "text-foreground",
		icon: "text-blue-500",
		Icon: Info,
	},
	success: {
		text: "text-foreground",
		icon: "text-emerald-500",
		Icon: CheckCircle2,
	},
	error: {
		text: "text-foreground",
		icon: "text-red-500",
		Icon: XCircle,
	},
};

export function AppointmentToastStack({ toasts, onDismiss }: Props) {
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	if (!mounted) return null;

	return createPortal(
		<div className="pointer-events-none fixed right-4 bottom-4 z-[10100] flex flex-col gap-1.5">
			{toasts.map((t) => {
				const v = VARIANT_STYLES[t.variant ?? "default"];
				const Icon = v.Icon;
				return (
					<button
						key={t.id}
						type="button"
						onClick={() => onDismiss(t.id)}
						className={cn(
							"pointer-events-auto flex max-w-[320px] items-center gap-2 rounded-md border bg-card/95 px-2.5 py-1.5 text-left shadow-sm backdrop-blur transition-all",
							"animate-in slide-in-from-bottom-2 fade-in",
						)}
					>
						<Icon className={cn("size-3.5 shrink-0", v.icon)} />
						<span className={cn("min-w-0 flex-1 text-xs", v.text)}>
							{t.message}
						</span>
						<X className="size-3 shrink-0 text-muted-foreground opacity-60" />
					</button>
				);
			})}
		</div>,
		document.body,
	);
}
