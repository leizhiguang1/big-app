"use client";

import { ChevronDown, ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { HoverCard as HoverCardPrimitive } from "radix-ui";
import {
	type MouseEvent,
	useCallback,
	useEffect,
	useMemo,
	useState,
	useTransition,
} from "react";
import { cn } from "@/lib/utils";
import { ConfigSearch } from "./ConfigSearch";
import {
	CATEGORIES,
	CATEGORY_COLOR_CLASSES,
	type ConfigCategory,
} from "./categories-data";

function useIsMac() {
	const [isMac, setIsMac] = useState(false);
	useEffect(() => {
		setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
	}, []);
	return isMac;
}

export function ConfigRail() {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [pendingHref, setPendingHref] = useState<string | null>(null);
	const [searchOpen, setSearchOpen] = useState(false);
	const isMac = useIsMac();

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				setSearchOpen((v) => !v);
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, []);

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
			<div className="mb-3 px-3">
				<button
					type="button"
					onClick={() => setSearchOpen(true)}
					className="flex w-full items-center gap-2 rounded-md border border-input bg-background px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
				>
					<Search className="size-3.5 shrink-0" />
					<span className="flex-1 truncate">Search settings…</span>
					<kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
						{isMac ? "⌘K" : "Ctrl K"}
					</kbd>
				</button>
			</div>
			<div className="mb-3 px-5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
				Settings
			</div>
			<ConfigSearch open={searchOpen} onOpenChange={setSearchOpen} />
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

	const showHoverPreview = hasMultipleSections && !isActive;

	const categoryLink = (
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
	);

	return (
		<li>
			{showHoverPreview ? (
				<HoverCardPrimitive.Root openDelay={150} closeDelay={80}>
					<HoverCardPrimitive.Trigger asChild>
						{categoryLink}
					</HoverCardPrimitive.Trigger>
					<HoverCardPrimitive.Portal>
						<HoverCardPrimitive.Content
							side="right"
							align="start"
							sideOffset={8}
							className="z-50 w-56 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/5 outline-hidden duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
						>
							<div className="flex items-center gap-2 px-2 pt-1.5 pb-1">
								<span
									className={cn(
										"flex size-5 shrink-0 items-center justify-center rounded",
										CATEGORY_COLOR_CLASSES[category.color],
									)}
								>
									<Icon className="size-3" strokeWidth={2} />
								</span>
								<span className="font-medium text-foreground text-xs">
									{category.title}
								</span>
							</div>
							<ul className="flex flex-col gap-0.5">
								{category.sections.map((section) => {
									const href =
										section.href ??
										`/config/${category.slug}?section=${section.key}`;
									return (
										<li key={section.key}>
											<Link
												href={href}
												prefetch
												onClick={handleClick(href)}
												className="flex items-center justify-between rounded-md px-2 py-1 text-sm text-foreground/85 transition-colors hover:bg-accent hover:text-foreground"
											>
												<span className="truncate">{section.label}</span>
												{!section.implemented ? (
													<span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
														Soon
													</span>
												) : null}
											</Link>
										</li>
									);
								})}
							</ul>
						</HoverCardPrimitive.Content>
					</HoverCardPrimitive.Portal>
				</HoverCardPrimitive.Root>
			) : (
				categoryLink
			)}

			{isActive && hasMultipleSections ? (
				<ul className="mt-1 mb-1 ml-[1.375rem] flex flex-col gap-0.5 border-border border-l pl-2">
					{category.sections.map((section, index) => {
						const href =
							section.href ?? `/config/${category.slug}?section=${section.key}`;
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
