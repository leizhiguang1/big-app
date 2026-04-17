"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
	type MouseEvent,
	useCallback,
	useMemo,
	useState,
	useTransition,
} from "react";
import { cn } from "@/lib/utils";
import {
	CATEGORIES,
	CATEGORY_COLOR_CLASSES,
	type ConfigCategory,
} from "./categories-data";

export function ConfigRail() {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [pendingHref, setPendingHref] = useState<string | null>(null);

	const activeSlug = useMemo(() => {
		const match = pathname.match(/^\/config\/([^/?]+)/);
		return match?.[1] ?? null;
	}, [pathname]);

	const activeSectionKey = searchParams.get("section");

	const navigate = useCallback(
		(href: string) => {
			setPendingHref(href);
			startTransition(() => {
				router.push(href);
			});
		},
		[router],
	);

	return (
		<nav
			aria-label="Config navigation"
			className="hidden w-60 shrink-0 overflow-y-auto border-border border-r bg-card py-4 md:block"
		>
			<div className="mb-3 px-5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
				Settings
			</div>
			<ul className="flex flex-col gap-0.5 px-2">
				{CATEGORIES.map((category) => (
					<CategoryRailItem
						key={category.slug}
						category={category}
						isActive={activeSlug === category.slug}
						activeSectionKey={activeSectionKey}
						pathname={pathname}
						pendingHref={pendingHref}
						onNavigate={navigate}
					/>
				))}
			</ul>
			<div
				className={cn(
					"pointer-events-none fixed bottom-4 left-64 h-1 w-24 rounded-full bg-primary/60 opacity-0 transition-opacity",
					isPending && "opacity-100",
				)}
				aria-hidden
			/>
		</nav>
	);
}

function CategoryRailItem({
	category,
	isActive,
	activeSectionKey,
	pathname,
	pendingHref,
	onNavigate,
}: {
	category: ConfigCategory;
	isActive: boolean;
	activeSectionKey: string | null;
	pathname: string;
	pendingHref: string | null;
	onNavigate: (href: string) => void;
}) {
	const Icon = category.icon;
	const hasMultipleSections = category.sections.length > 1;
	const categoryHref = `/config/${category.slug}`;
	const isCategoryPending = pendingHref === categoryHref;
	const showActive = isActive || isCategoryPending;

	const handleClick = (href: string) => (e: MouseEvent<HTMLAnchorElement>) => {
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
		e.preventDefault();
		onNavigate(href);
	};

	return (
		<li>
			<Link
				href={categoryHref}
				prefetch
				onClick={handleClick(categoryHref)}
				className={cn(
					"group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
					showActive
						? "bg-accent font-medium text-accent-foreground"
						: "text-foreground/80 hover:bg-accent/60 hover:text-foreground",
				)}
			>
				<span
					className={cn(
						"flex size-6 shrink-0 items-center justify-center rounded-md",
						CATEGORY_COLOR_CLASSES[category.color],
					)}
				>
					<Icon className="size-3.5" strokeWidth={2} />
				</span>
				<span className="flex-1 truncate">{category.title}</span>
				{hasMultipleSections ? (
					showActive ? (
						<ChevronDown className="size-3.5 opacity-60" />
					) : (
						<ChevronRight className="size-3.5 opacity-60" />
					)
				) : null}
			</Link>

			{isActive && hasMultipleSections ? (
				<ul className="mt-1 mb-1 ml-[1.375rem] flex flex-col gap-0.5 border-border border-l pl-2">
					{category.sections.map((section, index) => {
						const href =
							section.href ??
							`/config/${category.slug}?section=${section.key}`;
						const isFirst = index === 0;
						const isSectionActive = section.href
							? pathname === section.href
							: activeSectionKey === section.key ||
								(activeSectionKey === null && isFirst);
						const isSectionPending = pendingHref === href;
						const show = isSectionActive || isSectionPending;

						return (
							<li key={section.key}>
								<Link
									href={href}
									prefetch
									onClick={handleClick(href)}
									className={cn(
										"block rounded-md px-2.5 py-1 text-sm transition-colors",
										show
											? "bg-primary/10 font-medium text-primary"
											: "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
									)}
								>
									{section.label}
								</Link>
							</li>
						);
					})}
				</ul>
			) : null}
		</li>
	);
}
