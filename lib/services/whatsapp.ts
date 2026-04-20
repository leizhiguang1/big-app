import type { Context } from "@/lib/context/types";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type { Tables } from "@/lib/supabase/types";
import {
	type ConnectionInfo,
	type ConnectionStatus,
	type QrResult,
	waConnector,
} from "@/lib/wa/client";

export type OutletRow = Tables<"outlets">;

export type OutletWaStatus = {
	outlet: Pick<OutletRow, "id" | "code" | "name" | "wa_connection_id">;
	status: ConnectionStatus | "not_connected";
	phone: string | null;
};

const WEBHOOK_PATH = "/api/webhooks/whatsapp";

function webhookConfig() {
	const appUrl = process.env.APP_URL;
	const webhookSecret = process.env.WA_WEBHOOK_SECRET;
	if (!appUrl) throw new ValidationError("APP_URL is not set");
	if (!webhookSecret) throw new ValidationError("WA_WEBHOOK_SECRET is not set");
	return {
		webhook_url: `${appUrl.replace(/\/$/, "")}${WEBHOOK_PATH}`,
		webhook_secret: webhookSecret,
	};
}

async function getOutlet(
	ctx: Context,
	outletId: string,
): Promise<Pick<OutletRow, "id" | "code" | "name" | "wa_connection_id">> {
	const { data, error } = await ctx.db
		.from("outlets")
		.select("id, code, name, wa_connection_id")
		.eq("id", outletId)
		.single();
	if (error || !data) throw new NotFoundError(`Outlet ${outletId} not found`);
	return data;
}

export async function listOutletWaStatus(
	ctx: Context,
): Promise<OutletWaStatus[]> {
	const { data, error } = await ctx.db
		.from("outlets")
		.select("id, code, name, wa_connection_id, is_active")
		.eq("is_active", true)
		.order("name", { ascending: true });
	if (error) throw new ValidationError(error.message);

	const rows = data ?? [];
	const results = await Promise.all(
		rows.map(async (outlet) => {
			if (!outlet.wa_connection_id) {
				return {
					outlet: {
						id: outlet.id,
						code: outlet.code,
						name: outlet.name,
						wa_connection_id: null,
					},
					status: "not_connected" as const,
					phone: null,
				};
			}
			const info = await fetchConnectionSafe(outlet.wa_connection_id);
			return {
				outlet: {
					id: outlet.id,
					code: outlet.code,
					name: outlet.name,
					wa_connection_id: outlet.wa_connection_id,
				},
				status: info?.status ?? ("disconnected" as const),
				phone: info?.phone ?? null,
			};
		}),
	);
	return results;
}

async function fetchConnectionSafe(
	connectionId: string,
): Promise<ConnectionInfo | null> {
	try {
		return await waConnector.getConnection(connectionId);
	} catch {
		return null;
	}
}

export async function connectOutlet(
	ctx: Context,
	outletId: string,
): Promise<{ connection_id: string }> {
	const outlet = await getOutlet(ctx, outletId);
	if (outlet.wa_connection_id) {
		throw new ValidationError(
			"Outlet already has a WhatsApp connection. Disconnect first.",
		);
	}

	const { webhook_url, webhook_secret } = webhookConfig();
	const created = await waConnector.createConnection({
		label: outlet.name,
		webhook_url,
		webhook_secret,
		metadata: {
			outlet_id: outlet.id,
			outlet_name: outlet.name,
			consumer_product: "big-app",
		},
	});

	const { error } = await ctx.dbAdmin
		.from("outlets")
		.update({ wa_connection_id: created.id })
		.eq("id", outletId);
	if (error) {
		await waConnector.deleteConnection(created.id).catch(() => {});
		throw new ValidationError(error.message);
	}

	return { connection_id: created.id };
}

export async function getOutletQr(
	ctx: Context,
	outletId: string,
): Promise<QrResult> {
	const outlet = await getOutlet(ctx, outletId);
	if (!outlet.wa_connection_id) {
		throw new ValidationError("Outlet has no WhatsApp connection yet");
	}
	return waConnector.getQr(outlet.wa_connection_id);
}

export async function getOutletStatus(
	ctx: Context,
	outletId: string,
): Promise<{
	status: ConnectionStatus | "not_connected";
	phone: string | null;
}> {
	const outlet = await getOutlet(ctx, outletId);
	if (!outlet.wa_connection_id) return { status: "not_connected", phone: null };
	const info = await fetchConnectionSafe(outlet.wa_connection_id);
	return {
		status: info?.status ?? "disconnected",
		phone: info?.phone ?? null,
	};
}

export async function disconnectOutlet(
	ctx: Context,
	outletId: string,
): Promise<void> {
	const outlet = await getOutlet(ctx, outletId);
	if (!outlet.wa_connection_id) return;
	await waConnector.deleteConnection(outlet.wa_connection_id).catch(() => {});
	const { error } = await ctx.dbAdmin
		.from("outlets")
		.update({ wa_connection_id: null })
		.eq("id", outletId);
	if (error) throw new ValidationError(error.message);
}

export async function sendTestMessage(
	ctx: Context,
	outletId: string,
	to: string,
	text: string,
): Promise<{ message_id: string }> {
	const outlet = await getOutlet(ctx, outletId);
	if (!outlet.wa_connection_id) {
		throw new ValidationError("Outlet has no WhatsApp connection");
	}
	const phone = to.replace(/\D/g, "");
	if (!phone) throw new ValidationError("Recipient phone is required");
	if (!text.trim()) throw new ValidationError("Message body is required");
	return waConnector.sendText(outlet.wa_connection_id, { to: phone, text });
}
