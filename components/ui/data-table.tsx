"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
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
};

function matchesSearch<T>(row: T, keys: (keyof T)[], needle: string): boolean {
	const n = needle.toLowerCase();
	for (const k of keys) {
		const v = row[k];
		if (v == null) continue;
		if (String(v).toLowerCase().includes(n)) return true;
	}
	return false;
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
}: Props<T>) {
	const [query, setQuery] = useState("");
	const [sort, setSort] = useState<SortState>(null);

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

	const toggleSort = (key: string) => {
		setSort((prev) => {
			if (!prev || prev.key !== key) return { key, dir: "asc" };
			if (prev.dir === "asc") return { key, dir: "desc" };
			return null;
		});
	};

	const hasSearch = !!searchKeys?.length;

	return (
		<div className="flex flex-col gap-3">
			{(hasSearch || toolbar) && (
				<div className="flex flex-wrap items-center gap-2">
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
			<div className="overflow-x-auto rounded-lg border">
				<table
					className="w-full text-sm"
					style={{ minWidth: `${minWidth}px` }}
				>
					<thead className="border-b border-accent bg-accent/60 text-accent-foreground">
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
						{sorted.length === 0 ? (
							<tr>
								<td
									colSpan={columns.length}
									className="px-3 py-8 text-center text-muted-foreground"
								>
									{query.trim() ? "No matches." : emptyMessage}
								</td>
							</tr>
						) : (
							sorted.map((row) => (
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
		</div>
	);
}
