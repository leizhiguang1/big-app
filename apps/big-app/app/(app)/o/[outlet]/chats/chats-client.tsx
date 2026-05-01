"use client";

import {
	CLIENT_EVENTS,
	IMPLEMENTED_INBOX_CHANNELS,
	type InboxChannel,
	type InboxContact,
	type InboxContactHandles,
	type InboxListResponse,
	type InboxMessage,
	type InboxRow,
	type InboxThreadResponse,
	SERVER_EVENTS,
} from "@aimbig/wa-client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { ComposePicker } from "@/components/inbox/ComposePicker";
import { ContactDetailsPanel } from "@/components/inbox/ContactDetailsPanel";
import { InboxComposer } from "@/components/inbox/InboxComposer";
import { InboxList } from "@/components/inbox/InboxList";
import { InboxThread } from "@/components/inbox/InboxThread";
import { createProjectSocket, WA_CRM_URL } from "@/lib/wa-client";
import "@/components/inbox/inbox.css";

export function ChatsClient({ outletId }: { outletId: string }) {
	const [socket, setSocket] = useState<Socket | null>(null);
	const [rows, setRows] = useState<InboxRow[]>([]);
	const [listLoading, setListLoading] = useState(true);
	const [listError, setListError] = useState<string | null>(null);
	const [channelFilter, setChannelFilter] = useState<InboxChannel | "all">(
		"all",
	);
	const [selectedContactId, setSelectedContactId] = useState<string | null>(
		null,
	);
	const [messages, setMessages] = useState<InboxMessage[]>([]);
	const [contact, setContact] = useState<InboxContact | null>(null);
	const [handles, setHandles] = useState<InboxContactHandles>({});
	const [threadLoading, setThreadLoading] = useState(false);
	const [pickerOpen, setPickerOpen] = useState(false);

	const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const selectedRef = useRef<string | null>(null);
	selectedRef.current = selectedContactId;
	const historyOwnedRef = useRef(false);

	useEffect(() => {
		const s = createProjectSocket(WA_CRM_URL, outletId);
		setSocket(s);
		return () => {
			s.disconnect();
			setSocket(null);
		};
	}, [outletId]);

	const fetchList = useCallback(
		(s: Socket, filter: InboxChannel | "all") => {
			setListLoading(true);
			setListError(null);
			s.emit(
				CLIENT_EVENTS.inboxList,
				{ channelFilter: filter },
				(resp: InboxListResponse) => {
					setListLoading(false);
					if (resp?.error) setListError(resp.error);
					if (resp?.rows) setRows(resp.rows);
				},
			);
		},
		[],
	);

	const fetchThread = useCallback((s: Socket, contactId: string) => {
		setThreadLoading(true);
		s.emit(
			CLIENT_EVENTS.inboxThread,
			{ contactId },
			(resp: InboxThreadResponse) => {
				setThreadLoading(false);
				if (selectedRef.current !== contactId) return;
				setMessages(resp?.messages ?? []);
				setContact(resp?.contact ?? null);
				setHandles(resp?.handles ?? {});
			},
		);
	}, []);

	useEffect(() => {
		if (!socket) return;
		const onConnect = () => fetchList(socket, channelFilter);
		if (socket.connected) onConnect();
		else socket.once("connect", onConnect);
		return () => {
			socket.off("connect", onConnect);
		};
	}, [socket, channelFilter, fetchList]);

	useEffect(() => {
		if (!socket) return;
		if (selectedContactId) fetchThread(socket, selectedContactId);
		else {
			setMessages([]);
			setContact(null);
			setHandles({});
		}
	}, [socket, selectedContactId, fetchThread]);

	useEffect(() => {
		if (!socket) return;
		const handler = () => {
			if (refetchTimer.current) clearTimeout(refetchTimer.current);
			refetchTimer.current = setTimeout(() => {
				fetchList(socket, channelFilter);
				if (selectedRef.current) fetchThread(socket, selectedRef.current);
			}, 250);
		};
		socket.on(SERVER_EVENTS.inboxMessageUpsert, handler);
		return () => {
			socket.off(SERVER_EVENTS.inboxMessageUpsert, handler);
			if (refetchTimer.current) clearTimeout(refetchTimer.current);
		};
	}, [socket, channelFilter, fetchList, fetchThread]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		if (selectedContactId && !historyOwnedRef.current) {
			window.history.pushState({ inboxThread: true }, "");
			historyOwnedRef.current = true;
		}
		const onPop = () => {
			historyOwnedRef.current = false;
			setSelectedContactId(null);
		};
		window.addEventListener("popstate", onPop);
		return () => window.removeEventListener("popstate", onPop);
	}, [selectedContactId]);

	const handleBack = useCallback(() => {
		if (historyOwnedRef.current && typeof window !== "undefined") {
			window.history.back();
		} else {
			setSelectedContactId(null);
		}
	}, []);

	const defaultChannel: InboxChannel = (() => {
		const recent = messages[messages.length - 1]?.channel;
		if (recent && IMPLEMENTED_INBOX_CHANNELS.includes(recent) && handles[recent])
			return recent;
		const fallback = IMPLEMENTED_INBOX_CHANNELS.find((c) => handles[c]);
		return fallback || "whatsapp";
	})();

	if (!socket) {
		return (
			<div className="inbox-root">
				<div className="inbox-thread-empty">Connecting…</div>
			</div>
		);
	}

	return (
		<div className="inbox-root">
			<div
				className={`inbox-page${selectedContactId ? " inbox-page--thread-open" : ""}`}
			>
				<InboxList
					socket={socket}
					rows={rows}
					selectedContactId={selectedContactId}
					onSelect={setSelectedContactId}
					channelFilter={channelFilter}
					onChannelFilterChange={setChannelFilter}
					loading={listLoading}
					onCompose={() => setPickerOpen(true)}
					error={listError}
				/>

				<div className="inbox-thread-col">
					<InboxThread
						messages={messages}
						contact={contact}
						loading={threadLoading}
						onBack={handleBack}
					/>
					{contact && (
						<InboxComposer
							socket={socket}
							contactId={contact.id}
							handles={handles}
							defaultChannel={defaultChannel}
							onSent={() => {
								/* realtime echo refreshes the thread */
							}}
						/>
					)}
				</div>

				<ContactDetailsPanel contact={contact} handles={handles} />

				<ComposePicker
					socket={socket}
					open={pickerOpen}
					onClose={() => setPickerOpen(false)}
					onPick={(contactId) => setSelectedContactId(contactId)}
				/>
			</div>
		</div>
	);
}
