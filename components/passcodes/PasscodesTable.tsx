"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { deletePasscodeAction } from "@/lib/actions/passcodes";
import {
	PASSCODE_FUNCTION_LABELS,
	type PasscodeFunction,
} from "@/lib/schemas/passcodes";
import type {
	PasscodeEmployeeRef,
	PasscodeListItem,
} from "@/lib/services/passcodes";
import { PasscodeFormDialog } from "./PasscodeForm";

type OutletOption = { id: string; name: string };

function employeeName(e: PasscodeEmployeeRef | null): string {
	if (!e) return "—";
	return [e.first_name, e.last_name].filter(Boolean).join(" ") || "—";
}

function deriveStatus(p: PasscodeListItem): "used" | "expired" | "active" {
	if (p.used_at) return "used";
	if (p.expires_at && new Date(p.expires_at) < new Date()) return "expired";
	return "active";
}

const STATUS_CLASS: Record<string, string> = {
	active: "bg-emerald-500/15 text-emerald-600",
	used: "bg-muted text-muted-foreground",
	expired: "bg-amber-500/15 text-amber-600",
};

export function PasscodesTable({
	passcodes,
	outlets,
}: {
	passcodes: PasscodeListItem[];
	outlets: OutletOption[];
}) {
	const [editing, setEditing] = useState<PasscodeListItem | null>(null);
	const [deleting, setDeleting] = useState<PasscodeListItem | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	const columns: DataTableColumn<PasscodeListItem>[] = [
		{
			key: "passcode",
			header: "Passcode",
			sortable: true,
			sortValue: (p) => p.passcode,
			cell: (p) => (
				<div className="flex flex-col">
					<span className="font-mono font-semibold text-base">{p.passcode}</span>
					<span className="text-muted-foreground text-xs">
						{p.outlet?.name ?? "—"}
					</span>
					<span className="text-muted-foreground text-xs">
						{PASSCODE_FUNCTION_LABELS[p.function as PasscodeFunction] ?? p.function}
					</span>
				</div>
			),
		},
		{
			key: "applied_on",
			header: "Applied on",
			cell: (p) => (
				<span className="text-muted-foreground">{p.applied_on || "—"}</span>
			),
		},
		{
			key: "remarks",
			header: "Remarks",
			cell: (p) => (
				<span className="text-muted-foreground">{p.remarks || "—"}</span>
			),
		},
		{
			key: "used_by",
			header: "Used by",
			cell: (p) => (
				<div className="flex flex-col">
					<span>{employeeName(p.used_by)}</span>
					{p.used_at && (
						<span className="text-muted-foreground text-xs">
							{new Date(p.used_at).toLocaleString()}
						</span>
					)}
				</div>
			),
		},
		{
			key: "created_by",
			header: "Created by",
			cell: (p) => (
				<div className="flex flex-col">
					<span>{employeeName(p.created_by)}</span>
					<span className="text-muted-foreground text-xs">
						{new Date(p.created_at).toLocaleString()}
					</span>
				</div>
			),
		},
		{
			key: "status",
			header: "Status",
			sortable: true,
			sortValue: (p) => deriveStatus(p),
			cell: (p) => {
				const s = deriveStatus(p);
				return (
					<span
						className={`rounded-full px-2 py-0.5 text-xs capitalize ${STATUS_CLASS[s]}`}
					>
						{s}
					</span>
				);
			},
		},
		{
			key: "actions",
			header: "Actions",
			align: "right",
			cell: (p) => (
				<div className="inline-flex gap-1">
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => setEditing(p)}
						aria-label="Edit"
					>
						<Pencil />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => {
							setActionError(null);
							setDeleting(p);
						}}
						aria-label="Delete"
					>
						<Trash2 />
					</Button>
				</div>
			),
		},
	];

	return (
		<>
			<DataTable
				data={passcodes}
				columns={columns}
				getRowKey={(p) => p.id}
				searchKeys={["passcode", "remarks", "applied_on"]}
				searchPlaceholder="Search passcodes…"
				emptyMessage="No passcodes yet. Click “Generate passcode” to create one."
				minWidth={960}
			/>
			<PasscodeFormDialog
				open={!!editing}
				passcode={editing}
				outlets={outlets}
				onClose={() => setEditing(null)}
			/>
			<ConfirmDialog
				open={!!deleting}
				onOpenChange={(o) => {
					if (!o) setDeleting(null);
				}}
				title="Delete passcode?"
				description={
					deleting
						? `Passcode ${deleting.passcode} will be permanently removed.${
								actionError ? ` — ${actionError}` : ""
							}`
						: undefined
				}
				confirmLabel="Delete"
				pending={pending}
				onConfirm={() => {
					if (!deleting) return;
					const target = deleting;
					setActionError(null);
					startTransition(async () => {
						try {
							await deletePasscodeAction(target.id);
							setDeleting(null);
						} catch (err) {
							setActionError(
								err instanceof Error ? err.message : "Failed to delete",
							);
						}
					});
				}}
			/>
		</>
	);
}
