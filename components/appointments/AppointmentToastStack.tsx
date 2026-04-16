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
		border: "border-l-blue-500",
		bg: "bg-card ring-1 ring-black/5",
		text: "text-foreground",
		iconBg: "bg-blue-500",
		Icon: Info,
	},
	success: {
		border: "border-l-emerald-500",
		bg: "bg-card ring-1 ring-black/5",
		text: "text-emerald-900",
		iconBg: "bg-emerald-500",
		Icon: CheckCircle2,
	},
	error: {
		border: "border-l-red-500",
		bg: "bg-card ring-1 ring-black/5",
		text: "text-red-900",
		iconBg: "bg-red-500",
		Icon: XCircle,
	},
};

export function AppointmentToastStack({ toasts, onDismiss }: Props) {
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	if (!mounted) return null;

	return createPortal(
		<div className="pointer-events-none fixed top-4 right-4 z-[10100] flex flex-col gap-2">
			{toasts.map((t) => {
				const v = VARIANT_STYLES[t.variant ?? "default"];
				const Icon = v.Icon;
				return (
					<button
						key={t.id}
						type="button"
						onClick={() => onDismiss(t.id)}
						className={cn(
							"pointer-events-auto flex min-w-[280px] max-w-[360px] items-start gap-3 rounded-lg border-l-4 px-4 py-3 text-left shadow-2xl transition-all",
							"animate-in slide-in-from-right-4 fade-in",
							v.border,
							v.bg,
						)}
					>
						<span
							className={cn(
								"mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-white",
								v.iconBg,
							)}
						>
							<Icon className="size-4" />
						</span>
						<div className="min-w-0 flex-1">
							<div className={cn("text-sm font-semibold", v.text)}>
								{t.message}
							</div>
						</div>
						<X
							className={cn("mt-0.5 size-3.5 shrink-0 opacity-60", v.text)}
						/>
					</button>
				);
			})}
		</div>,
		document.body,
	);
}
