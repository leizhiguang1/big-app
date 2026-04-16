import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
	const { searchParams, origin } = new URL(request.url);
	const code = searchParams.get("code");

	if (!code) {
		return NextResponse.redirect(`${origin}/login?error=missing_code`);
	}

	const db = await createClient();
	const { error } = await db.auth.exchangeCodeForSession(code);

	if (error) {
		return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
	}

	// Supabase includes `type` for recovery / invite links
	const type = searchParams.get("type");
	if (type === "recovery" || type === "invite") {
		return NextResponse.redirect(`${origin}/update-password`);
	}

	return NextResponse.redirect(`${origin}/dashboard`);
}
