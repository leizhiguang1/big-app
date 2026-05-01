"use client";

import {
	CLIENT_EVENTS,
	type InboxCreateContactResponse,
	type InboxSearchRow,
} from "@aimbig/wa-client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function initials(name: string) {
	if (!name) return "?";
	const parts = name.trim().split(/\s+/).slice(0, 2);
	return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function ComposePicker({
	socket,
	open,
	onClose,
	onPick,
}: {
	socket: Socket;
	open: boolean;
	onClose: () => void;
	onPick: (contactId: string) => void;
}) {
	const [query, setQuery] = useState("");
	const [rows, setRows] = useState<InboxSearchRow[]>([]);
	const [loading, setLoading] = useState(false);
	const [creating, setCreating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement | null>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (!open) return;
		setQuery("");
		setError(null);
		setTimeout(() => inputRef.current?.focus(), 50);
	}, [open]);

	useEffect(() => {
		if (!open) return;
		if (debounceRef.current) clearTimeout(debounceRef.current);
		setLoading(true);
		debounceRef.current = setTimeout(() => {
			socket.emit(
				CLIENT_EVENTS.inboxSearchContacts,
				{ query },
				(resp: { rows?: InboxSearchRow[] }) => {
					setLoading(false);
					setRows(resp?.rows ?? []);
				},
			);
		}, 200);
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [query, open, socket]);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	const trimmed = query.trim();
	const looksLikeEmail = useMemo(() => EMAIL_REGEX.test(trimmed), [trimmed]);
	const noExactMatch = useMemo(() => {
		if (!looksLikeEmail) return false;
		const q = trimmed.toLowerCase();
		return !rows.some((r) => (r.email || "").toLowerCase() === q);
	}, [rows, trimmed, looksLikeEmail]);

	function createAndPick(email: string) {
		setCreating(true);
		setError(null);
		socket.emit(
			CLIENT_EVENTS.inboxCreateContact,
			{ email },
			(resp: InboxCreateContactResponse) => {
				setCreating(false);
				if (resp?.error || !resp?.contactId) {
					setError(resp?.error || "Failed to create contact");
					return;
				}
				onPick(resp.contactId);
				onClose();
			},
		);
	}

	if (!open) return null;

	return (
		<div
			className="inbox-picker-overlay"
			onClick={onClose}
			onKeyDown={(e) => {
				if (e.key === "Escape") onClose();
			}}
			role="dialog"
			aria-modal="true"
			tabIndex={-1}
		>
			<div
				className="inbox-picker"
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.stopPropagation()}
				role="document"
			>
				<div className="inbox-picker-header">
					<input
						ref={inputRef}
						type="text"
						className="inbox-picker-input"
						placeholder="Search by name or phone, or type a new email address..."
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={(e) => {
							if (
								e.key === "Enter" &&
								looksLikeEmail &&
								noExactMatch &&
								!creating
							) {
								e.preventDefault();
								createAndPick(trimmed);
							}
						}}
					/>
					<button
						type="button"
						className="inbox-picker-close"
						onClick={onClose}
						title="Close"
					>
						×
					</button>
				</div>

				{error && <div className="inbox-picker-error">{error}</div>}

				<div className="inbox-picker-results">
					{looksLikeEmail && noExactMatch && (
						<button
							type="button"
							className="inbox-picker-row"
							onClick={() => createAndPick(trimmed)}
							disabled={creating}
						>
							<div className="inbox-picker-avatar inbox-picker-avatar--new">
								{creating ? "…" : "+"}
							</div>
							<div className="inbox-picker-info">
								<div className="inbox-picker-name">
									{creating
										? "Creating contact…"
										: `Send new email to ${trimmed}`}
								</div>
								<div className="inbox-picker-handles">
									<span className="inbox-picker-handle">
										Creates a new contact and opens the composer
									</span>
								</div>
							</div>
						</button>
					)}

					{loading && rows.length === 0 && !looksLikeEmail && (
						<div className="inbox-picker-empty">Searching...</div>
					)}
					{!loading && rows.length === 0 && !looksLikeEmail && (
						<div className="inbox-picker-empty">
							{query ? "No contacts match" : "No contacts available"}
						</div>
					)}

					{rows.map((r) => (
						<button
							type="button"
							key={r.contactId}
							className="inbox-picker-row"
							onClick={() => {
								onPick(r.contactId);
								onClose();
							}}
						>
							<div className="inbox-picker-avatar">
								{r.avatarUrl ? (
									<img src={r.avatarUrl} alt="" />
								) : (
									<span>{initials(r.name)}</span>
								)}
							</div>
							<div className="inbox-picker-info">
								<div className="inbox-picker-name">{r.name}</div>
								<div className="inbox-picker-handles">
									{r.email && (
										<span className="inbox-picker-handle">
											Email · {r.email}
										</span>
									)}
									{r.phone && (
										<span className="inbox-picker-handle">
											Phone · {r.phone}
										</span>
									)}
								</div>
							</div>
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
