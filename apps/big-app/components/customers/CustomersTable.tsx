"use client";

import {
	AlertTriangle,
	Bell,
	Check,
	Cigarette,
	Crown,
	IdCard,
	Mars,
	Megaphone,
	Minus,
	Pencil,
	Plane,
	Printer,
	Trash2,
	Venus,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useOutletPath } from "@/hooks/use-outlet-path";
import { deleteCustomerAction } from "@/lib/actions/customers";
import type { CustomerWithRelations } from "@/lib/services/customers";
import type { EmployeeWithRelations } from "@/lib/services/employees";
import type { OutletWithRoomCount } from "@/lib/services/outlets";
import { mediaPublicUrl } from "@/lib/storage/urls";
import { cn } from "@/lib/utils";
import { CustomerFormDialog } from "./CustomerForm";

type Props = {
	customers: CustomerWithRelations[];
	outlets: OutletWithRoomCount[];
	employees: EmployeeWithRelations[];
	defaultConsultantId: string | null;
};

function computeAgeShort(dob: string | null): string | null {
	if (!dob) return null;
	const d = new Date(dob);
	if (Number.isNaN(d.getTime())) return null;
	const now = new Date();
	let years = now.getFullYear() - d.getFullYear();
	let months = now.getMonth() - d.getMonth();
	if (now.getDate() < d.getDate()) months--;
	if (months < 0) {
		years--;
		months += 12;
	}
	return `${years} YR ${Math.max(months, 0)} MO`;
}

function initials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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
			key: "name",
			header: "Name",
			sortable: true,
			sortValue: (c) => `${c.first_name} ${c.last_name ?? ""}`,
			cell: (c) => <NameCell customer={c} />,
		},
		{
			key: "phone",
			header: "Phone",
			sortable: true,
			cell: (c) => <span className="text-muted-foreground">{c.phone}</span>,
		},
		{
			key: "notifications",
			header: (
				<Tooltip>
					<TooltipTrigger asChild>
						<span role="img" aria-label="Notifications" className="inline-flex">
							<Bell className="size-3.5" />
						</span>
					</TooltipTrigger>
					<TooltipContent>Notifications</TooltipContent>
				</Tooltip>
			),
			align: "center",
			sortable: true,
			sortValue: (c) => (c.opt_in_notifications ? 1 : 0),
			cell: (c) => (
				<OptInCell on={c.opt_in_notifications} label="Notifications" />
			),
		},
		{
			key: "marketing",
			header: (
				<Tooltip>
					<TooltipTrigger asChild>
						<span role="img" aria-label="Marketing" className="inline-flex">
							<Megaphone className="size-3.5" />
						</span>
					</TooltipTrigger>
					<TooltipContent>Marketing</TooltipContent>
				</Tooltip>
			),
			align: "center",
			sortable: true,
			sortValue: (c) => (c.opt_in_marketing ? 1 : 0),
			cell: (c) => <OptInCell on={c.opt_in_marketing} label="Marketing" />,
		},
		{
			key: "home_outlet",
			header: "Home outlet",
			sortable: true,
			sortValue: (c) => c.home_outlet?.name ?? "",
			cell: (c) => (
				<div className="flex flex-col">
					<span className="text-muted-foreground">
						{c.home_outlet?.name ?? "—"}
					</span>
					{c.source && (
						<span className="text-[10px] text-muted-foreground/70 uppercase">
							({c.source})
						</span>
					)}
				</div>
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
								className="text-amber-600 hover:bg-amber-50 hover:text-amber-700"
							>
								<Pencil />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Edit</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<span className="inline-flex">
								<Button
									variant="ghost"
									size="icon-sm"
									disabled
									aria-label="Print customer label (coming soon)"
									className="text-sky-600 hover:bg-sky-50 hover:text-sky-700 disabled:text-sky-600/50"
								>
									<Printer />
								</Button>
							</span>
						</TooltipTrigger>
						<TooltipContent>Print Customer Label (coming soon)</TooltipContent>
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
								className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
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

function NameCell({ customer: c }: { customer: CustomerWithRelations }) {
	const path = useOutletPath();
	const displayName = `${c.first_name} ${c.last_name ?? ""}`.trim();
	const imageUrl = mediaPublicUrl(c.profile_image_path ?? null);
	const age = computeAgeShort(c.date_of_birth);
	const salutation = c.salutation?.toUpperCase() ?? "";

	return (
		<div className="flex items-center gap-3">
			<Avatar size="lg">
				{imageUrl && <AvatarImage src={imageUrl} alt={displayName} />}
				<AvatarFallback>{initials(displayName)}</AvatarFallback>
			</Avatar>
			<div className="flex min-w-0 flex-col gap-0.5">
				<div className="flex min-w-0 items-center gap-1.5">
					{c.is_vip && (
						<IconBadge label="VIP" className="text-amber-600">
							<Crown className="size-3.5" />
						</IconBadge>
					)}
					{c.medical_alert && (
						<IconBadge
							label={`Medical alert: ${c.medical_alert}`}
							className="text-rose-600"
						>
							<AlertTriangle className="size-3.5" />
						</IconBadge>
					)}
					<Link
						href={path(`/customers/${c.id}`)}
						className="truncate font-semibold text-[15px] text-sky-800 uppercase leading-tight hover:underline"
					>
						{displayName}
						{salutation && (
							<span className="ml-1 font-normal text-muted-foreground">
								({salutation})
							</span>
						)}
					</Link>
				</div>
				<div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
					{c.gender && (
						<>
							<IconBadge
								label={c.gender === "male" ? "Male" : "Female"}
								className={
									c.gender === "male" ? "text-sky-600" : "text-pink-600"
								}
							>
								{c.gender === "male" ? (
									<Mars className="size-3" />
								) : (
									<Venus className="size-3" />
								)}
							</IconBadge>
							<span className="text-muted-foreground/50">·</span>
						</>
					)}
					{age && <span>{age}</span>}
					{age && <span className="text-muted-foreground/50">·</span>}
					<span className="font-mono">{c.code}</span>
					{c.smoker === "yes" && (
						<>
							<span className="text-muted-foreground/50">·</span>
							<IconBadge label="Smoker" className="text-rose-600">
								<Cigarette className="size-3" />
							</IconBadge>
						</>
					)}
					{c.id_number && (
						<>
							<span className="text-muted-foreground/50">·</span>
							<IconBadge
								label={`${c.id_type === "passport" ? "Passport" : "IC"}: ${c.id_number}`}
								className="text-sky-600"
							>
								{c.id_type === "passport" ? (
									<Plane className="size-3" />
								) : (
									<IdCard className="size-3" />
								)}
							</IconBadge>
						</>
					)}
				</div>
			</div>
		</div>
	);
}

function OptInCell({ on, label }: { on: boolean; label: string }) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span
					role="img"
					aria-label={`${label} ${on ? "on" : "off"}`}
					className={cn(
						"inline-flex size-5 items-center justify-center rounded-full",
						on
							? "bg-emerald-50 text-emerald-600"
							: "bg-muted text-muted-foreground/40",
					)}
				>
					{on ? <Check className="size-3" /> : <Minus className="size-3" />}
				</span>
			</TooltipTrigger>
			<TooltipContent>
				{label} {on ? "on" : "off"}
			</TooltipContent>
		</Tooltip>
	);
}

function IconBadge({
	label,
	className,
	children,
}: {
	label: string;
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span
					role="img"
					aria-label={label}
					className={cn(
						"inline-flex size-4 items-center justify-center",
						className,
					)}
				>
					{children}
				</span>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}
