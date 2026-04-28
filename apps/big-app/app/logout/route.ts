import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
	const db = await createClient();
	await db.auth.signOut();

	// Build the redirect from the Host header so we always land back on the
	// SAME subdomain the user logged out from. `request.url` alone can lose
	// the original host behind some proxies / dev configurations.
	const url = new URL(request.url);
	const hostHeader = request.headers.get("host");
	if (hostHeader) url.host = hostHeader;
	url.pathname = "/login";
	url.search = "";

	return NextResponse.redirect(url, { status: 303 });
}
