"use client";

import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	deletePaymentMethodAction,
	updatePaymentMethodAction,
} from "@/lib/actions/payment-methods";
import type { PaymentMethod } from "@/lib/services/payment-methods";
import { PaymentMethodFormDialog } from "./PaymentMethodForm";

function fieldSummary(m: PaymentMethod): string {
	const parts: string[] = [];
	if (m.requires_bank) parts.push("Bank");
	if (m.requires_card_type) parts.push("Card type");
	if (m.requires_months) parts.push("Months");
	if (m.requires_trace_no) parts.push("Trace");
	if (m.requires_approval_code) parts.push("Approval");
	if (m.requires_reference_no) parts.push("Reference");
	if (m.requires_remarks) parts.push("Remarks");
	return parts.length > 0 ? parts.join(" · ") : "—";
}

export function PaymentMethodsTable({ methods }: { methods: PaymentMethod[] }) {
	const [editing, setEditing] = useState<PaymentMethod | null>(null);
	const [deleting, setDeleting] = useState<PaymentMethod | null>(null);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	const reorder = (method: PaymentMethod, dir: "up" | "down") => {
		const sorted = [...methods].sort((a, b) => a.sort_order - b.sort_order);
		const idx = sorted.findIndex((m) => m.id === method.id);
		const swap = dir === "up" ? sorted[idx - 1] : sorted[idx + 1];
		if (!swap) return;
		startTransition(async () => {
			try {
				await Promise.all([
					updatePaymentMethodAction(method.id, {
						name: method.name,
						is_active: method.is_active,
						sort_order: swap.sort_order,
					}),
					updatePaymentMethodAction(swap.id, {
						name: swap.name,
						is_active: swap.is_active,
						sort_order: method.sort_order,
					}),
				]);
			} catch {
				// no-op; RSC will re-render with original order if anything goes wrong
			}
		});
	};

	const columns: DataTableColumn<PaymentMethod>[] = [
		{
			key: "sort_order",
			header: "Order",
			align: "center",
			sortable: true,
			sortValue: (m) => m.sort_order,
			cell: (m) => {
				const sorted = [...methods].sort(
					(a, b) => a.sort_order - b.sort_order,
				);
				const idx = sorted.findIndex((x) => x.id === m.id);
				const isFirst = idx === 0;
				const isLast = idx === sorted.length - 1;
				return (
					<div className="inline-flex items-center gap-0.5">
						<Button
							variant="ghost"
							size="icon-sm"
							disabled={isFirst || pending}
							onClick={() => reorder(m, "up")}
							aria-label="Move up"
						>
							<ArrowUp className="size-3.5" />
						</Button>
						<Button
							variant="ghost"
							size="icon-sm"
							disabled={isLast || pending}
							onClick={() => reorder(m, "down")}
							aria-label="Move down"
						>
							<ArrowDown className="size-3.5" />
						</Button>
					</div>
				);
			},
		},
		{
			key: "name",
			header: "Name",
			sortable: true,
			sortValue: (m) => m.name,
			cell: (m) => (
				<button
					type="button"
					className="text-left font-medium text-primary hover:underline"
					onClick={() => setEditing(m)}
				>
					{m.name}
				</button>
			),
		},
		{
			key: "code",
			header: "Code",
			sortable: true,
			cell: (m) => (
				<span className="font-mono text-muted-foreground text-xs">
					{m.code}
				</span>
			),
		},
		{
			key: "fields",
			header: "Fields",
			cell: (m) => (
				<span className="text-muted-foreground text-xs">
					{fieldSummary(m)}
				</span>
			),
		},
		{
			key: "is_builtin",
			header: "Built-in",
			align: "center",
			cell: (m) =>
				m.is_builtin ? (
					<Badge variant="outline" className="text-xs">
						Built-in
					</Badge>
				) : (
					<Badge variant="secondary" className="text-xs">
						Custom
					</Badge>
				),
		},
		{
			key: "is_active",
			header: "Active",
			align: "center",
			sortable: true,
			sortValue: (m) => (m.is_active ? 1 : 0),
			cell: (m) =>
				m.is_active ? (
					<Badge variant="default" className="text-xs">
						Active
					</Badge>
				) : (
					<Badge variant="outline" className="text-xs">
						Inactive
					</Badge>
				),
		},
		{
			key: "actions",
			header: "",
			align: "right",
			cell: (m) => (
				<div className="inline-flex gap-1">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={() => setEditing(m)}
								aria-label="Edit"
							>
								<Pencil />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Edit</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<span>
								<Button
									variant="ghost"
									size="icon-sm"
									disabled={m.is_builtin}
									onClick={() => {
										setDeleteError(null);
										setDeleting(m);
									}}
									aria-label="Delete"
								>
									<Trash2 />
								</Button>
							</span>
						</TooltipTrigger>
						<TooltipContent>
							{m.is_builtin ? "Built-in methods cannot be deleted" : "Delete"}
						</TooltipContent>
					</Tooltip>
				</div>
			),
		},
	];

	return (
		<>
			<DataTable
				data={methods}
				columns={columns}
				getRowKey={(m) => m.id}
				searchKeys={["name", "code"]}
				searchPlaceholder="Search payment methods…"
				emptyMessage="No payment methods yet."
			/>
			<PaymentMethodFormDialog
				open={!!editing}
				method={editing}
				onClose={() => setEditing(null)}
			/>
			<ConfirmDialog
				open={!!deleting}
				onOpenChange={(o) => {
					if (!o) setDeleting(null);
				}}
				title="Delete payment method?"
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
							await deletePaymentMethodAction(target.id);
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
