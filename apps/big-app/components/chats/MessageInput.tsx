"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getSocket } from "./socket";
import type { QuickReply } from "./types";

type SendAudioPayload = Blob | { audioBase64: string; mimetype: string };
type SendImagePayload = {
	imageBase64: string;
	mimetype: string;
	name: string;
	caption: string;
};
type SendVideoPayload = {
	videoBase64: string;
	mimetype: string;
	name: string;
	caption: string;
};
type SendDocumentPayload = {
	fileBase64: string;
	mimetype: string;
	fileName: string;
	caption: string;
};

function formatRecTime(secs: number): string {
	const m = String(Math.floor(secs / 60)).padStart(2, "0");
	const s = String(secs % 60).padStart(2, "0");
	return `${m}:${s}`;
}

function blobToBase64(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result;
			if (typeof result !== "string") {
				reject(new Error("Failed to read file"));
				return;
			}
			const comma = result.indexOf(",");
			resolve(comma >= 0 ? result.slice(comma + 1) : result);
		};
		reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
		reader.readAsDataURL(blob);
	});
}

export function MessageInput({
	onSend,
	onSendAudio,
	onSendImage,
	onSendVideo,
	onSendDocument,
}: {
	onSend: (text: string) => void;
	onSendAudio?: (payload: SendAudioPayload) => void;
	onSendImage?: (payload: SendImagePayload) => void;
	onSendVideo?: (payload: SendVideoPayload) => void;
	onSendDocument?: (payload: SendDocumentPayload) => void;
}) {
	const [text, setText] = useState("");
	const [menuOpen, setMenuOpen] = useState(false);
	const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
	const [quickReplyMatches, setQuickReplyMatches] = useState<QuickReply[]>([]);
	const [highlightIdx, setHighlightIdx] = useState(0);
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	const mediaInputRef = useRef<HTMLInputElement | null>(null);
	const docInputRef = useRef<HTMLInputElement | null>(null);
	const menuRef = useRef<HTMLDivElement | null>(null);

	const [isRecording, setIsRecording] = useState(false);
	const [recSeconds, setRecSeconds] = useState(0);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const audioChunksRef = useRef<Blob[]>([]);
	const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const mimeTypeRef = useRef<string>("");

	const resetTextarea = useCallback(() => {
		setText("");
		if (textareaRef.current) textareaRef.current.style.height = "auto";
	}, []);

	const handleSend = useCallback(() => {
		const trimmed = text.trim();
		if (!trimmed) return;
		onSend(trimmed);
		resetTextarea();
	}, [text, onSend, resetTextarea]);

	function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		if (quickReplyMatches.length > 0) {
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setHighlightIdx((i) => (i + 1) % quickReplyMatches.length);
				return;
			}
			if (e.key === "ArrowUp") {
				e.preventDefault();
				setHighlightIdx(
					(i) =>
						(i - 1 + quickReplyMatches.length) % quickReplyMatches.length,
				);
				return;
			}
			if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
				e.preventDefault();
				const pick = quickReplyMatches[highlightIdx];
				if (pick) applyQuickReply(pick);
				return;
			}
			if (e.key === "Escape") {
				e.preventDefault();
				setQuickReplyMatches([]);
				return;
			}
		}
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}

	function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
		setText(e.target.value);
		e.target.style.height = "auto";
		e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
	}

	useEffect(() => {
		if (!menuOpen) return;
		function onDocClick(e: MouseEvent) {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setMenuOpen(false);
			}
		}
		function onEsc(e: KeyboardEvent) {
			if (e.key === "Escape") setMenuOpen(false);
		}
		document.addEventListener("mousedown", onDocClick);
		document.addEventListener("keydown", onEsc);
		return () => {
			document.removeEventListener("mousedown", onDocClick);
			document.removeEventListener("keydown", onEsc);
		};
	}, [menuOpen]);

	useEffect(() => {
		const sock = getSocket();
		const load = () => {
			sock.emit("get_quick_replies", (list: QuickReply[] | null) => {
				if (Array.isArray(list)) setQuickReplies(list);
			});
		};
		if (sock.connected) load();
		else sock.on("connect", load);
		return () => {
			sock.off("connect", load);
		};
	}, []);

	useEffect(() => {
		// Match `/shortcut` at the start of an empty-or-only-shortcut buffer.
		const m = text.match(/^\/(\w*)$/);
		if (!m || quickReplies.length === 0) {
			setQuickReplyMatches([]);
			setHighlightIdx(0);
			return;
		}
		const q = m[1].toLowerCase();
		const matches = quickReplies.filter((r) =>
			r.shortcut.toLowerCase().startsWith(q),
		);
		setQuickReplyMatches(matches.slice(0, 6));
		setHighlightIdx(0);
	}, [text, quickReplies]);

	const applyQuickReply = useCallback(
		(reply: QuickReply) => {
			setText(reply.text);
			setQuickReplyMatches([]);
			if (textareaRef.current) {
				textareaRef.current.style.height = "auto";
				textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
				textareaRef.current.focus();
			}
		},
		[],
	);

	const handleMediaChange = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			e.target.value = "";
			if (!file) return;
			try {
				const base64 = await blobToBase64(file);
				const caption = text.trim();
				const mimetype = file.type || "application/octet-stream";
				if (mimetype.startsWith("image/")) {
					onSendImage?.({
						imageBase64: base64,
						mimetype,
						name: file.name,
						caption,
					});
				} else if (mimetype.startsWith("video/")) {
					onSendVideo?.({
						videoBase64: base64,
						mimetype,
						name: file.name,
						caption,
					});
				} else {
					onSendDocument?.({
						fileBase64: base64,
						mimetype,
						fileName: file.name,
						caption,
					});
				}
				resetTextarea();
			} catch (err) {
				console.error("Media read error:", err);
				alert("Failed to read file");
			}
		},
		[text, onSendImage, onSendVideo, onSendDocument, resetTextarea],
	);

	const handleDocChange = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			e.target.value = "";
			if (!file) return;
			try {
				const base64 = await blobToBase64(file);
				const caption = text.trim();
				onSendDocument?.({
					fileBase64: base64,
					mimetype: file.type || "application/octet-stream",
					fileName: file.name,
					caption,
				});
				resetTextarea();
			} catch (err) {
				console.error("Document read error:", err);
				alert("Failed to read file");
			}
		},
		[text, onSendDocument, resetTextarea],
	);

	const startRecording = useCallback(async () => {
		if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
			alert("Voice recording is not supported on this browser.");
			return;
		}
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const mimeType =
				[
					"audio/webm;codecs=opus",
					"audio/webm",
					"audio/ogg;codecs=opus",
					"audio/mp4",
				].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
			mimeTypeRef.current = mimeType;
			const mr = new MediaRecorder(
				stream,
				mimeType ? { mimeType } : undefined,
			);
			audioChunksRef.current = [];
			mr.ondataavailable = (e) => {
				if (e.data.size > 0) audioChunksRef.current.push(e.data);
			};
			mr.start(100);
			mediaRecorderRef.current = mr;
			setIsRecording(true);
			setRecSeconds(0);
			recTimerRef.current = setInterval(
				() => setRecSeconds((s) => s + 1),
				1000,
			);
		} catch {
			alert("Microphone permission is required to send voice messages.");
		}
	}, []);

	const stopRecording = useCallback(
		(send = true) => {
			const mr = mediaRecorderRef.current;
			if (!mr) return;
			if (recTimerRef.current) {
				clearInterval(recTimerRef.current);
				recTimerRef.current = null;
			}
			mr.onstop = () => {
				for (const t of mr.stream.getTracks()) t.stop();
				mediaRecorderRef.current = null;
				if (send && audioChunksRef.current.length && onSendAudio) {
					const blobType = mr.mimeType || mimeTypeRef.current || "audio/webm";
					const blob = new Blob(audioChunksRef.current, { type: blobType });
					if (blob.size > 0) onSendAudio(blob);
				}
			};
			mr.stop();
			setIsRecording(false);
			setRecSeconds(0);
		},
		[onSendAudio],
	);

	useEffect(() => {
		return () => {
			if (recTimerRef.current) clearInterval(recTimerRef.current);
			const mr = mediaRecorderRef.current;
			if (mr) {
				mr.onstop = null;
				for (const t of mr.stream.getTracks()) t.stop();
				mediaRecorderRef.current = null;
			}
		};
	}, []);

	const hasText = text.trim().length > 0;

	if (isRecording) {
		return (
			<div className="message-input-bar">
				<button
					type="button"
					className="recording-cancel-btn"
					onClick={() => stopRecording(false)}
					aria-label="Cancel recording"
				>
					<svg viewBox="0 0 24 24" width="20" height="20">
						<path
							fill="currentColor"
							d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12 5.7 16.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z"
						/>
					</svg>
				</button>
				<div className="recording-indicator">
					<span className="recording-dot" />
					<span className="recording-timer">{formatRecTime(recSeconds)}</span>
					<span className="recording-label">Recording…</span>
				</div>
				<button
					type="button"
					className="send-button send-button--active send-button--recording"
					onClick={() => stopRecording(true)}
					aria-label="Send voice message"
				>
					<svg viewBox="0 0 24 24">
						<path
							fill="currentColor"
							d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"
						/>
					</svg>
				</button>
			</div>
		);
	}

	return (
		<div className="message-input-bar">
			<input
				ref={mediaInputRef}
				type="file"
				accept="image/*,video/*"
				style={{ display: "none" }}
				onChange={handleMediaChange}
			/>
			<input
				ref={docInputRef}
				type="file"
				style={{ display: "none" }}
				onChange={handleDocChange}
			/>

			<button type="button" className="input-icon-btn" aria-label="Emoji">
				<svg viewBox="0 0 24 24">
					<path
						fill="currentColor"
						d="M9.153 11.603c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zm5.603 0c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zM11.984 2C6.486 2 2.029 6.486 2.029 12s4.457 10 9.955 10 9.955-4.486 9.955-10-4.457-10-9.955-10zm0 18c-4.419 0-8.001-3.582-8.001-8s3.582-8 8.001-8 8.001 3.582 8.001 8-3.582 8-8.001 8zm.005-3.003a5.91 5.91 0 0 1-4.935-2.644.75.75 0 0 1 1.248-.832 4.41 4.41 0 0 0 3.687 1.972 4.41 4.41 0 0 0 3.687-1.972.75.75 0 0 1 1.248.832 5.91 5.91 0 0 1-4.935 2.644z"
					/>
				</svg>
			</button>

			<div className="attach-wrap" ref={menuRef}>
				<button
					type="button"
					className={`input-icon-btn ${menuOpen ? "input-icon-btn--active" : ""}`}
					aria-label="Attach"
					aria-haspopup="menu"
					aria-expanded={menuOpen}
					onClick={() => setMenuOpen((v) => !v)}
				>
					<svg viewBox="0 0 24 24">
						<path
							fill="currentColor"
							d="M1.816 15.556v.002c0 1.502.584 2.912 1.646 3.972s2.472 1.647 3.974 1.647a5.58 5.58 0 0 0 3.972-1.645l9.547-9.548c.769-.768 1.147-1.767 1.058-2.817-.079-.968-.548-1.927-1.319-2.698-1.594-1.592-4.068-1.711-5.517-.262l-7.916 7.915c-.881.881-.792 2.25.214 3.261.501.501 1.134.803 1.775.854.648.047 1.266-.163 1.735-.632l6.293-6.294a.752.752 0 0 0-1.063-1.062l-6.294 6.294a.72.72 0 0 1-.527.193c-.2-.017-.424-.139-.617-.334-.42-.416-.526-.937-.213-1.249l7.916-7.916c.745-.745 2.212-.662 3.228.356.507.507.821 1.098.862 1.62.036.462-.131.902-.528 1.299l-9.548 9.548a4.079 4.079 0 0 1-2.909 1.205 4.1 4.1 0 0 1-2.911-1.205 4.079 4.079 0 0 1-1.205-2.911c0-1.098.428-2.131 1.205-2.909l7.917-7.917a.75.75 0 0 0-1.063-1.062L4.525 10.71A5.551 5.551 0 0 0 2.9 14.473a5.58 5.58 0 0 0-1.084 1.083z"
						/>
					</svg>
				</button>

				{menuOpen && (
					<div className="attach-menu" role="menu">
						<button
							type="button"
							className="attach-menu-item"
							role="menuitem"
							onClick={() => {
								setMenuOpen(false);
								mediaInputRef.current?.click();
							}}
						>
							<span className="attach-menu-icon attach-menu-icon--photo">
								<svg viewBox="0 0 24 24">
									<path
										fill="currentColor"
										d="M8.5 13.5l2.5 3 3.5-4.5 4.5 6H5m16 1V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"
									/>
								</svg>
							</span>
							Photos &amp; Videos
						</button>
						<button
							type="button"
							className="attach-menu-item"
							role="menuitem"
							onClick={() => {
								setMenuOpen(false);
								docInputRef.current?.click();
							}}
						>
							<span className="attach-menu-icon attach-menu-icon--doc">
								<svg viewBox="0 0 24 24">
									<path
										fill="currentColor"
										d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"
									/>
								</svg>
							</span>
							Document
						</button>
					</div>
				)}
			</div>

			<div
				style={{
					position: "relative",
					flex: 1,
					minWidth: 0,
					display: "flex",
				}}
			>
				{quickReplyMatches.length > 0 && (
					<div className="quick-reply-popover">
						<div className="quick-reply-popover-hint">
							Quick replies — Tab to insert
						</div>
						{quickReplyMatches.map((reply, idx) => (
							<button
								type="button"
								key={reply.id}
								onMouseDown={(e) => {
									e.preventDefault();
									applyQuickReply(reply);
								}}
								className={`quick-reply-popover-item${idx === highlightIdx ? " quick-reply-popover-item--active" : ""}`}
							>
								<code className="quick-reply-popover-shortcut">
									/{reply.shortcut}
								</code>
								<span className="quick-reply-popover-text">{reply.text}</span>
							</button>
						))}
					</div>
				)}
				<textarea
					ref={textareaRef}
					className="message-input-textarea"
					placeholder="Type a message  (try /shortcut)"
					value={text}
					onChange={handleInput}
					onKeyDown={handleKeyDown}
					rows={1}
				/>
			</div>

			{hasText ? (
				<button
					type="button"
					className="send-button send-button--active"
					onClick={handleSend}
					aria-label="Send message"
				>
					<svg viewBox="0 0 24 24">
						<path
							fill="currentColor"
							d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"
						/>
					</svg>
				</button>
			) : (
				<button
					type="button"
					className="send-button send-button--active"
					onClick={startRecording}
					aria-label="Record voice message"
				>
					<svg viewBox="0 0 24 24">
						<path
							fill="currentColor"
							d="M11.999 14.942c2.001 0 3.531-1.53 3.531-3.531V4.35c0-2.001-1.53-3.531-3.531-3.531S8.469 2.35 8.469 4.35v7.061c0 2.001 1.53 3.531 3.53 3.531zm6.238-3.53c0 3.531-2.942 6.002-6.238 6.002s-6.238-2.471-6.238-6.002H4.761c0 3.885 3.156 7.12 7.002 7.591v3.178h2.471V19.003c3.849-.471 7.002-3.706 7.002-7.591h-1.999z"
						/>
					</svg>
				</button>
			)}
		</div>
	);
}
