"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
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
	const scrollRef = useRef<HTMLDivElement>(null);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(false);

	function checkScroll() {
		const el = scrollRef.current;
		if (!el) return;
		setCanScrollLeft(el.scrollLeft > 4);
		setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: tabs length change should recheck
	useEffect(() => {
		checkScroll();
		const el = scrollRef.current;
		if (!el) return;
		const ro = new ResizeObserver(checkScroll);
		ro.observe(el);
		return () => ro.disconnect();
	}, [tabs.length]);

	function scrollBy(amount: number) {
		scrollRef.current?.scrollBy({ left: amount, behavior: "smooth" });
	}

	const btnClass =
		"flex shrink-0 items-center justify-center rounded-full border bg-card shadow-sm transition hover:bg-muted disabled:pointer-events-none disabled:opacity-30";
	const btnSize = size === "sm" ? "size-7" : "size-8";
	const iconSize = size === "sm" ? "size-3.5" : "size-4";

	const itemBase =
		size === "sm"
			? "rounded-full px-4 py-1.5 text-xs font-medium transition"
			: "rounded-full px-5 py-2 text-sm font-medium transition";

	return (
		<div className={cn("flex items-center gap-1.5", className)}>
			<button
				type="button"
				aria-label="Scroll tabs left"
				disabled={!canScrollLeft}
				onClick={() => scrollBy(-160)}
				className={cn(btnClass, btnSize)}
			>
				<ChevronLeft className={iconSize} />
			</button>

			<div
				ref={scrollRef}
				className="overflow-x-auto scrollbar-none flex-1"
				onScroll={checkScroll}
				onWheel={(e) => {
					if (e.deltaY === 0) return;
					e.preventDefault();
					scrollRef.current?.scrollBy({ left: e.deltaY });
				}}
			>
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

			<button
				type="button"
				aria-label="Scroll tabs right"
				disabled={!canScrollRight}
				onClick={() => scrollBy(160)}
				className={cn(btnClass, btnSize)}
			>
				<ChevronRight className={iconSize} />
			</button>
		</div>
	);
}
