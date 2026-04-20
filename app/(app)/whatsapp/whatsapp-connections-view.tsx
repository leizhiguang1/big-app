"use client";

import { Loader2, RefreshCcw, Send, Smartphone, Unplug } from "lucide-react";
import {
	useCallback,
	useEffect,
	useMemo,
	useState,
	useTransition,
} from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	connectOutletAction,
	disconnectOutletAction,
	getOutletQrAction,
	getOutletStatusAction,
	sendTestMessageAction,
} from "@/lib/actions/whatsapp";
import type { OutletWaStatus } from "@/lib/services/whatsapp";

type StatusKind = OutletWaStatus["status"];

function StatusBadge({
	status,
	phone,
}: {
	status: StatusKind;
	phone: string | null;
}) {
	switch (status) {
		case "connected":
			return (
				<Badge variant="success">Connected{phone ? ` · ${phone}` : ""}</Badge>
			);
		case "pairing":
			return <Badge variant="warning">Pairing</Badge>;
		case "reconnecting":
			return <Badge variant="warning">Reconnecting</Badge>;
		case "disconnected":
			return <Badge variant="destructive">Disconnected</Badge>;
		default:
			return <Badge variant="outline">Not connected</Badge>;
	}
}

export function WhatsAppConnectionsView({
	outlets,
}: {
	outlets: OutletWaStatus[];
}) {
	const [qrOutletId, setQrOutletId] = useState<string | null>(null);
	const [testOutletId, setTestOutletId] = useState<string | null>(null);

	const qrOutlet = qrOutletId
		? outlets.find((o) => o.outlet.id === qrOutletId)
		: null;
	const testOutlet = testOutletId
		? outlets.find((o) => o.outlet.id === testOutletId)
		: null;

	if (outlets.length === 0) {
		return (
			<div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
				No active outlets yet. Create one in Config → Outlets first.
			</div>
		);
	}

	return (
		<>
			<div className="grid gap-3 md:grid-cols-2">
				{outlets.map((row) => (
					<OutletCard
						key={row.outlet.id}
						row={row}
						onOpenQr={() => setQrOutletId(row.outlet.id)}
						onOpenTest={() => setTestOutletId(row.outlet.id)}
					/>
				))}
			</div>

			{qrOutlet ? (
				<QrDialog outlet={qrOutlet} onClose={() => setQrOutletId(null)} />
			) : null}

			{testOutlet ? (
				<TestSendDialog
					outlet={testOutlet}
					onClose={() => setTestOutletId(null)}
				/>
			) : null}
		</>
	);
}

function OutletCard({
	row,
	onOpenQr,
	onOpenTest,
}: {
	row: OutletWaStatus;
	onOpenQr: () => void;
	onOpenTest: () => void;
}) {
	const [pending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);
	const isConnected = row.status === "connected";
	const hasConnection = row.outlet.wa_connection_id != null;

	const handleConnect = () => {
		setError(null);
		startTransition(async () => {
			try {
				await connectOutletAction(row.outlet.id);
				onOpenQr();
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to connect");
			}
		});
	};

	const handleDisconnect = () => {
		if (!confirm(`Disconnect WhatsApp from ${row.outlet.name}?`)) return;
		setError(null);
		startTransition(async () => {
			try {
				await disconnectOutletAction(row.outlet.id);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to disconnect");
			}
		});
	};

	return (
		<div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
			<div className="flex items-start justify-between gap-2">
				<div className="flex items-center gap-2">
					<Smartphone className="size-5 text-muted-foreground" />
					<div>
						<div className="font-medium">{row.outlet.name}</div>
						<div className="text-muted-foreground text-xs">
							{row.outlet.code}
						</div>
					</div>
				</div>
				<StatusBadge status={row.status} phone={row.phone} />
			</div>

			{error ? (
				<div className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-xs">
					{error}
				</div>
			) : null}

			<div className="flex flex-wrap gap-2">
				{!hasConnection ? (
					<Button size="sm" onClick={handleConnect} disabled={pending}>
						{pending ? <Loader2 className="animate-spin" /> : <Smartphone />}
						Connect
					</Button>
				) : (
					<>
						{!isConnected ? (
							<Button size="sm" variant="outline" onClick={onOpenQr}>
								<RefreshCcw />
								Show QR
							</Button>
						) : null}
						{isConnected ? (
							<Button size="sm" variant="outline" onClick={onOpenTest}>
								<Send />
								Send test
							</Button>
						) : null}
						<Button
							size="sm"
							variant="outline"
							onClick={handleDisconnect}
							disabled={pending}
						>
							{pending ? <Loader2 className="animate-spin" /> : <Unplug />}
							Disconnect
						</Button>
					</>
				)}
			</div>
		</div>
	);
}

function QrDialog({
	outlet,
	onClose,
}: {
	outlet: OutletWaStatus;
	onClose: () => void;
}) {
	const [qr, setQr] = useState<string | null>(null);
	const [status, setStatus] = useState<StatusKind>(outlet.status);
	const [phone, setPhone] = useState<string | null>(outlet.phone);
	const [error, setError] = useState<string | null>(null);

	const poll = useCallback(async () => {
		try {
			const [qrRes, statusRes] = await Promise.all([
				getOutletQrAction(outlet.outlet.id),
				getOutletStatusAction(outlet.outlet.id),
			]);
			setQr(qrRes.qr_code);
			setStatus(statusRes.status);
			setPhone(statusRes.phone);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load QR");
		}
	}, [outlet.outlet.id]);

	useEffect(() => {
		poll();
		const t = setInterval(poll, 3000);
		return () => clearInterval(t);
	}, [poll]);

	const isConnected = status === "connected";

	return (
		<Dialog open onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Pair {outlet.outlet.name}</DialogTitle>
					<DialogDescription>
						Open WhatsApp → Settings → Linked devices → Link a device, then scan
						the code below.
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col items-center justify-center gap-3 py-4">
					{isConnected ? (
						<div className="flex flex-col items-center gap-2">
							<Badge variant="success">
								Connected{phone ? ` · ${phone}` : ""}
							</Badge>
							<p className="text-muted-foreground text-sm">
								Pairing complete. You can close this dialog.
							</p>
						</div>
					) : qr ? (
						<QrImage data={qr} />
					) : error ? (
						<div className="text-destructive text-sm">{error}</div>
					) : (
						<div className="flex items-center gap-2 text-muted-foreground text-sm">
							<Loader2 className="size-4 animate-spin" /> Waiting for QR…
						</div>
					)}
					<div className="text-muted-foreground text-xs">
						Status: <StatusBadge status={status} phone={phone} />
					</div>
				</div>

				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline">Close</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function QrImage({ data }: { data: string }) {
	const src = useMemo(
		() =>
			data.startsWith("data:")
				? data
				: `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(data)}`,
		[data],
	);
	return (
		// biome-ignore lint/performance/noImgElement: data URL / external QR generator, not a static asset
		<img
			src={src}
			alt="WhatsApp pairing QR"
			className="h-64 w-64 rounded-md border bg-white p-2"
		/>
	);
}

function TestSendDialog({
	outlet,
	onClose,
}: {
	outlet: OutletWaStatus;
	onClose: () => void;
}) {
	const [to, setTo] = useState("");
	const [text, setText] = useState("Hello from BIG 👋");
	const [result, setResult] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	const handleSend = () => {
		setError(null);
		setResult(null);
		startTransition(async () => {
			try {
				const { message_id } = await sendTestMessageAction(
					outlet.outlet.id,
					to,
					text,
				);
				setResult(message_id);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to send");
			}
		});
	};

	return (
		<Dialog open onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Send test from {outlet.outlet.name}</DialogTitle>
					<DialogDescription>
						One-off sanity check. Use your own number in international format.
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-3 py-2">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="wa-test-to">Recipient phone</Label>
						<Input
							id="wa-test-to"
							placeholder="60123456789"
							value={to}
							onChange={(e) => setTo(e.target.value)}
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="wa-test-text">Message</Label>
						<Textarea
							id="wa-test-text"
							rows={3}
							value={text}
							onChange={(e) => setText(e.target.value)}
						/>
					</div>
					{error ? (
						<div className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-xs">
							{error}
						</div>
					) : null}
					{result ? (
						<div className="rounded-md bg-success/10 px-3 py-2 text-success text-xs">
							Sent · message_id {result}
						</div>
					) : null}
				</div>

				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline">Close</Button>
					</DialogClose>
					<Button onClick={handleSend} disabled={pending || !to || !text}>
						{pending ? <Loader2 className="animate-spin" /> : <Send />}
						Send
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
