// Thin HTTP wrapper around wa-connector's REST API.
// Contract: /Users/leizhiguang/Documents/Programming/1-FunnelDuo/wa-connector/BIG_APP_INTEGRATION.md
// This file does NOT know about Supabase, React, or Next. It only speaks HTTP + JSON.
// The service layer (lib/services/whatsapp.ts) wires it to Context + DB.

export type ConnectionStatus =
	| "pairing"
	| "connected"
	| "disconnected"
	| "reconnecting";

export type ConnectionMetadata = {
	outlet_id: string;
	outlet_name: string;
	consumer_product: "big-app";
};

export type CreateConnectionInput = {
	label?: string;
	webhook_url: string;
	webhook_secret: string;
	metadata: ConnectionMetadata;
};

export type CreateConnectionResult = {
	id: string;
	status: ConnectionStatus;
	label: string | null;
	qr_code: string | null;
	created_at: string;
};

export type ConnectionInfo = {
	id: string;
	status: ConnectionStatus;
	label: string | null;
	phone: string | null;
	metadata: Record<string, unknown>;
	connected_at: string | null;
	last_seen_at: string | null;
	created_at: string;
};

export type QrResult = {
	qr_code: string | null;
	qr_raw: string | null;
	expires_at: number | null;
};

export type SendTextInput = {
	to: string;
	text: string;
	quoted_message_id?: string;
};

export type SendResult = {
	message_id: string;
};

function getConfig() {
	const baseUrl = process.env.WA_CONNECTOR_URL;
	const apiKey = process.env.WA_CONNECTOR_API_KEY;
	if (!baseUrl) throw new Error("WA_CONNECTOR_URL is not set");
	if (!apiKey) throw new Error("WA_CONNECTOR_API_KEY is not set");
	return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey };
}

async function request<T>(
	path: string,
	init: RequestInit & { json?: unknown; allow404?: boolean } = {},
): Promise<T> {
	const { baseUrl, apiKey } = getConfig();
	const { json, allow404, headers, ...rest } = init;
	const res = await fetch(`${baseUrl}${path}`, {
		...rest,
		headers: {
			Authorization: `Bearer ${apiKey}`,
			...(json !== undefined ? { "Content-Type": "application/json" } : {}),
			...headers,
		},
		body: json !== undefined ? JSON.stringify(json) : rest.body,
		cache: "no-store",
	});
	if (allow404 && res.status === 404) return null as T;
	if (!res.ok) {
		const body = await res.text().catch(() => "");
		throw new Error(
			`wa-connector ${rest.method ?? "GET"} ${path} failed: ${res.status} ${body}`,
		);
	}
	if (res.status === 204) return undefined as T;
	return (await res.json()) as T;
}

export const waConnector = {
	createConnection(input: CreateConnectionInput) {
		return request<CreateConnectionResult>("/connections", {
			method: "POST",
			json: input,
		});
	},

	getConnection(connectionId: string) {
		return request<ConnectionInfo>(`/connections/${connectionId}`);
	},

	async getQr(connectionId: string): Promise<QrResult> {
		const res = await request<QrResult | null>(
			`/connections/${connectionId}/qr`,
			{ allow404: true },
		);
		return res ?? { qr_code: null, qr_raw: null, expires_at: null };
	},

	reconnect(connectionId: string) {
		return request<{ ok: true }>(`/connections/${connectionId}/reconnect`, {
			method: "POST",
		});
	},

	deleteConnection(connectionId: string) {
		return request<void>(`/connections/${connectionId}`, { method: "DELETE" });
	},

	sendText(connectionId: string, input: SendTextInput) {
		return request<SendResult>(`/connections/${connectionId}/messages`, {
			method: "POST",
			json: { type: "text", ...input },
		});
	},
};

export type WebhookEvent =
	| {
			event: "connection.status";
			payload: { status: ConnectionStatus; phone?: string | null };
	  }
	| { event: "message.inbound"; payload: unknown }
	| { event: "message.outbound"; payload: unknown }
	| { event: "message.status"; payload: unknown }
	| { event: "message.reaction"; payload: unknown }
	| { event: "contact.updated"; payload: unknown }
	| { event: "history.sync.started"; payload: unknown }
	| { event: "history.sync.completed"; payload: unknown };

export type WebhookEnvelope = WebhookEvent & {
	connection_id: string;
	metadata: ConnectionMetadata;
	timestamp: number;
};
