"use client";

import { Pencil, Plus, QrCode, RotateCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ConnectionStatus, WAAccount } from "@/components/chats/types";

const STATUS_LABEL: Record<string, string> = {
	open: "Connected",
	connecting: "Connecting…",
	qr: "Needs QR",
	close: "Disconnected",
	logged_out: "Logged out",
	waiting_qr: "Waiting QR",
	stream_replaced: "Stream replaced",
	rate_limited: "Rate limited",
	nuked: "Reset",
	closed_for_qr: "Closed for QR",
	qr_retry: "QR retry",
	deferred_to_acct: "Deferred",
};

function statusVariant(
	status: ConnectionStatus | undefined,
): "success" | "warning" | "destructive" | "outline" {
	if (status === "open") return "success";
	if (status === "qr" || status === "connecting" || status === "waiting_qr")
		return "warning";
	if (status === "logged_out" || status === "close") return "destructive";
	return "outline";
}

type Outlet = { id: string; name: string };

type Props = {
	accounts: WAAccount[];
	statusPerAccount: Record<string, ConnectionStatus>;
	qrPerAccount: Record<string, string>;
	outlets?: Outlet[];
	onAddAccount: (label: string, url: string, outlet?: string) => void;
	onUpdateAccount: (id: string, updates: Partial<WAAccount>) => void;
	onRemoveAccount: (id: string) => void;
	onRequestQR: (id: string) => void;
	onLogoutAccount: (id: string) => void;
	projectBackendUrl: string;
};

export function WALinesPanel({
	accounts,
	statusPerAccount,
	qrPerAccount,
	outlets = [],
	onAddAccount,
	onUpdateAccount,
	onRemoveAccount,
	onRequestQR,
	onLogoutAccount,
	projectBackendUrl,
}: Props) {
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editLabel, setEditLabel] = useState("");
	const [editOutlet, setEditOutlet] = useState("");
	const [newLabel, setNewLabel] = useState("");
	const [newUrl, setNewUrl] = useState("");
	const [newOutlet, setNewOutlet] = useState("");
	const [removingLine, setRemovingLine] = useState<WAAccount | null>(null);
	const [logoutLine, setLogoutLine] = useState<WAAccount | null>(null);

	const startEdit = (acct: WAAccount) => {
		setEditingId(acct.id);
		setEditLabel(acct.label);
		setEditOutlet(acct.outlet ?? "");
	};

	const saveEdit = (id: string) => {
		onUpdateAccount(id, {
			label: editLabel.trim() || "Unnamed",
			outlet: editOutlet.trim(),
		});
		setEditingId(null);
	};

	const handleAddLine = (e: React.FormEvent) => {
		e.preventDefault();
		const url = projectBackendUrl || newUrl.trim();
		if (!newLabel.trim() || !url) return;
		onAddAccount(newLabel.trim(), url, newOutlet.trim());
		setNewLabel("");
		setNewUrl("");
		setNewOutlet("");
	};

	return (
		<section className="rounded-lg border bg-card">
			<header className="flex items-center justify-between gap-2 border-b px-5 py-3">
				<div>
					<h3 className="font-semibold text-sm">WhatsApp Lines</h3>
					<p className="text-muted-foreground text-xs">
						Each line is its own Baileys session and chat history.
					</p>
				</div>
				<Badge variant="secondary">{accounts.length}</Badge>
			</header>

			<div className="flex flex-col divide-y">
				{accounts.map((acct, idx) => {
					const status = statusPerAccount[acct.id];
					const qr = qrPerAccount[acct.id];
					const isEditing = editingId === acct.id;
					return (
						<div key={acct.id} className="flex flex-col gap-3 px-5 py-4">
							<div className="flex flex-wrap items-center justify-between gap-2">
								<div className="flex flex-1 items-center gap-2">
									{isEditing ? (
										<Input
											value={editLabel}
											onChange={(e) => setEditLabel(e.target.value)}
											autoFocus
											onKeyDown={(e) => {
												if (e.key === "Enter") saveEdit(acct.id);
												if (e.key === "Escape") setEditingId(null);
											}}
											className="max-w-xs"
										/>
									) : (
										<span className="font-medium text-sm">{acct.label}</span>
									)}
									<Badge variant={statusVariant(status)}>
										{STATUS_LABEL[status ?? "connecting"] ?? status ?? "—"}
									</Badge>
									{idx === 0 && <Badge variant="outline">Primary</Badge>}
								</div>
								<div className="flex items-center gap-1.5">
									{isEditing ? (
										<>
											<Button size="sm" onClick={() => saveEdit(acct.id)}>
												Save
											</Button>
											<Button
												size="sm"
												variant="ghost"
												onClick={() => setEditingId(null)}
											>
												Cancel
											</Button>
										</>
									) : (
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													size="icon"
													variant="ghost"
													onClick={() => startEdit(acct)}
													aria-label="Rename"
												>
													<Pencil className="size-4" />
												</Button>
											</TooltipTrigger>
											<TooltipContent>Rename line</TooltipContent>
										</Tooltip>
									)}
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												size="sm"
												variant="outline"
												onClick={() => onRequestQR(acct.id)}
											>
												<QrCode className="size-4" />
												{status === "open"
													? "Switch / Reconnect"
													: status === "qr"
														? "Scan QR"
														: "Reconnect"}
											</Button>
										</TooltipTrigger>
										<TooltipContent>
											Generate a fresh QR code for this line
										</TooltipContent>
									</Tooltip>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												size="icon"
												variant="ghost"
												onClick={() => setLogoutLine(acct)}
												aria-label="Log out WA"
											>
												<RotateCw className="size-4" />
											</Button>
										</TooltipTrigger>
										<TooltipContent>Log out WhatsApp on this line</TooltipContent>
									</Tooltip>
									{accounts.length > 1 && (
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													size="icon"
													variant="ghost"
													onClick={() => setRemovingLine(acct)}
													aria-label="Remove line"
												>
													<Trash2 className="size-4 text-destructive" />
												</Button>
											</TooltipTrigger>
											<TooltipContent>Remove this line</TooltipContent>
										</Tooltip>
									)}
								</div>
							</div>

							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
								<div className="flex items-center gap-2 text-xs">
									<span className="text-muted-foreground">Outlet:</span>
									{isEditing ? (
										outlets.length > 0 ? (
											<Select value={editOutlet} onValueChange={setEditOutlet}>
												<SelectTrigger className="h-8 w-full max-w-[220px]">
													<SelectValue placeholder="— Not assigned —" />
												</SelectTrigger>
												<SelectContent>
													{outlets.map((o) => (
														<SelectItem key={o.id} value={o.name}>
															{o.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										) : (
											<Input
												value={editOutlet}
												onChange={(e) => setEditOutlet(e.target.value)}
												placeholder="e.g. Main Clinic"
												className="h-8 max-w-[220px]"
											/>
										)
									) : (
										<span>
											{acct.outlet || (
												<span className="italic text-muted-foreground/70">
													Not assigned
												</span>
											)}
										</span>
									)}
								</div>
								<div className="truncate text-xs">
									<span className="text-muted-foreground">Backend: </span>
									<span className="font-mono">
										{projectBackendUrl ? "Shared project backend" : acct.url}
									</span>
								</div>
								{qr && (
									<div className="col-span-full mt-2 flex flex-col items-center gap-2 rounded-md border bg-muted/30 p-3">
										{/* biome-ignore lint/performance/noImgElement: data URL */}
										<img
											src={qr}
											alt="WhatsApp QR"
											className="size-44 rounded-md shadow-sm"
										/>
										<p className="font-medium text-xs">Scan with WhatsApp</p>
										<ol className="list-inside list-decimal text-[11px] text-muted-foreground">
											<li>Open WhatsApp on your phone</li>
											<li>Settings → Linked Devices → Link a Device</li>
											<li>Scan this QR</li>
										</ol>
									</div>
								)}
							</div>
						</div>
					);
				})}
			</div>

			<form
				onSubmit={handleAddLine}
				className="flex flex-col gap-3 border-t bg-muted/20 px-5 py-4"
			>
				<div className="flex items-center gap-2 font-medium text-sm">
					<Plus className="size-4" />
					Add WhatsApp Line
				</div>
				<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
					<div>
						<Label htmlFor="new-label" className="text-xs">
							Label
						</Label>
						<Input
							id="new-label"
							value={newLabel}
							onChange={(e) => setNewLabel(e.target.value)}
							placeholder="e.g. Branch 2"
							className="mt-1"
						/>
					</div>
					{!projectBackendUrl && (
						<div>
							<Label htmlFor="new-url" className="text-xs">
								Backend URL
							</Label>
							<Input
								id="new-url"
								value={newUrl}
								onChange={(e) => setNewUrl(e.target.value)}
								placeholder="https://….railway.app"
								className="mt-1"
							/>
						</div>
					)}
					<div>
						<Label htmlFor="new-outlet" className="text-xs">
							Outlet (optional)
						</Label>
						{outlets.length > 0 ? (
							<Select value={newOutlet} onValueChange={setNewOutlet}>
								<SelectTrigger id="new-outlet" className="mt-1">
									<SelectValue placeholder="— Outlet —" />
								</SelectTrigger>
								<SelectContent>
									{outlets.map((o) => (
										<SelectItem key={o.id} value={o.name}>
											{o.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						) : (
							<Input
								id="new-outlet"
								value={newOutlet}
								onChange={(e) => setNewOutlet(e.target.value)}
								placeholder="Optional"
								className="mt-1"
							/>
						)}
					</div>
					<div className="flex items-end">
						<Button
							type="submit"
							disabled={
								!newLabel.trim() || (!projectBackendUrl && !newUrl.trim())
							}
						>
							<Plus className="size-4" /> Add Line
						</Button>
					</div>
				</div>
			</form>

			<ConfirmDialog
				open={!!removingLine}
				onOpenChange={(o) => !o && setRemovingLine(null)}
				title="Remove line?"
				description={
					removingLine
						? `"${removingLine.label}" will be removed from this device. Any active WA session is logged out.`
						: ""
				}
				confirmLabel="Remove"
				variant="destructive"
				onConfirm={() => {
					if (removingLine) onRemoveAccount(removingLine.id);
					setRemovingLine(null);
				}}
			/>
			<ConfirmDialog
				open={!!logoutLine}
				onOpenChange={(o) => !o && setLogoutLine(null)}
				title="Log out WhatsApp?"
				description={
					logoutLine
						? `"${logoutLine.label}" will end its WhatsApp session. Chat history is kept; you can scan a fresh QR after.`
						: ""
				}
				confirmLabel="Log out"
				variant="destructive"
				onConfirm={() => {
					if (logoutLine) onLogoutAccount(logoutLine.id);
					setLogoutLine(null);
				}}
			/>
		</section>
	);
}
