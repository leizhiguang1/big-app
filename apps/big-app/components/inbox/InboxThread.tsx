"use client";

import type { InboxContact, InboxMessage } from "@aimbig/wa-client";
import { useEffect, useRef } from "react";
import { ChannelBadge } from "./ChannelBadge";

function formatStamp(iso: string) {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "";
	return d.toLocaleString([], {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function formatDay(iso: string) {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "";
	const today = new Date();
	if (d.toDateString() === today.toDateString()) return "Today";
	const y = new Date(today);
	y.setDate(y.getDate() - 1);
	if (d.toDateString() === y.toDateString()) return "Yesterday";
	return d.toLocaleDateString([], {
		weekday: "long",
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function MediaBubble({ msg }: { msg: InboxMessage }) {
	if (!msg.mediaUrl) return null;
	const mime = msg.mediaMimeType || "";
	if (mime.startsWith("image/")) {
		return (
			<img
				src={msg.mediaUrl}
				alt={msg.mediaFileName || "image"}
				className="inbox-media-image"
			/>
		);
	}
	if (mime.startsWith("video/")) {
		return (
			<video src={msg.mediaUrl} controls className="inbox-media-video">
				<track kind="captions" />
			</video>
		);
	}
	if (mime.startsWith("audio/")) {
		return (
			<audio src={msg.mediaUrl} controls className="inbox-media-audio">
				<track kind="captions" />
			</audio>
		);
	}
	return (
		<a
			href={msg.mediaUrl}
			target="_blank"
			rel="noreferrer"
			className="inbox-media-doc"
		>
			<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
				<path
					fill="currentColor"
					d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"
				/>
			</svg>
			<span>{msg.mediaFileName || "Download attachment"}</span>
		</a>
	);
}

export function InboxThread({
	messages,
	contact,
	loading,
	onBack,
}: {
	messages: InboxMessage[];
	contact: InboxContact | null;
	loading: boolean;
	onBack?: () => void;
}) {
	const scrollRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const el = scrollRef.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [messages]);

	if (!contact) {
		return (
			<div className="inbox-thread-empty">
				{loading ? "Loading chat..." : "Select a chat to view messages"}
			</div>
		);
	}

	let lastDay: string | null = null;
	let lastEmailThread: string | null = null;

	return (
		<div className="inbox-thread-panel">
			<div className="inbox-thread-header">
				{onBack && (
					<button
						type="button"
						className="inbox-thread-back"
						aria-label="Back to chats"
						onClick={onBack}
					>
						<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
							<path
								fill="currentColor"
								d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"
							/>
						</svg>
					</button>
				)}
				<div className="inbox-thread-header-text">
					<div className="inbox-thread-title">{contact.name}</div>
					<div className="inbox-thread-sub">
						{[contact.phone, contact.email].filter(Boolean).join(" · ")}
					</div>
				</div>
			</div>

			<div className="inbox-thread-scroll" ref={scrollRef}>
				{loading && messages.length === 0 && (
					<div className="inbox-thread-empty-inner">Loading messages...</div>
				)}
				{!loading && messages.length === 0 && (
					<div className="inbox-thread-empty-inner">
						No messages yet — start the chat below.
					</div>
				)}

				{messages.map((msg) => {
					const day = formatDay(msg.sentAt);
					const showDay = day !== lastDay;
					lastDay = day;

					const isEmail = msg.channel === "email";
					const showSubject =
						isEmail && msg.subject && msg.subject !== lastEmailThread;
					if (isEmail && msg.subject) lastEmailThread = msg.subject;

					return (
						<div key={msg.id} className="inbox-msg-wrap">
							{showDay && (
								<div className="inbox-day-divider">
									<span>{day}</span>
								</div>
							)}
							{showSubject && (
								<div className="inbox-email-subject">
									<ChannelBadge channel="email" size="sm" />
									<strong>Subject:</strong> {msg.subject}
								</div>
							)}
							<div
								className={`inbox-msg ${msg.fromMe ? "inbox-msg--out" : "inbox-msg--in"}`}
							>
								<div className="inbox-msg-meta">
									<ChannelBadge channel={msg.channel} size="sm" />
									{!msg.fromMe && msg.senderName && (
										<span className="inbox-msg-sender">{msg.senderName}</span>
									)}
									{msg.isAiGenerated && <span className="inbox-msg-tag">AI</span>}
									{msg.isAutomation && (
										<span className="inbox-msg-tag">
											{msg.automationName || "Automation"}
										</span>
									)}
								</div>
								<div className="inbox-msg-bubble">
									<MediaBubble msg={msg} />
									{msg.text && <div className="inbox-msg-text">{msg.text}</div>}
									<div className="inbox-msg-stamp">
										{formatStamp(msg.sentAt)}
									</div>
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
