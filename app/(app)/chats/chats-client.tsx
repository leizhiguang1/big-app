"use client";

import { useCallback, useEffect, useState } from "react";
import { ChatList } from "@/components/inbox/ChatList";
import { ChatWindow } from "@/components/inbox/ChatWindow";
import { QRScreen } from "@/components/inbox/QRScreen";
import { getSocket } from "@/components/inbox/socket";
import type {
	ConnectionStatus,
	ConnectionUpdate,
	FormattedChat,
	PeerTenant,
	ProfilePicsUpdate,
} from "@/components/inbox/types";
import "@/components/inbox/inbox.css";

type AppState = "connecting" | "qr" | "connected" | "logged_out";

export function InboxClient() {
	const [appState, setAppState] = useState<AppState>("connecting");
	const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
	const [chats, setChats] = useState<FormattedChat[]>([]);
	const [selectedJid, setSelectedJid] = useState<string | null>(null);
	const [profilePics, setProfilePics] = useState<ProfilePicsUpdate>({});
	const [isSocketConnected, setIsSocketConnected] = useState(false);
	const [connectionStatus, setConnectionStatus] =
		useState<ConnectionStatus>("connecting");
	const [linkedPhone, setLinkedPhone] = useState<string | null>(null);
	const [lineLabel, setLineLabel] = useState<string | null>(null);

	const refreshLinkedPhone = useCallback(() => {
		const socket = getSocket();
		socket.emit("list_peer_tenants", (peers: PeerTenant[]) => {
			if (!Array.isArray(peers)) return;
			const self = peers.find((p) => p.isSelf);
			if (self) {
				setLinkedPhone(self.waPhone ?? null);
				setLineLabel(self.lineLabel ?? null);
			}
		});
	}, []);

	useEffect(() => {
		const socket = getSocket();

		const onConnect = () => {
			setIsSocketConnected(true);
			socket.emit("get_chats");
			refreshLinkedPhone();
		};
		const onDisconnect = () => setIsSocketConnected(false);

		const onConnectionUpdate = ({ status }: ConnectionUpdate) => {
			if (status) setConnectionStatus(status);
			if (status === "qr") setAppState("qr");
			else if (status === "open") {
				setAppState("connected");
				refreshLinkedPhone();
			} else if (status === "connecting") setAppState("connecting");
			else if (status === "logged_out") setAppState("logged_out");
			else if (status === "waiting_qr") socket.emit("request_qr");
		};

		const onQr = (dataUrl: string) => {
			setQrDataUrl(dataUrl);
			setAppState("qr");
		};

		const onChatsUpsert = (updatedChats: FormattedChat[]) => {
			setChats(updatedChats);
			if (updatedChats.length > 0) setAppState("connected");
		};

		const onProfilePicsUpdate = (pics: ProfilePicsUpdate) => {
			setProfilePics((prev) => ({ ...prev, ...pics }));
		};

		socket.on("connect", onConnect);
		socket.on("disconnect", onDisconnect);
		socket.on("connection_update", onConnectionUpdate);
		socket.on("qr", onQr);
		socket.on("chats_upsert", onChatsUpsert);
		socket.on("profile_pics_update", onProfilePicsUpdate);

		if (socket.connected) onConnect();

		return () => {
			socket.off("connect", onConnect);
			socket.off("disconnect", onDisconnect);
			socket.off("connection_update", onConnectionUpdate);
			socket.off("qr", onQr);
			socket.off("chats_upsert", onChatsUpsert);
			socket.off("profile_pics_update", onProfilePicsUpdate);
		};
	}, [refreshLinkedPhone]);

	let body: React.ReactNode;
	if (appState === "qr") {
		body = <QRScreen qrDataUrl={qrDataUrl} />;
	} else if (appState === "logged_out") {
		body = (
			<div className="center-screen">
				<div className="error-card">
					<h2>WhatsApp not linked</h2>
					<p>
						No phone is linked to this connection. Scan a QR code to link one.
					</p>
					<button
						type="button"
						className="primary-btn"
						onClick={() => getSocket().emit("request_qr")}
					>
						Scan QR to link a phone
					</button>
				</div>
			</div>
		);
	} else if (appState === "connecting") {
		body = (
			<div className="center-screen">
				<div className="loading-spinner" />
				<p className="loading-text">Connecting to WhatsApp…</p>
			</div>
		);
	} else {
		const selectedChat = chats.find((c) => c.id === selectedJid);
		body = (
			<div className="app-layout">
				<ChatList
					chats={chats}
					selectedJid={selectedJid}
					onSelectChat={setSelectedJid}
					profilePics={profilePics}
					connectionStatus={connectionStatus}
					linkedPhone={linkedPhone}
					lineLabel={lineLabel}
				/>
				<div className="chat-area">
					{selectedJid && selectedChat ? (
						<ChatWindow
							jid={selectedJid}
							chatName={selectedChat.name ?? selectedJid}
							isGroup={selectedChat.isGroup ?? false}
							profilePics={profilePics}
						/>
					) : (
						<div className="no-chat-selected">
							<h2>WhatsApp Inbox</h2>
							<p>
								Select a chat to start messaging. Your messages are delivered
								through the WhatsApp service.
							</p>
						</div>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="wa-inbox-root">
			{!isSocketConnected && (
				<div className="connection-banner">
					Reconnecting to WhatsApp service…
				</div>
			)}
			{body}
		</div>
	);
}
