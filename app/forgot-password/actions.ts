"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type ForgotPasswordResult = { error: string } | { ok: true };

export async function forgotPasswordAction(
	_prev: ForgotPasswordResult | null,
	formData: FormData,
): Promise<ForgotPasswordResult> {
	const email = String(formData.get("email") ?? "").trim();
	if (!email) {
		return { error: "Email is required" };
	}

	const headersList = await headers();
	const origin = headersList.get("origin") ?? "";

	const db = await createClient();
	const { error } = await db.auth.resetPasswordForEmail(email, {
		redirectTo: `${origin}/auth/callback?type=recovery`,
	});

	if (error) {
		return { error: error.message };
	}

	// Always return ok — don't reveal whether the email exists
	return { ok: true };
}
