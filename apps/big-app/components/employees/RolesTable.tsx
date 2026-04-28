"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { deleteRoleAction } from "@/lib/actions/roles";
import {
	countEnabledFlags,
	TOTAL_PERMISSION_FLAGS,
} from "@/lib/schemas/role-permissions";
import type { Role } from "@/lib/services/roles";
import { RoleFormDialog } from "./RoleForm";

export function RolesTable({ roles }: { roles: Role[] }) {
	const [editing, setEditing] = useState<Role | null>(null);
	const [deleting, setDeleting] = useState<Role | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	const columns: DataTableColumn<Role>[] = [
		{
			key: "name",
			header: "Name",
			sortable: true,
			sortValue: (r) => r.name,
			cell: (r) => <span className="font-medium">{r.name}</span>,
		},
		{
			key: "permissions",
			header: "Permissions",
			sortable: true,
			sortValue: (r) =>
				r.permissions.all
					? TOTAL_PERMISSION_FLAGS + 1
					: countEnabledFlags(r.permissions),
			cell: (r) => {
				const enabled = countEnabledFlags(r.permissions);
				if (r.permissions.all) {
					return (
						<span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary text-xs">
							Full access
						</span>
					);
				}
				if (enabled === 0) {
					return <span className="text-muted-foreground text-xs">None</span>;
				}
				return (
					<span className="rounded-full bg-muted px-2 py-0.5 text-xs">
						{enabled} / {TOTAL_PERMISSION_FLAGS}
					</span>
				);
			},
		},
		{
			key: "is_active",
			header: "Status",
			sortable: true,
			cell: (r) => (
				<span
					className={
						r.is_active
							? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-600 text-xs"
							: "rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs"
					}
				>
					{r.is_active ? "Active" : "Inactive"}
				</span>
			),
		},
		{
			key: "actions",
			header: "Actions",
			align: "right",
			cell: (r) => (
				<div className="inline-flex gap-1">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={() => setEditing(r)}
								aria-label="Edit"
							>
								<Pencil />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Edit</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={() => {
									setActionError(null);
									setDeleting(r);
								}}
								aria-label="Delete"
							>
								<Trash2 />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Delete</TooltipContent>
					</Tooltip>
				</div>
			),
		},
	];

	return (
		<>
			<DataTable
				data={roles}
				columns={columns}
				getRowKey={(r) => r.id}
				searchKeys={["name"]}
				searchPlaceholder="Search roles…"
				emptyMessage="No roles yet. Click “New role” to create one."
				minWidth={640}
			/>
			<RoleFormDialog
				open={!!editing}
				value={editing}
				onClose={() => setEditing(null)}
			/>
			<ConfirmDialog
				open={!!deleting}
				onOpenChange={(o) => {
					if (!o) setDeleting(null);
				}}
				title="Delete role?"
				description={
					deleting
						? `"${deleting.name}" will be permanently removed. This cannot be undone.${actionError ? ` — ${actionError}` : ""}`
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
							await deleteRoleAction(target.id);
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
