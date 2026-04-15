"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	createUomAction,
	deleteUomAction,
	updateUomAction,
} from "@/lib/actions/inventory";
import { INVENTORY_KIND_LABELS, type InventoryKind } from "@/lib/schemas/inventory";
import type {
	InventoryItemWithRefs,
	InventoryUom,
} from "@/lib/services/inventory";

type Props = {
	uoms: InventoryUom[];
	items: InventoryItemWithRefs[];
};

export function UomPanel({ uoms, items }: Props) {
	return (
		<div className="grid gap-4 lg:grid-cols-2">
			<UomList uoms={uoms} />
			<ConversionList items={items} />
		</div>
	);
}

// ---------- UoM List ----------

function UomList({ uoms }: { uoms: InventoryUom[] }) {
	const [editing, setEditing] = useState<InventoryUom | "new" | null>(null);
	const [deleting, setDeleting] = useState<InventoryUom | null>(null);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	return (
		<div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
			<div className="flex items-center justify-between">
				<h2 className="font-semibold text-sm">UoM List</h2>
				<Button size="sm" variant="outline" onClick={() => setEditing("new")}>
					<Plus className="size-3.5" /> Add
				</Button>
			</div>
			{uoms.length === 0 ? (
				<p className="py-6 text-center text-muted-foreground text-sm">
					No units of measurement yet.
				</p>
			) : (
				<ul className="flex flex-col divide-y">
					{uoms.map((u) => (
						<li
							key={u.id}
							className="flex items-center justify-between gap-3 py-2"
						>
							<div className="min-w-0 flex-1">
								<div className="font-mono font-medium text-sm">{u.name}</div>
								{u.description && (
									<div className="truncate text-muted-foreground text-xs">
										{u.description}
									</div>
								)}
							</div>
							<div className="flex gap-1">
								<Button
									variant="ghost"
									size="icon-sm"
									onClick={() => setEditing(u)}
									aria-label="Edit"
								>
									<Pencil />
								</Button>
								<Button
									variant="ghost"
									size="icon-sm"
									onClick={() => {
										setDeleteError(null);
										setDeleting(u);
									}}
									aria-label="Delete"
								>
									<Trash2 />
								</Button>
							</div>
						</li>
					))}
				</ul>
			)}
			{editing && (
				<UomDialog
					mode={editing === "new" ? "create" : "edit"}
					initial={
						editing === "new"
							? { name: "", description: "" }
							: { name: editing.name, description: editing.description ?? "" }
					}
					onSubmit={async (data) => {
						if (editing === "new") {
							await createUomAction(data);
						} else {
							await updateUomAction(editing.id, data);
						}
						setEditing(null);
					}}
					onClose={() => setEditing(null)}
				/>
			)}
			<ConfirmDialog
				open={!!deleting}
				onOpenChange={(o) => {
					if (!o) setDeleting(null);
				}}
				title="Delete UoM?"
				description={
					deleting
						? `"${deleting.name}" will be permanently removed.${deleteError ? ` — ${deleteError}` : ""}`
						: undefined
				}
				confirmLabel="Delete"
				pending={pending}
				onConfirm={() => {
					if (!deleting) return;
					const target = deleting;
					setDeleteError(null);
					startTransition(async () => {
						try {
							await deleteUomAction(target.id);
							setDeleting(null);
						} catch (err) {
							setDeleteError(
								err instanceof Error ? err.message : "Failed to delete",
							);
						}
					});
				}}
			/>
		</div>
	);
}

// ---------- Conversion summary (read-only) ----------

function ConversionList({ items }: { items: InventoryItemWithRefs[] }) {
	const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));

	return (
		<div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
			<div className="flex items-center justify-between">
				<h2 className="font-semibold text-sm">UoM Conversion</h2>
				<span className="text-muted-foreground text-xs">
					{items.length} item{items.length === 1 ? "" : "s"}
				</span>
			</div>
			{sorted.length === 0 ? (
				<p className="py-6 text-center text-muted-foreground text-sm">
					No items defined.
				</p>
			) : (
				<ul className="flex flex-col divide-y">
					{sorted.map((i) => {
						const parts = [
							`1 ${i.purchasing_uom?.name ?? "—"}`,
							`${i.purchasing_to_stock_factor} ${i.stock_uom?.name ?? "—"}`,
						];
						if (i.use_uom && i.stock_to_use_factor != null) {
							parts.push(`${i.stock_to_use_factor} ${i.use_uom.name}`);
						}
						return (
							<li
								key={i.id}
								className="flex items-center justify-between gap-3 py-2"
							>
								<div className="min-w-0 flex-1">
									<div className="truncate font-medium text-sm">{i.name}</div>
									<div className="font-mono text-muted-foreground text-xs">
										{i.sku} ·{" "}
										{INVENTORY_KIND_LABELS[i.kind as InventoryKind]}
									</div>
								</div>
								<div className="font-mono text-muted-foreground text-xs">
									{parts.join(" → ")}
								</div>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}

// ---------- Dialog ----------

function UomDialog({
	mode,
	initial,
	onSubmit,
	onClose,
}: {
	mode: "create" | "edit";
	initial: { name: string; description: string };
	onSubmit: (data: {
		name: string;
		description: string | null;
	}) => Promise<void>;
	onClose: () => void;
}) {
	const [name, setName] = useState(initial.name);
	const [description, setDescription] = useState(initial.description);
	const [pending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);

	return (
		<Dialog open onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{mode === "create" ? "New UoM" : "Edit UoM"}
					</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						setError(null);
						startTransition(async () => {
							try {
								await onSubmit({
									name: name.trim(),
									description:
										description.trim() === "" ? null : description.trim(),
								});
							} catch (err) {
								setError(err instanceof Error ? err.message : "Failed");
							}
						});
					}}
					className="flex flex-col gap-3"
				>
					<div className="flex flex-col gap-1.5">
						<label className="font-medium text-sm">Name</label>
						<Input
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="EG: BOX"
							autoFocus
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<label className="font-medium text-sm">Description</label>
						<Input
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="optional"
						/>
					</div>
					{error && <p className="text-destructive text-xs">{error}</p>}
					<DialogFooter>
						<Button type="button" variant="outline" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit" disabled={pending || name.trim() === ""}>
							{pending ? "Saving…" : mode === "create" ? "Create" : "Save"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
