"use client";

import { BellOff, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CrmContact } from "@/components/chats/types";

type Props = {
	contacts: CrmContact[];
	onEdit: (contact: CrmContact) => void;
	isLoading: boolean;
};

function formatRelativeTime(ts: number): string {
	if (!ts) return "—";
	const diff = Date.now() - ts * (ts < 1e12 ? 1000 : 1);
	if (diff < 60_000) return "just now";
	if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
	if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
	return `${Math.floor(diff / 86_400_000)}d ago`;
}

export function ContactsTable({ contacts, onEdit, isLoading }: Props) {
	const columns: DataTableColumn<CrmContact>[] = [
		{
			key: "name",
			header: "Name",
			sortable: true,
			sortValue: (c) => c.name ?? c.jid,
			cell: (c) => (
				<button
					type="button"
					onClick={() => onEdit(c)}
					className="flex items-center gap-2 text-left font-medium hover:text-sky-600 hover:underline"
				>
					{c.imgUrl ? (
						<img
							src={c.imgUrl}
							alt=""
							className="size-7 rounded-full object-cover"
						/>
					) : (
						<div className="flex size-7 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground text-xs">
							{(c.name ?? "?").slice(0, 1).toUpperCase()}
						</div>
					)}
					<span className="truncate">{c.name || c.phone || c.jid}</span>
					{c.dnd && (
						<Tooltip>
							<TooltipTrigger asChild>
								<BellOff className="size-3.5 text-amber-600" />
							</TooltipTrigger>
							<TooltipContent>Do not disturb</TooltipContent>
						</Tooltip>
					)}
				</button>
			),
		},
		{
			key: "phone",
			header: "Phone",
			sortable: true,
			cell: (c) => (
				<span className="font-mono text-muted-foreground text-xs">
					{c.phone ? `+${c.phone}` : "—"}
				</span>
			),
		},
		{
			key: "tags",
			header: "Tags",
			cell: (c) => (
				<div className="flex flex-wrap gap-1">
					{c.tags.length === 0 ? (
						<span className="text-muted-foreground text-xs">—</span>
					) : (
						c.tags.map((t) => (
							<span
								key={t}
								className="rounded-full bg-sky-100 px-2 py-0.5 font-medium text-[11px] text-sky-800"
							>
								{t}
							</span>
						))
					)}
				</div>
			),
		},
		{
			key: "crmStatus",
			header: "Status",
			sortable: true,
			cell: (c) =>
				c.crmStatus ? (
					<span className="rounded-md bg-muted px-2 py-0.5 font-medium text-xs">
						{c.crmStatus}
					</span>
				) : (
					<span className="text-muted-foreground text-xs">—</span>
				),
		},
		{
			key: "assignedUser",
			header: "Assigned",
			sortable: true,
			cell: (c) =>
				c.assignedUser ? (
					<span className="text-xs">{c.assignedUser}</span>
				) : (
					<span className="text-muted-foreground text-xs">—</span>
				),
		},
		{
			key: "lastMessage",
			header: "Last message",
			cell: (c) => (
				<div className="max-w-[240px]">
					<div className="truncate text-sm">
						{c.lastMessageFromMe && (
							<span className="text-muted-foreground">You: </span>
						)}
						{c.lastMessage || (
							<span className="text-muted-foreground italic">No messages</span>
						)}
					</div>
					<div className="text-[11px] text-muted-foreground">
						{formatRelativeTime(c.lastMessageTime)}
					</div>
				</div>
			),
		},
		{
			key: "actions",
			header: "",
			align: "right",
			cell: (c) => (
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							size="icon"
							variant="ghost"
							onClick={() => onEdit(c)}
							aria-label="Edit contact"
						>
							<Pencil className="size-4" />
						</Button>
					</TooltipTrigger>
					<TooltipContent>Edit CRM fields</TooltipContent>
				</Tooltip>
			),
		},
	];

	return (
		<DataTable<CrmContact>
			data={contacts}
			columns={columns}
			getRowKey={(c) => c.jid}
			searchKeys={["name", "phone", "notes", "crmStatus", "assignedUser"]}
			searchPlaceholder="Search contacts…"
			emptyMessage={
				isLoading ? "Loading contacts…" : "No WhatsApp contacts yet."
			}
			pagination
		/>
	);
}
