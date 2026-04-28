"use client";

import { Printer, X } from "lucide-react";
import { useMemo, useState } from "react";
import { PaymentsTable } from "@/components/sales/PaymentsTable";
import { SalesOrderDetailDialog } from "@/components/sales/SalesOrderDetailDialog";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { Outlet } from "@/lib/services/outlets";
import type { PaymentWithRelations } from "@/lib/services/sales";

type Props = {
	payments: PaymentWithRelations[];
	outlets: Outlet[];
};

const ALL = "__all__";
const CURRENT_YEAR = new Date().getFullYear();

const STATUS_OPTIONS: {
	value: string;
	label: string;
}[] = [
	{ value: ALL, label: "All Status" },
	{ value: "completed", label: "Completed" },
	{ value: "draft", label: "Draft" },
	{ value: "cancelled", label: "Cancelled" },
	{ value: "void", label: "Void" },
];

const E_INVOICE_OPTIONS: {
	value: string;
	label: string;
}[] = [
	{ value: ALL, label: "All e-Invoice Type" },
	{ value: "not_sent", label: "Not sent to LHDN" },
	{ value: "pending", label: "Pending submission" },
	{ value: "submitted", label: "Submitted" },
];

export function PaymentsTableWithDetail({ payments, outlets }: Props) {
	const [openId, setOpenId] = useState<string | null>(null);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

	const [year, setYear] = useState<string>(String(CURRENT_YEAR));
	const [outletId, setOutletId] = useState<string>(ALL);
	const [status, setStatus] = useState<string>(ALL);
	const [eInvoice, setEInvoice] = useState<string>(ALL);

	const years = useMemo(() => {
		const set = new Set<number>();
		for (const p of payments) set.add(new Date(p.paid_at).getFullYear());
		set.add(CURRENT_YEAR);
		return Array.from(set).sort((a, b) => b - a);
	}, [payments]);

	const filtered = useMemo(() => {
		return payments.filter((p) => {
			if (year && new Date(p.paid_at).getFullYear() !== Number(year))
				return false;
			if (outletId !== ALL && p.outlet?.id !== outletId) return false;
			if (status !== ALL && p.sales_order?.status !== status) return false;
			if (eInvoice !== ALL && eInvoice !== "not_sent") return false;
			return true;
		});
	}, [payments, year, outletId, status, eInvoice]);

	const toggleSelect = (id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const toggleSelectAll = (checked: boolean) => {
		if (checked) setSelectedIds(new Set(filtered.map((p) => p.id)));
		else setSelectedIds(new Set());
	};

	const clearSelection = () => setSelectedIds(new Set());

	const printSelected = () => {
		const soIds = Array.from(selectedIds)
			.map((pid) => payments.find((p) => p.id === pid)?.sales_order?.id)
			.filter((id): id is string => Boolean(id));
		const unique = Array.from(new Set(soIds));
		for (const id of unique) {
			window.open(
				`/invoices/${id}?autoPrint=1&variant=receipt`,
				"_blank",
				"noopener",
			);
		}
		clearSelection();
	};

	return (
		<>
			<div className="flex flex-wrap items-center gap-2">
				<Select value={year} onValueChange={setYear}>
					<SelectTrigger className="h-9 w-[120px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{years.map((y) => (
							<SelectItem key={y} value={String(y)}>
								{y}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select value={outletId} onValueChange={setOutletId}>
					<SelectTrigger className="h-9 w-[160px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={ALL}>All Outlet</SelectItem>
						{outlets.map((o) => (
							<SelectItem key={o.id} value={o.id}>
								{o.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select value={status} onValueChange={setStatus}>
					<SelectTrigger className="h-9 w-[150px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{STATUS_OPTIONS.map((s) => (
							<SelectItem key={s.value} value={s.value}>
								{s.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select value={eInvoice} onValueChange={setEInvoice}>
					<SelectTrigger className="h-9 w-[180px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{E_INVOICE_OPTIONS.map((e) => (
							<SelectItem key={e.value} value={e.value}>
								{e.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<div className="ml-auto text-muted-foreground text-sm">
					{filtered.length} payment record{filtered.length === 1 ? "" : "s"}
				</div>
			</div>

			<PaymentsTable
				payments={filtered}
				onOpen={setOpenId}
				selectedIds={selectedIds}
				onToggleSelect={toggleSelect}
				onToggleSelectAll={toggleSelectAll}
			/>

			{selectedIds.size > 0 && (
				<div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center">
					<div className="pointer-events-auto flex items-center gap-3 rounded-full border bg-background px-4 py-2 shadow-lg">
						<span className="text-sm">{selectedIds.size} selected</span>
						<Button size="sm" onClick={printSelected}>
							<Printer className="mr-1.5 size-4" />
							Print {selectedIds.size} receipt
							{selectedIds.size === 1 ? "" : "s"}
						</Button>
						<Button
							size="sm"
							variant="ghost"
							onClick={clearSelection}
							aria-label="Clear selection"
						>
							<X className="size-4" />
						</Button>
					</div>
				</div>
			)}

			<SalesOrderDetailDialog
				open={openId !== null}
				onOpenChange={(open) => {
					if (!open) setOpenId(null);
				}}
				salesOrderId={openId}
			/>
		</>
	);
}
