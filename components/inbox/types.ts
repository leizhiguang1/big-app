// Shapes emitted by wa-crm over Socket.IO. Mirror the server payloads exactly.
// Source: wa-crm/backend/src/tenant-formatting.js + socket-handlers.js.

export type ConnectionStatus =
	| "connecting"
	| "qr"
	| "open"
	| "close"
	| "logged_out"
	| "waiting_qr"
	| "stream_replaced"
	| "rate_limited"
	| "nuked"
	| "closed_for_qr"
	| "qr_retry"
	| "deferred_to_acct";

export type FormattedChat = {
	id: string;
	name: string;
	isGroup: boolean;
	imgUrl: string | null;
	timestamp: number;
	lastMessage: string;
	lastMessageFromMe: boolean;
	lastMessageSenderName?: string | null;
	unreadCount: number;
};

export type FormattedMsg = {
	id: string;
	fromMe: boolean;
	timestamp: number;
	text: string | null;
	mediaType: "image" | "video" | "audio" | "sticker" | "document" | null;
	mediaDuration?: number;
	senderJid: string | null;
	senderName: string | null;
	senderPhone?: string | null;
	pushName?: string | null;
	status?: "sending" | "failed" | 0 | 1 | 2 | 3 | 4;
	errorText?: string;
	transcript?: string | null;
	previewUrl?: string | null;
};

export type ConnectionUpdate = {
	status: ConnectionStatus;
	reason?: number;
	rateLimited?: boolean;
	message?: string;
};

export type MessagesUpsertPayload = {
	jid: string;
	messages: FormattedMsg[];
};

export type ProfilePicsUpdate = Record<string, string | null>;

export type PeerTenant = {
	tenantKey: string;
	waPhone: string | null;
	displayName: string | null;
	lineLabel: string | null;
	status: ConnectionStatus;
	isSelf: boolean;
};

export type SendResult =
	| { success: true; message: FormattedMsg }
	| { error: string };

export type GetMessagesResult = {
	messages: FormattedMsg[];
	unreadCount: number;
};
