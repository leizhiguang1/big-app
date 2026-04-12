"use client";

import { Pencil, Power } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { deactivateEmployeeAction } from "@/lib/actions/employees";
import type { EmployeeWithRelations } from "@/lib/services/employees";
import type { Position } from "@/lib/services/positions";
import type { Role } from "@/lib/services/roles";
import { EmployeeFormSheet } from "./EmployeeForm";

type Props = {
	employees: EmployeeWithRelations[];
	roles: Role[];
	positions: Position[];
};

function FlagBadge({ on, label }: { on: boolean; label: string }) {
	return (
		<span
			title={`${label}: ${on ? "on" : "off"}`}
			className={
				on
					? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-600 text-xs"
					: "rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs"
			}
		>
			{on ? "Yes" : "No"}
		</span>
	);
}

export function EmployeesTable({ employees, roles, positions }: Props) {
	const [editing, setEditing] = useState<EmployeeWithRelations | null>(null);
	const [pending, startTransition] = useTransition();

	const columns: DataTableColumn<EmployeeWithRelations>[] = [
		{
			key: "name",
			header: "Name",
			sortable: true,
			sortValue: (e) => `${e.first_name} ${e.last_name}`,
			cell: (e) => (
				<>
					<div className="font-medium">
						{e.salutation ? `${e.salutation} ` : ""}
						{e.first_name} {e.last_name}
					</div>
					<div className="font-mono text-muted-foreground text-xs">
						{e.code}
					</div>
				</>
			),
		},
		{
			key: "role",
			header: "Role",
			sortable: true,
			sortValue: (e) => e.role?.name ?? "",
			cell: (e) => (
				<span className="text-muted-foreground">{e.role?.name ?? "—"}</span>
			),
		},
		{
			key: "position",
			header: "Position",
			sortable: true,
			sortValue: (e) => e.position?.name ?? "",
			cell: (e) => (
				<span className="text-muted-foreground">
					{e.position?.name ?? "—"}
				</span>
			),
		},
		{
			key: "phone",
			header: "Phone",
			cell: (e) => (
				<span className="text-muted-foreground">{e.phone ?? "—"}</span>
			),
		},
		{
			key: "appointment_sequencing",
			header: "Seq.",
			sortable: true,
			cell: (e) => (
				<span className="text-muted-foreground">
					{e.appointment_sequencing ?? "—"}
				</span>
			),
		},
		{
			key: "mobile_app_enabled",
			header: "Mobile App",
			cell: (e) => <FlagBadge on={e.mobile_app_enabled} label="Mobile app" />,
		},
		{
			key: "web_login_enabled",
			header: "Web Login",
			cell: (e) => <FlagBadge on={e.web_login_enabled} label="Web login" />,
		},
		{
			key: "mfa_enabled",
			header: "MFA",
			cell: (e) => <FlagBadge on={e.mfa_enabled} label="MFA" />,
		},
		{
			key: "is_bookable",
			header: "Bookable",
			cell: (e) => <FlagBadge on={e.is_bookable} label="Bookable" />,
		},
		{
			key: "is_online_bookable",
			header: "Online",
			cell: (e) => (
				<FlagBadge on={e.is_online_bookable} label="Online bookable" />
			),
		},
		{
			key: "is_active",
			header: "Status",
			sortable: true,
			cell: (e) => (
				<span
					className={
						e.is_active
							? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-600 text-xs"
							: "rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs"
					}
				>
					{e.is_active ? "Active" : "Inactive"}
				</span>
			),
		},
		{
			key: "actions",
			header: "Actions",
			align: "right",
			cell: (e) => (
				<div className="inline-flex gap-1">
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => setEditing(e)}
						aria-label="Edit"
					>
						<Pencil />
					</Button>
					{e.is_active && (
						<Button
							variant="ghost"
							size="icon-sm"
							disabled={pending}
							onClick={() => {
								if (
									!confirm(
										`Deactivate employee "${e.first_name} ${e.last_name}"?`,
									)
								)
									return;
								startTransition(async () => {
									await deactivateEmployeeAction(e.id);
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
				data={employees}
				columns={columns}
				getRowKey={(e) => e.id}
				searchKeys={["first_name", "last_name", "code", "phone"]}
				searchPlaceholder="Search employees…"
				emptyMessage="No employees yet. Click “New employee” to create one."
				minWidth={1100}
			/>
			<EmployeeFormSheet
				open={!!editing}
				employee={editing}
				roles={roles}
				positions={positions}
				onClose={() => setEditing(null)}
			/>
		</>
	);
}
