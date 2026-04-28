import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Apex platform-admin sign-out. After signing out, redirect to
// /admin/login (NOT /login — that one redirects to /select-brand at apex
// because there's no brand context).
export async function POST(request: Request) {
	const db = await createClient();
	await db.auth.signOut();

	const url = new URL(request.url);
	const hostHeader = request.headers.get("host");
	if (hostHeader) url.host = hostHeader;
	url.pathname = "/admin/login";
	url.search = "";

	return NextResponse.redirect(url, { status: 303 });
}
