"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { BrandConfigItemDialog } from "@/components/brand-config/BrandConfigItemDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CreateButton } from "@/components/ui/create-button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Switch } from "@/components/ui/switch";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	archiveBrandConfigItemAction,
	deleteBrandConfigItemAction,
	updateBrandConfigItemAction,
} from "@/lib/actions/brand-config";
import {
	type BrandConfigCategory,
	getCategoryDef,
} from "@/lib/brand-config/categories";
import type { BrandConfigItem } from "@/lib/services/brand-config";

type Props = {
	category: BrandConfigCategory;
	items: BrandConfigItem[];
};

export function BrandConfigSection({ category, items }: Props) {
	const def = getCategoryDef(category);
	const [creating, setCreating] = useState(false);
	const [editing, setEditing] = useState<BrandConfigItem | null>(null);
	const [deleting, setDeleting] = useState<BrandConfigItem | null>(null);
	const [pending, startTransition] = useTransition();

	const toggleActive = (row: BrandConfigItem, next: boolean) => {
		startTransition(async () => {
			try {
				await updateBrandConfigItemAction(row.id, { is_active: next });
			} catch (err) {
				console.error(err);
			}
		});
	};

	const confirmDelete = () => {
		if (!deleting) return;
		startTransition(async () => {
			try {
				await deleteBrandConfigItemAction(deleting.id);
				setDeleting(null);
			} catch (err) {
				// Foreign-key failure falls back to archive. The service already
				// distinguishes the two cases; here we just retry as archive.
				try {
					await archiveBrandConfigItemAction(deleting.id);
					setDeleting(null);
				} catch (inner) {
					console.error(err, inner);
				}
			}
		});
	};

	const columns: DataTableColumn<BrandConfigItem>[] = [
		{
			key: "label",
			header: "Label",
			cell: (r) => <span className="font-medium">{r.label}</span>,
			sortable: true,
			sortValue: (r) => r.label,
		},
	];

	if (def.hasColor) {
		columns.push({
			key: "color",
			header: "Color",
			cell: (r) =>
				r.color ? (
					<span
						className="inline-block rounded-full px-3 py-0.5 font-mono text-xs"
						style={{ backgroundColor: `${r.color}33`, color: r.color }}
					>
						{r.color}
					</span>
				) : (
					<span className="text-muted-foreground text-xs">—</span>
				),
			className: "w-40",
		});
	}

	columns.push(
		{
			key: "is_active",
			header: "Active",
			cell: (r) => (
				<Switch
					checked={r.is_active}
					disabled={pending || !def.codeEditable}
					onCheckedChange={(v) => toggleActive(r, v)}
				/>
			),
			className: "w-20",
		},
		{
			key: "actions",
			header: "",
			cell: (r) => (
				<div className="flex items-center justify-end gap-1">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={() => setEditing(r)}
							>
								<Pencil />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Edit</TooltipContent>
					</Tooltip>
					{def.codeEditable && (
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon-sm"
									onClick={() => setDeleting(r)}
									className="text-destructive hover:text-destructive"
								>
									<Trash2 />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Delete</TooltipContent>
						</Tooltip>
					)}
				</div>
			),
			align: "right",
			className: "w-28",
		},
	);

	return (
		<>
			<Card>
				<CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
					<div className="flex flex-col gap-1">
						<CardTitle className="text-base">{def.label}</CardTitle>
						{def.hint && (
							<p className="text-muted-foreground text-xs">{def.hint}</p>
						)}
					</div>
					{def.codeEditable && (
						<CreateButton size="sm" onClick={() => setCreating(true)}>
							Add
						</CreateButton>
					)}
				</CardHeader>
				<CardContent>
					<DataTable
						data={items}
						columns={columns}
						getRowKey={(r) => r.id}
						searchKeys={["label"]}
						emptyMessage={
							def.codeEditable
								? "No items yet. Click Add to create the first one."
								: "No rows."
						}
					/>
				</CardContent>
			</Card>
			{creating && (
				<BrandConfigItemDialog
					open={creating}
					onClose={() => setCreating(false)}
					category={category}
				/>
			)}
			{editing && (
				<BrandConfigItemDialog
					open={!!editing}
					onClose={() => setEditing(null)}
					category={category}
					item={editing}
				/>
			)}
			{deleting && (
				<ConfirmDialog
					open={!!deleting}
					onOpenChange={(o) => !o && setDeleting(null)}
					title={`Delete "${deleting.label}"?`}
					description={
						def.storage === "live"
							? "Existing records that use this item will keep displaying it (it just stops appearing as an option for future entries)."
							: "Past records keep their original wording. Removing this only stops it from showing up as a future option."
					}
					confirmLabel="Delete"
					pending={pending}
					onConfirm={confirmDelete}
				/>
			)}
		</>
	);
}
