// Event-name constants for the wa-crm Socket.IO contract.
//
// Use these instead of string literals so any rename forces a typecheck
// failure across both this repo and wa-crm (which vendors this file).
//
// Convention: SERVER_EVENTS = sent FROM wa-crm TO consumer.
//             CLIENT_EVENTS = sent FROM consumer TO wa-crm.

// wa-crm → consumer
export const SERVER_EVENTS = {
	connect: "connect",
	disconnect: "disconnect",
	chatsUpsert: "chats_upsert",
	messagesUpsert: "messages_upsert",
	connectionUpdate: "connection_update",
	qr: "qr",
	profilePicsUpdate: "profile_pics_update",
	peerLineRemoved: "peer_line_removed",
	lineLabelUpdated: "line_label_updated",
	crmUpdate: "crm_update",
	contactUpsert: "contact_upsert",
	accountStatus: "account_status",
	automationRunStarted: "automation_run_started",
	automationRunFinished: "automation_run_finished",
	// Unified inbox (multi-channel) — wa-crm broadcasts this when any inbox
	// row changed; clients debounce + refetch inbox_list / inbox_thread.
	inboxMessageUpsert: "inbox_message_upsert",
} as const;

// consumer → wa-crm
export const CLIENT_EVENTS = {
	getChats: "get_chats",
	getMessages: "get_messages",
	sendMessage: "send_message",
	markRead: "mark_read",
	requestQr: "request_qr",
	logoutWa: "logout_wa",
	removeLine: "remove_line",
	setLineLabel: "set_line_label",
	getLineLabel: "get_line_label",
	listPeerTenants: "list_peer_tenants",
	resolveGroupName: "resolve_group_name",
	getCrm: "get_crm",
	updateContact: "update_contact",
	disconnectAccount: "disconnect_account",
	addAccount: "add_account",
	saveWorkflow: "save_workflow",
	getWorkflowRuns: "get_workflow_runs",
	// Unified inbox (multi-channel)
	inboxList: "inbox_list",
	inboxThread: "inbox_thread",
	inboxSend: "inbox_send",
	inboxSearchContacts: "inbox_search_contacts",
	inboxCreateContact: "inbox_create_contact",
	inboxResync: "inbox_resync",
} as const;

export type ServerEvent = (typeof SERVER_EVENTS)[keyof typeof SERVER_EVENTS];
export type ClientEvent = (typeof CLIENT_EVENTS)[keyof typeof CLIENT_EVENTS];
