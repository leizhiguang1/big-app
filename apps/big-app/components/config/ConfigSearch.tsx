"use client";

import { ChevronRight, CornerDownLeft, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import {
	type KeyboardEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CATEGORY_COLOR_CLASSES } from "./categories-data";
import {
	buildSearchIndex,
	type ConfigSearchEntry,
	filterEntries,
} from "./config-search-index";

export function ConfigSearch({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const router = useRouter();
	const [query, setQuery] = useState("");
	const [activeIndex, setActiveIndex] = useState(0);
	const listRef = useRef<HTMLDivElement>(null);

	const allEntries = useMemo(() => buildSearchIndex(), []);
	const results = useMemo(
		() => filterEntries(allEntries, query),
		[allEntries, query],
	);

	useEffect(() => {
		if (!open) {
			setQuery("");
			setActiveIndex(0);
		}
	}, [open]);

	useEffect(() => {
		const node = listRef.current?.querySelector<HTMLElement>(
			`[data-index="${activeIndex}"]`,
		);
		node?.scrollIntoView({ block: "nearest" });
	}, [activeIndex]);

	const select = useCallback(
		(entry: ConfigSearchEntry) => {
			onOpenChange(false);
			router.push(entry.href);
		},
		[onOpenChange, router],
	);

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (results.length === 0) return;
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setActiveIndex((i) => (i + 1) % results.length);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setActiveIndex((i) => (i - 1 + results.length) % results.length);
		} else if (e.key === "Enter") {
			e.preventDefault();
			const entry = results[activeIndex];
			if (entry) select(entry);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="top-[20%] w-full max-w-xl translate-y-0 gap-0 overflow-hidden p-0"
				showCloseButton={false}
			>
				<DialogTitle className="sr-only">Search settings</DialogTitle>
				<div className="flex items-center gap-2 border-b px-3 py-2.5">
					<Search className="size-4 shrink-0 text-muted-foreground" />
					<input
						autoFocus
						value={query}
						onChange={(e) => {
							setQuery(e.target.value);
							setActiveIndex(0);
						}}
						onKeyDown={handleKeyDown}
						placeholder="Search settings... (e.g. tax, salutation, void)"
						className="h-7 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
					/>
					<kbd className="ml-auto rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
						ESC
					</kbd>
				</div>

				<div
					ref={listRef}
					className="max-h-[60vh] overflow-y-auto p-1"
					role="listbox"
				>
					{results.length === 0 ? (
						<div className="px-3 py-8 text-center text-muted-foreground text-sm">
							No settings match "{query}"
						</div>
					) : (
						<GroupedResults
							results={results}
							activeIndex={activeIndex}
							onSelect={select}
							onHover={setActiveIndex}
							grouped={!query.trim()}
						/>
					)}
				</div>

				<div className="flex items-center justify-between border-t bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground">
					<div className="flex items-center gap-3">
						<span className="flex items-center gap-1">
							<kbd className="rounded border bg-background px-1 py-0.5 font-mono text-[10px]">
								↑
							</kbd>
							<kbd className="rounded border bg-background px-1 py-0.5 font-mono text-[10px]">
								↓
							</kbd>
							navigate
						</span>
						<span className="flex items-center gap-1">
							<CornerDownLeft className="size-3" /> select
						</span>
					</div>
					<span>{results.length} settings</span>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function GroupedResults({
	results,
	activeIndex,
	onSelect,
	onHover,
	grouped,
}: {
	results: ConfigSearchEntry[];
	activeIndex: number;
	onSelect: (entry: ConfigSearchEntry) => void;
	onHover: (index: number) => void;
	grouped: boolean;
}) {
	if (!grouped) {
		return (
			<>
				{results.map((entry, i) => (
					<ResultRow
						key={entry.id}
						entry={entry}
						index={i}
						active={i === activeIndex}
						onSelect={onSelect}
						onHover={onHover}
					/>
				))}
			</>
		);
	}

	const groups = new Map<
		string,
		{ title: string; entries: ConfigSearchEntry[] }
	>();
	for (const entry of results) {
		const existing = groups.get(entry.categorySlug);
		if (existing) {
			existing.entries.push(entry);
		} else {
			groups.set(entry.categorySlug, {
				title: entry.categoryTitle,
				entries: [entry],
			});
		}
	}

	let runningIndex = 0;
	const blocks: React.ReactNode[] = [];
	for (const [slug, group] of groups) {
		blocks.push(
			<div
				key={`heading-${slug}`}
				className="px-2 pt-2 pb-1 font-medium text-[10px] text-muted-foreground uppercase tracking-wide"
			>
				{group.title}
			</div>,
		);
		for (const entry of group.entries) {
			const i = runningIndex++;
			blocks.push(
				<ResultRow
					key={entry.id}
					entry={entry}
					index={i}
					active={i === activeIndex}
					onSelect={onSelect}
					onHover={onHover}
				/>,
			);
		}
	}
	return <>{blocks}</>;
}

function ResultRow({
	entry,
	index,
	active,
	onSelect,
	onHover,
}: {
	entry: ConfigSearchEntry;
	index: number;
	active: boolean;
	onSelect: (entry: ConfigSearchEntry) => void;
	onHover: (index: number) => void;
}) {
	const Icon = entry.categoryIcon;
	return (
		<button
			type="button"
			data-index={index}
			role="option"
			aria-selected={active}
			onMouseEnter={() => onHover(index)}
			onClick={() => onSelect(entry)}
			className={cn(
				"flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
				active ? "bg-accent text-accent-foreground" : "text-foreground/90",
			)}
		>
			<span
				className={cn(
					"flex size-6 shrink-0 items-center justify-center rounded-md",
					CATEGORY_COLOR_CLASSES[entry.categoryColor],
				)}
			>
				<Icon className="size-3.5" strokeWidth={2} />
			</span>
			<span className="min-w-0 flex-1 truncate">{entry.sectionLabel}</span>
			<span className="flex items-center gap-1 text-muted-foreground text-xs">
				{entry.categoryTitle}
				<ChevronRight className="size-3" />
			</span>
			{!entry.implemented ? (
				<span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
					Soon
				</span>
			) : null}
		</button>
	);
}
