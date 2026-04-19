"use client";

import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { deleteCustomerAction } from "@/lib/actions/customers";
import type { CustomerWithRelations } from "@/lib/services/customers";
import type { EmployeeWithRelations } from "@/lib/services/employees";
import type { OutletWithRoomCount } from "@/lib/services/outlets";
import { CustomerFormDialog } from "./CustomerForm";

type Props = {
	customers: CustomerWithRelations[];
	outlets: OutletWithRoomCount[];
	employees: EmployeeWithRelations[];
	defaultConsultantId: string | null;
};

export function CustomersTable({
	customers,
	outlets,
	employees,
	defaultConsultantId,
}: Props) {
	const [editing, setEditing] = useState<CustomerWithRelations | null>(null);
	const [deleting, setDeleting] = useState<CustomerWithRelations | null>(null);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	const columns: DataTableColumn<CustomerWithRelations>[] = [
		{
			key: "code",
			header: "Code",
			sortable: true,
			cell: (c) => (
				<Link
					href={`/customers/${c.id}`}
					className="font-mono text-muted-foreground text-xs hover:text-sky-600 hover:underline"
				>
					{c.code}
				</Link>
			),
		},
		{
			key: "name",
			header: "Name",
			sortable: true,
			sortValue: (c) => `${c.first_name} ${c.last_name ?? ""}`,
			cell: (c) => (
				<div className="flex items-center gap-2">
					<div>
						<Link
							href={`/customers/${c.id}`}
							className="font-medium hover:text-sky-600 hover:underline"
						>
							{c.salutation} {c.first_name} {c.last_name ?? ""}
						</Link>
					</div>
					{c.is_vip && (
						<span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-medium text-amber-600 text-xs">
							VIP
						</span>
					)}
				</div>
			),
		},
		{
			key: "phone",
			header: "Phone",
			sortable: true,
			cell: (c) => <span className="text-muted-foreground">{c.phone}</span>,
		},
		{
			key: "id_number",
			header: "IC / Passport",
			cell: (c) => (
				<span className="font-mono text-muted-foreground text-xs">
					{c.id_number ?? "—"}
				</span>
			),
		},
		{
			key: "home_outlet",
			header: "Home outlet",
			sortable: true,
			sortValue: (c) => c.home_outlet?.name ?? "",
			cell: (c) => (
				<span className="text-muted-foreground">
					{c.home_outlet?.name ?? "—"}
				</span>
			),
		},
		{
			key: "consultant",
			header: "Consultant",
			sortable: true,
			sortValue: (c) =>
				c.consultant
					? `${c.consultant.first_name} ${c.consultant.last_name}`
					: "",
			cell: (c) => (
				<span className="text-muted-foreground">
					{c.consultant
						? `${c.consultant.first_name} ${c.consultant.last_name}`
						: "—"}
				</span>
			),
		},
		{
			key: "join_date",
			header: "Joined",
			sortable: true,
			cell: (c) => <span className="text-muted-foreground">{c.join_date}</span>,
		},
		{
			key: "actions",
			header: "Actions",
			align: "right",
			cell: (c) => (
				<div className="inline-flex gap-1">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={() => setEditing(c)}
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
									setDeleteError(null);
									setDeleting(c);
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
				data={customers}
				columns={columns}
				getRowKey={(c) => c.id}
				searchKeys={["first_name", "last_name", "code", "phone", "id_number"]}
				searchPlaceholder="Search by name, phone, IC/passport…"
				emptyMessage="No customers yet. Click “New customer” to create one."
				minWidth={1000}
			/>
			<CustomerFormDialog
				open={!!editing}
				customer={editing}
				outlets={outlets}
				employees={employees}
				defaultConsultantId={defaultConsultantId}
				onClose={() => setEditing(null)}
			/>
			<ConfirmDialog
				open={!!deleting}
				onOpenChange={(o) => {
					if (!o) setDeleting(null);
				}}
				title="Delete customer?"
				description={
					deleting
						? `"${deleting.first_name} ${deleting.last_name ?? ""}" will be permanently removed. This cannot be undone.${deleteError ? ` — ${deleteError}` : ""}`
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
							await deleteCustomerAction(target.id);
							setDeleting(null);
						} catch (err) {
							setDeleteError(
								err instanceof Error ? err.message : "Failed to delete",
							);
						}
					});
				}}
			/>
		</>
	);
}
