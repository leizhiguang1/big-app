"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { AdminBrandRow } from "@/lib/services/platform-admin";
import { NewBrandDialog } from "./NewBrandDialog";

type Props = {
	brands: AdminBrandRow[];
	rootHost: string;
	protocol: string;
};

function brandUrl(protocol: string, rootHost: string, sub: string): string {
	if (!rootHost) return "#";
	return `${protocol}://${sub}.${rootHost}/login`;
}

export function AdminBrandsClient({ brands, rootHost, protocol }: Props) {
	const [newOpen, setNewOpen] = useState(false);

	const columns: DataTableColumn<AdminBrandRow>[] = [
		{
			key: "code",
			header: "Code",
			cell: (r) => <span className="font-mono text-xs">{r.code}</span>,
			sortable: true,
			sortValue: (r) => r.code,
		},
		{
			key: "name",
			header: "Name",
			cell: (r) => (
				<div>
					<div className="font-medium">{r.nickname || r.name}</div>
					{r.nickname && (
						<div className="text-xs text-muted-foreground">{r.name}</div>
					)}
				</div>
			),
			sortable: true,
			sortValue: (r) => r.nickname || r.name,
		},
		{
			key: "subdomain",
			header: "Subdomain",
			cell: (r) => (
				<a
					href={brandUrl(protocol, rootHost, r.subdomain)}
					className="text-sm text-primary hover:underline"
					target="_blank"
					rel="noreferrer"
				>
					{r.subdomain}.{rootHost.split(":")[0]}
				</a>
			),
			sortable: true,
			sortValue: (r) => r.subdomain,
		},
		{
			key: "currency_code",
			header: "Currency",
			cell: (r) => <span className="font-mono text-xs">{r.currency_code}</span>,
			align: "center",
			sortable: true,
			sortValue: (r) => r.currency_code,
		},
		{
			key: "employees",
			header: "Employees",
			cell: (r) => r.employee_count,
			align: "right",
			sortable: true,
			sortValue: (r) => r.employee_count,
		},
		{
			key: "status",
			header: "Status",
			cell: (r) => (
				<Badge variant={r.is_active ? "default" : "secondary"}>
					{r.is_active ? "Active" : "Inactive"}
				</Badge>
			),
			align: "center",
			sortable: true,
			sortValue: (r) => (r.is_active ? "1" : "0"),
		},
		{
			key: "created_at",
			header: "Created",
			cell: (r) =>
				new Date(r.created_at).toLocaleDateString("en-GB", {
					day: "2-digit",
					month: "short",
					year: "numeric",
				}),
			sortable: true,
			sortValue: (r) => r.created_at,
		},
	];

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Brands</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Every workspace on the platform. Click a subdomain to open its
						sign-in page.
					</p>
				</div>
				<Button onClick={() => setNewOpen(true)}>
					<Plus className="mr-1 h-4 w-4" />
					New brand
				</Button>
			</div>

			<DataTable
				data={brands}
				columns={columns}
				getRowKey={(r) => r.id}
				searchKeys={["code", "name", "nickname", "subdomain"]}
				searchPlaceholder="Search by code, name, or subdomain"
				emptyMessage="No brands yet. Create the first one."
			/>

			<NewBrandDialog
				open={newOpen}
				onClose={() => setNewOpen(false)}
				rootHost={rootHost}
			/>
		</div>
	);
}
