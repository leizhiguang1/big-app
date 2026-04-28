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
	fileName?: string | null;
	fileSize?: number | null;
	fileMimetype?: string | null;
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

// ── CRM contact ─────────────────────────────────────────────────────────
// Shape emitted by `crm_update` and returned by `get_crm` callback.
// Source: wa-crm/backend/src/tenant-formatting.js `tenantGetFormattedCRM`.

export type CrmTask = {
	id: string;
	text: string;
	done: boolean;
	createdAt?: number;
};

export type CrmContact = {
	jid: string;
	name: string;
	phone: string;
	isGroup: boolean;
	imgUrl: string | null;
	lastMessage: string;
	lastMessageFromMe: boolean;
	lastMessageTime: number;
	tags: string[];
	notes: string;
	crmStatus: string;
	assignedUser: string;
	dnd: boolean;
};

export type CrmContactPatch = {
	jid: string;
	tags?: string[];
	notes?: string;
	assignedUser?: string;
	tasks?: CrmTask[];
	dnd?: boolean;
	crmStatus?: string;
};

export type DuplicateSuggestionContact = {
	jid: string;
	name?: string;
	phone?: string;
	tags?: string[];
	crmStatus?: string;
	hasMessages?: boolean;
};

export type DuplicateSuggestion = {
	reason: "same_name" | "bogus_lid_phone";
	name?: string;
	contacts: DuplicateSuggestionContact[];
	suggestedPrimary?: string;
	suggestedAction?: "delete";
};

// ── Automations ─────────────────────────────────────────────────────────
// wa-crm keeps automations as loose objects. v1 editor only writes
// `send_message` actions, but the shape allows everything wa-crm supports
// so existing automations loaded from wa-crm are preserved on save.

export type AutomationTriggerType =
	| "inbound_message"
	| "keyword_match"
	| "appointment_booked"
	| "appointment_completed"
	| "appointment_cancelled"
	| "scheduler"
	| "birthday_reminder"
	| "inbound_webhook"
	| "new_contact";

// `type` is the well-known catalog or an empty string while building.
// Wa-crm accepts arbitrary strings; future trigger types added there will
// flow through without changing this file.
export type AutomationTrigger = {
	type: AutomationTriggerType | string;
	keywords?: string[];
	time?: string;
	frequency?: "daily" | "weekly" | "monthly";
	webhookId?: string;
	[extra: string]: unknown;
};

export type AutomationSettings = {
	timezone?: string;
	allowReEnrollment?: boolean;
	stopOnResponse?: boolean;
	[extra: string]: unknown;
};

export type AutomationSendMessageAction = {
	type: "send_message";
	id?: string;
	message: string;
	jid?: string;
};

export type AutomationAction =
	| AutomationSendMessageAction
	| ({ type: string; id?: string } & Record<string, unknown>);

export type AutomationRuleGroup = {
	op: "and" | "or";
	rules: Array<{
		field: string;
		op: string;
		value?: string | string[];
	}>;
};

export type Automation = {
	id: string;
	name: string;
	description?: string;
	enabled: boolean;
	folderId?: string | null;
	trigger: AutomationTrigger;
	conditions?: AutomationRuleGroup[];
	actions: AutomationAction[];
	settings?: AutomationSettings;
	createdAt: number;
	updatedAt: number;
};

export type AutomationFolder = {
	id: string;
	name: string;
	workflowIds: string[];
	order?: number;
};

export type AutomationExecutionLog = {
	id: string;
	contactJid: string;
	contactName: string | null;
	triggeredAt: number;
	triggerType: string;
	matchedKeyword: string | null;
	triggerText?: string;
	actionsRun: Array<{
		actionId?: string;
		type: string;
		status: "ok" | "error" | string;
		error?: string;
		at?: number;
	}>;
};

export type AutomationStepCounts = {
	totalTriggers: number;
	byActionId: Record<string, number>;
};

// ── Quick replies ───────────────────────────────────────────────────────

export type QuickReply = {
	id: string;
	shortcut: string;
	text: string;
	updatedAt?: number;
};

// ── AI booking suggestion ───────────────────────────────────────────────

export type BookingSuggestion = {
	jid: string;
	date?: string;
	time?: string;
	service?: string;
	dentist?: string;
	[extra: string]: unknown;
};

// ── AI configuration (stored in wa_ai_configs) ──────────────────────────

export type AIMode = "assist" | "auto" | "off";

export type AIConfig = {
	enabled: boolean;
	model: string;
	apiBase?: string;
	apiKey?: string;
	mode: AIMode;
	systemPrompt?: string;
	knowledgeBase?: string;
	bookingInstructions?: string;
	temperature?: number;
	maxTokens?: number;
	[extra: string]: unknown;
};

// ── Knowledge Base ──────────────────────────────────────────────────────

export type KnowledgeBase = {
	knowledgeBase: string;
	bookingInstructions?: string;
	updatedAt?: number;
};

// ── Multi-line account ──────────────────────────────────────────────────

export type WAAccount = {
	id: string;
	label: string;
	url: string;
	outlet?: string;
};

export type LineLabelResult = {
	ok: boolean;
	lineLabel?: string;
	error?: string;
};

// ── Team members (chat staff) ───────────────────────────────────────────

export type WATeamMember = {
	id: string;
	name: string;
};
