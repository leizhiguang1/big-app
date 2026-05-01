"use client";

// NOTE: future-proof slot for multi-WhatsApp-per-outlet
// (multiple `wa_channel_accounts` rows of channel='whatsapp' in one project).
// When wa-crm starts returning >1 handle per channel, we render a second
// account picker here and pass `channelAccountId` in the inbox_send payload.
// Today wa-crm forces 1 account per (project, channel) at runtime; the slot
// stays hidden.

import {
	ALL_INBOX_CHANNELS,
	CLIENT_EVENTS,
	IMPLEMENTED_INBOX_CHANNELS,
	INBOX_CHANNEL_LABELS,
	type InboxChannel,
	type InboxContactHandles,
	type InboxSendResponse,
} from "@aimbig/wa-client";
import { useEffect, useMemo, useState } from "react";
import type { Socket } from "socket.io-client";
import { ChannelBadge } from "./ChannelBadge";

function disabledReason(
	channel: InboxChannel,
	handles: InboxContactHandles,
): string | null {
	if (!IMPLEMENTED_INBOX_CHANNELS.includes(channel))
		return "Not connected yet";
	if (!handles[channel]) {
		if (channel === "whatsapp") return "No WhatsApp number on this contact";
		if (channel === "email") return "No email address on this contact";
		return "No handle on this contact";
	}
	return null;
}

export function InboxComposer({
	socket,
	contactId,
	handles,
	defaultChannel,
	onSent,
}: {
	socket: Socket;
	contactId: string;
	handles: InboxContactHandles;
	defaultChannel: InboxChannel;
	onSent: () => void;
}) {
	const [channel, setChannel] = useState<InboxChannel>(defaultChannel);
	const [text, setText] = useState("");
	const [subject, setSubject] = useState("");
	const [cc, setCc] = useState("");
	const [bcc, setBcc] = useState("");
	const [showHeaders, setShowHeaders] = useState(false);
	const [sending, setSending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setText("");
		setSubject("");
		setCc("");
		setBcc("");
		setError(null);
		setShowHeaders(false);
	}, [contactId]);

	useEffect(() => {
		if (!disabledReason(channel, handles)) return;
		const next = IMPLEMENTED_INBOX_CHANNELS.find(
			(c) => !disabledReason(c, handles),
		);
		if (next) setChannel(next);
	}, [handles, channel]);

	const canSend = useMemo(() => {
		if (sending) return false;
		if (disabledReason(channel, handles)) return false;
		if (channel === "email")
			return text.trim().length > 0 || subject.trim().length > 0;
		return text.trim().length > 0;
	}, [sending, channel, handles, text, subject]);

	const handleSend = () => {
		if (!canSend) return;
		setSending(true);
		setError(null);
		const payload: Record<string, unknown> = {
			contactId,
			channel,
			text: text.trim(),
		};
		if (channel === "email") {
			if (subject.trim()) payload.subject = subject.trim();
			const ccArr = cc
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);
			const bccArr = bcc
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);
			if (ccArr.length) payload.cc = ccArr;
			if (bccArr.length) payload.bcc = bccArr;
		}
		socket.emit(CLIENT_EVENTS.inboxSend, payload, (resp: InboxSendResponse) => {
			setSending(false);
			if (resp?.error) {
				setError(resp.error);
				return;
			}
			if (resp?.syncError) {
				setError(
					`Sent, but inbox failed to save it: ${resp.syncError}. Click ↻ to resync.`,
				);
			}
			setText("");
			setSubject("");
			setCc("");
			setBcc("");
			onSent();
		});
	};

	return (
		<div className="inbox-composer">
			<div className="inbox-composer-channels">
				{ALL_INBOX_CHANNELS.map((ch) => {
					const reason = disabledReason(ch, handles);
					const active = ch === channel;
					return (
						<button
							key={ch}
							type="button"
							className={`inbox-channel-pill${active ? " inbox-channel-pill--active" : ""}${reason ? " inbox-channel-pill--disabled" : ""}`}
							disabled={!!reason}
							aria-disabled={!!reason}
							title={reason || INBOX_CHANNEL_LABELS[ch]}
							onClick={() => !reason && setChannel(ch)}
						>
							<ChannelBadge channel={ch} size="sm" />
							<span>{INBOX_CHANNEL_LABELS[ch]}</span>
						</button>
					);
				})}
			</div>

			{channel === "email" && (
				<div className="inbox-composer-headers">
					<input
						type="text"
						className="inbox-composer-subject"
						placeholder="Subject"
						value={subject}
						onChange={(e) => setSubject(e.target.value)}
					/>
					<button
						type="button"
						className="inbox-composer-toggle"
						onClick={() => setShowHeaders((s) => !s)}
					>
						{showHeaders ? "Hide CC/BCC" : "CC / BCC"}
					</button>
					{showHeaders && (
						<div className="inbox-composer-cc">
							<input
								type="text"
								placeholder="CC (comma-separated)"
								value={cc}
								onChange={(e) => setCc(e.target.value)}
							/>
							<input
								type="text"
								placeholder="BCC (comma-separated)"
								value={bcc}
								onChange={(e) => setBcc(e.target.value)}
							/>
						</div>
					)}
				</div>
			)}

			<div className="inbox-composer-row">
				<textarea
					className="inbox-composer-text"
					placeholder={
						channel === "email"
							? "Type your email..."
							: `Type a ${INBOX_CHANNEL_LABELS[channel]} message...`
					}
					value={text}
					onChange={(e) => setText(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.shiftKey && channel !== "email") {
							e.preventDefault();
							handleSend();
						}
					}}
					rows={channel === "email" ? 5 : 2}
				/>
				<button
					type="button"
					className="inbox-send-btn"
					onClick={handleSend}
					disabled={!canSend}
					title={
						disabledReason(channel, handles) ||
						`Send via ${INBOX_CHANNEL_LABELS[channel]}`
					}
				>
					{sending ? "..." : "Send"}
				</button>
			</div>

			{error && <div className="inbox-composer-error">{error}</div>}
		</div>
	);
}
