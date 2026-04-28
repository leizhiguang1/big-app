"use client";

import { useMemo, useState } from "react";
import type {
	ConnectionStatus,
	FormattedChat,
	ProfilePicsUpdate,
} from "@aimbig/wa-client";

function formatTime(timestamp: number | null | undefined): string {
	if (!timestamp) return "";
	const date = new Date(timestamp * 1000);
	const now = new Date();
	const isToday = date.toDateString() === now.toDateString();
	if (isToday)
		return date.toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit",
		});
	const yesterday = new Date(now);
	yesterday.setDate(yesterday.getDate() - 1);
	if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
	const diffDays = Math.floor(
		(now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
	);
	if (diffDays < 7) return date.toLocaleDateString([], { weekday: "long" });
	return date.toLocaleDateString([], {
		month: "numeric",
		day: "numeric",
		year: "2-digit",
	});
}

function statusLabel(status: ConnectionStatus): string {
	switch (status) {
		case "open":
			return "Connected";
		case "connecting":
			return "Connecting…";
		case "qr":
		case "waiting_qr":
			return "Waiting for QR scan";
		case "close":
			return "Reconnecting…";
		case "logged_out":
			return "Not linked";
		case "stream_replaced":
			return "Session replaced";
		case "rate_limited":
			return "Rate limited";
		default:
			return status;
	}
}

function DefaultAvatar() {
	return (
		<div className="avatar-default">
			<svg viewBox="0 0 212 212" xmlns="http://www.w3.org/2000/svg">
				<path
					fill="#DFE5E7"
					d="M106.251.5C164.653.5 212 47.846 212 106.25S164.653 212 106.25 212C47.846 212 .5 164.654.5 106.25S47.846.5 106.251.5z"
				/>
				<path
					fill="#FFF"
					d="M173.561 171.615a62.767 62.767 0 0 0-2.065-2.955 67.7 67.7 0 0 0-2.608-3.299 70.112 70.112 0 0 0-3.184-3.527 71.097 71.097 0 0 0-5.924-5.47 72.458 72.458 0 0 0-10.204-7.026 75.2 75.2 0 0 0-5.98-3.055c-.062-.028-.118-.059-.18-.087-9.792-4.44-22.106-7.529-37.416-7.529s-27.624 3.089-37.416 7.529c-.338.153-.653.318-.985.474a75.37 75.37 0 0 0-6.229 3.298 72.589 72.589 0 0 0-9.15 6.395 71.243 71.243 0 0 0-5.924 5.47 70.064 70.064 0 0 0-3.184 3.527 67.142 67.142 0 0 0-2.609 3.299 63.292 63.292 0 0 0-2.065 2.955 56.33 56.33 0 0 0-1.447 2.324c-.033.056-.073.119-.104.174a47.92 47.92 0 0 0-1.07 1.926c-.559 1.068-.818 1.678-.818 1.678v.398c18.285 17.927 43.322 28.985 70.945 28.985 27.623 0 52.661-11.058 70.945-28.985v-.398s-.259-.61-.818-1.678a49.242 49.242 0 0 0-1.07-1.926c-.031-.055-.071-.118-.104-.174a56.151 56.151 0 0 0-1.447-2.324zM106.002 125.5c2.645 0 5.212-.253 7.68-.737a38.272 38.272 0 0 0 3.624-.896 37.124 37.124 0 0 0 5.12-1.958 36.307 36.307 0 0 0 6.15-3.67 35.923 35.923 0 0 0 9.489-10.48 36.558 36.558 0 0 0 2.422-4.84 37.051 37.051 0 0 0 1.716-5.25c.299-1.208.542-2.443.725-3.701.275-1.887.417-3.827.417-5.811s-.142-3.925-.417-5.811a38.734 38.734 0 0 0-1.215-5.494 36.68 36.68 0 0 0-3.648-8.298 35.923 35.923 0 0 0-9.489-10.48 36.347 36.347 0 0 0-6.15-3.67 37.124 37.124 0 0 0-5.12-1.958 37.67 37.67 0 0 0-3.624-.896 39.875 39.875 0 0 0-7.68-.737c-21.162 0-37.345 16.183-37.345 37.345 0 21.159 16.183 37.342 37.345 37.342z"
				/>
			</svg>
		</div>
	);
}

function DefaultGroupAvatar() {
	return (
		<div className="avatar-default">
			<svg viewBox="0 0 212 212" xmlns="http://www.w3.org/2000/svg">
				<path
					fill="#DFE5E7"
					d="M106.251.5C164.653.5 212 47.846 212 106.25S164.653 212 106.25 212C47.846 212 .5 164.654.5 106.25S47.846.5 106.251.5z"
				/>
				<path
					fill="#FFF"
					d="M88 88a24 24 0 1 0 0-48 24 24 0 0 0 0 48zm0 8c-21 0-38 12-38 28v4h76v-4c0-16-17-28-38-28zm48-8a24 24 0 1 0 0-48 24 24 0 0 0 0 48zm0 8c-6 0-11.5 1.2-16.3 3.3C127 105 132 113.5 132 124v4h30v-4c0-16-11.4-28-26-28z"
				/>
			</svg>
		</div>
	);
}

function DoubleCheck() {
	return (
		<svg
			viewBox="0 0 16 11"
			height="11"
			width="16"
			className="tick-delivered"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				fill="currentColor"
				d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.336-.153.457.457 0 0 0-.336.153.434.434 0 0 0 0 .611l2.357 2.46a.574.574 0 0 0 .373.178.481.481 0 0 0 .398-.178l6.537-8.076a.434.434 0 0 0-.107-.612z"
			/>
			<path
				fill="currentColor"
				d="M14.757.653a.457.457 0 0 0-.305-.102.493.493 0 0 0-.381.178l-6.19 7.636-1.18-1.229-.305.377 1.441 1.503a.574.574 0 0 0 .373.178.481.481 0 0 0 .398-.178l6.537-8.076a.434.434 0 0 0-.107-.612z"
			/>
		</svg>
	);
}

export function ChatList({
	chats,
	selectedJid,
	onSelectChat,
	profilePics,
	connectionStatus,
	linkedPhone,
	lineLabel,
}: {
	chats: FormattedChat[];
	selectedJid: string | null;
	onSelectChat: (jid: string) => void;
	profilePics: ProfilePicsUpdate;
	connectionStatus: ConnectionStatus;
	linkedPhone: string | null;
	lineLabel: string | null;
}) {
	const [searchQuery, setSearchQuery] = useState("");

	const filteredChats = useMemo(() => {
		if (!searchQuery.trim()) return chats;
		const q = searchQuery.toLowerCase();
		return chats.filter(
			(c) =>
				c.name?.toLowerCase().includes(q) ||
				c.lastMessage?.toLowerCase().includes(q),
		);
	}, [chats, searchQuery]);

	return (
		<div className="chat-list-panel">
			<div className="chat-list-header">
				<div className="chat-list-header-left">
					<h2 className="chat-list-title">Chats</h2>
					<span className="chat-list-subtitle">
						{lineLabel ?? "WhatsApp"}
						{linkedPhone ? ` · +${linkedPhone}` : ""} ·{" "}
						<span
							className={
								connectionStatus === "open"
									? "chat-list-subtitle--connected"
									: ""
							}
						>
							{statusLabel(connectionStatus)}
						</span>
					</span>
				</div>
				<div className="chat-list-header-actions">
					<button
						type="button"
						className="header-icon-btn"
						aria-label="New chat"
					>
						<svg viewBox="0 0 24 24">
							<path
								fill="currentColor"
								d="M19.005 3.175H4.674C3.642 3.175 3 3.789 3 4.821V21.02l3.544-3.514h12.461c1.033 0 2.064-1.06 2.064-2.093V4.821c-.001-1.032-1.032-1.646-2.064-1.646zm-4.989 9.869H7.041V11.1h6.975v1.944zm3-4H7.041V7.1h9.975v1.944z"
							/>
						</svg>
					</button>
					<button
						type="button"
						className="header-icon-btn"
						aria-label="Menu"
					>
						<svg viewBox="0 0 24 24">
							<path
								fill="currentColor"
								d="M12 7a2 2 0 1 0-.001-4.001A2 2 0 0 0 12 7zm0 2a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 9zm0 6a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 15z"
							/>
						</svg>
					</button>
				</div>
			</div>

			<div className="search-bar-wrapper">
				<div className="search-bar-inner">
					<svg viewBox="0 0 24 24">
						<path
							fill="currentColor"
							d="M15.009 13.805h-.636l-.22-.219a5.184 5.184 0 0 0 1.256-3.386 5.207 5.207 0 1 0-5.207 5.208 5.183 5.183 0 0 0 3.385-1.255l.221.22v.635l4.004 3.999 1.194-1.195-3.997-4.007zm-4.808 0a3.605 3.605 0 1 1 0-7.21 3.605 3.605 0 0 1 0 7.21z"
						/>
					</svg>
					<input
						type="text"
						className="search-bar"
						placeholder="Search or start new chat"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>
			</div>

			<div className="chat-list-scroll">
				{filteredChats.length === 0 && (
					<div className="chat-list-empty">
						{chats.length === 0
							? "Loading chats…"
							: "No chats match your search"}
					</div>
				)}

				{filteredChats.map((chat) => {
					const imgUrl = profilePics?.[chat.id] ?? chat.imgUrl;
					const unread = chat.unreadCount > 0;
					return (
						<button
							key={chat.id}
							type="button"
							className={`chat-list-item ${
								selectedJid === chat.id ? "chat-list-item--selected" : ""
							}`}
							onClick={() => onSelectChat(chat.id)}
						>
							<div className="avatar">
								{imgUrl ? (
									<img src={imgUrl} alt="" />
								) : chat.isGroup ? (
									<DefaultGroupAvatar />
								) : (
									<DefaultAvatar />
								)}
							</div>

							<div className="chat-item-content">
								<div className="chat-item-top">
									<span
										className={`chat-item-name ${
											unread ? "chat-item-name--unread" : ""
										}`}
									>
										{chat.name}
									</span>
									<span
										className={`chat-item-time ${
											unread ? "chat-item-time--unread" : ""
										}`}
									>
										{formatTime(chat.timestamp)}
									</span>
								</div>
								<div className="chat-item-bottom">
									<span className="chat-item-last-msg">
										{chat.lastMessageFromMe && chat.lastMessage && (
											<DoubleCheck />
										)}
										{chat.lastMessageFromMe && chat.lastMessage ? (
											<span className="chat-item-sender-prefix">
												You:&nbsp;
											</span>
										) : chat.isGroup &&
										  chat.lastMessageSenderName &&
										  chat.lastMessage ? (
											<span className="chat-item-sender-prefix">
												{chat.lastMessageSenderName}:&nbsp;
											</span>
										) : null}
										{chat.lastMessage || " "}
									</span>
									{unread && (
										<span className="unread-badge">{chat.unreadCount}</span>
									)}
								</div>
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}
