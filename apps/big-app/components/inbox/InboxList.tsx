"use client";

import {
	ALL_INBOX_CHANNELS,
	CLIENT_EVENTS,
	IMPLEMENTED_INBOX_CHANNELS,
	INBOX_CHANNEL_LABELS,
	type InboxChannel,
	type InboxRow,
} from "@aimbig/wa-client";
import { useMemo, useState } from "react";
import type { Socket } from "socket.io-client";
import { ChannelBadge } from "./ChannelBadge";

function formatTime(iso: string | null) {
	if (!iso) return "";
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "";
	const now = new Date();
	if (date.toDateString() === now.toDateString()) {
		return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	}
	const yesterday = new Date(now);
	yesterday.setDate(yesterday.getDate() - 1);
	if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
	const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
	if (diffDays < 7) return date.toLocaleDateString([], { weekday: "long" });
	return date.toLocaleDateString([], {
		month: "numeric",
		day: "numeric",
		year: "2-digit",
	});
}

function initials(name: string) {
	if (!name) return "?";
	const parts = name.trim().split(/\s+/).slice(0, 2);
	return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function InboxList({
	socket,
	rows,
	selectedContactId,
	onSelect,
	channelFilter,
	onChannelFilterChange,
	loading,
	onCompose,
	error,
}: {
	socket: Socket;
	rows: InboxRow[];
	selectedContactId: string | null;
	onSelect: (contactId: string) => void;
	channelFilter: InboxChannel | "all";
	onChannelFilterChange: (next: InboxChannel | "all") => void;
	loading: boolean;
	onCompose: () => void;
	error: string | null;
}) {
	const [search, setSearch] = useState("");
	const [resyncing, setResyncing] = useState(false);

	const handleResync = () => {
		if (resyncing) return;
		setResyncing(true);
		socket.emit(
			CLIENT_EVENTS.inboxResync,
			(resp: { ok?: boolean; error?: string; ms?: number }) => {
				setResyncing(false);
				if (resp?.error) console.error("[Inbox] resync error", resp.error);
				else console.log(`[Inbox] resync done in ${resp?.ms}ms`);
			},
		);
	};

	const filtered = useMemo(() => {
		if (!search.trim()) return rows;
		const q = search.toLowerCase();
		return rows.filter(
			(r) =>
				r.name?.toLowerCase().includes(q) ||
				r.lastMessageText?.toLowerCase().includes(q) ||
				r.email?.toLowerCase().includes(q) ||
				r.phone?.toLowerCase().includes(q),
		);
	}, [rows, search]);

	return (
		<div className="inbox-list-panel">
			<div className="inbox-list-header">
				<h2 className="inbox-list-title">Chats</h2>
				<div className="inbox-list-header-actions">
					<button
						type="button"
						className="inbox-compose-btn"
						onClick={handleResync}
						disabled={resyncing}
						title="Resync chats from connected channels"
						style={{
							background: "transparent",
							border: "1px solid var(--border-color)",
							color: "var(--text-secondary)",
						}}
					>
						{resyncing ? "..." : "↻"}
					</button>
					<button
						type="button"
						className="inbox-compose-btn"
						onClick={onCompose}
						title="Start a new chat"
					>
						+ New
					</button>
					<select
						className="inbox-channel-filter"
						value={channelFilter}
						onChange={(e) =>
							onChannelFilterChange(e.target.value as InboxChannel | "all")
						}
						title="Filter by channel"
					>
						<option value="all">All channels</option>
						{ALL_INBOX_CHANNELS.map((ch) => {
							const enabled = IMPLEMENTED_INBOX_CHANNELS.includes(ch);
							return (
								<option key={ch} value={ch} disabled={!enabled}>
									{INBOX_CHANNEL_LABELS[ch]}
									{enabled ? "" : " (unavailable)"}
								</option>
							);
						})}
					</select>
				</div>
			</div>

			<div className="inbox-search-wrapper">
				<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
					<path
						fill="currentColor"
						d="M15.009 13.805h-.636l-.22-.219a5.184 5.184 0 0 0 1.256-3.386 5.207 5.207 0 1 0-5.207 5.208 5.183 5.183 0 0 0 3.385-1.255l.221.22v.635l4.004 3.999 1.194-1.195-3.997-4.007zm-4.808 0a3.605 3.605 0 1 1 0-7.21 3.605 3.605 0 0 1 0 7.21z"
					/>
				</svg>
				<input
					type="text"
					placeholder="Search contacts or messages"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="inbox-search-input"
				/>
			</div>

			{error && <div className="inbox-list-error">Error: {error}</div>}

			<div className="inbox-list-scroll">
				{loading && rows.length === 0 && (
					<div className="inbox-list-empty">Loading chats...</div>
				)}
				{!loading && filtered.length === 0 && (
					<div className="inbox-list-empty">
						{rows.length === 0 ? "No chats yet" : "No matches"}
					</div>
				)}

				{filtered.map((row) => (
					<button
						type="button"
						key={row.contactId}
						className={`inbox-list-item${row.contactId === selectedContactId ? " inbox-list-item--selected" : ""}`}
						onClick={() => onSelect(row.contactId)}
					>
						<div className="inbox-avatar">
							{row.avatarUrl ? (
								<img src={row.avatarUrl} alt="" />
							) : (
								<span>{initials(row.name)}</span>
							)}
						</div>

						<div className="inbox-item-content">
							<div className="inbox-item-top">
								<span
									className={`inbox-item-name${row.unreadCount > 0 ? " inbox-item-name--unread" : ""}`}
								>
									{row.name}
								</span>
								<span
									className={`inbox-item-time${row.unreadCount > 0 ? " inbox-item-time--unread" : ""}`}
								>
									{formatTime(row.lastMessageAt)}
								</span>
							</div>
							<div className="inbox-item-bottom">
								<span className="inbox-item-snippet">
									{row.lastMessageChannel && (
										<ChannelBadge channel={row.lastMessageChannel} size="sm" />
									)}
									{row.lastMessageFromMe && row.lastMessageText && (
										<span className="inbox-item-prefix">You: </span>
									)}
									{row.lastMessageText || " "}
								</span>
								<div className="inbox-item-right">
									{row.channels.length > 1 && (
										<span
											className="inbox-multi-channel"
											title={`Channels: ${row.channels.join(", ")}`}
										>
											{row.channels.length}ch
										</span>
									)}
									{row.unreadCount > 0 && (
										<span className="inbox-unread-badge">
											{row.unreadCount}
										</span>
									)}
								</div>
							</div>
						</div>
					</button>
				))}
			</div>
		</div>
	);
}
