"use client";

import { Pencil, Power } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { deactivateRoleAction } from "@/lib/actions/roles";
import {
	countEnabledFlags,
	TOTAL_PERMISSION_FLAGS,
} from "@/lib/schemas/role-permissions";
import type { Role } from "@/lib/services/roles";
import { RoleFormSheet } from "./RoleForm";

export function RolesTable({ roles }: { roles: Role[] }) {
	const [editing, setEditing] = useState<Role | null>(null);
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
				r.permissions.all ? TOTAL_PERMISSION_FLAGS + 1 : countEnabledFlags(r.permissions),
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
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => setEditing(r)}
						aria-label="Edit"
					>
						<Pencil />
					</Button>
					{r.is_active && (
						<Button
							variant="ghost"
							size="icon-sm"
							disabled={pending}
							onClick={() => {
								if (!confirm(`Deactivate role "${r.name}"?`)) return;
								startTransition(async () => {
									await deactivateRoleAction(r.id);
								});
							}}
							aria-label="Deactivate"
						>
							<Power />
						</Button>
					)}
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
			<RoleFormSheet
				open={!!editing}
				value={editing}
				onClose={() => setEditing(null)}
			/>
		</>
	);
}
