"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { deleteCustomerAction } from "@/lib/actions/customers";
import type { CustomerWithRelations } from "@/lib/services/customers";
import type { EmployeeWithRelations } from "@/lib/services/employees";
import type { OutletWithRoomCount } from "@/lib/services/outlets";
import { CustomerFormSheet } from "./CustomerForm";

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
	const [pending, startTransition] = useTransition();

	const columns: DataTableColumn<CustomerWithRelations>[] = [
		{
			key: "code",
			header: "Code",
			sortable: true,
			cell: (c) => (
				<span className="font-mono text-muted-foreground text-xs">
					{c.code}
				</span>
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
						<div className="font-medium">
							{c.salutation} {c.first_name} {c.last_name ?? ""}
						</div>
						{c.allergies && (
							<div className="text-destructive text-xs">⚠ {c.allergies}</div>
						)}
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
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => setEditing(c)}
						aria-label="Edit"
					>
						<Pencil />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						disabled={pending}
						onClick={() => {
							if (
								!confirm(
									`Delete customer "${c.first_name} ${c.last_name ?? ""}"? This cannot be undone.`,
								)
							)
								return;
							startTransition(async () => {
								try {
									await deleteCustomerAction(c.id);
								} catch (err) {
									alert(
										err instanceof Error ? err.message : "Failed to delete",
									);
								}
							});
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
				data={customers}
				columns={columns}
				getRowKey={(c) => c.id}
				searchKeys={["first_name", "last_name", "code", "phone", "id_number"]}
				searchPlaceholder="Search by name, phone, IC/passport…"
				emptyMessage="No customers yet. Click “New customer” to create one."
				minWidth={1000}
			/>
			<CustomerFormSheet
				open={!!editing}
				customer={editing}
				outlets={outlets}
				employees={employees}
				defaultConsultantId={defaultConsultantId}
				onClose={() => setEditing(null)}
			/>
		</>
	);
}
