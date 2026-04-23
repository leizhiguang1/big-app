"use client";

import { Columns3, GripVertical, RotateCcw } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	COLUMN_LABELS,
	type ColumnKey,
	DEFAULT_COLUMN_ORDER,
	DEFAULT_VISIBLE,
} from "@/lib/appointments/columns";
import { cn } from "@/lib/utils";

type Props = {
	columnOrder: ColumnKey[];
	visibleColumns: ColumnKey[];
	onChange: (order: ColumnKey[], visible: ColumnKey[]) => void;
};

const DRAG_MIME = "application/x-column-key";

export function ColumnSettingsPopover({
	columnOrder,
	visibleColumns,
	onChange,
}: Props) {
	const [open, setOpen] = useState(false);
	const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
	const [draftOrder, setDraftOrder] = useState<ColumnKey[]>(columnOrder);
	const [draftVisible, setDraftVisible] = useState<Set<ColumnKey>>(
		() => new Set(visibleColumns),
	);
	const [dragKey, setDragKey] = useState<ColumnKey | null>(null);
	const [dragOverKey, setDragOverKey] = useState<ColumnKey | null>(null);
	const [dragOverPos, setDragOverPos] = useState<"before" | "after" | null>(
		null,
	);

	useEffect(() => {
		if (open) {
			setDraftOrder(columnOrder);
			setDraftVisible(new Set(visibleColumns));
			setDragKey(null);
			setDragOverKey(null);
			setDragOverPos(null);
		}
	}, [open, columnOrder, visibleColumns]);

	const total = draftOrder.length;
	const visibleCount = draftVisible.size;
	const allChecked = visibleCount === total;
	const noneChecked = visibleCount === 0;

	const toggleOne = (key: ColumnKey, checked: boolean) => {
		setDraftVisible((prev) => {
			const next = new Set(prev);
			if (checked) next.add(key);
			else next.delete(key);
			return next;
		});
	};

	const toggleAll = (checked: boolean) => {
		setDraftVisible(checked ? new Set(draftOrder) : new Set());
	};

	const applyReset = () => {
		const defaultOrder = [...DEFAULT_COLUMN_ORDER];
		const defaultVisibleSet = new Set(DEFAULT_VISIBLE);
		setDraftOrder(defaultOrder);
		setDraftVisible(defaultVisibleSet);
		onChange(
			defaultOrder,
			defaultOrder.filter((k) => defaultVisibleSet.has(k)),
		);
		setResetConfirmOpen(false);
		setOpen(false);
	};

	const save = () => {
		onChange(
			draftOrder,
			draftOrder.filter((k) => draftVisible.has(k)),
		);
		setOpen(false);
	};

	const handleDrop = (targetKey: ColumnKey, pos: "before" | "after") => {
		if (!dragKey || dragKey === targetKey) return;
		const next = draftOrder.filter((k) => k !== dragKey);
		const targetIdx = next.indexOf(targetKey);
		if (targetIdx < 0) return;
		const insertIdx = pos === "after" ? targetIdx + 1 : targetIdx;
		next.splice(insertIdx, 0, dragKey);
		setDraftOrder(next);
	};

	const savedVisibleCount = visibleColumns.length;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<Tooltip>
				<TooltipTrigger asChild>
					<PopoverTrigger asChild>
						<button
							type="button"
							aria-label="Column settings"
							className={cn(
								"relative inline-flex size-8 items-center justify-center rounded-md border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
								open && "border-primary/40 bg-primary/5 text-foreground",
							)}
						>
							<Columns3 className="size-4" />
							<span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 font-bold text-[9px] text-white">
								{savedVisibleCount}
							</span>
						</button>
					</PopoverTrigger>
				</TooltipTrigger>
				<TooltipContent>Column settings</TooltipContent>
			</Tooltip>
			<PopoverContent align="end" className="w-72 p-0">
				<div className="flex items-center justify-between px-3 pb-2 pt-3">
					<div className="font-semibold text-sm">Column Setting</div>
				</div>
				<div className="border-t" />
				<div className="flex items-center gap-2 px-3 py-2">
					<CheckboxPrimitive.Root
						checked={allChecked ? true : noneChecked ? false : "indeterminate"}
						onCheckedChange={(v) => toggleAll(v === true)}
						aria-label="Select all"
						className="peer flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input bg-background shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground"
					>
						<CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
							{allChecked ? (
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="3"
									strokeLinecap="round"
									strokeLinejoin="round"
									className="size-3.5"
									aria-hidden
								>
									<title>Checked</title>
									<polyline points="20 6 9 17 4 12" />
								</svg>
							) : (
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="3"
									strokeLinecap="round"
									className="size-3.5"
									aria-hidden
								>
									<title>Indeterminate</title>
									<line x1="5" y1="12" x2="19" y2="12" />
								</svg>
							)}
						</CheckboxPrimitive.Indicator>
					</CheckboxPrimitive.Root>
					<span className="select-none text-sm">Select All</span>
				</div>
				<div className="border-t" />
				<div className="max-h-[320px] overflow-y-auto py-1">
					{draftOrder.map((key) => {
						const isVisible = draftVisible.has(key);
						const isDragging = dragKey === key;
						const showIndicator = dragOverKey === key && dragKey !== key;
						return (
							// biome-ignore lint/a11y/noStaticElementInteractions: native HTML5 drag-and-drop row
							<div
								key={key}
								draggable
								onDragStart={(e) => {
									e.dataTransfer.setData(DRAG_MIME, key);
									e.dataTransfer.effectAllowed = "move";
									setDragKey(key);
								}}
								onDragEnd={() => {
									setDragKey(null);
									setDragOverKey(null);
									setDragOverPos(null);
								}}
								onDragOver={(e) => {
									if (!dragKey || dragKey === key) return;
									e.preventDefault();
									e.dataTransfer.dropEffect = "move";
									const rect = e.currentTarget.getBoundingClientRect();
									const pos: "before" | "after" =
										e.clientY < rect.top + rect.height / 2
											? "before"
											: "after";
									if (dragOverKey !== key) setDragOverKey(key);
									if (dragOverPos !== pos) setDragOverPos(pos);
								}}
								onDragLeave={(e) => {
									const next = e.relatedTarget as Node | null;
									if (next && e.currentTarget.contains(next)) return;
									if (dragOverKey === key) {
										setDragOverKey(null);
										setDragOverPos(null);
									}
								}}
								onDrop={(e) => {
									e.preventDefault();
									handleDrop(key, dragOverPos ?? "before");
									setDragOverKey(null);
									setDragOverPos(null);
								}}
								className={cn(
									"relative flex items-center gap-2 px-3 py-1.5 text-sm",
									isDragging && "opacity-40",
								)}
							>
								{showIndicator && dragOverPos === "before" && (
									<div
										aria-hidden
										className="pointer-events-none absolute inset-x-2 -top-px h-0.5 rounded-full bg-primary"
									/>
								)}
								{showIndicator && dragOverPos === "after" && (
									<div
										aria-hidden
										className="pointer-events-none absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary"
									/>
								)}
								<span
									className="cursor-grab text-muted-foreground active:cursor-grabbing"
									aria-hidden
								>
									<GripVertical className="size-4" />
								</span>
								<Checkbox
									id={`col-${key}`}
									checked={isVisible}
									onCheckedChange={(v) => toggleOne(key, v === true)}
								/>
								<label
									htmlFor={`col-${key}`}
									className="flex-1 cursor-pointer select-none truncate"
								>
									{COLUMN_LABELS[key]}
								</label>
							</div>
						);
					})}
				</div>
				<div className="flex items-center justify-between gap-2 border-t px-3 py-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setResetConfirmOpen(true)}
						className="gap-1.5 text-muted-foreground"
					>
						<RotateCcw className="size-3.5" />
						Reset to default
					</Button>
					<Button size="sm" onClick={save}>
						Save
					</Button>
				</div>
			</PopoverContent>
			<ConfirmDialog
				open={resetConfirmOpen}
				onOpenChange={setResetConfirmOpen}
				title="Reset columns to default?"
				description="This restores the original column order and visibility. Your current arrangement will be lost."
				confirmLabel="Reset"
				variant="destructive"
				onConfirm={applyReset}
			/>
		</Popover>
	);
}
