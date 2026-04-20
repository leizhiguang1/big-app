import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function verifySignature(rawBody: string, header: string | null): boolean {
	const secret = process.env.WA_WEBHOOK_SECRET;
	if (!secret || !header) return false;
	const expected = createHmac("sha256", secret)
		.update(rawBody, "utf8")
		.digest("hex");
	const provided = header.startsWith("sha256=") ? header.slice(7) : header;
	const a = Buffer.from(expected, "hex");
	const b = Buffer.from(provided, "hex");
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}

export async function POST(req: Request) {
	const raw = await req.text();
	const sig = req.headers.get("x-signature");
	if (!verifySignature(raw, sig)) {
		return NextResponse.json({ error: "invalid signature" }, { status: 401 });
	}

	let event: { event?: string; connection_id?: string; payload?: unknown };
	try {
		event = JSON.parse(raw);
	} catch {
		return NextResponse.json({ error: "invalid json" }, { status: 400 });
	}

	// Hello-world: just log. Full handling (mirror inbound messages into
	// conversations, fan out to notifications) lands when we port the Aoikumo UI.
	console.log("[wa webhook]", event.event, event.connection_id, event.payload);
	return NextResponse.json({ ok: true });
}
