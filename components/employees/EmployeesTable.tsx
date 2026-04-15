"use client";

import { Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { deleteEmployeeAction } from "@/lib/actions/employees";
import type { EmployeeWithRelations } from "@/lib/services/employees";
import type { OutletWithRoomCount } from "@/lib/services/outlets";
import type { Position } from "@/lib/services/positions";
import type { Role } from "@/lib/services/roles";
import { mediaPublicUrl } from "@/lib/storage/urls";
import { EmployeeFormDialog } from "./EmployeeForm";

type Props = {
	employees: EmployeeWithRelations[];
	roles: Role[];
	positions: Position[];
	outlets: OutletWithRoomCount[];
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

export function EmployeesTable({ employees, roles, positions, outlets }: Props) {
	const [editing, setEditing] = useState<EmployeeWithRelations | null>(null);
	const [deleting, setDeleting] = useState<EmployeeWithRelations | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	const columns: DataTableColumn<EmployeeWithRelations>[] = [
		{
			key: "name",
			header: "Name",
			sortable: true,
			sortValue: (e) => `${e.first_name} ${e.last_name}`,
			cell: (e) => {
				const imageUrl = mediaPublicUrl(e.profile_image_path);
				const initials =
					`${e.first_name?.[0] ?? ""}${e.last_name?.[0] ?? ""}`.toUpperCase();
				return (
					<div className="flex items-center gap-3">
						<div className="relative size-11 shrink-0 overflow-hidden rounded-full border bg-muted">
							{imageUrl ? (
								<Image
									src={imageUrl}
									alt=""
									fill
									sizes="44px"
									className="object-cover"
									unoptimized
								/>
							) : (
								<div className="flex size-full items-center justify-center font-medium text-muted-foreground text-xs">
									{initials || "?"}
								</div>
							)}
						</div>
						<div className="min-w-0">
							<div className="font-medium">
								{e.salutation ? `${e.salutation} ` : ""}
								{e.first_name} {e.last_name}
							</div>
							<div className="font-mono text-muted-foreground text-xs">
								{e.code}
							</div>
						</div>
					</div>
				);
			},
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
				<span className="text-muted-foreground">{e.position?.name ?? "—"}</span>
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
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={() => setEditing(e)}
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
									setDeleting(e);
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
				data={employees}
				columns={columns}
				getRowKey={(e) => e.id}
				searchKeys={["first_name", "last_name", "code", "phone"]}
				searchPlaceholder="Search employees…"
				emptyMessage="No employees yet. Click “New employee” to create one."
				minWidth={1100}
			/>
			<EmployeeFormDialog
				open={!!editing}
				employee={editing}
				roles={roles}
				positions={positions}
				outlets={outlets}
				onClose={() => setEditing(null)}
			/>
			<ConfirmDialog
				open={!!deleting}
				onOpenChange={(o) => {
					if (!o) setDeleting(null);
				}}
				title="Delete employee?"
				description={
					deleting
						? `"${deleting.first_name} ${deleting.last_name}" will be permanently removed along with their login. This cannot be undone.${actionError ? ` — ${actionError}` : ""}`
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
							await deleteEmployeeAction(target.id);
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
