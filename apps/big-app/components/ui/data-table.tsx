"use client";

import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	Search,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
	key: string;
	header: ReactNode;
	cell: (row: T) => ReactNode;
	sortable?: boolean;
	sortValue?: (row: T) => string | number | boolean | null | undefined;
	align?: "left" | "right" | "center";
	className?: string;
	headerClassName?: string;
};

type SortState = { key: string; dir: "asc" | "desc" } | null;

type Props<T> = {
	data: T[];
	columns: DataTableColumn<T>[];
	getRowKey: (row: T) => string;
	searchKeys?: (keyof T)[];
	searchPlaceholder?: string;
	emptyMessage?: ReactNode;
	minWidth?: number;
	toolbar?: ReactNode;
	rowClassName?: (row: T) => string | undefined;
	pagination?: boolean;
	defaultPageSize?: number;
	pageSizeOptions?: number[];
	fillHeight?: boolean;
};

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function matchesSearch<T>(row: T, keys: (keyof T)[], needle: string): boolean {
	const terms = needle.toLowerCase().split(/\s+/).filter(Boolean);
	if (terms.length === 0) return true;
	let haystack = "";
	for (const k of keys) {
		const v = row[k];
		if (v == null) continue;
		haystack += `${String(v).toLowerCase()} `;
	}
	return terms.every((t) => haystack.includes(t));
}

function compare(a: unknown, b: unknown): number {
	if (a == null && b == null) return 0;
	if (a == null) return -1;
	if (b == null) return 1;
	if (typeof a === "number" && typeof b === "number") return a - b;
	if (typeof a === "boolean" && typeof b === "boolean")
		return a === b ? 0 : a ? 1 : -1;
	return String(a).localeCompare(String(b));
}

export function DataTable<T>({
	data,
	columns,
	getRowKey,
	searchKeys,
	searchPlaceholder = "Search…",
	emptyMessage = "No results.",
	minWidth = 640,
	toolbar,
	rowClassName,
	pagination = true,
	defaultPageSize = 25,
	pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
	fillHeight = false,
}: Props<T>) {
	const [query, setQuery] = useState("");
	const [sort, setSort] = useState<SortState>(null);
	const [pageSize, setPageSize] = useState(defaultPageSize);
	const [page, setPage] = useState(0);

	const filtered = useMemo(() => {
		if (!query.trim() || !searchKeys?.length) return data;
		return data.filter((row) => matchesSearch(row, searchKeys, query.trim()));
	}, [data, query, searchKeys]);

	const sorted = useMemo(() => {
		if (!sort) return filtered;
		const col = columns.find((c) => c.key === sort.key);
		if (!col) return filtered;
		const get = col.sortValue ?? ((r: T) => (r as Record<string, unknown>)[sort.key]);
		const copy = [...filtered];
		copy.sort((a, b) => {
			const r = compare(get(a), get(b));
			return sort.dir === "asc" ? r : -r;
		});
		return copy;
	}, [filtered, sort, columns]);

	const total = sorted.length;
	const pageCount = pagination ? Math.max(1, Math.ceil(total / pageSize)) : 1;
	const safePage = Math.min(page, pageCount - 1);
	const paged = useMemo(() => {
		if (!pagination) return sorted;
		const start = safePage * pageSize;
		return sorted.slice(start, start + pageSize);
	}, [sorted, pagination, safePage, pageSize]);

	// Reset page when filter/sort collapses the set below the current page.
	useEffect(() => {
		if (page > pageCount - 1) setPage(0);
	}, [page, pageCount]);

	const toggleSort = (key: string) => {
		setSort((prev) => {
			if (!prev || prev.key !== key) return { key, dir: "asc" };
			if (prev.dir === "asc") return { key, dir: "desc" };
			return null;
		});
	};

	const hasSearch = !!searchKeys?.length;
	const rows = pagination ? paged : sorted;
	const rangeStart = total === 0 ? 0 : safePage * pageSize + 1;
	const rangeEnd = Math.min(total, (safePage + 1) * pageSize);

	return (
		<div
			className={cn(
				"flex flex-col gap-3",
				fillHeight && "min-h-0 flex-1",
			)}
		>
			{(hasSearch || toolbar) && (
				<div className="flex shrink-0 flex-wrap items-center gap-2">
					{hasSearch && (
						<div className="relative max-w-sm flex-1">
							<Search className="-translate-y-1/2 absolute top-1/2 left-2 size-3.5 text-muted-foreground" />
							<Input
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder={searchPlaceholder}
								className="pl-7"
							/>
						</div>
					)}
					{toolbar && <div className="ml-auto flex items-center gap-2">{toolbar}</div>}
				</div>
			)}
			<div
				className={cn(
					"rounded-lg border",
					fillHeight
						? "scrollbar-themed min-h-0 flex-1 overflow-auto"
						: "overflow-x-auto",
				)}
			>
				<table
					className="w-full text-sm"
					style={{ minWidth: `${minWidth}px` }}
				>
					<thead
						className={cn(
							"border-b border-accent bg-accent/60 text-accent-foreground",
							fillHeight && "sticky top-0 z-10",
						)}
					>
						<tr>
							{columns.map((col) => {
								const active = sort?.key === col.key;
								const alignCls =
									col.align === "right"
										? "text-right"
										: col.align === "center"
											? "text-center"
											: "text-left";
								return (
									<th
										key={col.key}
										className={cn(
											"px-3 py-2 font-medium",
											alignCls,
											col.headerClassName,
										)}
									>
										{col.sortable ? (
											<button
												type="button"
												onClick={() => toggleSort(col.key)}
												className={cn(
													"inline-flex items-center gap-1 opacity-80 hover:opacity-100",
													active && "opacity-100",
												)}
											>
												{col.header}
												{active ? (
													sort?.dir === "asc" ? (
														<ArrowUp className="size-3" />
													) : (
														<ArrowDown className="size-3" />
													)
												) : (
													<ArrowUpDown className="size-3 opacity-50" />
												)}
											</button>
										) : (
											col.header
										)}
									</th>
								);
							})}
						</tr>
					</thead>
					<tbody>
						{rows.length === 0 ? (
							<tr>
								<td
									colSpan={columns.length}
									className="px-3 py-8 text-center text-muted-foreground"
								>
									{query.trim() ? "No matches." : emptyMessage}
								</td>
							</tr>
						) : (
							rows.map((row) => (
								<tr
									key={getRowKey(row)}
									className={cn(
										"border-b last:border-0",
										rowClassName?.(row),
									)}
								>
									{columns.map((col) => {
										const alignCls =
											col.align === "right"
												? "text-right"
												: col.align === "center"
													? "text-center"
													: "text-left";
										return (
											<td
												key={col.key}
												className={cn("px-3 py-2", alignCls, col.className)}
											>
												{col.cell(row)}
											</td>
										);
									})}
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
			{pagination && total > 0 && (
				<div
					className={cn(
						"flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2 text-sm shadow-sm",
						fillHeight
							? "shrink-0"
							: "sticky bottom-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75",
					)}
				>
					<div className="text-muted-foreground">
						Showing <span className="tabular-nums">{rangeStart}</span>–
						<span className="tabular-nums">{rangeEnd}</span> of{" "}
						<span className="tabular-nums">{total}</span>
					</div>
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-2">
							<span className="text-muted-foreground">Rows per page</span>
							<Select
								value={String(pageSize)}
								onValueChange={(v) => {
									setPageSize(Number(v));
									setPage(0);
								}}
							>
								<SelectTrigger size="sm" className="w-[72px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{pageSizeOptions.map((n) => (
										<SelectItem key={n} value={String(n)}>
											{n}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="text-muted-foreground tabular-nums">
							Page {safePage + 1} of {pageCount}
						</div>
						<div className="flex items-center gap-1">
							<Button
								variant="outline"
								size="icon-sm"
								onClick={() => setPage(0)}
								disabled={safePage === 0}
								aria-label="First page"
							>
								<ChevronsLeft />
							</Button>
							<Button
								variant="outline"
								size="icon-sm"
								onClick={() => setPage((p) => Math.max(0, p - 1))}
								disabled={safePage === 0}
								aria-label="Previous page"
							>
								<ChevronLeft />
							</Button>
							<Button
								variant="outline"
								size="icon-sm"
								onClick={() =>
									setPage((p) => Math.min(pageCount - 1, p + 1))
								}
								disabled={safePage >= pageCount - 1}
								aria-label="Next page"
							>
								<ChevronRight />
							</Button>
							<Button
								variant="outline"
								size="icon-sm"
								onClick={() => setPage(pageCount - 1)}
								disabled={safePage >= pageCount - 1}
								aria-label="Last page"
							>
								<ChevronsRight />
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
