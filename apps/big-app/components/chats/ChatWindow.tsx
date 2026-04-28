"use client";

import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Info } from "lucide-react";
import { BookingSuggestionBanner } from "./BookingSuggestionBanner";
import { ContactInfoSheet } from "./ContactInfoSheet";
import { getSocket, WA_CRM_URL } from "./socket";
import { MessageInput } from "./MessageInput";
import type {
	BookingSuggestion,
	CrmContact,
	FormattedMsg,
	GetMessagesResult,
	MessagesUpsertPayload,
	ProfilePicsUpdate,
	SendResult,
} from "./types";

const INITIAL_VISIBLE_MESSAGES = 100;
const LOAD_MORE_STEP = 100;

const SENDER_COLORS = [
	"#e15d64",
	"#00a89d",
	"#6bc06b",
	"#e55ea2",
	"#f5a623",
	"#5b6ef0",
	"#ef7e40",
	"#1fa855",
];

function getSenderColor(jid: string | null): string {
	if (!jid) return SENDER_COLORS[0];
	let hash = 0;
	for (let i = 0; i < jid.length; i++)
		hash = jid.charCodeAt(i) + ((hash << 5) - hash);
	return SENDER_COLORS[Math.abs(hash) % SENDER_COLORS.length];
}

function formatMessageTime(timestamp: number): string {
	if (!timestamp) return "";
	return new Date(timestamp * 1000).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});
}

function formatDateLabel(timestamp: number): string {
	if (!timestamp) return "";
	const date = new Date(timestamp * 1000);
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const diffDays = Math.round(
		(today.getTime() - msgDay.getTime()) / (1000 * 60 * 60 * 24),
	);

	if (diffDays === 0) return "TODAY";
	if (diffDays === 1) return "YESTERDAY";
	return date
		.toLocaleDateString([], {
			month: "numeric",
			day: "numeric",
			year: "numeric",
		})
		.toUpperCase();
}

function getDayKey(timestamp: number): string {
	if (!timestamp) return "";
	const d = new Date(timestamp * 1000);
	return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function TickSent() {
	return (
		<span className="message-ticks">
			<svg viewBox="0 0 16 11" className="tick-sent">
				<path
					fill="currentColor"
					d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.336-.153.457.457 0 0 0-.336.153.434.434 0 0 0 0 .611l2.357 2.46a.574.574 0 0 0 .373.178.481.481 0 0 0 .398-.178l6.537-8.076a.434.434 0 0 0-.107-.612z"
				/>
			</svg>
		</span>
	);
}
function TickDelivered() {
	return (
		<span className="message-ticks">
			<svg viewBox="0 0 16 11" className="tick-delivered">
				<path
					fill="currentColor"
					d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.336-.153.457.457 0 0 0-.336.153.434.434 0 0 0 0 .611l2.357 2.46a.574.574 0 0 0 .373.178.481.481 0 0 0 .398-.178l6.537-8.076a.434.434 0 0 0-.107-.612z"
				/>
				<path
					fill="currentColor"
					d="M14.757.653a.457.457 0 0 0-.305-.102.493.493 0 0 0-.381.178l-6.19 7.636-1.18-1.229-.305.377 1.441 1.503a.574.574 0 0 0 .373.178.481.481 0 0 0 .398-.178l6.537-8.076a.434.434 0 0 0-.107-.612z"
				/>
			</svg>
		</span>
	);
}
function TickRead() {
	return (
		<span className="message-ticks">
			<svg viewBox="0 0 16 11" className="tick-read">
				<path
					fill="currentColor"
					d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.336-.153.457.457 0 0 0-.336.153.434.434 0 0 0 0 .611l2.357 2.46a.574.574 0 0 0 .373.178.481.481 0 0 0 .398-.178l6.537-8.076a.434.434 0 0 0-.107-.612z"
				/>
				<path
					fill="currentColor"
					d="M14.757.653a.457.457 0 0 0-.305-.102.493.493 0 0 0-.381.178l-6.19 7.636-1.18-1.229-.305.377 1.441 1.503a.574.574 0 0 0 .373.178.481.481 0 0 0 .398-.178l6.537-8.076a.434.434 0 0 0-.107-.612z"
				/>
			</svg>
		</span>
	);
}
function TickPending() {
	return (
		<span className="message-ticks">
			<svg viewBox="0 0 16 15" className="tick-pending">
				<path
					fill="currentColor"
					d="M9.75 7.713H8.244V5.359a.5.5 0 0 0-.5-.5H7.65a.5.5 0 0 0-.5.5v2.947a.5.5 0 0 0 .5.5h2.1a.5.5 0 0 0 .5-.5v-.093a.5.5 0 0 0-.5-.5zm-1.2-5.783a5.63 5.63 0 0 0-5.63 5.63 5.63 5.63 0 0 0 5.63 5.63 5.63 5.63 0 0 0 5.63-5.63 5.63 5.63 0 0 0-5.63-5.63zm0 10.26a4.63 4.63 0 1 1 0-9.26 4.63 4.63 0 0 1 0 9.26z"
				/>
			</svg>
		</span>
	);
}
function TickFailed() {
	return (
		<span className="message-ticks" aria-label="Failed to send">
			<svg viewBox="0 0 16 16" className="tick-failed" width="14" height="14">
				<circle
					cx="8"
					cy="8"
					r="7"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
				/>
				<path d="M8 4v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
				<circle cx="8" cy="11.5" r="0.9" fill="currentColor" />
			</svg>
		</span>
	);
}

function MessageTicks({
	status,
	fromMe,
}: {
	status: FormattedMsg["status"];
	fromMe: boolean;
}) {
	if (!fromMe) return null;
	if (status === "failed") return <TickFailed />;
	if (status === "sending" || status === 0 || status === 1)
		return <TickPending />;
	if (status === 2) return <TickSent />;
	if (status === 3) return <TickDelivered />;
	if (status === 4) return <TickRead />;
	return <TickDelivered />;
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

function formatFileSize(bytes: number): string {
	if (!bytes) return "";
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
	return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function mergeMessages(msgs: FormattedMsg[]): FormattedMsg[] {
	const map = new Map<string, FormattedMsg>();
	for (const m of msgs) map.set(m.id, m);
	return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
}

type RenderedItem =
	| { type: "date"; key: string; label: string }
	| { type: "unread"; key: string; count: number }
	| {
			type: "message";
			key: string;
			msg: FormattedMsg;
			isContinuation: boolean;
			showSenderName: boolean;
	  };

export function ChatWindow({
	jid,
	chatName,
	isGroup,
	profilePics,
}: {
	jid: string;
	chatName: string;
	isGroup: boolean;
	profilePics: ProfilePicsUpdate;
}) {
	const [messages, setMessages] = useState<FormattedMsg[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [unreadCount, setUnreadCount] = useState(0);
	const [animKey, setAnimKey] = useState(0);
	const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_MESSAGES);
	const [bookingSuggestion, setBookingSuggestion] =
		useState<BookingSuggestion | null>(null);
	const [contactInfoOpen, setContactInfoOpen] = useState(false);
	const [crmContact, setCrmContact] = useState<CrmContact | null>(null);
	const bottomRef = useRef<HTMLDivElement | null>(null);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const unreadDividerRef = useRef<HTMLDivElement | null>(null);
	const justLoadedRef = useRef(false);
	const restoreScrollRef = useRef<number | null>(null);
	const imgUrl = profilePics?.[jid] ?? null;

	const fetchMessages = useCallback(
		(isReconnect = false) => {
			if (!isReconnect) {
				setIsLoading(true);
				setUnreadCount(0);
				setAnimKey((k) => k + 1);
			}
			const socket = getSocket();
			socket.emit(
				"get_messages",
				{ jid },
				(res: GetMessagesResult | FormattedMsg[]) => {
					const msgs = Array.isArray(res) ? res : res?.messages ?? [];
					const count = Array.isArray(res) ? 0 : res?.unreadCount ?? 0;
					if (!isReconnect) justLoadedRef.current = true;
					setMessages((prev) => mergeMessages([...prev, ...msgs]));
					if (!isReconnect) {
						setUnreadCount(count);
						setIsLoading(false);
					}
					socket.emit("mark_read", { jid });
				},
			);
		},
		[jid],
	);

	useEffect(() => {
		setMessages([]);
		setVisibleCount(INITIAL_VISIBLE_MESSAGES);
		fetchMessages(false);
	}, [fetchMessages]);

	useEffect(() => {
		if (unreadCount > 0) {
			setVisibleCount((n) => Math.max(n, unreadCount + 20));
		}
	}, [unreadCount]);

	useEffect(() => {
		const socket = getSocket();
		const onReconnect = () => fetchMessages(true);
		socket.on("connect", onReconnect);
		return () => {
			socket.off("connect", onReconnect);
		};
	}, [fetchMessages]);

	useEffect(() => {
		const socket = getSocket();
		const handler = ({
			jid: inJid,
			messages: newMsgs,
		}: MessagesUpsertPayload) => {
			if (inJid !== jid) return;
			setMessages((prev) => mergeMessages([...prev, ...newMsgs]));
		};
		socket.on("messages_upsert", handler);
		return () => {
			socket.off("messages_upsert", handler);
		};
	}, [jid]);

	useEffect(() => {
		const socket = getSocket();
		const handler = ({
			jid: inJid,
			msgId,
			transcript,
		}: { jid: string; msgId: string; transcript: string }) => {
			if (inJid !== jid) return;
			setMessages((prev) =>
				prev.map((m) => (m.id === msgId ? { ...m, transcript } : m)),
			);
		};
		socket.on("message_transcript", handler);
		return () => {
			socket.off("message_transcript", handler);
		};
	}, [jid]);

	useEffect(() => {
		setBookingSuggestion(null);
		const socket = getSocket();
		const onSuggestion = (s: BookingSuggestion) => {
			if (s.jid === jid) setBookingSuggestion(s);
		};
		const onCleared = ({ jid: clearedJid }: { jid: string }) => {
			if (clearedJid === jid) setBookingSuggestion(null);
		};
		socket.on("ai_booking_suggestion", onSuggestion);
		socket.on("booking_suggestion_cleared", onCleared);
		return () => {
			socket.off("ai_booking_suggestion", onSuggestion);
			socket.off("booking_suggestion_cleared", onCleared);
		};
	}, [jid]);

	useEffect(() => {
		const socket = getSocket();
		const findContact = (list: CrmContact[]) => {
			const match = list.find((c) => c.jid === jid);
			setCrmContact(match ?? null);
		};
		socket.emit("get_crm", (list: CrmContact[]) => {
			if (Array.isArray(list)) findContact(list);
		});
		const onCrm = (list: CrmContact[]) => {
			if (Array.isArray(list)) findContact(list);
		};
		socket.on("crm_update", onCrm);
		return () => {
			socket.off("crm_update", onCrm);
		};
	}, [jid]);

	const dismissBooking = useCallback(() => {
		setBookingSuggestion(null);
		getSocket().emit("clear_booking_suggestion", { jid });
	}, [jid]);

	useEffect(() => {
		if (messages.length === 0) return;
		const container = containerRef.current;
		if (!container) return;

		if (justLoadedRef.current) {
			if (unreadDividerRef.current) {
				unreadDividerRef.current.scrollIntoView({ block: "start" });
			} else {
				container.scrollTop = container.scrollHeight;
			}
			justLoadedRef.current = false;
		} else {
			const distFromBottom =
				container.scrollHeight - container.scrollTop - container.clientHeight;
			if (distFromBottom < 120) {
				bottomRef.current?.scrollIntoView({ behavior: "smooth" });
			}
		}
	}, [messages]);

	const finalizeSend = useCallback(
		(
			tempId: string,
			carryOver: Partial<FormattedMsg>,
			result: SendResult | undefined,
		) => {
			if (result && "error" in result) {
				setMessages((prev) =>
					prev.map((m) =>
						m.id === tempId
							? { ...m, status: "failed", errorText: result.error }
							: m,
					),
				);
				return;
			}
			if (result && "success" in result) {
				const real = result.message;
				if (real && real.id) {
					setMessages((prev) =>
						mergeMessages([
							...prev.filter((m) => m.id !== tempId),
							{ ...real, ...carryOver },
						]),
					);
				} else {
					setMessages((prev) =>
						prev.map((m) =>
							m.id === tempId ? { ...m, status: 2 as const } : m,
						),
					);
				}
				return;
			}
			setMessages((prev) =>
				prev.map((m) =>
					m.id === tempId
						? { ...m, status: "failed", errorText: "No response from server" }
						: m,
				),
			);
		},
		[],
	);

	const armSendTimeout = useCallback((tempId: string, ms = 60000) => {
		return setTimeout(() => {
			setMessages((prev) =>
				prev.map((m) =>
					m.id === tempId && m.status === "sending"
						? { ...m, status: "failed", errorText: "Upload timed out" }
						: m,
				),
			);
		}, ms);
	}, []);

	const handleSend = useCallback(
		(text: string) => {
			if (!text.trim()) return;
			const tempId = `temp-${Date.now()}`;
			const optimistic: FormattedMsg = {
				id: tempId,
				fromMe: true,
				timestamp: Math.floor(Date.now() / 1000),
				text,
				mediaType: null,
				senderJid: null,
				senderName: "You",
				status: "sending",
			};
			setMessages((prev) => [...prev, optimistic]);
			const timer = armSendTimeout(tempId, 30000);
			getSocket().emit(
				"send_message",
				{ jid, text },
				(result: SendResult | undefined) => {
					clearTimeout(timer);
					finalizeSend(tempId, {}, result);
				},
			);
		},
		[jid, armSendTimeout, finalizeSend],
	);

	const handleSendImage = useCallback(
		({
			imageBase64,
			mimetype,
			caption,
		}: {
			imageBase64: string;
			mimetype: string;
			name: string;
			caption: string;
		}) => {
			const tempId = `temp-img-${Date.now()}`;
			const previewUrl = `data:${mimetype};base64,${imageBase64}`;
			const optimistic: FormattedMsg = {
				id: tempId,
				fromMe: true,
				timestamp: Math.floor(Date.now() / 1000),
				text: caption || null,
				mediaType: "image",
				senderJid: null,
				senderName: "You",
				status: "sending",
				previewUrl,
			};
			setMessages((prev) => [...prev, optimistic]);
			const timer = armSendTimeout(tempId);
			getSocket().emit(
				"send_image",
				{ jid, imageBase64, mimetype, caption },
				(result: SendResult | undefined) => {
					clearTimeout(timer);
					finalizeSend(tempId, { previewUrl }, result);
				},
			);
		},
		[jid, armSendTimeout, finalizeSend],
	);

	const handleSendVideo = useCallback(
		({
			videoBase64,
			mimetype,
			caption,
		}: {
			videoBase64: string;
			mimetype: string;
			name: string;
			caption: string;
		}) => {
			const tempId = `temp-video-${Date.now()}`;
			const previewUrl = `data:${mimetype};base64,${videoBase64}`;
			const optimistic: FormattedMsg = {
				id: tempId,
				fromMe: true,
				timestamp: Math.floor(Date.now() / 1000),
				text: caption || null,
				mediaType: "video",
				senderJid: null,
				senderName: "You",
				status: "sending",
				previewUrl,
			};
			setMessages((prev) => [...prev, optimistic]);
			const timer = armSendTimeout(tempId);
			getSocket().emit(
				"send_video",
				{ jid, videoBase64, mimetype, caption },
				(result: SendResult | undefined) => {
					clearTimeout(timer);
					finalizeSend(tempId, { previewUrl }, result);
				},
			);
		},
		[jid, armSendTimeout, finalizeSend],
	);

	const handleSendDocument = useCallback(
		({
			fileBase64,
			mimetype,
			fileName,
			caption,
		}: {
			fileBase64: string;
			mimetype: string;
			fileName: string;
			caption: string;
		}) => {
			const tempId = `temp-doc-${Date.now()}`;
			const approxSize = Math.floor((fileBase64.length * 3) / 4);
			const optimistic: FormattedMsg = {
				id: tempId,
				fromMe: true,
				timestamp: Math.floor(Date.now() / 1000),
				text: caption || null,
				mediaType: "document",
				senderJid: null,
				senderName: "You",
				status: "sending",
				fileName,
				fileMimetype: mimetype,
				fileSize: approxSize,
			};
			setMessages((prev) => [...prev, optimistic]);
			const timer = armSendTimeout(tempId);
			getSocket().emit(
				"send_document",
				{ jid, fileBase64, mimetype, fileName, caption },
				(result: SendResult | undefined) => {
					clearTimeout(timer);
					finalizeSend(tempId, {}, result);
				},
			);
		},
		[jid, armSendTimeout, finalizeSend],
	);

	const handleSendAudio = useCallback(
		(payload: Blob | { audioBase64: string; mimetype: string }) => {
			const tempId = `temp-audio-${Date.now()}`;
			const optimistic: FormattedMsg = {
				id: tempId,
				fromMe: true,
				timestamp: Math.floor(Date.now() / 1000),
				text: "🎙 Voice message…",
				mediaType: null,
				senderJid: null,
				senderName: "You",
				status: "sending",
			};
			setMessages((prev) => [...prev, optimistic]);

			const emit = (audioBase64: string, mimetype: string) => {
				const timer = armSendTimeout(tempId);
				getSocket().emit(
					"send_audio",
					{ jid, audioBase64, mimetype },
					(result: SendResult | undefined) => {
						clearTimeout(timer);
						finalizeSend(tempId, {}, result);
					},
				);
			};

			if (payload instanceof Blob) {
				const blob = payload;
				const reader = new FileReader();
				reader.onloadend = () => {
					const result = reader.result;
					if (typeof result !== "string") return;
					const base64 = result.split(",")[1];
					if (!base64) {
						setMessages((prev) =>
							prev.map((m) =>
								m.id === tempId
									? {
											...m,
											status: "failed",
											text: "🎙 Voice message (failed)",
											errorText: "Could not read audio",
										}
									: m,
							),
						);
						return;
					}
					emit(base64, blob.type || "audio/ogg; codecs=opus");
				};
				reader.readAsDataURL(blob);
			} else {
				emit(
					payload.audioBase64,
					payload.mimetype || "audio/ogg; codecs=opus",
				);
			}
		},
		[jid, armSendTimeout, finalizeSend],
	);

	const visibleMessages = useMemo(
		() =>
			messages.length > visibleCount
				? messages.slice(messages.length - visibleCount)
				: messages,
		[messages, visibleCount],
	);

	const hasOlderMessages = messages.length > visibleMessages.length;

	const unreadStartMsgId = useMemo(() => {
		if (unreadCount <= 0) return null;
		let incomingCount = 0;
		for (let i = visibleMessages.length - 1; i >= 0; i--) {
			if (!visibleMessages[i].fromMe) {
				incomingCount++;
				if (incomingCount === unreadCount) return visibleMessages[i].id;
			}
		}
		return visibleMessages.find((m) => !m.fromMe)?.id ?? null;
	}, [visibleMessages, unreadCount]);

	const renderedMessages = useMemo<RenderedItem[]>(() => {
		const items: RenderedItem[] = [];
		let lastDay = "";
		let lastSender = "";
		let lastTime = 0;
		let unreadInserted = false;

		for (const msg of visibleMessages) {
			if (!msg.text && !msg.mediaType) continue;

			if (!unreadInserted && unreadStartMsgId && msg.id === unreadStartMsgId) {
				items.push({
					type: "unread",
					key: "unread-divider",
					count: unreadCount,
				});
				unreadInserted = true;
				lastSender = "";
				lastTime = 0;
			}

			const day = getDayKey(msg.timestamp);
			if (day !== lastDay) {
				items.push({
					type: "date",
					key: `date-${day}`,
					label: formatDateLabel(msg.timestamp),
				});
				lastDay = day;
				lastSender = "";
				lastTime = 0;
			}

			const senderKey = msg.fromMe
				? "__me__"
				: msg.senderJid || "__unknown__";
			const timeDiff = msg.timestamp - lastTime;
			const isContinuation = senderKey === lastSender && timeDiff < 60;

			items.push({
				type: "message",
				key: msg.id,
				msg,
				isContinuation,
				showSenderName: isGroup && !msg.fromMe && !isContinuation,
			});

			lastSender = senderKey;
			lastTime = msg.timestamp;
		}
		return items;
	}, [visibleMessages, isGroup, unreadCount, unreadStartMsgId]);

	const loadOlderMessages = useCallback(() => {
		const container = containerRef.current;
		if (container) restoreScrollRef.current = container.scrollHeight;
		setVisibleCount((n) => n + LOAD_MORE_STEP);
	}, []);

	useLayoutEffect(() => {
		if (restoreScrollRef.current == null) return;
		const container = containerRef.current;
		if (container) {
			const delta = container.scrollHeight - restoreScrollRef.current;
			if (delta > 0) container.scrollTop += delta;
		}
		restoreScrollRef.current = null;
	}, [visibleMessages]);

	return (
		<div className="chat-window">
			<div className="chat-window-header">
				<button
					type="button"
					onClick={() => !isGroup && setContactInfoOpen(true)}
					className="avatar avatar--header"
					aria-label="Open contact info"
					disabled={isGroup}
				>
					{imgUrl ? <img src={imgUrl} alt="" /> : <DefaultAvatar />}
				</button>
				<button
					type="button"
					onClick={() => !isGroup && setContactInfoOpen(true)}
					className="chat-window-info"
					disabled={isGroup}
				>
					<span className="chat-window-name">{chatName}</span>
					<span className="chat-window-status">
						{isGroup ? "Group chat" : "Click for contact info"}
					</span>
				</button>
				<div className="chat-window-header-actions">
					{!isGroup && (
						<button
							type="button"
							className="header-icon-btn"
							aria-label="Contact info"
							onClick={() => setContactInfoOpen(true)}
						>
							<Info size={18} />
						</button>
					)}
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

			{bookingSuggestion && (
				<BookingSuggestionBanner
					suggestion={bookingSuggestion}
					onAccept={dismissBooking}
					onDismiss={dismissBooking}
				/>
			)}

			<div className="messages-container" ref={containerRef}>
				{isLoading ? (
					<div className="msg-skeleton-list">
						<div className="msg-skeleton" />
						<div className="msg-skeleton msg-skeleton--tall" />
						<div className="msg-skeleton msg-skeleton--out" />
						<div className="msg-skeleton" />
						<div className="msg-skeleton msg-skeleton--out msg-skeleton--tall" />
						<div className="msg-skeleton" />
						<div className="msg-skeleton msg-skeleton--out" />
					</div>
				) : messages.length === 0 ? (
					<div className="messages-empty">No messages yet</div>
				) : (
					<div key={animKey} className="messages-list messages-animate">
						{hasOlderMessages && (
							<div className="load-older-wrap">
								<button
									type="button"
									className="load-older-btn"
									onClick={loadOlderMessages}
								>
									Load older messages
								</button>
							</div>
						)}
						{renderedMessages.map((item) => {
							if (item.type === "date") {
								return (
									<div key={item.key} className="date-separator">
										<span className="date-separator-pill">{item.label}</span>
									</div>
								);
							}

							if (item.type === "unread") {
								return (
									<div
										key={item.key}
										className="unread-divider"
										ref={unreadDividerRef}
									>
										<span className="unread-divider-pill">
											{item.count} unread message{item.count !== 1 ? "s" : ""}
										</span>
									</div>
								);
							}

							const { msg, isContinuation, showSenderName } = item;
							return (
								<div
									key={item.key}
									className={`message-row ${
										msg.fromMe ? "message-row--out" : "message-row--in"
									} ${!isContinuation ? "message-row--tail" : ""}`}
								>
									<div
										className={`message-bubble ${
											msg.fromMe
												? "message-bubble--out"
												: "message-bubble--in"
										} ${isContinuation ? "message-bubble--continuation" : ""}`}
									>
										{showSenderName && (
											<div
												className="message-sender-name"
												style={{ color: getSenderColor(msg.senderJid) }}
											>
												{(() => {
													const name =
														msg.pushName || msg.senderName || "Unknown";
													if (
														msg.senderPhone &&
														!name.includes(msg.senderPhone)
													) {
														return `${name}  +${msg.senderPhone}`;
													}
													return name;
												})()}
											</div>
										)}
										{msg.mediaType === "image" ||
										msg.mediaType === "sticker" ? (
											<div className="message-media">
												<img
													src={
														msg.previewUrl ??
														`${WA_CRM_URL}/api/media/${encodeURIComponent(jid)}/${msg.id}`
													}
													alt="Photo"
													className="message-img"
													loading="lazy"
												/>
												{msg.text && (
													<span className="message-text message-caption">
														{msg.text}
													</span>
												)}
											</div>
										) : msg.mediaType === "audio" ? (
											<div className="message-media message-media--audio">
												<audio
													controls
													src={`${WA_CRM_URL}/api/media/${encodeURIComponent(jid)}/${msg.id}`}
													className="message-audio"
													preload="none"
												/>
												{msg.transcript && (
													<span className="message-text message-transcript">
														{msg.transcript}
													</span>
												)}
											</div>
										) : msg.mediaType === "video" ? (
											<div className="message-media">
												<video
													controls
													src={
														msg.previewUrl ??
														`${WA_CRM_URL}/api/media/${encodeURIComponent(jid)}/${msg.id}`
													}
													className="message-video"
													preload="none"
												/>
												{msg.text && (
													<span className="message-text message-caption">
														{msg.text}
													</span>
												)}
											</div>
										) : msg.mediaType === "document" ? (
											<div className="message-media message-media--document">
												<a
													className="message-document"
													href={`${WA_CRM_URL}/api/media/${encodeURIComponent(jid)}/${msg.id}`}
													download={msg.fileName ?? undefined}
													target="_blank"
													rel="noreferrer"
												>
													<span className="message-document-icon" aria-hidden>
														<svg viewBox="0 0 24 24" width="28" height="28">
															<path
																fill="currentColor"
																d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm0 7V3.5L19.5 9H14z"
															/>
														</svg>
													</span>
													<span className="message-document-info">
														<span className="message-document-name">
															{msg.fileName ?? "Document"}
														</span>
														{(msg.fileMimetype || msg.fileSize) && (
															<span className="message-document-meta">
																{msg.fileMimetype ?? ""}
																{msg.fileMimetype && msg.fileSize ? " · " : ""}
																{msg.fileSize
																	? formatFileSize(msg.fileSize)
																	: ""}
															</span>
														)}
													</span>
												</a>
												{msg.text && (
													<span className="message-text message-caption">
														{msg.text}
													</span>
												)}
											</div>
										) : (
											<span className="message-text">{msg.text}</span>
										)}
										<div className="message-meta">
											<span className="message-time">
												{formatMessageTime(msg.timestamp)}
											</span>
											<MessageTicks status={msg.status} fromMe={msg.fromMe} />
										</div>
									</div>
									{msg.status === "failed" && (
										<span
											className="message-failed-caption"
											title={msg.errorText || "Failed to send"}
										>
											Failed to send
										</span>
									)}
								</div>
							);
						})}
					</div>
				)}
				<div ref={bottomRef} />
			</div>

			<MessageInput
				onSend={handleSend}
				onSendAudio={handleSendAudio}
				onSendImage={handleSendImage}
				onSendVideo={handleSendVideo}
				onSendDocument={handleSendDocument}
			/>

			<ContactInfoSheet
				open={contactInfoOpen}
				onOpenChange={setContactInfoOpen}
				jid={jid}
				chatName={chatName}
				imgUrl={imgUrl}
				contact={crmContact}
			/>
		</div>
	);
}
