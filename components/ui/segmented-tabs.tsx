"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";

export type SegmentedTab = {
	key: string;
	label: string;
	href?: string;
	disabled?: boolean;
};

type Props = {
	tabs: SegmentedTab[];
	active: string;
	onChange?: (key: string) => void;
	size?: "sm" | "md";
	className?: string;
	"aria-label"?: string;
};

export function SegmentedTabs({
	tabs,
	active,
	onChange,
	size = "md",
	className,
	"aria-label": ariaLabel,
}: Props) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [pendingKey, setPendingKey] = useState<string | null>(null);
	const displayed = isPending && pendingKey ? pendingKey : active;

	const itemBase =
		size === "sm"
			? "rounded-full px-4 py-1.5 text-xs font-medium transition"
			: "rounded-full px-5 py-2 text-sm font-medium transition";

	return (
		<div className={cn("overflow-x-auto", className)}>
			<div
				role="tablist"
				aria-label={ariaLabel}
				className="inline-flex min-w-max items-stretch gap-0 rounded-full border bg-card p-1 shadow-sm"
			>
				{tabs.map((tab) => {
					const isActive = tab.key === displayed;
					const classes = cn(
						itemBase,
						"whitespace-nowrap",
						isActive
							? "bg-primary text-primary-foreground shadow-sm"
							: "text-muted-foreground hover:text-foreground",
						tab.disabled && "pointer-events-none opacity-50",
					);

					if (tab.href) {
						const href = tab.href;
						return (
							<Link
								key={tab.key}
								href={href}
								prefetch
								role="tab"
								aria-selected={isActive}
								onClick={(e) => {
									if (tab.key === active) return;
									e.preventDefault();
									setPendingKey(tab.key);
									startTransition(() => {
										router.push(href);
									});
								}}
								className={classes}
							>
								{tab.label}
							</Link>
						);
					}

					return (
						<button
							key={tab.key}
							type="button"
							role="tab"
							aria-selected={isActive}
							disabled={tab.disabled}
							onClick={() => {
								if (tab.key === active) return;
								onChange?.(tab.key);
							}}
							className={classes}
						>
							{tab.label}
						</button>
					);
				})}
			</div>
		</div>
	);
}
